var gl = null;

function initGL() {
  gl = document.getElementById("gl-canvas").getContext("webgl");
  if (gl === null) throw "Failed to get GL context";
}

function onLoad() {
  initGL();
  gl.clearColor(0.0, 1.0, 1.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
}
