// 构建脚本：template.html + app.js + terms.json → 自包含单文件 html
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const template = fs.readFileSync(path.join(dir, 'template.html'), 'utf8');
const appjs = fs.readFileSync(path.join(dir, 'app.js'), 'utf8');
const data = JSON.parse(fs.readFileSync(path.join(dir, 'terms.json'), 'utf8'));

// 公众号二维码：同目录存在 wx-qr.png / wx-qr.jpg 则 base64 内嵌，否则隐藏二维码位（no-qr）
let qrSrc = '';
let noQr = '';
let qrNote = '[无二维码图片]';
for (const ext of ['png', 'jpg']) {
  const qrPath = path.join(dir, 'wx-qr.' + ext);
  if (fs.existsSync(qrPath)) {
    const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
    qrSrc = 'data:' + mime + ';base64,' + fs.readFileSync(qrPath).toString('base64');
    qrNote = '[已内嵌二维码 ' + ext + ']';
    break;
  }
}
if (!qrSrc) noQr = 'no-qr ';

// 数据转义：内嵌进 <script type="application/json">，需要转义 </script>
const jsonStr = JSON.stringify(data).replace(/</g, '\\u003c');

const html = template
  .replace('class="wx-card"', 'class="' + noQr + 'wx-card"')
  .replace('__WXQR__', qrSrc)
  .replace('__DATA__', function () { return jsonStr; })
  .replace('</body>', '<script>\n' + appjs + '\n</script>\n</body>');

const outPath = path.join(dir, '计算机专业名词大全_工具站.html');
fs.writeFileSync(outPath, html, 'utf8');

console.log('构建完成:', outPath);
console.log('文件大小:', (fs.statSync(outPath).size / 1024).toFixed(1), 'KB');
console.log('二维码:', qrNote);
console.log('词条:', data.terms.length, '混淆组:', data.confusions.length);