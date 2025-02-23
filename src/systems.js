/**
 * @type {Object}
 */
const systems = [
    {
        angle: 90,
        axiom: "F-F-F-F",
        level: 3,
        productions: {
            "F": "F-F+F+FF-F-F+F",
        },
    },
    {
        angle: 90,
        axiom: "-F",
        level: 3,
        productions: {
            "F": "F+F-F-F+F",
        },
    },
    {
        angle: 90,
        axiom: "F+F+F+F",
        level: 2,
        productions: {
            "F": "F+f-FF+F+FF+Ff+FF-f+FF-F-FF-Ff-FFF",
            "f": "ffffff",
        },
    },
    {
        angle: 90,
        axiom: "F-F-F-F",
        level: 3,
        productions: {
            "F": "FF-F+F-F-FF",
        }
    },
    {
        angle: 25,
        axiom: "F",
        level: 4,
        productions: {
            "F": "F[+F]F[-F]F",
        },
    },
    {
        angle: 25,
        axiom: "X",
        level: 6,
        productions: {
            "F": "FF",
            "X": "F[+X][-X]FX",
        },
    },
    {
        angle: 90,
        axiom: "-L",
        level: 4,
        productions: {
            "L": "LF+RFR+FL-F-LFLFL-FRFR+",
            "R": "-LFLF+RFRFR+F+RF-LFL-FR",
        },
    },
    {
        angle: 90,
        axiom: "L",
        level: 4,
        productions: {
            "L": "LFRFL-F-RFLFR+F+LFRFL",
            "R": "RFLFR+F+LFRFL-F-RFLFR",
        },
    },
    {
        angle: 25,
        axiom: "F",
        level: 2,
        productions: {
            "F": [
                "F[+F]F[-F]F",
                "F[+F]F",
                "F[-F]F",
            ],
        },
    },
    {
        angle: 60,
        axiom: "F",
        level: 4,
        productions: {
            "F": "F+G++G-F--FF-G+",
            "G": "-F+GG++G+F--F-G",
        },
    },
];

export {
    systems
};
