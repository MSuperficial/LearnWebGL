"use strict";

function main() {
    var canvas = document.getElementById("canvas");
    var gl = canvas.getContext("webgl", {preserveDrawingBuffer:true});
    if (!gl) {
        return;
    }

    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    var program = webglUtils.createProgramFromScripts(gl, ["vertex-shader", "fragment-shader"]);
    gl.useProgram(program);

    var position_AL = gl.getAttribLocation(program, "a_position"),
        matrix_UL = gl.getUniformLocation(program, "u_matrix"),
        color_UL = gl.getUniformLocation(program, "u_color");
    gl.enableVertexAttribArray(position_AL);

    var squareLength = 10;
    var drawingColor = [0.0, 0.0, 0.0, 1.0];

    var translation = [0, 0],
        angleInRadians = 0,
        scalation = [1, 1];

    var positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(position_AL, 2, gl.FLOAT, false, 0, 0);
    setSquare(gl);

    gl.canvas.onmousedown = function (event) {
        drawSquare(event, gl, squareLength, drawingColor);
    };

    function drawSquare(event, gl, length, color) {
        if(event.button !== 0) {
            return;
        }
        var rect = event.target.getBoundingClientRect();
        translation[0] = event.clientX - rect.left;
        translation[1] = event.clientY - rect.top;
        var matrix = computeMatrix();

        gl.uniformMatrix3fv(matrix_UL, false, matrix);
        gl.uniform4fv(color_UL, color);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function computeMatrix() {
        var matrix = m3.projection(gl.canvas.width, gl.canvas.height);
        matrix = m3.translate(matrix, translation[0], translation[1]);
        matrix = m3.rotate(matrix, angleInRadians);
        matrix = m3.scale(matrix, scalation[0], scalation[1]);
        return matrix;
    }
}

function setSquare(gl) {
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -5, -5,
         5, -5,
        -5,  5,
        -5,  5,
         5, -5,
         5,  5,
    ]), gl.STATIC_DRAW);
}
