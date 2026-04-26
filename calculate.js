'use strict';

// ── State ──────────────────────────────────────────────────────────────────
const state = {
    current:     '0',      // what's shown in the big display
    expression:  '',       // top expression line
    operator:    null,     // pending operator
    operand:     null,     // first operand
    waitingForOperand: false,
    justEvaluated: false,
};

// ── DOM refs ───────────────────────────────────────────────────────────────
const display    = document.getElementById('display');
const expression = document.getElementById('expression');

// ── Render ─────────────────────────────────────────────────────────────────
function render() {
    display.textContent = state.current;
    expression.textContent = state.expression;

    // Auto-shrink big numbers
    const len = state.current.length;
    display.classList.remove('small', 'xsmall', 'error');
    if (len > 12) display.classList.add('xsmall');
    else if (len > 8) display.classList.add('small');
}

// ── Actions ─────────────────────────────────────────────────────────────────
function inputNumber(val) {
    if (state.waitingForOperand || state.justEvaluated) {
        state.current = val;
        state.waitingForOperand = false;
        state.justEvaluated = false;
    } else {
        state.current = state.current === '0' ? val : state.current + val;
    }
    render();
}

function inputDecimal() {
    if (state.waitingForOperand || state.justEvaluated) {
        state.current = '0.';
        state.waitingForOperand = false;
        state.justEvaluated = false;
        render();
        return;
    }
    if (!state.current.includes('.')) {
        state.current += '.';
    }
    render();
}

function inputOperator(op) {
    const current = parseFloat(state.current);

    // If there's a pending operation, evaluate it first
    if (state.operator && !state.waitingForOperand) {
        const result = calculate(state.operand, current, state.operator);
        state.current = formatResult(result);
        state.operand = result;
    } else {
        state.operand = current;
    }

    state.operator = op;
    state.waitingForOperand = true;
    state.justEvaluated = false;

    const opSymbols = { '+': '+', '-': '−', '*': '×', '/': '÷' };
    state.expression = `${formatResult(state.operand)} ${opSymbols[op]}`;

    // Highlight active operator button
    document.querySelectorAll('.btn-operator').forEach(b => {
        b.classList.toggle('active', b.dataset.value === op);
    });

    render();
}

function evaluate() {
    if (state.operator === null) return;

    const current  = parseFloat(state.current);
    const opSymbols = { '+': '+', '-': '−', '*': '×', '/': '÷' };
    const result   = calculate(state.operand, current, state.operator);

    state.expression = `${formatResult(state.operand)} ${opSymbols[state.operator]} ${formatResult(current)} =`;
    state.current    = formatResult(result);
    state.operand    = null;
    state.operator   = null;
    state.waitingForOperand = false;
    state.justEvaluated = true;

    document.querySelectorAll('.btn-operator').forEach(b => b.classList.remove('active'));
    render();
}

function clearAll() {
    state.current    = '0';
    state.expression = '';
    state.operator   = null;
    state.operand    = null;
    state.waitingForOperand = false;
    state.justEvaluated = false;
    document.querySelectorAll('.btn-operator').forEach(b => b.classList.remove('active'));
    render();
}

function toggleSign() {
    if (state.current === '0') return;
    state.current = state.current.startsWith('-')
        ? state.current.slice(1)
        : '-' + state.current;
    render();
}

function percent() {
    const val = parseFloat(state.current);
    if (isNaN(val)) return;
    state.current = formatResult(val / 100);
    render();
}

// ── Calculation ─────────────────────────────────────────────────────────────
function calculate(a, b, op) {
    switch (op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/':
            if (b === 0) { showError('÷ 0'); return null; }
            return a / b;
        default: return b;
    }
}

function formatResult(val) {
    if (val === null) return 'Error';
    if (!isFinite(val)) return 'Error';
    // Avoid floating point issues like 0.1+0.2 = 0.30000000000000004
    const str = parseFloat(val.toPrecision(12)).toString();
    return str;
}

function showError(msg = 'Error') {
    state.current = msg;
    state.expression = '';
    state.operator = null;
    state.operand  = null;
    state.waitingForOperand = false;
    display.classList.add('error');
    render();
    setTimeout(() => {
        display.classList.remove('error');
        clearAll();
    }, 1500);
}

// ── Ripple effect ───────────────────────────────────────────────────────────
function addRipple(btn, e) {
    const rect   = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.left = `${e.clientX - rect.left - 10}px`;
    ripple.style.top  = `${e.clientY - rect.top  - 10}px`;
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
}

// ── Event delegation ────────────────────────────────────────────────────────
document.querySelector('.keypad').addEventListener('click', e => {
    const btn = e.target.closest('.btn');
    if (!btn) return;

    addRipple(btn, e);

    const { action, value } = btn.dataset;

    switch (action) {
        case 'number':   inputNumber(value);   break;
        case 'decimal':  inputDecimal();        break;
        case 'operator': inputOperator(value);  break;
        case 'equals':   evaluate();            break;
        case 'clear':    clearAll();            break;
        case 'sign':     toggleSign();          break;
        case 'percent':  percent();             break;
    }
});

// ── Keyboard support ────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
    if (e.key >= '0' && e.key <= '9') { inputNumber(e.key); highlight(e.key); }
    else if (e.key === '.')            { inputDecimal();     highlight('.'); }
    else if (['+','-','*','/'].includes(e.key)) { inputOperator(e.key); }
    else if (e.key === 'Enter' || e.key === '=') { evaluate(); highlight('='); }
    else if (e.key === 'Escape')  clearAll();
    else if (e.key === 'Backspace') {
        // Delete last digit
        if (state.current.length > 1 && !state.justEvaluated) {
            state.current = state.current.slice(0, -1) || '0';
        } else {
            state.current = '0';
        }
        render();
    }
    else if (e.key === '%') percent();
});

function highlight(key) {
    const map = { '=': '[data-action="equals"]', '.': '[data-action="decimal"]' };
    const sel = map[key] || `[data-value="${key}"]`;
    const btn = document.querySelector(sel);
    if (btn) { btn.classList.add('active'); setTimeout(() => btn.classList.remove('active'), 120); }
}

// ── Init ─────────────────────────────────────────────────────────────────────
render();
