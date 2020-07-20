var gl = null;

function initGL() {
  gl = document.getElementById("gl-canvas").getContext("webgl", {
    antialias: false,
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
    attribute vec2 texCoords;

    varying highp vec2 varyingTexCoords;

    uniform mat4 modelViewProjection;

    void main(void) {
      varyingTexCoords = texCoords;
      gl_Position = modelViewProjection * position;
    }
  `

  const fragmentSource = `
    varying highp vec2 varyingTexCoords;

    uniform sampler2D colorMap;

    void main(void) {
      highp vec4 rgbaColor = texture2D(colorMap, varyingTexCoords);
      highp vec3 rgbColor = mix(vec3(1.0), rgbaColor.rgb, rgbaColor.a);
      gl_FragColor.rgb = rgbColor;
      gl_FragColor.a = 1.0;

      // gl_FragColor = vec4(varyingTexCoords, 0.0, 1.0);
    }
  `

  const programHandle = createShaderProgram(vertexSource, fragmentSource);

  return {
    handle: programHandle,
    attributes: {
      position: getAttributeLocation(programHandle, "position"),
      texCoords: getAttributeLocation(programHandle, "texCoords")
    },
    uniforms: {
      modelViewProjection: getUniformLocation(programHandle, "modelViewProjection"),
      colorMap: getUniformLocation(programHandle, "colorMap")
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
    // vec3 position         vec2 texCoords
    // +Z
    -0.5, -0.5, 0.5,         0.0, 0.0,
    0.5, -0.5, 0.5,          1.0, 0.0,
    0.5, 0.5, 0.5,           1.0, 1.0,
    -0.5, 0.5, 0.5,          0.0, 1.0,

    // -Z
    -0.5, -0.5, -0.5,        0.0, 0.0,
    0.5, -0.5, -0.5,         1.0, 0.0,
    0.5, 0.5, -0.5,          1.0, 1.0,
    -0.5, 0.5, -0.5,         0.0, 1.0,

    // +X
    0.5, -0.5, -0.5,         0.0, 0.0,
    0.5, 0.5, -0.5,          1.0, 0.0,
    0.5, 0.5, 0.5,           1.0, 1.0,
    0.5, -0.5, 0.5,          0.0, 1.0,

    // -X
    -0.5, -0.5, -0.5,        0.0, 0.0,
    -0.5, 0.5, -0.5,         1.0, 0.0,
    -0.5, 0.5, 0.5,          1.0, 1.0,
    -0.5, -0.5, 0.5,         0.0, 1.0,

    // +Y
    -0.5, 0.5, -0.5,         0.0, 0.0,
    0.5, 0.5, -0.5,          1.0, 0.0,
    0.5, 0.5, 0.5,           1.0, 1.0,
    -0.5, 0.5, 0.5,          0.0, 1.0,

    // -Y
    -0.5, -0.5, -0.5,        0.0, 0.0,
    0.5, -0.5, -0.5,         1.0, 0.0,
    0.5, -0.5, 0.5,          1.0, 1.0,
    -0.5, -0.5, 0.5,         0.0, 1.0,
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
  const vertexSize = 5 * sizeofFloat;  // 3 position and 2 TC components

  const vertexBuffer = makeVertexBuffer(vertices);
  const indexBuffer = makeIndexBuffer(indices);
  return {
    bind: (shader) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.enableVertexAttribArray(shader.attributes.position);
      gl.enableVertexAttribArray(shader.attributes.texCoords);

      gl.vertexAttribPointer(shader.attributes.position, 3, gl.FLOAT, false,
        /* stride */ vertexSize, /* offset */ 0);
      gl.vertexAttribPointer(shader.attributes.texCoords, 2, gl.FLOAT, false,
        /* stride */ vertexSize, /* offset */ 3 * sizeofFloat);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    },
    draw: (shader, modelViewProjection, colorMapTexture) => {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, colorMapTexture);
      gl.uniform1i(shader.uniforms.colorMap, 0);

      gl.uniformMatrix4fv(shader.uniforms.modelViewProjection, false,
                          modelViewProjection);
      gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    }
  };
}

function isPowerOf2(value) {
  return (value & (value - 1)) == 0;
}

function loadTexture() {
  const texture = {id: gl.createTexture(), loaded: false};

  const image = new Image();
  image.onload = function() {
    gl.bindTexture(gl.TEXTURE_2D, texture.id);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    texture.loaded = true;
  }
  image.crossOrigin = "anonymous";
  image.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Google_%22G%22_Logo.svg/1000px-Google_%22G%22_Logo.svg.png";

  return texture;
}

var assets = null;

function drawLoop(now) {
  if (assets === null) throw "Forgot to initialize";
  if (!assets.cubeTexture.loaded) {
    // Try again next frame.
    requestAnimationFrame(drawLoop);
    return;
  }

  const rotationAngle = now * 0.001;

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.clearDepth(1.0);
  gl.useProgram(assets.shader.handle);
  assets.cubeMesh.bind(assets.shader);

  const modelTransform = mat4.create();
  mat4.translate(modelTransform, modelTransform, [0, 0, -3]);
  mat4.rotateY(modelTransform, modelTransform, rotationAngle);
  mat4.rotateX(modelTransform, modelTransform, 0.273 * rotationAngle);

  const viewTransform = mat4.create();
  mat4.lookAt(viewTransform,
    /* eye position */ [0, 0, 0],
    /* looking at */   [0, 0, -1],
    /* up */           [0, 1, 0]);

  const modelViewProjection = mat4.create();
  mat4.multiply(modelViewProjection, assets.projectionMatrix, viewTransform);
  mat4.multiply(modelViewProjection, modelViewProjection, modelTransform);

  assets.cubeMesh.draw(
    assets.shader, modelViewProjection, assets.cubeTexture.id);

  requestAnimationFrame(drawLoop);
}

function makeProjectionMatrix() {
  const projection = mat4.create();
  const radiansPerDegree = 3.14 / 180;
  const canvas = document.getElementById("gl-canvas");
  const aspectRatio = canvas.width / canvas.height;
  mat4.perspective(projection, 50 * radiansPerDegree, aspectRatio, 1.0, 100.0);
  return projection;
}

function onLoad() {
  initGL();

  assets = {
    shader: makeShader(),
    cubeMesh: makeCubeMesh(),
    cubeTexture: loadTexture(),
    projectionMatrix: makeProjectionMatrix()
  };

  requestAnimationFrame(drawLoop);
}
