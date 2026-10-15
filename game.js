// game.js: "Slice Dimension", a Fruit Ninja–style game you reach through the 일섬 easter egg.
// The letters of your name fly up and you slice them. world.js opens it; it can also run alone
// with window.SliceGame.play(). Remove its <script> tag in index.html to turn the game off.
(() => {
  const STYLE = `
  .sg { position: fixed; inset: 0; z-index: 90; overflow: hidden; background: #040712;
        font-family: "Manrope", system-ui, sans-serif; color: #eef3fb; touch-action: none;
        user-select: none; -webkit-user-select: none; cursor: crosshair; }
  .sg canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
  .sg-hud { position: absolute; left: 0; right: 0; top: 0; z-index: 2; display: flex; justify-content: space-between;
            align-items: flex-start; gap: 1rem; padding: clamp(.8rem, 2.5vw, 1.4rem) clamp(.9rem, 3vw, 1.8rem); pointer-events: none; }
  .sg-score-num { display: block; font: 400 clamp(2.4rem, 7vw, 3.6rem)/1 "Gloock", Georgia, serif; text-shadow: 0 0 24px rgba(140,190,255,.5); }
  .sg-best { font-size: .75rem; letter-spacing: .2em; text-transform: uppercase; color: #9fb0cc; }
  .sg-right { display: flex; align-items: center; gap: .6rem; pointer-events: auto; flex-wrap: wrap; justify-content: flex-end; }
  .sg-lives { display: flex; gap: .35rem; margin-right: .4rem; }
  .sg-lives i { font-style: normal; font: 700 1.5rem/1 system-ui, sans-serif; color: rgba(238,243,251,.35); transition: color .3s, transform .3s; }
  .sg-lives i.lost { color: #ff4b4b; transform: scale(1.25); text-shadow: 0 0 12px rgba(255,75,75,.8); }
  .sg-btn { padding: .5rem 1rem; border: 1px solid rgba(200,220,255,.3); border-radius: 999px; background: rgba(255,255,255,.07);
            color: #eef3fb; font: 700 .78rem "Manrope", system-ui, sans-serif; letter-spacing: .08em; text-transform: uppercase;
            cursor: pointer; transition: background-color .25s, border-color .25s, transform .2s; }
  .sg-btn:hover { background: rgba(255,255,255,.15); border-color: #eef3fb; transform: translateY(-2px); }
  .sg-btn:focus-visible { outline: 2px solid #6fb1ff; outline-offset: 3px; }
  .sg-primary { padding: .8rem 2rem; font-size: .9rem; border: 0; background: #c8202f; box-shadow: 0 0 30px -6px rgba(255,66,80,.8); }
  .sg-primary:hover { background: #e0313f; }
  .sg-screen { position: absolute; inset: 0; z-index: 3; display: grid; place-content: center; justify-items: center; gap: .8rem;
               text-align: center; padding: 1.5rem; pointer-events: none; }
  .sg-screen[hidden] { display: none; }
  .sg-screen > * { pointer-events: auto; }
  .sg-kicker { margin: 0; color: #ff5a5a; font-weight: 700; font-size: .8rem; letter-spacing: .3em; text-transform: uppercase; }
  .sg-screen h2 { margin: 0; font: 400 clamp(2.6rem, 9vw, 5.5rem)/1 "Gloock", Georgia, serif; letter-spacing: .04em;
                  text-shadow: 0 0 40px rgba(120,180,255,.45); }
  .sg-rules { margin: .2rem 0 .8rem; max-width: 34rem; color: #c3cfe3; line-height: 1.6; font-size: .98rem; }
  .sg-rules b { color: #ff5a5a; }
  .sg-hint { margin: 0; color: #8fa2c2; font-size: .75rem; letter-spacing: .2em; text-transform: uppercase; pointer-events: none; }
  .sg-final { margin: 0; font: 400 clamp(1.6rem, 5vw, 2.4rem) "Gloock", Georgia, serif; }
  .sg-final-best { margin: 0 0 .6rem; color: #ffd36b; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; font-size: .8rem; min-height: 1em; }
  .sg-actions { display: flex; gap: .7rem; flex-wrap: wrap; justify-content: center; }
  .sg-over h2.err { color: #ff4b4b; text-shadow: 0 0 40px rgba(255,60,60,.6); }
  `;

  const LETTERS = "PPAARRKKMATTHEWPARK매튜박";
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[(Math.random() * arr.length) | 0];
  const isHangul = ch => /[\uAC00-\uD7A3]/.test(ch);

  window.SliceGame = {
    play() { return new Promise(resolve => new Game(resolve)); }
  };

  function injectStyle() {
    if (document.getElementById("slice-game-style")) return;
    const s = document.createElement("style");
    s.id = "slice-game-style";
    s.textContent = STYLE;
    document.head.append(s);
  }

  class Game {
    constructor(done) {
      injectStyle();
      this.done = done;
      this.best = 0;
      try { this.best = +localStorage.getItem("slice-best") || 0; } catch (e) {}
      this.soundOn = true;
      try { this.soundOn = localStorage.getItem("slice-sound") !== "off"; } catch (e) {}

      this.root = document.createElement("div");
      this.root.className = "sg";
      this.root.setAttribute("role", "dialog");
      this.root.setAttribute("aria-modal", "true");
      this.root.setAttribute("aria-label", "Slice Dimension game");
      this.root.innerHTML = `
        <canvas></canvas>
        <div class="sg-hud">
          <div><span class="sg-score-num" aria-live="polite">0</span><span class="sg-best">Best ${this.best}</span></div>
          <div class="sg-right">
            <div class="sg-lives" aria-label="Lives"><i>✕</i><i>✕</i><i>✕</i></div>
            <button type="button" class="sg-btn sg-mute"></button>
            <button type="button" class="sg-btn sg-exit">Return ↩</button>
          </div>
        </div>
        <div class="sg-screen sg-start">
          <p class="sg-kicker"><span lang="ko">일섬 도장</span> · You've entered</p>
          <h2>SLICE DIMENSION</h2>
          <p class="sg-rules">Swipe through the letters to slice them. <span style="color:#ffd36b">Golden letters</span> slow time,
            artifact cards are worth 10, and slicing P-A-R-K in a row is a big bonus.
            Don't cut the <b>ERR</b>. Miss 3 letters and you're out.</p>
          <button type="button" class="sg-btn sg-primary sg-play">Start</button>
          <p class="sg-hint">or slice the letter</p>
        </div>
        <div class="sg-screen sg-over" hidden>
          <h2 class="sg-over-title">Game over</h2>
          <p class="sg-final"></p>
          <p class="sg-final-best"></p>
          <div class="sg-actions">
            <button type="button" class="sg-btn sg-primary sg-again">Play again</button>
            <button type="button" class="sg-btn sg-return">Return to Earth ↩</button>
          </div>
        </div>`;
      document.body.append(this.root);

      this.canvas = this.root.querySelector("canvas");
      this.ctx = this.canvas.getContext("2d");
      this.$ = sel => this.root.querySelector(sel);
      this.scoreEl = this.$(".sg-score-num");
      this.bestEl = this.$(".sg-best");
      this.lifeEls = [...this.root.querySelectorAll(".sg-lives i")];
      this.renderMute();

      this.objects = []; this.halves = []; this.sparks = []; this.popups = []; this.trail = [];
      this.stars = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random(), z: rand(.2, 1) }));
      this.state = "start";
      this.time = 0; this.slow = 0; this.shake = 0; this.flash = 0; this.flashColor = "255,255,255";

      this.onResize = () => this.resize();
      this.onKey = e => { if (e.key === "Escape") { e.preventDefault(); this.exit(); } };
      this.onVis = () => { this.last = performance.now(); };
      addEventListener("resize", this.onResize);
      addEventListener("keydown", this.onKey);
      document.addEventListener("visibilitychange", this.onVis);
      this.resize();
      this.bindPointer();

      this.$(".sg-play").addEventListener("click", () => this.start());
      this.$(".sg-again").addEventListener("click", () => this.start());
      this.$(".sg-return").addEventListener("click", () => this.exit());
      this.$(".sg-exit").addEventListener("click", () => this.exit());
      this.$(".sg-mute").addEventListener("click", () => {
        this.soundOn = !this.soundOn;
        try { localStorage.setItem("slice-sound", this.soundOn ? "on" : "off"); } catch (e) {}
        this.renderMute();
      });

      this.spawnStartLetter();
      this.root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500 });
      this.$(".sg-play").focus({ preventScroll: true });
      this.last = performance.now();
      this.raf = requestAnimationFrame(t => this.loop(t));
    }

    renderMute() { this.$(".sg-mute").textContent = this.soundOn ? "Sound on" : "Sound off"; }

    resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      this.W = innerWidth; this.H = innerHeight;
      this.canvas.width = this.W * dpr; this.canvas.height = this.H * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.g = this.H * 1.55;                                   // gravity, px/s²
      this.size = Math.max(54, Math.min(120, Math.min(this.W, this.H) * 0.13));
    }

    /* ---------- starting / ending ---------- */
    spawnStartLetter() {
      this.objects = [{
        type: "start", ch: "P", x: this.W / 2, y: this.H * 0.74, vx: 0, vy: 0,
        rot: 0, vr: 0.4, size: this.size * 1.25, floatT: 0
      }];
    }

    start() {
      this.audio();
      this.$(".sg-start").hidden = true;
      this.$(".sg-over").hidden = true;
      this.objects = []; this.halves = []; this.popups = [];
      this.score = 0; this.lives = 3; this.waves = 0; this.nextWave = 0.6;
      this.combo = 0; this.comboTimer = 0; this.recent = "";
      this.lifeEls.forEach(i => i.classList.remove("lost"));
      this.scoreEl.textContent = "0";
      this.state = "play";
      this.canvas.focus?.();
    }

    gameOver(reason) {
      if (this.state !== "play") return;
      this.state = "over";
      this.slow = 1.2;
      const isErr = reason === "err";
      if (isErr) { this.flash = 1; this.flashColor = "255,60,60"; this.shake = 26; this.sfx("boom", 1.2); }
      else this.sfx("boom", .7);
      const newBest = this.score > this.best;
      if (newBest) {
        this.best = this.score;
        try { localStorage.setItem("slice-best", String(this.best)); } catch (e) {}
      }
      setTimeout(() => {
        if (!this.root.isConnected) return;
        const title = this.$(".sg-over-title");
        title.textContent = isErr ? "SYSTEM ERROR" : "Game over";
        title.classList.toggle("err", isErr);
        this.$(".sg-final").textContent = "Score " + this.score;
        this.$(".sg-final-best").textContent = newBest && this.score > 0 ? "★ New best!" : "Best " + this.best;
        this.bestEl.textContent = "Best " + this.best;
        this.$(".sg-over").hidden = false;
        this.$(".sg-again").focus({ preventScroll: true });
      }, 900);
    }

    exit() {
      if (this.exiting) return;
      this.exiting = true;
      this.root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 350, fill: "forwards" }).finished.then(() => {
        cancelAnimationFrame(this.raf);
        removeEventListener("resize", this.onResize);
        removeEventListener("keydown", this.onKey);
        document.removeEventListener("visibilitychange", this.onVis);
        this.root.remove();
        if (this.ac) this.ac.close().catch(() => {});
        this.done();
      });
    }

    /* ---------- spawning ---------- */
    spawnWave() {
      this.waves++;
      const level = Math.min(1, this.score / 120);
      const count = 1 + Math.floor(Math.random() * (1.6 + level * 3.5));
      for (let i = 0; i < count; i++) {
        let type = "letter";
        const r = Math.random();
        if (this.waves > 2 && r < 0.11 + level * 0.1) type = "err";
        else if (r > 0.95) type = "gold";
        else if (r > 0.91) type = "card";
        setTimeout(() => this.state === "play" && this.spawn(type), i * rand(60, 180));
      }
      this.nextWave = rand(1.0, 1.6) - level * 0.45;
    }

    spawn(type) {
      const x = this.W * rand(0.15, 0.85);
      const peak = this.H * rand(0.42, 0.82);                    // how high it flies
      const vy = -Math.sqrt(2 * this.g * peak);
      const flight = (-vy / this.g) * 2;
      const vx = (this.W * rand(0.3, 0.7) - x) / flight;
      const base = { type, x, y: this.H + this.size, vx, vy, rot: rand(-0.4, 0.4), vr: rand(-2.5, 2.5) };
      if (type === "err") this.objects.push({ ...base, size: this.size * 0.9, ch: "ERR" });
      else if (type === "card") this.objects.push({ ...base, size: this.size, ch: "0" + (1 + ((Math.random() * 5) | 0)) });
      else this.objects.push({ ...base, size: this.size * (type === "gold" ? 1.05 : rand(0.9, 1.1)), ch: pick(LETTERS) });
    }

    /* ---------- input ---------- */
    bindPointer() {
      let last = null;
      const move = e => {
        if (e.target.closest && e.target.closest("button")) { last = null; return; }
        const now = performance.now();
        const p = { x: e.clientX, y: e.clientY, t: now };
        if (last) {
          const dt = Math.max(1, now - last.t);
          const speed = Math.hypot(p.x - last.x, p.y - last.y) / dt;
          const fast = speed > 0.45 || e.buttons || e.pointerType === "touch";
          if (fast && now - last.t < 120) {
            this.trail.push({ x: p.x, y: p.y, t: now });
            this.cut(last, p);
          }
        }
        last = p;
      };
      this.root.addEventListener("pointermove", move);
      this.root.addEventListener("pointerdown", e => { last = { x: e.clientX, y: e.clientY, t: performance.now() }; this.audio(); });
      this.root.addEventListener("pointerup", () => { last = null; });
    }

    cut(a, b) {
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      for (const o of [...this.objects]) {
        if (o.dead) continue;
        const r = o.size * (o.type === "card" ? 0.55 : 0.45);
        if (segDist(o.x, o.y, a.x, a.y, b.x, b.y) < r) this.slice(o, angle);
      }
    }

    slice(o, angle) {
      o.dead = true;
      this.objects = this.objects.filter(x => x !== o);
      const nx = -Math.sin(angle), ny = Math.cos(angle);
      for (const side of [-1, 1]) {
        this.halves.push({
          ch: o.ch, type: o.type, size: o.size, x: o.x, y: o.y,
          vx: o.vx * 0.5 + nx * side * rand(140, 220), vy: Math.min(o.vy, 0) * 0.3 + ny * side * rand(140, 220) - 120,
          rot: o.rot, vr: o.vr + side * rand(2, 5), cut: angle - o.rot, side, life: 1
        });
      }
      const color = o.type === "err" ? "255,80,80" : o.type === "gold" ? "255,211,107" : o.type === "card" ? "150,200,255" : "200,225,255";
      this.burst(o.x, o.y, color, o.type === "letter" ? 14 : 26);
      this.shake = Math.max(this.shake, o.type === "err" ? 0 : 5);

      if (o.type === "start") { this.sfx("shing", 1); this.start(); return; }
      if (o.type === "err") { this.gameOver("err"); return; }
      if (this.state !== "play") return;

      let pts = 1, label = "+1";
      if (o.type === "gold") { pts = 5; label = "+5 · SLOW TIME"; this.slow = 2.2; this.sfx("chime", 1); }
      if (o.type === "card") { pts = 10; label = "Artifact " + o.ch + "! +10"; this.sfx("chime", .8); }
      this.addScore(pts, o.x, o.y, label, o.type === "letter" ? "#eef3fb" : o.type === "gold" ? "#ffd36b" : "#9cc8ff");
      this.sfx("shing", 0.7);

      // P-A-R-K in a row
      if (/[A-Z]/.test(o.ch)) {
        this.recent = (this.recent + o.ch).slice(-4);
        if (this.recent === "PARK") {
          this.recent = "";
          this.addScore(20, this.W / 2, this.H * 0.4, "P·A·R·K! +20", "#ff5a5a", 1.8);
          this.flash = 0.5; this.flashColor = "255,90,90"; this.sfx("chime", 1.2);
        }
      }
      this.combo++;
      this.comboTimer = 0.3;
    }

    addScore(n, x, y, text, color, scale = 1) {
      this.score += n;
      this.scoreEl.textContent = this.score;
      this.popups.push({ x, y, text, color, life: 1, scale });
    }

    loseLife(x) {
      if (this.state !== "play") return;
      this.lives--;
      const el = this.lifeEls[2 - this.lives];
      if (el) el.classList.add("lost");
      this.popups.push({ x: Math.min(this.W - 30, Math.max(30, x)), y: this.H - 40, text: "✕", color: "#ff4b4b", life: 1, scale: 1.6 });
      this.sfx("miss", 1);
      if (this.lives <= 0) this.gameOver("miss");
    }

    burst(x, y, color, n) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = rand(80, 420);
        this.sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, life: 1, r: rand(1.2, 3.2), color });
      }
    }

    /* ---------- main loop ---------- */
    loop(now) {
      const raw = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      if (this.slow > 0) this.slow -= raw;
      const dt = raw * (this.slow > 0 ? 0.35 : 1);
      this.time += raw;
      this.update(dt, raw);
      this.draw(now);
      this.raf = requestAnimationFrame(t => this.loop(t));
    }

    update(dt, raw) {
      const g = this.g;
      if (this.state === "play") {
        this.nextWave -= dt;
        if (this.nextWave <= 0) this.spawnWave();
      }
      for (const o of this.objects) {
        if (o.type === "start") { o.floatT += raw; o.y = this.H * 0.74 + Math.sin(o.floatT * 2) * 10; o.rot = Math.sin(o.floatT) * 0.15; continue; }
        o.vy += g * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.rot += o.vr * dt;
      }
      this.objects = this.objects.filter(o => {
        if (o.type !== "start" && o.vy > 0 && o.y > this.H + o.size) {
          if (o.type !== "err") this.loseLife(o.x);
          return false;
        }
        return true;
      });
      for (const h of this.halves) { h.vy += g * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.rot += h.vr * dt; h.life -= dt * 0.7; }
      this.halves = this.halves.filter(h => h.life > 0 && h.y < this.H + 200);
      for (const s of this.sparks) { s.vy += g * 0.5 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= 0.98; s.life -= dt * 1.6; }
      this.sparks = this.sparks.filter(s => s.life > 0);
      for (const p of this.popups) { p.y -= 60 * raw; p.life -= raw * 0.9; }
      this.popups = this.popups.filter(p => p.life > 0);
      const t = performance.now();
      this.trail = this.trail.filter(p => t - p.t < 180);
      if (this.comboTimer > 0) {
        this.comboTimer -= raw;
        if (this.comboTimer <= 0) {
          if (this.combo >= 3 && this.state === "play") {
            this.addScore(this.combo, this.W / 2, this.H * 0.3, "COMBO ×" + this.combo + "  +" + this.combo, "#ffd36b", 1.4 + this.combo * 0.05);
            this.sfx("chime", 1);
          }
          this.combo = 0;
        }
      }
      this.shake *= 0.86;
      this.flash = Math.max(0, this.flash - raw * 2.2);
    }

    draw(now) {
      const { ctx, W, H } = this;
      ctx.save();
      // background: deep space with slow-rising stars
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#03050d"); bg.addColorStop(0.6, "#0a1430"); bg.addColorStop(1, "#13224a");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      const neb = ctx.createRadialGradient(W * 0.5, H * 1.05, 0, W * 0.5, H * 1.05, Math.max(W, H) * 0.8);
      neb.addColorStop(0, "rgba(90,140,255,.28)"); neb.addColorStop(1, "rgba(90,140,255,0)");
      ctx.fillStyle = neb; ctx.fillRect(0, 0, W, H);
      for (const s of this.stars) {
        s.y -= 0.0004 * s.z * (this.slow > 0 ? 0.35 : 1);
        if (s.y < 0) { s.y = 1; s.x = Math.random(); }
        ctx.fillStyle = `rgba(220,232,255,${0.25 + s.z * 0.6})`;
        ctx.fillRect(s.x * W, s.y * H, s.z * 1.8, s.z * 1.8);
      }
      if (this.slow > 0) { ctx.fillStyle = "rgba(255,211,107,.06)"; ctx.fillRect(0, 0, W, H); }

      if (this.shake > 0.3) ctx.translate(rand(-1, 1) * this.shake, rand(-1, 1) * this.shake);

      for (const o of this.objects) this.drawThing(o, now);
      for (const h of this.halves) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, h.life * 1.4));
        ctx.translate(h.x, h.y); ctx.rotate(h.rot);
        ctx.save(); ctx.rotate(h.cut);
        ctx.beginPath();
        ctx.rect(-h.size * 2, h.side < 0 ? -h.size * 2 : 0, h.size * 4, h.size * 2);
        ctx.restore();
        ctx.clip();
        this.drawShape(h, now);
        ctx.restore();
      }

      ctx.globalCompositeOperation = "lighter";
      for (const s of this.sparks) {
        ctx.fillStyle = `rgba(${s.color},${s.life})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r * s.life + 0.4, 0, Math.PI * 2); ctx.fill();
      }
      // blade trail
      const tr = this.trail;
      for (let i = 1; i < tr.length; i++) {
        const life = 1 - (now - tr[i].t) / 180;
        if (life <= 0) continue;
        const w = (i / tr.length) * 7 * life + 1;
        ctx.strokeStyle = `rgba(120,180,255,${0.45 * life})`; ctx.lineWidth = w * 3; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(tr[i - 1].x, tr[i - 1].y); ctx.lineTo(tr[i].x, tr[i].y); ctx.stroke();
        ctx.strokeStyle = `rgba(255,255,255,${0.95 * life})`; ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(tr[i - 1].x, tr[i - 1].y); ctx.lineTo(tr[i].x, tr[i].y); ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";

      for (const p of this.popups) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.font = `700 ${Math.round(18 * p.scale)}px Manrope, system-ui, sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.shadowColor = p.color; ctx.shadowBlur = 14;
        ctx.fillText(p.text, p.x, p.y);
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;
      ctx.restore();
      if (this.flash > 0) { ctx.fillStyle = `rgba(${this.flashColor},${this.flash * 0.5})`; ctx.fillRect(0, 0, W, H); }
    }

    drawThing(o, now) {
      const { ctx } = this;
      ctx.save();
      ctx.translate(o.x, o.y); ctx.rotate(o.rot);
      this.drawShape(o, now);
      ctx.restore();
      if (o.type === "start") {
        const pulse = 1 + Math.sin(now / 300) * 0.05;
        ctx.strokeStyle = "rgba(255,90,90,.6)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(o.x, o.y, o.size * 0.75 * pulse, 0, Math.PI * 2); ctx.stroke();
      }
    }

    drawShape(o, now) {
      const { ctx } = this;
      const s = o.size;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      if (o.type === "err") {
        const pulse = 0.85 + Math.sin(now / 120) * 0.15;
        const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.55);
        grd.addColorStop(0, "#ff7a7a"); grd.addColorStop(0.6, "#c4121f"); grd.addColorStop(1, "#5a0309");
        ctx.shadowColor = "rgba(255,40,40,.9)"; ctx.shadowBlur = 30 * pulse;
        ctx.fillStyle = grd;
        ctx.beginPath();
        for (let i = 0; i < 16; i++) {                   // spiky orb
          const a = (i / 16) * Math.PI * 2, r = s * (i % 2 ? 0.42 : 0.52);
          i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff";
        ctx.font = `800 ${Math.round(s * 0.24)}px Manrope, system-ui, sans-serif`;
        ctx.fillText("ERR", 0, 1);
        return;
      }
      if (o.type === "card") {
        const w = s * 0.9, h = s * 1.15;
        ctx.shadowColor = "rgba(120,180,255,.7)"; ctx.shadowBlur = 24;
        ctx.fillStyle = "rgba(30,50,90,.85)";
        roundRect(ctx, -w / 2, -h / 2, w, h, 12); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(160,200,255,.8)"; ctx.lineWidth = 1.5;
        roundRect(ctx, -w / 2, -h / 2, w, h, 12); ctx.stroke();
        ctx.fillStyle = "#c8202f";
        ctx.beginPath(); ctx.arc(0, -h * 0.12, s * 0.22, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = `${Math.round(s * 0.24)}px Gloock, Georgia, serif`;
        ctx.fillText(o.ch, 0, -h * 0.12);
        ctx.fillStyle = "rgba(220,232,255,.8)";
        ctx.font = `700 ${Math.round(s * 0.1)}px Manrope, system-ui, sans-serif`;
        ctx.fillText("ARTIFACT", 0, h * 0.28);
        return;
      }
      const gold = o.type === "gold";
      const fam = isHangul(o.ch) ? `900 ${Math.round(s * 0.85)}px "Noto Serif KR", serif` : `${Math.round(s)}px Gloock, Georgia, serif`;
      ctx.font = fam;
      const grd = ctx.createLinearGradient(0, -s / 2, 0, s / 2);
      if (gold) { grd.addColorStop(0, "#fff3c4"); grd.addColorStop(0.5, "#ffd36b"); grd.addColorStop(1, "#c98a1a"); }
      else if (isHangul(o.ch)) { grd.addColorStop(0, "#ff7676"); grd.addColorStop(1, "#c8202f"); }
      else { grd.addColorStop(0, "#ffffff"); grd.addColorStop(1, "#bcd0ee"); }
      ctx.shadowColor = gold ? "rgba(255,200,80,.9)" : isHangul(o.ch) ? "rgba(255,60,60,.7)" : "rgba(140,190,255,.7)";
      ctx.shadowBlur = gold ? 34 : 20;
      ctx.fillStyle = grd;
      ctx.fillText(o.ch, 0, s * 0.04);
      ctx.shadowBlur = 0;
    }

    /* ---------- sound ---------- */
    audio() {
      if (this.ac) { if (this.ac.state === "suspended") this.ac.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { this.ac = new AC(); this.out = this.ac.createGain(); this.out.gain.value = 0.45; this.out.connect(this.ac.destination); } catch (e) {}
    }
    sfx(kind, v = 1) {
      if (!this.soundOn || !this.ac) return;
      const ac = this.ac, t = ac.currentTime;
      const env = (g, peak, a, d) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); };
      const noise = dur => { const b = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate); const d = b.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = ac.createBufferSource(); s.buffer = b; return s; };
      if (kind === "shing") {
        const n = noise(0.25), f = ac.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 3000 + Math.random() * 1500;
        const g = ac.createGain(); env(g, 0.22 * v, 0.004, 0.2); n.connect(f).connect(g).connect(this.out); n.start(t);
        const o = ac.createOscillator(); o.frequency.setValueAtTime(1800 + Math.random() * 600, t); o.frequency.exponentialRampToValueAtTime(4800, t + 0.15);
        const g2 = ac.createGain(); env(g2, 0.05 * v, 0.004, 0.16); o.connect(g2).connect(this.out); o.start(t); o.stop(t + 0.2);
      } else if (kind === "chime") {
        [880, 1320, 1760].forEach((hz, i) => {
          const o = ac.createOscillator(); o.type = "triangle"; o.frequency.value = hz;
          const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t + i * 0.06);
          g.gain.exponentialRampToValueAtTime(0.12 * v, t + i * 0.06 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.06 + 0.5);
          o.connect(g).connect(this.out); o.start(t + i * 0.06); o.stop(t + i * 0.06 + 0.55);
        });
      } else if (kind === "miss") {
        const o = ac.createOscillator(); o.type = "square"; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(110, t + 0.25);
        const g = ac.createGain(); env(g, 0.08 * v, 0.005, 0.25); o.connect(g).connect(this.out); o.start(t); o.stop(t + 0.3);
      } else if (kind === "boom") {
        const o = ac.createOscillator(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(32, t + 0.8);
        const g = ac.createGain(); env(g, Math.min(0.9, 0.55 * v), 0.01, 0.9); o.connect(g).connect(this.out); o.start(t); o.stop(t + 1);
        const n = noise(0.6), f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 400;
        const g2 = ac.createGain(); env(g2, 0.3 * v, 0.005, 0.5); n.connect(f).connect(g2).connect(this.out); n.start(t);
      }
    }
  }

  function segDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
    let t = len ? ((px - ax) * dx + (py - ay) * dy) / len : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
})();
