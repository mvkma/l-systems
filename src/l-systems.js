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
 * @type {number}
 */
let level = 0;

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
 * Generate string representation at level n recursively.
 *
 * @param {string} axiom
 * @param {Object} productions
 * @param {number} n
 */
function *generator(axiom, productions, n) {
    for (const c of axiom) {
        if (n > 0) {
            yield* generator(productions[c], productions, n - 1);
        } else {
            yield c;
        }
    }
}

/**
 * @param {Object} initialTurtle
 * @param {boolean} animate
 */
function draw(initialTurtle, animate = false, interval = 20) {
    const stack = [];
    let turtle = new Float32Array([...initialTurtle["position"], ...initialTurtle["heading"]]);
    const step = initialTurtle["step"];

    const rotPos = rotationMatrix(initialTurtle["angle"]);
    const rotNeg = rotationMatrix(-initialTurtle["angle"]);

    let cur;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.lineWidth = 1.0;
    ctx.strokeStyle = "lightblue";

    ctx.beginPath();
    ctx.moveTo(...turtle);

    const drawingStep = function (c) {
        switch (c) {
        case "f":
            // turtle["position"] = turtle["position"].map((v, i) => v + turtle["step"] * turtle["heading"][i]);
            turtle[0] = turtle[0] + step * turtle[2];
            turtle[1] = turtle[1] + step * turtle[3];
            ctx.moveTo(...turtle);
            break;
        case "F":
            // turtle["position"] = turtle["position"].map((v, i) => v + turtle["step"] * turtle["heading"][i]);
            turtle[0] = turtle[0] + step * turtle[2];
            turtle[1] = turtle[1] + step * turtle[3];
            ctx.lineTo(...turtle);
            break;
        case "+":
            cur = turtle.slice(2, 4);
            turtle[2] = cur[0] * rotPos[0][0] + cur[1] * rotPos[0][1];
            turtle[3] = cur[0] * rotPos[1][0] + cur[1] * rotPos[1][1];
            break;
        case "-":
            cur = turtle.slice(2, 4);
            turtle[2] = cur[0] * rotNeg[0][0] + cur[1] * rotNeg[0][1];
            turtle[3] = cur[0] * rotNeg[1][0] + cur[1] * rotNeg[1][1];
            break;
        case "[":
            stack.push(turtle.slice());
            break;
        case "]":
            turtle = stack.pop();
            ctx.moveTo(...turtle);
            break;
        default:
            break;
        }
    }

    if (animate) {
        let i = 0;
        const timer = window.setInterval(function () {
            if (i == state.length) {
                window.clearInterval(timer);
                console.log("done");
            }
            //console.log(i, state[i]);
            ctx.beginPath();
            ctx.moveTo(...turtle["position"]);
            drawingStep(state[i]);
            ctx.stroke();
            i++;
        }, interval);
    } else {
        for (const c of state) {
            drawingStep(c);
        }
        ctx.stroke();
    }
}

/**
 * Evolve the L-system by one step
 *
 */
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

    level = 0;

    const angle = Math.PI / 2;
    const turtle = {
        step: 20,
        heading: [0.0, -1.0],
        position: [ctx.canvas.width / 2, ctx.canvas.height / 1],
        angle: Math.PI / 180 * 25,
    };

    draw(turtle);
    level++;
    turtle["step"] /= 1.5;

    window.addEventListener("keydown", function(ev) {
        switch (ev.key) {
        case " ":
            evolve();
            draw(turtle, ev.shiftKey, 2);
            turtle["step"] /= 1.5;
            level++;
            console.log(state.length);
            ev.preventDefault();
            break;
        default:
            break;
        }
    });
}
