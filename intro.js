// intro.js: front page with an Enter button that sword-cuts into the site,
// hero atmosphere (fog, rings, echoes, callouts, dot nav, signature), and the figure fallback.
// Loaded in <head>. Remove its <script> tag in index.html to undo.
(() => {
  const root = document.documentElement;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Set to true to show the front page only the first time someone opens the site in a tab
  const SHOW_ONCE_PER_VISIT = false;

  // Set to true to bring back a figure in the hero (your me.png, or figure.svg if there's no photo)
  const SHOW_FIGURE = false;

  let alreadySeen = false;
  try { alreadySeen = SHOW_ONCE_PER_VISIT && sessionStorage.getItem("gate-seen") === "1"; } catch (e) {}
  const showGate = !alreadySeen;
  if (showGate) root.classList.add("gate-on", "gate-playing");

  document.addEventListener("DOMContentLoaded", () => {
    setupFigure();
    setupAtmosphere();
    if (showGate) buildGate();
  });

  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  /* ---------- Figure: the astronaut is used when me.png isn't in the repo ---------- */
  let usingFigure = false;
  function setupFigure() {
    const portrait = document.querySelector(".portrait");
    const img = portrait && portrait.querySelector("img");
    if (!img) return;
    if (!SHOW_FIGURE) {                       // name only: no photo, no figure
      img.onerror = null;
      img.removeAttribute("src");
      portrait.hidden = true;
      return;
    }
    const useFigure = () => {
      usingFigure = true;
      img.onerror = null;
      img.alt = "";
      img.src = "figure.svg";
      portrait.classList.add("is-figure");
      portrait.hidden = false;
      dispatchEvent(new Event("resize"));
    };
    if (img.complete && img.naturalWidth === 0) useFigure();
    else img.addEventListener("error", useFigure, { once: true });
  }

  /* ---------- Hero atmosphere ---------- */
  function setupAtmosphere() {
    const hero = document.querySelector(".hero");
    if (!hero) return;
    const portrait = hero.querySelector(".portrait");
    const cards = typeof CARDS !== "undefined" ? CARDS : [];

    // HUD strip
    const hud = make("div", "hud-strip");
    hud.setAttribute("aria-hidden", "true");
    hud.innerHTML = `<span>TCSS 490</span><span class="ticks">: : : : : : ✕ : : : : : :</span>
      <span>Portfolio</span><span class="ticks">: : : : : : ✕ : : : : : :</span><span>Autumn 2026</span>`;
    hero.prepend(hud);

    // outlined echoes under the giant word
    const word = hero.querySelector(".giant-word");
    if (word) {
      ["e1", "e2", "e3"].forEach(k => {
        const echo = make("span", "giant-word echo " + k, word.textContent);
        echo.setAttribute("aria-hidden", "true");
        word.after(echo);
      });
    }

    // fog
    const fog = make("div", "fog");
    fog.setAttribute("aria-hidden", "true");
    fog.innerHTML = "<span></span><span></span><span></span>";
    hero.prepend(fog);

    // rings just behind the figure
    const rings = make("div", "rings");
    rings.setAttribute("aria-hidden", "true");
    rings.innerHTML = "<span></span><span></span>";
    if (portrait) hero.insertBefore(rings, portrait); else hero.append(rings);

    // signature
    const signature = make("span", "signature", "Matthew Park");
    signature.setAttribute("aria-hidden", "true");
    hero.append(signature);

    // callouts (x, y are fractions of the figure/photo box)
    const done = cards.filter(c => c.status === "done").length;
    const label4 = done + " of " + (cards.length || 5) + " artifacts done";
    const SPOTS = {
      figure: [
        { x: .62, y: .25, side: "right", text: "CS @ UW" },
        { x: .84, y: .33, side: "right", text: "Class of 2027" },
        { x: .16, y: .14, side: "left",  text: "Builds with AI" },
        { x: .50, y: .45, side: "left",  text: label4 }
      ],
      photo: [
        { x: .50, y: .27, side: "right", text: "CS @ UW" },
        { x: .80, y: .40, side: "right", text: "Class of 2027" },
        { x: .40, y: .36, side: "left",  text: "Builds with AI" },
        { x: .20, y: .50, side: "left",  text: label4 }
      ]
    };
    const callouts = [0, 1, 2, 3].map(i => {
      const c = make("div", "callout");
      c.setAttribute("aria-hidden", "true");
      c.style.setProperty("--d", 1.2 + i * 0.18 + "s");
      c.style.setProperty("--len", "130px");
      c.append(make("span", "callout-anchor"), make("span", "callout-line"),
               make("span", "callout-dot"), make("span", "callout-label"));
      hero.append(c);
      return c;
    });

    // dot nav
    if (cards.length) {
      const nav = make("nav", "dot-nav");
      nav.setAttribute("aria-label", "Artifacts");
      cards.forEach((card, i) => {
        const b = make("button", card.status === "done" ? "done" : "");
        b.type = "button";
        b.setAttribute("aria-label", "Artifact " + card.number + ": " + card.title + ", show details");
        b.append(make("span", "pip"), make("span", "tip", card.number + ". " + card.title.replace(/^Idea:\s*/i, "")));
        b.addEventListener("click", () => {
          const open = document.querySelectorAll(".dish-open")[i];
          if (open) open.click();
        });
        nav.append(b);
      });
      hero.append(nav);
    }

    function layout() {
      const heroBox = hero.getBoundingClientRect();
      const visible = portrait && !portrait.hidden && portrait.offsetHeight > 0;
      const img = visible && portrait.querySelector("img");
      const target = img || word;
      if (!target) return;
      const box = target.getBoundingClientRect();
      const left = box.left - heroBox.left, top = box.top - heroBox.top;

      rings.style.left = left + box.width / 2 + "px";
      rings.style.top = top + box.height * (visible ? .38 : .5) + "px";

      if (visible) {
        signature.style.left = left + box.width * (usingFigure ? .28 : .56) + "px";
        signature.style.top = top + box.height * (usingFigure ? .8 : .62) + "px";
      } else {                                // name only: sign just under the big word
        signature.style.left = left + box.width * .4 + "px";
        signature.style.top = top + box.height * 1.02 + "px";
      }

      const spots = usingFigure ? SPOTS.figure : SPOTS.photo;
      callouts.forEach((c, i) => {
        const s = spots[i];
        c.hidden = !visible;
        c.className = "callout " + s.side;
        c.lastChild.textContent = s.text;
        c.style.left = left + box.width * s.x + "px";
        c.style.top = top + box.height * s.y + "px";
      });
    }
    layout();
    addEventListener("resize", layout);
    addEventListener("load", layout);
    if (portrait) portrait.querySelector("img")?.addEventListener("load", layout);
    if (document.fonts) document.fonts.ready.then(layout);
  }

  /* ---------- Front page ---------- */
  function buildGate() {
    const page = document.querySelector(".page");
    if (page) page.inert = true;

    const face = (copy) => `
      <div class="gate-hud top">
        <span>Matthew Park</span><span class="ticks">: : : : : ✕ : : : : :</span>
        <span>Portfolio</span><span class="ticks">: : : : : ✕ : : : : :</span><span>©2026</span>
      </div>
      <div class="gate-center">
        <span class="gate-kicker">TCSS 490 · Autumn 2026</span>
        <span class="gate-name">MATTHEW PARK<span class="gate-echo">MATTHEW PARK</span><span class="gate-echo">MATTHEW PARK</span><span class="gate-echo">MATTHEW PARK</span></span>
        <span class="gate-ko" lang="ko">매튜 박</span>
        <button type="button" class="gate-enter" ${copy ? 'tabindex="-1" aria-hidden="true"' : ""}>Enter <span class="arrow" aria-hidden="true">→</span></button>
        <span class="gate-sub">CS student at UW · Class of 2027</span>
      </div>
      <div class="gate-hud bottom"><span>Computer Science</span><span>Press Enter</span></div>`;

    const gate = make("div", "gate");
    gate.setAttribute("role", "dialog");
    gate.setAttribute("aria-modal", "true");
    gate.setAttribute("aria-label", "Matthew Park portfolio, front page");
    gate.innerHTML = `
      <div class="gate-half gate-top">${face(false)}</div>
      <div class="gate-half gate-bottom" aria-hidden="true">${face(true)}</div>
      <div class="gate-flash"></div>
      <div class="gate-slash"></div>`;
    document.body.append(gate);
    root.classList.remove("gate-on");

    const button = gate.querySelector(".gate-top .gate-enter");
    button.focus({ preventScroll: true });

    let opened = false;
    const open = () => {
      if (opened) return;
      opened = true;
      try { sessionStorage.setItem("gate-seen", "1"); } catch (e) {}
      removeEventListener("keydown", onKey);
      if (reduceMotion) quickOpen(gate, page);
      else cut(gate, page);
    };
    gate.querySelectorAll(".gate-enter").forEach(b => b.addEventListener("click", open));
    const onKey = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } };
    addEventListener("keydown", onKey);
  }

  function reveal(gate, page) {
    root.classList.remove("gate-playing", "gate-on");
    if (page) page.inert = false;
    gate.remove();
    const firstLink = document.querySelector(".topbar a");
    if (firstLink) firstLink.focus({ preventScroll: true });
  }

  function quickOpen(gate, page) {
    gate.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250 }).finished.then(() => reveal(gate, page));
    root.classList.remove("gate-playing");
  }

  /* ---------- The cut ---------- */
  function cut(gate, page) {
    const top = gate.querySelector(".gate-top");
    const bottom = gate.querySelector(".gate-bottom");
    const line = gate.querySelector(".gate-slash");
    const flash = gate.querySelector(".gate-flash");
    const W = innerWidth, H = innerHeight;

    // blade line from 80% down on the left to 20% down on the right
    const x1 = -0.04 * W, y1 = 0.802 * H, x2 = 1.04 * W, y2 = 0.198 * H;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    Object.assign(line.style, {
      left: x1 + "px", top: y1 - 1.5 + "px",
      width: Math.hypot(x2 - x1, y2 - y1) + "px",
      transform: `rotate(${angle}rad) scaleX(0)`
    });

    const lx = W, ly = -0.56 * H, len = Math.hypot(lx, ly);
    const nx = -ly / len, ny = lx / len;          // perpendicular to the cut
    const far = Math.max(W, H) * 0.9;
    const T = 120;                                // blade starts after the button press

    line.animate([
      { opacity: 1, transform: `rotate(${angle}rad) scaleX(0)` },
      { opacity: 1, transform: `rotate(${angle}rad) scaleX(1)` }
    ], { duration: 170, delay: T, easing: "cubic-bezier(.7, 0, .3, 1)", fill: "forwards" });
    line.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, delay: T + 300, fill: "forwards", composite: "add" });
    flash.animate([{ opacity: 0 }, { opacity: .35 }, { opacity: 0 }], { duration: 220, delay: T + 160 });
    gate.animate([
      { transform: "translate(0, 0)" }, { transform: "translate(-6px, 4px)" },
      { transform: "translate(5px, -3px)" }, { transform: "translate(0, 0)" }
    ], { duration: 200, delay: T + 170 });

    setTimeout(() => {
      gate.classList.add("cutting");
      sparks(gate, x1, y1, x2, y2, nx, ny);
    }, T + 200);

    const ease = "cubic-bezier(.7, 0, .2, 1)";
    const fly = (el, dir) => el.animate([
      { transform: "translate(0, 0)" },
      { transform: `translate(${dir * nx * 8}px, ${dir * ny * 8}px)`, offset: .18 },
      { transform: `translate(${dir * nx * far}px, ${dir * ny * far}px)`, opacity: .6 }
    ], { duration: 950, delay: T + 240, easing: ease, fill: "forwards" });
    fly(top, -1);
    fly(bottom, 1);

    setTimeout(() => root.classList.remove("gate-playing"), T + 450);
    setTimeout(() => reveal(gate, page), T + 1250);
  }

  // sparks burst along the cut
  function sparks(gate, x1, y1, x2, y2, nx, ny) {
    for (let i = 0; i < 36; i++) {
      const t = 0.1 + Math.random() * 0.8;
      const x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t;
      const s = make("span", "spark");
      s.style.left = x + "px";
      s.style.top = y + "px";
      gate.append(s);
      const dir = Math.random() < .5 ? -1 : 1;
      const dist = 40 + Math.random() * 140;
      const drift = (Math.random() - .5) * 80;
      s.animate([
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
        { transform: `translate(${dir * nx * dist + drift}px, ${dir * ny * dist + 40}px) scale(.3)`, opacity: 0 }
      ], { duration: 500 + Math.random() * 500, easing: "cubic-bezier(.2, .8, .3, 1)", fill: "forwards" });
    }
  }
})();
