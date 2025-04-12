/** @type {Object<string,HTMLElement>} */
const systemControls = {
    angle: document.querySelector("#system-input-angle"),
    level: document.querySelector("#system-input-level"),
    axiom: document.querySelector("#system-input-axiom"),
    rules: document.querySelector("#system-input-rules"),
    consts: document.querySelector("#system-input-consts"),
    tropism: document.querySelector("#system-input-tropism"),
};

/** @type {Object<string,HTMLElement>} */
const styleControls = {
    draw: document.querySelector("#style-input-draw"),
    width: document.querySelector("#style-input-width"),
    color: document.querySelector("#style-input-color"),
};

/** @type {Object<string,HTMLElement>} */
const generalControls = {
    background: document.querySelector("#general-input-background"),
}

/** @type {Object<string,any>} */
const defaultLineStyle = {
    draw: false,
    width: 1.0,
    color: [1.0, 0.0, 0.0, 1.0],
};

/**
 * Update linestyle controls
 *
 * @param {Object<string,any>} linestyles
 */
function updateLinestyleInput(linestyles) {
    const linestyle = linestyles[document.querySelector("#symbol-select").value];
    styleControls["draw"].checked = linestyle["draw"];
    styleControls["width"].setValue(linestyle["width"]);
    styleControls["color"].setRgba(linestyle["color"]);
}

/**
 * Update the input fields for the system
 *
 * @param {import("./systems").SystemInput} system - unparsed system
 */
function updateSystemInput(system) {
    systemControls["angle"].setValue(system["angle"]);
    systemControls["level"].setValue(system["level"]);

    systemControls["tropism"].value = system["tropism"].join(",");
    systemControls["axiom"].value = system["axiom"].join(" ");

    systemControls["rules"].setData(system["productions"]);
    systemControls["consts"].setData(system["consts"] || {});

    systemControls["rules"].render();
    systemControls["consts"].render();
}

/**
 * Read linestyle from UI
 *
 * @returns {Object<string,any>}
 */
function getLinestyleInput() {
    return {
        draw: styleControls["draw"].checked,
        width: styleControls["width"].getValue(),
        color: styleControls["color"].getRgba(),
    };
}

/**
 * Read system inputs from UI
 *
 * @returns {import("./systems").SystemInput}
 */
function getSystemInput() {
    return {
        angle: systemControls["angle"].getValue(),
        level: systemControls["level"].getValue(),
        axiom: systemControls["axiom"].value.split(" ").filter(s => s.length > 0),
        productions: systemControls["rules"].getData(),
        consts: systemControls["consts"].getData(),
        tropism: systemControls["tropism"].value.split(",").map(s => parseFloat(s.trim())),
    };
}

/**
 * Read general inputs from UI
 *
 * @returns {Object<string,any>}
 */
function getGeneralInput() {
    return {
        background: generalControls["background"].getRgb(),
    };
}

/**
 * Extract symbols from production rules
 *
 * @param {Object<string,any>} system - parsed system
 *
 * @returns {Array}
 */
function extractSymbols(system) {
    let symbols = system["symbols"];

    return (new Array(...symbols)).filter(
        k => k.length === 1 && k.codePointAt(0) >= 65 && k.codePointAt(0) <= 90
    ).sort();
}

/**
 * Update linestyle select
 *
 * @param {Object<string,any>} system - parsed system
 * @param {Object<string,any>} linestyles - will be modified
 */
function updateLinestyleSelect(system, linestyles) {
    const symbolSelect = document.querySelector("#symbol-select");
    const prevSelected = symbolSelect.value;

    symbolSelect.selectedIndex = 0;
    while (symbolSelect.firstChild) {
        symbolSelect.removeChild(symbolSelect.firstChild);
    }

    const symbols = extractSymbols(system);
    for (const s of symbols) {
        const option = document.createElement("option");
        option.value = s;
        option.textContent = s;
        symbolSelect.appendChild(option);
        if (linestyles[s] === undefined) {
            linestyles[s] = {...defaultLineStyle};
        }
    }
    const selectedIndex = symbols.indexOf(prevSelected);
    symbolSelect.selectedIndex = selectedIndex >= 0 ? selectedIndex : 0;

    symbolSelect.dispatchEvent(new Event("input", { bubbles: true }));
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
 * @param {() => void} callback
 */
function connectUpdateHandler(callback) {
    systemControls["angle"].addEventListener("input", () => callback());
    systemControls["level"].addEventListener("input", () => callback());
    systemControls["axiom"].addEventListener("input", () => callback());
    systemControls["rules"].addEventListener("input", () => callback());
    systemControls["consts"].addEventListener("input", () => callback());
    systemControls["tropism"].addEventListener("input", () => callback());

    styleControls["draw"].addEventListener("input", () => callback());
    styleControls["width"].addEventListener("input", () => callback());
    styleControls["color"].addEventListener("input", () => callback());
}

export {
    displayStatistics,
    getLinestyleInput,
    getSystemInput,
    getGeneralInput,
    updateLinestyleInput,
    updateLinestyleSelect,
    updateSystemInput,
    connectUpdateHandler,
};
