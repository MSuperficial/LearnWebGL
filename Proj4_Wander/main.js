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
    let texcoord_AL = gl.getAttribLocation(program, "a_texcoord");
    let normal_AL = gl.getAttribLocation(program, "a_normal");
    let tangent_AL = gl.getAttribLocation(program, "a_tangent");

    let viewWorldPos_UL = gl.getUniformLocation(program, "u_viewWorldPos");
    let mat_W_UL = gl.getUniformLocation(program, "u_Mat_W");
    let mat_W_IT_UL = gl.getUniformLocation(program, "u_Mat_W_IT");
    let mat_WVP_UL = gl.getUniformLocation(program, "u_Mat_WVP");
    let mainTex_UL = gl.getUniformLocation(program, "u_mainTex");
    let bumpMap_UL = gl.getUniformLocation(program, "u_bumpMap");
    let ambient_UL = gl.getUniformLocation(program, "u_ambient");
    let lightDir_UL = gl.getUniformLocation(program, "u_lightDir");
    let lightColor_UL = gl.getUniformLocation(program, "u_lightColor");
    let specular_UL = gl.getUniformLocation(program, "u_specular");
    let gloss_UL = gl.getUniformLocation(program, "u_gloss");
    let bumpScale_UL = gl.getUniformLocation(program, "u_bumpScale");

    gl.enableVertexAttribArray(position_AL);
    gl.enableVertexAttribArray(texcoord_AL);
    gl.enableVertexAttribArray(normal_AL);
    gl.enableVertexAttribArray(tangent_AL);

    //迷宫属性
    let blockLength = 100;
    let mazeSize = 21;
    let maze = createMaze(mazeSize);

    //迷宫网格数据
    let positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, blockMesh(blockLength), gl.STATIC_DRAW);

    //墙壁纹理坐标
    let wallTexcoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, wallTexcoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, wallTexcoord(), gl.STATIC_DRAW);
    //地面纹理坐标
    let groundTexcoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, groundTexcoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, groundTexcoord(mazeSize), gl.STATIC_DRAW);

    //法线
    let normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, blockNormal(), gl.STATIC_DRAW);
    //切线
    let tangentBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tangentBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, blockTangent(), gl.STATIC_DRAW);

    //墙壁纹理
    let wall_texture = gl.createTexture();
    setTexture(wall_texture, 0, "Resources/Brick_Diffuse.JPG", gl.NEAREST_MIPMAP_LINEAR);
    let wall_normalTex = gl.createTexture();
    setTexture(wall_normalTex, 1, "Resources/Brick_Normal.jpg", gl.NEAREST_MIPMAP_LINEAR);
    //地面纹理
    let ground_texture = gl.createTexture();
    setTexture(ground_texture, 2, "Resources/Road_Diffuse.jpg", gl.NEAREST_MIPMAP_LINEAR);
    let ground_normalTex = gl.createTexture();
    setTexture(ground_normalTex, 3, "Resources/Road_Normal.jpg", gl.NEAREST_MIPMAP_LINEAR);

    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    //摄像机属性
    let camera = {
        position: getBlockPos(mazeSize, blockLength, [2, 0]),
        rotation: [0, -90, 0],
        direction: [0, 0, -1],
        fieldOfView: m3.degToRad(60),
        aspect: gl.canvas.clientWidth / gl.canvas.clientHeight,
        near: 1,
        far: 5000,
        moveSpeed: 100,
        rotateSpeed: [1, 1],
        maxUpDeg: 89,
        maxDownDeg: -89,
    };

    //环境光
    let ambient = {
        color: [0.25, 0.25, 0.25],
        intensity: 1.0,
    };
    //方向光
    let directionalLight = {
        direction: [-1, -1, -1],
        color: [1, 1, 1],
    };

    let specular = [0.95, 0.75, 0.60];
    let gloss = 300.0;
    let bumpScale = 1.0;

    //监听键盘和鼠标输入
    let keyPressed = {
        front: false,
        left: false,
        back: false,
        right: false,
        sprint: false,
        up: false,
        down: false,
    };
    window.addEventListener("keydown", function (e) {
        // console.log(e.code + ' down');
        switch (e.code) {
            case "KeyW":
                keyPressed.front = true;
                break;
            case "KeyA":
                keyPressed.left = true;
                break;
            case "KeyS":
                keyPressed.back = true;
                break;
            case "KeyD":
                keyPressed.right = true;
                break;
            case "ShiftLeft":
                keyPressed.sprint = true;
                break;
            case "Space":
                keyPressed.up = true;
                break;
        }
        if(e.altKey) {
            keyPressed.down = true;
        }
    });
    window.addEventListener("keyup", function (e) {
        // console.log(e.code + ' up');
        switch (e.code) {
            case "KeyW":
                keyPressed.front = false;
                break;
            case "KeyA":
                keyPressed.left = false;
                break;
            case "KeyS":
                keyPressed.back = false;
                break;
            case "KeyD":
                keyPressed.right = false;
                break;
            case "ShiftLeft":
                keyPressed.sprint = false;
                break;
            case "Space":
                keyPressed.up = false;
                break;
        }
        if(!e.altKey) {
            keyPressed.down = false;
        }
    });
    gl.canvas.addEventListener("mousemove", function (e) {
        // console.log([e.movementX, e.movementY]);
        let speedRatio = 20;
        camera.rotateSpeed = [e.movementY * speedRatio, -e.movementX * speedRatio];
    });

    //设置全屏并锁定鼠标指针
    let btn = document.getElementById("full-screen-button");
    function lockPointer() {
        gl.canvas.requestFullscreen = gl.canvas.requestFullscreen ||
            gl.canvas.mozRequestFullscreen ||
            gl.canvas.mozRequestFullScreen ||
            gl.canvas.webkitRequestFullscreen;
        gl.canvas.requestFullscreen();
    }
    btn.addEventListener("click", lockPointer);
    function fullscreenChange() {
        gl.canvas.requestPointerLock = gl.canvas.requestPointerLock ||
            gl.canvas.mozRequestPointerLock ||
            gl.canvas.webkitRequestPointerLock;
        gl.canvas.requestPointerLock();
        if (!document.fullscreenElement) {
            gl.canvas.width = 800;
            gl.canvas.height = 600;
        }
        webglUtils.resizeCanvasToDisplaySize(gl.canvas);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }
    document.addEventListener('fullscreenchange', fullscreenChange, false);
    function pointerLockError() {
        console.log("锁定指针时出错。");
    }
    document.addEventListener('pointerlockerror', pointerLockError, false);

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

        //摄像头漫游
        cameraMove(deltaTime);
        cameraRotate(deltaTime);

        //计算视图投影矩阵
        let mat_projection = m4.perspective(camera.fieldOfView, camera.aspect, camera.near, camera.far);
        let mat_camera = m4.lookIn(camera.position, camera.direction, [0, 1, 0]);
        let mat_view = m4.inverse(mat_camera);
        let mat_viewProjection = m4.multiply(mat_projection, mat_view);

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(position_AL, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.vertexAttribPointer(normal_AL, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, tangentBuffer);
        gl.vertexAttribPointer(tangent_AL, 3, gl.FLOAT, false, 0 ,0);

        gl.uniform3fv(ambient_UL, m4.scaleVector(ambient.color, ambient.intensity));
        gl.uniform3fv(lightDir_UL, m4.subtractVectors([0, 0, 0], directionalLight.direction));
        gl.uniform3fv(lightColor_UL, directionalLight.color);
        gl.uniform3fv(viewWorldPos_UL, camera.position);
        gl.uniform3fv(specular_UL, specular);
        gl.uniform1f(gloss_UL, gloss);
        gl.uniform1f(bumpScale_UL, bumpScale);

        //绘制迷宫
        //墙壁
        gl.bindBuffer(gl.ARRAY_BUFFER, wallTexcoordBuffer);
        gl.vertexAttribPointer(texcoord_AL, 2, gl.FLOAT, false, 0, 0);
        for (let i = 0; i < mazeSize; i++) {
            for (let j = 0; j < mazeSize; j++) {
                if(!maze[i][j]) {
                    let wallPos = getBlockPos(mazeSize, blockLength, [i, j]);
                    let mat_world = m4.translation(wallPos);
                    let mat_world_IT = m4.transpose(m4.inverse(mat_world));
                    let mat_worldViewProjection = m4.multiply(mat_viewProjection, mat_world);

                    gl.uniformMatrix4fv(mat_W_UL, false, mat_world);
                    gl.uniformMatrix4fv(mat_W_IT_UL, false, mat_world_IT);
                    gl.uniformMatrix4fv(mat_WVP_UL, false, mat_worldViewProjection);
                    gl.uniform1i(mainTex_UL, 0);
                    gl.uniform1i(bumpMap_UL, 1);

                    gl.drawArrays(gl.TRIANGLES, 0, 6 * 6);
                }
            }
        }
        //地面
        gl.bindBuffer(gl.ARRAY_BUFFER, groundTexcoordBuffer);
        gl.vertexAttribPointer(texcoord_AL, 2, gl.FLOAT, false, 0, 0);
        let mat_world = m4.translation([0, -blockLength, 0]);
        mat_world = m4.scale(mat_world, [mazeSize, 1, mazeSize]);
        let mat_world_IT = m4.transpose(m4.inverse(mat_world));
        let mat_worldViewProjection = m4.multiply(mat_viewProjection, mat_world);

        gl.uniformMatrix4fv(mat_W_UL, false, mat_world);
        gl.uniformMatrix4fv(mat_W_IT_UL, false, mat_world_IT);
        gl.uniformMatrix4fv(mat_WVP_UL, false, mat_worldViewProjection);
        gl.uniform1i(mainTex_UL, 2);
        gl.uniform1i(bumpMap_UL, 3);
        gl.drawArrays(gl.TRIANGLES, 0, 6 * 6);

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
        dir = keyPressed.front ? m4.addVectors(dir, front) : dir;
        dir = keyPressed.left ? m4.addVectors(dir, left) : dir;
        dir = keyPressed.back ? m4.addVectors(dir, back) : dir;
        dir = keyPressed.right ? m4.addVectors(dir, right) : dir;
        dir = m4.normalize(dir);
        vertical = keyPressed.up ? m4.addVectors(vertical, [0, 1, 0]) : vertical;
        vertical = keyPressed.down ? m4.addVectors(vertical, [0, -1, 0]) : vertical;
        let speed = camera.moveSpeed;
        speed = keyPressed.sprint ? (2 * speed) : speed;
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
        rot[0] = m3.clamp(rot[0], camera.maxDownDeg, camera.maxUpDeg);
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

    function setTexture(texture, textureIndex, imagePath, mipmapMinFilter) {
        gl.activeTexture(gl.TEXTURE0 + textureIndex);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA,
            gl.UNSIGNED_BYTE, new Uint8Array([255, 0, 255, 255]));
        let image = new Image();
        image.src = imagePath;
        image.addEventListener("load", function () {
            gl.activeTexture(gl.TEXTURE0 + textureIndex);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

            if (m3.isPowerOf2(image.width) && m3.isPowerOf2(image.height)) {
                gl.generateMipmap(gl.TEXTURE_2D);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mipmapMinFilter);
            }
            else {
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            }
        });
    }
}
