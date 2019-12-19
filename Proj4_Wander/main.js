"use strict";

function main() {
    let canvas = document.getElementById("canvas");
    let gl = canvas.getContext("webgl");
    if (!gl) {
        return;
    }

    let program = webglUtils.createProgramFromScripts(gl, ["3d-vertex-shader", "3d-fragment-shader"]);
    gl.useProgram(program);

    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    let position_AL = gl.getAttribLocation(program, "a_position");
    let color_AL = gl.getAttribLocation(program, "a_color");
    let matrix_UL = gl.getUniformLocation(program, "u_matrix");

    //迷宫数据
    let wallLength = 100;
    let mazeSize = 21;
    let maze = createMaze(mazeSize);

    let positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, wallMesh(wallLength), gl.STATIC_DRAW);

    let colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, wallColor(), gl.STATIC_DRAW);

    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    //摄像机属性
    let camera = {
        position: getBlockPos(mazeSize, wallLength, [2, 0]),
        rotation: [0, -90, 0],
        direction: [0, 0, -1],
        fieldOfView: m3.degToRad(60),
        aspect: gl.canvas.clientWidth / gl.canvas.clientHeight,
        near: 1,
        far: 5000,
        moveSpeed: 100,
        rotateSpeed: [1, 1],
        maxUpDeg: 90,
        maxDownDeg: -90,
    };

    //监听键盘和鼠标输入
    let keyPressed = {
        W: false,
        A: false,
        S: false,
        D: false,
        Shift: false,
        Space: false,
        Ctrl: false,
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
            case "Space":
                keyPressed.Space = true;
                break;
        }
        if(e.ctrlKey) {
            keyPressed.Ctrl = true;
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
            case "Space":
                keyPressed.Space = false;
                break;
        }
        if(!e.ctrlKey) {
            keyPressed.Ctrl = false;
        }
    });
    gl.canvas.addEventListener("mousemove", function (e) {
        // console.log([e.movementX, e.movementY]);
        let speedRatio = 20;
        camera.rotateSpeed = [e.movementY * speedRatio, -e.movementX * speedRatio];
    });

    //设置全屏并锁定鼠标指针
    let btn = document.getElementById("full-screen-button");
    btn.addEventListener("click", lockPointer);
    function fullscreenChange() {
        gl.canvas.requestPointerLock = gl.canvas.requestPointerLock ||
            gl.canvas.mozRequestPointerLock ||
            gl.canvas.webkitRequestPointerLock;
        gl.canvas.requestPointerLock();
        webglUtils.resizeCanvasToDisplaySize(gl.canvas);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }
    document.addEventListener('fullscreenchange', fullscreenChange, false);
    function pointerLockError() {
        console.log("锁定指针时出错。");
    }
    document.addEventListener('pointerlockerror', pointerLockError, false);
    function lockPointer() {
        gl.canvas.requestFullscreen = gl.canvas.requestFullscreen ||
            gl.canvas.mozRequestFullscreen ||
            gl.canvas.mozRequestFullScreen ||
            gl.canvas.webkitRequestFullscreen;
        gl.canvas.requestFullscreen();
    }

    let lastFrameTime = performance.now() * 0.001;
    requestAnimationFrame(drawScene);

    function drawScene(now) {
        now *= 0.001;
        let deltaTime = now - lastFrameTime;
        lastFrameTime = now;

        webglUtils.resizeCanvasToDisplaySize(gl.canvas);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);

        gl.enableVertexAttribArray(position_AL);
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        var size = 3;
        var type = gl.FLOAT;
        var normalize = false;
        var stride = 0;
        var offset = 0;
        gl.vertexAttribPointer(position_AL, size, type, normalize, stride, offset);

        gl.enableVertexAttribArray(color_AL);
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        var size = 3;
        var type = gl.UNSIGNED_BYTE;
        var normalize = true;
        var stride = 0;
        var offset = 0;
        gl.vertexAttribPointer(color_AL, size, type, normalize, stride, offset);

        //摄像头漫游
        cameraMove(deltaTime);
        cameraRotate(deltaTime);

        //计算视图投影矩阵
        let projectionMatrix = m4.perspective(camera.fieldOfView, camera.aspect, camera.near, camera.far);
        var cameraMatrix = m4.lookIn(camera.position, camera.direction, [0, 1, 0]);
        let viewMatrix = m4.inverse(cameraMatrix);
        let viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

        //绘制迷宫
        for (let i = 0; i < mazeSize; i++) {
            for (let j = 0; j < mazeSize; j++) {
                if(!maze[i][j]) {
                    let wallPos = getBlockPos(mazeSize, wallLength, [i, j]);

                    let matrix = m4.translate(viewProjectionMatrix, wallPos);
                    gl.uniformMatrix4fv(matrix_UL, false, matrix);

                    gl.drawArrays(gl.TRIANGLES, 0, 6 * 6);
                }
            }
        }

        requestAnimationFrame(drawScene);
    }

    function cameraMove(deltaTime) {
        let dir = camera.direction;
        let front = m4.normalize([dir[0], 0, dir[2]]);
        let back = [-front[0], 0, -front[2]];
        let right = m4.normalize(m4.cross(front, [0, 1, 0]));
        let left = [-right[0], 0, -right[2]];
        let vertical = [0, 0, 0];
        dir = [0, 0, 0];
        dir = keyPressed.W ? m4.addVectors(dir, front) : dir;
        dir = keyPressed.A ? m4.addVectors(dir, left) : dir;
        dir = keyPressed.S ? m4.addVectors(dir, back) : dir;
        dir = keyPressed.D ? m4.addVectors(dir, right) : dir;
        dir = m4.normalize(dir);
        vertical = keyPressed.Space ? m4.addVectors(vertical, [0, 1, 0]) : vertical;
        vertical = keyPressed.Ctrl ? m4.addVectors(vertical, [0, -1, 0]) : vertical;
        let speed = camera.moveSpeed;
        speed = keyPressed.Shift ? (2 * speed) : speed;
        camera.position[0] += dir[0] * speed * deltaTime;
        camera.position[1] += vertical[1] * speed * deltaTime;
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

function clamp(value, min, max) {
    return Math.max(Math.min(value, max), min);
}