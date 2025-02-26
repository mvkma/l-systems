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

/**
 * Create symbol with expression parameters
 *
 * @param {string} s - name
 * @param {Object<string,Array<string>} parameters - rpns to evaluate
 *
 * @returns {(bindings: any) => any}
 */
function symb(s, parameters) {
    return function(bindings) {
        const values = {};

        for (const [k, rpn] of Object.entries(parameters)) {
            values[k] = evalRPN(rpn, bindings);
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
 * @param {any} axiom
 * @param {Object<string, (b: any) => any[]>} rules
 * @param {Object<string, number>} consts
 * @param {number} level
 *
 * @returns {any[]}
 */
function evolve(axiom, rules, consts, level) {
    let state = axiom;
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
 * @param {Object<string,Array<string>>} parameters
 * @param {string} rule
 *
 * @returns {(bindings: any) => any[]}
 */
function parseRuleString(parameters, rule) {
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
 * @returns {Array<string>}
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
 * @returns {Object<string,any>}
 */
function parseSystem(text) {
    let json;

    if (typeof text === "string") {
        json = JSON.parse(text);
    } else {
        json = text;
    }

    const system = {};

    system["angle"] = json["angle"];
    system["level"] = json["level"];
    system["consts"] = json["consts"] || {};
    system["rules"] = {};
    system["axiom"] = [];
    system["symbols"] = new Set();

    const positionMap = {
        "+": ["a"],
        "-": ["a"],
    };
    for (const lhs of Object.keys(json["productions"])) {
        positionMap[lhs[0]] = getParameters(lhs);
    }

    let symb, params, values;
    for (const [lhs, rhs] of Object.entries(json["productions"])) {
        symb = lhs[0];
        system["rules"][symb] = parseRuleString(positionMap, rhs);
        system["symbols"].add(symb);
        system["symbols"] = system["symbols"].union(new Set(rhs));
    }

    for (const s of json["axiom"]) {
        symb = s[0];
        values = getParameters(s);
        params = positionMap[symb];
        system["axiom"].push({ symbol: symb, values: {} });

        if (values.length === 0) {
            continue;
        }

        if (params !== undefined) {
            for (let i = 0; i < params.length; i++) {
                system["axiom"][system["axiom"].length - 1]["values"][params[i]] = parseFloat(values[i]);
            }
        } else {
            switch (symb) {
            case "F":
            case "f":
                system["axiom"][system["axiom"].length - 1]["values"]["s"] = parseFloat(values[0]);
                break;
            case "+":
            case "-":
                system["axiom"][system["axiom"].length - 1]["values"]["a"] = parseFloat(values[0]);
                break;
            default:
                break;
            }
        }
    }

    return system;
}

export {
    evolve,
    parseSystem,
    evalRPN,
    shuntingYard,
};
