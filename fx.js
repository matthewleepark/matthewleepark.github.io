// fx.js: extra effects layered on top of script.js.
// It reads CARDS from cards.js, so you never need to edit this file.
// Remove its <script> tag in index.html to go back to the plain site.
(() => {
  const root = document.documentElement;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const prefersDark = matchMedia("(prefers-color-scheme: dark)");

  /* ---------- 1. Starfield with shooting stars ---------- */
  const canvas = document.createElement("canvas");
  canvas.id = "starfield";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);
  const ctx = canvas.getContext("2d");

  let w = 0, h = 0, stars = [], shooting = null;
  let mouseX = 0, mouseY = 0, starColor = "#888", starAlpha = 1;

  function readTheme() {
    const dark = root.dataset.theme === "dark" ||
      (!root.dataset.theme && prefersDark.matches);
    starColor = getComputedStyle(root).getPropertyValue(dark ? "--fg" : "--accent").trim();
    starAlpha = dark ? 1 : 0.45;
    if (reduceMotion) draw(0);
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    w = innerWidth; h = innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: Math.round((w * h) / 8000) }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.2 + 0.3,
      depth: Math.random() * 0.8 + 0.2,   // closer stars move more
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 1.5 + 0.5
    }));
    if (reduceMotion) draw(0);
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = starColor;
    const px = (mouseX - w / 2) * 0.02, py = (mouseY - h / 2) * 0.02;

    for (const s of stars) {
      if (!reduceMotion) {
        s.y -= s.depth * 0.08;            // slow upward drift, like flying
        if (s.y < -2) { s.y = h + 2; s.x = Math.random() * w; }
      }
      const twinkle = reduceMotion ? 0.7 : 0.45 + 0.45 * Math.sin(s.phase + (t / 1000) * s.speed);
      ctx.globalAlpha = twinkle * starAlpha;
      ctx.beginPath();
      ctx.arc(s.x + px * s.depth, s.y + py * s.depth, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (reduceMotion) return;

    // a shooting star every few seconds
    if (!shooting && Math.random() < 0.004) {
      shooting = { x: Math.random() * w * 0.7, y: Math.random() * h * 0.35, vx: 10, vy: 4, life: 1 };
    }
    if (shooting) {
      const s = shooting;
      ctx.globalAlpha = s.life * starAlpha;
      ctx.strokeStyle = starColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx * 7, s.y - s.vy * 7);
      ctx.stroke();
      s.x += s.vx; s.y += s.vy; s.life -= 0.018;
      if (s.life <= 0) shooting = null;
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }

  addEventListener("resize", resize);
  if (canHover) addEventListener("mousemove", e => { mouseX = e.clientX; mouseY = e.clientY; });
  prefersDark.addEventListener("change", readTheme);
  mouseX = innerWidth / 2; mouseY = innerHeight / 2;
  resize();
  readTheme();
  if (!reduceMotion) requestAnimationFrame(draw);

  /* ---------- 2. Mission progress bar (counts "done" cards) ---------- */
  const grid = document.getElementById("cards");
  if (grid && typeof CARDS !== "undefined") {
    const total = CARDS.length;
    const done = CARDS.filter(c => c.status === "done").length;
    const pct = total ? (done / total) * 100 : 0;

    const mission = document.createElement("div");
    mission.className = "mission";
    mission.innerHTML = `
      <div class="mission-label">
        <span>Quarter progress</span>
        <span><strong>${done} of ${total}</strong> artifacts launched</span>
      </div>
      <div class="mission-track" role="progressbar" aria-label="Artifacts finished"
           aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}">
        <div class="mission-fill"></div>
        ${CARDS.map((c, i) => `<span class="mission-stop${i < done ? " reached" : ""}"
            style="left:${((i + 1) / total) * 100}%"></span>`).join("")}
        <span class="mission-rocket" aria-hidden="true">🚀</span>
      </div>`;
    grid.before(mission);
    setTimeout(() => mission.style.setProperty("--progress", pct + "%"), 300);
  }

  /* ---------- 3. Cards rise in as they scroll into view ---------- */
  const cards = document.querySelectorAll(".card");
  if (!reduceMotion && "IntersectionObserver" in window) {
    cards.forEach((card, i) => {
      card.classList.add("fx-hidden");
      card.style.transitionDelay = 350 + (i % 3) * 110 + "ms";
    });
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const card = e.target;
        card.classList.remove("fx-hidden");
        card.addEventListener("transitionend", () => (card.style.transitionDelay = ""), { once: true });
        io.unobserve(card);
      });
    }, { threshold: 0.15 });
    cards.forEach(c => io.observe(c));
  }

  /* ---------- 4. Tilt + spotlight on hover ---------- */
  if (canHover && !reduceMotion) {
    cards.forEach(card => {
      card.addEventListener("mouseenter", () => card.classList.add("fx-tilting"));
      card.addEventListener("mousemove", e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        card.style.setProperty("--mx", x * 100 + "%");
        card.style.setProperty("--my", y * 100 + "%");
        card.style.setProperty("--ry", (x - 0.5) * 8 + "deg");
        card.style.setProperty("--rx", (0.5 - y) * 8 + "deg");
      });
      card.addEventListener("mouseleave", () => {
        card.classList.remove("fx-tilting");
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
      });
    });
  }

  /* ---------- 5. Theme toggle spins and recolors the stars ---------- */
  const toggle = document.getElementById("theme-toggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      readTheme();
      toggle.classList.remove("fx-spin");
      void toggle.offsetWidth;            // restart the animation
      toggle.classList.add("fx-spin");
    });
  }
})();
