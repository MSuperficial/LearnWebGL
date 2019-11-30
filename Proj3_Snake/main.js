"use strict";

function main() {
    var canvas = document.getElementById("canvas");
    var gl = canvas.getContext("webgl");
    if (!gl) {
        return;
    }

    //创建并使用程序
    var program = webglUtils.createProgramFromScripts(gl, ["vertex-shader", "fragment-shader"]);
    gl.useProgram(program);

    //找到参数位置
    var position_AL = gl.getAttribLocation(program, "a_position"),
        matrix_UL = gl.getUniformLocation(program, "u_matrix"),
        color_UL = gl.getUniformLocation(program, "u_color");

    //创建缓冲
    var headPosBuffer = gl.createBuffer();
    var bodyPosBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, headPosBuffer);
    setSnakeHead(30);
    gl.bindBuffer(gl.ARRAY_BUFFER, bodyPosBuffer);
    setSnakeBody(25);

    //设置画布
    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    //初始化变量
    var then = performance.now() * 0.001;
    var wayPointTimer = 0;
    var wayPointSpace = 10;
    var snakeHeadColor = [1.0, 0.0, 0.0, 1.0];
    var snakeBodyColor = [0.0, 1.0, 0.0, 1.0];
    var originMoveSpeed = 50;
    var snake = initSnake(10, originMoveSpeed);
    var translation = [gl.canvas.width/2, gl.canvas.height/2],
        angleInRadians = 0,
        scaling = [1, 1];

    //监听事件
    gl.canvas.onmousemove = function (event) {
        updateAngle(event, snake);
    };

    requestAnimationFrame(drawScene);

    function drawScene(now) {
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enableVertexAttribArray(position_AL);

        now *= 0.001;
        let deltaTime = now - then;
        then = now;

        wayPointTimer += deltaTime;
        if(wayPointTimer >= wayPointSpace / snake.getSpeed()) {
            snake.setWayPoint();
            wayPointTimer = 0;
        }

        snake.move(deltaTime);

        //绘制蛇头
        gl.bindBuffer(gl.ARRAY_BUFFER, headPosBuffer);
        gl.vertexAttribPointer(position_AL, 2, gl.FLOAT, false, 0, 0);
        let matrix = calculateMatrix(gl, snake.currentPos(), angleInRadians, scaling);
        gl.uniformMatrix3fv(matrix_UL, false, matrix);
        gl.uniform4fv(color_UL, snake.getHead().getColor());
        gl.drawArrays(gl.LINE_LOOP, 0, 4);

        //绘制身体
        gl.bindBuffer(gl.ARRAY_BUFFER, bodyPosBuffer);
        gl.vertexAttribPointer(position_AL, 2, gl.FLOAT, false, 0, 0);
        snake.getBodyList().map(function (body) {
            matrix = calculateMatrix(gl, body.getPos(), 0, scaling);
            gl.uniformMatrix3fv(matrix_UL, false, matrix);
            gl.uniform4fv(color_UL, body.getColor());
            gl.drawArrays(gl.LINE_LOOP, 0, 24);
        });

        requestAnimationFrame(drawScene);
    }

    function calculateMatrix(gl, translation, angleInRadians, scaling) {
        let matrix = m3.projection(gl.canvas.width, gl.canvas.height);
        matrix = m3.translate(matrix, translation[0], translation[1]);
        matrix = m3.rotate(matrix, angleInRadians);
        matrix = m3.scale(matrix, scaling[0], scaling[1]);
        return matrix;
    }

    function updateAngle(event, snake) {
        let rect = event.target.getBoundingClientRect();
        let clickPos = [0, 0];
        clickPos[0] = event.clientX - rect.left;
        clickPos[1] = event.clientY - rect.top;
        let originDir= [0, -1];
        let currentDir = m3.dir(snake.currentPos(), clickPos);
        currentDir = m3.normalize(currentDir);
        angleInRadians = Math.acos(m3.dot(originDir, currentDir));
        if(currentDir[0] > 0) {
            angleInRadians = Math.PI * 2 - angleInRadians;
        }
        snake.getHead().setDir(currentDir);
    }

    // function updatePosition(deltaTime) {
    //     let deltaPos = [moveSpeed * deltaTime, moveSpeed * deltaTime];
    //     deltaPos[0] *= -Math.sin(angleInRadians);
    //     deltaPos[1] *= -Math.cos(angleInRadians);
    //     translation[0] += deltaPos[0];
    //     translation[1] += deltaPos[1];
    // }

    function initSnake(length, speed) {
        let headSize = 30;
        let bodySize = 30;
        let initHead = {
            position: [gl.canvas.width/2, gl.canvas.height/2],
            direction: [0, -1],
            size: headSize,
            color: snakeHeadColor,
        };
        let head = new SnakeHead(initHead);
        let wayPoint = new Map();
        wayPoint.set(0, initHead.position);
        let body = [];
        for(let i = 0; i < length; i++) {
            let initBody = {
                position: [initHead.position[0], initHead.position[1] + bodySize * (i + 1)],
                targetKey: 0,
                size: bodySize,
                color: snakeBodyColor,
            };
            body.push(new SnakeBody(initBody));
        }
        return (new Snake(head, body, speed, wayPoint));
    }

    function setSnakeHead(size) {
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            0,      0,
            -size,  size*0.577,
            0,      -size*1.154,
            size,   size*0.577,
        ]), gl.STATIC_DRAW);
    }
    function setSnakeBody(size) {
        let bodyPoints = [];
        let numOfPoints = 24;
        let deltaAngle = 2 * Math.PI / numOfPoints;
        for(let i = 0; i < numOfPoints; i++) {
            let x = size * Math.sin(deltaAngle * i);
            let y = size * Math.cos(deltaAngle * i);
            bodyPoints.push(x, y);
        }
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bodyPoints), gl.STATIC_DRAW);
    }
}
