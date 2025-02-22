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

export {
    NumberInput,
};
