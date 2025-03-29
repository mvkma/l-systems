import * as math from "./math.js";

/**
 * @typedef {Object} Camera
 * @property {Float32Array} worldMatrix
 * @property {Float32Array} projectionMatrix
 * @property {number} left
 * @property {number} right
 * @property {number} top
 * @property {number} bottom
 * @property {number} near
 * @property {number} far
 * @property {number} zoom
 * @property {number} zoomAmount
 * @property {() => void} updateProjection
 */

/** @type {Camera} */
const orthographicCamera = {
    worldMatrix: math.identity(4),
    projectionMatrix: math.identity(4),
    left: -1.0,
    right: 1.0,
    top: 1.0,
    bottom: -1.0,
    near: 0.1,
    far: 2000.0,
    zoom: 1.0,
    zoomAmount: 0.05,
    updateProjection: function () {
        const dx = ( this.right - this.left ) / ( 2 * this.zoom );
		const dy = ( this.top - this.bottom ) / ( 2 * this.zoom );
		const cx = ( this.right + this.left ) / 2;
		const cy = ( this.top + this.bottom ) / 2;

		let left = cx - dx;
		let right = cx + dx;
		let top = cy + dy;
		let bottom = cy - dy;

        this.projectionMatrix = math.orthographicProjection(
            left,
            right,
            bottom,
            top,
            this.near,
            this.far,
        );
    },
};

/**
 * @param {HTMLElement} element
 * @param {Camera} camera
 * @param {() => void} callback
 */
function initZoomControls(element, camera, callback) {
    element.addEventListener("wheel", function(ev) {
        ev.preventDefault();

        camera.zoom += ev.deltaY < 0 ? camera.zoomAmount : -camera.zoomAmount;
        camera.updateProjection();
        callback();
    });
}

/**
 * @param {HTMLElement} element
 * @param {Camera} camera
 * @param {() => void} callback
 */
function initDragControls(element, camera, callback) {
    const touches = {};

    element.addEventListener("pointerdown", function(ev) {
        ev.preventDefault();
        touches[ev.pointerId] = { pageX: ev.pageX, pageY: ev.pageY, moved: false };
    });

    element.addEventListener("pointermove", function(ev) {
        ev.preventDefault();

        const touch = touches[ev.pointerId];
        if (touch === undefined) {
            return;
        }

        const dx = ev.pageX - touch.pageX;
        const dy = ev.pageY - touch.pageY;
        touch.pageX = ev.pageX;
        touch.pageY = ev.pageY;
        touch.moved = true;

        const shift = [dx / element.width, -dy / element.height, 0];
        camera.worldMatrix = math.translate(camera.worldMatrix, ...shift);
        callback();
    });

    element.addEventListener("pointerup", function(ev) {
        ev.preventDefault();
        delete touches[ev.pointerId];
    });

    element.addEventListener("pointercancel", function(ev) {
        ev.preventDefault();
        delete touches[ev.pointerId];
    });
}


export {
    orthographicCamera,
    initZoomControls,
    initDragControls,
}
    
