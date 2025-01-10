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
 * @type {Object}
 */
let turtle = null;

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

function draw() {
    let stack = [];
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.lineWidth = 1.0;
    ctx.strokeStyle = "lightblue";
    // console.log(turtle["position"], turtle["heading"]);

    ctx.beginPath();
    ctx.moveTo(...turtle["position"]);
    for (const c of state) {
        switch (c) {
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
        default:
            break;
        }
        // console.log(c, turtle["position"], turtle["heading"]);
    }
    ctx.stroke();
}

function evolve() {
    // console.log(productions);
    // console.log(state);
    let replacement = undefined;
    let next = "";
    for (const c of state) {
        replacement = productions[c];
        if (replacement === undefined) {
            continue;
        }
        next = next + replacement;
    }
    // console.log(next);
    state = next;
}

window.onload = function(ev) {
    ctx = document.querySelector("canvas").getContext("2d");

    state = "F-F-F-F";

    productions = {
        "F": "F-F+F+FF-F-F+F",
        "+": "+",
        "-": "-",
    };

    const angle = Math.PI / 2;

    turtle = {
        step: 20,
        heading: [0.0, 1.0],
        position: [ctx.canvas.width / 2, ctx.canvas.height / 2],
        rotPos: [[Math.cos(angle),  Math.sin(angle)], [-Math.sin(angle), Math.cos(angle)]],
        rotNeg: [[Math.cos(angle), -Math.sin(angle)], [ Math.sin(angle), Math.cos(angle)]],
    };

    draw();

    window.addEventListener("keydown", function(ev) {
        switch (ev.key) {
        case " ":
            evolve();
            turtle["step"] /= 2.0;
            draw();
            ev.preventDefault();
            break;
        default:
            break;
        }
    });
}
