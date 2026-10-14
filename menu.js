// menu.js: turns the artifact cards into a Korean restaurant menu board.
// It reads the cards script.js already built, so you keep editing cards.js as usual.
// Remove its <script> tag in index.html to undo.
(() => {
  const grid = document.getElementById("cards");
  if (!grid) return;

  /* ---------- 1. Make the section a menu board ---------- */
  const section = grid.closest("section");
  section.classList.add("menu-board");

  const head = document.createElement("div");
  head.className = "menu-head";
  head.innerHTML = `<span class="menu-title" lang="ko" aria-hidden="true">메뉴판</span>`;
  const h2 = section.querySelector("h2");
  h2.before(head);
  head.append(h2);
  const sub = document.createElement("p");
  sub.className = "menu-sub";
  sub.textContent = "Five dishes this quarter, served one artifact at a time.";
  head.append(sub);

  /* ---------- 2. Dish ........ status, plus the seal ---------- */
  grid.querySelectorAll(".card").forEach(card => {
    const title = card.querySelector("h3");
    const done = card.classList.contains("done");

    const row = document.createElement("div");
    row.className = "menu-row";
    title.before(row);

    const leader = document.createElement("span");
    leader.className = "menu-leader";
    leader.setAttribute("aria-hidden", "true");

    const price = document.createElement("span");
    price.className = "menu-price";
    price.innerHTML = done
      ? `<span lang="ko">완료</span><small>served</small>`
      : `<span lang="ko">준비중</span><small>coming soon</small>`;

    row.append(title, leader, price);

    if (done) {
      const seal = document.createElement("span");
      seal.className = "menu-seal";
      seal.lang = "ko";
      seal.textContent = "대표";
      seal.title = "House specialty";
      const steam = document.createElement("span");
      steam.className = "menu-steam";
      steam.setAttribute("aria-hidden", "true");
      steam.innerHTML = "<span></span><span></span><span></span>";
      card.prepend(seal, steam);
    }
  });

  /* ---------- 3. Table call bell (호출) ---------- */
  const email = document.querySelector('nav a[href^="mailto:"]');
  const linkedin = document.querySelector('nav a[href*="linkedin"]');

  const bell = document.createElement("button");
  bell.className = "call-bell";
  bell.lang = "ko";
  bell.textContent = "호출";
  bell.setAttribute("aria-label", "Call bell: get in touch");
  bell.setAttribute("aria-expanded", "false");

  const note = document.createElement("div");
  note.className = "call-note";
  note.hidden = true;
  note.innerHTML = `
    <strong lang="ko">딩동!</strong>
    <p>Thanks for stopping by. Want to talk about a project?</p>
    ${email ? `<a href="${email.href}">Email me</a>` : ""}
    ${linkedin ? `<a href="${linkedin.href}">LinkedIn</a>` : ""}`;
  document.body.append(note, bell);

  let audio;
  function dingDong() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      [[880, 0], [660, 0.28]].forEach(([freq, start]) => {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        const t = audio.currentTime + start;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
        osc.connect(gain).connect(audio.destination);
        osc.start(t);
        osc.stop(t + 1);
      });
    } catch (e) { /* no sound, no problem */ }
  }

  function setOpen(open) {
    note.hidden = !open;
    bell.setAttribute("aria-expanded", String(open));
  }

  bell.addEventListener("click", () => {
    const opening = note.hidden;
    setOpen(opening);
    if (opening) {
      dingDong();
      bell.classList.remove("ringing");
      void bell.offsetWidth;            // restart the shake
      bell.classList.add("ringing");
    }
  });
  document.addEventListener("click", e => {
    if (!note.hidden && !note.contains(e.target) && e.target !== bell) setOpen(false);
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !note.hidden) { setOpen(false); bell.focus(); }
  });
})();
