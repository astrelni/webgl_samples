var gl = null;

function initGL() {
  gl = document.getElementById("gl-canvas").getContext("webgl", {
    antialias: false,
    powerPreference: "high-performance",
  });
  if (gl === null) throw "Failed to get GL context";
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
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
    -0.5, -0.5, 0.5,         0.0, 102/255, 1.0,// 0.5, 0.5, 1.0,
    0.5, -0.5, 0.5,          0.0, 102/255, 1.0,// 0.5, 0.5, 1.0,
    0.5, 0.5, 0.5,           0.0, 102/255, 1.0,// 0.5, 0.5, 1.0,
    -0.5, 0.5, 0.5,          0.0, 102/255, 1.0,// 0.5, 0.5, 1.0,

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
    -0.5, 0.5, -0.5,         0.5, 1.0, 1.0,
    0.5, 0.5, -0.5,          0.5, 1.0, 1.0,
    0.5, 0.5, 0.5,           0.5, 1.0, 1.0,
    -0.5, 0.5, 0.5,          0.5, 1.0, 1.0,

    // -Y
    -0.5, -0.5, -0.5,        0.5, 1.0, 0.5,
    0.5, -0.5, -0.5,         0.5, 1.0, 0.5,
    0.5, -0.5, 0.5,          0.5, 1.0, 0.5,
    -0.5, -0.5, 0.5,         0.5, 1.0, 0.5,
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

function updateCubeState(cube, dt) {
  const position = vec3.fromValues(cube.modelTransform[12],
                                   cube.modelTransform[13],
                                   cube.modelTransform[14]);
  const r = vec3.length(position);
  const adt = vec3.clone(position);

  const speed = vec3.length(cube.velocity);
  if (speed != 0) {
    const vhat = vec3.clone(cube.velocity);
    vec3.normalize(vhat, vhat);
    mat4.rotate(
      cube.modelTransform, cube.modelTransform, -speed * dt, vhat);
  }

  if (r != 0) {
    vec3.normalize(adt, adt);
    vec3.scale(adt, adt, -200.0 * dt / (Math.max(0.0001, r * r)));
    vec3.add(cube.velocity, cube.velocity, adt);
  }

  const vdt = vec3.create();
  vec3.scale(vdt, cube.velocity, dt);
  vec3.add(position, position, vdt);

  cube.modelTransform[12] = position[0];
  cube.modelTransform[13] = position[1];
  cube.modelTransform[14] = position[2];
}

var lastCallTime = null;

function drawLoop(now) {
  if (assets === null) throw "Forgot to initialize";
  if (lastCallTime === null) lastCallTime = now;

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.clearDepth(1.0);
  gl.useProgram(assets.shader.handle);
  assets.cubeMesh.bind(assets.shader);

  const deltaT = 0.001 * (now - lastCallTime);
  lastCallTime = now;

  for (const i in assets.cubeStates) {
    updateCubeState(assets.cubeStates[i], deltaT);
    const mvp = mat4.clone(assets.cubeStates[i].modelTransform);
    mat4.multiply(mvp, assets.viewProjectionMatrix, mvp);
    assets.cubeMesh.draw(assets.shader, mvp);
  }

  requestAnimationFrame(drawLoop);
}

function makeViewProjectionMatrix() {
  const projection = mat4.create();
  const radiansPerDegree = 3.14 / 180;
  const canvas = document.getElementById("gl-canvas");
  const aspectRatio = canvas.width / canvas.height;
  mat4.perspective(projection, 90 * radiansPerDegree, aspectRatio, 1.0, 1000.0);

  const viewTransform = mat4.create();
  mat4.lookAt(viewTransform,
    /* eye position */ [0, -50, 30],
    /* looking at */   [0, 0, 0],
    /* up */           [0, .7, .7]);

  const viewProjection = mat4.create();
  mat4.multiply(viewProjection, projection, viewTransform);
  return viewProjection;
}

function makeInitialCubeStates(numberOfCubes) {
  const cubes = [];
  for (let i = 0; i < numberOfCubes; i++) {
    const c = {modelTransform: mat4.create(), velocity: vec3.create()};

    const r = 40.0 * (0.75 * Math.random() + 0.25);
    const theta = 2.0 * 3.1415 * Math.random();

    c.modelTransform[12] = r * Math.cos(theta);
    c.modelTransform[13] = r * Math.sin(theta);
    c.modelTransform[14] = 10 * (Math.random() - 0.5);

    const v = 15 / Math.sqrt(r); // * (1.5 - 0.5 * Math.random());

    c.velocity[0] = -v * Math.sin(theta);
    c.velocity[1] = v * Math.cos(theta);

    cubes.push(c);
  }
  return cubes;
}

function onLoad() {
  initGL();

  assets = {
    shader: makeShader(),
    cubeMesh: makeCubeMesh(),
    viewProjectionMatrix: makeViewProjectionMatrix(),
    cubeStates: makeInitialCubeStates(5000)
  };

  requestAnimationFrame(drawLoop);
}
