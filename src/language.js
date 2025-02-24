const operators = {
    "+": {
        prec: 1,
        args: 2,
        func: (x, y) => x + y,
    },
    "-": {
        prec: 1,
        args: 2,
        func: (x, y) => x - y,
    },
    "*": {
        prec: 2,
        args: 2,
        func: (x, y) => x * y,
    },
    "/": {
        prec: 2,
        args: 2,
        func: (x, y) => x / y,
    },
}

/**
 * Evaluate RPN
 *
 * @param {Array<string>} tokens
 * @param {Object<string,number>} bindings
 *
 * @returns {number}
 */
function evalRPN(tokens, bindings) {
    let op;
    let val;
    let args;
    const stack = [];

    for (const t of tokens) {
        op = operators[t];

        if (op === undefined) {
            val = bindings[t];

            if (val === undefined) {
                throw new Error(`Missing binding for variable '${t}'`);
            } else {
                stack.push(val);
            }
        } else {
            args = [];
            for (let i = 0; i < op.args; i++) {
                args.push(stack.pop());
            }
            stack.push(op.func(...args.reverse()));
        }
    }

    if (stack.length > 1) {
        throw new Error("Missing operator");
    }

    return stack.pop();
}

/**
 * Shunting yard algorithm
 * https://en.wikipedia.org/wiki/Shunting_yard_algorithm
 *
 * @param {Array<string>} tokens
 *
 * @returns {Array<string>}
 */
function shuntingYard(tokens) {
    const stack = [];
    const result = [];

    for (const t of tokens) {
        if (operators[t] !== undefined) {
            while (stack.length > 0 &&
                   stack.at(-1) !== "(" &&
                   operators[stack.at(-1)].prec >= operators[t].prec) {
                result.push(stack.pop());
            }
            stack.push(t);
        } else if (t === "(") {
            stack.push(t);
        } else if (t === ")") {
            while (stack.length > 0 && stack.at(-1) !== "(") {
                result.push(stack.pop());
            }

            if (stack.length > 0 && stack.at(-1) === "(") {
                stack.pop();
            } else {
                throw new Error("Parentheses error");
            }
        } else {
            result.push(t);
        }
    }

    while (stack.length > 0) {
        if (stack.at(-1) === "(") {
            throw new Error("Parentheses error");
        } else {
            result.push(stack.pop());
        }
    }

    return result;
}

function symb(s) {
    return function(parameters, bindings) {
        const values = {};

        for (const [k, rpn] of Object.entries(parameters)) {
            values[k] = evalRPN(rpn, bindings);
        }

        return {
            "symbol": s,
            "parameters": parameters,
            "values": values,
        };
    };
}

function evolve(axiom, rules, level) {
    let state = [axiom];
    let rule;
    let next;
    let n = 0;

    while (n < level) {
        console.log(n, stateToString(state));
        next = [];
        for (const s of state) {
            rule = rules[s["symbol"]];
            if (rule === undefined) {
                next = next.concat([s]);
            } else {
                next = next.concat(rule(s["values"]));
            }
        }
        state = next;
        n++;
    }

    console.log(n, stateToString(state));
    return state;
}

function stateToString(state) {
    let out = "";

    for (const s of state) {
        out += s["symbol"];
        out += "(";
        out += JSON.stringify(s["values"]);
        out += ")";
    }

    return out;
}

const consts = {
    c: 1.0,
    p: 0.3,
    q: 1.0 - 0.3,
    h: 0.3 * (1.0 - 0.3),
};

const symbols = {
    "F": symb("F"),
    "+": symb("+"),
    "-": symb("-"),
};

const axiom = symbols["F"]({ x: ["x"] }, {x: 1.0});

const rules = {
    "F": (bindings) => [
        symbols["F"]({ x: ["x", "p", "*"] }, {...bindings, ...consts}),
        symbols["+"]({}, {}),
        symbols["F"]({ x: ["x", "h", "*"] }, {...bindings, ...consts}),
        symbols["-"]({}, {}),
        symbols["-"]({}, {}),
        symbols["F"]({ x: ["x", "h", "*"] }, {...bindings, ...consts}),
        symbols["+"]({}, {}),
        symbols["F"]({ x: ["x", "q", "*"] }, {...bindings, ...consts}),
    ],
};

function runLanguage() {
    // const expr = "x + y * z - a / ( a + b )";
    // const rpn = shuntingYard(expr.split(" "));
    // const bindings = { x: 1.0, y: -5.0, z: 0.6, a: 23.5, b: -15.8 };
    // const res = evalRPN(rpn, bindings);

    // console.log(expr);
    // console.log(rpn);
    // console.log(bindings);
    // console.log(res);

    console.log(consts);
    const state = evolve(axiom, rules, 2);
}

export {
    runLanguage,
};
