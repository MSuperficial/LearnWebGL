"use strict";

function main() {
    let canvas = document.getElementById("canvas");
    let gl = canvas.getContext("webgl");
    if (!gl) {
        return;
    }

    let glProgram = webglUtils.createProgramFromScripts(gl, ["3d-vertex-shader", "3d-fragment-shader"]);
    let skyboxProgram = webglUtils.createProgramFromScripts(gl, ["skybox-vertex-shader", "skybox-fragment-shader"]);

    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    gl.useProgram(glProgram);
    let position_AL = gl.getAttribLocation(glProgram, "a_position");
    let texcoord_AL = gl.getAttribLocation(glProgram, "a_texcoord");
    let normal_AL = gl.getAttribLocation(glProgram, "a_normal");
    let tangent_AL = gl.getAttribLocation(glProgram, "a_tangent");

    let viewWorldPos_UL = gl.getUniformLocation(glProgram, "u_viewWorldPos");
    let lightDir_UL = gl.getUniformLocation(glProgram, "u_lightDir");
    let lightColor_UL = gl.getUniformLocation(glProgram, "u_lightColor");

    let mat_W_UL = gl.getUniformLocation(glProgram, "u_Mat_W");
    let mat_W_IT_UL = gl.getUniformLocation(glProgram, "u_Mat_W_IT");
    let mat_WVP_UL = gl.getUniformLocation(glProgram, "u_Mat_WVP");

    let mainTex_UL = gl.getUniformLocation(glProgram, "u_mainTex");
    let ambient_UL = gl.getUniformLocation(glProgram, "u_ambient");
    let specular_UL = gl.getUniformLocation(glProgram, "u_specular");
    let gloss_UL = gl.getUniformLocation(glProgram, "u_gloss");

    let bumpMap_UL = gl.getUniformLocation(glProgram, "u_bumpMap");
    let bumpScale_UL = gl.getUniformLocation(glProgram, "u_bumpScale");

    let specularMask_UL = gl.getUniformLocation(glProgram, "u_specularMask");
    let specularScale_UL = gl.getUniformLocation(glProgram, "u_specularScale");
    let hasMask_UL = gl.getUniformLocation(glProgram, "u_hasMask");

    gl.enableVertexAttribArray(position_AL);
    gl.enableVertexAttribArray(texcoord_AL);
    gl.enableVertexAttribArray(normal_AL);
    gl.enableVertexAttribArray(tangent_AL);

    gl.useProgram(skyboxProgram);
    let sky_position_AL = gl.getAttribLocation(skyboxProgram, "a_sky_position");
    let skybox_UL = gl.getUniformLocation(skyboxProgram, "u_skybox");
    let mat_VP_I_UL = gl.getUniformLocation(skyboxProgram, "u_Mat_VP_I");
    gl.enableVertexAttribArray(sky_position_AL);

    //迷宫属性
    let blockLength = 100;
    let mazeSize = 21;
    let maze = createMaze(mazeSize);

    gl.useProgram(glProgram);
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
    let ground_specularMask = gl.createTexture();
    setTexture(ground_specularMask, 4, "Resources/Road_Specular.jpg", gl.NEAREST_MIPMAP_LINEAR);

    gl.useProgram(skyboxProgram);
    let sky_positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sky_positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,
        1, -1,
        -1,  1,
        -1,  1,
        1, -1,
        1,  1,
    ]), gl.STATIC_DRAW);

    let skyboxTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);

    const faceInfos = [
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
            src: "Resources/skybox/right.jpg",
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
            src: "Resources/skybox/left.jpg",
        },
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
            src: "Resources/skybox/top.jpg",
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
            src: "Resources/skybox/bottom.jpg",
        },
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
            src: "Resources/skybox/front.jpg",
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
            src: "Resources/skybox/back.jpg",
        },
    ];
    faceInfos.forEach((faceInfo) => {
        let {target, src} = faceInfo;
        gl.texImage2D(target, 0, gl.RGBA, 1, 1, 0, gl.RGBA,
                      gl.UNSIGNED_BYTE, new Uint8Array([255, 0, 255, 255]));
        let image = new Image();
        image.src = src;
        image.addEventListener("load", function () {
            gl.useProgram(skyboxProgram);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);
            gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
        });
    });
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

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
        around: 225,
        height: 45,
    };

    let specularColor = [0.95, 0.75, 0.60];
    let gloss = 250.0;
    let wallBumpScale = -0.8;
    let groundBumpScale = 0.05;
    let groundSpecularScale = 0.1;

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
        let speedRatio = 20;
        camera.rotateSpeed = [e.movementY * speedRatio, -e.movementX * speedRatio];
    });

    webglLessonsUI.setupSlider("#gloss", {value: gloss, slide: function (e, ui) {
            gloss = ui.value;
        }, min: 8.0, max: 300.0, step: 0.01, precision: 2});
    webglLessonsUI.setupSlider("#wallBumpScale", {value: wallBumpScale, slide: function (e, ui) {
            wallBumpScale = ui.value;
        }, min: -1.0, max: 1.0, step: 0.001, precision: 3});
    webglLessonsUI.setupSlider("#groundBumpScale", {value: groundBumpScale, slide: function (e, ui) {
            groundBumpScale = ui.value;
        }, min: 0.0, max: 0.3, step: 0.001, precision: 3});
    webglLessonsUI.setupSlider("#groundSpecularScale", {value: groundSpecularScale, slide: function (e, ui) {
            groundSpecularScale = ui.value;
        }, min: 0.0, max: 5.0, step: 0.01, precision: 2});
    webglLessonsUI.setupSlider("#ambientIntensity", {value: ambient.intensity, slide: function (e, ui) {
            ambient.intensity = ui.value;
        }, min: 0.0, max: 4.0, step: 0.01, precision: 2});
    webglLessonsUI.setupSlider("#light_around", {value: directionalLight.around, slide: function (e, ui) {
            directionalLight.around = ui.value;
            setLightDir();
        }, min: 0, max: 360});
    webglLessonsUI.setupSlider("#light_height", {value: directionalLight.height, slide: function (e, ui) {
            directionalLight.height = ui.value;
            setLightDir();
        }, min: 0, max: 90});
    webglLessonsUI.setupSlider("#moveSpeed", {value: camera.moveSpeed, slide: function (e, ui) {
            camera.moveSpeed = ui.value;
        }, min: 50, max: 500});
    function setLightDir() {
        let origin = [0, 0, 1];
        let up = [0, 1, 0];
        let left = [1, 0, 0];
        let matrix = m4.axisRotation(up, m3.degToRad(directionalLight.around));
        left = m4.normalize(m4.transformDirection(matrix, left));
        matrix = m4.axisRotation(left, m3.degToRad(directionalLight.height));
        matrix = m4.axisRotate(matrix, up, m3.degToRad(directionalLight.around));
        directionalLight.direction = m4.normalize(m4.transformDirection(matrix, origin));
    }

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
        alert("锁定指针时出错。");
    }
    document.addEventListener('pointerlockerror', pointerLockError, false);

    let lastFrameTime = performance.now() * 0.001;
    requestAnimationFrame(drawScene);

    function drawScene(now) {
        now *= 0.001;
        let deltaTime = now - lastFrameTime;
        lastFrameTime = now;

        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);

        webglUtils.resizeCanvasToDisplaySize(gl.canvas);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        //摄像头漫游
        cameraMove(deltaTime);
        cameraRotate(deltaTime);

        //计算视图投影矩阵
        let mat_projection = m4.perspective(camera.fieldOfView, camera.aspect, camera.near, camera.far);
        let mat_camera = m4.lookIn(camera.position, camera.direction, [0, 1, 0]);
        let mat_view = m4.inverse(mat_camera);
        let mat_viewProjection = m4.multiply(mat_projection, mat_view);

        gl.useProgram(glProgram);
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
        gl.uniform3fv(specular_UL, specularColor);
        gl.uniform1f(gloss_UL, gloss);

        //绘制迷宫
        //墙壁
        gl.bindBuffer(gl.ARRAY_BUFFER, wallTexcoordBuffer);
        gl.vertexAttribPointer(texcoord_AL, 2, gl.FLOAT, false, 0, 0);
        gl.uniform1i(mainTex_UL, 0);
        gl.uniform1i(bumpMap_UL, 1);
        gl.uniform1i(hasMask_UL, 0);
        gl.uniform1f(bumpScale_UL, wallBumpScale);
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
        gl.uniform1i(specularMask_UL, 4);
        gl.uniform1f(bumpScale_UL, groundBumpScale);
        gl.uniform1f(specularScale_UL, groundSpecularScale);
        gl.uniform1i(hasMask_UL, 1);
        gl.drawArrays(gl.TRIANGLES, 0, 6 * 6);

        gl.useProgram(skyboxProgram);
        gl.enableVertexAttribArray(sky_position_AL);
        gl.bindBuffer(gl.ARRAY_BUFFER, sky_positionBuffer);
        gl.vertexAttribPointer(sky_position_AL, 2, gl.FLOAT, false, 0, 0);

        let sky_mat_view = m4.copy(mat_view);
        sky_mat_view[12] = 0;
        sky_mat_view[13] = 0;
        sky_mat_view[14] = 0;
        let sky_mat_viewProjection = m4.multiply(mat_projection, sky_mat_view);
        let sky_mat_VP_I = m4.inverse(sky_mat_viewProjection);
        gl.uniformMatrix4fv(mat_VP_I_UL, false, sky_mat_VP_I);
        gl.uniform1i(skybox_UL, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6 * 1);

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
        rot[0] = m3.clamp(rot[0], camera.maxDownDeg, camera.maxUpDeg);
        rot[1] = rot[1] < 0 ? (rot[1] + 360) : rot[1];
        rot[1] %= 361;

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
            gl.useProgram(glProgram);
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
