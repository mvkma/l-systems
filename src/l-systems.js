import {
    systems
} from "./systems.js";

/**
 * @type {CanvasRenderingContext2D}
 */
let ctx = null;

/**
 * @type {string}
 */
let state = null;

/**
 * @type {Uint16Array}
 *
 */
let random = null;

/**
 * @type {function}
 */
let randint = null;

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
 * @param {Object} productions
 */
function evolve(productions) {
    let replacement;
    let next = "";
    for (const c of state) {
        replacement = productions[c] || c;
        if (replacement.constructor === Array) {
            replacement = replacement[randint() % replacement.length];
        }
        next = next + replacement;
    }
    state = next;
}

/**
 * Evolve system to the given level
 *
 * @param {Object} system
 * @param {number} level
 * @param {boolean} animate
 * @param {number} interval
 */
function run(system, level, animate = false, interval = 20) {
    state = system["axiom"];

    const turtle = {
        step: 20,
        heading: [0.0, -1.0],
        position: [ctx.canvas.width / 2, ctx.canvas.height / 1],
        angle: Math.PI / 180 * system["angle"],
    }

    console.log(system);

    let n = 0;
    while (n < level) {
        evolve(system["productions"]);
        draw(turtle, animate, interval);
        turtle["step"] /= 1.5;
        n++;
    }
}

/**
 * Linear feedback shift register
 *
 * @param {number} seed
 */
function lfsr(seed) {
    const start = seed;
    let lfsr = start;
    return () => {
        lfsr = (lfsr >> 1) | (((lfsr ^ (lfsr >> 1) ^ (lfsr >> 3) ^ (lfsr >> 12)) & 1) << 15)
        return lfsr;
    };
};

window.onload = function(ev) {
    ctx = document.querySelector("canvas").getContext("2d");

    const parent = document.querySelector("#simulation-rules");

    const label = document.createElement("label");
    label.setAttribute("for", "system-select");
    label.textContent = "System:";

    const select = document.createElement("select");
    select.id = "system-select";

    for (const system of systems) {
        const option = document.createElement("option");
        option.textContent = system["name"];
        select.appendChild(option);
    }
    select.selectedIndex = 0;

    select.addEventListener("input", function(ev) {
        textarea.value = JSON.stringify(systems[ev.target.selectedIndex], undefined, 2);
    });

    const container = document.createElement("div");
    container.setAttribute("class", "param-row");
    container.appendChild(label);
    container.appendChild(select);

    parent.appendChild(container);

    const textarea = document.createElement("textarea");
    textarea.value = JSON.stringify(systems[select.selectedIndex], undefined, 2);
    textarea.rows = 10;

    parent.appendChild(textarea);

    window.addEventListener("keydown", function(ev) {
        switch (ev.key) {
        case "Enter":
            if (!ev.shiftKey) {
                break;
            }
            const system = JSON.parse(textarea.value);
            run(system, system["level"]);
            ev.preventDefault();
            break;
        default:
            break;
        }
    });

    const period = (1 << 16) - 1;
    const gen = lfsr(Math.floor(Math.random() * period));
    random = new Uint16Array(period);
    for (let i = 0; i < period; i++) {
        random[i] = gen();
    }

    let i = 0;
    randint = function() {
        i += 1;
        i %= period;
        return random[i];
    }
}
