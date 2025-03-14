import * as math from "./math.js";

const vertexShader = `#version 300 es
precision highp float;

in vec2 a_vertex;
in vec2 a_p0;
in vec2 a_p1;
in vec4 a_color;

uniform float u_width;
uniform mat4 u_proj;
uniform mat4 u_view;

out vec4 v_color;

void main() {
  vec2 v = a_p1 - a_p0;
  vec2 u = normalize(vec2(-v.y, v.x));

  gl_Position = u_proj * u_view * vec4(a_p0 + v * a_vertex.x + u * u_width * a_vertex.y, 0.0, 1.0);

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
 * @property {Object<string, number>} uniforms - uniform locations
 * @property {Object<string, number>} attributes - attribute locations
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
 * @param {string} vertexShaderSrc - vertex shader source code
 * @param {string} fragmentShaderSrc - fragment shader source code
 * @param {object} attribBindings - key-value map of attribute names to locations
 *
 * @return {GLProgramContainer}
 */
function createProgram(gl, vertexShaderSrc, fragmentShaderSrc, attribBindings) {
    const prog = gl.createProgram();

    gl.attachShader(prog, compileShader(gl, vertexShaderSrc, gl.VERTEX_SHADER));
    gl.attachShader(prog, compileShader(gl, fragmentShaderSrc, gl.FRAGMENT_SHADER));

    for (let attrib in attribBindings) {
        gl.bindAttribLocation(prog, attribBindings[attrib], attrib);
    }

    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw "Failed to create program: " + gl.getProgramInfoLog(prog);
    }

    let uniforms = {};
    const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) {
        const uniform = gl.getActiveUniform(prog, i);
        const location = gl.getUniformLocation(prog, uniform.name);
        uniforms[uniform.name] = [location, uniform.type];
    }

    return { program: prog, uniforms: uniforms, attributes: attribBindings };
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
        const [location, type] = program.uniforms[key];
        gl[WEBGL_UNIFORM_SETTERS[type]](location, values[key]);
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

/** @type {WebGL2RenderingContext} */
const gl = document.querySelector("#glcanvas").getContext("webgl2");

gl.clearColor(0.0, 0.0, 0.0, 1.0);
gl.clearDepth(1.0);
gl.enable(gl.DEPTH_TEST);
gl.depthFunc(gl.LEQUAL);
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

const prog = createProgram(gl, vertexShader, fragmentShader, { "a_vertex": 0, "a_p0": 1, "a_p1": 2, "a_color": 3 });
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

// Instanced line segment
const nodes = new Float32Array([0.0, -0.5, 1.0, -0.5, 1.0,  0.5, 0.0, -0.5, 1.0,  0.5, 0.0,  0.5]);
const nodesBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, nodesBuffer);
gl.bufferData(gl.ARRAY_BUFFER, nodes, gl.STATIC_DRAW);

gl.enableVertexAttribArray(prog.attributes["a_vertex"]);
gl.vertexAttribPointer(prog.attributes["a_vertex"], 2, gl.FLOAT, false, 0, 0);
gl.vertexAttribDivisor(prog.attributes["a_vertex"], 0);

// Start and end points
const numLines = 100;
const pointsData = new Float32Array(numLines * (4 + 4));
const pointsBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, pointsBuffer);
gl.bufferData(gl.ARRAY_BUFFER, pointsData.byteLength, gl.DYNAMIC_DRAW);

const bytesPerLine = (4 + 4) * Float32Array.BYTES_PER_ELEMENT;
gl.enableVertexAttribArray(prog.attributes["a_p0"]);
gl.vertexAttribPointer(prog.attributes["a_p0"], 2, gl.FLOAT, false, bytesPerLine, 0 * Float32Array.BYTES_PER_ELEMENT);
gl.vertexAttribDivisor(prog.attributes["a_p0"], 1);

gl.enableVertexAttribArray(prog.attributes["a_p1"]);
gl.vertexAttribPointer(prog.attributes["a_p1"], 2, gl.FLOAT, false, bytesPerLine, 2 * Float32Array.BYTES_PER_ELEMENT);
gl.vertexAttribDivisor(prog.attributes["a_p1"], 1);

gl.enableVertexAttribArray(prog.attributes["a_color"]);
gl.vertexAttribPointer(prog.attributes["a_color"], 4, gl.FLOAT, false, bytesPerLine, 4 * Float32Array.BYTES_PER_ELEMENT);
gl.vertexAttribDivisor(prog.attributes["a_color"], 1);

// Render
gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
gl.useProgram(prog.program);

setUniforms(gl, prog, { "u_width": 0.005 });

// const aspectRatio = (gl.canvas.width / gl.canvas.height);
// const top = 0.1;
// const projMat = math.perspectiveProjection(-top / aspectRatio, top / aspectRatio, -top, top, 0.1, 10);
// 
// const cameraPos = [0.0, 0.0, 1.5];
// const target = [
//     1.0 * Math.sin(60 * Math.PI / 180),
//     -1.0 * Math.cos(60 * Math.PI / 180),
//     0.0,
// ];
// const lookAt = math.lookAt(cameraPos, target, [0, 0, 1]);
// const viewMat = math.rotateY(
//     math.rotateX(
//         math.scale(lookAt, 1, 1, 1/3),
//         40 * Math.PI / 180
//     ),
//     0 * Math.PI / 180,
// );

gl.uniformMatrix4fv(prog.uniforms["u_proj"][0], false, math.identity(4));
gl.uniformMatrix4fv(prog.uniforms["u_view"][0], false, math.identity(4));

gl.bindVertexArray(vao);

function render() {
    pointsData[0] = Math.random() * 2.0 - 1.0;
    pointsData[1] = Math.random() * 2.0 - 1.0;
    pointsData[2] = Math.random() * 2.0 - 1.0;
    pointsData[3] = Math.random() * 2.0 - 1.0;

    pointsData[4] = 0.2;
    pointsData[5] = 0.2;
    pointsData[6] = 0.2;
    pointsData[7] = 1.0;

    for (let i = 1; i < numLines; ++i) {
        const offset = i * 8;
        // start end end point
        pointsData[offset + 0] = pointsData[offset - 2 - 4];
        pointsData[offset + 1] = pointsData[offset - 1 - 4];
        pointsData[offset + 2] = Math.random() * 2.0 - 1.0;
        pointsData[offset + 3] = Math.random() * 2.0 - 1.0;
        // color
        pointsData[offset + 4] = 0.2 + i / numLines * 0.8;
        pointsData[offset + 5] = 0.2 + i / numLines * 0.8;
        pointsData[offset + 6] = 0.2 + i / numLines * 0.8;
        pointsData[offset + 7] = 1.0;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, pointsBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, pointsData);

    gl.drawArraysInstanced(
        gl.TRIANGLES,
        0,
        nodes.length / 2,
        numLines,
    );
}

render();


