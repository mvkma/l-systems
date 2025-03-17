import * as math from "./math.js";

/**
 * @typedef {Object} Camera
 * @property {Float32Array} worldMatrix
 * @property {Float32Array} projectionMatrix
 * @property {Float32Attay} projectionMatrixInverse
 * @property {number} left
 * @property {number} right
 * @property {number} top
 * @property {number} bottom
 * @property {number} near
 * @property {number} far
 * @property {number} zoom
 * @property {() => void} updateProjection
 */

/** @type {Camera} */
const orthographicCamera = {
    worldMatrix: math.identity(4),
    projectionMatrix: math.identity(4),
    projectionMatrixInverse: math.identity(4),
    left: -1.0,
    right: 1.0,
    top: 1.0,
    bottom: -1.0,
    near: 0.1,
    far: 2000.0,
    zoom: 1.0,
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

export {
    orthographicCamera,
}
    
