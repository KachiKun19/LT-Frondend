const LEVELS = [
  { number: 1, name: "Dễ", cols: 20, rows: 20, speed: 200, target: 10, wrap: true, walls: [] },
];

const $ = id => document.getElementById(id);
const board = $("board"), overlay = $("overlay"), btns = document.querySelectorAll(".level-btn");
let lv = 0, L, unlocked = 1, state, timer, snake, dir, next, food, score, best;
let segs = [], foodEl;

const same = (a, b) => a.x === b.x && a.y === b.y;
const rnd = n => Math.floor(Math.random() * n) + 1;

function cell(cls, p) {
  const e = document.createElement("div");
  e.className = cls;
  board.append(e);
  if (p) move(e, p);
  return e;
}

function move(e, p) {
  e.style.transform = `translate(${(p.x - 1) * 100}%, ${(p.y - 1) * 100}%)`;
}

function draw() {
  while (segs.length < snake.length) segs.push(cell(segs.length ? "snake" : "snake head"));
  while (segs.length > snake.length) segs.pop().remove();
  segs.forEach((e, i) => {
    const p = snake[i];
    const jump = !e.p || Math.abs(e.p.x - p.x) > 1 || Math.abs(e.p.y - p.y) > 1;
    e.style.transition = jump ? "none" : "";
    move(e, p);
    e.p = p;
  });
  if (!foodEl) foodEl = cell("food");
  move(foodEl, food);
}

function loadLevel(i) {
  clearInterval(timer);
  lv = i;
  L = LEVELS[i];
  document.documentElement.style.setProperty("--cols", L.cols);
  document.documentElement.style.setProperty("--rows", L.rows);
  document.documentElement.style.setProperty("--speed", L.speed + "ms");
  $("levelBadge").textContent = `Màn ${L.number} · ${L.name}`;
  best = +localStorage.getItem("snake-best-" + L.number) || 0;
  board.querySelectorAll(".wall").forEach(e => e.remove());
  L.walls.forEach(w => cell("wall", w));
  state = "ready";
  reset();
  renderBtns();
  show(`Màn ${L.number}`, `Ăn ${L.target} mồi để qua màn`, "Bắt đầu");
}

function reset() {
  const y = Math.ceil(L.rows / 2);
  snake = [{ x: 5, y }, { x: 4, y }, { x: 3, y }];
  dir = next = { x: 1, y: 0 };
  score = 0;
  segs.forEach(e => e.remove());
  segs = [];
  placeFood();
  hud();
  draw();
}

function start() {
  reset();
  overlay.classList.add("hidden");
  state = "playing";
  timer = setInterval(step, L.speed);
}

function step() {
  dir = next;
  const h = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
  if (L.wrap) {
    h.x = (h.x + L.cols - 1) % L.cols + 1;
    h.y = (h.y + L.rows - 1) % L.rows + 1;
  } else if (h.x < 1 || h.x > L.cols || h.y < 1 || h.y > L.rows) {
    return lose("Bạn đâm vào tường biên!");
  }
  const eat = same(h, food);
  if ((eat ? snake : snake.slice(0, -1)).some(p => same(p, h))) return lose("Rắn tự cắn vào thân!");
  if (L.walls.some(w => same(w, h))) return lose("Bạn đâm vào chướng ngại vật!");

  snake.unshift(h);
  if (eat) {
    score++;
    hud();
    if (score >= L.target) { draw(); return win(); }
    placeFood();
  } else {
    snake.pop();
  }
  draw();
}

function placeFood() {
  do food = { x: rnd(L.cols), y: rnd(L.rows) };
  while ([...snake, ...L.walls].some(p => same(p, food)));
}

function end() {
  clearInterval(timer);
  if (score > best) {
    best = score;
    localStorage.setItem("snake-best-" + L.number, best);
    hud();
  }
}

function lose(reason) {
  end();
  state = "over";
  show("Thua rồi!", `${reason}<br>Điểm: ${score} / ${L.target}`, "Chơi lại");
}

function win() {
  end();
  state = "win";
  const hasNext = lv + 1 < LEVELS.length;
  if (hasNext) unlocked = Math.max(unlocked, lv + 2);
  renderBtns();
  if (hasNext) show(`Hoàn thành màn ${L.number}!`, `Bạn đã ăn đủ ${L.target} mồi.`, "Màn tiếp");
  else show("Bạn đã phá đảo!", "Hoàn thành màn cuối cùng.", "Chơi lại");
}

function pause() {
  if (state === "playing") {
    clearInterval(timer);
    state = "paused";
    show("Tạm dừng", "Nhấn Space để tiếp tục", "Tiếp tục");
  } else {
    overlay.classList.add("hidden");
    state = "playing";
    timer = setInterval(step, L.speed);
  }
}

function show(title, text, btn) {
  $("overlayTitle").textContent = title;
  $("overlayText").innerHTML = text;
  $("overlayBtn").textContent = btn;
  overlay.classList.remove("hidden");
}

function action() {
  if (state === "paused") return pause();
  if (state === "win" && lv + 1 < LEVELS.length) return loadLevel(lv + 1);
  start();
}

function hud() {
  $("score").textContent = score;
  $("target").textContent = L.target;
  $("best").textContent = best;
}

function renderBtns() {
  btns.forEach((b, i) => b.classList.toggle("locked", i >= unlocked || !LEVELS[i]));
}

btns.forEach((b, i) => b.onclick = () => {
  if (!b.classList.contains("locked") && state !== "playing") loadLevel(i);
});

const KEYS = {
  ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1],
  ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0]
};

document.addEventListener("keydown", e => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (k === " ") {
    e.preventDefault();
    return state === "playing" || state === "paused" ? pause() : action();
  }
  const v = KEYS[k];
  if (!v || state !== "playing") return;
  e.preventDefault();
  if (v[0] !== -dir.x || v[1] !== -dir.y) next = { x: v[0], y: v[1] };
});

$("overlayBtn").onclick = action;
loadLevel(0);