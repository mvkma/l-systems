import {
    systems
} from "./systems.js";

import {
    KeyValueInput,
    NumberInput,
    RGBAInput
} from "./components.js";

import {
    evolve,
    parseSystem,
} from "./language.js";

import {
    getLinestyleInput,
    getSystemInput,
    updateLinestyleInput,
    updateLinestyleSelect,
    updateSystemInput,
} from "./ui.js";
import { renderLines } from "./lines.js";

customElements.define("number-input", NumberInput, { extends: "input" });
customElements.define("key-value-input", KeyValueInput);
customElements.define("rgba-input", RGBAInput);

/** @type {CanvasRenderingContext2D} */
const ctx0 = document.querySelector("#canvas0").getContext("2d");

/** @type {CanvasRenderingContext2D} */
const ctx1 = document.querySelector("#canvas1").getContext("2d");

/** @type {import("./language.js").Symbol[]} */
let state = null;

/** @type {Object<string,any>} */
const linestyles = {
    "F": {
        draw: true,
        width: 1.0,
        color: "rgb(255 0 0 / 100%)",
        scale: 1.0,
        shadowOffsetX: 0.0,
        shadowOffsetY: 0.0,
        shadowBlur: 0.0,
        shadowColor: "rgb(0 0 0 / 0%)",
    }
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
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} initialTurtle
 */
function centerTransform(ctx, initialTurtle) {
    const stack = [];
    let turtle = new Float32Array([...initialTurtle["position"], ...initialTurtle["heading"]]);
    let step, angle;

    const rotPos = rotationMatrix(initialTurtle["angle"]);
    const rotNeg = rotationMatrix(-initialTurtle["angle"]);

    let cur, mat;
    let draw, prev;

    const bounds = new Float32Array([turtle[0], turtle[0], turtle[1], turtle[1]]);

    for (const c of state) {
        switch (c["symbol"]) {
        case "f":
            step = c["values"]["s"] || initialTurtle["step"];
            turtle[0] = turtle[0] + step * turtle[2];
            turtle[1] = turtle[1] + step * turtle[3];
            bounds[0] = Math.min(bounds[0], turtle[0]);
            bounds[1] = Math.max(bounds[1], turtle[0]);
            bounds[2] = Math.min(bounds[2], turtle[1]);
            bounds[3] = Math.max(bounds[3], turtle[1]);
            break;
        case "+":
        case "-":
            angle = c["values"]["a"];
            if (angle === undefined) {
                mat = c["symbol"] === "+" ? rotPos : rotNeg;
            } else {
                angle = angle / 180 * Math.PI;
                mat = c["symbol"] === "+" ? rotationMatrix(angle) : rotationMatrix(-angle);
            }
            cur = turtle.slice(2, 4);
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
                draw = (linestyles[c["symbol"]] && linestyles[c["symbol"]]["draw"]) || false;
                if (!draw) {
                    break;
                }
                prev = c;
            }
            step = c["values"]["s"] || initialTurtle["step"];
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

    const r = Math.max(dx / ctx.canvas.width, dy / ctx.canvas.height);

    const sx = (ctx.canvas.width - dx / r) / 2.0;
    const sy = (ctx.canvas.height - dy / r) / 2.0;

    return [r, -bounds[0] / r + sx, -bounds[2] / r + sy];
}

/**
 * Plot state linearly
 *
 * @param {CanvasRenderingContext2D}
 * @param {number} depth
 */
function plot(ctx, depth) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    let x = 0;
    let y = 0;
    let dx = ctx.canvas.width / state.length;
    let dy = ctx.canvas.height / depth;

    for (const c of state) {
        ctx.fillStyle = "yellow";
        switch (c["symbol"]) {
        case "F":
            ctx.fillStyle = "lightblue";
            break;
        case "f":
            ctx.fillStyle = "lightgrey";
            break;
        case "+":
            ctx.fillStyle = "green";
            break;
        case "-":
            ctx.fillStyle = "red";
            break;
        case "[":
            y += dy / 2;
            ctx.fillStyle = "grey";
            break;
        case "]":
            y -= dy / 2;
            ctx.fillStyle = "grey";
            break;
        default:
            break;
        }
        ctx.fillRect(x, y, dx, dy);
        x += dx;
    }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} initialTurtle
 * @param {Object} drawingParams
 */
function draw(ctx, initialTurtle, drawingParams = {}) {
    const stack = [];
    const animate = drawingParams["animate"] || false;
    const interval = drawingParams["interval"] || 2;
    const zoom = drawingParams["zoom"] || 1.0;

    const [r, deltax, deltay] = centerTransform(ctx, initialTurtle);

    let turtle = new Float32Array([
        initialTurtle["position"][0] + deltax,
        initialTurtle["position"][1] + deltay,
        initialTurtle["heading"][0],
        initialTurtle["heading"][1],
    ]);
    // const step = initialTurtle["step"] / r;
    let step, angle;

    const rotPos = rotationMatrix(initialTurtle["angle"]);
    const rotNeg = rotationMatrix(-initialTurtle["angle"]);

    let cur, mat;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-ctx.canvas.width / 2, -ctx.canvas.height / 2);

    let prev, draw;

    ctx.beginPath();
    ctx.moveTo(...turtle);

    const drawingStep = function (c) {
        switch (c["symbol"]) {
        case "f":
            step = (c["values"]["s"] || initialTurtle["step"]) / r;
            turtle[0] = turtle[0] + step * turtle[2];
            turtle[1] = turtle[1] + step * turtle[3];
            ctx.moveTo(...turtle);
            break;
        case "+":
        case "-":
            angle = c["values"]["a"];
            if (angle === undefined) {
                mat = c["symbol"] === "+" ? rotPos : rotNeg;
            } else {
                angle = angle / 180 * Math.PI;
                mat = c["symbol"] === "+" ? rotationMatrix(angle) : rotationMatrix(-angle);
            }
            cur = turtle.slice(2, 4);
            turtle[2] = cur[0] * mat[0][0] + cur[1] * mat[0][1];
            turtle[3] = cur[0] * mat[1][0] + cur[1] * mat[1][1];
            break;
        case "[":
            stack.push(turtle.slice());
            break;
        case "]":
            turtle = stack.pop();
            ctx.moveTo(...turtle);
            break;
        default:
            if (prev !== c) {
                const symb = c["symbol"];
                draw = (linestyles[symb] && linestyles[symb]["draw"]) || false;
                if (!draw) {
                    break;
                }
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(...turtle);
                ctx.lineWidth = linestyles[symb]["width"];
                ctx.strokeStyle = linestyles[symb]["color"];
                ctx.shadowOffsetX = linestyles[symb]["shadowOffsetX"];
                ctx.shadowOffsetY = linestyles[symb]["shadowOffsetY"];
                ctx.shadowBlur = linestyles[symb]["shadowBlur"];
                ctx.shadowColor = linestyles[symb]["shadowColor"];
                prev = c;
            }
            step = (c["values"]["s"] || initialTurtle["step"]) / r;
            turtle[0] = turtle[0] + step * turtle[2];
            turtle[1] = turtle[1] + step * turtle[3];
            ctx.lineTo(...turtle);
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
            ctx.beginPath();
            ctx.moveTo(...turtle);
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
    ctx.resetTransform();
}

/**
 * @param {WebGL2RenderingContext} gl
 */
function getLineSegmentBuffer(initialTurtle, drawingParams = {}) {
    const stack = [];
    const r = 1.0;

    let turtle = new Float32Array([
        initialTurtle["position"][0],
        initialTurtle["position"][1],
        initialTurtle["heading"][0],
        initialTurtle["heading"][1],
    ]);

    const rotPos = rotationMatrix(initialTurtle["angle"]);
    const rotNeg = rotationMatrix(-initialTurtle["angle"]);

    const numLines = state.map(s => s.symbol).filter(k => k[0] >= "A" && k[0] <= "Z").length;

    let pointData = new Float32Array(numLines * (4 + 4));
    let pos = 0;

    const addPoint = function(p) {
        pointData[pos + 0] = p[0];
        pointData[pos + 1] = p[1];
        pos += 2;
    }

    const addColor = function(c) {
        pointData[pos + 0] = c[0];
        pointData[pos + 1] = c[1];
        pointData[pos + 2] = c[2];
        pointData[pos + 3] = c[3];
        pos += 4;
    }

    const addSegment = function(p0, p1, color) {
        addPoint(p0);
        addPoint(p1);
        addColor(color);
    };

    /** @type {(symbol: import("./language.js").Symbol) => void} */
    const drawingStep = function(symbol) {
        const symb = symbol.symbol;
        const step = (symbol.values["s"] || initialTurtle["step"]) / r;

        switch (symb) {
        case "f":
            turtle[0] = turtle[0] + step * turtle[2];
            turtle[1] = turtle[1] + step * turtle[3];
            break;
        case "+":
        case "-":
            const heading = turtle.slice(2, 4);
            const angle = symbol.values["a"];
            let rotation;

            if (angle === undefined) {
                rotation = symb === "+" ? rotPos : rotNeg;
            } else {
                rotation = symb === "+" ? rotationMatrix(angle) : rotationMatrix(-angle);
            }

            turtle[2] = heading[0] * rotation[0][0] + heading[1] * rotation[0][1];
            turtle[3] = heading[0] * rotation[1][0] + heading[1] * rotation[1][1];
            break;
        case "[":
            stack.push(turtle.slice());
            break;
        case "]":
            turtle = stack.pop();
            break;
        default:
            const draw = (linestyles[symb] && linestyles[symb]["draw"]) || false;
            if (!draw) {
                break;
            }
            const p0 = turtle.slice(0, 2);
            turtle[0] = turtle[0] + step * turtle[2];
            turtle[1] = turtle[1] + step * turtle[3];
            addSegment(p0, turtle.slice(0, 2), [1.0, 0.0, 0.0, 1.0]);
            break;
        }
    };

    for (const symbol of state) {
        drawingStep(symbol);
    }

    return pointData;
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
    let symb;

    for (const c of state) {
        symb = c["symbol"];
        counts[symb] = counts[symb] + 1 || 0;

        if (symb === "[") {
            cur += 1;
            depth = Math.max(depth, cur);
        } else if (symb === "]") {
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
 * @param {CanvasRenderingContext2D} ctx0
 * @param {CanvasRenderingContext2D} ctx1
 * @param {Object} system
 * @param {number} level
 * @param {Object} drawingParams
 */
function run(ctx0, ctx1, system, drawingParams = {}) {
    state = system["axiom"];

    const turtle = {
        step: 10,
        heading: [0.0, -1.0],
        position: drawingParams["offset"] || [0, 0],
        angle: Math.PI / 180 * system["angle"],
    }

    console.log(system);

    let stats = {};
    let t0;

    t0 = performance.now();
    state = evolve(system["axiom"], system["rules"], system["consts"], system["level"]);
    stats["evolve"] = performance.now() - t0;

    stats = {...stats, ...statistics()};

    t0 = performance.now();
    plot(ctx1, stats["depth"]);
    stats["plot"] = performance.now() - t0;

    t0 = performance.now();
    draw(ctx0, turtle, drawingParams);
    stats["turtle"] = performance.now() - t0;

    t0 = performance.now();
    const buffer = getLineSegmentBuffer(turtle);
    renderLines(buffer, buffer.length / 8);
    console.log(performance.now() - t0);

    show(stats);
}

/** @type {import("./language.js").ParsedSystem} */
let system = undefined;

const systemSelect = document.querySelector("#system-select");
systemSelect.selectedIndex = 0;

systemSelect.addEventListener("input", function(ev) {
    system = parseSystem(systems[ev.target.selectedIndex]);
    updateSystemInput(systems[systemSelect.selectedIndex]);
    updateLinestyleSelect(system, linestyles);
});
updateSystemInput(systems[systemSelect.selectedIndex]);
system = parseSystem(systems[systemSelect.selectedIndex]);
updateLinestyleSelect(system, linestyles);

const symbolSelect = document.querySelector("#symbol-select");

symbolSelect.addEventListener("input", function(ev) {
    updateLinestyleInput(linestyles);
});
updateLinestyleInput(linestyles);

document.querySelector("#view-controls").querySelectorAll("input, rgba-input").forEach(function(el) {
    el.addEventListener("input", function(ev) {
        linestyles[symbolSelect.value] = getLinestyleInput();
    });
});

let frame = undefined;
let animate = false;
let time = 0.0;
let angle = 0.0;

const  drawingParameters = {
    zoom: 1.0,
    offset: [0.0, 0.0],
};

const animateCallback = function() {
    if (system === undefined || state === null) {
        system = parseSystem(getSystemInput());
        run(ctx0, ctx1, system);
    }

    if (time >= 1.0) {
        time = 0.0;
    }

    angle = 0.5 + 4.0 * Math.pow((time - 0.5), 3.0);
    angle *= 180;
    time += 0.005;
    draw(ctx0,
         {
             step: 10,
             heading: [0.0, -1.0],
             position: drawingParameters["offset"],
             angle: Math.PI / 180 * angle
         },
         drawingParameters
        );

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

        system = parseSystem(getSystemInput());
        run(ctx0, ctx1, system, {...drawingParameters, ...{ animate: ev.ctrlKey }});
        updateLinestyleSelect(system, linestyles);
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

    system = system || parseSystem(getSystemInput());
    drawingParameters["zoom"] += ev.deltaY < 0 ? 0.1 : -0.1;
    console.log(ev);

    if (!animate) {
        draw(ctx0,
             {
                 step: 10,
                 heading: [0.0, -1.0],
                 position: drawingParameters["offset"],
                 angle: Math.PI / 180 * system["angle"]
             },
             {
                 zoom: drawingParameters["zoom"]
             }
            );
    }
    ev.preventDefault();
});

const touches = {};

ctx0.canvas.addEventListener("pointerdown", function(ev) {
    touches[ev.pointerId] = { pageX: ev.pageX, pageY: ev.pageY, moved: false };
    ev.preventDefault();
});

ctx0.canvas.addEventListener("pointermove", function(ev) {
    const touch = touches[ev.pointerId];
    if (touch === undefined) {
        return;
    }

    if (state === null) {
        ev.preventDefault();
        return;
    }

    const dx = ev.pageX - touch.pageX;
    const dy = ev.pageY - touch.pageY;
    touch.pageX = ev.pageX;
    touch.pageY = ev.pageY;
    touch.moved = true;

    system = system || parseSystem(getSystemInput());
    drawingParameters["offset"][0] += dx * 2;
    drawingParameters["offset"][1] += dy * 2;
    if (!animate) {
        draw(ctx0,
             {
                 step: 10,
                 heading: [0.0, -1.0],
                 position: drawingParameters["offset"],
                 angle: Math.PI / 180 * system["angle"]
             },
             {
                 zoom: drawingParameters["zoom"],
             });
    }

    ev.preventDefault();
});

ctx0.canvas.addEventListener("pointerup", function(ev) {
    delete touches[ev.pointerId];
    ev.preventDefault();
});

ctx0.canvas.addEventListener("pointercancel", function(ev) {
    delete touches[ev.pointerId];
    ev.preventDefault();
});
