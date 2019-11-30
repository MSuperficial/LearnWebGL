"use strict";

class SnakePart {
    type;
    position;
    size;
    color;
    constructor(type="", position=[], size=0, color=[]) {
        this.type = type.substring(0);
        this.position = position.slice();
        this.size = size;
        this.color = color.slice();
    }
    getType() {
        return this.type.substring(0);
    }

    getPos() {
        return this.position.slice();
    }
    setPos(pos) {
        this.position = pos.slice();
    }

    getSize() {
        return this.size;
    }
    setSize(size) {
        this.size = size;
    }

    getColor() {
        return this.color.slice();
    }
    setColor(color) {
        this.color = color.slice();
    }
}

class SnakeBody extends SnakePart {
    targetKey;
    constructor({position=[], targetKey=0, size=0, color=[]}={}) {
        super("Body", position, size, color);
        this.targetKey = targetKey;
    }
    getTargetKey() {
        return this.targetKey;
    }
    setTargetKey(key) {
        this.targetKey = key;
    }
}

class SnakeHead extends SnakePart {
    direction;
    constructor({position=[], direction=[], size=0, color=[]}={}) {
        super("Head", position, size, color);
        this.direction = direction.slice();
    }
    getDir() {
        return this.direction.slice();
    }
    setDir(dir) {
        this.direction = dir.slice();
    }
}

function moveTo(object, dir, speed, deltaTime) {
    let deltaTrans = [deltaTime * speed * dir[0], deltaTime * speed * dir[1]];
    let currentPos = object.getPos();
    object.setPos([currentPos[0] + deltaTrans[0], currentPos[1] + deltaTrans[1]]);
}

class Snake {
    head;
    body;
    length;
    speed;
    wayPoints;
    latestWayPointKey;
    constructor(head, body=[], speed, wayPoints) {
        this.head = head;
        this.body = body.slice();
        this.speed = speed;
        this.wayPoints = new Map(wayPoints);
        this.length = body.length;
        this.latestWayPointKey = 0;
    }
    getHead() {
        return this.head;
    }
    getBodyList() {
        return this.body.slice();
    }
    getSpeed() {
        return this.speed;
    }
    getPrevious(object) {
        let thisIndex = this.body.indexOf(object);
        return (thisIndex-1) < 0 ? this.head : this.body[thisIndex-1];
    }
    currentPos() {
        return this.head.getPos();
    }
    currentDir() {
        return this.head.getDir();
    }

    move(deltaTime) {
        //移动头部
        moveTo(this.head, this.currentDir(), this.speed, deltaTime);
        this.wayPoints.set(-1, this.currentPos());

        //移动身体
        for(let i = 0; i < this.body.length; i++) {
            let bodyList = this.body;
            let targetKey = bodyList[i].getTargetKey();
            let targetPos = this.wayPoints.get(targetKey);
            if(m3.distance( bodyList[i].getPos(), this.getPrevious(bodyList[i]).getPos() ) < bodyList[i].getSize()) {
                continue;
            }
            if(m3.distance(bodyList[i].getPos(), targetPos) < deltaTime * this.speed) {
                bodyList[i].setTargetKey(targetKey + 1);
            }
            let dir = m3.dir(bodyList[i].getPos(), this.wayPoints.get(targetKey));
            dir = m3.normalize(dir);
            moveTo(bodyList[i], dir, this.speed, deltaTime);
        }
    }

    setWayPoint() {
        this.wayPoints.set(++this.latestWayPointKey, this.head.getPos());
    }

    grow() {

    }
}