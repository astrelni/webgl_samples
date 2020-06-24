// Introduce:

var gl = null;

function initGL() {
  gl = document.getElementById("gl-canvas").getContext("webgl", {
    antialias: false,
  });
  if (gl === null) throw "Failed to get GL context";
  gl.enable(gl.DEPTH_TEST);
}

function compileShaderStage(stageType, shaderSource) {
  const shader = gl.createShader(stageType);
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw "Failed to compile shader: " + gl.getShaderInfoLog(shader);
  }
  return shader;
}

function createShaderProgram(vertexSource, fragmentSource) {
  const vertexShader = compileShaderStage(gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShaderStage(gl.FRAGMENT_SHADER, fragmentSource);

  const programHandle = gl.createProgram();
  gl.attachShader(programHandle, vertexShader);
  gl.attachShader(programHandle, fragmentShader);
  gl.linkProgram(programHandle);

  if (!gl.getProgramParameter(programHandle, gl.LINK_STATUS)) {
    throw "Shader linker error " + gl.getProgramInfoLog(programHandle);
  };

  return programHandle;
}

function getAttributeLocation(programHandle, attributeName) {
  const location = gl.getAttribLocation(programHandle, attributeName);
  if (location === -1) {
    throw "Could not find attribute location '" + attributeName + "'";
  }
  return location
}

function getUniformLocation(programHandle, uniformName) {
  const location = gl.getUniformLocation(programHandle, uniformName);
  if (location === null) {
    throw "Could not find uniform location '" + uniformName + "'";
  }
  return location
}

function makeShader() {
  const vertexSource = `
    attribute vec4 position;
    attribute vec3 color;

    varying highp vec3 varyingColor;

    uniform mat4 modelViewProjection;

    void main(void) {
      varyingColor = color;
      gl_Position = modelViewProjection * position;
    }
  `

  const fragmentSource = `
    varying highp vec3 varyingColor;

    void main(void) {
      gl_FragColor = vec4(varyingColor, 1.0);
    }
  `

  const programHandle = createShaderProgram(vertexSource, fragmentSource);

  return {
    handle: programHandle,
    attributes: {
      position: getAttributeLocation(programHandle, "position"),
      color: getAttributeLocation(programHandle, "color")
    },
    uniforms: {
      modelViewProjection: getUniformLocation(programHandle, "modelViewProjection")
    }
  };
}

function makeVertexBuffer(vertices) {
  const bufferHandle = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufferHandle);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  return bufferHandle;
}

function makeIndexBuffer(indices) {
  const bufferHandle = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferHandle);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  return bufferHandle;
}

function makeCubeMesh() {
  const vertices = [
    // vec3 position         vec3 color
    // +Z
    -0.5, -0.5, 0.5,         0.5, 0.5, 1.0,
    0.5, -0.5, 0.5,          0.5, 0.5, 1.0,
    0.5, 0.5, 0.5,           0.5, 0.5, 1.0,
    -0.5, 0.5, 0.5,          0.5, 0.5, 1.0,

    // -Z
    -0.5, -0.5, -0.5,        1.0, 0.5, 1.0,
    0.5, -0.5, -0.5,         1.0, 0.5, 1.0,
    0.5, 0.5, -0.5,          1.0, 0.5, 1.0,
    -0.5, 0.5, -0.5,         1.0, 0.5, 1.0,

    // +X
    0.5, -0.5, -0.5,         1.0, 0.5, 0.5,
    0.5, 0.5, -0.5,          1.0, 0.5, 0.5,
    0.5, 0.5, 0.5,           1.0, 0.5, 0.5,
    0.5, -0.5, 0.5,          1.0, 0.5, 0.5,

    // -X
    -0.5, -0.5, -0.5,        1.0, 1.0, 0.5,
    -0.5, 0.5, -0.5,         1.0, 1.0, 0.5,
    -0.5, 0.5, 0.5,          1.0, 1.0, 0.5,
    -0.5, -0.5, 0.5,         1.0, 1.0, 0.5,

    // +Y
    -0.5, -0.5, -0.5,        0.5, 1.0, 0.5,
    0.5, -0.5, -0.5,         0.5, 1.0, 0.5,
    0.5, -0.5, 0.5,          0.5, 1.0, 0.5,
    -0.5, -0.5, 0.5,         0.5, 1.0, 0.5,

    // -Y
    -0.5, 0.5, -0.5,         0.5, 1.0, 1.0,
    0.5, 0.5, -0.5,          0.5, 1.0, 1.0,
    0.5, 0.5, 0.5,           0.5, 1.0, 1.0,
    -0.5, 0.5, 0.5,          0.5, 1.0, 1.0,
  ];

  const indices = [
    // +Z
    0, 1, 2,      0, 2, 3,
    // -Z
    4, 6, 5,      4, 7, 6,
    // +X
    8, 9, 10,     8, 10, 11,
    // -X
    12, 14, 13,   12, 15, 14,
    // +Y
    16, 18, 17,   16, 19, 18,
    // -Y
    20, 21, 22,   20, 22, 23
  ];

  const sizeofFloat = 4;               // 32-bit IEEE float
  const vertexSize = 6 * sizeofFloat;  // 2 position and 3 color components

  const vertexBuffer = makeVertexBuffer(vertices);
  const indexBuffer = makeIndexBuffer(indices);
  return {
    bind: (shader) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.enableVertexAttribArray(shader.attributes.position);
      gl.enableVertexAttribArray(shader.attributes.color);

      gl.vertexAttribPointer(shader.attributes.position, 3, gl.FLOAT, false,
        /* stride */ vertexSize, /* offset */ 0);
      gl.vertexAttribPointer(shader.attributes.color, 3, gl.FLOAT, false,
        /* stride */ vertexSize, /* offset */ 3 * sizeofFloat);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    },
    draw: (shader, modelViewProjection) => {
      gl.uniformMatrix4fv(shader.uniforms.modelViewProjection, false,
                          modelViewProjection);
      gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    }
  };
}

var assets = null;

function drawLoop(now) {
  if (assets === null) throw "Forgot to initialize";

  const rotationAngle = now * 0.001;

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.clearDepth(1.0);
  gl.useProgram(assets.shader.handle);
  assets.cubeMesh.bind(assets.shader);

  const modelTransform = mat4.create();
  mat4.translate(modelTransform, modelTransform, [3, 0, 0]);
  mat4.rotate(modelTransform, modelTransform, rotationAngle, [0, 0, 1]);
  mat4.rotate(modelTransform, modelTransform, 0.273 * rotationAngle, [0, 1, 0]);

  const viewTransform = mat4.create();
  mat4.lookAt(viewTransform,
    /* eye position */ [0, 0, 0],
    /* looking at */   [1, 0, 0],
    /* up */           [0, 0, 1]);

  const modelViewProjection = mat4.create();
  mat4.multiply(modelViewProjection, assets.projectionMatrix, viewTransform);
  mat4.multiply(modelViewProjection, modelViewProjection, modelTransform);

  assets.cubeMesh.draw(assets.shader, modelViewProjection);

  requestAnimationFrame(drawLoop);
}

function makeProjectionMatrix() {
  const projection = mat4.create();
  const radiansPerDegree = 3.14 / 180;
  const canvas = document.getElementById("gl-canvas");
  const aspectRatio = canvas.width / canvas.height;
  mat4.perspective(projection, 90 * radiansPerDegree, aspectRatio, 1.0, 100.0);
  return projection;
}

function onLoad() {
  initGL();

  assets = {
    shader: makeShader(),
    cubeMesh: makeCubeMesh(),
    projectionMatrix: makeProjectionMatrix()
  };

  requestAnimationFrame(drawLoop);
}
