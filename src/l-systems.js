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
import { updateLines } from "./lines.js";

customElements.define("number-input", NumberInput, { extends: "input" });
customElements.define("key-value-input", KeyValueInput);
customElements.define("rgba-input", RGBAInput);

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
 * @param {Object} initialTurtle
 */
function getLineSegmentBuffer(initialTurtle) {
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

    const boundingBox = new Float32Array([turtle[0], turtle[0], turtle[1], turtle[1]]);
    const pointData = new Float32Array(numLines * (4 + 4));
    let pos = 0;

    const updateBoundingBox = function(p) {
        boundingBox[0] = Math.min(boundingBox[0], p[0]);
        boundingBox[1] = Math.max(boundingBox[1], p[0]);
        boundingBox[2] = Math.min(boundingBox[2], p[1]);
        boundingBox[3] = Math.max(boundingBox[3], p[1]);
    }

    const addPoint = function(p) {
        pointData[pos + 0] = p[0];
        pointData[pos + 1] = p[1];
        pos += 2;
        updateBoundingBox(p);
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

    return {
        pointData: pointData,
        boundingBox: boundingBox,
    };
}

/**
 * Count symbols and calculate stack depth
 *
 * @returns {Object}
 */
function computeStatistics() {
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
function displayStatistics(stats) {
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
    document.querySelector("#timings-turtle").textContent = stats["turtle"] + " ms";
    document.querySelector("#timings-render").textContent = stats["render"] + " ms";
}

/**
 * @param {() => void} func
 * @returns {number}
 */
function timeIt(func) {
    const t0 = performance.now();
    func();
    return performance.now() - t0;
}

/**
 * Evolve system to the given level
 *
 * @param {import("./language.js").ParsedSystem} system
 */
function run(system) {
    const turtle = {
        step: 1,
        heading: [0.0, -1.0],
        position: [0, 0],
        angle: Math.PI / 180 * system.angle,
    }

    let pointData, boundingBox;
    const timings = {};

    timings["evolve"] = timeIt(() => {
        state = evolve(system.axiom, system.rules, system.consts, system.level);
    });

    timings["turtle"] = timeIt(() => {
        const lines = getLineSegmentBuffer(turtle);
        pointData = lines.pointData;
        boundingBox = lines.boundingBox;
    });

    timings["render"] = timeIt(() => {
        updateLines(pointData, boundingBox);
    });

    displayStatistics({...timings, ...computeStatistics()});
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

window.addEventListener("keydown", function(ev) {
    if (ev.key === "Enter" && ev.shiftKey) {
        ev.preventDefault();
        system = parseSystem(getSystemInput());
        run(system);
        updateLinestyleSelect(system, linestyles);
    }
});

