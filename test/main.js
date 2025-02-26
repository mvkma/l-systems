import * as test from "./test.js";

import * as language from "../src/language.js";

/* Language */
test.init();

test.test(() => {
    test.assertEquals(language.evalRPN(["1.0"], {}), 1.0);
    test.assertEquals(language.evalRPN(["x"], { x: 2.0 }), 2.0);
    test.assertEquals(language.evalRPN(["0"], {}), 0.0);
    test.assertEquals(language.evalRPN(["-5.5"], {}), -5.5);
    test.assertEquals(language.evalRPN([], {}), undefined);
}, "RPN evaluation - constants");

test.test(() => {
    let bindings = { a: 2.0, b: 3.3, c: -15.9 };
    test.assertEquals(language.evalRPN(["a", "0.0", "+"], bindings), 2.0);
    test.assertClose(language.evalRPN(["2.0", "b", "-"], bindings), -1.3);
    test.assertEquals(language.evalRPN(["a", "b", "*"], bindings), 6.6);
    test.assertEquals(language.evalRPN(["c", "-1.0", "/"], bindings), 15.9);
}, "RPN evaluation - simple operators");

test.test(() => {
    test.assertThrows(() => language.evalRPN(["1.0", "2.0"], {}), "Error", "Missing operator");
    test.assertThrows(() => language.evalRPN(["aaa"], {}), "Error", "Missing binding for variable 'aaa'");
    test.assertThrows(() => language.evalRPN(["AA"], {}), "Error", "Invalid number 'AA'");
}, "RPN evaluation - errors");

test.test(() => {
    let bindings = { x: 12.2, y: -4.0, z: 3.0 };
    test.assertClose(
        language.evalRPN(["x", "y", "+", "z", "z", "*", "/"], bindings),
        0.9111111111111
    );
    test.assertClose(
        language.evalRPN(["-1.0", "y", "*", "z", "+", "7.0", "-"], bindings),
        0.0
    );
}, "RPN evaluation - more complex expressions");

test.test(() => {
    test.assertEquals(
        language.shuntingYard([]).toString(),
        [].toString(),
    );

    test.assertEquals(
        language.shuntingYard(["3.0", "*", "x"]).toString(),
        ["3.0", "x", "*"].toString(),
    );

    test.assertEquals(
        language.shuntingYard(["3.0", "+", "x", "*", "y"]).toString(),
        ["3.0", "x", "y", "*", "+"].toString(),
    );

    test.assertEquals(
        language.shuntingYard(["(", "3.0", "+", "x", ")", "*", "y"]).toString(),
        ["3.0", "x", "+", "y", "*"].toString(),
    );

    test.assertThrows(
        () => language.shuntingYard(["(", "(", ")"]),
        "Error",
        "Parentheses error",
    );

    test.assertThrows(
        () => language.shuntingYard(["(", "(", ")", ")", ")"]),
        "Error",
        "Parentheses error",
    );

}, "Shunting Yard");

test.test(() => {
    const input = {
        angle: 10,
        level: 5,
        axiom: ["-", "F"],
        productions: { "F": "F+F" },
    };
    const system = language.parseSystem(input);

    test.assertEquals(system["angle"], 10);
    test.assertEquals(system["level"], 5);
    test.assert(system["consts"] !== undefined);
    test.assert(Object.keys(system["consts"]).length === 0, `Unexpected consts`);
    test.assertEquals(system["symbols"].difference(new Set(["F", "+"])).size, 0);
    test.assertEquals(JSON.stringify(system["axiom"][0]), '{"symbol":"-","values":{}}');
    test.assertEquals(JSON.stringify(system["axiom"][1]), '{"symbol":"F","values":{}}');
    test.assert(system["rules"]["F"] !== undefined);

    const rule = system["rules"]["F"];
    test.assertEquals(JSON.stringify(rule({})[0]), '{"symbol":"F","values":{}}');
    test.assertEquals(JSON.stringify(rule({})[1]), '{"symbol":"+","values":{}}');
    test.assertEquals(JSON.stringify(rule({})[2]), '{"symbol":"F","values":{}}');
}, "Parse system - simple");

test.test(() => {
    const input = {
        angle: 80,
        level: 10,
        consts: { a: -2.0, b: 1.5 },
        axiom: ["-(90)", "A(1.0,0.0)"],
        productions: {
            "F(s)": "F(s)",
            "A(s, t)": "+(s*90)A(s+t,t*a)[F(s)F(s-b)]-(s*90)",
        },
    };

    const system = language.parseSystem(input);
    console.log(system);

    test.assertEquals(system["angle"], 80);
    test.assertEquals(system["level"], 10);
    test.assertEquals(JSON.stringify(system["consts"]), '{"a":-2,"b":1.5}');
    test.assertEquals(JSON.stringify(system["axiom"][0]), '{"symbol":"-","values":{"a":90}}');
    test.assertEquals(JSON.stringify(system["axiom"][1]), '{"symbol":"A","values":{"s":1,"t":0}}');

    const ruleF = system["rules"]["F"];
    const ruleA = system["rules"]["A"];
    const ruleFresult = ruleF({ s: 0.5, t: 2.0, ...system["consts"] });
    const ruleAresult = ruleA({ s: 0.5, t: 2.0, ...system["consts"] });

    test.assertEquals(ruleFresult.length, 1);
    test.assertEquals(ruleAresult.length, 7);

    test.assertEquals(JSON.stringify(ruleFresult[0]), '{"symbol":"F","values":{"s":0.5}}');

    test.assertEquals(JSON.stringify(ruleAresult[0]), '{"symbol":"+","values":{"a":45}}');
    test.assertEquals(JSON.stringify(ruleAresult[1]), '{"symbol":"A","values":{"s":2.5,"t":-4}}');
    test.assertEquals(JSON.stringify(ruleAresult[2]), '{"symbol":"[","values":{}}');
    test.assertEquals(JSON.stringify(ruleAresult[3]), '{"symbol":"F","values":{"s":0.5}}');
    test.assertEquals(JSON.stringify(ruleAresult[4]), '{"symbol":"F","values":{"s":-1}}');
    test.assertEquals(JSON.stringify(ruleAresult[5]), '{"symbol":"]","values":{}}');
    test.assertEquals(JSON.stringify(ruleAresult[6]), '{"symbol":"-","values":{"a":45}}');
}, "Parse system - complicated");

test.test(() => {
    const input = {
        angle: 80,
        level: 2,
        consts: { r: 0.5 },
        axiom: ["-", "F(1.0)"],
        productions: {
            "F(s)": "F(s+r)+F(s*2.0)",
        },
    };
    const system = language.parseSystem(input);

    const state = language.evolve(
        system["axiom"],
        system["rules"],
        system["consts"],
        system["level"]
    );

    test.assertEquals(state.length, 8);
    test.assertEquals(JSON.stringify(state[0]), '{"symbol":"-","values":{}}');
    test.assertEquals(JSON.stringify(state[1]), '{"symbol":"F","values":{"s":2}}');
    test.assertEquals(JSON.stringify(state[2]), '{"symbol":"+","values":{}}');
    test.assertEquals(JSON.stringify(state[3]), '{"symbol":"F","values":{"s":3}}');
    test.assertEquals(JSON.stringify(state[4]), '{"symbol":"+","values":{}}');
    test.assertEquals(JSON.stringify(state[5]), '{"symbol":"F","values":{"s":2.5}}');
    test.assertEquals(JSON.stringify(state[6]), '{"symbol":"+","values":{}}');
    test.assertEquals(JSON.stringify(state[7]), '{"symbol":"F","values":{"s":4}}');
}, "System evolution");
