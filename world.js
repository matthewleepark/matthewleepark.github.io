
(() => {
  const root = document.documentElement;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const SVG = "http://www.w3.org/2000/svg";

  root.classList.add("world");

  document.addEventListener("DOMContentLoaded", () => {
    const hero = document.querySelector(".hero");
    const word = document.querySelector(".giant-word:not(.echo)");
    if (!hero || !word) return;

    const backdrop = buildBackdrop();
    const ridge = buildRidge(hero);
    wrapLetters(word);

    const layout = () => {
      const box = word.getBoundingClientRect();
      const heroBox = hero.getBoundingClientRect();
      const wh = box.height || 200;
      // backdrop horizon follows the bottom of the name (as seen at the top of the page)
      drawBackdrop(backdrop, innerWidth, innerHeight, box.bottom + scrollY, wh);
      drawRidge(ridge, box.bottom - heroBox.top, wh);
    };
    layout();
    addEventListener("resize", layout);
    if (document.fonts) document.fonts.ready.then(layout);

    if (finePointer && !reduceMotion) {
      addEventListener("pointermove", e => {
        backdrop.style.setProperty("--wx", (e.clientX / innerWidth - 0.5).toFixed(3));
        backdrop.style.setProperty("--wy", (e.clientY / innerHeight - 0.5).toFixed(3));
      }, { passive: true });
      setupTrail();
    }
    setupEasterEgg(word);
    watchEntry();
  });

  function make(tag, className, text) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = text;
    return n;
  }
  function svgEl(tag, attrs) {
    const n = document.createElementNS(SVG, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  // small seeded random so the mountains look the same on every load
  function rng(seed) {
    return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  // mountain silhouette: base line, height range, roughness
  function ridgePath(W, base, lo, hi, seed, steps) {
    const r = rng(seed);
    let d = `M0 ${base + 2000}`;
    let h = lo + (hi - lo) * r();
    for (let i = 0; i <= steps; i++) {
      // mostly gentle slopes, sometimes a sharp peak
      const peak = r() < 0.28;
      h = peak ? lo + (hi - lo) * (0.7 + r() * 0.3) : Math.max(lo, Math.min(hi, h * 0.55 + (lo + (hi - lo) * r()) * 0.45));
      const x = (W * i) / steps + (i && i < steps ? (r() - 0.5) * (W / steps) * 0.5 : 0);
      d += ` L${x.toFixed(1)} ${(base - h).toFixed(1)}`;
    }
    return d + ` L${W} ${base + 2000} Z`;
  }

  /* ---------- Backdrop: sky, stars, red sun, far mountains, lake ---------- */
  function buildBackdrop() {
    const wrap = make("div", "world-bg");
    wrap.setAttribute("aria-hidden", "true");
    const aurora = make("div", "aurora");
    aurora.innerHTML = "<span></span><span></span><span></span>";
    wrap.append(svgEl("svg", {}), aurora, make("span", "shooting-star"));
    try { if (sessionStorage.getItem("aurora") === "1") root.classList.add("aurora-on"); } catch (e) {}
    document.body.prepend(wrap);
    return wrap;
  }

  function drawBackdrop(wrap, W, H, hz, wh) {
    const svg = wrap.querySelector("svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("preserveAspectRatio", "none");
    hz = Math.max(H * 0.3, Math.min(H * 0.8, hz));
    const sunX = W * 0.11, sunY = hz - wh * 0.86, sunR = Math.max(22, wh * 0.11);

    let stars = "";
    const r = rng(7);
    const count = Math.round((W * hz) / 6000);
    for (let i = 0; i < count; i++) {
      const x = r() * W, y = r() * (hz - wh * 0.4);
      const tw = r() < 0.35 ? ` class="tw" style="--tw:${(2 + r() * 3).toFixed(1)}s;--td:${(-r() * 4).toFixed(1)}s"` : "";
      stars += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.3 + r() * 1.1).toFixed(2)}" opacity="${(0.3 + r() * 0.7).toFixed(2)}"${tw}/>`;
    }

    let glints = "";
    for (let i = 0; i < (W < 700 ? 0 : 9); i++) {
      const y = hz + 12 + i * Math.max(10, (H - hz) / 14);
      const w = sunR * (1.6 - i * 0.12) + 6;
      glints += `<rect class="shimmer" x="${(sunX - w / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${(3 + i * 0.4).toFixed(1)}" rx="2"
        fill="var(--sun)" opacity="${(0.55 - i * 0.05).toFixed(2)}" style="--td:${(-i * 0.3).toFixed(1)}s; transform-origin:${sunX}px ${y}px"/>`;
    }

    svg.innerHTML = `
      <defs>
        <linearGradient id="w-sky" x1="0" y1="0" x2="0" y2="${hz}" gradientUnits="userSpaceOnUse">
          <stop offset="0" style="stop-color:var(--sky-1)"/>
          <stop offset=".55" style="stop-color:var(--sky-2)"/>
          <stop offset=".88" style="stop-color:var(--sky-3)"/>
          <stop offset="1" style="stop-color:var(--sky-4)"/>
        </linearGradient>
        <linearGradient id="w-lake" x1="0" y1="${hz}" x2="0" y2="${H}" gradientUnits="userSpaceOnUse">
          <stop offset="0" style="stop-color:var(--lake-1)"/>
          <stop offset="1" style="stop-color:var(--lake-2)"/>
        </linearGradient>
        <radialGradient id="w-sunglow">
          <stop offset="0" style="stop-color:var(--sun)" stop-opacity=".55"/>
          <stop offset="1" style="stop-color:var(--sun)" stop-opacity="0"/>
        </radialGradient>
        <filter id="w-blur" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#w-sky)"/>
      <g fill="var(--star)" style="opacity:var(--star-op)">${stars}</g>
      <circle cx="${sunX}" cy="${sunY}" r="${sunR * 4.5}" fill="url(#w-sunglow)"/>
      <circle cx="${sunX}" cy="${sunY}" r="${sunR}" fill="var(--sun)"/>
      <g class="far">
        <path d="${ridgePath(W, hz, wh * 0.2, wh * 0.95, 11, 16)}" fill="var(--m-far)"/>
        <rect x="0" y="${hz - wh * 0.25}" width="${W}" height="${wh * 0.3}" fill="var(--fog-tint)" filter="url(#w-blur)"/>
        <path d="${ridgePath(W, hz, wh * 0.1, wh * 0.55, 23, 22)}" fill="var(--m-mid)"/>
      </g>
      <rect x="0" y="${hz - 1}" width="${W}" height="${H - hz + 1}" fill="url(#w-lake)"/>
      ${glints}
      <rect x="0" y="${hz - 1}" width="${W}" height="1.5" fill="var(--ridge-rim)" opacity=".5"/>`;
  }

  /* ---------- Front ridge in the hero (covers the bottom of your name) ---------- */
  function buildRidge(hero) {
    const ridge = make("div", "world-ridge");
    ridge.setAttribute("aria-hidden", "true");
    ridge.append(svgEl("svg", {}));
    const stage = hero.querySelector(".stage");
    stage ? stage.after(ridge) : hero.append(ridge);
    return ridge;
  }

  function drawRidge(ridge, wordBottom, wh) {
    const W = innerWidth;
    const H = wh * 1.3;
    const top = wordBottom - wh * 0.42;          // highest peaks reach ~40% up the letters
    ridge.style.top = top + "px";
    ridge.style.height = H + "px";
    const svg = ridge.querySelector("svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("preserveAspectRatio", "none");
    const base = wh * 0.42;                       // where the ridge meets the word's baseline
    const d = ridgePath(W, base, wh * 0.04, wh * 0.36, 41, 20);
    svg.innerHTML = `
      <defs>
        <linearGradient id="w-ridge" x1="0" y1="0" x2="0" y2="${H}" gradientUnits="userSpaceOnUse">
          <stop offset="0" style="stop-color:var(--ridge)"/>
          <stop offset=".5" style="stop-color:var(--ridge)"/>
          <stop offset="1" style="stop-color:var(--ridge)" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${d}" fill="url(#w-ridge)"/>
      <path d="${d}" fill="none" stroke="var(--ridge-rim)" stroke-width="1.2"/>`;
  }

  /* ---------- Letters you can slice ---------- */
  function wrapLetters(word) {
    const text = word.textContent;
    word.textContent = "";
    [...text].forEach(ch => {
      const s = make("span", "ltr", ch);
      s.dataset.ch = ch;
      s.addEventListener("click", () => sliceLetter(s));
      word.append(s);
    });
  }

  function sliceLetter(letter, delay = 0) {
    setTimeout(() => {
      const tilt = (Math.random() * 30 - 15).toFixed(0);
      letter.style.setProperty("--c1", 50 + +tilt + "%");
      letter.style.setProperty("--c2", 50 - +tilt + "%");
      letter.classList.remove("sliced");
      void letter.offsetWidth;
      letter.classList.add("sliced");
      if (!reduceMotion) {
        const b = letter.getBoundingClientRect();
        const y1 = b.top + b.height * (0.5 + tilt / 100), y2 = b.top + b.height * (0.5 - tilt / 100);
        slashLine(b.left - 30, y1 + (y1 - y2) * 0.1, b.right + 30, y2 - (y1 - y2) * 0.1, 140);
        sparksAt((b.left + b.right) / 2, b.top + b.height / 2, 10);
      }
      setTimeout(() => letter.classList.remove("sliced"), 1000);
    }, delay);
  }

  function slashLine(x1, y1, x2, y2, duration = 180) {
    const line = make("div", "world-slash");
    const angle = Math.atan2(y2 - y1, x2 - x1);
    Object.assign(line.style, { left: x1 + "px", top: y1 + "px", width: Math.hypot(x2 - x1, y2 - y1) + "px" });
    document.body.append(line);
    line.animate([
      { transform: `rotate(${angle}rad) scaleX(0)`, opacity: 1 },
      { transform: `rotate(${angle}rad) scaleX(1)`, opacity: 1, offset: .45 },
      { transform: `rotate(${angle}rad) scaleX(1)`, opacity: 0 }
    ], { duration: duration * 2.4, easing: "cubic-bezier(.7, 0, .3, 1)" }).finished.then(() => line.remove());
  }

  function sparksAt(x, y, n) {
    for (let i = 0; i < n; i++) {
      const s = make("span", "world-spark");
      s.style.left = x + (Math.random() - 0.5) * 60 + "px";
      s.style.top = y + (Math.random() - 0.5) * 30 + "px";
      document.body.append(s);
      const a = Math.random() * Math.PI * 2, d = 30 + Math.random() * 90;
      s.animate([
        { transform: "translate(0,0)", opacity: 1 },
        { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d + 30}px) scale(.3)`, opacity: 0 }
      ], { duration: 500 + Math.random() * 400, easing: "cubic-bezier(.2, .8, .3, 1)" }).finished.then(() => s.remove());
    }
  }

  /* ---------- Easter egg: type "park" ---------- */
  function setupEasterEgg(word) {
    let typed = "";
    addEventListener("keydown", e => {
      if (document.querySelector(".gate") || document.querySelector("dialog[open]")) return;
      const t = e.target;
      if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) return;
      if (e.key.length !== 1) return;
      typed = (typed + e.key.toLowerCase()).slice(-4);
      if (typed === "park") { typed = ""; secret(word); }
    });
  }

  /* ---------- The secret: 일섬 ("one flash") ---------- */
  let eggRunning = false;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function secret(word) {
    if (eggRunning) return;
    eggRunning = true;
    if (reduceMotion) { unlockAurora(); toast("⚔  일섬 · You found the secret. The sky remembers."); eggRunning = false; return; }
    run(word).catch(() => {}).finally(() => { eggRunning = false; });
  }

  async function run(word) {
    const W = innerWidth, H = innerHeight;
    const sfx = makeSfx();
    const egg = make("div", "egg");
    egg.setAttribute("aria-hidden", "true");
    egg.innerHTML = `
      <canvas class="egg-void"></canvas>
      <div class="egg-shards"></div>
      <div class="egg-bar top"></div><div class="egg-bar bottom"></div>
      <div class="egg-title">
        <span class="egg-kanji" lang="ko"><span class="half a">일섬</span><span class="half b">일섬</span></span>
        <span class="egg-sub">Isseom · One Flash</span>
      </div>
      <div class="egg-flash"></div>`;
    document.body.append(egg);
    const title = egg.querySelector(".egg-title");
    const flashEl = egg.querySelector(".egg-flash");
    const flash = (o, d = 260) => flashEl.animate([{ opacity: 0 }, { opacity: o }, { opacity: 0 }], { duration: d });
    const shake = (px = 8, d = 260) => egg.animate([
      { transform: "translate(0,0)" }, { transform: `translate(${-px}px,${px * .6}px)` },
      { transform: `translate(${px * .8}px,${-px * .5}px)` }, { transform: `translate(${-px * .4}px,${px * .3}px)` },
      { transform: "translate(0,0)" }
    ], { duration: d });

    // 1. time stops: the world drains of color, cinema bars close in, a low hum
    root.classList.add("egg-hush");
    sfx.drone();
    await sleep(40);
    egg.classList.add("bars");
    await sleep(350);

    // 2. the name of the technique
    title.animate([
      { opacity: 0, transform: "scale(1.35)", filter: "blur(14px)" },
      { opacity: 1, transform: "scale(1)", filter: "blur(0)" }
    ], { duration: 650, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" });
    await sleep(1100);

    // 3. it gets cut in half
    slashLine(W * .2, H * .62, W * .8, H * .38, 150);
    sfx.shing(1);
    flash(.35);
    shake(10);
    egg.querySelector(".half.a").animate([{ transform: "none", opacity: 1 }, { transform: "translate(-40px,-50px) rotate(-6deg)", opacity: 0 }],
      { duration: 700, delay: 90, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" });
    egg.querySelector(".half.b").animate([{ transform: "none", opacity: 1 }, { transform: "translate(40px,50px) rotate(5deg)", opacity: 0 }],
      { duration: 700, delay: 90, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" });
    egg.querySelector(".egg-sub").animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "forwards" });
    await sleep(380);

    // 4. a flurry of slashes
    for (let i = 0; i < 7; i++) {
      const a = Math.random() * Math.PI;
      const cx = W * (.3 + Math.random() * .4), cy = H * (.3 + Math.random() * .4);
      const L = Math.hypot(W, H) * .7;
      slashLine(cx - Math.cos(a) * L, cy - Math.sin(a) * L, cx + Math.cos(a) * L, cy + Math.sin(a) * L, 90);
      sparksAt(cx, cy, 8);
      sfx.shing(.55);
      flash(.18, 160);
      shake(6, 160);
      await sleep(85);
    }
    await sleep(140);

    // 5. reality shatters and you see the space between worlds
    const cx = W * (.46 + Math.random() * .08), cy = H * (.44 + Math.random() * .1);
    const shards = buildShards(egg.querySelector(".egg-shards"), W, H, cx, cy);
    root.classList.remove("egg-hush");
    root.classList.add("egg-hide");
    const stopWarp = warp(egg.querySelector(".egg-void"), cx, cy);
    egg.querySelector(".egg-void").animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: "forwards" });
    sfx.boom(1);
    flash(.7, 380);
    shake(14, 380);
    shards.forEach(s => s.el.animate([
      { transform: "none" },
      { transform: `translate(${s.dx * 26}px, ${s.dy * 26}px) rotate(${s.rot * .4}deg)`, offset: .12 },
      { transform: `translate(${s.dx * 120}px, ${s.dy * 120}px) rotate(${s.rot}deg) scale(.94)` }
    ], { duration: 1600, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" }));
    await sleep(1650);

    // 6. it slams back together
    shards.forEach(s => s.el.animate([
      { transform: `translate(${s.dx * 120}px, ${s.dy * 120}px) rotate(${s.rot}deg) scale(.94)` },
      { transform: "none" }
    ], { duration: 240, easing: "cubic-bezier(.7,0,1,.6)", fill: "forwards" }));
    await sleep(230);
    sfx.boom(1.3);
    sfx.shing(1);
    flash(1, 520);
    shake(16, 420);
    sparksAt(cx, cy, 40);
    stopWarp();
    root.classList.remove("egg-hide");
    egg.querySelector(".egg-shards").remove();
    egg.querySelector(".egg-void").remove();
    title.remove();
    egg.classList.remove("bars");

    // 7. the aftermath: every letter splits, and the sky changes for good
    word.querySelectorAll(".ltr").forEach((l, i) => sliceLetter(l, 250 + i * 110));
    unlockAurora();
    await sleep(900);
    toast("⚔  일섬 · You found the secret. The sky remembers.");
    await sleep(700);
    egg.remove();
    sfx.close();
  }

  // four shards meeting at (cx, cy), each a live copy of the page
  function buildShards(wrap, W, H, cx, cy) {
    const tris = [
      [[0, 0], [W, 0], [cx, cy]], [[W, 0], [W, H], [cx, cy]],
      [[W, H], [0, H], [cx, cy]], [[0, H], [0, 0], [cx, cy]]
    ];
    const bg = document.querySelector(".world-bg");
    const page = document.querySelector(".page");
    return tris.map((pts, i) => {
      const el = make("div", "egg-shard");
      el.style.clipPath = `polygon(${pts.map(p => p[0] + "px " + p[1] + "px").join(",")})`;
      if (bg) el.append(bg.cloneNode(true));
      const holder = make("div", "egg-page");
      holder.style.top = -scrollY + "px";
      const copy = page.cloneNode(true);
      copy.inert = true;
      holder.append(copy);
      el.append(holder);
      wrap.append(el);
      const gx = (pts[0][0] + pts[1][0] + pts[2][0]) / 3 - cx;
      const gy = (pts[0][1] + pts[1][1] + pts[2][1]) / 3 - cy;
      const len = Math.hypot(gx, gy) || 1;
      return { el, dx: gx / len, dy: gy / len, rot: (i % 2 ? 1 : -1) * (2 + Math.random() * 3) };
    });
  }

  // warp-speed starfield seen through the cracks
  function warp(canvas, cx, cy) {
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const W = innerWidth, H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const stars = Array.from({ length: 260 }, () => ({ a: Math.random() * Math.PI * 2, z: Math.random() }));
    let raf = 0, alive = true, t0 = performance.now();
    const frame = now => {
      if (!alive) return;
      const speed = 0.004 + Math.min(1, (now - t0) / 1200) * 0.02;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(W, H) * .6);
      g.addColorStop(0, "#eaf4ff"); g.addColorStop(.12, "#7fb6ff"); g.addColorStop(.45, "#12305e"); g.addColorStop(1, "#02040a");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.lineCap = "round";
      for (const s of stars) {
        s.z -= speed;
        if (s.z <= 0.02) { s.z = 1; s.a = Math.random() * Math.PI * 2; }
        const r1 = 40 / s.z, r2 = 40 / (s.z + speed * 6);
        const x1 = cx + Math.cos(s.a) * r1, y1 = cy + Math.sin(s.a) * r1;
        const x2 = cx + Math.cos(s.a) * r2, y2 = cy + Math.sin(s.a) * r2;
        ctx.strokeStyle = `rgba(225, 238, 255, ${Math.min(1, (1 - s.z) * 1.2)})`;
        ctx.lineWidth = (1 - s.z) * 2.5 + .3;
        ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x1, y1); ctx.stroke();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }

  // the reward stays for the rest of the visit
  function unlockAurora() {
    root.classList.add("aurora-on");
    try { sessionStorage.setItem("aurora", "1"); } catch (e) {}
  }

  // tiny synthesized sound effects (only ever play when someone types the secret)
  function makeSfx() {
    const AC = window.AudioContext || window.webkitAudioContext;
    const none = { drone() {}, shing() {}, boom() {}, close() {} };
    if (!AC) return none;
    let ac;
    try { ac = new AC(); } catch (e) { return none; }
    const out = ac.createGain();
    out.gain.value = .55;
    out.connect(ac.destination);
    const noise = dur => {
      const b = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = ac.createBufferSource(); src.buffer = b; return src;
    };
    const env = (g, t, peak, attack, decay) => {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    };
    return {
      drone() {
        const t = ac.currentTime;
        const f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 420;
        const g = ac.createGain(); env(g, t, .14, 1, 1.4);
        [55, 82.4, 110.6].forEach(hz => {
          const o = ac.createOscillator(); o.type = "sawtooth"; o.frequency.value = hz;
          o.connect(f); o.start(t); o.stop(t + 2.6);
        });
        f.connect(g).connect(out);
      },
      shing(v = 1) {
        const t = ac.currentTime;
        const n = noise(.4), hp = ac.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 3500;
        const g = ac.createGain(); env(g, t, .28 * v, .005, .35);
        n.connect(hp).connect(g).connect(out); n.start(t);
        const o = ac.createOscillator(); o.type = "sine";
        o.frequency.setValueAtTime(2200, t); o.frequency.exponentialRampToValueAtTime(5600, t + .25);
        const g2 = ac.createGain(); env(g2, t, .07 * v, .005, .3);
        o.connect(g2).connect(out); o.start(t); o.stop(t + .35);
      },
      boom(v = 1) {
        const t = ac.currentTime;
        const o = ac.createOscillator(); o.type = "sine";
        o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(34, t + .8);
        const g = ac.createGain(); env(g, t, Math.min(.9, .6 * v), .01, .9);
        o.connect(g).connect(out); o.start(t); o.stop(t + 1);
        const n = noise(.6), lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 380;
        const g2 = ac.createGain(); env(g2, t, .35 * v, .005, .5);
        n.connect(lp).connect(g2).connect(out); n.start(t);
      },
      close() { setTimeout(() => ac.close().catch(() => {}), 2500); }
    };
  }

  function toast(text) {
    const t = make("div", "world-toast", text);
    t.setAttribute("role", "status");
    document.body.append(t);
    t.animate([
      { opacity: 0, translate: "-50% 12px" }, { opacity: 1, translate: "-50% 0", offset: .12 },
      { opacity: 1, translate: "-50% 0", offset: .85 }, { opacity: 0, translate: "-50% 0" }
    ], { duration: 2800, easing: "ease-out" }).finished.then(() => t.remove());
  }

  /* ---------- Blade cursor trail ---------- */
  function setupTrail() {
    const canvas = make("canvas", "blade-trail");
    canvas.setAttribute("aria-hidden", "true");
    document.body.append(canvas);
    const ctx = canvas.getContext("2d");
    let W = 0, H = 0, running = false;
    const pts = [];
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = innerWidth; H = innerHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    addEventListener("resize", resize);

    let last = null;
    addEventListener("pointermove", e => {
      const now = performance.now();
      const speed = last ? Math.hypot(e.clientX - last.x, e.clientY - last.y) / Math.max(1, now - last.t) : 0;
      last = { x: e.clientX, y: e.clientY, t: now };
      pts.push({ x: e.clientX, y: e.clientY, t: now, s: Math.min(speed, 6) });
      if (!running) { running = true; requestAnimationFrame(draw); }
    }, { passive: true });

    function draw(now) {
      // fast flicks (a "slash") linger longer and glow brighter
      while (pts.length && now - pts[0].t > (pts[0].s > 2.2 ? 420 : 200)) pts.shift();
      ctx.clearRect(0, 0, W, H);
      if (pts.length > 1) {
        ctx.globalCompositeOperation = "lighter";
        ctx.lineCap = "round";
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], b = pts[i];
          const slash = b.s > 2.2;
          const life = 1 - (now - b.t) / (slash ? 420 : 200);
          if (life <= 0) continue;
          const taper = i / pts.length;
          const width = (slash ? 1.2 + b.s * 0.9 : 1 + b.s * 0.5) * taper * life;
          ctx.strokeStyle = slash ? `rgba(150, 200, 255, ${0.5 * life})` : `rgba(140, 185, 255, ${0.3 * life})`;
          ctx.lineWidth = width * 4;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          ctx.strokeStyle = `rgba(255, 255, 255, ${(slash ? 0.95 : 0.7) * life})`;
          ctx.lineWidth = Math.max(0.6, width);
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
        ctx.globalCompositeOperation = "source-over";
      }
      if (pts.length) requestAnimationFrame(draw);
      else { running = false; ctx.clearRect(0, 0, W, H); }
    }
  }

  /* ---------- Rush into the world when the cut opens ---------- */
  function watchEntry() {
    const enter = () => {
      root.classList.add("world-entering");
      setTimeout(() => root.classList.remove("world-entering"), 1700);
    };
    if (!root.classList.contains("gate-playing")) { enter(); return; }
    const obs = new MutationObserver(() => {
      if (!root.classList.contains("gate-playing")) { obs.disconnect(); enter(); }
    });
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });
  }
})();
