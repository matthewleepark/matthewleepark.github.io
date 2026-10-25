// MyFile browser converter: the conversion engine (formats, routes, converters).
// The page (index.html) builds the interface on top of routes() and convert().
"use strict";
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const MAX_BYTES = 300 * 1024 * 1024;

/* ---------- Formats ---------- */
const FORMATS = {
  png: ["image", "PNG image"], jpg: ["image", "JPEG image"], gif: ["image", "GIF image"], webp: ["image", "WebP image"],
  bmp: ["image", "BMP image"], avif: ["image", "AVIF image"], ico: ["image", "Windows icon"], svg: ["image", "SVG image"],
  pdf: ["pdf", "PDF document"], docx: ["docx", "Word document"],
  md: ["text", "Markdown"], txt: ["text", "plain text"], html: ["text", "HTML page"],
  csv: ["table", "CSV table"], tsv: ["table", "TSV table"], json: ["data", "JSON data"], yaml: ["data", "YAML data"],
  xlsx: ["sheet", "Excel workbook"], xls: ["sheet", "Excel 97-2003 workbook"], ods: ["sheet", "OpenDocument spreadsheet"],
  srt: ["subs", "SubRip subtitles"], vtt: ["subs", "WebVTT subtitles"],
  mp3: ["audio", "MP3 audio"], wav: ["audio", "WAV audio"], m4a: ["audio", "M4A audio"], aac: ["audio", "AAC audio"],
  ogg: ["audio", "Ogg audio"], flac: ["audio", "FLAC audio"], opus: ["audio", "Opus audio"],
  mp4: ["video", "MP4 video"], mov: ["video", "QuickTime video"], webm: ["video", "WebM video"], m4v: ["video", "M4V video"],
};
const ALIASES = { jpeg: "jpg", jpe: "jpg", jfif: "jpg", markdown: "md", htm: "html", yml: "yaml", oga: "ogg", text: "txt", log: "txt" };
const MIME = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp", "image/bmp": "bmp", "image/avif": "avif",
  "image/svg+xml": "svg", "application/pdf": "pdf", "audio/mpeg": "mp3", "audio/wav": "wav", "audio/x-wav": "wav", "video/mp4": "mp4", "video/webm": "webm" };

function detect(file) {
  let ext = (file.name.split(".").pop() || "").toLowerCase();
  ext = ALIASES[ext] || ext;
  if (FORMATS[ext]) return ext;
  return MIME[file.type] || null;
}

/* What each format can become: [id, label, hint, group, knobs]. */
function routes(fmt) {
  const fam = FORMATS[fmt][0];
  const r = [];
  const add = (id, label, hint, group, knobs = []) => { if (id !== fmt || group === "Image") r.push({ id, label, hint, group, knobs }); };
  if (fam === "image") {
    add("jpg", "JPG", null, "Image", ["quality", "size"]);
    add("png", "PNG", null, "Image", ["size"]);
    add("webp", "WebP", null, "Image", ["quality", "size"]);
    add("pdf", "PDF", null, "Document", ["quality", "size"]);
  } else if (fam === "pdf") {
    add("png", "PNG", "one image per page", "Image", ["size"]);
    add("jpg", "JPG", "one image per page", "Image", ["quality", "size"]);
    add("txt", "Text", "the PDF's text", "Document");
  } else if (fam === "docx") {
    add("txt", "Text", null, "Document"); add("md", "Markdown", null, "Document"); add("html", "HTML", null, "Document"); add("pdf", "PDF", "text and headings", "Document");
  } else if (fam === "text") {
    for (const [id, l] of [["pdf", "PDF"], ["html", "HTML"], ["txt", "Text"], ["md", "Markdown"]]) {
      if (fmt === "html" && id === "md") continue;
      add(id, l, null, "Document");
    }
  } else if (fam === "table") {
    for (const [id, l] of [["xlsx", "Excel"], ["json", "JSON"], ["csv", "CSV"], ["tsv", "TSV"], ["yaml", "YAML"], ["html", "HTML table"], ["md", "Markdown table"]]) add(id, l, null, "Data");
  } else if (fam === "data") {
    for (const [id, l] of [["json", "JSON"], ["yaml", "YAML"], ["csv", "CSV"], ["xlsx", "Excel"]]) add(id, l, id === "csv" || id === "xlsx" ? "for a list of records" : null, "Data");
  } else if (fam === "sheet") {
    for (const [id, l] of [["csv", "CSV"], ["json", "JSON"], ["html", "HTML table"], ["md", "Markdown table"]]) add(id, l, "one file per sheet", "Data");
    if (fmt !== "xlsx") add("xlsx", "Excel", null, "Spreadsheet");
  } else if (fam === "subs") {
    add("srt", "SRT", null, "Subtitles"); add("vtt", "VTT", null, "Subtitles"); add("txt", "Text", "just the lines", "Document");
  } else if (fam === "audio" || fam === "video") {
    const hint = fam === "video" ? "just the audio" : null;
    add("mp3", "MP3", hint, "Audio", ["bitrate"]); add("wav", "WAV", hint, "Audio");
  }
  return r;
}

/* ---------- Helpers ---------- */
const $ = (id) => document.getElementById(id);
const stemOf = (name) => name.replace(/\.[^.]+$/, "") || "file";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function size(n) {
  if (n < 1024) return n + " bytes";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
  return (n / 1024 / 1024).toFixed(1) + " MB";
}
// Yield to the page between chunks of work. A MessageChannel is used instead
// of setTimeout because browsers slow timers to ~1/s in background tabs.
const tick = () => new Promise((r) => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
const text = (file) => file.text().then((t) => t.replace(/^﻿/, ""));
function htmlPage(title, body) {
  return `<!doctype html>\n<html>\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${esc(title)}</title>\n<style>body{font-family:system-ui,sans-serif;max-width:46rem;margin:2rem auto;padding:0 1rem;line-height:1.6}pre,code{background:#f4f4f5;border-radius:4px}pre{padding:.8rem;overflow:auto}table{border-collapse:collapse}td,th{border:1px solid #d0d7de;padding:.3rem .6rem;text-align:left}</style>\n</head>\n<body>\n${body}\n</body>\n</html>\n`;
}
const blobOf = (s, type) => new Blob([s], { type });
let progress = () => {};

/* ---------- Images ---------- */
function loadImage(file) {
  // (A file the browser can't decode is reported, and the rest of the batch continues.)
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Your browser can't read this image (it may be damaged or an unsupported type).")); };
    img.src = url;
  });
}
function toCanvas(source, w, h, max, opaque) {
  let scale = 1;
  if (max && Math.max(w, h) > max) scale = max / Math.max(w, h);
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w * scale));
  c.height = Math.max(1, Math.round(h * scale));
  const ctx = c.getContext("2d");
  if (opaque) { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, c.width, c.height);
  return c;
}
const canvasBlob = (c, type, q) => new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Your browser couldn't encode this format."))), type, q));
async function imagesToPdf(canvases, q) {
  const { jsPDF } = window.jspdf;
  let doc = null;
  for (const c of canvases) {
    const w = c.width * 0.75, h = c.height * 0.75;
    const orient = w > h ? "landscape" : "portrait";
    if (!doc) doc = new jsPDF({ orientation: orient, unit: "pt", format: [w, h] });
    else doc.addPage([w, h], orient);
    doc.addImage(c.toDataURL("image/jpeg", q), "JPEG", 0, 0, w, h);
  }
  return doc.output("blob");
}
async function convertImage(file, target, s) {
  const img = await loadImage(file);
  const w = img.naturalWidth || 1024, h = img.naturalHeight || 1024;
  const opaque = target === "jpg" || target === "pdf";
  const c = toCanvas(img, w, h, s.size, opaque);
  if (target === "pdf") return [await imagesToPdf([c], s.quality), "pdf"];
  const type = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" }[target];
  const blob = await canvasBlob(c, type, s.quality);
  if (blob.type !== type) throw new Error("Your browser can't save " + target.toUpperCase() + " images.");
  return [blob, target];
}

/* ---------- PDF ---------- */
async function openPdf(file) {
  return pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
}
async function pdfToImages(file, target, s, stem) {
  const pdf = await openPdf(file);
  if (pdf.numPages > 300) throw new Error(`This PDF has ${pdf.numPages} pages; the browser version converts up to 300.`);
  const files = [];
  const digits = String(pdf.numPages).length;
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const scale = s.size ? (s.size + 0.5) / Math.max(base.width, base.height) : 150 / 72;
    const vp = page.getViewport({ scale });
    const c = document.createElement("canvas");
    c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    // "print" renders without requestAnimationFrame, which pauses in hidden tabs.
    await page.render({ canvasContext: ctx, viewport: vp, intent: "print" }).promise;
    const blob = await canvasBlob(c, target === "jpg" ? "image/jpeg" : "image/png", s.quality);
    const name = pdf.numPages === 1 ? `${stem}.${target}` : `${stem}-page-${String(i).padStart(Math.max(2, digits), "0")}.${target}`;
    files.push([name, blob]);
    progress(i / pdf.numPages);
  }
  return files;
}
async function pdfText(file) {
  const pdf = await openPdf(file);
  let out = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const content = await (await pdf.getPage(i)).getTextContent();
    let line = "";
    for (const it of content.items) { line += it.str + (it.hasEOL ? "\n" : " "); }
    if (pdf.numPages > 1) out += `--- Page ${i} ---\n\n`;
    out += line.replace(/[ \t]+\n/g, "\n").trim() + "\n\n";
    progress(i / pdf.numPages);
  }
  return out;
}

/* ---------- Documents: blocks -> PDF / HTML / Markdown / text ---------- */
function markdownBlocks(md) {
  const blocks = [];
  const plain = (tokens) => (tokens || []).map((t) => (t.tokens ? plain(t.tokens) : t.text || t.raw || "")).join("");
  for (const t of marked.lexer(md)) {
    if (t.type === "heading") blocks.push({ kind: "h", level: t.depth, text: plain(t.tokens) });
    else if (t.type === "paragraph") blocks.push({ kind: "p", text: plain(t.tokens) });
    else if (t.type === "list") for (const it of t.items) blocks.push({ kind: "li", text: plain(it.tokens).replace(/\s+/g, " ").trim() });
    else if (t.type === "code") blocks.push({ kind: "code", text: t.text });
    else if (t.type === "hr") blocks.push({ kind: "hr" });
    else if (t.type === "blockquote") blocks.push({ kind: "p", text: plain(t.tokens) });
    else if (t.type === "table") {
      const row = (cells) => cells.map((c) => plain(c.tokens)).join("  |  ");
      blocks.push({ kind: "code", text: [row(t.header), ...t.rows.map(row)].join("\n") });
    }
  }
  return blocks;
}
function textBlocks(t) {
  return t.replace(/\r\n/g, "\n").split("\n").map((l) => l.trimEnd()).map((l) => (l ? { kind: "p", text: l.trim() } : null)).filter(Boolean);
}
function htmlBlocks(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,style,noscript,template").forEach((n) => n.remove());
  const blocks = [];
  const walk = (el) => {
    for (const n of el.children) {
      const tag = n.tagName.toLowerCase();
      const t = n.textContent.replace(/\s+/g, " ").trim();
      if (/^h[1-6]$/.test(tag)) { if (t) blocks.push({ kind: "h", level: +tag[1], text: t }); }
      else if (tag === "li") { if (t) blocks.push({ kind: "li", text: t }); }
      else if (tag === "pre") blocks.push({ kind: "code", text: n.textContent.replace(/^\n|\n$/g, "") });
      else if (tag === "hr") blocks.push({ kind: "hr" });
      else if (tag === "p" || tag === "tr" || tag === "dt" || tag === "dd" || tag === "figcaption") { if (t) blocks.push({ kind: "p", text: t }); }
      else if (n.children.length) walk(n);
      else if (t) blocks.push({ kind: "p", text: t });
    }
  };
  walk(doc.body);
  return blocks;
}
function blocksToText(b) {
  return b.map((x) => (x.kind === "li" ? `- ${x.text}` : x.kind === "hr" ? "----" : x.text)).join("\n\n").trim() + "\n";
}
function blocksToMarkdown(b) {
  return b.map((x) => x.kind === "h" ? `${"#".repeat(Math.min(6, x.level))} ${x.text}` : x.kind === "li" ? `- ${x.text}` : x.kind === "code" ? "```\n" + x.text + "\n```" : x.kind === "hr" ? "---" : x.text)
    .join("\n\n").replace(/(^- .*)\n\n(?=- )/gm, "$1\n").trim() + "\n";
}
function blocksToHtml(b) {
  let out = "", inList = false;
  for (const x of b) {
    if (inList && x.kind !== "li") { out += "</ul>\n"; inList = false; }
    if (x.kind === "h") out += `<h${Math.min(6, x.level)}>${esc(x.text)}</h${Math.min(6, x.level)}>\n`;
    else if (x.kind === "li") { if (!inList) { out += "<ul>\n"; inList = true; } out += `<li>${esc(x.text)}</li>\n`; }
    else if (x.kind === "code") out += `<pre>${esc(x.text)}</pre>\n`;
    else if (x.kind === "hr") out += "<hr>\n";
    else out += `<p>${esc(x.text)}</p>\n`;
  }
  return out + (inList ? "</ul>\n" : "");
}
function blocksToPdf(blocks) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const M = 64, W = doc.internal.pageSize.getWidth() - 2 * M, H = doc.internal.pageSize.getHeight();
  let y = M;
  const line = (txt, font, style, sz, indent = 0) => {
    doc.setFont(font, style); doc.setFontSize(sz);
    for (const l of doc.splitTextToSize(txt, W - indent)) {
      if (y + sz * 1.35 > H - M) { doc.addPage(); y = M; }
      y += sz * 1.35;
      doc.text(l, M + indent, y - sz * 0.3);
    }
  };
  for (const b of blocks) {
    if (b.kind === "h") { const sz = [20, 16, 13.5, 12][Math.min(4, b.level) - 1]; if (y > M) y += sz * 0.8; line(b.text, "helvetica", "bold", sz); y += 4; }
    else if (b.kind === "li") { line("•  " + b.text, "helvetica", "normal", 11, 6); y += 3; }
    else if (b.kind === "code") { b.text.split("\n").forEach((l) => line(l || " ", "courier", "normal", 9)); y += 8; }
    else if (b.kind === "hr") { y += 7; doc.setDrawColor(190); doc.line(M, y, M + W, y); y += 7; }
    else { line(b.text, "helvetica", "normal", 11); y += 7; }
  }
  return doc.output("blob");
}
async function docxBlocks(file) {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const part = zip.file("word/document.xml");
  if (!part) throw new Error("This Word file has no document part.");
  const xml = new DOMParser().parseFromString(await part.async("string"), "application/xml");
  const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const blocks = [];
  for (const p of xml.getElementsByTagNameNS(W, "p")) {
    let t = "";
    for (const n of p.getElementsByTagNameNS(W, "*")) {
      if (n.localName === "t") t += n.textContent;
      else if (n.localName === "tab") t += "\t";
      else if (n.localName === "br") t += " ";
    }
    t = t.trim();
    if (!t) continue;
    const style = (p.getElementsByTagNameNS(W, "pStyle")[0]?.getAttributeNS(W, "val") || "").toLowerCase();
    const level = style.startsWith("heading") ? parseInt(style.slice(7), 10) : style === "title" ? 1 : 0;
    if (level) blocks.push({ kind: "h", level, text: t });
    else if (p.getElementsByTagNameNS(W, "numPr").length || style.includes("list")) blocks.push({ kind: "li", text: t });
    else blocks.push({ kind: "p", text: t });
  }
  return blocks;
}

/* ---------- Data ---------- */
function cellValue(s) {
  const t = String(s).trim();
  if (t === "true" || t === "false") return t === "true";
  const leadingZero = t.length > 1 && t.startsWith("0") && !t.startsWith("0.");
  if (!leadingZero && t !== "" && /^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  return s;
}
function parseDelimited(t, fs) {
  const wb = XLSX.read(t, { type: "string", raw: true, FS: fs });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: "" });
  return { headers: (rows[0] || []).map(String), rows: rows.slice(1).map((r) => r.map(String)) };
}
const tableToRecords = (t) => t.rows.map((r) => Object.fromEntries(t.headers.map((h, i) => [h || `column${i + 1}`, cellValue(r[i] ?? "")])));
function recordsToTable(v) {
  let items = v;
  if (v && !Array.isArray(v) && typeof v === "object") {
    const lists = Object.values(v).filter(Array.isArray);
    items = Object.keys(v).length === 1 && lists.length === 1 ? lists[0] : [v];
  }
  if (!Array.isArray(items) || !items.length) throw new Error("This data isn't a list of records, so it can't become a table.");
  const cell = (x) => (x === null || x === undefined ? "" : typeof x === "object" ? JSON.stringify(x) : String(x));
  if (items.every(Array.isArray)) return { headers: items[0].map(cell), rows: items.slice(1).map((r) => r.map(cell)) };
  if (!items.every((i) => i && typeof i === "object")) throw new Error("This data isn't a list of records, so it can't become a table.");
  const headers = [];
  items.forEach((i) => Object.keys(i).forEach((k) => headers.includes(k) || headers.push(k)));
  return { headers, rows: items.map((i) => headers.map((h) => cell(i[h]))) };
}
function writeDelimited(t, fs) {
  const q = (s) => (/["\n\r]/.test(s) || s.includes(fs) ? `"${s.replace(/"/g, '""')}"` : s);
  return [t.headers, ...t.rows].map((r) => r.map((c) => q(String(c))).join(fs)).join("\n") + "\n";
}
const tableHtml = (t, title) => htmlPage(title, "<table>\n<thead><tr>" + t.headers.map((h) => `<th>${esc(h)}</th>`).join("") + "</tr></thead>\n<tbody>\n" + t.rows.map((r) => "<tr>" + r.map((c) => `<td>${esc(c)}</td>`).join("") + "</tr>").join("\n") + "\n</tbody>\n</table>");
function tableMd(t) {
  const c = (s) => String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");
  return `| ${t.headers.map(c).join(" | ")} |\n|${" --- |".repeat(Math.max(1, t.headers.length))}\n` + t.rows.map((r) => `| ${r.map(c).join(" | ")} |`).join("\n") + "\n";
}
function xlsxBlob(sheets) {
  const wb = XLSX.utils.book_new();
  for (const [name, t] of sheets) {
    const ws = XLSX.utils.aoa_to_sheet([t.headers, ...t.rows.map((r) => r.map(cellValue))]);
    XLSX.utils.book_append_sheet(wb, ws, name.replace(/[\[\]:*?\/\\]/g, "").slice(0, 31) || "Sheet1");
  }
  return new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
function writeTable(t, target, title) {
  switch (target) {
    case "csv": return blobOf(writeDelimited(t, ","), "text/csv");
    case "tsv": return blobOf(writeDelimited(t, "\t"), "text/tab-separated-values");
    case "html": return blobOf(tableHtml(t, title), "text/html");
    case "md": return blobOf(tableMd(t), "text/markdown");
    case "json": return blobOf(JSON.stringify(tableToRecords(t), null, 2) + "\n", "application/json");
    case "yaml": return blobOf(jsyaml.dump(tableToRecords(t)), "text/yaml");
    case "xlsx": return xlsxBlob([[title, t]]);
  }
}

/* ---------- Subtitles ---------- */
function parseCues(t) {
  const cues = [];
  for (const block of t.replace(/\r\n/g, "\n").split(/\n\s*\n/)) {
    const lines = block.split("\n").filter((l) => l.trim());
    const at = lines.findIndex((l) => l.includes("-->"));
    if (at < 0) continue;
    const [a, b] = lines[at].split("-->");
    cues.push({ start: a.trim(), end: (b || "").trim().split(/\s+/)[0], text: lines.slice(at + 1) });
  }
  return cues;
}
function normTime(t, sep) {
  const [hms, ms = "0"] = t.replace(",", ".").split(".");
  const p = hms.split(":").map(Number);
  while (p.length < 3) p.unshift(0);
  const pad = (n, w = 2) => String(n || 0).padStart(w, "0");
  return `${pad(p[0])}:${pad(p[1])}:${pad(p[2])}${sep}${pad(Number(ms.slice(0, 3).padEnd(3, "0")), 3)}`;
}
function writeCues(cues, target) {
  if (target === "vtt") return "WEBVTT\n\n" + cues.map((c) => `${normTime(c.start, ".")} --> ${normTime(c.end, ".")}\n${c.text.join("\n")}\n`).join("\n");
  if (target === "srt") return cues.map((c, i) => `${i + 1}\n${normTime(c.start, ",")} --> ${normTime(c.end, ",")}\n${c.text.join("\n")}\n`).join("\n");
  return cues.flatMap((c) => c.text.map((l) => l.replace(/<[^>]*>|\{[^}]*\}/g, ""))).filter((l) => l.trim()).join("\n") + "\n";
}

/* ---------- Audio ---------- */
async function decodeAudio(file) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  try {
    return await ctx.decodeAudioData(await file.arrayBuffer());
  } catch {
    throw new Error("Your browser can't decode the sound in this file. (The desktop app converts many more formats.)");
  } finally {
    ctx.close();
  }
}
function toInt16(f32) {
  const out = new Int16Array(f32.length);
  for (let i = 0; i < f32.length; i++) { const s = Math.max(-1, Math.min(1, f32[i])); out[i] = s < 0 ? s * 0x8000 : s * 0x7fff; }
  return out;
}
function wavBlob(buf) {
  const ch = Math.min(2, buf.numberOfChannels), rate = buf.sampleRate, n = buf.length;
  const data = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const str = (o, s) => [...s].forEach((c, i) => data.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF"); data.setUint32(4, 36 + n * ch * 2, true); str(8, "WAVE"); str(12, "fmt ");
  data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, ch, true); data.setUint32(24, rate, true);
  data.setUint32(28, rate * ch * 2, true); data.setUint16(32, ch * 2, true); data.setUint16(34, 16, true); str(36, "data"); data.setUint32(40, n * ch * 2, true);
  const chans = [...Array(ch)].map((_, i) => buf.getChannelData(i));
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const s = Math.max(-1, Math.min(1, chans[c][i])); data.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2; }
  return new Blob([data], { type: "audio/wav" });
}
async function mp3Blob(buf, kbps) {
  const ch = Math.min(2, buf.numberOfChannels);
  const enc = new lamejs.Mp3Encoder(ch, buf.sampleRate, kbps);
  const left = toInt16(buf.getChannelData(0));
  const right = ch > 1 ? toInt16(buf.getChannelData(1)) : null;
  const parts = [];
  let last = performance.now();
  for (let i = 0; i < left.length; i += 1152) {
    const l = left.subarray(i, i + 1152);
    const out = right ? enc.encodeBuffer(l, right.subarray(i, i + 1152)) : enc.encodeBuffer(l);
    if (out.length) parts.push(new Uint8Array(out));
    if (performance.now() - last > 50) { progress(i / left.length); await tick(); last = performance.now(); }
  }
  const end = enc.flush();
  if (end.length) parts.push(new Uint8Array(end));
  return new Blob(parts, { type: "audio/mpeg" });
}

/* ---------- Run a conversion ---------- */
async function convert(file, fmt, target, s) {
  const stem = stemOf(file.name);
  const name = (ext) => `${target === fmt ? stem + "-converted" : stem}.${ext}`;
  const fam = FORMATS[fmt][0];
  const one = (blob, ext) => [[name(ext), blob]];
  if (fam === "image") { const [b, ext] = await convertImage(file, target, s); return one(b, ext); }
  if (fam === "pdf") {
    if (target === "txt") return one(blobOf(await pdfText(file), "text/plain"), "txt");
    return pdfToImages(file, target, s, stem);
  }
  if (fam === "docx" || fam === "text") {
    let blocks;
    if (fam === "docx") blocks = await docxBlocks(file);
    else if (fmt === "md") {
      if (target === "html") return one(blobOf(htmlPage(stem, marked.parse(await text(file))), "text/html"), "html");
      blocks = markdownBlocks(await text(file));
    } else if (fmt === "html") blocks = htmlBlocks(await text(file));
    else blocks = textBlocks(await text(file));
    if (!blocks.length) throw new Error("No text was found in this file.");
    if (target === "pdf") return one(blocksToPdf(blocks), "pdf");
    if (target === "html") return one(blobOf(htmlPage(stem, blocksToHtml(blocks)), "text/html"), "html");
    if (target === "md") return one(blobOf(blocksToMarkdown(blocks), "text/markdown"), "md");
    return one(blobOf(blocksToText(blocks), "text/plain"), "txt");
  }
  if (fam === "table") {
    const t = parseDelimited(await text(file), fmt === "tsv" ? "\t" : ",");
    return one(writeTable(t, target, stem), target);
  }
  if (fam === "data") {
    const raw = await text(file);
    let v;
    try { v = fmt === "json" ? JSON.parse(raw) : jsyaml.load(raw); }
    catch (e) { throw new Error(`This ${fmt.toUpperCase()} file couldn't be read: ${e.message}`); }
    if (target === "json") return one(blobOf(JSON.stringify(v, null, 2) + "\n", "application/json"), "json");
    if (target === "yaml") return one(blobOf(jsyaml.dump(v), "text/yaml"), "yaml");
    return one(writeTable(recordsToTable(v), target, stem), target);
  }
  if (fam === "sheet") {
    const wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: "array" });
    const sheets = wb.SheetNames.map((n) => {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: false, defval: "" });
      return [n, { headers: (rows[0] || []).map(String), rows: rows.slice(1).filter((r) => r.some((c) => c !== "")).map((r) => r.map(String)) }];
    }).filter(([, t]) => t.headers.length || t.rows.length);
    if (!sheets.length) throw new Error("This workbook has no data.");
    if (target === "xlsx") return one(xlsxBlob(sheets), "xlsx");
    return sheets.map(([n, t]) => [sheets.length === 1 ? `${stem}.${target}` : `${stem}-${n.replace(/[^\w\- ]/g, "_")}.${target}`, writeTable(t, target, n)]);
  }
  if (fam === "subs") {
    const cues = parseCues(await text(file));
    if (!cues.length) throw new Error("No subtitle cues were found in this file.");
    return one(blobOf(writeCues(cues, target), "text/plain"), target);
  }
  if (fam === "audio" || fam === "video") {
    const buf = await decodeAudio(file);
    return one(target === "wav" ? wavBlob(buf) : await mp3Blob(buf, s.bitrate), target);
  }
  throw new Error("MyFile can't convert this file in the browser.");
}

