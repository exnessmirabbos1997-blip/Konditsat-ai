// ===== Hodisalar jurnali: PLC / AI / tizim voqealari, operator tasdiqlashi (ACK), CSV eksport =====
(function(){
const LV={t:['Kritik','var(--trip)'],w:['Ogohlantirish','var(--warn)'],d:['Diagnostika','var(--diag)'],i:['Ma’lumot','var(--gray)']};
const SRC={plc:'PLC',ai:'AI',truth:'Simulyatsiya',hidden:'Zaxira himoya'};
let mem=new Set(),jSig='';
const store=()=>{try{return JSON.parse(localStorage.getItem('qj_ack')||'[]')}catch(e){return null}};
const loadAck=()=>{const a=store();mem=new Set(a||[...mem])};
const saveAck=()=>{try{localStorage.setItem('qj_ack',JSON.stringify([...mem].slice(-2000)))}catch(e){}};
const tt=s=>window.tr?tr(s):s;
function scope(){return (mode==='csv'?'csv:'+(window.__csvName||''):$('kind').value+'#'+$('seed').value)+'|'+(+P.sev||0)+'|'+(+P.noise||1)}
function events(k){
  if(!cur)return [];const run=cur.run,a=cur.e.a,out=[];const add=(kk,pri,src,txt)=>{if(kk>=0&&kk<=k)out.push({k:kk,pri,src,txt})};
  for(const v of run.ev){
    if(v.src==='truth')add(v.k,'i','truth','Haqiqiy sabab (faqat simulyatsiyada ma’lum): '+(CAUSE[v.code]||v.code));
    else if(v.src==='hidden')add(v.k,'t','hidden',EV[v.j].name+' — '+EV[v.j].act);
    else if(v.code==='trip')add(v.k,'t','plc',EV[v.j].name+': '+EV[v.j].act);
    else if(IL[v.code])add(v.k,'t','plc',IL[v.code]);
  }
  add(a.alarm,'w','plc','PLC alarmi: o‘lchov H (ogohlantirish) chegarasidan o‘tdi.');
  add(a.warn,'w','ai','AI xavf indeksi R ≥ R* ('+fmt(P.RTH,2)+') ketma-ket 3 o‘lchovda — ogohlantirish.');
  add(a.diag,'d','ai','AI diagnostika: fizik izchillik qoldig‘i chegaradan o‘tdi.');
  if(cur.dg&&cur.dg.code!=='none')add(cur.dg.k,'d','ai','AI tashxisi: '+(CAUSE[cur.dg.code]||cur.dg.code));
  out.sort((x,y)=>x.k-y.k||'twdi'.indexOf(x.pri)-'twdi'.indexOf(y.pri));
  const sc=scope();out.forEach(e=>{e.id=sc+'|'+e.k+'|'+e.src+'|'+e.txt.slice(0,40);e.ack=mem.has(e.id)});return out;
}
function badge(list){const n=list.filter(e=>!e.ack&&(e.pri==='t'||e.pri==='w')).length;document.querySelectorAll('.bdg').forEach(b=>{b.textContent=n;b.classList.toggle('on',n>0)});return n}
function draw(list){
  const un=list.filter(e=>!e.ack&&e.pri!=='i').length;
  $('jInfo').textContent=list.length?(tt('Voqealar')+': '+list.length+' · '+tt('tasdiqlanmagan')+': '+un):tt('Hozircha voqea yo‘q.');
  $('jTab').className='jt';
  $('jTab').innerHTML='<caption class="sr">'+tt('Hodisalar jurnali')+'</caption><tr><th scope="col" class="pr">'+tt('Vaqt, min')+'</th><th scope="col">'+tt('Daraja')+'</th><th scope="col">'+tt('Manba')+'</th><th scope="col">'+tt('Voqea')+'</th><th scope="col" class="pr">'+tt('Holat')+'</th></tr>'+
   list.map((e,i)=>`<tr class="${e.ack?'ak':(e.pri==='t'?'un':'')}"><td class="pr">${fmt(e.k*P.dt,1)}</td><td><span class="lv" style="background:${LV[e.pri][1]}">${tt(LV[e.pri][0])}</span></td><td>${tt(SRC[e.src])}</td><td>${esc(e.txt)}</td><td class="pr">${e.pri==='i'?'—':e.ack?'✓ '+tt('Tasdiqlandi'):`<button class="sec" data-i="${i}">${tt('Tasdiqlash')}</button>`}</td></tr>`).join('');
  $('jTab').querySelectorAll('button[data-i]').forEach(b=>b.onclick=()=>{mem.add(list[+b.dataset.i].id);saveAck();refresh(true)});
}
function refresh(force){
  if(!cur)return;const k=timeK(),list=events(k);badge(list);
  if(!$('v-journal').classList.contains('on'))return;
  const sig=list.map(e=>e.id+e.ack).join('~')+(window.LANG||'');if(!force&&sig===jSig)return;jSig=sig;draw(list);
}
$('jAck').onclick=()=>{events(timeK()).forEach(e=>mem.add(e.id));saveAck();refresh(true)};
$('jClr').onclick=()=>{const sc=scope();[...mem].forEach(x=>{if(x.startsWith(sc))mem.delete(x)});saveAck();refresh(true)};
$('jCsv').onclick=()=>{const L=events(timeK()),q=s=>'"'+String(s).replace(/"/g,'""')+'"';
  const csv='﻿'+['Vaqt_min;Daraja;Manba;Voqea;Tasdiqlangan'].concat(L.map(e=>[fmt(e.k*P.dt,1),LV[e.pri][0],SRC[e.src],q(e.txt),e.ack?'ha':'yo‘q'].join(';'))).join('\n');
  download('hodisalar_jurnali.csv',new TextEncoder().encode(csv),'text/csv')};
loadAck();
const _r=render;render=function(){_r.apply(this,arguments);try{refresh(false)}catch(e){console.error(e)}};
window.__journal={refresh:()=>refresh(true),events};
if(cur)refresh(true);
})();
