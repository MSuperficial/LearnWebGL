"use strict";

function main() {
    let canvas = document.getElementById("canvas");
    let gl = canvas.getContext("webgl");
    if (!gl) {
        return;
    }

    //创建并使用程序
    let program = webglUtils.createProgramFromScripts(gl, ["vertex-shader", "fragment-shader"]);
    gl.useProgram(program);

    //找到参数位置
    let position_AL = gl.getAttribLocation(program, "a_position"),
        matrix_UL = gl.getUniformLocation(program, "u_matrix"),
        color_UL = gl.getUniformLocation(program, "u_color");

    //创建缓冲
    let headPosBuffer = gl.createBuffer();
    let bodyPosBuffer = gl.createBuffer();
    let starPosBuffer = gl.createBuffer();
    let starFramePosBuffer = gl.createBuffer();
    let spikePosBuffer = gl.createBuffer();

    //设置画布
    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    //初始化变量
    let then = performance.now() * 0.001;
    let gameOver = false;

    //贪吃蛇的属性
    let snakeHeadSize = 30;
    let snakeBodySize = 25;
    let wayPointTimer = 0;
    let wayPointSpace = 25;
    let originMoveSpeed = 100;
    let snakeAngleInRadians = 0;
    let snakeHeadColor = [1.0, 0.0, 0.0, 1.0];
    let snakeBodyColor = [0.0, 1.0, 0.0, 1.0];
    let snake = initSnake(5, originMoveSpeed);

    //星星的属性
    let star = {
        starSize: 10,
        starPosition: [100, 100],
        starInnerColor: [1.0, 0.863, 0.0745, 1.0],
        starFrameColor: [1.0, 0.627, 0.176, 1.0],
    };
    snake.setStar(star);

    //刺的属性
    let spikeMinSize = 5;
    let spikeMaxSize = 20;
    let spikeTimer = 0;
    let spikeCoolDown = 3;
    let spikes = [];
    snake.setSpikes(spikes);

    //分数
    let score = 0;

    //向缓冲上传数据
    gl.bindBuffer(gl.ARRAY_BUFFER, headPosBuffer);
    setSnakeHead(snakeHeadSize);
    gl.bindBuffer(gl.ARRAY_BUFFER, bodyPosBuffer);
    setSnakeBody(snakeBodySize);
    gl.bindBuffer(gl.ARRAY_BUFFER, starPosBuffer);
    setStar(star.starSize);
    gl.bindBuffer(gl.ARRAY_BUFFER, starFramePosBuffer);
    setStarFrame(star.starSize);

    //监听事件
    gl.canvas.addEventListener("mousemove", function (event) {
        if (!gameOver) {
            updateAngle(event, snake);
        }
    });
    // let distanceBtSnakeNMouse = 0;

    requestAnimationFrame(drawScene);

    function drawScene(now) {
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enableVertexAttribArray(position_AL);

        now *= 0.001;
        let deltaTime = now - then;
        then = now;

        updateWayPointTimer(deltaTime);
        updateSpikeTimer(deltaTime);

        // if(distanceBtSnakeNMouse > snake.getHead().getSize()) {
        //     snake.move(deltaTime);
        // }
        snake.move(deltaTime);

        drawSnake();
        drawStar();
        drawSpike(spikes);

        let state = snake.collisionDetection([gl.canvas.width, gl.canvas.height]);
        if (state === 1) {
            gainPoint(snake);
        } else if (state === 0) {
            gameOver = true;
            alert("Game Over!\n你的分数是：" + score);
            location.reload();
            return;
        }

        requestAnimationFrame(drawScene);
    }

    //绘制贪吃蛇
    function drawSnake() {
        //绘制蛇头
        gl.bindBuffer(gl.ARRAY_BUFFER, headPosBuffer);
        gl.vertexAttribPointer(position_AL, 2, gl.FLOAT, false, 0, 0);
        let matrix = calculateMatrix(gl, snake.currentPos(), snakeAngleInRadians, [1, 1]);
        gl.uniformMatrix3fv(matrix_UL, false, matrix);
        gl.uniform4fv(color_UL, snake.getHead().getColor());
        gl.drawArrays(gl.LINE_LOOP, 0, 4);

        //绘制身体
        gl.bindBuffer(gl.ARRAY_BUFFER, bodyPosBuffer);
        gl.vertexAttribPointer(position_AL, 2, gl.FLOAT, false, 0, 0);
        snake.getBodyList().map(function (body) {
            matrix = calculateMatrix(gl, body.getPos(), 0,
                             [body.getSize() / snakeBodySize, body.getSize() / snakeBodySize]);
            gl.uniformMatrix3fv(matrix_UL, false, matrix);
            gl.uniform4fv(color_UL, body.getColor());
            gl.drawArrays(gl.LINE_LOOP, 0, 24);
        });
    }
    //绘制星星
    function drawStar() {
        gl.bindBuffer(gl.ARRAY_BUFFER, starPosBuffer);
        gl.vertexAttribPointer(position_AL, 2, gl.FLOAT, false, 0, 0);
        let matrix = calculateMatrix(gl, star.starPosition, 0, [1, 1]);
        gl.uniformMatrix3fv(matrix_UL, false, matrix);
        gl.uniform4fv(color_UL, star.starInnerColor);
        gl.drawArrays(gl.LINE_LOOP, 0, 10);

        gl.bindBuffer(gl.ARRAY_BUFFER, starFramePosBuffer);
        gl.vertexAttribPointer(position_AL, 2, gl.FLOAT, false, 0, 0);
        matrix = calculateMatrix(gl, star.starPosition, 0, [1, 1]);
        gl.uniformMatrix3fv(matrix_UL, false, matrix);
        gl.uniform4fv(color_UL, star.starFrameColor);
        gl.drawArrays(gl.LINE_LOOP, 0, 10);
    }
    //绘制刺
    function drawSpike(spikeArray) {
        spikeArray.forEach(function (spike) {
            gl.bindBuffer(gl.ARRAY_BUFFER, spikePosBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spike.spikePoints), gl.STATIC_DRAW);
            gl.vertexAttribPointer(position_AL, 2, gl.FLOAT, false, 0, 0);
            let matrix = calculateMatrix(gl, spike.spikePosition, 0, [1, 1]);
            gl.uniformMatrix3fv(matrix_UL, false, matrix);
            gl.uniform4fv(color_UL, spike.spikeColor);
            gl.drawArrays(gl.LINE_LOOP, 0, spike.pointsNum);
        })
    }

    function updatePoint() {
        score++;
    }
    function resetStar() {
        star.starPosition = [randomInt(gl.canvas.width - star.starSize * 8) + star.starSize * 4,
                             randomInt(gl.canvas.height - star.starSize * 8) + star.starSize * 4];
    }
    function gainPoint(snake) {
        updatePoint();
        resetStar();
        snake.grow();
    }
    function updateWayPointTimer(deltaTime) {
        wayPointTimer += deltaTime;
        if (wayPointTimer >= wayPointSpace / snake.getSpeed()) {
            snake.setWayPoint();
            wayPointTimer = 0;
        }
    }
    function updateSpikeTimer(deltaTime) {
        spikeTimer += deltaTime;
        if(spikeTimer >= spikeCoolDown) {
            let spike = newSpike(spikeMinSize, spikeMaxSize);
            spikes.push(spike);
            spikeTimer = 0;
        }
    }
    function updateAngle(event, snake) {
        let rect = event.target.getBoundingClientRect();
        let clickPos = [0, 0];
        clickPos[0] = event.clientX - rect.left;
        clickPos[1] = event.clientY - rect.top;
        let originDir = [0, -1];
        let currentDir = m3.dir(snake.currentPos(), clickPos);
        currentDir = m3.normalize(currentDir);
        snakeAngleInRadians = Math.acos(m3.dot(originDir, currentDir));
        if (currentDir[0] > 0) {
            snakeAngleInRadians = Math.PI * 2 - snakeAngleInRadians;
        }
        snake.getHead().setDir(currentDir);
        // distanceBtSnakeNMouse = m3.distance(clickPos, snake.currentPos());
    }

    // function updatePosition(deltaTime) {
    //     let deltaPos = [moveSpeed * deltaTime, moveSpeed * deltaTime];
    //     deltaPos[0] *= -Math.sin(angleInRadians);
    //     deltaPos[1] *= -Math.cos(angleInRadians);
    //     translation[0] += deltaPos[0];
    //     translation[1] += deltaPos[1];
    // }

    function initSnake(length, speed) {
        let initHead = {
            position: [gl.canvas.width / 2, gl.canvas.height / 2],
            direction: [0, -1],
            size: snakeHeadSize,
            color: snakeHeadColor,
        };
        let head = new SnakeHead(initHead);
        let wayPoint = new Map();
        wayPoint.set(0, initHead.position);
        let body = [];
        for (let i = 0; i < length; i++) {
            let initBody = {
                position: [initHead.position[0], initHead.position[1] + snakeBodySize * (i + 1)],
                targetKey: 0,
                size: snakeBodySize,
                color: snakeBodyColor,
            };
            body.push(new SnakeBody(initBody));
        }
        return (new Snake(head, body, speed, wayPoint));
    }

    function setSnakeHead(size) {
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            0, 0,
            -size, size * 0.577,
            0, -size * 1.154,
            size, size * 0.577,
        ]), gl.STATIC_DRAW);
    }
    function setSnakeBody(size) {
        let bodyPoints = [];
        let numOfPoints = 24;
        let deltaAngle = 2 * Math.PI / numOfPoints;
        for (let i = 0; i < numOfPoints; i++) {
            let x = size * Math.sin(deltaAngle * i);
            let y = size * Math.cos(deltaAngle * i);
            bodyPoints.push(x, y);
        }
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bodyPoints), gl.STATIC_DRAW);
    }
    function setStar(size) {
        let starPoints = [];
        let deltaAngle = 2 * Math.PI / 10;
        for (let i = 0; i < 10; i++) {
            let x = (2 - (i % 2)) * size * Math.sin(deltaAngle * i);
            let y = -(2 - (i % 2)) * size * Math.cos(deltaAngle * i);
            starPoints.push(x, y);
        }
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(starPoints), gl.STATIC_DRAW);
    }
    function setStarFrame(size) {
        let starFramePoints = [];
        let deltaAngle = 2 * Math.PI / 5;
        for (let i = 0; i < 5; i++) {
            let x = 2 * size * Math.sin(deltaAngle * i);
            let y = -2 * size * Math.cos(deltaAngle * i);
            starFramePoints.push(0, 0);
            starFramePoints.push(x, y);
        }
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(starFramePoints), gl.STATIC_DRAW);
    }
    function newSpike(minSize, maxSize) {
        let spike = {
            spikeMinSize: minSize,
            spikeMaxSize: maxSize,
            spikePosition: [],
            spikeColor: [0.694, 0.0941, 0.529, 1.0],
            spikePoints: [],
            pointsNum: 0,
        };
        do {
            spike.spikePosition = [randomInt(gl.canvas.width - maxSize * 4) + maxSize * 2,
                                   randomInt(gl.canvas.height - maxSize * 4) + maxSize * 2];
        }while (m3.distance(spike.spikePosition, star.starPosition) <= spike.spikeMaxSize + star.starSize * 2);
        let points = [];
        let numOfPoints = randomInt(4) + 16;
        numOfPoints = (numOfPoints % 2 === 0) ? numOfPoints : numOfPoints + 1;
        let deltaAngle = 2 * Math.PI / numOfPoints;
        for (let i = 0; i < numOfPoints; i++) {
            let size = minSize;
            if(i % 2 === 0) {
                size = randomInt(10) + maxSize - 10;
            }
            let x = size * Math.sin(deltaAngle * i);
            let y = size * Math.cos(deltaAngle * i);
            points.push(x, y);
        }
        spike.spikePoints = points;
        spike.pointsNum = numOfPoints;
        return spike;
    }

    function calculateMatrix(gl, translation, angleInRadians, scaling) {
        let matrix = m3.projection(gl.canvas.width, gl.canvas.height);
        matrix = m3.translate(matrix, translation[0], translation[1]);
        matrix = m3.rotate(matrix, angleInRadians);
        matrix = m3.scale(matrix, scaling[0], scaling[1]);
        return matrix;
    }
    function randomInt(range) {
        return Math.floor(Math.random() * range);
    }
}
