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
