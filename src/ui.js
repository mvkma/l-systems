/**
 * @type {Object<string,HTMLElement>}
 */
const systemControls = {
    angle: document.querySelector("#system-input-angle"),
    level: document.querySelector("#system-input-level"),
    axiom: document.querySelector("#system-input-axiom"),
    rules: document.querySelector("#system-input-rules"),
    consts: document.querySelector("#system-input-consts"),
};

/**
 * @type {Object<string,HTMLElement>}
 */
const styleControls = {
    draw: document.querySelector("#style-input-draw"),
    width: document.querySelector("#style-input-width"),
    scale: document.querySelector("#style-input-scale"),
    color: document.querySelector("#style-input-color"),
    shadowOffsetX: document.querySelector("#style-input-shadow-offset-x"),
    shadowOffsetY: document.querySelector("#style-input-shadow-offset-y"),
    shadowBlur: document.querySelector("#style-input-shadow-blur"),
    shadowColor: document.querySelector("#style-input-shadow-color"),
};

/**
 * @type {Object<string,any>}
 */
const defaultLineStyle = {
    draw: false,
    width: 1.0,
    color: "rgb(255 0 0 / 100%)",
    scale: 1.0,
    shadowOffsetX: 0.0,
    shadowOffsetY: 0.0,
    shadowBlur: 0.0,
    shadowColor: "rgb(0 0 0 / 0%)",
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
    styleControls["scale"].setValue(linestyle["scale"]);
    styleControls["color"].setRgba(linestyle["color"]);
    styleControls["shadowOffsetX"].setValue(linestyle["shadowOffsetX"]);
    styleControls["shadowOffsetY"].setValue(linestyle["shadowOffsetY"]);
    styleControls["shadowBlur"].setValue(linestyle["shadowBlur"]);
    styleControls["shadowColor"].setRgba(linestyle["shadowColor"]);
}

/**
 * Update the input fields for the system
 *
 * @param {Object<string,any>} system - unparsed system
 */
function updateSystemInput(system) {
    systemControls["angle"].setValue(system["angle"]);
    systemControls["level"].setValue(system["level"]);

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
        scale: styleControls["scale"].getValue(),
        color: styleControls["color"].getRgba(),
        shadowOffsetX: styleControls["shadowOffsetX"].getValue(),
        shadowOffsetY: styleControls["shadowOffsetY"].getValue(),
        shadowBlur: styleControls["shadowBlur"].getValue(),
        shadowColor: styleControls["shadowColor"].getRgba(),
    };
}

/**
 * Read system inputs from UI
 *
 * @returns {Object<string,any>}
 */
function getSystemInput() {
    return {
        angle: systemControls["angle"].getValue(),
        level: systemControls["level"].getValue(),
        axiom: systemControls["axiom"].value.split(" ").filter(s => s.length > 0),
        productions: systemControls["rules"].getData(),
        consts: systemControls["consts"].getData(),
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

export {
    getLinestyleInput,
    getSystemInput,
    updateLinestyleInput,
    updateLinestyleSelect,
    updateSystemInput,
};
