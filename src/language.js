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

function symb(s, parameters) {
    return function(bindings) {
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

function evolve(axiom, rules, consts, level) {
    let state = [axiom];
    let rule;
    let next;
    let n = 0;

    while (n < level) {
        next = [];
        for (const s of state) {
            rule = rules[s["symbol"]];
            if (rule === undefined) {
                next.push(s);
            } else {
                for (const t of rule({...s["values"], ...consts})) {
                    next.push(t);
                }
            }
        }
        state = next;
        n++;
    }

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

/**
 * @param {Array<string>} parameters
 * @param {string} rule
 */
function parseRuleString(parameters, rule) {
    const rhs = [];

    // assume no more whitespace
    let i = 0;
    let j;
    let k;
    let s;
    while (i < rule.length) {
        if (rule[i] === "(") {
            const params = {};

            k = 0;
            j = i + 1;
            while (true) {
                if (rule[j] === "," || rule[j] === ")") {
                    // dirty tokenization
                    const param = rule.slice(i, j + 1).replace(/([\(\)*+\/-])/g, " $1 ");
                    // console.log(param);
                    const rpn = shuntingYard(param.split(" ").filter(t => t.length > 0));
                    // console.log(rpn);
                    params[parameters[k]] = rpn;
                    k++;
                }

                if (rule[j] === ")") {
                    break;
                }

                j++;
            }
            i = j + 1;
            // console.log(params);
            rhs.push(symb(s, params));
        } else {
            s = rule[i];
            i++;
        }
    }

    return function(bindings) {
        return rhs.map(f => f(bindings));
    };
}

const consts = {
    c: 1.0,
    p: 0.3,
    q: 1.0 - 0.3,
    h: 0.3 * (1.0 - 0.3),
};

// const symbols = {
//     "F": symb("F"),
//     "+": symb("+"),
//     "-": symb("-"),
// };

const axiom = symb("F", { x: ["x"] })({ x: 1.0 });

// const rules = {
//     "F": (bindings) => [
//         symb("F", { x: ["x", "p", "*"] })({...bindings, ...consts}),
//         symb("+", {})({}),
//         // symb("+", { x: ["x"] })({...bindings, ...consts}),
//         // symb("+", { x: ["x", "x", "+"] })({...bindings}),
//         symb("F", { x: ["x", "h", "*"] })({...bindings, ...consts}),
//         symb("-", {})({}),
//         symb("-", {})({}),
//         symb("F", { x: ["x", "h", "*"] })({...bindings, ...consts}),
//         symb("+", {})({}),
//         symb("F", { x: ["x", "q", "*"] })({...bindings, ...consts}),
//     ],
// };

function runLanguage() {
    // const expr = "x + y * z - a / ( a + b )";
    // const rpn = shuntingYard(expr.split(" "));
    // const bindings = { x: 1.0, y: -5.0, z: 0.6, a: 23.5, b: -15.8 };
    // const res = evalRPN(rpn, bindings);

    // console.log(expr);
    // console.log(rpn);
    // console.log(bindings);
    // console.log(res);

    // console.log(consts);
    // evolve(axiom, rules, consts, 2);

    const rules2 = {
        "F": parseRuleString(["x"], "F(x*p)+()F(x*h)-()-()F(x*h)+()F(x*q)"),
        // "F": parseRuleString(["x"], "F(x*p)+(x)F(x*h)-()-()F(x*h)+()F(x*q)", symbols, consts),
        // "F": parseRuleString(["x"], "F(x*p)+(x+x)F(x*h)-()-()F(x*h)+()F(x*q)", symbols, consts),
    };

    const state = evolve(axiom, rules2, consts, 2);
    console.log(stateToString(state));
}

export {
    runLanguage,
};
