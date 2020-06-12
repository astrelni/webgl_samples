function getGlContext() {
  const gl = document.getElementById("gl-canvas").getContext("webgl");
  if (gl === null) throw "Failed to get GL context";
  return gl;
}

function onLoad() {
  const gl = getGlContext();
  gl.clearColor(0.0, 1.0, 1.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
}
