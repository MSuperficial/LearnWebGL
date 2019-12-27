'use strict';

function createMaze(mazeSize) {
    let maze = [];
    for (let i = 0; i < mazeSize; i++) {
        maze[i] = [];
        for (let j = 0; j < mazeSize; j++) {
            maze[i][j] = false;
        }
    }

    for (let i = 0; i < mazeSize; i++) {
        maze[i][0] = true;
        maze[0][i] = true;
        maze[mazeSize - 1][i] = true;
        maze[i][mazeSize - 1] = true;
    }

    let wall = [];
    wall.push([2, 2]);
    while (wall.length) {
        let currentIndex = Math.floor(Math.random() * wall.length);
        let currentWall = wall[currentIndex];
        let x = currentWall[0];
        let y = currentWall[1];

        let count = 0;
        maze[x - 1][y] ? count++ : count;
        maze[x + 1][y] ? count++ : count;
        maze[x][y - 1] ? count++ : count;
        maze[x][y + 1] ? count++ : count;

        if (count <= 1) {
            maze[x][y] = true;
            !maze[x - 1][y] ? wall.push([x - 1, y]) : wall;
            !maze[x + 1][y] ? wall.push([x + 1, y]) : wall;
            !maze[x][y - 1] ? wall.push([x, y - 1]) : wall;
            !maze[x][y + 1] ? wall.push([x, y + 1]) : wall;
        }

        wall.splice(currentIndex, 1);
    }

    maze[2][1] = true;
    for (let i = mazeSize - 3; i >= 0; i--) {
        if (maze[i][mazeSize - 3]) {
            maze[i][mazeSize - 2] = true;
            break;
        }
    }

    return maze;
}

function getBlockPos(mazeSize, wallLength, index) {
    let center = (mazeSize - 1) / 2;
    let indexOffset = [index[1] - center, index[0] - center];
    return [wallLength * indexOffset[0], 0, wallLength * indexOffset[1]];
}

function blockMesh(length) {
    let half = length / 2.0;
    return new Float32Array([
        //+z
        -half, -half, half,
        half, half, half,
        -half, half, half,
        -half, -half, half,
        half, -half, half,
        half, half, half,

        //-z
        half, -half, -half,
        -half, half, -half,
        half, half, -half,
        half, -half, -half,
        -half, -half, -half,
        -half, half, -half,

        //+y
        -half, half, half,
        half, half, -half,
        -half, half, -half,
        -half, half, half,
        half, half, half,
        half, half, -half,

        //-y
        -half, -half, -half,
        half, -half, half,
        -half, -half, half,
        -half, -half, -half,
        half, -half, -half,
        half, -half, half,

        //+x
        half, -half, half,
        half, half, -half,
        half, half, half,
        half, -half, half,
        half, -half, -half,
        half, half, -half,

        //-x
        -half, -half, -half,
        -half, half, half,
        -half, half, -half,
        -half, -half, -half,
        -half, -half, half,
        -half, half, half,
    ]);
}

function wallTexcoord() {
    return new Float32Array([
        //+z
        0, 0,
        1, 1,
        0, 1,
        0, 0,
        1, 0,
        1, 1,

        //-z
        0, 0,
        1, 1,
        0, 1,
        0, 0,
        1, 0,
        1, 1,

        //+y
        0, 0,
        1, 1,
        0, 1,
        0, 0,
        1, 0,
        1, 1,

        //-y
        0, 0,
        1, 1,
        0, 1,
        0, 0,
        1, 0,
        1, 1,

        //+x
        0, 0,
        1, 1,
        0, 1,
        0, 0,
        1, 0,
        1, 1,

        //-x
        0, 0,
        1, 1,
        0, 1,
        0, 0,
        1, 0,
        1, 1,
    ]);
}

function groundTexcoord(mazeSize) {
    return new Float32Array([
        //+z
        0, 0,
        mazeSize, 1,
        0, 1,
        0, 0,
        mazeSize, 0,
        mazeSize, 1,

        //-z
        0, 0,
        mazeSize, 1,
        0, 1,
        0, 0,
        mazeSize, 0,
        mazeSize, 1,

        //+y
        0, 0,
        mazeSize, mazeSize,
        0, mazeSize,
        0, 0,
        mazeSize, 0,
        mazeSize, mazeSize,

        //-y
        0, 0,
        mazeSize, mazeSize,
        0, mazeSize,
        0, 0,
        mazeSize, 0,
        mazeSize, mazeSize,

        //+x
        0, 0,
        mazeSize, 1,
        0, 1,
        0, 0,
        mazeSize, 0,
        mazeSize, 1,

        //-x
        0, 0,
        mazeSize, 1,
        0, 1,
        0, 0,
        mazeSize, 0,
        mazeSize, 1,
    ]);
}

function blockNormal() {
    return new Float32Array([
        //+z
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,

        //-z
        0, 0, -1,
        0, 0, -1,
        0, 0, -1,
        0, 0, -1,
        0, 0, -1,
        0, 0, -1,

        //+y
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,

        //-y
        0, -1, 0,
        0, -1, 0,
        0, -1, 0,
        0, -1, 0,
        0, -1, 0,
        0, -1, 0,

        //+x
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,

        //-x
        -1, 0, 0,
        -1, 0, 0,
        -1, 0, 0,
        -1, 0, 0,
        -1, 0, 0,
        -1, 0, 0,
    ]);
}

function blockTangent() {
    return new Float32Array([
        //+z
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,

        //-z
        -1, 0, 0,
        -1, 0, 0,
        -1, 0, 0,
        -1, 0, 0,
        -1, 0, 0,
        -1, 0, 0,

        //+y
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,

        //-y
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,

        //+x
        0, 0, -1,
        0, 0, -1,
        0, 0, -1,
        0, 0, -1,
        0, 0, -1,
        0, 0, -1,

        //-x
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
    ]);
}