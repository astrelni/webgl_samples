// Introduce:
//   * uniforms
//   * a second vertex attribute
//   * passing data from the vertex shader to the fragment shader
//   * requesting a frame from the browser to do animation.

var gl = null;

function initGL() {
  gl = document.getElementById("gl-canvas").getContext("webgl", {
    antialias: false,
  });
  if (gl === null) throw "Failed to get GL context";
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
    attribute vec2 position;
    attribute vec3 color;

    varying highp vec3 varyingColor;

    uniform float rotationAngle;

    void main(void) {
      varyingColor = color;

      highp float cosTheta = cos(rotationAngle);
      highp float sinTheta = sin(rotationAngle);
      mat2 rotationMatrix = mat2(
        cosTheta, sinTheta,
        -sinTheta, cosTheta
      );

      gl_Position = vec4(rotationMatrix * position.xy, 0.0, 1.0);
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
      angle: getUniformLocation(programHandle, "rotationAngle")
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

function makeTriangleMesh() {
  const vertices = [
    // vec2 position         vec3 color
    -0.5, -0.5,              1.0, 0.0, 0.0,
    0.5, -0.5,               0.0, 1.0, 0.0,
    0.0, 0.5,                0.0, 0.0, 1.0,
  ];

  const sizeofFloat = 4;              // 32-bit IEEE float
  const vertexSize = 5 * sizeofFloat; // 2 position and 3 color components

  const vertexBuffer = makeVertexBuffer(vertices);
  return {
    bind: (shader) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.enableVertexAttribArray(shader.attributes.position);
      gl.enableVertexAttribArray(shader.attributes.color);

      gl.vertexAttribPointer(shader.attributes.position, 2, gl.FLOAT, false,
        /* stride */ vertexSize, /* offset */ 0);
      gl.vertexAttribPointer(shader.attributes.color, 3, gl.FLOAT, false,
        /* stride */ vertexSize, /* offset */ 2 * sizeofFloat);
    },
    draw: (shader, rotationAngle) => {
      gl.uniform1f(shader.uniforms.angle, rotationAngle);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  };
}

var assets = null;

function drawLoop(now) {
  if (assets === null) throw "Forgot to initialize";

  const rotationAngle = now * 0.001;

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(assets.shader.handle);
  assets.triangleMesh.bind(assets.shader);
  assets.triangleMesh.draw(assets.shader, rotationAngle);

  requestAnimationFrame(drawLoop);
}

function onLoad() {
  initGL();

  assets = {
    shader: makeShader(),
    triangleMesh: makeTriangleMesh(),
  };

  requestAnimationFrame(drawLoop);
}
