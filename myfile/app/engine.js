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
    add("docx", "Word", "editable text; layout not kept", "Document");
    add("html", "HTML", "a web page of the text", "Document");
    add("txt", "Text", "the PDF's text", "Document");
    add("md", "Markdown", "the PDF's text", "Document");
    add("png", "PNG", "one image per page", "Image", ["size"]);
    add("jpg", "JPG", "one image per page", "Image", ["quality", "size"]);
  } else if (fam === "docx") {
    add("txt", "Text", null, "Document"); add("md", "Markdown", null, "Document"); add("html", "HTML", null, "Document"); add("pdf", "PDF", "text and headings", "Document");
  } else if (fam === "text") {
    for (const [id, l] of [["pdf", "PDF"], ["docx", "Word"], ["html", "HTML"], ["txt", "Text"], ["md", "Markdown"]]) {
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

/* ---------- Word (.docx) writer, and PDF text -> paragraphs ---------- */
const xmlText = (s) => String(s)
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "")
  .replace(/\t/g, " ").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
function docxPara(style, t) {
  const ppr = style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : "";
  return `<w:p>${ppr}<w:r><w:t xml:space="preserve">${xmlText(t)}</w:t></w:r></w:p>`;
}
/* sections: arrays of blocks; a page break separates sections. */
async function docxBlob(sections, title) {
  let body = "";
  sections.forEach((blocks, i) => {
    if (i > 0) body += `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
    for (const b of blocks) {
      if (b.kind === "h") body += docxPara(`Heading${Math.min(3, Math.max(1, b.level))}`, b.text);
      else if (b.kind === "li") body += docxPara("ListParagraph", "•  " + b.text);
      else if (b.kind === "code") b.text.split("\n").forEach((l) => (body += docxPara("Code", l)));
      else if (b.kind === "hr") body += `<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="auto"/></w:pBdr></w:pPr></w:p>`;
      else body += docxPara(null, b.text);
    }
  });
  const head = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`;
  const heading = (n, sz, lvl, before, after) => `<w:style w:type="paragraph" w:styleId="Heading${n}"><w:name w:val="heading ${n}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="${before}" w:after="${after}"/><w:outlineLvl w:val="${lvl}"/></w:pPr><w:rPr><w:b/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr></w:style>`;
  const zip = new JSZip();
  zip.file("[Content_Types].xml", head + `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`);
  zip.file("_rels/.rels", head + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`);
  zip.file("word/_rels/document.xml.rels", head + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  zip.file("word/styles.xml", head + `<w:styles xmlns:w="${W_NS}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>${heading(1, 36, 0, 240, 120)}${heading(2, 28, 1, 200, 80)}${heading(3, 24, 2, 160, 60)}<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="60"/><w:ind w:left="360" w:hanging="360"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/><w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr></w:style></w:styles>`);
  zip.file("word/document.xml", head + `<w:document xmlns:w="${W_NS}"><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`);
  zip.file("docProps/core.xml", head + `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${xmlText(title)}</dc:title><dc:creator>MyFile</dc:creator></cp:coreProperties>`);
  return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", compression: "DEFLATE" });
}

/* Rebuild paragraphs from a PDF page's lines (same rules as the desktop app):
   a line that doesn't end a sentence continues into the next; short lines
   without end punctuation between sentences are headings; bullets and "1."
   start list items. */
function pdfPageBlocks(lines, firstPage) {
  lines = lines.map((l) => l.trim()).filter(Boolean);
  const endsSentence = (l) => /[.!?:;]$|\.[")]$/.test(l);
  const bullet = (l) => {
    const m = l.match(/^[•▪●\-*–][  ]+(.+)$/);
    if (m) return m[1];
    if (/^\d{1,2}[.)] /.test(l)) return l;
    return null;
  };
  const headingish = (l) => l.length <= 60 && l.split(/\s+/).length <= 8 && !l.includes(". ") && !/[.,;!?]$/.test(l) && /^[\p{Lu}\d]/u.test(l);
  const blocks = [];
  let cur = null, prevEnded = true;
  const flush = () => { if (cur) blocks.push(cur); cur = null; };
  lines.forEach((l, i) => {
    const next = lines[i + 1];
    const item = bullet(l);
    if (item !== null) { flush(); cur = { kind: "li", text: item }; prevEnded = endsSentence(l); return; }
    const nextStartsNew = next === undefined || /^[\p{Lu}\d•\-*]/u.test(next);
    const isHeading = prevEnded && headingish(l) && nextStartsNew;
    if (isHeading && cur && cur.kind === "h") cur.text += " " + l;
    else if (isHeading) { flush(); cur = { kind: "h", level: firstPage && !blocks.length ? 1 : 2, text: l }; }
    else if (cur && (cur.kind === "p" || cur.kind === "li") && !prevEnded) {
      if (cur.text.endsWith("-") && /^\p{Ll}/u.test(l)) cur.text = cur.text.slice(0, -1) + l;
      else cur.text += " " + l;
    } else { flush(); cur = { kind: "p", text: l }; }
    prevEnded = isHeading ? true : endsSentence(l);
  });
  flush();
  return blocks;
}
async function pdfPageLines(file) {
  const pdf = await openPdf(file);
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const content = await (await pdf.getPage(i)).getTextContent();
    let t = "";
    for (const it of content.items) t += it.str + (it.hasEOL ? "\n" : " ");
    pages.push(t.split("\n"));
    progress(i / pdf.numPages);
  }
  return pages;
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
    else if (p.getElementsByTagNameNS(W, "numPr").length || style.includes("list")) blocks.push({ kind: "li", text: t.replace(/^[\u2022*-][\s\u00A0]*/, "") });
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
    if (target === "png" || target === "jpg") return pdfToImages(file, target, s, stem);
    const pages = (await pdfPageLines(file)).map((lines, i) => pdfPageBlocks(lines, i === 0));
    if (pages.every((p) => !p.length)) throw new Error("This PDF has no text to put in a document. (Scanned pages are pictures; try PNG or JPG.)");
    if (target === "docx") return one(await docxBlob(pages, stem), "docx");
    const all = pages.flatMap((p, i) => (i ? [{ kind: "hr" }, ...p] : p));
    if (target === "html") return one(blobOf(htmlPage(stem, blocksToHtml(all)), "text/html"), "html");
    return one(blobOf(blocksToMarkdown(all), "text/markdown"), "md");
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
    if (target === "docx") return one(await docxBlob([blocks], stem), "docx");
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


/* ---------- Folder report: every file, its details and contents, as one file ---------- */
const REPORT_MAX_ROWS = 500, REPORT_MAX_FILE_CHARS = 200000, REPORT_MAX_LISTED = 300;
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const lineCount = (t) => plural(t.trimEnd().split("\n").length, "line");
const localDate = (ms) => new Date(ms).toLocaleDateString("en-CA");
/* A table as aligned monospace lines (reads the same in Word, PDF and Markdown). */
function tableCode(t) {
  const cell = (c) => { c = String(c).replace(/[\r\n\t]/g, " "); return c.length > 30 ? c.slice(0, 29) + "…" : c; };
  const rows = [t.headers, ...t.rows.slice(0, REPORT_MAX_ROWS)].map((r) => r.map(cell));
  const cols = Math.max(0, ...rows.map((r) => r.length));
  if (!cols) return [];
  const w = [...Array(cols)].map((_, i) => Math.max(...rows.map((r) => (r[i] ?? "").length)));
  const line = (r) => w.map((n, i) => (r[i] ?? "").padEnd(n)).join(" | ").trimEnd();
  const out = [{ kind: "code", text: [line(rows[0]), w.map((n) => "-".repeat(n)).join("-+-"), ...rows.slice(1).map(line)].join("\n") }];
  if (t.rows.length > REPORT_MAX_ROWS) out.push({ kind: "p", text: `…and ${t.rows.length - REPORT_MAX_ROWS} more rows.` });
  return out;
}
/* Length (and picture size) of a recording, from the browser's media element. */
function mediaDetails(file, video) {
  return new Promise((resolve) => {
    const m = document.createElement(video ? "video" : "audio");
    const url = URL.createObjectURL(file);
    const done = (v) => { clearTimeout(timer); URL.revokeObjectURL(url); m.removeAttribute("src"); resolve(v); };
    const timer = setTimeout(() => done(null), 8000);
    m.preload = "metadata";
    m.onloadedmetadata = () => done({ seconds: isFinite(m.duration) ? m.duration : null, w: m.videoWidth || 0, h: m.videoHeight || 0 });
    m.onerror = () => done(null);
    m.src = url;
  });
}
const clock = (s) => {
  s = Math.round(s);
  const mm = String(Math.floor(s / 60) % 60).padStart(2, "0"), ss = String(s % 60).padStart(2, "0");
  return s >= 3600 ? `${Math.floor(s / 3600)}:${mm}:${ss}` : `${Math.floor(s / 60)}:${ss}`;
};
async function pptxBlocks(file) {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const slides = Object.keys(zip.files).map((n) => [Number((n.match(/^ppt\/slides\/slide(\d+)\.xml$/) || [])[1]), n]).filter(([n]) => n).sort((a, b) => a[0] - b[0]);
  const blocks = [];
  for (const [num, name] of slides) {
    const xml = new DOMParser().parseFromString(await zip.file(name).async("string"), "application/xml");
    blocks.push({ kind: "h", level: 2, text: `Slide ${num}` });
    for (const p of xml.getElementsByTagNameNS("http://schemas.openxmlformats.org/drawingml/2006/main", "p")) {
      const t = [...p.getElementsByTagNameNS("http://schemas.openxmlformats.org/drawingml/2006/main", "t")].map((n) => n.textContent).join("").trim();
      if (t) blocks.push({ kind: "p", text: t });
    }
  }
  return blocks;
}
async function readForReport(file, rel) {
  const ext = (file.name.includes(".") ? file.name.split(".").pop() : "").toLowerCase();
  const fmt = detect(file), fam = fmt ? FORMATS[fmt][0] : null;
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const label = fmt ? cap(FORMATS[fmt][1]) : ext === "pptx" ? "PowerPoint presentation" : ext === "zip" ? "ZIP archive" : ext ? `${ext.toUpperCase()} file` : "File";
  const e = { path: rel, label, size: file.size, modified: file.lastModified, fam, details: [], blocks: [], note: null };
  try {
    if (!file.size) e.note = "Empty file.";
    else if (fam === "pdf") {
      const pages = await pdfPageLines(file);
      e.details.push(plural(pages.length, "page"));
      e.blocks = pages.flatMap((l, i) => pdfPageBlocks(l, i === 0));
      if (!e.blocks.length) e.note = "Scanned pages with no text layer. (The desktop app can read them with OCR.)";
    } else if (fam === "docx") e.blocks = await docxBlocks(file);
    else if (fam === "text") {
      const t = await text(file);
      e.blocks = fmt === "md" ? markdownBlocks(t) : fmt === "html" ? htmlBlocks(t) : textBlocks(t);
    } else if (fam === "table") {
      const t = parseDelimited(await text(file), fmt === "tsv" ? "\t" : ",");
      e.details.push(plural(t.rows.length, "row"));
      e.blocks = tableCode(t);
    } else if (fam === "data") {
      const t = await text(file);
      e.details.push(lineCount(t));
      e.blocks = [{ kind: "code", text: t.trimEnd() }];
    } else if (fam === "sheet") {
      const wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: "array" });
      e.details.push(plural(wb.SheetNames.length, "sheet"));
      for (const n of wb.SheetNames) {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: false, defval: "" });
        const t = { headers: (rows[0] || []).map(String), rows: rows.slice(1).filter((r) => r.some((c) => c !== "")).map((r) => r.map(String)) };
        e.blocks.push({ kind: "h", level: 3, text: `Sheet: ${n}` }, ...tableCode(t));
      }
    } else if (fam === "subs") {
      const t = writeCues(parseCues(await text(file)), "txt");
      e.details.push(lineCount(t));
      e.blocks = textBlocks(t);
    } else if (fam === "image") {
      const img = await loadImage(file);
      e.details.push(`${img.naturalWidth} × ${img.naturalHeight} pixels`);
    } else if (fam === "audio" || fam === "video") {
      const m = await mediaDetails(file, fam === "video");
      if (m && m.seconds) e.details.push(`${clock(m.seconds)} long`);
      if (m && m.w) e.details.push(`${m.w} × ${m.h} video`);
    } else if (ext === "pptx") {
      e.blocks = await pptxBlocks(file);
      e.details.push(plural(e.blocks.filter((b) => b.kind === "h").length, "slide"));
    } else if (ext === "zip") {
      const names = Object.values((await JSZip.loadAsync(await file.arrayBuffer())).files).filter((f) => !f.dir).map((f) => f.name);
      e.details.push(`${plural(names.length, "file")} inside`);
      e.blocks = names.slice(0, REPORT_MAX_LISTED).map((n) => ({ kind: "li", text: n }));
      if (names.length > REPORT_MAX_LISTED) e.blocks.push({ kind: "p", text: `…and ${names.length - REPORT_MAX_LISTED} more.` });
    } else {
      // Unknown type: include it if it's text (source code, logs, configs).
      const head = new Uint8Array(await file.slice(0, 8192).arrayBuffer());
      let ok = !head.includes(0);
      try { if (ok) new TextDecoder("utf-8", { fatal: true }).decode(head, { stream: true }); } catch { ok = false; }
      if (!ok) e.note = "MyFile can't read inside this kind of file.";
      else {
        const t = (await file.slice(0, 2 * 1024 * 1024).text()).trimEnd();
        e.label = ext ? `Text file (.${ext})` : "Text file";
        e.details.push(lineCount(t));
        e.blocks = [{ kind: "code", text: t }];
      }
    }
  } catch (err) {
    e.blocks = [];
    e.note = err && err.message ? err.message : String(err);
  }
  let total = 0;
  const cut = e.blocks.findIndex((b) => (total += (b.text || "").length) > REPORT_MAX_FILE_CHARS);
  if (cut >= 0) e.blocks = [...e.blocks.slice(0, cut), { kind: "p", text: `(MyFile kept the first ${REPORT_MAX_FILE_CHARS.toLocaleString()} characters of this file.)` }];
  e.words = e.blocks.reduce((s, b) => s + (b.text || "").split(/\s+/).filter(Boolean).length, 0);
  return e;
}
/* items: [{ file, rel }]. onStep(done, total, rel) reports progress. */
async function buildReport(items, name, onStep = () => {}) {
  const entries = [];
  const saved = progress;
  progress = () => {};
  try {
    for (const [i, it] of items.entries()) {
      onStep(i, items.length, it.rel);
      await tick();
      entries.push(await readForReport(it.file, it.rel));
    }
  } finally { progress = saved; }
  onStep(items.length, items.length, null);
  entries.sort((a, b) => a.path.toLowerCase().localeCompare(b.path.toLowerCase()));
  const notes = [];
  const media = entries.filter((e) => e.fam === "image" || e.fam === "audio" || e.fam === "video").length;
  if (media) notes.push(`${media} ${media === 1 ? "image or recording" : "images or recordings"}: only details are listed. The desktop app also reads text in pictures (OCR) and transcribes recordings.`);
  return { name, created: Date.now(), entries, notes };
}
function reportParts(r) {
  const meta = (e) => [e.label, ...e.details, size(e.size), `modified ${localDate(e.modified)}`].join(" · ");
  // A file's headings go under its own heading: its top level becomes 3.
  const demote = (blocks) => {
    const levels = blocks.filter((b) => b.kind === "h").map((b) => b.level);
    const top = levels.length ? Math.min(...levels) : 1;
    return blocks.map((b) => (b.kind === "h" ? { ...b, level: Math.min(6, b.level - top + 3) } : b));
  };
  const total = r.entries.reduce((s, e) => s + e.size, 0);
  const read = r.entries.filter((e) => e.blocks.length).length;
  const overview = [
    { kind: "h", level: 1, text: r.name },
    { kind: "p", text: `${plural(r.entries.length, "file")} (${size(total)}). MyFile read the contents of ${read} of them on ${localDate(r.created)}.` },
    ...r.notes.map((n) => ({ kind: "li", text: n })),
    { kind: "h", level: 2, text: "Files" },
    ...r.entries.map((e) => ({ kind: "li", text: `${e.path}: ${meta(e)}` })),
  ];
  const parts = r.entries.map((e) => [{ kind: "h", level: 2, text: e.path }, { kind: "p", text: meta(e) }, ...(e.note ? [{ kind: "p", text: e.note }] : []), ...demote(e.blocks)]);
  return [overview, parts];
}
/* target: docx, pdf, md, html, txt, json, or csv (the file list). */
async function renderReport(r, target) {
  const [overview, parts] = reportParts(r);
  const all = [...overview, ...parts.flatMap((p) => [{ kind: "hr" }, ...p])];
  switch (target) {
    case "docx": return docxBlob([overview, parts.flat()], r.name);
    case "pdf": return blocksToPdf(all);
    case "md": return blobOf(blocksToMarkdown(all), "text/markdown");
    case "html": return blobOf(htmlPage(r.name, blocksToHtml(all)), "text/html");
    case "txt": return blobOf(blocksToText(all), "text/plain");
    case "json": {
      const files = r.entries.map((e) => ({ path: e.path, type: e.label, sizeBytes: e.size, modified: localDate(e.modified), details: e.details, words: e.words, note: e.note, text: e.blocks.length ? blocksToText(e.blocks) : "" }));
      return blobOf(JSON.stringify({ folder: r.name, created: localDate(r.created), notes: r.notes, files }, null, 2) + "\n", "application/json");
    }
    case "csv": {
      const rows = r.entries.map((e) => [e.path, e.label, String(e.size), localDate(e.modified), e.details.join("; "), String(e.words), e.note || ""]);
      return blobOf(writeDelimited({ headers: ["path", "type", "size_bytes", "modified", "details", "words", "note"], rows }, ","), "text/csv");
    }
  }
  throw new Error("MyFile can't save a folder report in that format.");
}
