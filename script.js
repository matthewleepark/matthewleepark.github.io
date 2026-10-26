// script.js: builds the artifact cards from CARDS (cards.js) and runs the effects.
// To update an artifact, edit cards.js only. Nothing in this file needs to change.

const root = document.documentElement;
const reduceMotion = false;   // effects always play, even with the system "Reduce motion" setting on (by design)
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
const isLight = () => root.dataset.theme === "light";
const pad = n => String(n).padStart(2, "0");
const STATUS_LABEL = { done: "Done", wip: "WIP", idea: "Idea" };

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

/* ---------- 1. Artifact cards ---------- */
const container = document.getElementById("cards");

CARDS.forEach((card, i) => {
  const el = make("article", "dish " + card.status);
  el.style.setProperty("--i", i);

  const thumb = make("span", "thumb", pad(card.number));
  thumb.setAttribute("aria-hidden", "true");

  const text = make("div", "dish-text");
  const title = make("h3");
  const open = make("button", "dish-open", card.title);
  open.type = "button";
  open.setAttribute("aria-haspopup", "dialog");
  open.addEventListener("click", () => openModal(card));
  title.append(open);

  const meta = make("p", "dish-meta", "— Artifact " + card.number + " ");
  meta.append(make("span", null, STATUS_LABEL[card.status]));

  text.append(title, meta);
  el.append(thumb, text);
  container.append(el);
});

/* ---------- 1b. Card slider: arrows, mouse drag, and edge fades ---------- */
const slideNav = document.querySelector(".slide-nav");
const [prevBtn, nextBtn] = slideNav.querySelectorAll(".slide-btn");

function updateSlider() {
  const max = container.scrollWidth - container.clientWidth;
  const atStart = container.scrollLeft <= 2, atEnd = container.scrollLeft >= max - 2;
  slideNav.hidden = max <= 2;
  prevBtn.disabled = atStart;
  nextBtn.disabled = atEnd;
  container.classList.toggle("more-left", !atStart);
  container.classList.toggle("more-right", !atEnd);
}

function slideBy(dir) {
  const card = container.querySelector(".dish");
  const step = card ? card.offsetWidth + parseFloat(getComputedStyle(container).columnGap) : container.clientWidth;
  container.scrollBy({ left: dir * step });
}
slideNav.querySelectorAll(".slide-btn").forEach(b => b.addEventListener("click", () => slideBy(+b.dataset.dir)));

// Drag with the mouse to slide (touch and trackpads already swipe natively).
let drag = null;
container.addEventListener("pointerdown", e => {
  if (e.pointerType !== "mouse" || e.button !== 0) return;
  drag = { x: e.clientX, left: container.scrollLeft, moved: false };
});
addEventListener("pointermove", e => {
  if (!drag) return;
  const dx = e.clientX - drag.x;
  if (!drag.moved && Math.abs(dx) < 6) return;
  drag.moved = true;
  container.classList.add("dragging");
  container.scrollLeft = drag.left - dx;
});
addEventListener("pointerup", () => {
  if (!drag) return;
  const moved = drag.moved;
  drag = null;
  if (!moved) return;
  // Let the row snap to the nearest card from where the drag let go.
  const left = container.scrollLeft;
  container.classList.remove("dragging");
  container.scrollLeft = left;
  // A drag shouldn't also open the card it started on.
  const swallow = e => { e.stopPropagation(); e.preventDefault(); };
  container.addEventListener("click", swallow, { capture: true, once: true });
  setTimeout(() => { container.removeEventListener("click", swallow, true); updateSlider(); }, 0);
});
container.addEventListener("dragstart", e => e.preventDefault());

container.addEventListener("scroll", updateSlider, { passive: true });
addEventListener("resize", updateSlider);
updateSlider();

/* ---------- 2. Details modal ---------- */
const modal = document.getElementById("modal");
const modalLink = document.getElementById("modal-link");
const modalLinkText = document.getElementById("modal-link-text");
const modalApp = document.getElementById("modal-app");
const modalPending = document.getElementById("modal-pending");
const modalReflection = document.getElementById("modal-reflection");

function openModal(card) {
  document.getElementById("modal-badge").textContent =
    "Artifact " + card.number + " · " + STATUS_LABEL[card.status];
  document.getElementById("modal-title").textContent = card.title;
  document.getElementById("modal-desc").textContent = card.description;

  if (card.reflection) {
    modalReflection.textContent = card.reflection;
    modalReflection.classList.remove("empty");
  } else {
    modalReflection.textContent = "The reflection gets added when this artifact is finished.";
    modalReflection.classList.add("empty");
  }

  modalLink.hidden = !card.link;
  modalPending.hidden = !!card.link;
  if (card.link) modalLink.href = card.link;

  // Cards with a live app show two bubbles: "Open app" and "View repo".
  modalApp.hidden = !card.app;
  if (card.app) modalApp.href = card.app;
  modalLink.classList.toggle("secondary", !!card.app);
  modalLinkText.textContent = card.app ? "View repo" : "View artifact";
  if (card.app) { modalLink.target = "_blank"; modalLink.rel = "noopener"; }
  else { modalLink.removeAttribute("target"); modalLink.removeAttribute("rel"); }

  modal.classList.remove("closing");
  if (typeof modal.showModal === "function") modal.showModal();
  else modal.setAttribute("open", "");
}

function closeModal() {
  if (!modal.open) return;
  const finish = () => {
    modal.classList.remove("closing");
    if (typeof modal.close === "function") modal.close();
    else modal.removeAttribute("open");
  };
  if (reduceMotion) return finish();
  modal.classList.add("closing");
  modal.addEventListener("animationend", finish, { once: true });
}
modal.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });   // click outside
modal.addEventListener("cancel", e => { e.preventDefault(); closeModal(); });     // Escape key

/* ---------- 3. Depth parallax: word, photo, and hangul move at different speeds ---------- */
const hero = document.querySelector(".hero");
if (finePointer && !reduceMotion) {
  addEventListener("pointermove", e => {
    hero.style.setProperty("--px", (e.clientX / innerWidth - 0.5).toFixed(3));
    hero.style.setProperty("--py", (e.clientY / innerHeight - 0.5).toFixed(3));
  }, { passive: true });
}

/* ---------- 4. Rising embers that scatter away from the cursor ---------- */
const canvas = document.getElementById("embers");
const ctx = canvas.getContext("2d");
const pointer = { x: -9999, y: -9999 };
let embers = [];
let W = 0, H = 0;
let running = !reduceMotion;

function newEmber(fromBottom) {
  return {
    x: Math.random() * W,
    y: fromBottom ? H + Math.random() * 40 : Math.random() * H,
    vx: (Math.random() - 0.5) * 0.3,
    vy: -(0.25 + Math.random() * 0.7),
    r: 0.6 + Math.random() * 1.8,
    life: 0.4 + Math.random() * 0.6,
    flicker: Math.random() * Math.PI * 2
  };
}

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  embers = Array.from({ length: Math.min(90, Math.floor(W / 16)) }, () => newEmber(false));
  if (!running) drawEmbers(0);
}

function drawEmbers(t) {
  ctx.clearRect(0, 0, W, H);
  const light = isLight();
  for (const e of embers) {
    if (running) {
      const dx = e.x - pointer.x, dy = e.y - pointer.y;
      const d = Math.hypot(dx, dy);
      if (d < 120 && d > 0.1) {
        const f = (1 - d / 120) * 0.6;
        e.vx += (dx / d) * f;
        e.vy += (dy / d) * f * 0.5;
      }
      e.vx *= 0.96;
      e.vx += Math.sin(t / 900 + e.flicker) * 0.01;      // gentle sway
      e.vy += (-(0.25 + e.r * 0.25) - e.vy) * 0.03;      // keep rising
      e.x += e.vx; e.y += e.vy;
      if (e.y < -20 || e.x < -40 || e.x > W + 40) Object.assign(e, newEmber(true));
    }
    const glow = 0.55 + 0.45 * Math.sin(t / 180 + e.flicker);
    const fade = Math.min(1, e.y / (H * 0.9));            // dim as they rise
    const alpha = e.life * glow * fade * (light ? 0.5 : 0.9);
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, ${110 + (e.r * 40) | 0}, 70, ${alpha})`;
    ctx.shadowColor = "rgba(255, 70, 50, .9)";
    ctx.shadowBlur = light ? 0 : 8;
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

function loop(t) {
  if (!running) return;
  drawEmbers(t);
  requestAnimationFrame(loop);
}

addEventListener("pointermove", e => { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });
document.addEventListener("pointerleave", () => { pointer.x = pointer.y = -9999; });
addEventListener("resize", resizeCanvas);
document.addEventListener("visibilitychange", () => {
  if (reduceMotion) return;
  running = !document.hidden;
  if (running) requestAnimationFrame(loop);
});
resizeCanvas();
if (running) requestAnimationFrame(loop);

/* ---------- 5. Theme toggle (dark is default) with a circular wave ---------- */
const toggle = document.getElementById("theme-toggle");
const themeName = toggle.querySelector(".theme-name");
const renderThemeName = () => { themeName.textContent = isLight() ? "Light" : "Dark"; };

function applyTheme() {
  root.dataset.theme = isLight() ? "dark" : "light";
  try { localStorage.setItem("theme", root.dataset.theme); } catch (e) { /* storage blocked */ }
  renderThemeName();
  if (!running) drawEmbers(0);
}

toggle.addEventListener("click", () => {
  if (!document.startViewTransition || reduceMotion) { applyTheme(); return; }
  const r = toggle.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const transition = document.startViewTransition(applyTheme);
  transition.ready.then(() => {
    root.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 700, easing: "cubic-bezier(.65, 0, .35, 1)", pseudoElement: "::view-transition-new(root)" }
    );
  });
});
renderThemeName();
