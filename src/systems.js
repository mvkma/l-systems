/**
 * @type {Object}
 */
const systems = [
    {
        name: "zero",
        angle: 90,
        axiom: "F-F-F-F",
        level: 1,
        productions: {
            "F": "F-F+F+FF-F-F+F",
        },
    },
    {
        name: "one",
        angle: 90,
        axiom: "-F",
        level: 1,
        productions: {
            "F": "F+F-F-F+F",
        },
    },
    {
        name: "two",
        angle: 90,
        axiom: "F+F+F+F",
        level: 1,
        productions: {
            "F": "F+f-FF+F+FF+Ff+FF-f+FF-F-FF-Ff-FFF",
            "f": "ffffff",
        },
    },
    {
        name: "three",
        angle: 90,
        axiom: "F-F-F-F",
        level: 1,
        productions: {
            "F": "F-FF--F-F",
        }
    },
    {
        name: "four",
        angle: 25,
        axiom: "F",
        level: 1,
        productions: {
            "F": "F[+F]F[-F]F",
        },
    },
    {
        name: "five",
        angle: 25,
        axiom: "X",
        level: 6,
        productions: {
            "F": "FF",
            "X": "F[+X][-X]FX",
        },
    },
];

export {
    systems
};
