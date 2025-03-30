/**
 * @typedef {Object} SystemInput
 * @property {number} angle
 * @property {number} level
 * @property {string[]} axiom
 * @property {Object<string, string>} productions
 */

/** @type {SystemInput[]} */
const systems = [
    {
        angle: 25,
        axiom: ["F"],
        level: 4,
        productions: {
            "F": "F[+F]F[-F]F",
        },
    },
    {
        angle: 25,
        axiom: ["X"],
        level: 6,
        productions: {
            "F": "FF",
            "X": "F[+X][-X]FX",
        },
    },
    {
        angle: 90,
        axiom: ["F", "-", "F", "-", "F", "-", "F"],
        level: 3,
        productions: {
            "F": "F-F+F+FF-F-F+F",
        },
    },
    {
        angle: 90,
        axiom: ["-", "F"],
        level: 3,
        productions: {
            "F": "F+F-F-F+F",
        },
    },
    {
        angle: 90,
        axiom: ["F", "+", "F", "+", "F", "+", "F"],
        level: 2,
        productions: {
            "F": "F+f-FF+F+FF+Ff+FF-f+FF-F-FF-Ff-FFF",
            "f": "ffffff",
        },
    },
    {
        angle: 90,
        axiom: ["F", "-", "F", "-", "F", "-", "F"],
        level: 3,
        productions: {
            "F": "FF-F+F-F-FF",
        }
    },
    {
        angle: 90,
        axiom: ["-", "L"],
        level: 4,
        productions: {
            "F": "F",
            "L": "LF+RFR+FL-F-LFLFL-FRFR+",
            "R": "-LFLF+RFRFR+F+RF-LFL-FR",
        },
    },
    {
        angle: 90,
        axiom: ["L"],
        level: 4,
        productions: {
            "F": "F",
            "L": "LFRFL-F-RFLFR+F+LFRFL",
            "R": "RFLFR+F+LFRFL-F-RFLFR",
        },
    },
    {
        angle: 60,
        axiom: ["F"],
        level: 4,
        productions: {
            "F": "F+G++G-F--FF-G+",
            "G": "-F+GG++G+F--F-G",
        },
    },
    {
        angle: 86,
        axiom: ["-(90)", "F(1.0)"],
        level: 6,
        productions: {
            "F(s)": "F(s*p)+F(s*h)--F(s*h)+F(s*q)",
        },
        consts: {
            c: 1.0,
            p: 0.3,
            q: 0.7,
            h: Math.pow(0.3 * 0.7, 0.5),
        },
    },
    {
        angle: 85,
        axiom: ["A(1.0)"],
        level: 5,
        productions: {
            "F(s)": "F(s)",
            "A(s)": "F(s)[+A(s/r)][-A(s/r)]",
        },
        consts: {
            r: 1.456,
        },
    },
    {
        angle: 45,
        axiom: ["!(1.0)", "F(200.0)", "<(45.0)", "A"],
        level: 3,
        productions: {
            "A": "!(f)F(50.0)[&(d)F(50.0)A]<(b)[&(d)F(50.0)A]<(c)[&(d)F(50.0)A]",
            "F(s)": "F(s*e)",
            "!(w)": "!(w*f)",
        },
        consts: {
            b: 94.74,
            c: 132.63,
            d: 18.95,
            e: 1.109,
            f: 1.732,
        },
    },
];

export {
    systems
};
