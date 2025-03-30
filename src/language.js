/**
 * @typedef {Object} Symbol
 * @property {string} symbol
 * @property {Object<string, number> values
 */

/**
 * @typedef {(bindings: Object<string, number>) => Symbol[]} Rule
 */

/**
 * @typedef {Object} ParsedSystem
 * @property {number} angle
 * @property {number} level
 * @property {Object<string, number>} consts
 * @property {Object<string, Rule>} rules
 * @property {Symbol[]} axiom
 * @property {Set<string>} symbols
 */

/**
 * @typedef {Object} Operator
 * @property {number} prec - precedence
 * @property {number} args - number of arguments
 * @property {(...args: number[]) => number} func - function to evaluate the operator
 */

/** @type {Object<string, Operator>} */
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
 * @param {string[]} tokens
 * @param {Object<string, number>} bindings
 *
 * @returns {number}
 */
function evalRPN(tokens, bindings) {
    /** @type number[] */
    const stack = [];

    for (const t of tokens) {
        const op = operators[t];

        if (op === undefined) {
            let val;
            if (t[0] >= "a" && t[0] <= "z") {
                val = bindings[t];

                if (val === undefined) {
                    throw new Error(`Missing binding for variable '${t}'`);
                }
            } else {
                val = parseFloat(t);
                if (isNaN(val)) {
                    throw new Error(`Invalid number '${t}'`);
                }
            }
            stack.push(val);
        } else {
            const args = [];
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
 * @param {string[]} tokens
 *
 * @returns {Array<string>}
 */
function shuntingYard(tokens) {
    /** @type {string[]} */
    const stack = [];

    /** @type {string[]} */
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

/**
 * Create symbol with expression parameters
 *
 * @param {string} s - name
 * @param {Object<string, string[]>} parameters - rpns to evaluate
 *
 * @returns {(bindings: Object<string, number>) => Symbol}
 */
function symb(s, parameters) {
    return function(bindings) {
        const values = {};

        for (const k in parameters) {
            values[k] = evalRPN(parameters[k], bindings);
        }

        return {
            "symbol": s,
            //"parameters": parameters,
            "values": values,
        };
    };
}

/**
 * Evolve system to given level
 *
 * @param {Symbol[]} axiom
 * @param {Object<string, Rule>} rules
 * @param {Object<string, number>} consts
 * @param {number} level
 *
 * @returns {any[]}
 */
function evolve(axiom, rules, consts, level) {
    let state = axiom;
    let n = 0;

    while (n < level) {
        const next = [];
        for (const s of state) {
            const rule = rules[s["symbol"]];
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

/**
 * Convert state to string
 *
 * @param {any[]} state
 *
 * @returns {string}
 */
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
 * Parse rule string into function that evaluates it (with some parameters)
 *
 * @param {Object<string, string[]>} parameters
 * @param {string} rule
 *
 * @returns {Rule}
 */
function parseRuleString(parameters, rule) {
    /** @type {((bindings: Object<string, number>) => Symbol)[]} */
    const rhs = [];

    const emptyParams = {};
    for (const [s, params] of Object.entries(parameters)) {
        emptyParams[s] = {};
        for (const c of params) {
            emptyParams[s][c] = [];
        }
    }

    let i, j, k, s;
    i = 0;
    while (i < rule.length) {
        if (rule[i] === "(") {
            const params = {};

            k = 0;
            j = i + 1;
            while (true) {
                if (rule[j] === "," || rule[j] === ")") {
                    // dirty tokenization
                    const param = rule.slice(i + 1, j).replace(/([\(\)*+\/-])/g, " $1 ");
                    const rpn = shuntingYard(param.split(" ").filter(t => t.length > 0));
                    params[parameters[s][k]] = rpn;
                    k++;
                    i = j;
                }

                if (rule[j] === ")") {
                    break;
                }

                j++;
            }
            i = j + 1;
            rhs.push(symb(s, params));
            s = undefined;
        } else {
            if (s !== undefined) {
                rhs.push(symb(s, emptyParams[s] || {}));
            }
            s = rule[i];
            i++;
        }
    }

    if (s !== undefined) {
        rhs.push(symb(s, emptyParams[s] || {}));
    }

    return function(bindings) {
        return rhs.map(f => f(bindings));
    };
}

/**
 * @param {string} lhs
 *
 * @returns {string[]}
 */
function getParameters(lhs) {
    if (lhs.length > 3) {
        return lhs.slice(2, -1).split(",").map(s => s.trim());
    } else {
        return [];
    }
}

/**
 * @param {string} text
 *
 * @returns {ParsedSystem}
 */
function parseSystem(text) {
    let json;

    if (typeof text === "string") {
        json = JSON.parse(text);
    } else {
        json = text;
    }

    /** @type {ParsedSystem} */
    const system = {
        angle: json["angle"],
        level: json["level"],
        consts: json["consts"] || {},
        rules: {},
        axiom: [],
        symbols: new Set(),
    };

    /** @type {Object<string, string[]>} */
    const positionMap = {
        "+": ["a"],
        "-": ["a"],
        "!": ["w"],
    };
    for (const lhs of Object.keys(json["productions"])) {
        positionMap[lhs[0]] = getParameters(lhs);
    }

    for (const [lhs, rhs] of Object.entries(json["productions"])) {
        const symb = lhs[0];
        system.rules[symb] = parseRuleString(positionMap, rhs);
        system.symbols.add(symb);
        system.symbols = system.symbols.union(new Set(rhs));
    }

    for (const s of json["axiom"]) {
        const symb = s[0];
        const values = getParameters(s);
        const params = positionMap[symb];

        /** @type {Symbol} */
        const current = { symbol: symb, values: {} };

        if (values.length === 0) {
            system.axiom.push(current);
            continue;
        }

        if (params !== undefined) {
            for (let i = 0; i < params.length; i++) {
                current.values[params[i]] = parseFloat(values[i]);
            }
        } else {
            switch (symb) {
            case "F":
            case "f":
                current.values["s"] = parseFloat(values[0]);
                break;
            case "+":
            case "-":
                current.values["a"] = parseFloat(values[0]);
                break;
            case "!":
                current.values["w"] = parseFloat(values[0]);
                break;
            default:
                break;
            }
        }

        system.axiom.push(current);
    }

    return system;
}

export {
    evolve,
    parseSystem,
    evalRPN,
    shuntingYard,
};
