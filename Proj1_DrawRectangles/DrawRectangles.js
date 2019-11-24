"use strict";

//随机生成0到range的整数
function randomInt(range) {
    return Math.floor(Math.random() * range);
}

//设置矩形形状，向Buffer中填充数据
function setRectangle(gl, x, y, width, height) {
    var x1 = x,
        x2 = x + width,
        y1 = y,
        y2 = y + height;
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        x1, y1,
        x1, y2,
        x2, y1,
        x1, y2,
        x2, y1,
        x2, y2,
    ]), gl.STATIC_DRAW);
}

function main() {
    var canvas = document.getElementById("canvas");
    var gl = canvas.getContext("webgl");
    if (!gl) {
        return;
    }

    //设置画布
    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    //从HTML的script标签创建着色程序
    var program = webglUtils.createProgramFromScripts(gl, ["vertex-shader", "fragment-shader"]);

    //获取所有变量的位置
    var position_AL = gl.getAttribLocation(program, "a_position"),
        resolution_UL = gl.getUniformLocation(program, "u_resolution"),
        color_UL = gl.getUniformLocation(program, "u_color");

    //给属性(attribute)变量创建缓冲
    var positionBuffer = gl.createBuffer();

    //使用创建好的着色程序
    gl.useProgram(program);

    //绑定缓冲，启用属性，设置从缓冲中取数据的方式
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(position_AL);
    var size = 2,           //每次迭代运行提取数据的数量
        type = gl.FLOAT,    //提取数据的类型
        normalized = false, //提取的数据是否归一化处理
        stride = 0,         //每次迭代运行需要移动多少内存到达下一个数据开始位置，stride=size*sizeof(type)
                            //如果stride设置为0，则默认属性变量之间紧密相连，互不交叉
        offset = 0;         //从缓冲的offset位置开始读取
    gl.vertexAttribPointer(position_AL, size, type, normalized, stride, offset);

    //设置全局(uniform)变量u_resolution的值
    gl.uniform2f(resolution_UL, gl.canvas.width, gl.canvas.height);

    //循环画10次矩形
    for (let i = 0; i < 10; i++) {
        setRectangle(gl, randomInt(300), randomInt(300), randomInt(300), randomInt(300));

        //设置全局(uniform)变量u_color的值，决定片元颜色
        gl.uniform4f(color_UL, Math.random(), Math.random(), Math.random(), 1);

        //调用drawArrays，运行着色方法对
        let primitiveType = gl.TRIANGLES, //设置图元类型为三角形，即每运行三次顶点着色器就绘制一个三角形
            first = 0,                    //从哪个点开始绘制
            count = 6;                    //顶点着色器运行的次数
        gl.drawArrays(primitiveType, first, count);
    }
}
