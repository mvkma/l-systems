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
    displayStatistics,
    getLinestyleInput,
    getSystemInput,
    updateLinestyleInput,
    updateLinestyleSelect,
    updateSystemInput,
} from "./ui.js";
import { BYTES_PER_FLOAT, BYTES_PER_LINE, updateLines } from "./lines.js";

customElements.define("number-input", NumberInput, { extends: "input" });
customElements.define("key-value-input", KeyValueInput);
customElements.define("rgba-input", RGBAInput);

const RAD_PER_DEG = Math.PI / 180;

/** @type {import("./language.js").Symbol[]} */
let state = null;

/** @type {Object<string,any>} */
const linestyles = {
    "F": {
        draw: true,
        width: 1.0,
        color: [1.0, 1.0, 0.0, 1.0],
        shadowOffsetX: 0.0,
        shadowOffsetY: 0.0,
        shadowBlur: 0.0,
        shadowColor: [0.0, 0.0, 0.0, 1.0],
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
        [ Math.cos(angle), Math.sin(angle)],
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

    let turtle = new Float32Array([
        initialTurtle["position"][0],
        initialTurtle["position"][1],
        initialTurtle["heading"][0],
        initialTurtle["heading"][1],
        1.0,
    ]);

    const rotPos = rotationMatrix(initialTurtle["angle"]);
    const rotNeg = rotationMatrix(-initialTurtle["angle"]);

    const numLines = state
          .map(s => s.symbol)
          .filter(k => k[0] >= "A" && k[0] <= "Z")
          .length;

    const boundingBox = new Float32Array([turtle[0], turtle[0], turtle[1], turtle[1]]);
    const pointData = new Float32Array(numLines * BYTES_PER_LINE / BYTES_PER_FLOAT);
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

    const addWidth = function(w) {
        pointData[pos] = w;
        pos += 1;
    }

    const addSegment = function(p0, p1, color, width) {
        addPoint(p0);
        addPoint(p1);
        addColor(color);
        addWidth(width);
    };

    const tmp = new Float32Array([0, 0]);

    /** @type {(symbol: import("./language.js").Symbol) => void} */
    const drawingStep = function(symbol) {
        const symb = symbol.symbol;
        const step = (symbol.values["s"] || initialTurtle["step"]);

        switch (symb) {
        case "f":
            turtle[0] = turtle[0] + step * turtle[2];
            turtle[1] = turtle[1] + step * turtle[3];
            break;
        case "+":
        case "-":
            tmp[0] = turtle[2];
            tmp[1] = turtle[3];
            const angle = symbol.values["a"];
            let rotation;

            if (angle === undefined) {
                rotation = symb === "+" ? rotPos : rotNeg;
            } else {
                rotation = symb === "+" ?
                    rotationMatrix( angle * RAD_PER_DEG) :
                    rotationMatrix(-angle * RAD_PER_DEG);
            }

            turtle[2] = tmp[0] * rotation[0][0] + tmp[1] * rotation[0][1];
            turtle[3] = tmp[0] * rotation[1][0] + tmp[1] * rotation[1][1];
            break;
        case "[":
            stack.push(turtle.slice());
            break;
        case "]":
            turtle = stack.pop();
            break;
        case "!":
            turtle[4] = symbol.values["w"] || 1.0;
            break;
        default:
            const draw = (linestyles[symb] && linestyles[symb]["draw"]) || false;
            if (!draw) {
                break;
            }
            const style = linestyles[symb];
            tmp[0] = turtle[0];
            tmp[1] = turtle[1];
            turtle[0] = turtle[0] + step * turtle[2];
            turtle[1] = turtle[1] + step * turtle[3];
            addSegment(tmp, turtle, style.color, style.width * turtle[4]);
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

    for (const c of state) {
        const symb = c.symbol;
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

