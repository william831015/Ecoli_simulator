// prize.js
// E.coli 抽獎動畫主程式

const canvas = document.getElementById('lottery-canvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('start-btn');
const namesInput = document.getElementById('names-input');
const winnerList = document.getElementById('winner-list');

// Calculate radius based on canvas size and margin
const CONTAINER_MARGIN = 15;
const CONTAINER_RADIUS = (canvas.width / 2) - CONTAINER_MARGIN;
const CENTER_X = canvas.width / 2;
const CENTER_Y = canvas.height / 2;
const FOOD_RADIUS = 5;
const FOOD_INTERVAL = 200; // 毫秒
const BACTERIA_MIN_RADIUS = 3.5;  // 橢圓短軸（半徑）
const BACTERIA_MAX_RADIUS = 6.5; // 橢圓長軸（半徑）
const BACTERIA_SPEED = 1.2;
const BROWNIAN_STRENGTH = 0.22; // 布朗運動強度
const FLAGELLA_LENGTH = 25; // 尾巴長度
const FLAGELLA_SWING = 10; // 尾巴最大擺幅
const FLAGELLA_SPEED = 0.05 + Math.random() * 0.01; // 尾巴擺動速度

let bacteria = [];
let foods = [];
let running = false;
let animationId = null;
let foodTimer = null;

function randomColor() {
    const colors = ["#2b7a0b", "#1890ff", "#ff8c00", "#e91e63", "#673ab7", "#009688", "#f44336", "#ffb300", "#607d8b", "#43a047"];
    return colors[Math.floor(Math.random() * colors.length)];
}

function randomPos(radius) {
    let angle = Math.random() * Math.PI * 2;
    let r = Math.random() * (CONTAINER_RADIUS - radius - 10);
    return {
        x: CENTER_X + Math.cos(angle) * r,
        y: CENTER_Y + Math.sin(angle) * r
    };
}

function createBacteria(names) {
    return names.map((name, idx) => {
        let shortAxis = BACTERIA_MIN_RADIUS
        let longAxis = shortAxis * (1.7); // 橢圓長短軸
        let pos = randomPos(longAxis);
        let angle = Math.random() * Math.PI * 2;
        return {
            name: name.trim(),
            x: pos.x,
            y: pos.y,
            shortAxis, // 橢圓短軸
            longAxis,  // 橢圓長軸
            color: randomColor(),
            dx: Math.cos(angle) * BACTERIA_SPEED,
            dy: Math.sin(angle) * BACTERIA_SPEED,
            theta: angle, // 朝向
            flagellaPhase: Math.random() * Math.PI * 2, // 尾巴擺動相位
            alive: true
        };
    });
}

function createFood() {
    let pos = randomPos(FOOD_RADIUS);
    foods.push({ x: pos.x, y: pos.y });
}

function drawContainer() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.beginPath();
    ctx.arc(CENTER_X, CENTER_Y, CONTAINER_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = "#FFD600";
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.restore();
}

function drawFood() {
    foods.forEach(food => {
        ctx.beginPath();
        ctx.arc(food.x, food.y, FOOD_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = "#ffb300";
        ctx.fill();
    });
}

function drawBacteria() {
    bacteria.forEach(bac => {
        if (!bac.alive) return;
        ctx.save();
        ctx.translate(bac.x, bac.y);
        ctx.rotate(bac.theta);
        // 畫細菌本體（橢圓）
        ctx.beginPath();
        ctx.ellipse(0, 0, bac.longAxis, bac.shortAxis, 0, 0, Math.PI * 2);
        ctx.fillStyle = bac.color;
        ctx.shadowColor = bac.color;
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1.1;
        ctx.stroke();
        // 畫尾巴（flagella）
        let flagellaNum = 1 + Math.floor(Math.random() * 2); // 1~2條
        for (let i = 0; i < flagellaNum; i++) {
            let phase = bac.flagellaPhase + i * Math.PI * 0.7;
            let swing = Math.sin(performance.now() * FLAGELLA_SPEED / 2 + phase) * FLAGELLA_SWING;
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(-bac.longAxis, 0);
            ctx.quadraticCurveTo(-bac.longAxis - FLAGELLA_LENGTH / 2, swing, -bac.longAxis - FLAGELLA_LENGTH, 0);
            ctx.strokeStyle = "#222";
            ctx.lineWidth = 0.8;
            ctx.stroke();
            ctx.restore();
        }
        // 畫名字
        ctx.rotate(-bac.theta);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 7px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(bac.name, 0, 2);
        ctx.fillStyle = "#FFD600";
        ctx.font = "bold 8px sans-serif";
        ctx.fillText(Math.round(bac.longAxis), 0, 10);
        ctx.restore();
    });
}

function moveBacteria() {
    bacteria.forEach(bac => {
        if (!bac.alive) return;
        // 布朗運動：速度隨機擾動
        let dTheta = (Math.random() - 0.5) * BROWNIAN_STRENGTH;
        bac.theta += dTheta;
        let speed = BACTERIA_SPEED * (0.8 + Math.random() * 0.4);
        bac.dx = Math.cos(bac.theta) * speed;
        bac.dy = Math.sin(bac.theta) * speed;
        bac.x += bac.dx;
        bac.y += bac.dy;
        bac.flagellaPhase += 0.16 + Math.random() * 0.08;
        // 邊界反彈（圓形容器）
        let dist = Math.sqrt((bac.x - CENTER_X) ** 2 + (bac.y - CENTER_Y) ** 2);
        let maxAxis = Math.max(bac.longAxis, bac.shortAxis);
        if (dist + maxAxis > CONTAINER_RADIUS) {
            // 反彈
            let nx = (bac.x - CENTER_X) / dist;
            let ny = (bac.y - CENTER_Y) / dist;
            bac.theta = Math.atan2(ny, nx) + Math.PI + (Math.random() - 0.5) * 0.7;
            bac.x = CENTER_X + nx * (CONTAINER_RADIUS - maxAxis - 1);
            bac.y = CENTER_Y + ny * (CONTAINER_RADIUS - maxAxis - 1);
        }
    });
}

function eatFood() {
    bacteria.forEach(bac => {
        if (!bac.alive) return;
        for (let i = foods.length - 1; i >= 0; i--) {
            let food = foods[i];
            // 距離用橢圓長軸判斷
            let dist = Math.hypot(bac.x - food.x, bac.y - food.y);
            if (dist < Math.max(bac.longAxis, bac.shortAxis) + FOOD_RADIUS) {
                foods.splice(i, 1);
                // 吃到食物長短軸都變大（無上限）
                bac.longAxis += 2.5;
                bac.shortAxis += 1.3;
            }
        }
    });
}

function bacteriaCollision() {
    for (let i = 0; i < bacteria.length; i++) {
        let a = bacteria[i];
        if (!a.alive) continue;
        for (let j = i + 1; j < bacteria.length; j++) {
            let b = bacteria[j];
            if (!b.alive) continue;
            // 碰撞用長軸近似
            let dist = Math.hypot(a.x - b.x, a.y - b.y);
            let ar = Math.max(a.longAxis, a.shortAxis);
            let br = Math.max(b.longAxis, b.shortAxis);
            if (dist < ar + br) {
                if (Math.abs(ar - br) < 2) {
                    // 一樣大，彈開
                    let angle = Math.atan2(b.y - a.y, b.x - a.x);
                    a.theta = angle + Math.PI + (Math.random() - 0.5) * 0.6;
                    b.theta = angle + (Math.random() - 0.5) * 0.6;
                } else if (ar > br) {
                    a.longAxis += 1;
                    a.shortAxis += 1;
                    b.alive = false;
                } else {
                    b.longAxis += 1;
                    b.shortAxis += 1;
                    a.alive = false;
                }
            }
        }
    }
}

function draw() {
    drawContainer();
    drawFood();
    drawBacteria();
}

function update() {
    moveBacteria();
    eatFood();
    bacteriaCollision();
}

function animate() {
    if (!running) return;
    update();
    draw();
    showTop3();
    let aliveCount = bacteria.filter(b => b.alive).length;
    if (aliveCount <= 3) {
        running = false;
        cancelAnimationFrame(animationId);
        clearInterval(foodTimer);
        showTop3();
        showWinners();
        return;
    }
    animationId = requestAnimationFrame(animate);
}

function showTop3() {
    // 只顯示還活著的細菌
    let alive = bacteria.filter(b => b.alive);
    let sorted = alive.slice().sort((a, b) => b.longAxis - a.longAxis);
    let top3 = sorted.slice(0, 3);
    let html = `<b>目前 TOP 3：</b><br>` +
        top3.map((b, i) => `${i+1}. ${b.name}（${Math.round(b.longAxis)}）`).join('<br>');
    document.getElementById('winner-list').innerHTML = html + '<hr>' + document.getElementById('winner-list').innerHTML.split('<hr>').slice(1).join('<hr>');
}

function startLottery() {
    // 以換行分隔，每行一個名字
    let names = namesInput.value.split(/\r?\n/).map(n => n.trim()).filter(n => n);
    if (names.length < 3) {
        alert('請至少輸入三位抽獎者！');
        return;
    }
    // 初始化
    foods = [];
    bacteria = createBacteria(names);
    running = true;
    winnerList.innerHTML = '';
    draw();
    // 食物產生器
    foodTimer = setInterval(createFood, FOOD_INTERVAL);
    // 動畫開始
    animate();
}

startBtn.onclick = function() {
    if (running) return;
    startLottery();
};

draw();
