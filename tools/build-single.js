// Butun ilovani BITTA HTML faylga yig'adi (CSS va barcha JS ichiga joylanadi).
//   node tools/build-single.js            → dist/Quritgich-aparat-AI.html   (mustaqil fayl: ikki marta bosib ochiladi)
//   node tools/build-single.js --artifact → dist/artifact.html               (claude.ai Artifact uchun: hujjat teglarisiz, CSP siz)
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), art = process.argv.includes('--artifact');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
let html = read('index.html');
const safeJs = s => s.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
html = html.replace(/<link rel="stylesheet" href="(css\/[^"]+)">/, (_, f) => '<style>\n' + read(f) + '\n</style>');
html = html.replace(/<script src="(js\/[^"]+)"><\/script>/g, (_, f) => '<script>\n' + safeJs(read(f)) + '\n</script>');
html = html.replace("script-src 'self'", "script-src 'unsafe-inline'");   // JS endi ichkarida (CSP faqat shu o'zgaradi)
if (/<script src=|<link rel="stylesheet"/.test(html)) throw new Error('tashqi fayl havolasi qoldi');
let out = html;
if (art) {
  const title = 'Quritgich aparat AI';
  const style = (html.match(/<style>[\s\S]*?<\/style>/) || [''])[0];
  const body = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'));
  out = '<title>' + title + '</title>\n' + style + '\n' + body.replace(style, '');
}
const dir = path.join(root, 'dist'); fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, art ? 'artifact.html' : 'Quritgich-aparat-AI.html');
fs.writeFileSync(file, out);
console.log(file, (Buffer.byteLength(out) / 1e6).toFixed(2) + ' MB');
