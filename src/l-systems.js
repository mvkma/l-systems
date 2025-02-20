import {
    systems
} from "./systems.js";

/**
 * @type {CanvasRenderingContext2D}
 */
let ctx0 = null;

/**
 * @type {CanvasRenderingContext2D}
 */
let ctx1 = null;

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
 */
function centerTransform(initialTurtle) {
    const stack = [];
    let turtle = new Float32Array([...initialTurtle["position"], ...initialTurtle["heading"]]);
    const step = initialTurtle["step"];

    const rotPos = rotationMatrix(initialTurtle["angle"]);
    const rotNeg = rotationMatrix(-initialTurtle["angle"]);

    let cur, mat;

    const bounds = new Float32Array([turtle[0], turtle[0], turtle[1], turtle[1]]);

    for (const c of state) {
        switch (c) {
        case "F":
        case "f":
            turtle[0] = turtle[0] + step * turtle[2];
            turtle[1] = turtle[1] + step * turtle[3];
            bounds[0] = Math.min(bounds[0], turtle[0]);
            bounds[1] = Math.max(bounds[1], turtle[0]);
            bounds[2] = Math.min(bounds[2], turtle[1]);
            bounds[3] = Math.max(bounds[3], turtle[1]);
            break;
        case "+":
        case "-":
            cur = turtle.slice(2, 4);
            mat = c === "+" ? rotPos : rotNeg;
            turtle[2] = cur[0] * mat[0][0] + cur[1] * mat[0][1];
            turtle[3] = cur[0] * mat[1][0] + cur[1] * mat[1][1];
            break;
        case "[":
            stack.push(turtle.slice());
            break;
        case "]":
            turtle = stack.pop();
            break;
        default:
            break;
        }

    }

    const dx = bounds[1] - bounds[0];
    const dy = bounds[3] - bounds[2];

    const r = Math.max(dx / ctx0.canvas.width, dy / ctx0.canvas.height);

    const sx = (ctx0.canvas.width - dx / r) / 2.0;
    const sy = (ctx0.canvas.height - dy / r) / 2.0;

    return [r, -bounds[0] / r + sx, -bounds[2] / r + sy];
}

/**
 * Plot state linearly
 */
function plot() {
    ctx1.clearRect(0, 0, ctx1.canvas.width, ctx1.canvas.height);

    let cur = 1;
    let depth = 1;

    for (const c of state) {
        if (c === "[") {
            cur += 1;
            depth = Math.max(depth, cur);
        } else if (c === "]") {
            cur -= 1;
        } else {
            continue;
        }
    }

    let x = 0;
    let y = 0;
    let dx = ctx1.canvas.width / state.length;
    let dy = ctx1.canvas.height / depth;

    for (const c of state) {
        ctx1.fillStyle = "yellow";
        switch (c) {
        case "F":
            ctx1.fillStyle = "lightblue";
            break;
        case "f":
            ctx1.fillStyle = "lightgrey";
            break;
        case "+":
            ctx1.fillStyle = "green";
            break;
        case "-":
            ctx1.fillStyle = "red";
            break;
        case "[":
            y += dy / 2;
            ctx1.fillStyle = "grey";
            break;
        case "]":
            y -= dy / 2;
            ctx1.fillStyle = "grey";
            break;
        default:
            break;
        }
        ctx1.fillRect(x, y, dx, dy);
        x += dx;
    }
}

/**
 * @param {Object} initialTurtle
 * @param {boolean} animate
 */
function draw(initialTurtle, animate = false, interval = 20, zoom = 1.0) {
    const stack = [];

    const [r, deltax, deltay] = centerTransform(initialTurtle);

    let turtle = new Float32Array([
        initialTurtle["position"][0] + deltax,
        initialTurtle["position"][1] + deltay,
        initialTurtle["heading"][0],
        initialTurtle["heading"][1],
    ]);
    const step = initialTurtle["step"] / r;

    const rotPos = rotationMatrix(initialTurtle["angle"]);
    const rotNeg = rotationMatrix(-initialTurtle["angle"]);

    let cur, mat;

    ctx0.clearRect(0, 0, ctx0.canvas.width, ctx0.canvas.height);
    ctx0.translate(ctx0.canvas.width / 2, ctx0.canvas.height / 2);
    ctx0.scale(zoom, zoom);
    ctx0.translate(-ctx0.canvas.width / 2, -ctx0.canvas.height / 2);

    ctx0.lineWidth = 1.0;
    ctx0.strokeStyle = "lightblue";

    ctx0.beginPath();
    ctx0.moveTo(...turtle);

    const drawingStep = function (c) {
        switch (c) {
        case "F":
        case "f":
            turtle[0] = turtle[0] + step * turtle[2];
            turtle[1] = turtle[1] + step * turtle[3];
            c === "f" ? ctx0.moveTo(...turtle) : ctx0.lineTo(...turtle);
            break;
        case "+":
        case "-":
            cur = turtle.slice(2, 4);
            mat = c === "+" ? rotPos : rotNeg;
            turtle[2] = cur[0] * mat[0][0] + cur[1] * mat[0][1];
            turtle[3] = cur[0] * mat[1][0] + cur[1] * mat[1][1];
            break;
        case "[":
            stack.push(turtle.slice());
            break;
        case "]":
            turtle = stack.pop();
            ctx0.moveTo(...turtle);
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
            ctx0.beginPath();
            ctx0.moveTo(...turtle);
            drawingStep(state[i]);
            ctx0.stroke();
            i++;
        }, interval);
    } else {
        for (const c of state) {
            drawingStep(c);
        }
        ctx0.stroke();
    }
    ctx0.resetTransform();
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
        step: 10,
        heading: [0.0, -1.0],
        position: [0, 0],
        angle: Math.PI / 180 * system["angle"],
    }

    console.log(system);

    let n = 0;
    while (n < level) {
        evolve(system["productions"]);
        n++;
    }
    plot();
    draw(turtle, animate, interval);
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
    ctx0 = document.querySelector("#canvas0").getContext("2d");
    ctx1 = document.querySelector("#canvas1").getContext("2d");

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

    let system = undefined;
    let animate = false;
    let zoom = 1.0;
    let time = 0.0;
    let angle = 0.0;

    const animateCallback = function() {
        if (system === undefined) {
            system = JSON.parse(textarea.value);
            run(system, system["level"]);
        }

        if (time >= 1.0) {
            time = 0.0;
        }

        angle = 0.5 + 4.0 * Math.pow((time - 0.5), 3.0);
        angle *= 180;
        time += 0.005;
        draw({
            step: 10,
            heading: [0.0, -1.0],
            position: [0, 0],
            angle: Math.PI / 180 * angle
        });

        if (animate) {
            window.requestAnimationFrame(() => animateCallback());
        }
    }

    window.addEventListener("keydown", function(ev) {
        switch (ev.key) {
        case "Enter":
            if (!ev.shiftKey) {
                break;
            }
            system = JSON.parse(textarea.value);
            run(system, system["level"], ev.ctrlKey, 10);
            plot();
            ev.preventDefault();
            break;
        case "s":
            system = undefined;
            zoom = 1.0;
            time = 0.0;
            angle = 0.0;

            ev.preventDefault();
            break;
        case "a":
            animate = !animate;
            console.log(animate);

            if (animate) {
                window.requestAnimationFrame(() => animateCallback());
            }

            ev.preventDefault();
            break;
        default:
            break;
        }
    });

    ctx0.canvas.addEventListener("wheel", function(ev) {
        if (state === null) {
            ev.preventDefault();
            return ;
        }

        system = system || JSON.parse(textarea.value);
        zoom += ev.deltaY < 0 ? 0.1 : -0.1;
        draw({
            step: 10,
            heading: [0.0, -1.0],
            position: [0, 0],
            angle: Math.PI / 180 * system["angle"]
        }, false, 0, zoom);
        ev.preventDefault();
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
