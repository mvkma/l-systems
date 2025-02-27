class NumberInput extends HTMLInputElement {
    constructor() {
        super();
    }

    getValue() {
        return parseFloat(this.value);
    }

    setValue(n) {
        if (this.attributes["maxlength"] === undefined) {
            this.value = n.toString();
        } else {
            this.value = n.toString().slice(0, parseInt(this.attributes["maxlength"].value));
        }
        this.dispatchEvent(new Event("input", { bubbles: true }));
    }

    connectedCallback() {
        const step = parseFloat(this.attributes["step"].value) || 0;

        this.addEventListener("keydown", function(ev) {
            switch (ev.key) {
            case "Escape":
                this.blur();
                break;
            case "ArrowRight":
            case "ArrowLeft":
                ev.stopPropagation();
                break;
            case "ArrowUp":
                this.setValue(this.getValue() + step);
                ev.stopPropagation();
                break;
            case "ArrowDown":
                this.setValue(this.getValue() - step);
                ev.stopPropagation();
                break;
            default:
                break;
            }
        });
    }
}

class KeyValueInput extends HTMLElement {
    constructor() {
        super();

        this.shadow = this.attachShadow({ mode: "open" });
        this.container = document.createElement("div");
        this.container.classList.add("key-value-input");
        this.container.innerHTML = `
<link rel="stylesheet" type="text/css" href="assets/css/main.css"/>
<link rel="stylesheet" type="text/css" href="assets/css/l-systems.css"/>
<div id="entries"></div>
<div class="row">
    <button class="kv-button-add">&oplus;</button>
</div>
`;
        this.shadow.appendChild(this.container);
        this.entries = this.shadow.querySelector("#entries");
        this.shadow.querySelector(".kv-button-add").addEventListener("click", () => this.add());
        this.data = {};
    }

    add() {
        const row = document.createElement("div");
        row.classList.add("kv-entry");
        row.innerHTML = `
<input type="" class="kv-input-key" value="">
<input type="" class="kv-input-value" value="">
`;

        const button = document.createElement("button");
        button.innerHTML = "&ominus;";
        button.classList.add("kv-button-remove");
        button.addEventListener("click", (ev) => this.remove(ev.target));
        row.appendChild(button);

        this.entries.appendChild(row);
    }

    remove(button) {
        this.entries.removeChild(button.parentElement);
    }

    render() {
        console.log(`render: ${JSON.stringify(this.data)}`);
        for (const c of this.entries.children) {
            this.entries.removeChild(c);
        }

        let html = '';

        for (const [k, v] of Object.entries(this.data)) {
            html += `
<div class="kv-entry">
    <input type="" class="kv-input-key" value="${k}">
    <input type="" class="kv-input-value" value="${v}">
    <button class="kv-button-remove">&ominus;</button>
</div>
`;
        }
        this.entries.innerHTML = html;
        this.shadow.querySelectorAll(".kv-button-remove").forEach((button) => {
            button.addEventListener("click", (ev) => this.remove(ev.target));
        });
    }

    setData(data) {
        this.data = data;
    }

    getData() {
        let data = {};

        for (const row of this.entries.children) {
            const k = row.children[0].value;
            const v = row.children[1].value;
            data[k] = v;
        }

        return data;
    }

    connectedCallback() {
        this.render();
    }
}

export {
    KeyValueInput,
    NumberInput,
};
