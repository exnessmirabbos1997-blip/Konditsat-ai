const test=require('node:test'),assert=require('node:assert/strict');
const S=require('./load');
const cols=S.NEED_COLS.join(',');
const J=x=>JSON.parse(JSON.stringify(x));
const mk=(n,f)=>[cols,...Array.from({length:n},(_,i)=>f(i))].join('\n');
const good=i=>[1000+i%5,350,290,3100,6600,60,7,18,2.8].join(',');

test('CSV: ajratgichlar, qo‘shtirnoq, BOM, CRLF',()=>{
  assert.deepEqual(J(S.parseCsvText('a;b;c\r\n1;2;3\r\n')),[['a','b','c'],['1','2','3']]);
  assert.deepEqual(J(S.parseCsvText('a\tb\n1\t2')),[['a','b'],['1','2']]);
  assert.deepEqual(J(S.parseCsvText('﻿"TT01","TT02"\n"1,5","2"')),[['TT01','TT02'],['1,5','2']]);
  assert.deepEqual(J(S.parseCsvText('a,b\n"x ""q"" y","l1\nl2"\n')),[['a','b'],['x "q" y','l1\nl2']]);
  assert.deepEqual(J(S.parseCsvText('')),[]);assert.deepEqual(J(S.parseCsvText('\n\n')),[]);
});

test('CSV tekshiruvi: bo‘sh, qisqa, ustun yetishmasligi, matnli, manfiy',()=>{
  assert.match(S.validateTable([]),/bo‘sh/);
  assert.match(S.validateTable(S.parseCsvText(mk(30,good))),/Kamida 60/);
  assert.match(S.validateTable(S.parseCsvText('A,B\n'+Array(100).fill('1,2').join('\n'))),/Ustunlar yetishmaydi/);
  assert.match(S.validateTable(S.parseCsvText(mk(100,()=>'a,b,c,d,e,f,g,h,i'))),/raqamli emas/);
  assert.match(S.validateTable(S.parseCsvText(mk(100,()=>'1000,350,290,3100,6600,-60,7,18,2.8'))),/manfiy/);
  assert.equal(S.validateTable(S.parseCsvText(mk(100,good))),null);
  assert.equal(S.validateTable(S.parseCsvText(mk(100,good).replace(/,/g,';'))),null);
  assert.equal(S.validateTable(S.parseCsvText(mk(100,good).split('\n').map(l=>l.split(',').map(x=>'"'+x+'"').join(',')).join('\n'))),null);
});

const TYPES=['label','sensor','value','valve','wire','panel'];
test('sxema importi: XSS yuklamalari tozalanadi',()=>{
  const X='<img src=x onerror=alert(1)>',A='"><img src=x onerror=alert(2)>';
  const m=S.sanitizeMnemo([
    {t:'label',x:1,y:2,id:'z3'+A,p:{text:X,c:A,a:'start',fs:13}},
    {t:'sensor',x:1,y:2,id:'ok_1',p:{tag:X,rim:'red" onmouseover="alert(3)',var:'TT01'}},
    {t:'wire',id:'w',pts:[[1,'2'],['x',null]],p:{c:'red" onload="alert(4)',w:2,__proto__:{z:1}}},
    {t:'panel',x:'abc',id:'p',p:{kind:X,w:100}}],TYPES);
  assert.ok(Array.isArray(m)&&m.length===4);
  for(const o of m){assert.match(o.id,/^[A-Za-z0-9_-]+$/);for(const [k,v] of Object.entries(o.p))if(typeof v==='string'&&!['text','label','tag','unit'].includes(k))assert.match(v,/^[#\w(),.%\s-]*$/)}
  assert.deepEqual(J(m[2].pts),[[1,2],[0,0]]);assert.equal(m[3].x,0);
  assert.deepEqual(Object.keys(m[2].p),['w']);assert.equal(m[2].p.z,undefined);
});

test('sxema importi: noto‘g‘ri tur/format rad etiladi, id lar noyob',()=>{
  assert.equal(S.sanitizeMnemo([{t:'evil'}],TYPES),null);
  assert.equal(S.sanitizeMnemo('x',TYPES),null);assert.equal(S.sanitizeMnemo([],TYPES),null);assert.equal(S.sanitizeMnemo([null],TYPES),null);
  const m=S.sanitizeMnemo([{t:'label',id:'a',x:1,y:1,p:{}},{t:'label',id:'a',x:2,y:2,p:{}}],TYPES);
  assert.notEqual(m[0].id,m[1].id);
});

test('CSS: yalang‘och <main> qoidasi yo‘q (landmark maketni buzmasin)',()=>{
  const css=require('fs').readFileSync(require('path').join(__dirname,'..','css','style.css'),'utf8');
  assert.ok(!/(^|[}\s,])main\s*\{/.test(css),'css da yalang‘och main{...} qoidasi bor');
});
