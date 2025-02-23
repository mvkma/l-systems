import {
    systems
} from "./systems.js";

import {
    NumberInput
} from "./components.js";

// import {
//     runLanguage
// } from "./language.js";
//
// runLanguage();

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
 * @type {Object}{
 */
const defaultLineStyle = {
    draw: false,
    width: 1.0,
    color: "red",
    scale: 1.0,
    shadowOffsetX: 0.0,
    shadowOffsetY: 0.0,
    shadowBlur: 0.0,
    shadowColor: "rgb(0 0 0 / 0%)",
};

/**
 * @type {Object}
 */
let linestyles = {
    "F": {
        draw: true,
        width: 1.0,
        color: "red",
        scale: 1.0,
        shadowOffsetX: 0.0,
        shadowOffsetY: 0.0,
        shadowBlur: 0.0,
        shadowColor: "rgb(0 0 0 / 0%)",
    }
}

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
    let draw, prev;

    const bounds = new Float32Array([turtle[0], turtle[0], turtle[1], turtle[1]]);

    for (const c of state) {
        switch (c) {
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
            if (prev !== c) {
                draw = (linestyles[c] && linestyles[c]["draw"]) || false;
                if (!draw) {
                    break;
                }
            }
            turtle[0] = turtle[0] + step * turtle[2];
            turtle[1] = turtle[1] + step * turtle[3];
            bounds[0] = Math.min(bounds[0], turtle[0]);
            bounds[1] = Math.max(bounds[1], turtle[0]);
            bounds[2] = Math.min(bounds[2], turtle[1]);
            bounds[3] = Math.max(bounds[3], turtle[1]);
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
 *
 * @param {number} depth
 */
function plot(depth) {
    ctx1.clearRect(0, 0, ctx1.canvas.width, ctx1.canvas.height);

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
 * @param {Object} drawingParams
 */
function draw(initialTurtle, drawingParams = {}) {
    const stack = [];
    const animate = drawingParams["animate"] || false;
    const interval = drawingParams["interval"] || 20;
    const zoom = drawingParams["zoom"] || 1.0;

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

    let prev, draw;

    ctx0.beginPath();
    ctx0.moveTo(...turtle);

    const drawingStep = function (c) {
        switch (c) {
        case "f":
            turtle[0] = turtle[0] + step * turtle[2];
            turtle[1] = turtle[1] + step * turtle[3];
            ctx0.moveTo(...turtle);
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
            if (prev !== c) {
                draw = (linestyles[c] && linestyles[c]["draw"]) || false;
                if (!draw) {
                    break;
                }
                ctx0.stroke();
                ctx0.beginPath();
                ctx0.moveTo(...turtle);
                ctx0.lineWidth = linestyles[c]["width"];
                ctx0.strokeStyle = linestyles[c]["color"];
                ctx0.shadowOffsetX = linestyles[c]["shadowOffsetX"];
                ctx0.shadowOffsetY = linestyles[c]["shadowOffsetY"];
                ctx0.shadowBlur = linestyles[c]["shadowBlur"];
                ctx0.shadowColor = linestyles[c]["shadowColor"];
                prev = c;
            }
            turtle[0] = turtle[0] + step * turtle[2];
            turtle[1] = turtle[1] + step * turtle[3];
            ctx0.lineTo(...turtle);
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
            ctx1.beginPath();
            ctx1.fillStyle = "lightblue";
            ctx1.arc(
                ctx1.canvas.width * i / state.length,
                ctx1.canvas.height * 0.9,
                3.0,
                0.0,
                Math.PI * 2.0,
                false
            );
            ctx1.fill();
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
 * Count symbols and calculate stack depth
 *
 * @returns {Object}
 */
function statistics() {
    const counts = {};
    let cur = 1;
    let depth = 1;

    for (const c of state) {
        counts[c] = counts[c] + 1 || 0;

        if (c === "[") {
            cur += 1;
            depth = Math.max(depth, cur);
        } else if (c === "]") {
            cur -= 1;
        } else {
            continue;
        }
    }

    return {
        "counts": counts,
        "depth": depth,
        "length": state.length,
    };
}

/**
 * Show statistics
 *
 * @param {Object} stats
 */
function show(stats) {
    document.querySelector("#stats-length").textContent = stats["length"];
    document.querySelector("#stats-depth").textContent = stats["depth"];

    const dl = document.createElement("dl");
    for (const k of Object.keys(stats["counts"]).sort()) {
        const dt = document.createElement("dt");
        const dd = document.createElement("dd");
        dt.textContent = k;
        dd.textContent = stats["counts"][k];
        dl.appendChild(dt);
        dl.appendChild(dd);
    }

    const counts = document.querySelector("#counts");
    counts.removeChild(counts.firstChild);
    counts.appendChild(dl);

    document.querySelector("#timings-evolve").textContent = stats["evolve"] + " ms";
    document.querySelector("#timings-plot").textContent = stats["plot"] + " ms";
    document.querySelector("#timings-turtle").textContent = stats["turtle"] + " ms";
}

/**
 * Evolve system to the given level
 *
 * @param {Object} system
 * @param {number} level
 * @param {Object} drawingParams
 */
function run(system, level, drawingParams = {}) {
    state = system["axiom"];

    const turtle = {
        step: 10,
        heading: [0.0, -1.0],
        position: [0, 0],
        angle: Math.PI / 180 * system["angle"],
    }

    console.log(system);

    let stats = {};
    let t0;

    let n = 0;
    t0 = performance.now();
    while (n < level) {
        evolve(system["productions"]);
        n++;
    }
    stats["evolve"] = performance.now() - t0;

    stats = {...stats, ...statistics()};

    t0 = performance.now();
    plot(stats["depth"]);
    stats["plot"] = performance.now() - t0;

    t0 = performance.now();
    draw(turtle, drawingParams);
    stats["turtle"] = performance.now() - t0;

    console.log(statistics);

    show(stats);
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

/**
 * Extract symbols from production rules
 *
 * @param {Object} productions
 *
 * @returns {Array}
 */
function extractSymbols(productions) {
    let symbols = new Set(Object.keys(productions));

    for (const rule of Object.values(productions)) {
        symbols = symbols.union(new Set(rule));
    }

    return (new Array(...symbols)).filter(
        k => k.length === 1 && k.codePointAt(0) >= 65 && k.codePointAt(0) <= 90
    ).sort();
}

/**
 * Update linestyle textarea
 *
 * @param {Object} system
 */
function updateLinestyleInput(system) {
    const symbolSelect = document.querySelector("#symbol-select");

    symbolSelect.selectedIndex = 0;
    while (symbolSelect.firstChild) {
        symbolSelect.removeChild(symbolSelect.firstChild);
    }

    const symbols = extractSymbols(system["productions"]);
    for (const s of symbols) {
        const option = document.createElement("option");
        option.value = s;
        option.textContent = s;
        symbolSelect.appendChild(option);
        if (linestyles[s] === undefined) {
            linestyles[s] = {...defaultLineStyle};
        }
    }

    symbolSelect.dispatchEvent(new Event("input", { bubbles: true }));
}

customElements.define("number-input", NumberInput, { extends: "input" });

window.onload = function(ev) {
    ctx0 = document.querySelector("#canvas0").getContext("2d");
    ctx1 = document.querySelector("#canvas1").getContext("2d");

    let system = undefined;

    const systemSelect = document.querySelector("#system-select");
    const systemInput = document.querySelector("#system-input");
    systemSelect.selectedIndex = 0;

    systemInput.addEventListener("blur", function(ev) {
        try {
            system = JSON.parse(ev.target.value);
        } catch (error) {
            return;
        }

        updateLinestyleInput(system);
    });

    systemSelect.addEventListener("input", function(ev) {
        system = systems[ev.target.selectedIndex];
        systemInput.value = JSON.stringify(system, undefined, 2);
        updateLinestyleInput(system);
    });
    systemInput.value = JSON.stringify(systems[systemSelect.selectedIndex], undefined, 2);
    system = systems[systemSelect.selectedIndex];
    updateLinestyleInput(system);

    const symbolSelect = document.querySelector("#symbol-select");
    const linestyleInput = document.querySelector("#linestyle-input");

    symbolSelect.addEventListener("input", function(ev) {
        linestyleInput.value = JSON.stringify(linestyles[ev.target.value], undefined, 2);
    });
    linestyleInput.value = JSON.stringify(linestyles[symbolSelect.value], undefined, 2);

    linestyleInput.addEventListener("input", function(ev) {
        try {
            linestyles[symbolSelect.value] = JSON.parse(ev.target.value);
        } catch (error) {
            return;
        }
    });

    let frame = undefined;
    let animate = false;
    let time = 0.0;
    let angle = 0.0;

    const  drawingParameters = {
        zoom: 1.0,
    };

    const animateCallback = function() {
        if (system === undefined || state === null) {
            system = JSON.parse(systemInput.value);
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
        }, drawingParameters);

        if (animate) {
            frame = window.requestAnimationFrame(() => animateCallback());
        }
    }

    window.addEventListener("keydown", function(ev) {
        switch (ev.key) {
        case "Enter":
            if (!ev.shiftKey) {
                break;
            }

            animate = false;
            if (frame !== undefined) {
                window.cancelAnimationFrame(frame);
            }

            system = JSON.parse(systemInput.value);
            run(system, system["level"], {...drawingParameters, ...{ animate: ev.ctrlKey }});
            ev.preventDefault();
            break;
        case " ":
            if (ev.ctrlKey) {
                system = undefined;
                drawingParameters["zoom"] = 1.0;
                time = 0.0;
                angle = 0.0;
            }
            animate = !animate;

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

        system = system || JSON.parse(systemInput.value);
        drawingParameters["zoom"] += ev.deltaY < 0 ? 0.1 : -0.1;

        if (!animate) {
            draw({
                step: 10,
                heading: [0.0, -1.0],
                position: [0, 0],
                angle: Math.PI / 180 * system["angle"]
            }, { zoom: drawingParameters["zoom"] });
        }
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
