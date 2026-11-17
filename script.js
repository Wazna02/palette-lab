const $ = s => document.querySelector(s);
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const rnd = (a, b) => a + Math.random() * (b - a);

function hsl2hex(h, s, l) {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return "#" + [f(0), f(8), f(4)].map(v => v.toString(16).padStart(2, "0")).join("");
}

function lum(hex) {
  const c = [1, 3, 5]
    .map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4));
  return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
}

function ratio(a, b) {
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}

function grade(r) { return r >= 7 ? "AAA" : r >= 4.5 ? "AA" : r >= 3 ? "AA Large" : "Fail"; }
function ink(hex) { return ratio(hex, "#ffffff") >= ratio(hex, "#111111") ? "#ffffff" : "#111111"; }

let cols = [], saved = [];
const offs = {
  analogous: [-30, -15, 0, 15, 30],
  complementary: [0, 10, 180, 190, 0],
  triad: [0, 120, 240, 0, 120],
  mono: [0, 0, 0, 0, 0],
  random: null
};

function generate() {
  const mode = $("#mode").value, base = rnd(0, 360), o = offs[mode];
  const fresh = [0, 1, 2, 3, 4].map(i => {
    const h = o ? base + o[i] + rnd(-6, 6) : rnd(0, 360);
    const l = mode === "mono" ? 18 + i * 16 + rnd(-3, 3) : rnd(28, 84);
    return hsl2hex(h, rnd(42, 86), clamp(l, 10, 92));
  });
  cols = fresh.map((hex, i) => cols[i] && cols[i].locked ? cols[i] : { hex, locked: false });
  render();
}

function render() {
  $("#main").innerHTML = cols.map((c, i) => {
    const t = ink(c.hex), r = ratio(c.hex, t);
    return `<section class="c" style="background:${c.hex};color:${t};--sw:${c.hex}">
      <button class="hex" data-copy="${c.hex}" aria-label="Copy ${c.hex}">${c.hex.toUpperCase()}</button>
      <div class="meta">${r.toFixed(2)}:1 with ${t === "#ffffff" ? "white" : "black"} text · ${grade(r)}</div>
      <button class="lock" data-lock="${i}" aria-pressed="${c.locked}"><span>${c.locked ? "Locked" : "Lock"}</span></button>
    </section>`;
  }).join("");
}

function renderSaved() {
  $("#saved").innerHTML = saved.length
    ? saved.map((p, i) => `<div class="chip"><button data-load="${i}" aria-label="Load saved palette ${i + 1}">${p.map(h => `<i style="background:${h}"></i>`).join("")}</button><button class="x" data-del="${i}" aria-label="Delete saved palette ${i + 1}">×</button></div>`).join("")
    : `<em>Saved palettes appear here.</em>`;
}

function persist() {
  try { localStorage.setItem("palette-lab", JSON.stringify(saved)); } catch (e) {}
}

let tt;
function toast(m) {
  const t = $("#toast");
  t.textContent = m;
  t.classList.add("on");
  clearTimeout(tt);
  tt = setTimeout(() => t.classList.remove("on"), 1400);
}

async function copy(txt, msg) {
  try { await navigator.clipboard.writeText(txt); toast(msg); }
  catch (e) { toast("Copy blocked by the browser"); }
}

document.addEventListener("click", e => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.id === "gen") generate();
  else if (b.id === "save") {
    saved.unshift(cols.map(c => c.hex));
    saved = saved.slice(0, 12);
    persist(); renderSaved(); toast("Palette saved");
  }
  else if (b.id === "css") copy(":root{\n" + cols.map((c, i) => `  --color-${i + 1}: ${c.hex};`).join("\n") + "\n}", "CSS variables copied");
  else if (b.dataset.copy) copy(b.dataset.copy, b.dataset.copy.toUpperCase() + " copied");
  else if (b.dataset.lock !== undefined) { const c = cols[+b.dataset.lock]; c.locked = !c.locked; render(); }
  else if (b.dataset.load !== undefined) { cols = saved[+b.dataset.load].map(hex => ({ hex, locked: false })); render(); }
  else if (b.dataset.del !== undefined) { saved.splice(+b.dataset.del, 1); persist(); renderSaved(); }
});

document.addEventListener("keydown", e => {
  if (e.code === "Space" && e.target === document.body) { e.preventDefault(); generate(); }
});

$("#mode").addEventListener("change", generate);

try {
  saved = JSON.parse(localStorage.getItem("palette-lab") || "[]");
  if (!Array.isArray(saved)) saved = [];
} catch (e) { saved = []; }

renderSaved();
generate();