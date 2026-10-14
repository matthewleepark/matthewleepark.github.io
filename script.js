// script.js: builds the pocha menu from CARDS (in cards.js) and runs the interactions.
// To update an artifact, edit cards.js only. Nothing here needs to change.

const root = document.documentElement;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const canHover = matchMedia("(hover: hover) and (pointer: fine)").matches;

/* ---------- Small helpers ---------- */
function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}
function safeGet(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function safeSet(key, value) {
  try { localStorage.setItem(key, value); } catch (e) { /* storage blocked */ }
}
function price(number) {
  return "₩" + (number * 10000).toLocaleString("en-US");
}
function dishName(card) {
  // Show "Schedule Viewer" instead of "Idea: Schedule Viewer" (cards.js stays the same)
  return card.title.replace(/^Idea:\s*/i, "");
}

const STATUS = {
  done: { label: "Special Dish", pill: "완료 · Served" },
  idea: { label: "Upcoming Dish", pill: "준비중 · Coming soon" }
};
function statusOf(card) {
  return STATUS[card.status] || STATUS.idea;
}

/* ---------- Sound (off until the visitor turns it on) ---------- */
let soundOn = safeGet("pocha-sound") === "on";
let audioCtx = null;
let lastSizzle = 0;

function audio() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function sizzle() {
  if (!soundOn) return;
  const now = performance.now();
  if (now - lastSizzle < 350) return;
  lastSizzle = now;
  const ac = audio();
  if (!ac) return;

  const length = Math.floor(ac.sampleRate * 0.45);
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1) * (Math.random() < 0.12 ? 1 : 0.3); // crackly noise
  }
  const source = ac.createBufferSource();
  source.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 2500;
  const gain = ac.createGain();
  const t = ac.currentTime;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.07, t + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
  source.connect(filter).connect(gain).connect(ac.destination);
  source.start(t);
}

function ding() {
  if (!soundOn) return;
  const ac = audio();
  if (!ac) return;
  [[988, 0], [740, 0.22]].forEach(([freq, start]) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const t = ac.currentTime + start;
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.85);
  });
}

const soundButton = document.getElementById("sound-toggle");
function renderSound() {
  soundButton.setAttribute("aria-pressed", String(soundOn));
  soundButton.textContent = soundOn ? "🔊 Sizzle sounds on" : "🔈 Sizzle sounds off";
}
soundButton.addEventListener("click", () => {
  soundOn = !soundOn;
  safeSet("pocha-sound", soundOn ? "on" : "off");
  renderSound();
  if (soundOn) ding();
});
renderSound();

/* ---------- Build the dish cards ---------- */
const container = document.getElementById("cards");

CARDS.forEach((card, i) => {
  const info = statusOf(card);

  const el = make("article", "dish " + card.status);
  el.dataset.status = card.status;
  el.style.setProperty("--i", i);

  // steam (shows on hover)
  const steam = make("span", "steam");
  steam.setAttribute("aria-hidden", "true");
  steam.append(make("span"), make("span"), make("span"));

  // label + price tag
  const top = make("div", "dish-top");
  const labelWrap = make("div");
  labelWrap.append(make("span", "dish-label", info.label + " #" + card.number));
  if (card.status === "done") labelWrap.append(make("span", "chef-pick", "셰프 추천 Chef’s pick"));
  const tag = make("span", "price-tag");
  tag.append(make("span", "price", price(card.number)), make("span", "price-sub", "Artifact " + card.number));
  top.append(labelWrap, tag);

  // dish name (the button makes the whole card clickable)
  const name = make("h3", "dish-name");
  const open = make("button", "dish-open", dishName(card));
  open.type = "button";
  open.setAttribute("aria-haspopup", "dialog");
  name.append(open);

  const desc = make("p", "dish-desc", card.description);

  const foot = make("div", "dish-foot");
  foot.append(make("span", "status-pill " + card.status, info.pill));
  const cta = make("span", "dish-cta", "View order →");
  cta.setAttribute("aria-hidden", "true");
  foot.append(cta);

  el.append(steam, top, name, desc, foot);
  open.addEventListener("click", () => openOrder(card));

  // hover: sizzle sound + tilt toward the mouse
  if (canHover) {
    el.addEventListener("mouseenter", () => {
      sizzle();
      if (!reduceMotion) el.classList.add("tilting");
    });
    if (!reduceMotion) {
      el.addEventListener("mousemove", e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty("--ry", x * 8 + "deg");
        el.style.setProperty("--rx", -y * 8 + "deg");
      });
    }
    el.addEventListener("mouseleave", () => {
      el.classList.remove("tilting");
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    });
  }

  container.append(el);
});

/* ---------- Category filters ---------- */
const filterButtons = document.querySelectorAll(".filter");
const menuStatus = document.getElementById("menu-status");

filterButtons.forEach(button => {
  const filter = button.dataset.filter;
  const count = filter === "all" ? CARDS.length : CARDS.filter(c => c.status === filter).length;
  button.querySelector(".count").textContent = count;

  button.addEventListener("click", () => {
    filterButtons.forEach(b => b.setAttribute("aria-pressed", String(b === button)));
    let shown = 0;
    container.querySelectorAll(".dish").forEach((dish, i) => {
      const visible = filter === "all" || dish.dataset.status === filter;
      dish.hidden = !visible;
      if (visible) dish.style.setProperty("--i", shown++);
    });
    menuStatus.textContent = "Showing " + shown + (shown === 1 ? " dish" : " dishes");
  });
});

/* ---------- Order ticket (modal) ---------- */
const order = document.getElementById("order");
const orderLink = document.getElementById("order-link");
const orderNoLink = document.getElementById("order-nolink");
const orderReview = document.getElementById("order-review");

function openOrder(card) {
  const info = statusOf(card);
  order.dataset.status = card.status;
  document.getElementById("order-label").textContent = info.label + " #" + card.number;
  document.getElementById("order-title").textContent = dishName(card);
  document.getElementById("order-price").textContent = price(card.number);
  document.getElementById("order-artifact").textContent = "Artifact " + card.number;
  const pill = document.getElementById("order-status");
  pill.className = "status-pill " + card.status;
  pill.textContent = info.pill;
  document.getElementById("order-desc").textContent = card.description;

  if (card.reflection) {
    orderReview.textContent = card.reflection;
    orderReview.classList.remove("empty");
  } else {
    orderReview.textContent = "The chef is still cooking this one. A review comes out when the dish is served.";
    orderReview.classList.add("empty");
  }

  if (card.link) {
    orderLink.href = card.link;
    orderLink.hidden = false;
    orderNoLink.hidden = true;
  } else {
    orderLink.hidden = true;
    orderNoLink.hidden = false;
  }

  if (typeof order.showModal === "function") order.showModal();
  else order.setAttribute("open", "");
  ding();
}

function closeOrder() {
  if (typeof order.close === "function") order.close();
  else order.removeAttribute("open");
}
order.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeOrder));
// clicking the dark area outside the ticket closes it
order.addEventListener("click", e => { if (e.target === order) closeOrder(); });

/* ---------- Theme toggle (remembers choice; dark pocha is the default) ---------- */
document.getElementById("theme-toggle").addEventListener("click", () => {
  root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
  safeSet("theme", root.dataset.theme);
});
