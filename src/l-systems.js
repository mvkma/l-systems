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
    connectUpdateHandler,
    displayStatistics,
    getGeneralInput,
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

const RAD_PER_DEG = Math.PI / 180;

/** @type {import("./language.js").Symbol[]} */
let state = null;

/** @type {Object<string,any>} */
const linestyles = {
    "F": {
        draw: true,
        width: 1.0,
        color: [0.75, 0.25, 0.25, 1.0],
    }
}

/**
 * Matrix multiplication
 *
 * @param {Float32Array} A
 * @param {Float32Array} B
 * @param {Float32Array} C
 */
function matMul(A, B, C) {
    C[0] = A[0] * B[0] + A[1] * B[3] + A[2] * B[6];
    C[1] = A[0] * B[1] + A[1] * B[4] + A[2] * B[7];
    C[2] = A[0] * B[2] + A[1] * B[5] + A[2] * B[8];
    C[3] = A[3] * B[0] + A[4] * B[3] + A[5] * B[6];
    C[4] = A[3] * B[1] + A[4] * B[4] + A[5] * B[7];
    C[5] = A[3] * B[2] + A[4] * B[5] + A[5] * B[8];
    C[6] = A[6] * B[0] + A[7] * B[3] + A[8] * B[6];
    C[7] = A[6] * B[1] + A[7] * B[4] + A[8] * B[7];
    C[8] = A[6] * B[2] + A[7] * B[5] + A[8] * B[8];
}

/**
 * Cross product
 *
 * @param {Float32Array} v
 * @param {Float32Array} w
 * @param {Float32Array} target 
 */
function cross(v, w, target) {
    target[0] = v[1] * w[2] - v[2] * w[1];
    target[1] = v[2] * w[0] - v[0] * w[2];
    target[2] = v[0] * w[1] - v[1] * w[0];
}

/**
 * Rotation around x axis
 *
 * @param {number} radians - angle in radians
 * @returns {Float32Array}
 */
function rotationX(radians) {
    const c = Math.cos(radians);
    const s = Math.sin(radians);
    return new Float32Array([1, 0, 0, 0, c, -s, 0, s, c]);
}

/**
 * Rotation around y axis
 *
 * @param {number} radians - angle in radians
 * @returns {Float32Array}
 */
function rotationY(radians) {
    const c = Math.cos(radians);
    const s = Math.sin(radians);
    return new Float32Array([c, 0, -s, 0, 1, 0, s, 0, c]);
}

/**
 * Rotation around z axis
 *
 * @param {number} radians - angle in radians
 * @returns {Float32Array}
 */
function rotationZ(radians) {
    const c = Math.cos(radians);
    const s = Math.sin(radians);
    return new Float32Array([c, s, 0, -s, c, 0, 0, 0, 1]);
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
 * @param {import("./language.js").ParsedSystem} system
 */
function getLineSegmentBuffer3D(system) {
    const stack = [];

    let turtle3D = {
        position: new Float32Array([0, 0, 0]),
        orientation: new Float32Array([0, 1, 0, 1, 0, 0, 0, 0, 1]),
        linewidth: 1.0,
    };

    const tropism = new Float32Array(system.tropism);

    const rotations = {
        "+": (a) => rotationZ( a),
        "-": (a) => rotationZ(-a),
        "&": (a) => rotationY( a),
        "^": (a) => rotationY(-a),
        "<": (a) => rotationX( a),
        ">": (a) => rotationX(-a),
    };

    const defaultRotations = {
        "+": rotationZ( system.angle * RAD_PER_DEG),
        "-": rotationZ(-system.angle * RAD_PER_DEG),
        "&": rotationY( system.angle * RAD_PER_DEG),
        "^": rotationY(-system.angle * RAD_PER_DEG),
        "<": rotationX( system.angle * RAD_PER_DEG),
        ">": rotationX(-system.angle * RAD_PER_DEG),
    };

    const numLines = state.map(s => s.symbol).filter(k => k[0] >= "A" && k[0] <= "Z").length;

    const boundingBox = new Float32Array([0, 0, 0, 0, 0, 0]);
    const pointBuffer = new Float32Array(numLines * (6 + 4 + 1));

    let pos = 0;

    const updateBoundingBox = function(p) {
        boundingBox[0] = Math.min(boundingBox[0], p[0]);
        boundingBox[1] = Math.max(boundingBox[1], p[0]);
        boundingBox[2] = Math.min(boundingBox[2], p[1]);
        boundingBox[3] = Math.max(boundingBox[3], p[1]);
        boundingBox[4] = Math.min(boundingBox[4], p[2]);
        boundingBox[5] = Math.max(boundingBox[5], p[2]);
    }

    const addPoint = function(p) {
        pointBuffer[pos + 0] = p[0];
        pointBuffer[pos + 1] = p[1];
        pointBuffer[pos + 2] = p[2];
        pos += 3;
        updateBoundingBox(p);
    }

    const addColor = function(c) {
        pointBuffer[pos + 0] = c[0];
        pointBuffer[pos + 1] = c[1];
        pointBuffer[pos + 2] = c[2];
        pointBuffer[pos + 3] = c[3];
        pos += 4;
    }

    const addWidth = function(w) {
        pointBuffer[pos] = w;
        pos += 1;
    }

    const addSegment = function(p0, p1, color, width) {
        addPoint(p0);
        addPoint(p1);
        addColor(color);
        addWidth(width);
    };

    const tmpVec = new Float32Array(3);
    const tmpMat = new Float32Array(9);

    /** @type {(symbol: import("./language.js").Symbol) => void} */
    const drawingStep = function(symbol) {
        const symb = symbol.symbol;
        const step = symbol.values["s"] || 1.0;

        switch (symb) {
        case "f":
            turtle3D.position[0] = turtle3D.position[0] + step * turtle3D.orientation[0];
            turtle3D.position[1] = turtle3D.position[1] + step * turtle3D.orientation[3];
            turtle3D.position[2] = turtle3D.position[2] + step * turtle3D.orientation[6];
            break;
        case "+":
        case "-":
        case "&":
        case "^":
        case ">":
        case "<":
            let rotation;
            const angle = symbol.values["a"];
            if (angle === undefined) {
                rotation = defaultRotations[symb];
            } else {
                rotation = rotations[symb](angle * RAD_PER_DEG);
            }

            matMul(turtle3D.orientation, rotation, tmpMat);
            // turtle3D.orientation = tmpMat;
            turtle3D.orientation.set(tmpMat);
            break;
        case "[":
            // TODO: Should be a better way to do this
            stack.push({
                position: turtle3D.position.slice(),
                orientation: turtle3D.orientation.slice(),
                linewidth: turtle3D.linewidth,
            });
            break;
        case "]":
            turtle3D = stack.pop();
            break;
        case "!":
            turtle3D.linewidth = symbol.values["w"] || 1.0;
            break;
        default:
            const draw = (linestyles[symb] && linestyles[symb]["draw"]) || false;
            if (!draw) {
                break;
            }
            const style = linestyles[symb];
            tmpVec.set(turtle3D.position);
            turtle3D.position[0] = turtle3D.position[0] + step * turtle3D.orientation[0];
            turtle3D.position[1] = turtle3D.position[1] + step * turtle3D.orientation[3];
            turtle3D.position[2] = turtle3D.position[2] + step * turtle3D.orientation[6];
            addSegment(tmpVec, turtle3D.position, style.color, style.width * turtle3D.linewidth);

            // tropism
            tmpVec[0] = turtle3D.orientation[0];
            tmpVec[1] = turtle3D.orientation[3];
            tmpVec[2] = turtle3D.orientation[6];
            cross(tmpVec, tropism, tmpMat);
            const sinTheta = Math.sqrt(tmpMat[0] * tmpMat[0] +
                                       tmpMat[1] * tmpMat[1] +
                                       tmpMat[2] * tmpMat[2]);
            if (sinTheta !== 0) {
                const theta = Math.asin(sinTheta);
                matMul(turtle3D.orientation, rotationY(theta), tmpMat);
                turtle3D.orientation.set(tmpMat);
            }
            break;
        }
    };

    for (const symbol of state) {
        drawingStep(symbol);
    }

    return {
        pointBuffer: pointBuffer,
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
    let pointBuffer, boundingBox;
    const background = getGeneralInput()["background"];
    const timings = {};

    timings["evolve"] = timeIt(() => {
        state = evolve(system.axiom, system.rules, system.consts, system.level);
    });

    timings["turtle"] = timeIt(() => {
        const lines = getLineSegmentBuffer3D(system);
        pointBuffer = lines.pointBuffer;
        boundingBox = lines.boundingBox;
    });

    timings["render"] = timeIt(() => {
        updateLines(pointBuffer, boundingBox, background);
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

function render() {
    system = parseSystem(getSystemInput());
    run(system);
    updateLinestyleSelect(system, linestyles);
}

const liveUpdateCheckbox = document.querySelector("#general-input-live");

connectUpdateHandler(() => {
    if (liveUpdateCheckbox.checked) {
        render();
    }
});

window.addEventListener("keydown", function(ev) {
    if (ev.key === "Enter" && ev.shiftKey) {
        ev.preventDefault();
        render();
    }
});

render();
