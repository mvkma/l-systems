/**
 * @type {CanvasRenderingContext2D}
 */
let ctx = null;

/**
 * @type {Object}
 */
let productions = null;

/**
 * @type {string}
 */
let state = null;

/**
 * Matrix vector multiplication
 *
 * @param {Object} M
 * @param {Object} v
 *
 * @return {Object}
 */
function mulMatVec(M, v) {
    return [
        v[0] * M[0][0] + v[1] * M[0][1],
        v[0] * M[1][0] + v[1] * M[1][1],
    ];
}

/**
 * 2D rotation matrix
 *
 * @param {number} angle - angle in radians
 *
 * @return {Object}
 */
function rotationMatrix(angle) {
    return [
        [Math.cos(angle), Math.sin(angle)],
        [-Math.sin(angle), Math.cos(angle)],
    ];
}
    

/**
 * @param {Object} initialTurtle
 */
function draw(initialTurtle) {
    const stack = [];
    let turtle = structuredClone(initialTurtle);

    turtle["rotPos"] = rotationMatrix(turtle["angle"]);
    turtle["rotNeg"] = rotationMatrix(-turtle["angle"]);

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.lineWidth = 1.0;
    ctx.strokeStyle = "lightblue";

    ctx.beginPath();
    ctx.moveTo(...turtle["position"]);
    for (const c of state) {
        switch (c) {
        case "f":
            turtle["position"] = turtle["position"].map((v, i) => v + turtle["step"] * turtle["heading"][i]);
            ctx.moveTo(...turtle["position"]);
            break;
        case "F":
            turtle["position"] = turtle["position"].map((v, i) => v + turtle["step"] * turtle["heading"][i]);
            ctx.lineTo(...turtle["position"]);
            break;
        case "+":
            turtle["heading"] = mulMatVec(turtle["rotPos"], turtle["heading"]);
            break;
        case "-":
            turtle["heading"] = mulMatVec(turtle["rotNeg"], turtle["heading"]);
            break;
        case "[":
            stack.push(structuredClone(turtle));
            break;
        case "]":
            turtle = stack.pop();
            ctx.moveTo(...turtle["position"]);
            break;
        default:
            break;
        }
    }
    ctx.stroke();
}

function evolve() {
    let replacement = undefined;
    let next = "";
    for (const c of state) {
        replacement = productions[c];
        if (replacement === undefined) {
            continue;
        }
        next = next + replacement;
    }
    state = next;
}

window.onload = function(ev) {
    ctx = document.querySelector("canvas").getContext("2d");

    // state = "F-F-F-F";
    // state = "-F";
    // state = "F+F+F+F";
    // state = "F-F-F-F";
    // state = "F";
    state = "X";

    productions = {
        // "F": "F-F+F+FF-F-F+F",
        // "F": "F+F-F-F+F",
        // "F": "F+f-FF+F+FF+Ff+FF-f+FF-F-FF-Ff-FFF",
        // "f": "ffffff",
        // "F": "F-FF--F-F",
        // "F": "F[+F]F[-F]F",
        "F": "FF",
        "X": "F[+X][-X]FX",
        "[": "[",
        "]": "]",
        "+": "+",
        "-": "-",
    };

    const angle = Math.PI / 2;
    const turtle = {
        step: 20,
        heading: [0.0, -1.0],
        position: [ctx.canvas.width / 2, ctx.canvas.height / 1],
        angle: Math.PI / 180 * 25.7,
    };

    draw(turtle);

    window.addEventListener("keydown", function(ev) {
        switch (ev.key) {
        case " ":
            evolve();
            turtle["step"] /= 1.5;
            // console.log(state);
            draw(turtle);
            ev.preventDefault();
            break;
        default:
            break;
        }
    });
}
