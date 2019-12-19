"use strict";

function main() {
    // Get A WebGL context
    let canvas = document.getElementById("canvas");
    let gl = canvas.getContext("webgl");
    if (!gl) {
        return;
    }

    // setup GLSL program
    let program = webglUtils.createProgramFromScripts(gl, ["3d-vertex-shader", "3d-fragment-shader"]);
    gl.useProgram(program);

    let position_AL = gl.getAttribLocation(program, "a_position");
    let color_AL = gl.getAttribLocation(program, "a_color");
    let matrix_UL = gl.getUniformLocation(program, "u_matrix");

    let positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    setGeometry(gl);

    let colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    setColors(gl);

    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    //摄像机属性
    let camera = {
        position: [0, 0, 300],
        rotation: [0, 0, 0],
        direction: [0, 0, -1],
        fieldOfView: m3.degToRad(60),
        aspect: gl.canvas.clientWidth / gl.canvas.clientHeight,
        near: 1,
        far: 2000,
        moveSpeed: 100,
        rotateSpeed: [1, 1],
        maxUpDeg: 60,
        maxDownDeg: -60,
    };

    let keyPressed = {
        W: false,
        A: false,
        S: false,
        D: false,
        Shift: false,
    };
    window.addEventListener("keydown", function (e) {
        // console.log(e.code + ' down');
        switch (e.code) {
            case "KeyW":
                keyPressed.W = true;
                break;
            case "KeyA":
                keyPressed.A = true;
                break;
            case "KeyS":
                keyPressed.S = true;
                break;
            case "KeyD":
                keyPressed.D = true;
                break;
            case "ShiftLeft":
                keyPressed.Shift = true;
                break;
        }
    });
    window.addEventListener("keyup", function (e) {
        // console.log(e.code + ' up');
        switch (e.code) {
            case "KeyW":
                keyPressed.W = false;
                break;
            case "KeyA":
                keyPressed.A = false;
                break;
            case "KeyS":
                keyPressed.S = false;
                break;
            case "KeyD":
                keyPressed.D = false;
                break;
            case "ShiftLeft":
                keyPressed.Shift = false;
                break;
        }
    });
    window.addEventListener("mousemove", function (e) {
        // console.log([e.movementX, e.movementY]);
        let speedRatio = 20;
        camera.rotateSpeed = [e.movementY * speedRatio, -e.movementX * speedRatio];
    });

    let lastFrameTime = performance.now() * 0.001;
    requestAnimationFrame(drawScene);

    // Draw the scene.
    function drawScene(now) {
        now *= 0.001;
        let deltaTime = now - lastFrameTime;
        lastFrameTime = now;

        webglUtils.resizeCanvasToDisplaySize(gl.canvas);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Turn on culling. By default back-facing triangles
        // will be culled.
        gl.enable(gl.CULL_FACE);
        // Enable the depth buffer
        gl.enable(gl.DEPTH_TEST);

        gl.enableVertexAttribArray(position_AL);
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        var size = 3;          // 3 components per iteration
        var type = gl.FLOAT;   // the data is 32bit floats
        var normalize = false; // don't normalize the data
        var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
        var offset = 0;        // start at the beginning of the buffer
        gl.vertexAttribPointer(position_AL, size, type, normalize, stride, offset);

        gl.enableVertexAttribArray(color_AL);
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        var size = 3;                 // 3 components per iteration
        var type = gl.UNSIGNED_BYTE;  // the data is 8bit unsigned values
        var normalize = true;         // normalize the data (convert from 0-255 to 0-1)
        var stride = 0;               // 0 = move forward size * sizeof(type) each iteration to get the next position
        var offset = 0;               // start at the beginning of the buffer
        gl.vertexAttribPointer(color_AL, size, type, normalize, stride, offset);

        cameraMove(deltaTime);
        cameraRotate(deltaTime);

        // Compute the projection matrix
        let projectionMatrix = m4.perspective(camera.fieldOfView, camera.aspect, camera.near, camera.far);
        // Compute the camera's matrix using look at.
        var cameraMatrix = m4.lookIn(camera.position, camera.direction, [0, 1, 0]);
        // Make a view matrix from the camera matrix
        let viewMatrix = m4.inverse(cameraMatrix);
        // Compute a view projection matrix
        let viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

        let numFs = 5;
        let radius = 200;
        for (let ii = 0; ii < numFs; ++ii) {
            let angle = ii * Math.PI * 2 / numFs;
            let x = Math.cos(angle) * radius;
            let y = Math.sin(angle) * radius;

            // starting with the view projection matrix
            // compute a matrix for the F
            let matrix = m4.translate(viewProjectionMatrix, [x, 0, y]);

            // Set the matrix.
            gl.uniformMatrix4fv(matrix_UL, false, matrix);

            // Draw the geometry.
            let primitiveType = gl.TRIANGLES;
            let first = 0;
            let count = 16 * 6;
            gl.drawArrays(primitiveType, first, count);
        }

        requestAnimationFrame(drawScene);
    }

    function cameraMove(deltaTime) {
        let dir = camera.direction;
        let front = m4.normalize([dir[0], 0, dir[2]]);
        let back = [-front[0], 0, -front[2]];
        let right = m4.normalize(m4.cross(front, [0, 1, 0]));
        let left = [-right[0], 0, -right[2]];
        dir = [0, 0, 0];
        dir = keyPressed.W ? m4.addVectors(dir, front) : dir;
        dir = keyPressed.A ? m4.addVectors(dir, left) : dir;
        dir = keyPressed.S ? m4.addVectors(dir, back) : dir;
        dir = keyPressed.D ? m4.addVectors(dir, right) : dir;
        dir = m4.normalize(dir);
        let speed = camera.moveSpeed;
        speed = keyPressed.Shift ? (2 * speed) : speed;
        camera.position[0] += dir[0] * speed * deltaTime;
        camera.position[2] += dir[2] * speed * deltaTime;
    }

    function cameraRotate(deltaTime) {
        let speed = camera.rotateSpeed;
        let degOffset = [speed[0] * deltaTime, speed[1] * deltaTime, 0];

        let rot = camera.rotation;
        rot = m4.addVectors(rot, degOffset);
        // console.log("pre:" + rot);
        rot[0] = clamp(rot[0], camera.maxDownDeg, camera.maxUpDeg);
        rot[1] = rot[1] < 0 ? (rot[1] + 360) : rot[1];
        rot[1] %= 361;
        // console.log("post:" + rot);

        let up = [0, 1, 0];
        let matrix = m4.axisRotation(up, m3.degToRad(rot[1]));
        let tempDir = m4.transformDirection(matrix, [0, 0, -1]);
        let left = m4.normalize(m4.cross(up, tempDir));

        matrix = m4.axisRotation(left, m3.degToRad(rot[0]));
        matrix = m4.axisRotate(matrix, up, m3.degToRad(rot[1]));

        camera.direction = m4.transformDirection(matrix, [0, 0, -1]);
        camera.rotation = rot;
        camera.rotateSpeed = [0, 0];
    }
}

// Fill the buffer with the values that define a letter 'F'.
function setGeometry(gl) {
    let positions = new Float32Array([
        // left column front
        0, 0, 0,
        0, 150, 0,
        30, 0, 0,
        0, 150, 0,
        30, 150, 0,
        30, 0, 0,

        // top rung front
        30, 0, 0,
        30, 30, 0,
        100, 0, 0,
        30, 30, 0,
        100, 30, 0,
        100, 0, 0,

        // middle rung front
        30, 60, 0,
        30, 90, 0,
        67, 60, 0,
        30, 90, 0,
        67, 90, 0,
        67, 60, 0,

        // left column back
        0, 0, 30,
        30, 0, 30,
        0, 150, 30,
        0, 150, 30,
        30, 0, 30,
        30, 150, 30,

        // top rung back
        30, 0, 30,
        100, 0, 30,
        30, 30, 30,
        30, 30, 30,
        100, 0, 30,
        100, 30, 30,

        // middle rung back
        30, 60, 30,
        67, 60, 30,
        30, 90, 30,
        30, 90, 30,
        67, 60, 30,
        67, 90, 30,

        // top
        0, 0, 0,
        100, 0, 0,
        100, 0, 30,
        0, 0, 0,
        100, 0, 30,
        0, 0, 30,

        // top rung right
        100, 0, 0,
        100, 30, 0,
        100, 30, 30,
        100, 0, 0,
        100, 30, 30,
        100, 0, 30,

        // under top rung
        30, 30, 0,
        30, 30, 30,
        100, 30, 30,
        30, 30, 0,
        100, 30, 30,
        100, 30, 0,

        // between top rung and middle
        30, 30, 0,
        30, 60, 30,
        30, 30, 30,
        30, 30, 0,
        30, 60, 0,
        30, 60, 30,

        // top of middle rung
        30, 60, 0,
        67, 60, 30,
        30, 60, 30,
        30, 60, 0,
        67, 60, 0,
        67, 60, 30,

        // right of middle rung
        67, 60, 0,
        67, 90, 30,
        67, 60, 30,
        67, 60, 0,
        67, 90, 0,
        67, 90, 30,

        // bottom of middle rung.
        30, 90, 0,
        30, 90, 30,
        67, 90, 30,
        30, 90, 0,
        67, 90, 30,
        67, 90, 0,

        // right of bottom
        30, 90, 0,
        30, 150, 30,
        30, 90, 30,
        30, 90, 0,
        30, 150, 0,
        30, 150, 30,

        // bottom
        0, 150, 0,
        0, 150, 30,
        30, 150, 30,
        0, 150, 0,
        30, 150, 30,
        30, 150, 0,

        // left side
        0, 0, 0,
        0, 0, 30,
        0, 150, 30,
        0, 0, 0,
        0, 150, 30,
        0, 150, 0]);

    // Center the F around the origin and Flip it around. We do this because
    // we're in 3D now with and +Y is up where as before when we started with 2D
    // we had +Y as down.

    // We could do by changing all the values above but I'm lazy.
    // We could also do it with a matrix at draw time but you should
    // never do stuff at draw time if you can do it at init time.
    let matrix = m4.xRotation(Math.PI);
    matrix = m4.translate(matrix, [-50, -75, -15]);

    for (let ii = 0; ii < positions.length; ii += 3) {
        let vector = m4.transformVector(matrix, [positions[ii + 0], positions[ii + 1], positions[ii + 2], 1]);
        positions[ii + 0] = vector[0];
        positions[ii + 1] = vector[1];
        positions[ii + 2] = vector[2];
    }

    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
}

// Fill the buffer with colors for the 'F'.
function setColors(gl) {
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Uint8Array([
            // left column front
            200, 70, 120,
            200, 70, 120,
            200, 70, 120,
            200, 70, 120,
            200, 70, 120,
            200, 70, 120,

            // top rung front
            200, 70, 120,
            200, 70, 120,
            200, 70, 120,
            200, 70, 120,
            200, 70, 120,
            200, 70, 120,

            // middle rung front
            200, 70, 120,
            200, 70, 120,
            200, 70, 120,
            200, 70, 120,
            200, 70, 120,
            200, 70, 120,

            // left column back
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,

            // top rung back
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,

            // middle rung back
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,
            80, 70, 200,

            // top
            70, 200, 210,
            70, 200, 210,
            70, 200, 210,
            70, 200, 210,
            70, 200, 210,
            70, 200, 210,

            // top rung right
            200, 200, 70,
            200, 200, 70,
            200, 200, 70,
            200, 200, 70,
            200, 200, 70,
            200, 200, 70,

            // under top rung
            210, 100, 70,
            210, 100, 70,
            210, 100, 70,
            210, 100, 70,
            210, 100, 70,
            210, 100, 70,

            // between top rung and middle
            210, 160, 70,
            210, 160, 70,
            210, 160, 70,
            210, 160, 70,
            210, 160, 70,
            210, 160, 70,

            // top of middle rung
            70, 180, 210,
            70, 180, 210,
            70, 180, 210,
            70, 180, 210,
            70, 180, 210,
            70, 180, 210,

            // right of middle rung
            100, 70, 210,
            100, 70, 210,
            100, 70, 210,
            100, 70, 210,
            100, 70, 210,
            100, 70, 210,

            // bottom of middle rung.
            76, 210, 100,
            76, 210, 100,
            76, 210, 100,
            76, 210, 100,
            76, 210, 100,
            76, 210, 100,

            // right of bottom
            140, 210, 80,
            140, 210, 80,
            140, 210, 80,
            140, 210, 80,
            140, 210, 80,
            140, 210, 80,

            // bottom
            90, 130, 110,
            90, 130, 110,
            90, 130, 110,
            90, 130, 110,
            90, 130, 110,
            90, 130, 110,

            // left side
            160, 160, 220,
            160, 160, 220,
            160, 160, 220,
            160, 160, 220,
            160, 160, 220,
            160, 160, 220]),
        gl.STATIC_DRAW);
}

function clamp(value, min, max) {
    return Math.max(Math.min(value, max), min);
}