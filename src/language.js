function symb(s) {
    return function(...params) {
        return { "symbol": s, "parameters": params };
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
            rule = rules[s["symbol"]] || symb(s["symbol"]);
            next = next.concat(rule(...s["parameters"]));
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
        out += s["parameters"].toString();
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

const axiom = symb("F")(1.0);

const rules = {
    F: (x) => [
        symb("F")(x * consts["p"]),
        symb("+")(),
        symb("F")(x * consts["h"]),
        symb("-")(),
        symb("-")(),
        symb("F")(x * consts["h"]),
        symb("+")(),
        symb("F")(x * consts["q"]),
    ],
};

function runLanguage() {
    const state = evolve(axiom, rules, 2);
}

export {
    runLanguage,
};
