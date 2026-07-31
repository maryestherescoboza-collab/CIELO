const fs = require('node:fs');
const path = require('node:path');

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function inlineFormat(text) {
  let out = escapeHtml(text);
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return out;
}

function mdToHtml(markdown) {
  const lines = markdown.replace(/\r/g, '').split('\n');
  const html = [];
  let inCode = false;
  let inUl = false;
  let inOl = false;

  function closeLists() {
    if (inUl) {
      html.push('</ul>');
      inUl = false;
    }
    if (inOl) {
      html.push('</ol>');
      inOl = false;
    }
  }

  for (const rawLine of lines) {
    const line = rawLine;

    if (line.startsWith('```')) {
      closeLists();
      if (!inCode) {
        html.push('<pre><code>');
        inCode = true;
      } else {
        html.push('</code></pre>');
        inCode = false;
      }
      continue;
    }

    if (inCode) {
      html.push(`${escapeHtml(line)}\n`);
      continue;
    }

    if (/^\s*$/.test(line)) {
      closeLists();
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      closeLists();
      html.push('<hr/>');
      continue;
    }

    const h3 = line.match(/^###\s+(.*)$/);
    if (h3) {
      closeLists();
      html.push(`<h3>${inlineFormat(h3[1])}</h3>`);
      continue;
    }

    const h2 = line.match(/^##\s+(.*)$/);
    if (h2) {
      closeLists();
      html.push(`<h2>${inlineFormat(h2[1])}</h2>`);
      continue;
    }

    const h1 = line.match(/^#\s+(.*)$/);
    if (h1) {
      closeLists();
      html.push(`<h1>${inlineFormat(h1[1])}</h1>`);
      continue;
    }

    const ol = line.match(/^\d+\.\s+(.*)$/);
    if (ol) {
      if (inUl) {
        html.push('</ul>');
        inUl = false;
      }
      if (!inOl) {
        html.push('<ol>');
        inOl = true;
      }
      html.push(`<li>${inlineFormat(ol[1])}</li>`);
      continue;
    }

    const ul = line.match(/^-\s+(.*)$/);
    if (ul) {
      if (inOl) {
        html.push('</ol>');
        inOl = false;
      }
      if (!inUl) {
        html.push('<ul>');
        inUl = true;
      }
      html.push(`<li>${inlineFormat(ul[1])}</li>`);
      continue;
    }

    closeLists();
    html.push(`<p>${inlineFormat(line)}</p>`);
  }

  closeLists();
  if (inCode) html.push('</code></pre>');

  return html.join('\n');
}

function buildDocument(title, bodyHtml) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A4; margin: 16mm; }
    :root { color-scheme: light; }
    body {
      font-family: "Segoe UI", Arial, sans-serif;
      color: #1f2937;
      line-height: 1.45;
      font-size: 11.2pt;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    h1, h2, h3 { color: #111827; margin: 0 0 8px 0; page-break-after: avoid; }
    h1 { font-size: 22pt; margin-top: 6px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; }
    h2 { font-size: 15pt; margin-top: 18px; border-left: 4px solid #f59e0b; padding-left: 8px; }
    h3 { font-size: 12pt; margin-top: 12px; }
    p { margin: 0 0 6px 0; }
    ul, ol { margin: 0 0 8px 20px; padding: 0; }
    li { margin: 2px 0; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 10px 0; }
    code {
      font-family: Consolas, "Courier New", monospace;
      background: #f3f4f6;
      padding: 1px 4px;
      border-radius: 4px;
      font-size: 90%;
    }
    pre {
      background: #111827;
      color: #f9fafb;
      padding: 10px;
      border-radius: 8px;
      overflow-x: auto;
      white-space: pre-wrap;
      page-break-inside: avoid;
      margin: 0 0 10px 0;
    }
    pre code { background: transparent; padding: 0; color: inherit; }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

function main() {
  const [,, inputArg, outputArg] = process.argv;
  if (!inputArg || !outputArg) {
    console.error('Uso: node tools/md_to_print_html.js <input.md> <output.html>');
    process.exit(1);
  }

  const inputPath = path.resolve(process.cwd(), inputArg);
  const outputPath = path.resolve(process.cwd(), outputArg);
  const md = fs.readFileSync(inputPath, 'utf8');
  const body = mdToHtml(md);
  const title = path.basename(inputPath, path.extname(inputPath));
  const html = buildDocument(title, body);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, html, 'utf8');
  console.log(`HTML generado: ${outputPath}`);
}

main();

