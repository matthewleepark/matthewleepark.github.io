const container = document.getElementById("cards");

CARDS.forEach(card => {
  const el = document.createElement("article");
  el.className = "card " + card.status;

  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = "Artifact " + card.number + (card.status === "idea" ? " · idea" : "");

  const title = document.createElement("h3");
  title.textContent = card.title;

  const desc = document.createElement("p");
  desc.textContent = card.description;

  el.append(badge, title, desc);

  if (card.reflection) {
    const refl = document.createElement("p");
    refl.className = "reflection";
    refl.textContent = card.reflection;
    el.append(refl);
  }

  if (card.link) {
    const a = document.createElement("a");
    a.href = card.link;
    a.textContent = "View artifact →";
    el.append(a);
  }

  container.append(el);
});

// Theme toggle, remembers choice
const root = document.documentElement;
const saved = localStorage.getItem("theme");
if (saved) root.dataset.theme = saved;

document.getElementById("theme-toggle").addEventListener("click", () => {
  const dark = root.dataset.theme === "dark" ||
    (!root.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
  root.dataset.theme = dark ? "light" : "dark";
  localStorage.setItem("theme", root.dataset.theme);
});
