const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'),I18N=require('../js/i18n.js');
const src=['index.html','js/app.js','js/journal.js','js/pdf-quiz.js'].map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');
test('RU va EN lug‘atlari bir xil kalitlarga ega',()=>{
  const a=Object.keys(I18N.ru),b=Object.keys(I18N.en);
  assert.deepEqual(a.filter(x=>!b.includes(x)),[],'EN da yo‘q');assert.deepEqual(b.filter(x=>!a.includes(x)),[],'RU da yo‘q');
});
test('lug‘at kalitlari sahifa matnida mavjud (eskirgan tarjima yo‘q)',()=>{
  const miss=Object.keys(I18N.ru).filter(k=>!src.includes(k));assert.deepEqual(miss,[]);
});
test('tarjimalar bo‘sh emas',()=>{
  for(const l of ['ru','en'])for(const [k,v] of Object.entries(I18N[l]))assert.ok(v&&v.trim(),l+': '+k);
});
