import { initDragControls, initZoomControls, orthographicCamera } from "./camera.js";
import * as math from "./math.js";

const BYTES_PER_FLOAT = Float32Array.BYTES_PER_ELEMENT;

const BYTES_PER_LINE = (6 + 4 + 1) * BYTES_PER_FLOAT;

const vertexShader = `#version 300 es
precision highp float;

in vec2 a_vertex;
in vec3 a_p0;
in vec3 a_p1;
in vec4 a_color;
in float a_width;

uniform float u_width;
uniform mat4 u_proj;
uniform mat4 u_view;

out vec4 v_color;

void main() {
  vec2 v = a_p1.xy - a_p0.xy;
  vec2 u = normalize(vec2(-v.y, v.x));

  gl_Position = u_proj * u_view * vec4(a_p0.xy + v * a_vertex.x + u * u_width * a_vertex.y * a_width, 0.0, 1.0);

  v_color = a_color;
}
`;

const fragmentShader = `#version 300 es
precision highp float;

in vec4 v_color;

out vec4 fragColor;

void main() {
  fragColor = v_color;
}
`;

/** @type Object<number, string> */
const WEBGL_UNIFORM_SETTERS = {
    [WebGL2RenderingContext.INT]          : "uniform1i",
    [WebGL2RenderingContext.FLOAT]        : "uniform1f",
    [WebGL2RenderingContext.FLOAT_VEC2]   : "uniform2fv",
    [WebGL2RenderingContext.FLOAT_VEC3]   : "uniform3fv",
    [WebGL2RenderingContext.SAMPLER_2D]   : "uniform1i",
    [WebGL2RenderingContext.SAMPLER_CUBE] : "uniform1i",
};

/**
 * @typedef {Object} GLProgramContainer
 * @property {WebGLProgram} program - WebGLProgram
 * @property {Object<string, Object<string, number>>} uniforms - uniform locations and types
 * @property {Object<string, number>} attributes - attribute locations
 */

/**
 * @typedef {Object} GLAttributeInfo
 * @property {number} size
 * @property {number} type
 * @property {number} stride
 * @property {number} offset
 * @property {number} divisor
 * @property {WebGLBuffer} buffer
 */

/**
 * @typedef {Object} GLProgramInfo
 * @property {string} vertexShaderSource
 * @property {string} fragmentShaderSource
 * @property {Object<string, number>} attributeBindings
 */

/**
 * Compile source to WebGLShader.
 * Type should be gl.VERTEX_SHADER or gl.FRAGMENT_SHADER.
 *
 * @param {WebGL2RenderingContext} gl
 * @param {string} source - shader source code
 * @param {number} type - gl.VERTEX_SHADER | gl.FRAGMENT_SHADER
 *
 * @return {WebGLShader}
 */
function compileShader(gl, source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw "Shader compilation error: " + gl.getShaderInfoLog(shader);
    }

    return shader;
}

/**
 * Create a GLProgramContainer with a WebGLProgram and a map of uniforms inside.
 *
 * @param {WebGL2RenderingContext} gl
 * @param {GLProgramInfo} info
 *
 * @return {GLProgramContainer}
 */
function createProgram(gl, info) {
    const prog = gl.createProgram();

    gl.attachShader(prog, compileShader(gl, info.vertexShaderSource, gl.VERTEX_SHADER));
    gl.attachShader(prog, compileShader(gl, info.fragmentShaderSource, gl.FRAGMENT_SHADER));

    for (const [attribute, location] of Object.entries(info.attributeBindings)) {
        gl.bindAttribLocation(prog, location, attribute);
    }

    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw "Failed to create program: " + gl.getProgramInfoLog(prog);
    }

    const uniforms = {};
    const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) {
        const uniform = gl.getActiveUniform(prog, i);
        const location = gl.getUniformLocation(prog, uniform.name);
        uniforms[uniform.name] = { location: location, type: uniform.type };
    }

    return { program: prog, uniforms: uniforms, attributes: info.attributeBindings };
}

/**
 * Set uniform values
 *
 * @param {WebGL2RenderingContext} gl
 * @param {GLProgramContainer} program
 * @param {Object} values - key-value map of uniform name to value
 */
function setUniforms(gl, program, values) {
    for (const key of Object.keys(values)) {
        if (!program.uniforms.hasOwnProperty(key)) {
            console.log(`uniform '${key}' does not exist`);
            continue;
        }
        const uniform = program.uniforms[key];
        gl[WEBGL_UNIFORM_SETTERS[uniform.type]](uniform.location, values[key]);
    }
}

/**
 * Create a new framebuffer and binds texture to it
 *
 * @param {WebGL2RenderingContext} gl
 * @param {WebGLTexture} texture
 *
 * @return {WebGLFramebuffer}
 */
function createFramebuffer(gl, texture) {
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    return fb;
}

/**
 * Create new texture
 * For allowed combinations of format, internalFormat and type see:
 * https://webgl2fundamentals.org/webgl/lessons/webgl-data-textures.html
 *
 * @param {WebGL2RenderingContext} gl
 * @param {number} textureUnit
 * @param {number} width
 * @param {number} height
 * @param {number} internalFormat
 * @param {number} format
 * @param {number} type
 * @param {ArrayBufferView | null} pixels
 *
 * @return {WebGLTexture}
 */
function createTexture(
    gl,
    textureUnit,
    width,
    height,
    internalFormat,
    format,
    type,
    filterParam,
    clampParam,
    pixels
) {
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + textureUnit);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filterParam);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filterParam);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, clampParam);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, clampParam);

    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, pixels);

    return texture;
}

/**
 * @param {GLProgramContainer} prog
 * @param {string} attribute
 * @param {GLAttributeInfo} info
 */
function initVertexAttribute(prog, attribute, info) {
    const location = prog.attributes[attribute];
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, info.size, info.type, false, info.stride, info.offset);
    gl.vertexAttribDivisor(location, info.divisor);
}

/**
 * @param {GLProgramContainer} prog
 * @param {Object<string, GLAttributeInfo>} attributeInfo
 */
function setupVertexAttributes(prog, attributeInfo) {
    for (const [attribute, info] of Object.entries(attributeInfo)) {
        gl.bindBuffer(gl.ARRAY_BUFFER, info.buffer);
        initVertexAttribute(prog, attribute, info);
    }
}

/**
 * @param {WebGL2RenderingContext} gl
 * @param {number[]} color
 */
function clearAll(gl, color) {
    gl.clearColor(...color);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

/** @type {WebGL2RenderingContext} */
const gl = document.querySelector("#glcanvas").getContext("webgl2", {
    premultipliedAlpha: true,
});

const prog = createProgram(gl, {
    vertexShaderSource: vertexShader,
    fragmentShaderSource: fragmentShader,
    attributeBindings: { "a_vertex": 0, "a_p0": 1, "a_p1": 2, "a_color": 3, "a_width": 4 },
});

const buffers = {
    "nodes": gl.createBuffer(),
    "points": gl.createBuffer(),
};

/** @type {Object<string, GLAttributeInfo>} */
const vertexAttributes = {
    "a_vertex": {
        size: 2,
        type: gl.FLOAT,
        stride: 0,
        offset: 0,
        divisor: 0,
        buffer: buffers["nodes"],
    },
    "a_p0": {
        size: 3,
        type: gl.FLOAT,
        stride: BYTES_PER_LINE,
        offset: 0 * BYTES_PER_FLOAT,
        divisor: 1,
        buffer: buffers["points"],
    },
    "a_p1": {
        size: 3,
        type: gl.FLOAT,
        stride: BYTES_PER_LINE,
        offset: 3 * BYTES_PER_FLOAT,
        divisor: 1,
        buffer: buffers["points"],
    },
    "a_color": {
        size: 4,
        type: gl.FLOAT,
        stride: BYTES_PER_LINE,
        offset: 6 * BYTES_PER_FLOAT,
        divisor: 1,
        buffer: buffers["points"],
    },
    "a_width": {
        size: 1,
        type: gl.FLOAT,
        stride: BYTES_PER_LINE,
        offset: 10 * BYTES_PER_FLOAT,
        divisor: 1,
        buffer: buffers["points"],
    },
};

setupVertexAttributes(prog, vertexAttributes);

// Instanced line segment
const nodes = new Float32Array([0.0, -0.5, 1.0, -0.5, 1.0,  0.5, 0.0, -0.5, 1.0,  0.5, 0.0,  0.5]);
gl.bindBuffer(gl.ARRAY_BUFFER, buffers["nodes"]);
gl.bufferData(gl.ARRAY_BUFFER, nodes, gl.STATIC_DRAW);

gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
gl.useProgram(prog.program);

gl.uniformMatrix4fv(prog.uniforms["u_proj"]["location"], false, math.identity(4));
gl.uniformMatrix4fv(prog.uniforms["u_view"]["location"], false, math.identity(4));

let instances = undefined;

const camera = orthographicCamera;

camera.near = 0.01;
camera.far = 1000;
camera.zoom = 1.0;
camera.updateProjection();
camera.worldMatrix = math.identity(4);

const backgroundColor = new Float32Array([0.0, 0.0, 0.0]);

function render() {
    gl.clearColor(...backgroundColor, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniformMatrix4fv(prog.uniforms["u_view"]["location"], false, camera.worldMatrix);
    gl.uniformMatrix4fv(prog.uniforms["u_proj"]["location"], false, camera.projectionMatrix);

    gl.drawArraysInstanced(gl.TRIANGLES, 0, nodes.length / 2, instances);
}

/**
 * @param {Float32Array} data
 * @param {Float32Array} boundingBox
 * @param {[number, number, number, number] | Float32Array} background
 */
function updateLines(data, boundingBox, background) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers["points"]);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);

    backgroundColor.set(background);

    instances = data.byteLength / BYTES_PER_LINE;

    const dx = Math.abs(boundingBox[1] - boundingBox[0]);
    const dy = Math.abs(boundingBox[3] - boundingBox[2]);
    const scale = 2.0 / Math.max(dx, dy);
    const ratio = gl.canvas.height / gl.canvas.width;

    camera.zoom = 1.0;
    camera.worldMatrix = math.scale(
        math.translation(-boundingBox[0] - dx / 2, -boundingBox[2] - dy / 2, -1.0),
        scale * ratio,
        scale,
        1.0
    );
    camera.updateProjection();

    setUniforms(gl, prog, { "u_width": 2.0 / scale / gl.canvas.height });

    render();
}

function screenshot() {
    const filename = `l-systems-${(new Date()).toISOString()}.png`;
    const link = document.createElement("a");
    link.style.display = "none";
    document.body.appendChild(link);

    render();
    gl.canvas.toBlob(function (blob) {
        link.href = window.URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    })

    document.body.removeChild(link);
}

initZoomControls(gl.canvas, camera, render);

initDragControls(gl.canvas, camera, render);

export {
    BYTES_PER_FLOAT,
    BYTES_PER_LINE,
    updateLines,
    screenshot,
};


