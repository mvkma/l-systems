/**
 * @type {Object}
 */
const systems = [
    {
        name: "zero",
        angle: 90,
        axiom: "F-F-F-F",
        productions: {
            "F": "F-F+F+FF-F-F+F",
        },
    },
    {
        name: "one",
        angle: 90,
        axiom: "-F",
        productions: {
            "F": "F+F-F-F+F",
        },
    },
    {
        name: "two",
        angle: 90,
        axiom: "F+F+F+F",
        productions: {
            "F": "F+f-FF+F+FF+Ff+FF-f+FF-F-FF-Ff-FFF",
            "f": "ffffff",
        },
    },
    {
        name: "three",
        angle: 90,
        axiom: "F-F-F-F",
        productions: {
            "F": "F-FF--F-F",
        }
    },
    {
        name: "four",
        angle: 25,
        axiom: "F",
        productions: {
            "F": "F[+F]F[-F]F",
        },
    },
    {
        name: "five",
        angle: 25,
        axiom: "X",
        productions: {
            "F": "FF",
            "X": "F[+X][-X]FX",
        },
    },
];

export {
    systems
};
