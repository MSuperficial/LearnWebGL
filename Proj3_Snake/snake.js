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
    star;
    spikes;
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
    setStar(star) {
        this.star = star;
    }
    setSpikes(spikes) {
        this.spikes = spikes;
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
            if(!this.wayPoints.has(targetKey)) {
                continue;
            }
            if(m3.distance(bodyList[i].getPos(), targetPos) < deltaTime * this.speed) {
                bodyList[i].setTargetKey(targetKey + 1);
                if(i === bodyList.length - 1) {
                    this.wayPoints.delete(targetKey);
                }
            }
            console.log(this.latestWayPointKey);
            if(!this.wayPoints.has(bodyList[i].getTargetKey())) {
                continue;
            }
            let dir = m3.dir(bodyList[i].getPos(), this.wayPoints.get(bodyList[i].getTargetKey()));
            dir = m3.normalize(dir);
            moveTo(bodyList[i], dir, this.speed, deltaTime);
        }
    }

    setWayPoint() {
        this.wayPoints.set(++this.latestWayPointKey, this.head.getPos());
    }

    grow() {
        let bodyList = this.body;
        let index = bodyList.length;
        let initBody = {
            position: [],
            targetKey: bodyList[index-1].getTargetKey(),
            size: Math.max(bodyList[index-1].getSize() * 0.95, 5),
            color: bodyList[index-1].getColor(),
        };
        let dir = m3.dir(bodyList[index-2].getPos(), bodyList[index-1].getPos());
        dir = m3.normalize(dir);
        initBody.position = [bodyList[index-1].getPos()[0] + dir[0] * initBody.size,
                            bodyList[index-1].getPos()[1] + dir[1] * initBody.size];
        let newBody = new SnakeBody(initBody);
        this.body.push(newBody);
    }

    getHeadPos() {
        let offset = this.head.getSize() * 1.154;
        let offsetPos = [offset * this.currentDir()[0], offset * this.currentDir()[1]];
        return [this.currentPos()[0] + offsetPos[0], this.currentPos()[1] + offsetPos[1]];
    }
    detectStar() {
        let headPos = this.getHeadPos();
        return (m3.distance(headPos, this.star.starPosition) <= this.star.starSize * 2);
    }
    detectBody() {
        let headPos = this.getHeadPos();
        let detected = false;
        this.body.forEach(function (eachBody) {
            if(m3.distance(headPos, eachBody.getPos()) < eachBody.getSize()) {
                detected = true;
            }
        });
        return detected;
    }
    detectBorder(border) {
        let pos = this.currentPos();
        return pos[0] <= 0 || pos[0] >= border[0] || pos[1] <= 0 || pos[1] >= border[1];
    }
    detectSpikes() {
        let headPos = this.getHeadPos();
        let detected = false;
        this.spikes.forEach(function (spike) {
            if(m3.distance(headPos, spike.spikePosition) < spike.spikeMaxSize + 2.5) {
                detected = true;
            }
        });
        return detected;
    }
    collisionDetection(border) {
        if(this.detectStar()) {
            return 1;
        }
        else if(this.detectBorder(border) || this.detectBody() || this.detectSpikes()) {
            return 0;
        }
    }
}