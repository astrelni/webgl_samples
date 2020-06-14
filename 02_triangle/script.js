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
  vertexShader = compileShaderStage(gl.VERTEX_SHADER, vertexSource);
  fragmentShader = compileShaderStage(gl.FRAGMENT_SHADER, fragmentSource);

  programHandle = gl.createProgram();
  gl.attachShader(programHandle, vertexShader);
  gl.attachShader(programHandle, fragmentShader);
  gl.linkProgram(programHandle);

  if (!gl.getProgramParameter(programHandle, gl.LINK_STATUS)) {
    throw "Shader linker error " + gl.getProgramInfoLog(programHandle);
  };

  return programHandle;
}

function makeIdentityShader() {
  const vertexSource = `
    attribute vec4 vertexPosition;

    void main(void) {
      gl_Position = vertexPosition;
    }
  `

  const fragmentSource = `
    void main(void) {
      gl_FragColor = vec4(0.5, 0.5, 1.0, 1.0);
    }
  `
  const programHandle = createShaderProgram(vertexSource, fragmentSource);

  const positionAttributeLoc = gl.getAttribLocation(programHandle, "vertexPosition");
  if (positionAttributeLoc === -1) throw "Could not find attribute location";

  return {
    handle: programHandle,
    attributes: {position: positionAttributeLoc}
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
    -0.5, -0.5,
    0.5, -0.5,
    0.0, 0.5,
  ];
  const vertexBuffer = makeVertexBuffer(vertices);
  return {
    bind: (shader) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.vertexAttribPointer(shader.attributes.position, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(shader.attributes.position);
    },
    draw: () => { gl.drawArrays(gl.TRIANGLES, 0, 3); }
  };
}

function onLoad() {
  initGL();

  const identityShader = makeIdentityShader();
  const triangleMesh = makeTriangleMesh();

  gl.clearColor(0.0, 1.0, 1.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(identityShader.handle);
  triangleMesh.bind(identityShader);
  triangleMesh.draw();
}
