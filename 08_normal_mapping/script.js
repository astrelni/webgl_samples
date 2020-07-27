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
    attribute vec3 normal;
    attribute vec3 tangent;

    varying highp vec2 varyingTexCoords;
    varying highp vec3 varyingPosition;
    varying highp vec3 varyingNormal;
    varying highp vec3 varyingTangent;

    uniform mat4 modelViewProjection;
    uniform mat4 modelTransform;

    void main(void) {
      varyingTexCoords = texCoords;
      varyingPosition = (modelTransform * position).xyz;
      varyingNormal = mat3(modelTransform) * normal;
      varyingTangent = mat3(modelTransform) * tangent;

      gl_Position = modelViewProjection * position;
    }
  `

  const fragmentSource = `
    varying highp vec2 varyingTexCoords;
    varying highp vec3 varyingPosition;
    varying highp vec3 varyingNormal;
    varying highp vec3 varyingTangent;

    uniform sampler2D colorMap;
    uniform sampler2D normalMap;

    void main(void) {
      highp vec4 rgbaColor = texture2D(colorMap, varyingTexCoords);
      highp vec3 rgbColor = mix(vec3(1.0), rgbaColor.rgb, rgbaColor.a);

      highp vec3 n = normalize(varyingNormal);
      highp vec3 t = normalize(varyingTangent);
      highp vec3 b = cross(varyingNormal, varyingTangent);
      highp mat3 normalRotation = mat3(t, b, n);

      highp vec3 normal = 2.0 * texture2D(normalMap, varyingTexCoords).xyz - vec3(1.0);
      normal.xy = -normal.xy;
      normal = normalRotation * normal;

      highp vec3 lightPosition = vec3(1.0, 1.0, 0.0);
      highp vec3 directionToLight = normalize(lightPosition - varyingPosition);
      highp float diffuse = clamp(dot(directionToLight, normal), 0.0, 1.0);
      highp vec3 lightColor = vec3(0.75);

      highp float flatDiffuse = clamp(dot(directionToLight, n), 0.0, 1.0);

      gl_FragColor.rgb = mix(flatDiffuse, diffuse, step(0.0, varyingPosition.x)) * (lightColor + vec3(0.1)) * rgbColor;
      gl_FragColor.a = 1.0;
    }
  `

  const programHandle = createShaderProgram(vertexSource, fragmentSource);

  return {
    handle: programHandle,
    attributes: {
      position: getAttributeLocation(programHandle, "position"),
      texCoords: getAttributeLocation(programHandle, "texCoords"),
      normal: getAttributeLocation(programHandle, "normal"),
      tangent: getAttributeLocation(programHandle, "tangent")
    },
    uniforms: {
      modelViewProjection: getUniformLocation(programHandle, "modelViewProjection"),
      modelTransform: getUniformLocation(programHandle, "modelTransform"),
      colorMap: getUniformLocation(programHandle, "colorMap"),
      normalMap: getUniformLocation(programHandle, "normalMap")
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
    // vec3 position         vec2 texCoords     vec3 normal         vec3 tangent
    // +Z
    -0.5, -0.5, 0.5,         0.0, 1.0,          0.0, 0.0, 1.0,      1.0, 0.0, 0.0,
    0.5, -0.5, 0.5,          1.0, 1.0,          0.0, 0.0, 1.0,      1.0, 0.0, 0.0,
    0.5, 0.5, 0.5,           1.0, 0.0,          0.0, 0.0, 1.0,      1.0, 0.0, 0.0,
    -0.5, 0.5, 0.5,          0.0, 0.0,          0.0, 0.0, 1.0,      1.0, 0.0, 0.0,

    // -Z
    -0.5, -0.5, -0.5,        1.0, 1.0,          0.0, 0.0, -1.0,     -1.0, 0.0, 0.0,
    0.5, -0.5, -0.5,         0.0, 1.0,          0.0, 0.0, -1.0,     -1.0, 0.0, 0.0,
    0.5, 0.5, -0.5,          0.0, 0.0,          0.0, 0.0, -1.0,     -1.0, 0.0, 0.0,
    -0.5, 0.5, -0.5,         1.0, 0.0,          0.0, 0.0, -1.0,     -1.0, 0.0, 0.0,

    // +X
    0.5, -0.5, -0.5,         1.0, 1.0,          1.0, 0.0, 0.0,      0.0, 0.0, -1.0,
    0.5, 0.5, -0.5,          1.0, 0.0,          1.0, 0.0, 0.0,      0.0, 0.0, -1.0,
    0.5, 0.5, 0.5,           0.0, 0.0,          1.0, 0.0, 0.0,      0.0, 0.0, -1.0,
    0.5, -0.5, 0.5,          0.0, 1.0,          1.0, 0.0, 0.0,      0.0, 0.0, -1.0,

    // -X
    -0.5, -0.5, -0.5,        0.0, 1.0,          -1.0, 0.0, 0.0,     0.0, 0.0, 1.0,
    -0.5, 0.5, -0.5,         0.0, 0.0,          -1.0, 0.0, 0.0,     0.0, 0.0, 1.0,
    -0.5, 0.5, 0.5,          1.0, 0.0,          -1.0, 0.0, 0.0,     0.0, 0.0, 1.0,
    -0.5, -0.5, 0.5,         1.0, 1.0,          -1.0, 0.0, 0.0,     0.0, 0.0, 1.0,

    // +Y
    -0.5, 0.5, -0.5,         0.0, 0.0,          0.0, 1.0, 0.0,      1.0, 0.0, 0.0,
    0.5, 0.5, -0.5,          1.0, 0.0,          0.0, 1.0, 0.0,      1.0, 0.0, 0.0,
    0.5, 0.5, 0.5,           1.0, 1.0,          0.0, 1.0, 0.0,      1.0, 0.0, 0.0,
    -0.5, 0.5, 0.5,          0.0, 1.0,          0.0, 1.0, 0.0,      1.0, 0.0, 0.0,

    // -Y
    -0.5, -0.5, -0.5,        0.0, 1.0,          0.0, -1.0, 0.0,      1.0, 0.0, 0.0,
    0.5, -0.5, -0.5,         1.0, 1.0,          0.0, -1.0, 0.0,      1.0, 0.0, 0.0,
    0.5, -0.5, 0.5,          1.0, 0.0,          0.0, -1.0, 0.0,      1.0, 0.0, 0.0,
    -0.5, -0.5, 0.5,         0.0, 0.0,          0.0, -1.0, 0.0,      1.0, 0.0, 0.0,
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
  const vertexSize = 11 * sizeofFloat;  // 3 position, 2 texture coord, 3 normal, 3 tangent

  const vertexBuffer = makeVertexBuffer(vertices);
  const indexBuffer = makeIndexBuffer(indices);
  return {
    bind: (shader) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.enableVertexAttribArray(shader.attributes.position);
      gl.enableVertexAttribArray(shader.attributes.texCoords);
      gl.enableVertexAttribArray(shader.attributes.normal);
      gl.enableVertexAttribArray(shader.attributes.tangent);

      gl.vertexAttribPointer(shader.attributes.position, 3, gl.FLOAT, false,
        /* stride */ vertexSize, /* offset */ 0);
      gl.vertexAttribPointer(shader.attributes.texCoords, 2, gl.FLOAT, false,
        /* stride */ vertexSize, /* offset */ 3 * sizeofFloat);
      gl.vertexAttribPointer(shader.attributes.normal, 3, gl.FLOAT, false,
        /* stride */ vertexSize, /* offset */ 5 * sizeofFloat);
      gl.vertexAttribPointer(shader.attributes.tangent, 3, gl.FLOAT, false,
        /* stride */ vertexSize, /* offset */ 8 * sizeofFloat);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    },
    draw: (shader, modelViewProjection, modelTransform, colorMapTexture, normalMapTexture) => {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, colorMapTexture);
      gl.uniform1i(shader.uniforms.colorMap, 0);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, normalMapTexture);
      gl.uniform1i(shader.uniforms.normalMap, 1);

      gl.uniformMatrix4fv(shader.uniforms.modelViewProjection, false,
                          modelViewProjection);
      gl.uniformMatrix4fv(shader.uniforms.modelTransform, false,
                          modelTransform);
      gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    }
  };
}

function loadTexture(url) {
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
  image.setAttribute('crossOrigin', 'anonymous');
  image.src = url;

  return texture;
}

var assets = null;

function drawLoop(now) {
  if (assets === null) throw "Forgot to initialize";
  if (!assets.cubeColorTexture.loaded || !assets.cubeNormalTexture.loaded) {
    // Try again next frame.
    requestAnimationFrame(drawLoop);
    return;
  }

  const rotationAngle = now * 0.0003;

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

  assets.cubeMesh.draw(assets.shader, modelViewProjection, modelTransform,
    assets.cubeColorTexture.id, assets.cubeNormalTexture.id);

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
    cubeColorTexture: loadTexture("https://raw.githubusercontent.com/astrelni/webgl_samples/master/third_party/154.jpg"),
    cubeNormalTexture: loadTexture("https://raw.githubusercontent.com/astrelni/webgl_samples/master/third_party/154_norm.jpg"),
    projectionMatrix: makeProjectionMatrix()
  };

  requestAnimationFrame(drawLoop);
}
