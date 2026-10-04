const $=id=>document.getElementById(id);
const fmt=(x,d=1)=>Number(x).toFixed(d).replace('.',',');
const nb=(v,d)=>isFinite(v)?fmt(v,d):'—';
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const tick=()=>new Promise(r=>setTimeout(r,0));
const esc=t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const XN=['Chegaraga yaqinlik (x₁)','Hodisagacha vaqt (x₂)','Anomaliya (x₃)','O‘lchovlar izchilligi (x₄)'];
const RES=['TT02 ↔ aralashma modeli','FT01 ↔ gaz klapani 1-2','FT02 ↔ havo klapani 1-1','WT ↔ shnek M01','M02 tezligi','Bunker massa balansi','Kirish namligi AT01'];
const PDEF=plantDefaults();
let P={...PDEF},model=null,simModel=null,cur=null,prog=0,hover=-1,timer=null,mode='sim',lastBatch=null,working=false,geo=null,lastW=0;
for(const k in KINDS){const o=document.createElement('option');o.value=k;o.textContent=KINDS[k];$('kind').appendChild(o)}$('kind').value='f4';
function readP(){const raw=[1,2,3,4].map(i=>+$('w'+i).value);let s=raw.reduce((a,b)=>a+b,0);if(!(s>0)){raw.splice(0,4,...PDEF.w);raw.forEach((x,i)=>$('w'+(i+1)).value=x);s=1;$('status').textContent='Barcha vaznlar 0 bo‘lishi mumkin emas — standart vaznlar tiklandi.'}P.w=raw.map(x=>x/s);raw.forEach((x,i)=>$('w'+(i+1)+'v').textContent=fmt(P.w[i],2));
  P.RTH=+$('rth').value;$('rthv').textContent=fmt(P.RTH,2);P.sev=+$('sev').value;$('sevv').textContent=P.sev>0?fmt(P.sev,2):'tasodifiy';P.noise=+$('noise').value;$('noisev').textContent='×'+fmt(P.noise,2)}
function readPlant(){const g=(id,def,lo,hi)=>{let v=parseFloat($(id).value);if(!isFinite(v))v=def;v=clip(v,lo,hi);$(id).value=v;return v};   // chegaradan tashqari qiymat qirqiladi va maydonda ko‘rsatiladi
  P.sp=g('pSP',PDEF.sp,150,390);P.Fin=g('pFin',PDEF.Fin,0.5,15);P.uM01=g('pM01',PDEF.uM01,5,100);P.uM02=g('pM02',PDEF.uM02,5,100);P.u3=g('pU3',PDEF.u3,0,100);
  P.win=g('pWin',PDEF.win,1,40);P.Mb=g('pMb',PDEF.Mb,5,200);P.Th=g('pTh',PDEF.Th,5,120);P.Tresp=g('pTresp',PDEF.Tresp,1,60)}
// ---------- grafik ----------
function setup(cv){const r=Math.min(devicePixelRatio||1,3),h=+(cv.dataset.h||(cv.dataset.h=cv.getAttribute('height')));cv.style.height=h+'px';const w=cv.clientWidth;cv.width=Math.round(w*r);cv.height=Math.round(h*r);const g=cv.getContext('2d');g.setTransform(r,0,0,r,0,0);return {g,w,h}}
function draw(cv,o){
  const {g,w,h}=setup(cv);const m={l:46,r:10,t:8,b:22};const pw=w-m.l-m.r,ph=h-m.t-m.b;
  const T=o.ys[0].y.length,dt=P.dt,tm=(T-1)*dt;const X=k=>m.l+pw*k/(T-1),Y=v=>m.t+ph*(1-(v-o.min)/(o.max-o.min));
  g.font='12px "Segoe UI",sans-serif';g.lineWidth=1;g.strokeStyle=css('--line');g.fillStyle=css('--mut');g.textAlign='right';g.textBaseline='middle';
  for(let i=0;i<=4;i++){const v=o.min+(o.max-o.min)*i/4,y=Y(v);g.beginPath();g.moveTo(m.l,y);g.lineTo(w-m.r,y);g.stroke();g.fillText(fmt(v,o.dec),m.l-6,y)}
  g.textAlign='center';g.textBaseline='top';const nt=w<520?4:8;
  for(let i=0;i<=nt;i++){const k=(T-1)*i/nt,mins=tm*i/nt;g.fillText(fmt(mins,0)+' min',Math.min(Math.max(X(k),m.l+14),w-m.r-18),h-m.b+5)}
  for(const l of o.lines){if(!isFinite(l.v)||l.v<o.min||l.v>o.max)continue;g.strokeStyle=l.c;g.setLineDash(l.dash||[5,4]);g.beginPath();g.moveTo(m.l,Y(l.v));g.lineTo(w-m.r,Y(l.v));g.stroke();g.setLineDash([]);g.fillStyle=l.c;g.textAlign=l.r?'right':'left';g.textBaseline='bottom';g.fillText(l.t,l.r?w-m.r-6:m.l+6,Y(l.v)-2)}
  for(const v of o.vl){if(v.k<0||v.k>=T)continue;g.strokeStyle=v.c;g.setLineDash(v.dash||[]);g.lineWidth=v.wd||1;g.beginPath();g.moveTo(X(v.k),m.t);g.lineTo(X(v.k),h-m.b);g.stroke();g.setLineDash([]);g.lineWidth=1}
  const n=Math.min(prog+1,T);
  for(const s of o.ys){g.strokeStyle=s.c;g.lineWidth=s.wd||1.6;g.globalAlpha=s.a||1;g.setLineDash(s.dash||[]);g.beginPath();let pen=false;
    for(let k=0;k<n;k++){const v=s.y[k];if(!isFinite(v)){pen=false;continue}const y=Y(clip(v,o.min,o.max));if(pen)g.lineTo(X(k),y);else{g.moveTo(X(k),y);pen=true}}g.stroke();g.globalAlpha=1;g.setLineDash([])}
  g.lineWidth=1;
  if(hover>=0&&hover<n){g.strokeStyle=css('--ink');g.globalAlpha=.4;g.beginPath();g.moveTo(X(hover),m.t);g.lineTo(X(hover),h-m.b);g.stroke();g.globalAlpha=1;
    const v=o.ys[0].y[hover];g.fillStyle=css('--ink');g.textAlign=X(hover)>w/2?'right':'left';g.textBaseline='top';g.fillText(nb(v,o.dec)+' | '+fmt(hover*dt,1)+' min',X(hover)+(X(hover)>w/2?-6:6),m.t+2)}
  return {m,pw,T};
}
const timeK=()=>{const T=cur.run.d.TT01.length;return hover>=0?hover:Math.min(prog,T-1)};
// ================== VEKTOR MNEMOSXEMA (to'liq tahrirlanadigan) ==================
// Har bir uskuna alohida obyekt: {id,t:turi,x,y,r:burchak,s:masshtab,p:{xususiyatlar}}; quvur/sim: {id,t,pts:[[x,y],..],p}
const VM={model:null,edit:false,sel:null,undo:[],redo:[],mode:null,draft:null,grid:5,rt:[],ctx:null,built:false,W:1289,H:807};
const VM_KEY='quritgich_mnemo_v4';
const r2=v=>Math.round(v*100)/100;
let vmSeq=1;const vmId=()=>'o'+Date.now().toString(36).slice(-5)+(vmSeq++);
const xa=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const FONT='Segoe UI,Roboto,Arial,sans-serif';
// oqim manbalari (animatsiya qaysi jarayon holatiga bog'lanadi)
const FLOWS=[['gas','Gaz (FT01)'],['air1','Birlamchi havo (FT02)'],['air2','Ikkilamchi havo (FT03)'],['hot','Issiq agent'],['conv1','Nam material konveyeri'],['screw','Shnek M01'],['feed','Quritgichga ta’minot'],['dry','Quritgich'],['dust','Changli gaz'],['prod','Tayyor mahsulot'],['fan','Ventilyator'],['mix','Aralashtirgich M02'],['on','Doim ishlaydi'],['off','To‘xtagan']];
// o'lchov o'zgaruvchilari
const MVARS=[['','—'],['TT01','TT01 o‘txona harorati, °C'],['TT02','TT02 agent harorati, °C'],['FT01','FT01 gaz, m³/soat'],['FT02','FT02 birlamchi havo'],['FT03','FT03 ikkilamchi havo'],['LT01','LT01 bunker sathi, %'],['WT','WT tarozi, t/soat'],['AT01','AT01 kirish namligi, %'],['AT02','AT02 mahsulot namligi, %'],['M01','M01 shnek tezligi, %'],['M02','M02 aralashtirgich, %'],['U11','Klapan 1-1, %'],['U12','Klapan 1-2, %'],['U13','Klapan 1-3, %'],['LAM','λ havo/gaz']];
const MATS=[['gas','Gaz'],['air','Havo'],['hot','Issiq agent'],['wet','Nam material'],['dry','Quruq mahsulot'],['dust','Chang'],['smoke','Tutun / ishlatilgan agent'],['water','Suv / suyuqlik'],['none','Oqimsiz']];
const PKINDS={gas:['#e6c24c','#fff2b0'],air:['#3b82e6','#b3d8ff'],hot:['#9aa2aa','#ffffff'],metal:['#a9b0b7','#f4f6f8'],copper:['#c7975a','#f7dfb4'],water:['#2e9fd0','#bfeaff'],dark:['#59616a','#b9c0c7']};
function vmAlarm(v,c){if(!v||!c)return '';const d=c.d,k=c.k,P=c.P,x=v==='LAM'?d.LAM[k]:d[v]?d[v][k]:NaN;if(!isFinite(x))return '';
  switch(v){case 'TT01':return x>=1180?'trip':x>=1120?'warn':'';case 'TT02':return x>=400?'trip':x>=380?'warn':'';
   case 'LAM':return !d.burner[k]?'':x<=0.95?'trip':x<=1.05?'warn':'';case 'LT01':return x<=5||x>=95?'trip':(x<=15||x>=85)?'warn':'';
   case 'AT02':return x>=8?'trip':x>=6?'warn':'';case 'M02':return x<P.uM02*0.8?'warn':'';case 'WT':return x<P.Fin*0.5?'warn':'';case 'M01':return d.feeder&&!d.feeder[k]?'trip':'';}return ''}
function vmVal(v,c){if(!v||!c)return NaN;const d=c.d,k=c.k;if(v==='LAM')return c.d.burner[k]?d.LAM[k]:NaN;return d[v]?+d[v][k]:NaN}
const VM_DEFS=`<defs>
<linearGradient id="gMV" x1="0" x2="1"><stop offset="0" stop-color="#6f777f"/><stop offset=".28" stop-color="#eef1f4"/><stop offset=".62" stop-color="#c3c9cf"/><stop offset="1" stop-color="#666e76"/></linearGradient>
<linearGradient id="gMH" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6f777f"/><stop offset=".3" stop-color="#eef1f4"/><stop offset=".65" stop-color="#bfc5cb"/><stop offset="1" stop-color="#5f676f"/></linearGradient>
<linearGradient id="gCuV" x1="0" x2="1"><stop offset="0" stop-color="#6a4a22"/><stop offset=".3" stop-color="#f3d9a8"/><stop offset=".65" stop-color="#c79a5c"/><stop offset="1" stop-color="#5e4020"/></linearGradient>
<linearGradient id="gBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16348a"/><stop offset=".35" stop-color="#5b8dff"/><stop offset=".7" stop-color="#2451c9"/><stop offset="1" stop-color="#12296e"/></linearGradient>
<linearGradient id="gRed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2463a"/><stop offset=".5" stop-color="#c22c22"/><stop offset="1" stop-color="#7c140f"/></linearGradient>
<linearGradient id="gGreen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b7dc7c"/><stop offset=".5" stop-color="#8cbd52"/><stop offset="1" stop-color="#557a2c"/></linearGradient>
<linearGradient id="gCab" x1="0" x2="1"><stop offset="0" stop-color="#2b323a"/><stop offset=".5" stop-color="#3a424b"/><stop offset="1" stop-color="#252b32"/></linearGradient>
<linearGradient id="gMod" x1="0" x2="1"><stop offset="0" stop-color="#9aa1a8"/><stop offset=".4" stop-color="#e3e6e9"/><stop offset="1" stop-color="#8d949b"/></linearGradient>
<linearGradient id="gBelt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a5058"/><stop offset=".25" stop-color="#2b3138"/><stop offset="1" stop-color="#15191e"/></linearGradient>
<linearGradient id="gScr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c2238"/><stop offset="1" stop-color="#061321"/></linearGradient>
<linearGradient id="gKbd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a414a"/><stop offset="1" stop-color="#1b2026"/></linearGradient>
<linearGradient id="gWin" x1="0" x2="1"><stop offset="0" stop-color="#5c6263"/><stop offset=".35" stop-color="#3d3e3b"/><stop offset="1" stop-color="#242523"/></linearGradient>
<linearGradient id="gSand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0cf8e"/><stop offset=".25" stop-color="#ddb572"/><stop offset="1" stop-color="#b98f52"/></linearGradient>
<linearGradient id="gFire" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a0804"/><stop offset=".5" stop-color="#4a0e05"/><stop offset="1" stop-color="#2a0603"/></linearGradient>
<linearGradient id="gFlame" x1="0" x2="1"><stop offset="0" stop-color="#fffbe8"/><stop offset=".22" stop-color="#ffe27a"/><stop offset=".55" stop-color="#ff9a2a"/><stop offset=".85" stop-color="#e2380e" stop-opacity=".75"/><stop offset="1" stop-color="#8a1204" stop-opacity="0"/></linearGradient>
<linearGradient id="gFlameB" x1="0" x2="1"><stop offset="0" stop-color="#9fd8ff"/><stop offset=".35" stop-color="#4f8dff" stop-opacity=".7"/><stop offset="1" stop-color="#2a4dff" stop-opacity="0"/></linearGradient>
<radialGradient id="gBub" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#e4e9ef"/><stop offset="1" stop-color="#9aa6b3"/></radialGradient>
<radialGradient id="gRoll" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#cfd3d8"/><stop offset="1" stop-color="#7d848c"/></radialGradient>
<radialGradient id="gHousing" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#f1f3f5"/><stop offset=".6" stop-color="#b6bdc4"/><stop offset="1" stop-color="#6c747c"/></radialGradient>
<radialGradient id="gWet" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#d2a562"/><stop offset=".55" stop-color="#95693a"/><stop offset="1" stop-color="#5a3c1e"/></radialGradient>
<radialGradient id="gDry" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#fff6d8"/><stop offset=".5" stop-color="#e8c47c"/><stop offset="1" stop-color="#a47a38"/></radialGradient>
<radialGradient id="gDomeW" cx=".38" cy=".3" r=".75"><stop offset="0" stop-color="#e6c58e"/><stop offset=".45" stop-color="#b08954"/><stop offset="1" stop-color="#5e4122"/></radialGradient>
<radialGradient id="gDomeD" cx=".38" cy=".3" r=".75"><stop offset="0" stop-color="#fffbe9"/><stop offset=".45" stop-color="#ecd29a"/><stop offset="1" stop-color="#9c7640"/></radialGradient>
<radialGradient id="gDust" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff8e6"/><stop offset=".6" stop-color="#f1d9a4" stop-opacity=".8"/><stop offset="1" stop-color="#e9c887" stop-opacity="0"/></radialGradient>
<radialGradient id="gSpark" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fffbe0"/><stop offset=".45" stop-color="#ffb24a"/><stop offset="1" stop-color="#ff4a10" stop-opacity="0"/></radialGradient>
<radialGradient id="gGasP" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#fff3a8" stop-opacity="0"/></radialGradient>
<radialGradient id="gAirP" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#cfeaff" stop-opacity="0"/></radialGradient>
<radialGradient id="gWatP" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#e8fbff"/><stop offset="1" stop-color="#7fd6ff" stop-opacity="0"/></radialGradient>
<radialGradient id="gSmokeP" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#eef2f5" stop-opacity=".85"/><stop offset="1" stop-color="#eef2f5" stop-opacity="0"/></radialGradient>
<radialGradient id="gSmoke" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#c9d0d6" stop-opacity=".75"/><stop offset=".6" stop-color="#aab3bb" stop-opacity=".35"/><stop offset="1" stop-color="#aab3bb" stop-opacity="0"/></radialGradient>
<radialGradient id="gHeat" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffb347" stop-opacity=".85"/><stop offset="1" stop-color="#ff5a1a" stop-opacity="0"/></radialGradient>
<radialGradient id="gBg" cx=".45" cy=".4" r=".8"><stop offset="0" stop-color="#1d2a36"/><stop offset="1" stop-color="#0d151d"/></radialGradient>
<pattern id="pSand" width="7" height="6" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r=".8" fill="#8a6434" opacity=".55"/><circle cx="5" cy="4.2" r=".7" fill="#fff0c8" opacity=".5"/></pattern>
<pattern id="pGrid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0H0V10" fill="none" stroke="#2dd4bf" stroke-opacity=".09" stroke-width=".6"/></pattern>
<filter id="fGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6"/></filter>
<filter id="fBlur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4"/></filter>
<filter id="fSoft1" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation=".6"/></filter>
<filter id="fSh" x="-15%" y="-15%" width="135%" height="140%"><feDropShadow dx="1.5" dy="2.5" stdDeviation="2.2" flood-color="#000" flood-opacity=".55"/></filter>
</defs>`;
// ---------- elementlar kutubxonasi ----------
const T={};
const TX=(x,y,t,o={})=>`<text x="${x}" y="${y}" font-size="${o.fs||12}" text-anchor="${o.a||'start'}" fill="${o.c||'#e9f1f7'}" font-weight="${o.w||700}" font-family="${FONT}"${o.cls?` class="${o.cls}"`:''}>${t}</text>`;
const bolt=(x,y)=>`<circle cx="${x}" cy="${y}" r="1.3" fill="#8b939b" stroke="#2a3036" stroke-width=".4"/>`;
const cross=(r,w,cls)=>`<g class="${cls||'spin'}"><line x1="${-r*.62}" y1="0" x2="${r*.62}" y2="0" stroke="#23282e" stroke-width="${w}" stroke-linecap="round"/><line x1="0" y1="${-r*.62}" x2="0" y2="${r*.62}" stroke="#23282e" stroke-width="${w}" stroke-linecap="round"/><circle r="${r*.14}" fill="#23282e"/></g>`;
T.panel={n:'Holat paneli',L:4,props:[['kind','Turi','sel',[['status','Holat (vaqt, R, hodisa)'],['burner','Gorelka va o‘txona']]],['w','Eni','num'],['h','Bo‘yi','num']],
  render(o){const p=o.p,w=p.w||300,h=p.h||64;let s=`<rect width="${w}" height="${h}" rx="7" fill="#07121b" fill-opacity=".94" stroke="#2b4a66" stroke-width="1.2"/>`;
    if(p.kind==='burner'){s+=TX(12,19,'Gorelka va o‘txona (6, 7)',{fs:14.5,c:'#e6edf3'});['FT01 gaz','FT02 birlamchi havo','FT03 ikkilamchi havo','TT01 o‘txona','λ havo/gaz','Klapan 1-2/1-1/1-3'].forEach((t,i)=>{s+=TX(12,38+i*17,t,{fs:13,c:'#a9cfe8',w:600})+TX(w-10,38+i*17,'—',{fs:13,a:'end',c:'#7fd6ff',cls:'r'+i})});}
    else{const ic=(y,warn)=>warn?`<path d="M16 ${y-10}L23 ${y+2}H9Z" fill="#ef5350"/><text x="16" y="${y+0.5}" font-size="8" text-anchor="middle" fill="#fff" font-weight="700" font-family="${FONT}">!</text>`:`<circle cx="16" cy="${y-4.5}" r="5.2" fill="none" stroke="#c9d6e2" stroke-width="1.4"/><path d="M16 ${y-7.5}V${y-4.5}L18.4 ${y-3}" stroke="#c9d6e2" stroke-width="1.3" fill="none"/>`;
      s+=ic(20)+ic(40)+ic(60,1)+TX(28,20,'t = — min',{fs:15,cls:'l1'})+TX(28,40,'AI xavf indeksi R = —',{fs:15,c:'#ffd34d',cls:'l2'})+TX(28,60,'Hodisa: —',{fs:15,c:'#9fb3c0',cls:'l3'});}
    return s},
  rt(o,g){const q=c=>g.querySelector('.'+c);return {dyn(c){const d=c.d,k=c.k,P=c.P,f=(v,n)=>isFinite(v)?fmt(v,n):'NaN';
    if(o.p.kind==='burner'){const L=vmAlarm('LAM',c),t1=vmAlarm('TT01',c),col=s=>s==='trip'?'#ff5a4f':s==='warn'?'#ffd34d':'#7fd6ff';
      const v=[[f(d.FT01[k],0)+' m³/soat',L],[f(d.FT02[k],0)+' m³/soat',L],[f(d.FT03[k],0)+' m³/soat',''],[f(d.TT01[k],0)+' °C',t1],[d.burner[k]?f(d.LAM[k],2):'—',L],[f(d.U12[k],0)+'/'+f(d.U11[k],0)+'/'+f(d.U13[k],0)+' %','warn']];
      v.forEach((r,i)=>{const e=q('r'+i);e.textContent=r[0];e.setAttribute('fill',col(r[1]))})}
    else{q('l1').textContent=`t = ${fmt(k*P.dt,1)} min`;q('l2').textContent=`AI xavf indeksi R = ${fmt(c.id.R[k],2)}`;const e=q('l3');e.textContent=c.trip?`Hodisa: ${EV[c.tripJ].id}`:'Hodisa: yo‘q';e.setAttribute('fill',c.trip?'#ff5a4f':'#9fb3c0')}}}}};
T.label={n:'Yozuv',L:3,props:[['text','Matn (yangi qator: \\n)','text'],['fs','Shrift o‘lchami','num'],['c','Rangi','color'],['a','Tekislash','sel',[['start','Chap'],['middle','Markaz'],['end','O‘ng']]]],
  render(o){const p=o.p,ls=String(p.text||'Yozuv').split('\\n');return ls.map((l,i)=>TX(0,i*(p.fs||13.5)*1.12,xa(l),{fs:p.fs||13.5,c:p.c||'#f1f5f8',a:p.a||'start',w:p.w||700})).join('')}};
T.value={n:'Qiymat oynasi',L:3,props:[['var','O‘lchov','var'],['unit','Birlik','text'],['dec','Kasr xonasi','num'],['w','Eni','num'],['h','Bo‘yi','num'],['fs','Shrift','num']],
  render(o){const p=o.p,w=p.w||50,h=p.h||17;return `<rect width="${w}" height="${h}" rx="4" fill="#06182a" stroke="#2f6f9a" stroke-width="1.1"/>`+TX(w-5,h/2+(p.fs||13)*0.36,'—',{fs:p.fs||13,a:'end',c:'#7fd6ff',cls:'v'})},
  rt(o,g){const e=g.querySelector('.v');return {dyn(c){const v=vmVal(o.p.var,c),a=vmAlarm(o.p.var,c);e.textContent=(isFinite(v)?fmt(v,+o.p.dec||0):'—')+(o.p.unit?' '+o.p.unit:'');e.setAttribute('fill',a==='trip'?'#ff5a4f':a==='warn'?'#ffd34d':'#7fd6ff')}}}};
T.sensor={n:'Datchik (o‘lchov asbobi)',L:3,props:[['tag','Teg (masalan TT03)','text'],['var','O‘lchov','var'],['alarm','Signalizatsiya bo‘yicha','var'],['rim','Hoshiya rangi','color']],
  render(o){const p=o.p,t=String(p.tag||'XX');return `<circle class="sping" r="15.5" fill="none" stroke="#7fd6ff" stroke-width="1.2"/><circle r="16.5" fill="url(#gBub)" stroke="${p.rim||'#39b54a'}" stroke-width="2.4" filter="url(#fSh)"/><circle r="13.2" fill="none" stroke="#ffffff" stroke-opacity=".5" stroke-width=".8"/>`+TX(0,3.8,xa(t),{fs:t.length>4?9:10.5,a:'middle',c:'#1a2230'})+`<g class="ring" opacity="0"><circle r="20" fill="none" stroke-width="3"/><circle r="24" fill="none" stroke-width="1.2" opacity=".6"/></g>`},
  rt(o,g){const rg=g.querySelector('.ring');return {dyn(c){const a=vmAlarm(o.p.alarm||o.p.var,c);rg.setAttribute('opacity',a?1:0);rg.setAttribute('stroke',a==='trip'?'#ff3b30':'#ffb020')}}}};
T.valve={n:'Klapan (rostlovchi)',L:3,props:[['label','Belgisi (masalan 1-4)','text'],['var','Ochilish signali','var']],
  render(o){const p=o.p;return `<g filter="url(#fSh)"><polygon points="-11,-7.5 0,0 -11,7.5" fill="url(#gMH)" stroke="#39424a" stroke-width=".8"/><polygon points="11,-7.5 0,0 11,7.5" fill="url(#gMH)" stroke="#39424a" stroke-width=".8"/><polygon points="-4.5,13 4.5,13 0,4.5" fill="url(#gMH)" stroke="#39424a" stroke-width=".7"/></g><circle class="sg" r="9" fill="#3dff7a" opacity=".2" filter="url(#fGlow)"/><circle class="st" r="2.6" fill="#3dff7a"/>`+(p.label?TX(0,-14,xa(p.label),{fs:11,a:'middle',c:'#dfe7ee'}):'')},
  rt(o,g){const sg=g.querySelector('.sg'),st=g.querySelector('.st');return {dyn(c){const u=o.p.var?vmVal(o.p.var,c):100,op=u>2,col=op?'#3dff7a':'#ff3b30';sg.setAttribute('fill',col);st.setAttribute('fill',col);sg.setAttribute('opacity',op?(0.12+0.35*Math.min(1,u/100)).toFixed(2):0.3);st.setAttribute('r',op?(2+1.6*Math.min(1,u/100)).toFixed(2):2.4)}}}};
T.motor={n:'Elektr dvigatel',L:2,props:[['flow','Ishlash holati','flow']],
  render(){let f='';for(let i=0;i<5;i++)f+=`<line x1="${-7+i*3}" y1="-6" x2="${-7+i*3}" y2="6" stroke="#0f2566" stroke-width=".7"/>`;return `<g filter="url(#fSh)"><rect x="-12" y="-5" width="3" height="10" rx="1" fill="#1b2f6e"/><rect x="-9.5" y="-7" width="17" height="14" rx="2.5" fill="url(#gBlue)" stroke="#0e1f55" stroke-width=".6"/>${f}<rect x="-4" y="-10" width="7" height="3.5" rx=".8" fill="#2451c9"/><rect x="7.5" y="-1.6" width="5" height="3.2" fill="url(#gMH)"/></g><circle class="ml" cx="-6" cy="-8.5" r="1.1" fill="#3dff7a" opacity="0"/>`},
  rt(o,g){const l=g.querySelector('.ml');return {step(dt,t,C){l.setAttribute('opacity',C[o.p.flow||'on']>0.1?1:0.15)}}}};
T.conveyor={n:'Lentali konveyer',L:2,props:[['L','Uzunligi','num'],['rr','Rolik radiusi','num'],['mat','Material','sel',[['wet','Nam material'],['dry','Quruq mahsulot']]],['flow','Ishlash holati','flow']],
  render(o){const p=o.p,L=p.L||110,rr=p.rr||9,tb=-rr*.62,bb=rr*.74,cp='cp_'+o.id,n=Math.max(2,Math.floor((L-2*rr)/(rr*1.75)))+1,dr=rr*.84;
    let s=`<clipPath id="${cp}"><rect x="${rr*.6}" y="${tb-dr*1.3}" width="${L-rr*1.2}" height="${dr*1.3+.3}"/></clipPath><clipPath id="${cp}b"><rect x="0" y="${tb}" width="${L}" height="${bb-tb}"/></clipPath>`;
    s+=`<g filter="url(#fSh)"><rect x="0" y="${tb}" width="${L}" height="${bb-tb}" fill="url(#gBelt)" stroke="#0b0f13" stroke-width=".8"/></g><rect x="0" y="${tb}" width="${L}" height="1.2" fill="#5a6068"/>`;
    s+=`<g clip-path="url(#${cp}b)" opacity=".45">${Array.from({length:Math.ceil(L/14)+1},()=>`<line class="seam" y1="${tb+1}" y2="${bb}" x1="0" x2="0" stroke="#8f979e" stroke-width=".7"/>`).join('')}</g>`;
    s+=`<g clip-path="url(#${cp})">${Array.from({length:n},()=>`<ellipse class="dome" cy="${tb}" rx="${dr}" ry="${dr*.88}" fill="url(#${p.mat==='dry'?'gDomeD':'gDomeW'})" stroke="${p.mat==='dry'?'#7a5a2c':'#4b3218'}" stroke-width=".35"/>`).join('')}</g>`;
    for(const x of [0,L])s+=`<g transform="translate(${x} 0)"><circle r="${rr}" fill="url(#gRoll)" stroke="#5d646b" stroke-width=".6"/>${cross(rr,rr>11?2.4:1.6)}</g>`;return s},
  rt(o,g){const p=o.p,L=p.L||110,rr=p.rr||9,domes=[...g.querySelectorAll('.dome')],seams=[...g.querySelectorAll('.seam')],sp=[...g.querySelectorAll('.spin')];let pos=0,a=0;const span=L-rr*.4,gap=span/domes.length;
    return {step(dt,t,C){const f=C[p.flow||'on'];pos+=30*f*dt;a=(a-(30*f*dt)/rr*57.3)%360;
      domes.forEach((e,i)=>{const x=rr*.2+((pos+i*gap)%span);e.setAttribute('cx',x.toFixed(2));const ed=Math.min(x-rr*.6,L-rr*.6-x);e.setAttribute('opacity',Math.max(0,Math.min(1,ed/(rr*.9))).toFixed(2))});
      seams.forEach((e,i)=>{const x=((pos+i*14)%(seams.length*14));e.setAttribute('x1',x.toFixed(2));e.setAttribute('x2',x.toFixed(2))});sp.forEach(e=>e.setAttribute('transform',`rotate(${a.toFixed(1)})`))}}}};
T.hopper={n:'Bunker (aralashtirgichli)',L:2,props:[['lv','Sath o‘lchovi','var'],['mixv','Aralashtirgich tezligi','var']],
  render(o){const cp='cp_'+o.id,path='M3 4H53V58H27V50L3 34Z';return `<clipPath id="${cp}"><path d="${path}"/></clipPath><g filter="url(#fSh)"><path d="${path}" fill="#aab1b8"/></g>
   <g clip-path="url(#${cp})"><rect x="0" y="0" width="56" height="62" fill="url(#gMV)"/><rect x="0" y="0" width="56" height="62" fill="#000" opacity=".1"/><path class="sand" fill="url(#gSand)"/><path class="sand" fill="url(#pSand)"/><path class="surf" fill="none" stroke="#fff1c9" stroke-width="1.1" opacity=".85"/>
   <line x1="4" y1="18.5" x2="54" y2="18.5" stroke="#6d747b" stroke-width="1.6"/>${[13,27,41].map(x=>`<g transform="translate(${x} 18.5)"><g class="pad"><rect x="-1.2" y="-8.5" width="2.4" height="17" rx="1" fill="#59616a"/><rect x="-3.2" y="-8.5" width="6.4" height="2.4" rx="1" fill="#7c848d"/><rect x="-3.2" y="6.1" width="6.4" height="2.4" rx="1" fill="#7c848d"/></g></g>`).join('')}</g>
   <path d="${path}" fill="none" stroke="#5d646b" stroke-width="1"/><rect x="-3" y="0" width="62" height="4.5" rx="1" fill="url(#gMH)" stroke="#5d646b" stroke-width=".5"/><rect x="26" y="57.5" width="28" height="4" fill="url(#gMH)"/>`},
  rt(o,g){const sand=[...g.querySelectorAll('.sand')],surf=g.querySelector('.surf'),pads=[...g.querySelectorAll('.pad')];let lv=50,cur=50,mp=0,mix=0;
    return {dyn(c){const v=vmVal(o.p.lv||'LT01',c);lv=isFinite(v)?Math.max(0,Math.min(100,v)):50;const m=vmVal(o.p.mixv||'M02',c);mix=isFinite(m)?Math.max(0,Math.min(1.3,m/100)):0},
      step(dt,t){cur+=(lv-cur)*Math.min(1,dt/0.5);const y=58-54*cur/100;let d=`M0 ${y.toFixed(2)}`;for(let x=0;x<=56;x+=4)d+=` L${x} ${(y+Math.sin(x*.45+t*3.2)*.7*mix+Math.sin(x*.21-t*1.7)*.5*mix).toFixed(2)}`;surf.setAttribute('d',d);sand.forEach(e=>e.setAttribute('d',d+' L56 62 L0 62Z'));
        mp+=mix*dt*9;pads.forEach((e,i)=>e.setAttribute('transform',`scale(1 ${Math.cos(mp+i*1.05).toFixed(3)})`))}}}};
T.screw={n:'Shnekli ta’minlagich',L:2,props:[['L','Uzunligi','num'],['flow','Ishlash holati','flow']],
  render(o){const L=o.p.L||86,cp='cp_'+o.id;let z='';for(let x=6;x<L-4;x+=12)z+=`M${x} -5.2L${x+6} 5.2L${x+12} -5.2`;
    return `<clipPath id="${cp}"><rect x="6" y="-5" width="${L-6}" height="10"/></clipPath><g filter="url(#fSh)"><rect x="0" y="-5.5" width="${L}" height="11" fill="#14181d"/></g>
     <g clip-path="url(#${cp})">${Array.from({length:Math.ceil(L/7)+2},()=>`<path class="fl" d="M0 -5 L4 5" stroke="#b9c0c7" stroke-width="1.5" opacity=".7"/>`).join('')}${Array.from({length:Math.ceil(L/9)},()=>`<circle class="gr" r="2" fill="url(#gWet)"/>`).join('')}</g>
     <path d="${z}" fill="none" stroke="#d9dde2" stroke-width="1.2" opacity=".85"/><rect x="0" y="-7.2" width="${L}" height="2.2" fill="url(#gMH)"/><rect x="0" y="5" width="${L}" height="2.2" fill="url(#gMH)"/>
     <g><circle r="6" fill="url(#gRoll)" stroke="#5d646b" stroke-width=".5"/>${cross(6,1.2)}</g>`},
  rt(o,g){const L=o.p.L||86,fl=[...g.querySelectorAll('.fl')],gr=[...g.querySelectorAll('.gr')],sp=g.querySelector('.spin');let pos=0,a=0;
    return {step(dt,t,C){const f=C[o.p.flow||'screw'];pos+=22*f*dt;a=(a-420*f*dt)%360;fl.forEach((e,i)=>e.setAttribute('transform',`translate(${(6+((pos+i*7)%(fl.length*7))).toFixed(2)} 0)`));
      gr.forEach((e,i)=>{const x=8+((pos*1.2+i*9)%(L-10));e.setAttribute('cx',x.toFixed(2));e.setAttribute('cy',(Math.sin(t*3+i)*1.3).toFixed(2));e.setAttribute('opacity',Math.min(1,f*2).toFixed(2))});sp.setAttribute('transform',`rotate(${a.toFixed(1)})`)}}}};
T.weigher={n:'Tarozi (WT)',L:2,props:[['var','O‘lchov','var']],
  render(){return `<g filter="url(#fSh)"><rect width="42" height="24" rx="4" fill="url(#gMH)" stroke="#4b535b" stroke-width=".7"/></g><rect x="9" y="5.5" width="24" height="13" rx="2" fill="#0b1d2e" stroke="#3b6a8a" stroke-width=".7"/>`+TX(21,15.6,'—',{fs:10,a:'middle',c:'#e8f0f8',cls:'v'})+bolt(4,4)+bolt(38,4)+bolt(4,20)+bolt(38,20)},
  rt(o,g){const e=g.querySelector('.v');return {dyn(c){const v=vmVal(o.p.var||'WT',c);e.textContent=isFinite(v)?fmt(v,1):'—'}}}};
T.burner={n:'Gorelka / o‘txona',L:2,props:[],
  render(o){const cp='cp_'+o.id;return `<clipPath id="${cp}"><rect x="40" y="18" width="55" height="25" rx="3"/></clipPath><g filter="url(#fSh)"><rect width="104" height="72" rx="4" fill="url(#gRed)" stroke="#4a0c08" stroke-width="1"/></g>
   <rect x="3" y="3" width="98" height="66" rx="3" fill="none" stroke="#ff8a7a" stroke-opacity=".25"/>${bolt(6,6)+bolt(98,6)+bolt(6,47)+bolt(98,47)}
   <rect x="8" y="14" width="26" height="30" rx="2" fill="#8e1a13" stroke="#5a0d09" stroke-width=".7"/>${[0,1,2,3].map(i=>`<line x1="11" y1="${19+i*6}" x2="31" y2="${19+i*6}" stroke="#5a0d09" stroke-width="1.4"/>`).join('')}
   <rect x="39" y="17" width="57" height="27" rx="3.5" fill="#1a0503" stroke="#5a0d09"/>
   <g clip-path="url(#${cp})"><rect x="38" y="16" width="60" height="30" fill="url(#gFire)"/><g class="flm" opacity="0"><ellipse cx="48" cy="31" rx="30" ry="14" fill="url(#gHeat)" opacity=".8"/>
    <path class="f1" d="M40 31 C48 22 66 21 98 28 C74 33 58 36 40 31Z" fill="url(#gFlame)"/><path class="f2" d="M40 30.5 C50 25 68 25 93 31 C70 35 54 36 40 30.5Z" fill="url(#gFlame)" opacity=".9"/><path class="f3" d="M40 31 C46 28 56 28 68 31 C56 34 46 34 40 31Z" fill="url(#gFlameB)"/>
    ${Array.from({length:8},()=>`<circle class="emb" r=".9" fill="#ffe08a"/>`).join('')}</g></g>`+TX(67.5,35,'O‘chiq',{fs:12,a:'middle',c:'#f4e6e2',cls:'stt'})+
   `<rect x="6" y="52" width="92" height="17" rx="2.5" fill="#d32f2f" stroke="#ff8a80" stroke-width=".6"/>`+TX(52,64.5,'GORELKA TRIP',{fs:10.5,a:'middle',c:'#fff'})+`<rect class="dim" x="6" y="52" width="92" height="17" rx="2.5" fill="#1a0806" opacity=".55"/><rect class="glw" x="3.5" y="49.5" width="97" height="22" rx="4" fill="none" stroke="#ff3b30" stroke-width="2.4" opacity="0" filter="url(#fGlow)"/>`},
  rt(o,g){const q=c=>g.querySelector('.'+c),flm=q('flm'),f1=q('f1'),f2=q('f2'),f3=q('f3'),emb=[...g.querySelectorAll('.emb')],stt=q('stt'),dim=q('dim'),glw=q('glw');let on=false;
    return {dyn(c){on=c.on;stt.textContent=on?'Yoniq':'O‘chiq';stt.setAttribute('fill',on?'#fff4d6':'#f4e6e2');stt.setAttribute('stroke',on?'#3a0802':'none');stt.setAttribute('stroke-width',2.4);stt.setAttribute('paint-order','stroke')},
      step(dt,t,C,S){const fl=C.flame;flm.setAttribute('opacity',Math.min(1,fl*1.3).toFixed(2));if(fl>.02){const n1=Math.sin(t*23)*.5+Math.sin(t*37+1)*.3+Math.random()*.2,n2=Math.sin(t*29+2)*.5+Math.sin(t*17)*.3+Math.random()*.2,sx=(.55+.45*Math.min(1.3,S.gas))*fl;
        f1.setAttribute('transform',`translate(40 31) scale(${(sx*(.92+n1*.1)).toFixed(3)} ${(.9+n2*.14).toFixed(3)}) translate(-40 -31)`);f2.setAttribute('transform',`translate(40 31) scale(${(sx*(.95+n2*.08)).toFixed(3)} ${(.85+n1*.16).toFixed(3)}) translate(-40 -31)`);f3.setAttribute('transform',`translate(40 31) scale(${(.9+n1*.12).toFixed(3)} 1) translate(-40 -31)`);
        emb.forEach((e,i)=>{const s=(t*.9+i/8)%1;e.setAttribute('cx',(44+s*50).toFixed(2));e.setAttribute('cy',(31+Math.sin(t*6+i*2)*6*s).toFixed(2));e.setAttribute('opacity',((1-s)*.9).toFixed(2))})}
        const tr=S.trip>.5,bl=(t*2.2)%1<.5;dim.setAttribute('opacity',tr?(bl?0:.35):.55);glw.setAttribute('opacity',tr&&bl?.95:0)}}}};

T.dryer={n:'Quritgich',L:2,props:[['flow','Ishlash holati','flow']],
  render(o){const w='cpw_'+o.id,b='cpb_'+o.id;return `<clipPath id="${w}"><path d="M-17 69H17L8.5 129H-8.5Z"/></clipPath><clipPath id="${b}"><path d="M-22 140H22L38 176H-38Z"/></clipPath>
   <g filter="url(#fSh)"><path d="M-40 24H40V43L24 133H-24L-40 43Z M-24 140H24L40 178H-40Z M-40 183H40L16 215H-16Z" fill="#9aa1a8"/></g>
   <rect x="-8" y="0" width="16" height="8" fill="url(#gMV)"/><rect x="-24" y="6" width="48" height="5" rx="1" fill="url(#gMH)" stroke="#5d646b" stroke-width=".4"/>
   <path d="M-20 11H20L40 24H-40Z" fill="url(#gMV)" stroke="#5d646b" stroke-width=".5"/><rect x="-41" y="24" width="82" height="19" rx="1.5" fill="url(#gGreen)" stroke="#4d6d27" stroke-width=".6"/>
   <path d="M-40 43H40L24 133H-24Z" fill="url(#gMV)" stroke="#5d646b" stroke-width=".6"/><path d="M-17 69H17L8.5 129H-8.5Z" fill="url(#gWin)" stroke="#2a2f34" stroke-width="1.4"/>
   <g clip-path="url(#${w})"><g class="haze" opacity="0">${[0,1,2].map(i=>`<path d="M${-10+i*9} 129 q4 -10 0 -20 q-4 -10 0 -20 q4 -10 0 -22" fill="none" stroke="#ffb870" stroke-width="2.2" opacity=".22" filter="url(#fSoft1)"/>`).join('')}</g>${Array.from({length:34},(_,i)=>`<circle class="ri" r="${(1+((i*7)%5)*.28).toFixed(2)}" fill="${i%4?'url(#gDry)':'url(#gWet)'}"/>`).join('')}</g>
   <rect x="-25" y="132" width="50" height="9" rx="1.5" fill="url(#gMH)" stroke="#5d646b" stroke-width=".5"/><path d="M-24 140H24L40 178H-40Z" fill="url(#gMV)" stroke="#5d646b" stroke-width=".6"/>
   <g clip-path="url(#${b})">${Array.from({length:18},(_,i)=>`<circle class="bu" r="${(1.1+(i%3)*.35).toFixed(2)}" fill="${i%3?'url(#gDry)':'url(#gWet)'}"/>`).join('')}</g>
   <rect x="-42" y="177" width="84" height="6" rx="1.5" fill="url(#gMH)" stroke="#5d646b" stroke-width=".5"/><path d="M-40 183H40L16 215H-16Z" fill="url(#gMV)" stroke="#5d646b" stroke-width=".6"/>
   <rect x="-9" y="214" width="18" height="16" fill="url(#gMV)" stroke="#5d646b" stroke-width=".5"/><rect x="-5" y="229" width="10" height="6" fill="#3b434b"/>`},
  rt(o,g){const ri=[...g.querySelectorAll('.ri')],bu=[...g.querySelectorAll('.bu')],hz=g.querySelector('.haze');let pr=0,pb=0;
    return {step(dt,t,C){const f=C[o.p.flow||'dry'];pr+=f*dt;pb+=f*dt*2.4;hz.setAttribute('opacity',Math.min(1,C.hot*1.2).toFixed(2));const H=60;
      ri.forEach((e,i)=>{const sp=26+(i*7%10)*3.2,s=((pr*sp+i*17.3)%H+H)%H,y=129-s,k=(y-69)/60,xl=-17+8.5*k,xr=17-8.5*k,u=((i*.371)%1)*.8+.1+Math.sin(t*1.8+i)*.07;
        e.setAttribute('cx',(xl+(xr-xl)*u).toFixed(2));e.setAttribute('cy',y.toFixed(2));e.setAttribute('opacity',(Math.min(1,s/8,(H-s)/8)*Math.min(1,f*2)).toFixed(2))});
      bu.forEach((e,i)=>{const a=pb*(1+(i%4)*.18)+i*.9,rx=10+(i%5)*4,ry=6+(i%3)*3.5;e.setAttribute('cx',(rx*Math.cos(a)).toFixed(2));e.setAttribute('cy',(157+ry*Math.sin(a)-(i%2)*4).toFixed(2));e.setAttribute('opacity',Math.min(1,f*2).toFixed(2))})}}}};
T.cyclone={n:'Siklon',L:2,props:[['flow','Ishlash holati','flow']],
  render(o){const cp='cp_'+o.id;return `<clipPath id="${cp}"><path d="M-15 6H15V64L5 96H-5L-15 64Z"/></clipPath><g filter="url(#fSh)"><path d="M-15.5 6H15.5V64L5 96H-5L-15.5 64Z" fill="#9aa1a8"/></g>
   <rect x="-17" y="0" width="34" height="6.5" rx="1.2" fill="url(#gMH)" stroke="#5d646b" stroke-width=".5"/><rect x="-15.5" y="6" width="31" height="58" fill="url(#gMV)" stroke="#5d646b" stroke-width=".5"/>
   ${[16,34,52].map(y=>`<rect x="-16.5" y="${y}" width="33" height="2.2" fill="url(#gMH)"/>`).join('')}<path d="M-15.5 64H15.5L5 96H-5Z" fill="url(#gMV)" stroke="#5d646b" stroke-width=".5"/><rect x="-5" y="95" width="10" height="5" fill="url(#gMV)"/>
   <g clip-path="url(#${cp})">${Array.from({length:22},()=>`<circle class="cy" r="1.25" fill="url(#gDry)"/>`).join('')}</g>`},
  rt(o,g){const cy=[...g.querySelectorAll('.cy')];let p=0;return {step(dt,t,C){const f=C[o.p.flow||'dust'];p+=f*dt;cy.forEach((e,i)=>{const s=((p*.55+i/22)%1+1)%1,y=7+s*88,R=y<64?13.5:13.5*(1-(y-64)/34)+1.5,a=p*9+i*2.2+s*14,z=Math.sin(a);
    e.setAttribute('cx',(R*Math.cos(a)).toFixed(2));e.setAttribute('cy',(y+z*2.2).toFixed(2));e.setAttribute('opacity',(Math.min(1,f*2)*(.45+.55*(z+1)/2)).toFixed(2))})}}}};
T.bagfilter={n:'Yengli filtr',L:2,props:[['flow','Ishlash holati','flow']],
  render(){let rods='';for(let x=-38;x<=38;x+=19)rods+=`<rect x="${x-1}" y="37" width="2" height="106" fill="url(#gMV)"/>`;
   return `<g filter="url(#fSh)"><path d="M-18 0H18L42 32V148L8 200H-8L-42 148V32Z" fill="#9aa1a8"/></g><path d="M-18 0H18L42 32H-42Z" fill="url(#gMV)" stroke="#5d646b" stroke-width=".6"/>
    <rect x="-44" y="31" width="88" height="6" rx="1.5" fill="url(#gMH)" stroke="#5d646b" stroke-width=".5"/><rect x="-41" y="37" width="82" height="106" fill="#1e252c" stroke="#5d646b" stroke-width=".6"/>
    ${[[-28,15],[-8,15],[13,16]].map(b=>`<rect x="${b[0]}" y="52" width="${b[1]}" height="88" rx="7.5" fill="#efdcb4" stroke="#b89b66" stroke-width=".6"/><rect x="${b[0]+2}" y="54" width="${b[1]*.35}" height="84" rx="4" fill="#fff6e2" opacity=".6"/><line x1="${b[0]}" y1="96" x2="${b[0]+b[1]}" y2="96" stroke="#b89b66" stroke-width=".6"/><rect class="bag" x="${b[0]}" y="52" width="${b[1]}" height="88" rx="7.5" fill="#fff" opacity="0"/>`).join('')}${rods}
    <rect x="-44" y="143" width="88" height="6" rx="1.5" fill="url(#gMH)" stroke="#5d646b" stroke-width=".5"/><path d="M-42 149H42L8 200H-8Z" fill="url(#gMV)" stroke="#5d646b" stroke-width=".6"/><rect x="-5" y="199" width="10" height="7" fill="url(#gMV)"/>
    ${Array.from({length:10},()=>`<circle class="bd" r="1.3" fill="url(#gDust)" opacity="0"/>`).join('')}`},
  rt(o,g){const bags=[...g.querySelectorAll('.bag')],bd=[...g.querySelectorAll('.bd')];return {step(dt,t,C){const f=Math.min(1,C[o.p.flow||'dust']*2),cyc=t%6,bi=Math.floor(t/6)%3;
    bags.forEach((e,i)=>{const on=i===bi&&cyc<.35;e.setAttribute('opacity',((on?.3*(1-cyc/.35):0)*f).toFixed(2));e.setAttribute('transform',on?`translate(0 ${(Math.sin(cyc*60)*.8).toFixed(2)})`:'')});
    bd.forEach((e,i)=>{const tt=cyc-.1-i*.05,x=[-20,0,21][bi]+((i*7)%11)-5;if(tt>0&&tt<1.6){e.setAttribute('cx',x);e.setAttribute('cy',(142+tt*38).toFixed(2));e.setAttribute('opacity',(f*(1-tt/1.6)).toFixed(2))}else e.setAttribute('opacity',0)})}}}};
T.prodhopper={n:'Tayyor mahsulot bunkeri',L:2,props:[['flow','Ishlash holati','flow']],
  render(){return `<g filter="url(#fSh)"><path d="M-25 0H25V16L7 56H-7L-25 16Z" fill="#9aa1a8"/></g><rect x="-27" y="0" width="54" height="5" rx="1" fill="url(#gMH)" stroke="#5d646b" stroke-width=".5"/><rect x="-26" y="5" width="52" height="11" rx="1.5" fill="url(#gBlue)" stroke="#0e1f55" stroke-width=".6"/>
   <path d="M-25 16H25L7 56H-7Z" fill="url(#gMV)" stroke="#5d646b" stroke-width=".6"/><rect x="-5.5" y="55" width="11" height="7" fill="url(#gMV)"/><rect x="-3.2" y="62" width="6.4" height="38" fill="url(#gCuV)"/><path d="M-3.2 100H3.2L0 106Z" fill="#c7975a"/>
   ${Array.from({length:6},()=>`<circle class="dp" r="1.9" fill="url(#gDry)"/>`).join('')}`},
  rt(o,g){const dp=[...g.querySelectorAll('.dp')];let p=0;return {step(dt,t,C){const f=C[o.p.flow||'prod'];p+=46*f*dt;dp.forEach((e,i)=>{const s=(p+i*9)%50;e.setAttribute('cx',(Math.sin(t*4+i)*.6).toFixed(2));e.setAttribute('cy',(58+s).toFixed(2));e.setAttribute('opacity',(Math.min(1,f*2)*Math.min(1,s/5,(50-s)/5)).toFixed(2))})}}}};
T.fan={n:'Ventilyator',L:2,props:[['flow','Ishlash holati','flow']],
  render(){let b='';for(let a=0;a<360;a+=60){const c=Math.cos,s=Math.sin,A=a*Math.PI/180,B=(a+24)*Math.PI/180;b+=`<path d="M0 0 L${r2(11.5*c(A))} ${r2(11.5*s(A))} A11.5 11.5 0 0 1 ${r2(11.5*c(B))} ${r2(11.5*s(B))}Z" fill="#aab2ba" stroke="#3b434b" stroke-width=".5"/>`}
   return `<rect x="-26" y="-9" width="8" height="18" rx="1.5" fill="url(#gMH)" stroke="#5d646b" stroke-width=".5"/><rect x="-6" y="-24" width="12" height="8" fill="url(#gMV)"/><g filter="url(#fSh)"><path d="M-18 -8 A18 18 0 1 1 -8 16 L-18 16Z" fill="url(#gHousing)" stroke="#5d646b" stroke-width=".6"/></g>
    <circle r="13.5" fill="#0d1318" stroke="#6c747c" stroke-width=".8"/><g class="imp">${b}</g><circle r="2.8" fill="#39414a" stroke="#c6ccd2" stroke-width=".6"/>${[0,45,90,135].map(a=>`<line x1="${r2(-13*Math.cos(a*Math.PI/180))}" y1="${r2(-13*Math.sin(a*Math.PI/180))}" x2="${r2(13*Math.cos(a*Math.PI/180))}" y2="${r2(13*Math.sin(a*Math.PI/180))}" stroke="#8b939b" stroke-width=".5" opacity=".6"/>`).join('')}`},
  rt(o,g){const e=g.querySelector('.imp');let a=0;return {step(dt,t,C){a=(a+1500*C[o.p.flow||'fan']*dt)%360;e.setAttribute('transform',`rotate(${a.toFixed(1)})`)}}}};
T.chimney={n:'Mo‘ri',L:2,props:[['H','Balandligi','num'],['flow','Tutun manbai','flow']],
  render(o){const H=o.p.H||64;return `<g filter="url(#fSh)"><rect x="-6" y="${-H}" width="12" height="${H}" fill="url(#gMV)" stroke="#5d646b" stroke-width=".5"/></g><rect x="-7" y="${-H*.55}" width="14" height="2.2" fill="url(#gMH)"/><path d="M-9 ${-H}H9L0 ${-H-10}Z" fill="url(#gMV)" stroke="#5d646b" stroke-width=".5"/>
    <g filter="url(#fBlur)">${Array.from({length:9},()=>`<circle class="sm" r="5" fill="url(#gSmoke)" opacity="0"/>`).join('')}</g>`},
  rt(o,g){const H=o.p.H||64,sm=[...g.querySelectorAll('.sm')];let p=0;return {step(dt,t,C){const f=C[o.p.flow||'fan'];p+=dt*(.35+.4*f);sm.forEach((e,i)=>{const s=(p+i/9)%1;e.setAttribute('cx',(-s*26+Math.sin(s*6+i)*3).toFixed(2));e.setAttribute('cy',(-H-1-s*24).toFixed(2));e.setAttribute('r',(3+s*11).toFixed(2));e.setAttribute('opacity',((1-s)*Math.min(1,s*6)*(.25+.75*C.flame)*Math.min(1,f*1.5)).toFixed(2))})}}}};
T.cap={n:'Quvur qopqog‘i',L:2,props:[],render(){return `<rect x="-7" y="-4" width="14" height="8" rx="1.2" fill="url(#gMH)" stroke="#5d646b" stroke-width=".5"/><path d="M-5 -4H5L0 -12Z" fill="url(#gMV)" stroke="#5d646b" stroke-width=".5"/>`}};
T.pump={n:'Nasos',L:2,props:[['flow','Ishlash holati','flow']],
  render(){return `<g filter="url(#fSh)"><rect x="-14" y="12" width="28" height="5" rx="1" fill="#39414a"/><path d="M-13 0A13 13 0 1 1 5 12H-13Z" fill="url(#gHousing)" stroke="#5d646b" stroke-width=".6"/><rect x="-2" y="-19" width="10" height="7" fill="url(#gMV)"/></g><circle r="8" fill="#0d1318"/><g class="imp">${[0,90,180,270].map(a=>`<path d="M0 0L${r2(7*Math.cos(a*Math.PI/180))} ${r2(7*Math.sin(a*Math.PI/180))}" stroke="#aab2ba" stroke-width="2.2" stroke-linecap="round"/>`).join('')}</g><circle r="2" fill="#39414a"/>`},
  rt(o,g){const e=g.querySelector('.imp');let a=0;return {step(dt,t,C){a=(a+900*C[o.p.flow||'on']*dt)%360;e.setAttribute('transform',`rotate(${a.toFixed(1)})`)}}}};
T.tank={n:'Rezervuar / idish',L:2,props:[['var','Sath o‘lchovi','var'],['w','Eni','num'],['h','Bo‘yi','num']],
  render(o){const w=o.p.w||50,h=o.p.h||80,cp='cp_'+o.id;return `<clipPath id="${cp}"><rect x="0" y="0" width="${w}" height="${h}" rx="${w/2}" ry="10"/></clipPath><g filter="url(#fSh)"><rect width="${w}" height="${h}" rx="${w/2}" ry="10" fill="url(#gMV)" stroke="#5d646b" stroke-width=".6"/></g><g clip-path="url(#${cp})"><rect class="lq" x="0" width="${w}" y="${h/2}" height="${h}" fill="#2e9fd0" opacity=".75"/></g>`},
  rt(o,g){const e=g.querySelector('.lq'),h=o.p.h||80;return {dyn(c){const v=vmVal(o.p.var,c),L=isFinite(v)?Math.max(0,Math.min(100,v)):50;e.setAttribute('y',(h-h*L/100).toFixed(2))}}}};
// ---------- boshqaruv qurilmalari ----------
const ledsHtml=(pts)=>pts.map(p=>`<circle class="led" data-k="${p[3]}" cx="${p[0]}" cy="${p[1]}" r="${p[4]||1.15}" fill="${p[2]}" opacity="0"/>`).join('');
const ledRt=g=>{const L=[...g.querySelectorAll('.led')].map(e=>({e,k:e.dataset.k,on:null}));let acc=0;return (dt,t,S)=>{acc+=dt;if(acc<.09)return;acc=0;const tr=S.trip>.5,bl=(t*2.2)%1<.5;
  for(const l of L){let on=l.on;if(l.k==='io')on=Math.random()<.12?!on:!!on;else if(l.k==='ao')on=Math.random()<.08?!on:!!on;else if(l.k==='run'||l.k==='pw')on=true;else if(l.k==='com')on=Math.random()<.55;else if(l.k==='com2')on=(t*3)%1<.5;else if(l.k==='err')on=tr&&bl;
    if(on!==l.on){l.on=on;l.e.setAttribute('opacity',on?1:0)}}}};
T.inverter={n:'Chastota o‘zgartirgich (invertor)',L:2,props:[],
  render(){const btn=[['#39d98a',0,0],['#39d98a',1,0],['#d9dde2',2,0],['#e05252',0,1],['#d9dde2',1,1],['#d9dde2',2,1],['#39d98a',0,2],['#d9dde2',1,2],['#e05252',2,2]].map(b=>`<rect x="${14+b[1]*8}" y="${41+b[2]*7}" width="6" height="4.5" rx="1.2" fill="${b[0]}"/>`).join('');
   const tri=(x,y)=>`<path d="M${x} ${y-7}L${x+7.5} ${y+5}H${x-7.5}Z" fill="#f2c230" stroke="#6b5200" stroke-width=".6"/><text x="${x}" y="${y+3.6}" font-size="7" text-anchor="middle" fill="#1a1a1a" font-weight="700" font-family="${FONT}">!</text>`;
   return `<g filter="url(#fSh)"><rect width="172" height="128" rx="3" fill="url(#gCab)" stroke="#0a0d11"/></g><rect x="4" y="-3" width="164" height="6" rx="1" fill="#3b434c"/>
    <rect x="8" y="8" width="48" height="112" rx="2" fill="#1f252c" stroke="#39414a"/><rect x="12" y="16" width="30" height="58" rx="2" fill="#12171c" stroke="#39414a" stroke-width=".6"/><rect x="14" y="20" width="26" height="14" rx="1" fill="#062a33"/>${TX(38.5,31,'0.0',{fs:8,a:'end',c:'#7dfff0',cls:'hz'})}<text x="15.3" y="24.5" font-size="3.4" fill="#7dfff0" font-family="Consolas,monospace">Hz</text>${btn}
    ${tri(28,102)}<rect x="62" y="8" width="86" height="112" rx="2" fill="#2c343c" stroke="#3f4851"/>${TX(105,40,'INVERTOR',{fs:11.5,a:'middle',c:'#e3e9ef'})}${tri(105,90)}${bolt(66,12)+bolt(144,12)+bolt(66,116)+bolt(144,116)}
    <rect x="152" y="6" width="18" height="116" rx="1.5" fill="#9aa2aa"/><rect x="155" y="10" width="12" height="108" fill="#2a3038"/>${Array.from({length:14},(_,i)=>`<rect x="156.5" y="${13+i*7.5}" width="9" height="4.5" fill="#59616a"/>`).join('')}
    ${Array.from({length:12},(_,i)=>`<rect x="${10+i*13}" y="128" width="6" height="7" rx="1" fill="#2f6bd8"/>`).join('')}
    ${ledsHtml([...Array.from({length:10},(_,i)=>[161,16+i*10.5,i%3?'#6dff9a':'#ffb020','io',1.3]),[17,63,'#3dff7a','run',1.6],[23,63,'#ffd24a','com',1.6]])}`},
  rt(o,g){const hz=g.querySelector('.hz'),led=ledRt(g);let acc=0;return {step(dt,t,C,S){led(dt,t,S);acc+=dt;if(acc>.25){acc=0;hz.textContent=C.hz.toFixed(1)}}}}};
T.plc={n:'PLC kontroller',L:2,props:[],
  render(){let s=`<g filter="url(#fSh)"><rect width="242" height="132" rx="3" fill="#3b434c" stroke="#1a1f25"/></g><rect x="0" y="3" width="242" height="6" fill="url(#gMH)"/><rect x="0" y="123" width="242" height="6" fill="url(#gMH)"/>
   <rect x="2" y="6" width="43" height="120" rx="1.5" fill="url(#gMod)" stroke="#5d646b" stroke-width=".5"/>${bolt(8,14)+bolt(38,14)+bolt(8,118)+bolt(38,118)}<rect x="10" y="40" width="26" height="30" rx="2" fill="#b3bac1" stroke="#7d858d" stroke-width=".5"/>${Array.from({length:5},(_,i)=>`<line x1="13" y1="${45+i*5}" x2="33" y2="${45+i*5}" stroke="#7d858d" stroke-width=".8"/>`).join('')}
   <rect x="45" y="34" width="13" height="92" fill="#1c2127" stroke="#0d1115" stroke-width=".5"/><rect x="58" y="34" width="27" height="92" fill="#232a31" stroke="#0d1115" stroke-width=".5"/><rect x="59.5" y="48.5" width="16" height="11" rx="1" fill="#06222a"/>${TX(67.5,56.2,'RUN',{fs:5.6,a:'middle',c:'#6dffe0',w:400,cls:'cpu'})}
   <rect x="61" y="76" width="18" height="10" rx="1" fill="#15191e"/><rect x="85" y="34" width="10" height="92" fill="#15191e"/>`;
   for(let i=0;i<8;i++){const x=95+i*15.2;s+=`<rect x="${x}" y="34" width="14.2" height="92" rx="1" fill="#1a2026" stroke="#0d1115" stroke-width=".5"/><rect x="${x+1}" y="36" width="12.2" height="6" rx="1" fill="#2a3038"/><rect x="${x+2}" y="115" width="10" height="9" rx="1" fill="#2f6bd8" opacity=".85"/>`}
   s+=`<rect x="217" y="34" width="13" height="92" fill="#1c2127" stroke="#0d1115" stroke-width=".5"/><rect x="230" y="6" width="10" height="120" fill="url(#gMod)"/>
   <rect x="94" y="8" width="120" height="24" rx="5" fill="#0e2438" stroke="#2e5f86" stroke-width="1"/>${TX(154,26,'PLC',{fs:16,a:'middle',c:'#ffffff'})}`;
   const L=[];for(let i=0;i<8;i++)for(const dx of [4,10])for(let r=0;r<16;r++)L.push([95+i*15.2+dx,54+r*3.35,r<2||r>13?'#ffd35a':'#7fd4ff','io']);
   for(let r=0;r<12;r++)L.push([50,53+r*4.6,r%4===0?'#ffb020':'#6dff9a','pw']);for(let r=0;r<14;r++)L.push([223.5,51+r*3.9,r%3?'#ff9d3a':'#7fd4ff','io']);
   L.push([62.5,67.5,'#3dff7a','run',1.4],[66,67.5,'#ffd24a','com',1.4],[69.5,67.5,'#3dff7a','com2',1.4],[73,67.5,'#ff3b30','err',1.4],[62,96,'#3dff7a','run',1.3],[62,99.6,'#ffd24a','com',1.3],[62,103.2,'#3dff7a','com2',1.3]);
   return s+ledsHtml(L)},
  rt(o,g){const cpu=g.querySelector('.cpu'),led=ledRt(g);let acc=0;return {step(dt,t,C,S){led(dt,t,S);acc+=dt;if(acc>.25){acc=0;const tr=S.trip>.5,bl=(t*2.2)%1<.5;cpu.textContent=tr?(bl?'TRIP':'ERR'):'RUN';cpu.setAttribute('fill',tr?'#ff6b5a':'#6dffe0')}}}}};
T.aomod={n:'Analog chiqish moduli',L:2,props:[],
  render(){let s=`<g filter="url(#fSh)"><rect width="194" height="112" rx="3" fill="#3b434c" stroke="#1a1f25"/></g><rect x="3" y="3" width="188" height="106" rx="2" fill="#262d34"/><rect x="16" y="6" width="162" height="20" rx="4" fill="#0e2438" stroke="#2e5f86"/>${TX(97,20,'ANALOG CHIQISH MODULI',{fs:10.5,a:'middle',c:'#fff'})}
   <rect x="8" y="30" width="20" height="76" rx="1" fill="#1c2127"/><rect x="30" y="30" width="30" height="76" rx="1" fill="#232a31"/><rect x="33" y="34" width="24" height="10" rx="1" fill="#06222a"/>${Array.from({length:6},(_,i)=>`<rect x="${35+i*3.5}" y="37" width="2.4" height="4" fill="#6dffd8" opacity=".8"/>`).join('')}`;
   for(let i=0;i<14;i++){const x=62+i*8.6;s+=`<rect x="${x}" y="30" width="7.6" height="76" rx="1" fill="#1a2026" stroke="#0d1115" stroke-width=".4"/><rect x="${x+1.5}" y="36" width="4.6" height="44" fill="#11151a"/><rect x="${x+1}" y="96" width="5.6" height="7" rx="1" fill="#2f6bd8" opacity=".8"/>`}
   s+=`<rect x="184" y="40" width="4" height="62" rx="1" fill="#d9a93a"/>`;const L=[];for(let i=0;i<14;i++)L.push([65.8+i*8.6,86,'#ffc24a','ao',1.6]);for(let r=0;r<12;r++)L.push([18,33+r*4,'#6dffd8','io',1]);for(let r=0;r<3;r++)L.push([8,47+r*10,'#3dff7a','run',1.2]);
   for(let i=0;i<14;i++)for(let r=0;r<5;r++)L.push([65.8+i*8.6,40+r*8,'#7fd4ff','io',.9]);return s+ledsHtml(L)},
  rt(o,g){const led=ledRt(g);return {step(dt,t,C,S){led(dt,t,S)}}}};
T.pc={n:'Operator kompyuteri (SCADA)',L:2,props:[],
  render(){let s=`<rect x="-34" y="148" width="318" height="58" rx="7" fill="url(#gKbd)" stroke="#0e1216" filter="url(#fSh)"/>`;for(let r=0;r<5;r++)for(let c=0;c<(r===4?9:20);c++)s+=`<rect x="${-24+c*(r===4?14:12)+(r===4&&c===4?0:0)}" y="${156+r*9}" width="${r===4&&c===4?48:9.5}" height="6.5" rx="1.2" fill="#15191e" stroke="#3a424b" stroke-width=".4"/>`;
   s+=`<ellipse cx="262" cy="170" rx="11" ry="15" fill="#1b2026" stroke="#3a424b" filter="url(#fSh)"/><line x1="262" y1="157" x2="262" y2="166" stroke="#3a424b"/>
   <rect x="108" y="134" width="36" height="10" fill="#2a3038"/><rect x="92" y="142" width="68" height="5" rx="2" fill="#2a3038"/>
   <g filter="url(#fSh)"><rect width="252" height="134" rx="6" fill="#1b2129" stroke="#3a434d"/></g><rect x="8" y="8" width="236" height="112" rx="2" fill="url(#gScr)"/>
   ${TX(18,24,'R(t) — AI xavf indeksi',{fs:12.5,c:'#6fc8f2'})}<circle class="lv" cx="154" cy="20" r="2.4" fill="#ff3b30"/>${TX(159,23.3,'LIVE',{fs:8.5,c:'#ff8a80'})}<rect x="192" y="10" width="50" height="20" rx="3" fill="#0a2338"/>${TX(238,26.5,'—',{fs:18,a:'end',c:'#6fc8f2',cls:'rv'})}`;
   for(let i=0;i<=5;i++){const y=118-81*i/5;s+=`<line x1="36" y1="${y}" x2="239" y2="${y}" stroke="rgba(120,170,220,.18)" stroke-width=".8"/>`+TX(31,y+3,(i/5).toFixed(1),{fs:7.5,a:'end',c:'#cfe0ee',w:600})}
   for(let i=1;i<6;i++){const x=36+203*i/6;s+=`<line x1="${x}" y1="37" x2="${x}" y2="118" stroke="rgba(120,170,220,.12)" stroke-width=".8"/>`}
   s+=`<line class="th" x1="36" x2="239" stroke="rgba(255,120,80,.6)" stroke-dasharray="4 3"/><polyline class="cv" fill="none" stroke="#f4d03f" stroke-width="2" stroke-linejoin="round"/><line class="sc" y1="37" y2="118" stroke="#6fc8f2" stroke-width=".8" opacity=".5"/><circle class="cd2" r="6" fill="#ffe46a" opacity=".3" filter="url(#fGlow)"/><circle class="cd" r="2.6" fill="#ffe46a"/>
   <rect x="126" y="122" width="124" height="19" rx="4" fill="#0e1e2c" stroke="#2e5f86"/>${TX(188,135.5,'Personal kompyuter',{fs:11.5,a:'middle',c:'#fff'})}<circle class="nl" cx="243" cy="126" r="1.5" fill="#3dff7a"/>`;return s},
  rt(o,g){const q=c=>g.querySelector('.'+c),cv=q('cv'),th=q('th'),sc=q('sc'),cd=q('cd'),cd2=q('cd2'),rv=q('rv'),lv=q('lv'),nl=q('nl');let px=36,py=118;
    return {dyn(c){const R=c.id.R,n=Math.min(c.k,R.length-1),P=c.P,st=Math.max(1,Math.floor(R.length/220));let pts='';for(let i=0;i<=n;i+=st)pts+=`${r2(36+203*i/(R.length-1))},${r2(118-81*clip(R[i],0,1))} `;cv.setAttribute('points',pts);
      const ty=118-81*P.RTH;th.setAttribute('y1',ty);th.setAttribute('y2',ty);px=36+203*n/Math.max(1,R.length-1);py=118-81*clip(R[n],0,1);rv.textContent=fmt(R[n],2);rv.setAttribute('fill',R[n]>=P.RTH?'#ffd34d':'#6fc8f2')},
      step(dt,t){sc.setAttribute('x1',px);sc.setAttribute('x2',px);cd.setAttribute('cx',px);cd.setAttribute('cy',py);cd2.setAttribute('cx',px);cd2.setAttribute('cy',py);cd2.setAttribute('r',(4+2.5*Math.abs(Math.sin(t*3))).toFixed(2));lv.setAttribute('opacity',(t%1)<.5?1:.2);if(Math.random()<.2)nl.setAttribute('opacity',Math.random()<.6?1:.2)}}}};
// ---------- quvurlar va signal simlari ----------
const PMAT={gas:{g:'gGasP',r:1.1,sp:150,gap:16,band:'#fffbe0'},air:{g:'gAirP',r:1.1,sp:130,gap:16,band:'#f2fbff'},hot:{g:'gSpark',r:1.4,sp:120,gap:8,band:'#ffd08a'},wet:{g:'gWet',r:2.1,sp:45,gap:7},dry:{g:'gDry',r:1.8,sp:42,gap:9},dust:{g:'gDust',r:1.3,sp:95,gap:7},smoke:{g:'gSmokeP',r:2.6,sp:90,gap:15,band:'#ffffff'},water:{g:'gWatP',r:1.4,sp:80,gap:10,band:'#e8fbff'},none:null};
function pGeo(pts){const seg=[];let L=0;for(let i=1;i<pts.length;i++){const [x0,y0]=pts[i-1],[x1,y1]=pts[i];const l=Math.hypot(x1-x0,y1-y0);seg.push({x0,y0,dx:x1-x0,dy:y1-y0,l,s:L});L+=l}return {seg,L}}
function pAt(P,s){if(s<0)s=0;if(s>P.L)s=P.L;let lo=0,hi=P.seg.length-1;while(lo<hi){const m=(lo+hi+1)>>1;if(P.seg[m].s<=s)lo=m;else hi=m-1}const g=P.seg[lo];if(!g)return [0,0,0,1];const u=g.l?(s-g.s)/g.l:0;return [g.x0+g.dx*u,g.y0+g.dy*u,g.l?-g.dy/g.l:0,g.l?g.dx/g.l:1]}
const ptsStr=pts=>pts.map(p=>r2(p[0])+','+r2(p[1])).join(' ');
T.pipe={n:'Quvur',L:1,line:1,props:[['kind','Quvur turi','sel',[['gas','Gaz (sariq)'],['air','Havo (ko‘k)'],['hot','Issiq agent (metall)'],['metal','Metall'],['copper','Mis rang (chang/mahsulot)'],['water','Suv'],['dark','To‘q kulrang']]],['w','Diametri','num'],['mat','Ichidagi oqim','sel',MATS],['flow','Oqim manbai','flow']],
  render(o){const p=o.p,w=+p.w||8,c=PKINDS[p.kind]||PKINDS.metal,P=ptsStr(o.pts),m=PMAT[p.mat];let s=`<polyline points="${P}" fill="none" stroke="#06090c" stroke-opacity=".55" stroke-width="${w+2.2}" stroke-linejoin="round" stroke-linecap="round" filter="url(#fSoft1)"/>
    <polyline points="${P}" fill="none" stroke="${c[0]}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/><polyline points="${P}" fill="none" stroke="#000" stroke-opacity=".22" stroke-width="${w*.35}" stroke-linejoin="round" stroke-linecap="round" transform="translate(${w*.18} ${w*.18})"/>
    <polyline points="${P}" fill="none" stroke="${c[1]}" stroke-opacity=".75" stroke-width="${Math.max(.8,w*.26)}" stroke-linejoin="round" stroke-linecap="round" transform="translate(${-w*.16} ${-w*.16})"/>`;
    if(p.kind==='hot')s+=`<polyline class="hg" points="${P}" fill="none" stroke="#ff7a1a" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" opacity="0"/>`;
    if(m&&m.band)s+=`<polyline class="bd" points="${P}" fill="none" stroke="${m.band}" stroke-width="${Math.max(2,w*.5)}" stroke-linecap="round" stroke-dasharray="${w*1.2} ${w*4}" opacity="0" filter="url(#fSoft1)"/>`;
    if(m){const L=pGeo(o.pts).L,n=Math.max(2,Math.min(80,Math.round(L/m.gap)));s+=`<g class="pp">${Array.from({length:n},()=>`<circle r="${r2(Math.min(m.r*(w>9?1.15:1),w*.42))}" fill="url(#${m.g})"/>`).join('')}</g>`}
    return s+`<polyline class="hit" points="${P}" fill="none" stroke="transparent" stroke-width="${Math.max(12,w+6)}"/>`},
  rt(o,g){const p=o.p,m=PMAT[p.mat],P=pGeo(o.pts),cs=g.querySelector('.pp')?[...g.querySelector('.pp').children]:[],bd=g.querySelector('.bd'),hg=g.querySelector('.hg'),w=+p.w||8;let pos=0,bo=0;const ph=cs.map((_,i)=>(i*.618)%1*.6),wv=cs.map((_,i)=>2+(i*13%9)*.7),jit=Math.max(0,w*.18);
    return {step(dt,t,C){const f=C[p.flow||'on']||0;if(hg)hg.setAttribute('opacity',(Math.min(.55,C.flame*.35+C.hot*.2)).toFixed(2));if(!m)return;pos+=m.sp*f*dt;const vis=Math.min(1,f*2.2);
      if(bd){bo-=m.sp*1.05*f*dt;bd.style.strokeDashoffset=bo;bd.setAttribute('opacity',Math.min(.6,f*.9).toFixed(2))}const n=cs.length,L=P.L;if(!n||!L)return;
      for(let i=0;i<n;i++){const e=cs[i];if(vis<.01){e.setAttribute('opacity',0);continue}const u=((pos/L+i/n+ph[i]/n)%1+1)%1,sL=u*L,q=pAt(P,sL),j=Math.sin(t*wv[i]+i*1.7)*jit;e.setAttribute('cx',(q[0]+q[2]*j).toFixed(2));e.setAttribute('cy',(q[1]+q[3]*j).toFixed(2));e.setAttribute('opacity',(vis*Math.min(1,Math.min(sL,L-sL)/5)).toFixed(2))}}}}};
T.wire={n:'Signal simi',L:0,line:1,props:[['c','Rangi','color'],['w','Qalinligi','num'],['dash','Uzuq chiziq','sel',[['','Yo‘q'],['1','Ha']]],['pulse','Signal impulsi','sel',[['1','Ha'],['','Yo‘q']]]],
  render(o){const p=o.p,P=ptsStr(o.pts),c=p.c||'#5aa8ff',w=+p.w||1.6;return `<polyline points="${P}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round"${p.dash?` stroke-dasharray="7 4"`:''} opacity=".92"/>`+(p.pulse===''?'':`<polyline class="sg" points="${P}" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round" opacity=".6" filter="url(#fGlow)"/><polyline class="sc" points="${P}" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>`)+`<polyline class="hit" points="${P}" fill="none" stroke="transparent" stroke-width="10"/>`},
  rt(o,g){const a=g.querySelector('.sg'),b=g.querySelector('.sc');if(!a)return null;const L=pGeo(o.pts).L,seg=16,v=150+(o.id.charCodeAt(o.id.length-1)%5)*18,gap=(.8+(o.id.length%7)/7)*v,per=L+gap+seg,ph=Math.random()*per;
    for(const e of [a,b])e.setAttribute('stroke-dasharray',`${seg} ${per-seg}`);let tt=0;return {step(dt){tt+=dt;const s=(tt*v+ph)%per,off=seg-s;a.style.strokeDashoffset=off;b.style.strokeDashoffset=off}}}};

// ---------- standart sxema (asl mnemosxema koordinatalari bo'yicha) ----------
function vmDefault(){const M=[];let n=1;const A=(t,x,y,p,e)=>M.push(Object.assign({id:'d'+(n++),t,x,y,r:0,s:1,p:p||{}},e||{}));const Ln=(t,pts,p)=>M.push({id:'d'+(n++),t,pts,p});
  // signal simlari
  [['388,409 388,389 115,389 115,584 516,584','#8b69bd'],['350,377 350,393 325,393 325,545.5 516,545.5','#3d6ea9'],['395,470 395,539 516,539','#3d6ea9'],['502.5,482 502.5,530 516,530','#8b69bd'],
   ['490,319 490,48.5 1041,48.5 1041,553 757,553','#8898a5'],['526,350 526,163 318,163','#7f9d7b'],['785,409.5 954,409.5 954,510 757,510','#7b9b72'],
   ['582,640 582,650 352,650 352,502','#b8454b'],['573,640 573,663 278,663 278,444','#b8454b'],['555,640 555,681 232,681 232,474','#b8454b'],
   ['516,559 63,559 63,370','#bdd589'],['516,568 52,568 52,370','#92ab71'],['516,576 90,576 90,370','#5b8ea9',1],['212,237 468,237 468,279','#9e4a55'],['202,252 252.5,252 252.5,313 303,313 303,361 329,361','#98b680'],
   ['153,370 153,381 343.5,381 343.5,376','#3b5fa0'],['610.5,640 610.5,731 490,731','#3969ab'],['628,640 628,746 490,746','#3969ab'],['296,683 277.5,683 277.5,732 15.5,732 15.5,245 30,245','#4d71a3'],
   ['642,640 642,741 857,741 857,706 980,706','#7889a3'],['664,640 664,675 980,675','#7889a3']].forEach(w=>Ln('wire',w[0].split(' ').map(p=>p.split(',').map(Number)),{c:w[1],w:1.6,dash:w[2]?'1':'',pulse:'1'}));
  // quvurlar
  const P=(pts,kind,w,mat,flow)=>Ln('pipe',pts,{kind,w,mat,flow});
  P([[143,430.5],[374,430.5]],'gas',7,'gas','gas');P([[143,461],[374,461]],'air',8,'air','air1');P([[143,489],[398,489],[398,478]],'air',8,'air','air2');
  P([[476,453.5],[592,453.5]],'hot',11,'hot','hot');P([[398,280],[401,288],[402,304]],'copper',3.5,'wet','conv1');P([[478,384],[569,384],[606,399]],'metal',13,'wet','feed');
  P([[628.5,263],[628.5,202],[737,202]],'copper',9,'dust','dust');P([[752.5,189],[752.5,154],[889,154]],'copper',9,'dust','dust');
  P([[752.5,286],[752.5,331],[799,331],[799,345]],'copper',8,'dry','prod');P([[930,305],[930,331],[840,331],[840,345]],'copper',8,'dry','prod');
  P([[652,405],[740,445]],'metal',11,'dry','prod');P([[545,342],[811,90]],'metal',8,'dust','dust');P([[818.5,64],[818.5,344]],'metal',10,'dust','dust');
  P([[930,112],[930,105.5],[1110,105.5]],'metal',11,'smoke','fan');
  // uskunalar
  A('inverter',30,236);A('conveyor',284,277.5,{L:107,rr:8.8,mat:'wet',flow:'conv1'});A('hopper',381,297,{lv:'LT01',mixv:'M02'});A('motor',445,318,{flow:'mix'},{r:180});
  A('screw',385.6,364,{L:86,flow:'screw'});A('motor',371,364,{flow:'screw'});A('weigher',470,351,{var:'WT'});A('burner',372,405);
  A('dryer',628,262,{flow:'dry'});A('cyclone',752.5,188,{flow:'dust'});A('bagfilter',930,111,{flow:'dust'},{s:.94});A('prodhopper',820,343,{flow:'prod'});A('cap',818.5,64);
  A('conveyor',720,473.5,{L:206.5,rr:14,mat:'dry',flow:'prod'});A('chimney',1135,86,{H:60,flow:'fan'});A('fan',1135,108.3,{flow:'fan'});A('motor',1166,108.3,{flow:'fan'},{r:180,s:1.35});
  A('plc',515,508);A('aomod',296,688);A('pc',980,578);
  // klapanlar
  A('valve',278,430.5,{label:'1-2',var:'U12'});A('valve',232,461,{label:'1-1',var:'U11'});A('valve',352,489,{label:'1-3',var:'U13'});
  // datchiklar
  const S=(tag,x,y,rim,v,al)=>A('sensor',x,y,{tag,rim,var:v,alarm:al||v});const G='#39b54a',R='#d64541',Y='#d4b23c',B='#3b82e6';
  S('FT01',326.7,421,G,'FT01','LAM');S('FT02',326.7,463.3,G,'FT02','LAM');S('TT01',389.3,425,R,'TT01');S('FT03',396,501,G,'FT03','');S('TT02',510,466.7,R,'TT02');
  S('LT01',380.6,324.6,Y,'LT01');S('M02',468.3,296,Y,'M02');S('WT',498.3,336,B,'WT');S('M01',346.7,360,R,'M01');S('AT01',531.7,366.7,Y,'AT01','');S('AT02',701.7,413.3,B,'AT02');
  // qiymat oynalari
  const V=(v,x,y,w,h,unit,dec,fs)=>A('value',x,y,{var:v,w,h,unit,dec,fs});
  V('LT01',306,294,50,19,'%',1);V('M02',495,287,44,18,'%',0);V('WT',522,328,50,15,'t/soat',1,9.6);V('AT01',555,350,50,18,'%',1);V('AT02',727,396,60,18,'%',2);V('TT02',537,469,54,18,'°C',1);V('FT03',421,492,70,16,'m³/soat',0,10.8);
  // yozuvlar
  const T_=(t,x,y,a,fs)=>A('label',x,y,{text:t,a:a||'start',fs:fs||13.5,c:'#f1f5f8'});
  T_('Nam material',298,262,'start',14);T_('Tabiiy gaz',153,418);T_('Birlamchi',152,451);T_('havo',152,481);T_('Ikkilamchi havo',152,510);
  T_('Quritish\\nagenti',521,425,'middle');T_('Yakuniy\\nmahsulot',891,425,'middle');T_('Ishlatilgan quritish\\nagenti',1219,23,'middle');
  A('panel',20,14,{kind:'status',w:300,h:64});A('panel',20,85,{kind:'burner',w:300,h:128});
  return M}
// ---------- qurish va animatsiya ----------
const VA={st:{gas:0,air1:0,air2:0,hot:0,flame:0,conv1:0,screw:0,feed:0,dry:0,prod:0,fan:0,mix:0,dust:0,trip:0,hz:0,on:1,off:0},cur:{},t:0,last:0,raf:0,paused:false,speed:1};for(const k in VA.st)VA.cur[k]=VA.st[k];
const vmLayer=o=>(T[o.t]||{}).L??2;
function vmObjHtml(o){const D=T[o.t];if(!D)return '';const inner=D.line?D.render(o):`<g transform="translate(${r2(o.x)} ${r2(o.y)})${o.r?` rotate(${r2(o.r)})`:''}${(o.s&&o.s!==1)||o.fx?` scale(${r2((o.s||1)*(o.fx?-1:1))} ${r2(o.s||1)})`:''}">${D.render(o)}</g>`;return inner}
function vmRtFor(o,g){const D=T[o.t];if(!D||!D.rt)return null;try{const r=D.rt(o,g);if(r){r.o=o;r.g=g}return r}catch(e){console.warn(e);return null}}
function vmWake(){if(!VA.raf&&VM.built&&!document.hidden){VA.last=performance.now();VA.raf=requestAnimationFrame(vmFrame)}}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)vmWake()});
function vmBuild(){const svg=$('vmSvg');if(!svg)return;const order=VM.model.map((o,i)=>[o,i]).sort((a,b)=>vmLayer(a[0])-vmLayer(b[0])||a[1]-b[1]);
  svg.innerHTML=VM_DEFS+`<rect width="1289" height="807" fill="url(#gBg)"/><rect id="vmGrid" width="1289" height="807" fill="url(#pGrid)" style="display:${VM.edit?'':'none'}"/><g id="vmL">${order.map(([o])=>`<g class="vo" data-id="${o.id}">${vmObjHtml(o)}</g>`).join('')}</g><g id="vmSelL"></g>`;
  VM.rt=[];svg.querySelectorAll('#vmL > .vo').forEach(g=>{const o=VM.model.find(m=>m.id===g.dataset.id);const r=vmRtFor(o,g);if(r)VM.rt.push(r)});
  if(VM.ctx)VM.rt.forEach(r=>r.dyn&&r.dyn(VM.ctx));vmDrawSel()}
function vmRerender(o){const g=document.querySelector(`#vmL > .vo[data-id="${o.id}"]`);if(!g){vmBuild();return}g.innerHTML=vmObjHtml(o);VM.rt=VM.rt.filter(r=>r.o!==o);const r=vmRtFor(o,g);if(r){VM.rt.push(r);if(VM.ctx&&r.dyn)r.dyn(VM.ctx)}vmDrawSel()}
const VM_COARSE=window.matchMedia&&matchMedia('(pointer:coarse)').matches;   // sensorli qurilmada animatsiya 30 kadr/s bilan cheklanadi
function vmFrame(now){const svg=$('vmSvg');if(!svg||!svg.getClientRects().length||document.hidden){VA.raf=0;return}   // ko'rinmaganda tsikl to'xtaydi (showView qayta ishga tushiradi)
  VA.raf=requestAnimationFrame(vmFrame);if(VM_COARSE&&now-VA.last<30){return}let dt=(now-VA.last)/1000;VA.last=now;if(dt>.1)dt=.1;dt*=VA.paused?0:VA.speed;if(dt<=0)return;VA.t+=dt;
  const S=VA.st,C=VA.cur;for(const k in S){const tau=k==='fan'?1.6:.7;C[k]+=(S[k]-C[k])*Math.min(1,dt/tau)}C.on=1;C.off=0;
  for(const r of VM.rt)if(r.step){try{r.step(dt,VA.t,C,S)}catch(e){}}}
function vmUpdate(c){VM.ctx=c;const d=c.d,k=c.k,P=c.P;const cl=(v,a,b)=>Math.max(a,Math.min(b,isFinite(v)?v:0));const matOn=d.WT[k]>.3,conv1=d.conv[k]&&d.FIN[k]>.2,fanOn=d.burner[k]||d.FT03[k]>100,wf=cl(d.WT[k]/Math.max(.1,P.Fin),0,1.6),on=c.on;
  Object.assign(VA.st,{gas:on?cl(d.FT01[k]/290,.15,1.6):0,air1:cl(d.FT02[k]/3000,0,1.6),air2:cl(d.FT03[k]/6500,0,1.6),hot:fanOn?(on?1:.35):0,flame:on?1:0,conv1:conv1?cl(d.FIN[k]/Math.max(.1,P.Fin),.4,1.5):0,
    screw:matOn?cl(wf,.3,1.5):0,feed:matOn?wf:0,dry:matOn?cl(wf,.3,1.4):0,prod:matOn?cl(wf,.3,1.4):0,fan:fanOn?1:0,dust:fanOn&&matOn?1:(fanOn?.25:0),mix:cl(d.M02[k]/100,0,1.3),trip:c.trip?1:0,hz:matOn?cl((d.M01?d.M01[k]:P.uM01)*.5,0,50):0});
  for(const r of VM.rt)if(r.dyn){try{r.dyn(c)}catch(e){}}}

// ---------- muharrir (tahrirlash rejimi) ----------
const VM_ADD=[['valve','Klapan'],['sensor','Datchik'],['value','Qiymat oynasi'],['label','Yozuv'],['pipe','Quvur'],['wire','Signal simi'],['flange','Flanes'],['motor','Dvigatel'],['pump','Nasos'],['tank','Rezervuar'],
  ['conveyor','Konveyer (nam)'],['conveyor2','Konveyer (mahsulot)'],['screw','Shnek + tarozi'],['hopper','Bunker'],['burner','Gorelka'],['dryer','Quritgich'],['cyclone','Siklon'],['bagfilter','Yengli filtr'],['prodhopper','Mahsulot bunkeri'],
  ['fan','Ventilyator'],['chimney','Mo‘ri'],['cap','Qopqoq'],['plc','PLC'],['aomod','Analog modul'],['inverter','Invertor'],['pc','Kompyuter'],['panel','Holat paneli']];
const VM_NEW={valve:{label:'1-4',var:''},sensor:{tag:'TT03',rim:'#d64541',var:'',alarm:''},value:{var:'TT02',unit:'°C',dec:1,w:54,h:18,fs:13},label:{text:'Yangi yozuv',fs:13.5,c:'#f1f5f8',a:'start'},
  pipe:{kind:'metal',w:8,mat:'dry',flow:'prod'},wire:{c:'#5aa8ff',w:1.6,dash:'',pulse:'1'},motor:{flow:'on'},pump:{flow:'on'},tank:{var:'LT01',w:50,h:80},conveyor:{flow:'conv1'},conveyor2:{flow:'prod'},flange:{w:5,h:16},screw:{flow:'screw',var:'WT'},
  hopper:{lv:'LT01',mixv:'M02'},weigher:{var:'WT'},dryer:{flow:'dry'},cyclone:{flow:'dust'},bagfilter:{flow:'dust'},prodhopper:{flow:'prod'},fan:{flow:'fan'},chimney:{H:60,flow:'fan'},panel:{kind:'status',w:300,h:64}};
const vmSel=()=>VM.model&&VM.model.find(o=>o.id===VM.sel);
function vmPt(e){const svg=$('vmSvg'),p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const q=p.matrixTransform(svg.getScreenCTM().inverse());return [q.x,q.y]}
const vmSnap=v=>VM.grid?Math.round(v/VM.grid)*VM.grid:Math.round(v*10)/10;
let vmSaveT=0;function vmSave(){clearTimeout(vmSaveT);vmSaveT=setTimeout(()=>{try{localStorage.setItem(VM_KEY,JSON.stringify(VM.model))}catch(e){}},250)}
function vmPush(){VM.undo.push(JSON.stringify(VM.model));if(VM.undo.length>80)VM.undo.shift();VM.redo=[]}
function vmCommit(){vmSave();vmProps()}
function vmUndo(){if(!VM.undo.length)return;VM.redo.push(JSON.stringify(VM.model));VM.model=JSON.parse(VM.undo.pop());if(!vmSel())VM.sel=null;vmBuild();vmCommit()}
function vmRedo(){if(!VM.redo.length)return;VM.undo.push(JSON.stringify(VM.model));VM.model=JSON.parse(VM.redo.pop());if(!vmSel())VM.sel=null;vmBuild();vmCommit()}
function vmDrawSel(){const L=$('vmSelL');if(!L)return;let s='';const o=vmSel();
  if(VM.edit&&o){const D=T[o.t];if(D.line){s+=`<polyline points="${ptsStr(o.pts)}" fill="none" stroke="#2dd4bf" stroke-width="1.2" stroke-dasharray="4 3" pointer-events="none"/>`+o.pts.map((p,i)=>`<circle data-h="v" data-i="${i}" cx="${p[0]}" cy="${p[1]}" r="4.6" fill="${i===0?'#2dd4bf':'#0b1b24'}" stroke="#2dd4bf" stroke-width="1.4" style="cursor:move"/>`).join('')}
    else{const b=vmBoxOf(o);if(b){const x=b.x-3,y=b.y-3,w=b.width+6,h=b.height+6;
      s+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#2dd4bf" stroke-width="1.2" stroke-dasharray="4 3" pointer-events="none"/><circle cx="${o.x}" cy="${o.y}" r="2.4" fill="#2dd4bf" pointer-events="none"/>
      <rect data-h="s" x="${x+w-5}" y="${y+h-5}" width="10" height="10" fill="#0b1b24" stroke="#2dd4bf" stroke-width="1.4" style="cursor:nwse-resize"/><line x1="${x+w/2}" y1="${y}" x2="${x+w/2}" y2="${y-16}" stroke="#2dd4bf" stroke-width="1" pointer-events="none"/><circle data-h="r" cx="${x+w/2}" cy="${y-20}" r="5" fill="#0b1b24" stroke="#2dd4bf" stroke-width="1.4" style="cursor:grab"/>`}}}
  if(VM.draft&&VM.draft.pts.length){const pts=VM.draft.hover?[...VM.draft.pts,VM.draft.hover]:VM.draft.pts;s+=`<polyline points="${ptsStr(pts)}" fill="none" stroke="#ffd34d" stroke-width="2" stroke-dasharray="5 3" pointer-events="none"/>`+VM.draft.pts.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="#ffd34d" pointer-events="none"/>`).join('')}
  L.innerHTML=s}
function vmSelect(id){VM.sel=id;vmDrawSel();vmProps()}
function vmAdd(t){if(!VM.edit)return;const D=T[t];if(D.line){VM.mode='line';VM.draft={t,pts:[],hover:null};vmSelect(null);vmHint(`${D.n}: sxemada nuqtalarni ketma-ket bosing. Tugatish — ikki marta bosish yoki Enter, bekor qilish — Esc.`);return}
  vmPush();const o={id:vmId(),t,x:640,y:380,r:0,s:1,p:JSON.parse(JSON.stringify(VM_NEW[t]||{}))};VM.model.push(o);vmBuild();vmSelect(o.id);vmCommit();vmHint('Yangi element markazga qo‘shildi — sichqoncha bilan kerakli joyga suring.')}
function vmFinishLine(){const d=VM.draft;if(!d)return;if(d.pts.length>=2){vmPush();const o={id:vmId(),t:d.t,pts:d.pts,p:JSON.parse(JSON.stringify(VM_NEW[d.t]||{}))};VM.model.push(o);VM.draft=null;VM.mode=null;vmBuild();vmSelect(o.id);vmCommit()}else{VM.draft=null;VM.mode=null;vmDrawSel()}vmHint('')}
function vmDel(){const o=vmSel();if(!o)return;vmPush();VM.model=VM.model.filter(m=>m!==o);VM.sel=null;vmBuild();vmCommit()}
function vmDup(){const o=vmSel();if(!o)return;vmPush();const c=JSON.parse(JSON.stringify(o));c.id=vmId();if(c.pts)c.pts=c.pts.map(p=>[p[0]+15,p[1]+15]);else{c.x+=20;c.y+=20}VM.model.push(c);vmBuild();vmSelect(c.id);vmCommit()}
function vmZ(dir){const o=vmSel();if(!o)return;vmPush();const i=VM.model.indexOf(o);VM.model.splice(i,1);if(dir>0)VM.model.push(o);else VM.model.unshift(o);vmBuild();vmCommit()}
function vmHint(t){const e=$('vmHint');if(e){e.textContent=t;e.hidden=!t}}
let vmDrag=null;
function vmDown(e){if(!VM.edit||e.button===2)return;const pt=vmPt(e),h=e.target.closest('[data-h]'),vo=e.target.closest('#vmL > .vo');
  if(VM.mode==='line'){const p=[vmSnap(pt[0]),vmSnap(pt[1])];const L=VM.draft.pts[VM.draft.pts.length-1];if(!L||Math.hypot(L[0]-p[0],L[1]-p[1])>2)VM.draft.pts.push(p);vmDrawSel();e.preventDefault();return}
  const o=vmSel();
  if(h&&o){const k=h.dataset.h;vmDrag={k,o,i:+h.dataset.i,start:pt,snap:JSON.stringify(VM.model),x0:o.x,y0:o.y,s0:o.s||1,r0:o.r||0,moved:false};
    if(k==='v'&&e.altKey&&o.pts.length>2){vmPush();o.pts.splice(+h.dataset.i,1);vmDrag=null;vmRerender(o);vmCommit()}e.preventDefault();return}
  if(vo){const id=vo.dataset.id;if(id!==VM.sel)vmSelect(id);const s=vmSel();vmDrag={k:'m',o:s,start:pt,snap:JSON.stringify(VM.model),x0:s.x,y0:s.y,pts0:s.pts?s.pts.map(p=>[...p]):null,moved:false};e.preventDefault();return}
  vmSelect(null)}
function vmMove(e){if(!VM.edit)return;const pt=vmPt(e);if(VM.mode==='line'&&VM.draft){let p=[vmSnap(pt[0]),vmSnap(pt[1])];const L=VM.draft.pts[VM.draft.pts.length-1];if(L&&e.shiftKey){if(Math.abs(p[0]-L[0])>Math.abs(p[1]-L[1]))p[1]=L[1];else p[0]=L[0]}VM.draft.hover=p;vmDrawSel();return}
  const d=vmDrag;if(!d)return;const dx=pt[0]-d.start[0],dy=pt[1]-d.start[1];if(!d.moved&&Math.hypot(dx,dy)<1.5)return;if(!d.moved){d.moved=true;VM.undo.push(d.snap);VM.redo=[]}const o=d.o;
  if(d.k==='m'){if(o.pts)o.pts=d.pts0.map(p=>[vmSnap(p[0]+dx),vmSnap(p[1]+dy)]);else{o.x=vmSnap(d.x0+dx);o.y=vmSnap(d.y0+dy)}}
  else if(d.k==='v'){let p=[vmSnap(pt[0]),vmSnap(pt[1])];if(e.shiftKey){const n=o.pts[d.i-1]||o.pts[d.i+1];if(n){if(Math.abs(p[0]-n[0])>Math.abs(p[1]-n[1]))p[1]=n[1];else p[0]=n[0]}}o.pts[d.i]=p}
  else if(d.k==='s'){const a=Math.hypot(d.start[0]-o.x,d.start[1]-o.y)||1,b=Math.hypot(pt[0]-o.x,pt[1]-o.y);o.s=Math.max(.2,Math.min(6,Math.round(d.s0*b/a*100)/100))}
  else if(d.k==='r'){const a0=Math.atan2(d.start[1]-o.y,d.start[0]-o.x),a1=Math.atan2(pt[1]-o.y,pt[0]-o.x);let r=d.r0+(a1-a0)*180/Math.PI;r=e.shiftKey?r:Math.round(r/15)*15;o.r=((Math.round(r)%360)+360)%360}
  vmRerender(o);vmPropsLive()}
function vmUp(){if(vmDrag){if(vmDrag.moved)vmCommit();vmDrag=null}}
function vmDbl(e){if(!VM.edit)return;if(VM.mode==='line'){if(VM.draft&&VM.draft.pts.length>2){const a=VM.draft.pts,b=a[a.length-1],c=a[a.length-2];if(Math.hypot(b[0]-c[0],b[1]-c[1])<6)a.pop()}vmFinishLine();return}
  const o=vmSel();if(o&&o.pts){const pt=vmPt(e);let best=-1,bd=9;for(let i=1;i<o.pts.length;i++){const [x0,y0]=o.pts[i-1],[x1,y1]=o.pts[i],L2=(x1-x0)**2+(y1-y0)**2||1,u=Math.max(0,Math.min(1,((pt[0]-x0)*(x1-x0)+(pt[1]-y0)*(y1-y0))/L2)),dd=Math.hypot(pt[0]-(x0+u*(x1-x0)),pt[1]-(y0+u*(y1-y0)));if(dd<bd){bd=dd;best=i}}
    if(best>0){vmPush();o.pts.splice(best,0,[vmSnap(pt[0]),vmSnap(pt[1])]);vmRerender(o);vmCommit()}}}
function vmKey(e){if(!VM.edit)return;const tg=e.target.tagName;if(tg==='INPUT'||tg==='SELECT'||tg==='TEXTAREA')return;const k=e.key,c=e.ctrlKey||e.metaKey;
  if(k==='Escape'){if(VM.draft){VM.draft=null;VM.mode=null;vmDrawSel();vmHint('')}else vmSelect(null);e.preventDefault()}
  else if(k==='Enter'&&VM.draft){vmFinishLine();e.preventDefault()}
  else if((k==='Delete'||k==='Backspace')&&VM.sel){vmDel();e.preventDefault()}
  else if(c&&(k==='z'||k==='Z')){e.shiftKey?vmRedo():vmUndo();e.preventDefault()}else if(c&&(k==='y'||k==='Y')){vmRedo();e.preventDefault()}
  else if(c&&(k==='d'||k==='D')){vmDup();e.preventDefault()}
  else if(k.startsWith('Arrow')&&VM.sel){const o=vmSel(),st=e.shiftKey?10:1,dx=k==='ArrowLeft'?-st:k==='ArrowRight'?st:0,dy=k==='ArrowUp'?-st:k==='ArrowDown'?st:0;vmPush();if(o.pts)o.pts=o.pts.map(p=>[p[0]+dx,p[1]+dy]);else{o.x+=dx;o.y+=dy}vmRerender(o);vmCommit();e.preventDefault()}}
// ---------- xususiyatlar paneli ----------
function vmField(o,f){const [k,lab,type,opts]=f,v=o.p[k]??'';const id='vmf_'+k;let inp;
  if(type==='sel'||type==='var'||type==='flow'){const list=type==='var'?MVARS:type==='flow'?FLOWS:opts;inp=`<select id="${id}" data-k="${k}">${list.map(x=>`<option value="${xa(x[0])}"${String(v)===String(x[0])?' selected':''}>${xa(x[1])}</option>`).join('')}</select>`}
  else if(type==='color')inp=`<input id="${id}" data-k="${k}" type="color" value="${/^#[0-9a-f]{6}$/i.test(v)?v:'#5aa8ff'}">`;
  else if(type==='num')inp=`<input id="${id}" data-k="${k}" type="number" step="any" value="${xa(v)}">`;else inp=`<input id="${id}" data-k="${k}" type="text" value="${xa(v)}">`;
  return `<label for="${id}">${xa(lab)}</label>${inp}`}
function vmProps(){const box=$('vmProps');if(!box)return;const o=vmSel();if(!o){box.innerHTML=`<p class="vmmut">Elementni tanlash uchun ustiga bosing. Yangi element qo‘shish uchun yuqoridagi ro‘yxatdan tanlang.</p>`;return}
  const D=T[o.t];let h=`<div class="vmph"><b>${xa(D.n)}</b></div><div class="vmgrid">`;
  if(!D.line)h+=`<label for="vmX">X</label><input id="vmX" type="number" step="any" value="${r2(o.x)}"><label for="vmY">Y</label><input id="vmY" type="number" step="any" value="${r2(o.y)}"><label for="vmR">Burchak, °</label><input id="vmR" type="number" step="any" value="${r2(o.r||0)}"><label for="vmS">Masshtab</label><input id="vmS" type="number" step=".05" min=".2" max="6" value="${r2(o.s||1)}">`;
  h+=D.props.map(f=>vmField(o,f)).join('')+`</div><div class="vmbtns">`;
  if(!D.line)h+=`<button type="button" class="sec" data-a="rl">⟲ 90°</button><button type="button" class="sec" data-a="rr">⟳ 90°</button><button type="button" class="sec" data-a="fh">⇋ Aks</button>`;else h+=`<button type="button" class="sec" data-a="rev">⇄ Yo‘nalishni teskari</button>`;
  h+=`<button type="button" class="sec" data-a="dup">Nusxa</button><button type="button" class="sec" data-a="up">Oldinga</button><button type="button" class="sec" data-a="dn">Orqaga</button><button type="button" class="del" data-a="del">O‘chirish</button></div>`;
  if(D.line)h+=`<p class="vmmut">Nuqtani surish — tutib torting; yangi nuqta — chiziq ustida ikki marta bosing; nuqtani o‘chirish — Alt + bosish.</p>`;box.innerHTML=h;
  const num=(id,f)=>{const e=$(id);if(e)e.onchange=()=>{const v=parseFloat(e.value);if(!isFinite(v))return;vmPush();f(v);vmRerender(o);vmCommit()}};
  num('vmX',v=>o.x=v);num('vmY',v=>o.y=v);num('vmR',v=>o.r=((v%360)+360)%360);num('vmS',v=>o.s=Math.max(.2,Math.min(6,v)));
  box.querySelectorAll('[data-k]').forEach(e=>e.onchange=()=>{const k=e.dataset.k,f=D.props.find(x=>x[0]===k);vmPush();o.p[k]=f&&f[2]==='num'?(parseFloat(e.value)||0):e.value;vmRerender(o);vmCommit()});
  box.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{const a=b.dataset.a;if(a==='del')return vmDel();if(a==='dup')return vmDup();if(a==='up')return vmZ(1);if(a==='dn')return vmZ(-1);vmPush();
    if(a==='rl')o.r=(((o.r||0)-90)%360+360)%360;if(a==='rr')o.r=((o.r||0)+90)%360;if(a==='fh')o.fx=!o.fx;if(a==='rev')o.pts.reverse();vmRerender(o);vmCommit()})}
function vmPropsLive(){const o=vmSel();if(!o||o.pts)return;const s=(id,v)=>{const e=$(id);if(e&&document.activeElement!==e)e.value=r2(v)};s('vmX',o.x);s('vmY',o.y);s('vmR',o.r||0);s('vmS',o.s||1)}
// ---------- fayllar ----------
function vmExport(){const b=new Blob([JSON.stringify({format:'quritgich-mnemo',v:2,model:VM.model},null,1)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='mnemosxema.json';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
function vmImport(f){const r=new FileReader();r.onload=()=>{try{if(r.result.length>2e6)throw new Error('fayl juda katta');const j=JSON.parse(r.result),m=sanitizeMnemo(Array.isArray(j)?j:j&&j.model,Object.keys(T));if(!m)throw new Error('fayl formati noto‘g‘ri');vmPush();VM.model=m;VM.sel=null;vmBuild();vmCommit();vmHint('Sxema fayldan yuklandi.')}catch(e){vmHint('Yuklab bo‘lmadi: '+e.message)}};r.readAsText(f)}
function vmReset(){if(!confirm('Sxemani asl holatiga qaytarasizmi? Kiritilgan o‘zgarishlar o‘chadi (Ctrl+Z bilan qaytarish mumkin).'))return;vmPush();VM.model=vmDefault();VM.sel=null;vmBuild();vmCommit()}
function vmSetEdit(on){VM.edit=on;const h=$('mimic');h.classList.toggle('vmediting',on);$('vmEditB').textContent=on?'✓ Tahrirlashni tugatish':'✎ Sxemani tahrirlash';const g=$('vmGrid');if(g)g.style.display=on?'':'none';if(!on){VM.draft=null;VM.mode=null;VM.sel=null;vmHint('')}vmDrawSel();vmProps()}
const VM_CSS=`
.vmtool{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;margin:0 2px 10px;font-size:12.5px;color:var(--mut)}
.vmtool button{padding:5px 12px;font-size:12.5px}.vmtool select{width:auto;padding:3px 6px;margin-left:4px}.vmtool label{display:inline-flex;align-items:center;gap:6px;margin:0;color:var(--ink);font-size:12.5px}
.vmwrap{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;align-items:start}
.vmediting .vmwrap{grid-template-columns:minmax(0,1fr) 270px}
.vmstage{position:relative;min-width:720px}
#mimic .vmstage svg{display:block;width:100%;height:auto;border-radius:8px;min-width:0;touch-action:none;user-select:none;-webkit-user-select:none}
.vmediting .vmstage svg{outline:2px dashed rgba(45,212,191,.5);outline-offset:2px}
.vmediting #vmL .vo{cursor:move}
.vmside{display:none;background:var(--pan);border:1px solid var(--line);border-radius:8px;padding:10px;font-size:12.5px;max-height:820px;overflow:auto}
.vmediting .vmside{display:block}
.vmside h3{font-size:13px;margin:4px 0 6px}
.vmpal{display:flex;flex-wrap:wrap;gap:4px}
#mimic .vmpal button{padding:3px 8px;font-size:12px;background:transparent;color:var(--ink);border:1px solid var(--line);border-radius:12px}
#mimic .vmpal button:hover{border-color:#2dd4bf;color:#2dd4bf}
.vmgrid{display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 8px;align-items:center}
.vmgrid label{margin:0;font-size:12px}.vmgrid input,.vmgrid select{padding:3px 6px;font-size:12px;width:100%}.vmgrid input[type=color]{height:26px;padding:1px}
.vmbtns{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px}.vmbtns button{padding:3px 8px;font-size:12px}
#mimic .vmbtns .del{background:#c62828;border-color:#c62828;color:#fff}
.vmph{margin-bottom:6px;color:#2dd4bf}.vmmut{color:var(--mut);margin:6px 0;font-size:12px;line-height:1.4}
.vmhint{margin:8px 2px 0;padding:6px 10px;border-radius:6px;background:rgba(255,211,77,.12);color:var(--ink);font-size:12.5px}
.vmsep{border:0;border-top:1px solid var(--line);margin:10px 0}
#mimic:fullscreen{background:#0a1018;padding:12px 16px;overflow:auto;color:#e9eff6}
#mimic:fullscreen .vmstage{width:min(100%,calc((100vh - 90px) * 1.597));margin:0 auto}
#v-overview .vmtool,#v-overview .vmside{display:none!important}#v-overview .vmwrap{grid-template-columns:minmax(0,1fr)!important}
@keyframes spg{0%{transform:scale(1);opacity:0}8%{opacity:.7}60%{transform:scale(1.45);opacity:0}100%{opacity:0}}
#vmSvg .sping{animation:spg 3s ease-out infinite;opacity:0;transform-box:fill-box;transform-origin:center}
@media (prefers-reduced-motion:reduce){#vmSvg .sping{animation-duration:6s}}
`;
function vmMount(host){
  let m=null;try{const s=localStorage.getItem(VM_KEY);if(s){const j=JSON.parse(s);m=sanitizeMnemo(j,Object.keys(T))}}catch(e){}
  VM.model=m||vmDefault();
  host.innerHTML=`<style>${VM_CSS}</style><div class="vmtool"><button type="button" class="sec" id="vmPlay">⏸ Pauza</button><label>Harakat tezligi <select id="vmSpd"><option value="0.5">0,5×</option><option value="1" selected>1×</option><option value="1.5">1,5×</option><option value="2">2×</option></select></label><span style="flex:1"></span>
   <button type="button" id="vmEditB">✎ Sxemani tahrirlash</button><button type="button" class="sec" id="vmFull">⛶ To‘liq ekran</button></div>
   <div class="vmwrap"><div class="vmstage"><svg id="vmSvg" viewBox="0 0 1289 807" role="img" aria-label="Quritish qurilmasi mnemosxemasi"></svg></div>
   <aside class="vmside" aria-label="Sxema muharriri"><h3>Element qo‘shish</h3><div class="vmpal">${VM_ADD.map(a=>`<button type="button" data-add="${a[0]}">${xa(a[1])}</button>`).join('')}</div><hr class="vmsep">
    <h3>Xususiyatlar</h3><div id="vmProps"></div><hr class="vmsep"><h3>Sxema</h3>
    <div class="vmbtns"><button type="button" class="sec" id="vmUndo">↶ Qaytarish</button><button type="button" class="sec" id="vmRedo">↷ Takrorlash</button></div>
    <label style="display:flex;gap:6px;align-items:center;margin:8px 0 0;color:var(--ink)"><input type="checkbox" id="vmSnapC" checked style="width:auto"> To‘rga yopishish (5 px)</label>
    <div class="vmbtns"><button type="button" class="sec" id="vmExp">Faylga saqlash</button><button type="button" class="sec" id="vmImpB">Fayldan yuklash</button><input type="file" id="vmImp" accept=".json,application/json" hidden><button type="button" class="sec" id="vmRst">Asl sxema</button></div>
    <p class="vmmut">O‘zgarishlar shu kompyuterda avtomatik saqlanadi. Tugmalar: Delete — o‘chirish, Ctrl+Z / Ctrl+Y, Ctrl+D — nusxa, strelkalar — surish (Shift — 10 px), Shift — to‘g‘ri burchak.</p></aside></div>
   <div class="vmhint" id="vmHint" hidden></div>`;
  const svg=$('vmSvg');svg.addEventListener('pointerdown',e=>{vmDown(e);if(vmDrag)try{svg.setPointerCapture(e.pointerId)}catch(_){}});svg.addEventListener('pointermove',vmMove);svg.addEventListener('pointerup',vmUp);svg.addEventListener('pointercancel',vmUp);svg.addEventListener('dblclick',vmDbl);
  svg.addEventListener('contextmenu',e=>{if(VM.edit)e.preventDefault()});document.addEventListener('keydown',vmKey);
  host.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>vmAdd(b.dataset.add));
  if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches){VA.paused=true;$('vmPlay').textContent='▶ Davom'}
  $('vmPlay').onclick=()=>{VA.paused=!VA.paused;$('vmPlay').textContent=VA.paused?'▶ Davom':'⏸ Pauza'};$('vmSpd').onchange=e=>{VA.speed=+e.target.value};
  $('vmFull').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else if(host.requestFullscreen)host.requestFullscreen()};
  $('vmEditB').onclick=()=>vmSetEdit(!VM.edit);$('vmUndo').onclick=vmUndo;$('vmRedo').onclick=vmRedo;$('vmSnapC').onchange=e=>{VM.grid=e.target.checked?5:0};
  $('vmExp').onclick=vmExport;$('vmImpB').onclick=()=>$('vmImp').click();$('vmImp').onchange=e=>{if(e.target.files[0])vmImport(e.target.files[0]);e.target.value=''};$('vmRst').onclick=vmReset;
  VM.built=true;vmBuild();vmProps();if(!VA.raf){VA.last=performance.now();VA.raf=requestAnimationFrame(vmFrame)}}
function mimic(){const host=$('mimic');if(!VM.built)vmMount(host);const k=timeK(),d=cur.run.d,a=cur.e.a;vmUpdate({d,k,id:cur.idx,P:cur.P,on:!!(d.burner[k]&&d.FT01[k]>5),trip:a.trip>=0&&k>=a.trip,tripJ:a.tripJ})}

// ================== ASL KO'RINISHDAGI USKUNALAR (rasmdan ajratilgan, tahrirlanadigan obyektlar) ==================
// SPR — har bir uskunaning shaffof fonli tasviri va asl joyi; SPR._bg — tozalangan fon
const SPR_DEFS=()=>`<defs>${Object.keys(SPR).filter(k=>k[0]!=='_').map(k=>`<image id="spr_${k}" href="${SPR[k].src}" width="${SPR[k].w}" height="${SPR[k].h}"/>`).join('')}</defs>`;
const rollA=(cx,cy,r,w)=>`<g><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#gRoll)" stroke="#5d646b" stroke-width=".6"/><g class="spin" data-cx="${cx}" data-cy="${cy}"><line x1="${cx-r*.62}" y1="${cy}" x2="${cx+r*.62}" y2="${cy}" stroke="#23282e" stroke-width="${w}" stroke-linecap="round"/><line x1="${cx}" y1="${cy-r*.62}" x2="${cx}" y2="${cy+r*.62}" stroke="#23282e" stroke-width="${w}" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="${r*.14}" fill="#23282e"/></g></g>`;
const spinRt=g=>{const S=[...g.querySelectorAll('.spin')];let a=0;return (da)=>{a=(a+da)%360;S.forEach(e=>e.setAttribute('transform',`rotate(${a.toFixed(1)} ${e.dataset.cx} ${e.dataset.cy})`))}};
function SP(key,name,props,overlay,rt){T[key]={n:name,L:2,spr:key,props:props||[],box:()=>[0,0,SPR[key].w,SPR[key].h],
  render(o){const s=SPR[key];return `<use href="#spr_${key}"/>`+(overlay?`<g transform="translate(${-s.x} ${-s.y})">${overlay(o,'c'+o.id)}</g>`:'')},rt:rt||null}}
const FP=[['flow','Ishlash holati','flow']];
// --- nam material konveyeri
SP('conveyor','Konveyer (nam material)',FP,(o,u)=>`<rect x="287" y="271.2" width="96" height="1.8" fill="#3a3f40"/><clipPath id="${u}a"><rect x="284" y="272.6" width="107" height="11"/></clipPath><clipPath id="${u}b"><rect x="286" y="255" width="98" height="17.8"/></clipPath>
  <g clip-path="url(#${u}a)" opacity=".5">${Array.from({length:9},()=>`<line class="seam" y1="273" y2="283.5" stroke="#8f979e" stroke-width=".7"/>`).join('')}</g>
  <g clip-path="url(#${u}b)">${Array.from({length:7},()=>`<ellipse class="dome" cy="272.6" rx="7.3" ry="6.4" fill="url(#gDomeW)" stroke="#4b3218" stroke-width=".35"/>`).join('')}</g>${rollA(284,277.4,8.8,1.6)+rollA(390.6,278.6,8.8,1.6)}`,
  (o,g)=>{const D=[...g.querySelectorAll('.dome')],Se=[...g.querySelectorAll('.seam')],sp=spinRt(g);let b=0;return {step(dt,t,C){const f=C[o.p.flow||'conv1'];b+=34*f*dt;sp(-34*f*dt/8.8*57.3);
    D.forEach((e,i)=>{const x=286+((b+i*15)%105);e.setAttribute('cx',x.toFixed(2));e.setAttribute('opacity',x>377?Math.max(0,(384-x)/7).toFixed(2):x<293?((x-286)/7).toFixed(2):1)});Se.forEach((e,i)=>{const x=(284+((b+i*14)%112)).toFixed(2);e.setAttribute('x1',x);e.setAttribute('x2',x)})}}});
// --- tayyor mahsulot konveyeri
SP('conveyor2','Konveyer (tayyor mahsulot)',FP,(o,u)=>`<rect x="791.5" y="451.6" width="135" height="9" fill="#050608"/><line x1="791.5" y1="451.4" x2="926.5" y2="451.4" stroke="#3d4753" stroke-width=".8"/><rect x="737" y="460" width="190" height="1.4" fill="#4a5058"/>
  <clipPath id="${u}a"><rect x="720" y="460.6" width="206" height="22.6"/></clipPath><clipPath id="${u}b"><rect x="736" y="440" width="182" height="20.6"/></clipPath>
  <g clip-path="url(#${u}a)" opacity=".45">${Array.from({length:15},()=>`<line class="seam" y1="462" y2="482.5" stroke="#8f979e" stroke-width=".8"/>`).join('')}</g>
  <g clip-path="url(#${u}b)">${Array.from({length:10},()=>`<ellipse class="dome" cy="460.8" rx="8.6" ry="7.6" fill="url(#gDomeD)" stroke="#7a5a2c" stroke-width=".35"/>`).join('')}</g>${rollA(720,473.5,14.2,2.4)+rollA(926.5,473.5,14.2,2.4)}`,
  (o,g)=>{const D=[...g.querySelectorAll('.dome')],Se=[...g.querySelectorAll('.seam')],sp=spinRt(g);let b=0;return {step(dt,t,C){const f=C[o.p.flow||'prod'];b+=30*f*dt;sp(-30*f*dt/14.2*57.3);
    D.forEach((e,i)=>{const x=736+((b+i*19)%190);e.setAttribute('cx',x.toFixed(2));e.setAttribute('opacity',x>908?Math.max(0,(918-x)/10).toFixed(2):x<746?((x-736)/10).toFixed(2):1)});Se.forEach((e,i)=>{const x=(720+((b+i*15)%210)).toFixed(2);e.setAttribute('x1',x);e.setAttribute('x2',x)})}}});
// --- bunker va aralashtirgich M02
SP('hopper','Bunker (M02 aralashtirgichli)',[['lv','Sath o‘lchovi','var'],['mixv','Aralashtirgich tezligi','var']],(o,u)=>`<clipPath id="${u}h"><path d="M385 301H434.5V356.5H408V347L386 332Z"/></clipPath><g clip-path="url(#${u}h)">
  <rect x="384" y="300" width="52" height="58" fill="url(#gMV)"/><rect x="384" y="300" width="52" height="58" fill="#000" opacity=".12"/><path class="sand" fill="url(#gSand)"/><path class="sand" fill="url(#pSand)"/><path class="surf" fill="none" stroke="#fff1c9" stroke-width="1.1" opacity=".85"/>
  <line x1="386" y1="315.5" x2="436" y2="315.5" stroke="#6d747b" stroke-width="1.6"/>${[396,410,424].map(x=>`<g transform="translate(${x} 315.5)"><g class="pad"><rect x="-1.2" y="-8.5" width="2.4" height="17" rx="1" fill="#59616a"/><rect x="-3.2" y="-8.5" width="6.4" height="2.4" rx="1" fill="#7c848d"/><rect x="-3.2" y="6.1" width="6.4" height="2.4" rx="1" fill="#7c848d"/></g></g>`).join('')}</g>`,
  (o,g)=>{const sand=[...g.querySelectorAll('.sand')],surf=g.querySelector('.surf'),pads=[...g.querySelectorAll('.pad')];let lv=50,cur=50,mix=0,mp=0;
    return {dyn(c){const v=vmVal(o.p.lv||'LT01',c);lv=isFinite(v)?Math.max(0,Math.min(100,v)):50;const m=vmVal(o.p.mixv||'M02',c);mix=isFinite(m)?Math.max(0,Math.min(1.3,m/100)):0},
      step(dt,t){cur+=(lv-cur)*Math.min(1,dt/.5);const y=356.5-53.5*cur/100;let d=`M384 ${y.toFixed(2)}`;for(let x=384;x<=436;x+=4)d+=` L${x} ${(y+Math.sin(x*.45+t*3.2)*.7*mix+Math.sin(x*.21-t*1.7)*.5*mix).toFixed(2)}`;
        surf.setAttribute('d',d);sand.forEach(e=>e.setAttribute('d',d+' L436 360 L384 360Z'));mp+=mix*dt*9;pads.forEach((e,i)=>e.setAttribute('transform',`scale(1 ${Math.cos(mp+i*1.05).toFixed(3)})`))}}});
// --- shnek M01 + tarozi WT
SP('screw','Shnekli ta’minlagich + tarozi',[['flow','Ishlash holati','flow'],['var','Tarozi o‘lchovi','var']],(o,u)=>`<clipPath id="${u}s"><rect x="392" y="358.4" width="77" height="10"/></clipPath><g clip-path="url(#${u}s)">${Array.from({length:12},()=>`<path class="fl" d="M0 358.6 L4 368.2" stroke="#d9dde2" stroke-width="1.4" opacity=".55"/>`).join('')}
  ${Array.from({length:9},()=>`<circle class="gr" r="2.1" fill="url(#gWet)"/>`).join('')}</g>${Array.from({length:3},()=>`<circle class="go" cx="421" r="1.8" fill="url(#gWet)"/>`).join('')}${rollA(385.6,364.6,6,1.2)}
  <rect x="480" y="357.5" width="23.5" height="11.5" rx="1.5" fill="#1a2b40"/><text class="wt" x="491.7" y="367.2" font-size="10.5" text-anchor="middle" fill="#e8f0f8" font-weight="700" font-family="${FONT}">—</text>`,
  (o,g)=>{const fl=[...g.querySelectorAll('.fl')],gr=[...g.querySelectorAll('.gr')],go=[...g.querySelectorAll('.go')],wt=g.querySelector('.wt'),sp=spinRt(g);let p=0;
    return {dyn(c){const v=vmVal(o.p.var||'WT',c);wt.textContent=isFinite(v)?fmt(v,1):'—'},step(dt,t,C){const f=C[o.p.flow||'screw'];p+=22*f*dt;sp(-420*f*dt);const vis=Math.min(1,f*2).toFixed(2);
      fl.forEach((e,i)=>e.setAttribute('transform',`translate(${(392+((p+i*7)%84)).toFixed(2)} 0)`));gr.forEach((e,i)=>{e.setAttribute('cx',(409+((p*1.2+i*6.6)%59)).toFixed(2));e.setAttribute('cy',(361.5+Math.sin(t*3+i)*1.2).toFixed(2));e.setAttribute('opacity',vis)});
      go.forEach((e,i)=>{const s=(p*.6+i*3)%9;e.setAttribute('cy',(352+s).toFixed(2));e.setAttribute('opacity',vis)})}}});
// --- gorelka va o'txona
SP('burner','Gorelka / o‘txona',[],(o,u)=>`<clipPath id="${u}f"><rect x="412" y="423.3" width="55.5" height="25" rx="3"/></clipPath><g clip-path="url(#${u}f)"><rect x="410" y="421" width="60" height="30" fill="url(#gFire)"/>
  <g class="flm" opacity="0"><ellipse cx="420" cy="436" rx="30" ry="14" fill="url(#gHeat)" opacity=".8"/><path class="f1" d="M412 436 C420 427 438 426 470 433 C446 438 430 441 412 436Z" fill="url(#gFlame)"/><path class="f2" d="M412 435.5 C422 430 440 430 465 436 C442 440 426 441 412 435.5Z" fill="url(#gFlame)" opacity=".9"/><path class="f3" d="M412 436 C418 433 428 433 440 436 C428 439 418 439 412 436Z" fill="url(#gFlameB)"/>
  ${Array.from({length:8},()=>`<circle class="emb" r=".9" fill="#ffe08a"/>`).join('')}</g></g><text class="stt" x="441" y="445" font-size="12" text-anchor="middle" font-weight="700" fill="#f4e6e2" paint-order="stroke" stroke="#3a0802" stroke-width="0" font-family="${FONT}">O‘chiq</text>
  <rect class="dim" x="378.5" y="458.5" width="96.5" height="16.5" rx="2.5" fill="#1a0806" opacity=".55"/><rect class="glw" x="376" y="456" width="101.5" height="21.5" rx="4" fill="none" stroke="#ff3b30" stroke-width="2.4" opacity="0" filter="url(#fGlow)"/>`,
  (o,g)=>{const q=c=>g.querySelector('.'+c),flm=q('flm'),f1=q('f1'),f2=q('f2'),f3=q('f3'),emb=[...g.querySelectorAll('.emb')],stt=q('stt'),dim=q('dim'),glw=q('glw');const tf=(sx,sy)=>`translate(412 436) scale(${sx.toFixed(3)} ${sy.toFixed(3)}) translate(-412 -436)`;
    return {dyn(c){stt.textContent=c.on?'Yoniq':'O‘chiq';stt.setAttribute('fill',c.on?'#fff4d6':'#f4e6e2');stt.setAttribute('stroke-width',c.on?2.6:0)},
      step(dt,t,C,S){const fl=C.flame;flm.setAttribute('opacity',Math.min(1,fl*1.3).toFixed(2));if(fl>.02){const n1=Math.sin(t*23)*.5+Math.sin(t*37+1)*.3+Math.random()*.2,n2=Math.sin(t*29+2)*.5+Math.sin(t*17)*.3+Math.random()*.2,sx=(.55+.45*Math.min(1.3,S.gas))*fl;
        f1.setAttribute('transform',tf(sx*(.92+n1*.1),.9+n2*.14));f2.setAttribute('transform',tf(sx*(.95+n2*.08),.85+n1*.16));f3.setAttribute('transform',tf(.9+n1*.12,1));
        emb.forEach((e,i)=>{const s=(t*.9+i/8)%1;e.setAttribute('cx',(416+s*50).toFixed(2));e.setAttribute('cy',(436+Math.sin(t*6+i*2)*6*s).toFixed(2));e.setAttribute('opacity',((1-s)*.9).toFixed(2))})}
        const tr=S.trip>.5,bl=(t*2.2)%1<.5;dim.setAttribute('opacity',tr?(bl?0:.35):.55);glw.setAttribute('opacity',tr&&bl?.95:0)}}});
// --- quritgich
SP('dryer','Quritgich',FP,(o,u)=>`<clipPath id="${u}w"><path d="M612.2 331.2H646.3L637.9 391.3H621.1Z"/></clipPath><clipPath id="${u}b"><path d="M606 399H652L664 436H592Z"/></clipPath>
  <g clip-path="url(#${u}w)"><rect x="610" y="330" width="40" height="63" fill="url(#gWin)"/><g class="haze" opacity="0">${[0,1,2].map(i=>`<path d="M${618+i*9} 392 q4 -10 0 -20 q-4 -10 0 -20 q4 -10 0 -22" fill="none" stroke="#ffb870" stroke-width="2.2" opacity=".22" filter="url(#fSoft1)"/>`).join('')}</g>
  ${Array.from({length:34},(_,i)=>`<circle class="ri" r="${(1+((i*7)%5)*.28).toFixed(2)}" fill="${i%4?'url(#gDry)':'url(#gWet)'}"/>`).join('')}</g><g clip-path="url(#${u}b)">${Array.from({length:18},(_,i)=>`<circle class="bu" r="${(1.1+(i%3)*.35).toFixed(2)}" fill="${i%3?'url(#gDry)':'url(#gWet)'}"/>`).join('')}</g>`,
  (o,g)=>{const ri=[...g.querySelectorAll('.ri')],bu=[...g.querySelectorAll('.bu')],hz=g.querySelector('.haze');let pr=0,pb=0;
    return {step(dt,t,C){const f=C[o.p.flow||'dry'];pr+=f*dt;pb+=f*dt*2.4;hz.setAttribute('opacity',Math.min(1,C.hot*1.2).toFixed(2));const H=61,vis=Math.min(1,f*2);
      ri.forEach((e,i)=>{const sp=26+(i*7%10)*3.2,s=((pr*sp+i*17.3)%H+H)%H,y=391-s,k=(y-331)/60,xl=612.2+8.9*k,xr=646.3-8.4*k,uu=((i*.371)%1)*.8+.1+Math.sin(t*1.8+i)*.07;
        e.setAttribute('cx',(xl+(xr-xl)*uu).toFixed(2));e.setAttribute('cy',y.toFixed(2));e.setAttribute('opacity',(Math.min(1,s/8,(H-s)/8)*vis).toFixed(2))});
      bu.forEach((e,i)=>{const a=pb*(1+(i%4)*.18)+i*.9,rx=10+(i%5)*4,ry=6+(i%3)*3.5;e.setAttribute('cx',(628+rx*Math.cos(a)).toFixed(2));e.setAttribute('cy',(418+ry*Math.sin(a)-(i%2)*4).toFixed(2));e.setAttribute('opacity',vis.toFixed(2))})}}});
// --- siklon
SP('cyclone','Siklon',FP,(o,u)=>`<clipPath id="${u}c"><path d="M738 191H767V251L757 283H748L738 251Z"/></clipPath><g clip-path="url(#${u}c)">${Array.from({length:22},()=>`<circle class="cy" r="1.25" fill="url(#gDry)"/>`).join('')}</g>`,
  (o,g)=>{const cy=[...g.querySelectorAll('.cy')];let p=0;return {step(dt,t,C){const f=C[o.p.flow||'dust'];p+=f*dt;cy.forEach((e,i)=>{const s=((p*.55+i/22)%1+1)%1,y=193+s*88,R=y<251?13.5:13.5*(1-(y-251)/34)+1.5,a=p*9+i*2.2+s*14,z=Math.sin(a);
    e.setAttribute('cx',(752.5+R*Math.cos(a)).toFixed(2));e.setAttribute('cy',(y+z*2.2).toFixed(2));e.setAttribute('opacity',(Math.min(1,f*2)*(.45+.55*(z+1)/2)).toFixed(2))})}}});
// --- yengli filtr
SP('bagfilter','Yengli filtr',FP,()=>`${[[902,152,15,88],[922,152,15,88],[944,152,16,88]].map(b=>`<rect class="bag" x="${b[0]}" y="${b[1]}" width="${b[2]}" height="${b[3]}" rx="7" fill="#fff" opacity="0"/>`).join('')}${Array.from({length:10},()=>`<circle class="bd" r="1.3" fill="url(#gDust)" opacity="0"/>`).join('')}`,
  (o,g)=>{const bags=[...g.querySelectorAll('.bag')],bd=[...g.querySelectorAll('.bd')];return {step(dt,t,C){const f=Math.min(1,C[o.p.flow||'dust']*2),cyc=t%6,bi=Math.floor(t/6)%3;
    bags.forEach((e,i)=>{const on=i===bi&&cyc<.35;e.setAttribute('opacity',((on?.28*(1-cyc/.35):0)*f).toFixed(2));e.setAttribute('transform',on?`translate(0 ${(Math.sin(cyc*60)*.8).toFixed(2)})`:'')});
    bd.forEach((e,i)=>{const tt=cyc-.1-i*.05,x=912+bi*21+((i*7)%11)-5;if(tt>0&&tt<1.6){e.setAttribute('cx',x);e.setAttribute('cy',(242+tt*38).toFixed(2));e.setAttribute('opacity',(f*(1-tt/1.6)).toFixed(2))}else e.setAttribute('opacity',0)})}}});
// --- tayyor mahsulot bunkeri
SP('prodhopper','Tayyor mahsulot bunkeri',FP,()=>Array.from({length:6},()=>`<circle class="dp" cx="819.5" r="1.9" fill="url(#gDry)"/>`).join(''),
  (o,g)=>{const dp=[...g.querySelectorAll('.dp')];let p=0;return {step(dt,t,C){const f=C[o.p.flow||'prod'];p+=46*f*dt;dp.forEach((e,i)=>{const s=(p+i*8.3)%50;e.setAttribute('cx',(819.5+Math.sin(t*4+i)*.6).toFixed(2));e.setAttribute('cy',(400+s).toFixed(2));e.setAttribute('opacity',(Math.min(1,f*2)*Math.min(1,s/5,(50-s)/4)).toFixed(2))})}}});
// --- ventilyator (dvigatel bilan) va mo'ri
SP('fan','So‘ruvchi ventilyator',FP,()=>`<circle cx="1135" cy="108.3" r="12.5" fill="#0d1318" opacity=".35"/><g class="imp">${[0,60,120,180,240,300].map(a=>{const A=a*Math.PI/180,B=(a+22)*Math.PI/180;return `<path d="M1135 108.3 L${r2(1135+11.5*Math.cos(A))} ${r2(108.3+11.5*Math.sin(A))} A11.5 11.5 0 0 1 ${r2(1135+11.5*Math.cos(B))} ${r2(108.3+11.5*Math.sin(B))}Z" fill="#aab2ba" stroke="#3b434b" stroke-width=".5"/>`}).join('')}<circle cx="1135" cy="108.3" r="2.6" fill="#39414a" stroke="#c6ccd2" stroke-width=".6"/></g>`,
  (o,g)=>{const e=g.querySelector('.imp');let a=0;return {step(dt,t,C){a=(a+1500*C[o.p.flow||'fan']*dt)%360;e.setAttribute('transform',`rotate(${a.toFixed(1)} 1135 108.3)`)}}});
SP('chimney','Mo‘ri',FP,()=>`<g filter="url(#fBlur)">${Array.from({length:9},()=>`<circle class="sm" r="5" fill="url(#gSmoke)" opacity="0"/>`).join('')}</g>`,
  (o,g)=>{const sm=[...g.querySelectorAll('.sm')];let p=0;return {step(dt,t,C){const f=C[o.p.flow||'fan'];p+=dt*(.35+.4*f);sm.forEach((e,i)=>{const s=(p+i/9)%1;e.setAttribute('cx',(1136-s*26+Math.sin(s*6+i)*3).toFixed(2));e.setAttribute('cy',(21-s*24).toFixed(2));e.setAttribute('r',(3+s*11).toFixed(2));e.setAttribute('opacity',((1-s)*Math.min(1,s*6)*(.25+.75*C.flame)*Math.min(1,f*1.5)).toFixed(2))})}}});
SP('cap','Quvur qopqog‘i',[]);
// --- boshqaruv qurilmalari
const ledA=L=>L.map(p=>`<circle class="led" data-k="${p[3]}" cx="${p[0]}" cy="${p[1]}" r="${p[4]||1.15}" fill="${p[2]}" opacity="0"/>`).join('');
SP('inverter','Chastota o‘zgartirgich (invertor)',[],()=>`<rect x="103" y="264" width="63" height="15" rx="1.5" fill="#2b353f"/><text x="134.5" y="276" font-size="12.5" text-anchor="middle" font-weight="700" fill="#e3e9ef" font-family="${FONT}">INVERTOR</text>
  <rect x="52.5" y="256" width="21.5" height="11.5" rx="1" fill="#062a33"/><text class="hz" x="72.5" y="264.6" font-size="7" text-anchor="end" fill="#7dfff0" font-weight="700" font-family="Consolas,monospace">0.0</text><text x="53.8" y="260.4" font-size="3.2" fill="#7dfff0" font-family="Consolas,monospace">Hz</text>
  ${ledA([...Array.from({length:10},(_,r)=>[181.5,250+r*9.6,r%3?'#6dff9a':'#ffb020','io',1.3]),[56,271.5,'#3dff7a','run',1.6],[62.5,271.5,'#ffd24a','com',1.6]])}`,
  (o,g)=>{const hz=g.querySelector('.hz'),led=ledRt(g);let acc=0;return {step(dt,t,C,S){led(dt,t,S);acc+=dt;if(acc>.25){acc=0;hz.textContent=C.hz.toFixed(1)}}}});
SP('plc','PLC kontroller',[],()=>{const L=[];[613,619.25,629.25,635,644.5,650,659.5,664.5,674.5,679.25,688.75,693.75,704.25,708.75,718,723].forEach(x=>{for(let r=0;r<16;r++)L.push([x,562+r*3.35,r<2||r>13?'#ffd35a':'#7fd4ff','io'])});
  for(let r=0;r<12;r++)L.push([565,561+r*4.6,r%4===0?'#ffb020':'#6dff9a','pw']);for(let r=0;r<14;r++)L.push([735,559+r*3.9,r%3?'#ff9d3a':'#7fd4ff','io']);
  L.push([577.5,575.5,'#3dff7a','run',1.4],[581,575.5,'#ffd24a','com',1.4],[584.5,575.5,'#3dff7a','com2',1.4],[588,575.5,'#ff3b30','err',1.4],[577,604,'#3dff7a','run',1.3],[577,607.6,'#ffd24a','com',1.3],[577,611.2,'#3dff7a','com2',1.3]);
  return ledA(L)+`<rect x="574.5" y="556.5" width="16" height="11" rx="1" fill="#06222a"/><text class="cpu" x="582.5" y="564.2" font-size="5.6" text-anchor="middle" fill="#6dffe0" font-family="Consolas,monospace">RUN</text>`},
  (o,g)=>{const cpu=g.querySelector('.cpu'),led=ledRt(g);let acc=0;return {step(dt,t,C,S){led(dt,t,S);acc+=dt;if(acc>.25){acc=0;const tr=S.trip>.5,bl=(t*2.2)%1<.5;cpu.textContent=tr?(bl?'TRIP':'ERR'):'RUN';cpu.setAttribute('fill',tr?'#ff6b5a':'#6dffe0')}}}});
SP('aomod','Analog chiqish moduli',[],()=>{const L=[];[363.25,375.75,385.75,393.75,400.75,408.25,416.25,423.75,432,440,448,453.75,462,470].forEach(x=>L.push([x,773.75,'#ffc24a','ao',1.6]));for(let r=0;r<12;r++)L.push([314,721+r*4,'#6dffd8','io',1]);[735,745,755].forEach(y=>L.push([304,y,'#3dff7a','run',1.2]));return ledA(L)},
  (o,g)=>{const led=ledRt(g);return {step(dt,t,C,S){led(dt,t,S)}}});
SP('pc','Operator kompyuteri (SCADA + AI)',[],()=>{const X0=1016,X1=1219,Y0=696,Y1=615;let s=`<rect x="996" y="589" width="100" height="16" fill="#0a2338"/><text x="998" y="602" font-size="12.5" font-weight="700" fill="#6fc8f2" font-family="${FONT}">R(t) — AI xavf indeksi</text>
   <rect x="1170" y="588" width="50" height="20" fill="#0a2338"/><text class="rv" x="1216" y="604.5" font-size="18" text-anchor="end" font-weight="700" fill="#6fc8f2" font-family="${FONT}">—</text><rect x="1015" y="612" width="205" height="82" rx="1" fill="#07192d"/>`;
   for(let i=0;i<=5;i++){const y=Y0-(Y0-Y1)*i/5;s+=`<line x1="${X0}" y1="${y}" x2="${X1}" y2="${y}" stroke="rgba(120,170,220,.18)" stroke-width=".8"/>`}for(let i=1;i<6;i++){const x=X0+(X1-X0)*i/6;s+=`<line x1="${x}" y1="${Y1}" x2="${x}" y2="${Y0}" stroke="rgba(120,170,220,.12)" stroke-width=".8"/>`}
   return s+`<line class="th" x1="${X0}" x2="${X1}" stroke="rgba(255,120,80,.6)" stroke-dasharray="4 3"/><polyline class="cv" fill="none" stroke="#f4d03f" stroke-width="2" stroke-linejoin="round"/><line class="sc" y1="615" y2="696" stroke="#6fc8f2" stroke-width=".8" opacity=".5"/><circle class="cd2" r="6" fill="#ffe46a" opacity=".3" filter="url(#fGlow)"/><circle class="cd" r="2.6" fill="#ffe46a"/>
   <circle class="lv" cx="1134" cy="598" r="2.4" fill="#ff3b30"/><text x="1139" y="601.3" font-size="8.5" font-weight="700" fill="#ff8a80" font-family="${FONT}">LIVE</text><circle class="nl" cx="1223" cy="703.5" r="1.5" fill="#3dff7a"/>`},
  (o,g)=>{const q=c=>g.querySelector('.'+c),cv=q('cv'),th=q('th'),sc=q('sc'),cd=q('cd'),cd2=q('cd2'),rv=q('rv'),lv=q('lv'),nl=q('nl');let px=1016,py=696;
    return {dyn(c){const R=c.id.R,n=Math.min(c.k,R.length-1),P=c.P,st=Math.max(1,Math.floor(R.length/220));let pts='';for(let i=0;i<=n;i+=st)pts+=`${r2(1016+203*i/(R.length-1))},${r2(696-81*clip(R[i],0,1))} `;cv.setAttribute('points',pts);
      const ty=696-81*P.RTH;th.setAttribute('y1',ty);th.setAttribute('y2',ty);px=1016+203*n/Math.max(1,R.length-1);py=696-81*clip(R[n],0,1);rv.textContent=fmt(R[n],2);rv.setAttribute('fill',R[n]>=P.RTH?'#ffd34d':'#6fc8f2')},
      step(dt,t){sc.setAttribute('x1',px);sc.setAttribute('x2',px);cd.setAttribute('cx',px);cd.setAttribute('cy',py);cd2.setAttribute('cx',px);cd2.setAttribute('cy',py);cd2.setAttribute('r',(4+2.5*Math.abs(Math.sin(t*3))).toFixed(2));lv.setAttribute('opacity',(t%1)<.5?1:.2);if(Math.random()<.2)nl.setAttribute('opacity',Math.random()<.6?1:.2)}}});
// ---------- quvurlar: asl rasmdagidek hajmli (silindrsimon) ko'rinish ----------
const PGR={metal:['#5c646c','#f2f5f7','#b9c0c6','#58606a'],hot:['#5c646c','#f2f5f7','#b9c0c6','#58606a'],gas:['#7d6418','#fff3a6','#e8c64e','#8f7020'],air:['#1b4a92','#a6d4ff','#3d86e8','#1a4488'],copper:['#5e4020','#f5dcaa','#c8995a','#5a3c1c'],water:['#125f82','#bff0ff','#2ea3d6','#0f5577'],dark:['#2a3036','#9aa2aa','#59616a','#22282e']};
const PIPE_DEFS=`<defs>${Object.entries(PGR).map(([k,c])=>`<linearGradient id="pg_${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset=".3" stop-color="${c[1]}"/><stop offset=".62" stop-color="${c[2]}"/><stop offset="1" stop-color="${c[3]}"/></linearGradient><radialGradient id="pj_${k}" cx=".4" cy=".38" r=".62"><stop offset="0" stop-color="${c[1]}"/><stop offset=".55" stop-color="${c[2]}"/><stop offset="1" stop-color="${c[3]}"/></radialGradient>`).join('')}</defs>`;
T.pipe.render=function(o){const p=o.p,w=+p.w||8,k=PGR[p.kind]?p.kind:'metal',P=ptsStr(o.pts),m=PMAT[p.mat],pts=o.pts;
  let s=`<polyline points="${P}" fill="none" stroke="#04070a" stroke-opacity=".5" stroke-width="${w+2.5}" stroke-linejoin="round" stroke-linecap="round" transform="translate(1.2 1.8)" filter="url(#fSoft1)"/>`;
  for(let i=1;i<pts.length;i++){let [x0,y0]=pts[i-1],[x1,y1]=pts[i];let a=Math.atan2(y1-y0,x1-x0)*180/Math.PI;if(a>=90||a<-90){[x0,y0,x1,y1]=[x1,y1,x0,y0];a=Math.atan2(y1-y0,x1-x0)*180/Math.PI}const L=Math.hypot(x1-x0,y1-y0);if(L<.01)continue;
    s+=`<rect x="0" y="${-w/2}" width="${r2(L)}" height="${w}" fill="url(#pg_${k})" transform="translate(${r2(x0)} ${r2(y0)}) rotate(${r2(a)})"/>`}
  pts.forEach((q,i)=>{const end=i===0||i===pts.length-1;s+=`<circle cx="${r2(q[0])}" cy="${r2(q[1])}" r="${w/2}" fill="url(#pj_${k})"${end?' opacity=".95"':''}/>`});
  if(p.kind==='hot')s+=`<polyline class="hg" points="${P}" fill="none" stroke="#ff7a1a" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" opacity="0"/>`;
  if(m&&m.band)s+=`<polyline class="bd" points="${P}" fill="none" stroke="${m.band}" stroke-width="${Math.max(2,w*.5)}" stroke-linecap="round" stroke-dasharray="${w*1.2} ${w*4}" opacity="0" filter="url(#fSoft1)"/>`;
  if(m){const L=pGeo(pts).L,n=Math.max(2,Math.min(80,Math.round(L/m.gap)));s+=`<g class="pp">${Array.from({length:n},()=>`<circle r="${r2(Math.min(m.r*(w>9?1.15:1),w*.42))}" fill="url(#${m.g})"/>`).join('')}</g>`}
  return s+`<polyline class="hit" points="${P}" fill="none" stroke="transparent" stroke-width="${Math.max(12,w+6)}"/>`};
T.flange={n:'Flanes (quvur ulanishi)',L:1.5,props:[['w','Eni','num'],['h','Bo‘yi','num']],box:o=>[-(o.p.w||5)/2,-(o.p.h||16)/2,o.p.w||5,o.p.h||16],
  render(o){const w=o.p.w||5,h=o.p.h||16;return `<rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="1" fill="url(#gMV)" stroke="#4b535b" stroke-width=".6"/><line x1="0" y1="${-h/2+1.5}" x2="0" y2="${h/2-1.5}" stroke="#3b434b" stroke-width=".6"/>`}};
// datchik: asl rasmdagi shisha pufakchaga yaqin
T.sensor.render=function(o){const p=o.p,t=String(p.tag||'XX'),rim=p.rim||'#39b54a';return `<circle class="sping" r="15.5" fill="none" stroke="#7fd6ff" stroke-width="1.2"/><circle r="18.2" fill="none" stroke="${rim}" stroke-width="3" opacity=".35" filter="url(#fGlow)"/><circle r="16.6" fill="url(#gBub)" stroke="${rim}" stroke-width="2.6"/><circle r="14.4" fill="none" stroke="#ffffff" stroke-opacity=".55" stroke-width=".8"/><ellipse cx="-4" cy="-8" rx="8" ry="4" fill="#fff" opacity=".45"/>`+TX(0,3.8,xa(t),{fs:t.length>4?9:10.5,a:'middle',c:'#1b2433'})+`<g class="ring" opacity="0"><circle r="20.5" fill="none" stroke-width="3"/><circle r="24.5" fill="none" stroke-width="1.2" opacity=".6"/></g>`};
// ---------- standart sxema ----------
function vmDefault(){const M=[];let n=1;const A=(t,x,y,p,e)=>M.push(Object.assign({id:'d'+(n++),t,x,y,r:0,s:1,p:p||{}},e||{}));const Ln=(t,pts,p)=>M.push({id:'d'+(n++),t,pts,p});const SA=(t,p)=>A(t,SPR[t].x,SPR[t].y,p);
  [['388,409 388,389 115,389 115,584 516,584','#8b69bd'],['350,377 350,393 325,393 325,545.5 516,545.5','#3d6ea9'],['395,478 395,539 516,539','#3d6ea9'],['502.5,482 502.5,530 516,530','#8b69bd'],
   ['490,319 490,48.5 1041,48.5 1041,553 757,553','#8898a5'],['526,350 526,163 318,163','#7f9d7b'],['785,409.5 954,409.5 954,510 757,510','#7b9b72'],
   ['582,640 582,650 352,650 352,502','#b8454b'],['573,640 573,663 278,663 278,444','#b8454b'],['555,640 555,681 232,681 232,474','#b8454b'],
   ['516,559 63,559 63,372','#bdd589'],['516,568 52,568 52,372','#92ab71'],['516,576 90,576 90,372','#5b8ea9',1],['212,237 468,237 468,279','#9e4a55'],['202,252 252.5,252 252.5,313 303,313 303,361 329,361','#98b680'],
   ['153,372 153,381 343.5,381 343.5,376','#3b5fa0'],['610.5,640 610.5,731 490,731','#3969ab'],['628,640 628,746 490,746','#3969ab'],['296,683 277.5,683 277.5,732 15.5,732 15.5,245 30,245','#4d71a3'],
   ['642,640 642,741 857,741 857,706 980,706','#7889a3'],['664,640 664,675 980,675','#7889a3']].forEach(w=>Ln('wire',w[0].split(' ').map(p=>p.split(',').map(Number)),{c:w[1],w:1.6,dash:w[2]?'1':'',pulse:'1'}));
  Ln('wire',[[356,304],[366,312]],{c:'#4f7a55',w:1.2,dash:'',pulse:''});Ln('wire',[[628,497],[628,510]],{c:'#3fb6a8',w:1.4,dash:'',pulse:''});
  const P=(pts,kind,w,mat,flow)=>Ln('pipe',pts,{kind,w,mat,flow});
  P([[143,430.5],[372,430.5]],'gas',7,'gas','gas');P([[143,461],[372,461]],'air',8,'air','air1');P([[143,489],[398,489],[398,479]],'air',8,'air','air2');
  P([[472,453.5],[592,453.5]],'hot',11,'hot','hot');P([[398,280],[401,288],[402,300]],'copper',3.5,'wet','conv1');P([[474,382.5],[569,382.5],[604,397]],'metal',15,'wet','feed');
  P([[628.5,263],[628.5,202],[737,202]],'copper',9,'dust','dust');P([[752.5,190],[752.5,154],[889,154]],'copper',9,'dust','dust');
  P([[752.5,288],[752.5,331],[799,331],[799,345]],'copper',8,'dry','prod');P([[929,309],[929,331],[840,331],[840,345]],'copper',8,'dry','prod');
  P([[652,405],[738,444]],'metal',10.5,'dry','prod');P([[545,342],[811,90]],'metal',8,'dust','dust');P([[819,70],[819,344]],'metal',12,'dust','dust');
  P([[929,112],[929,105.5],[1106,105.5]],'metal',11,'smoke','fan');
  A('flange',548,453.5,{w:4.5,h:16});A('flange',583,453.5,{w:4.5,h:16});A('flange',571,382.5,{w:5,h:21});A('flange',1106,105.5,{w:5,h:16});
  ['inverter','conveyor','hopper','screw','burner','dryer','cyclone','bagfilter','prodhopper','cap','conveyor2','chimney','fan','plc','aomod','pc'].forEach(t=>SA(t,{}));
  A('valve',278,430.5,{label:'1-2',var:'U12'});A('valve',232,461,{label:'1-1',var:'U11'});A('valve',352,489,{label:'1-3',var:'U13'});
  const S=(tag,x,y,rim,v,al)=>A('sensor',x,y,{tag,rim,var:v,alarm:al==null?v:al});const G='#3fae49',R='#d64541',Y='#d4b23c',B='#3b82e6';
  S('FT01',326.7,421,G,'FT01','LAM');S('FT02',326.7,463.3,G,'FT02','LAM');S('TT01',389.3,425,R,'TT01');S('FT03',396,501,G,'FT03','');S('TT02',510,466.7,R,'TT02');
  S('LT01',380.6,324.6,Y,'LT01');S('M02',468.3,296,Y,'M02');S('WT',498.3,336,B,'WT');S('M01',346.7,360,R,'M01');S('AT01',531.7,366.7,Y,'AT01','');S('AT02',701.7,413.3,B,'AT02');
  const V=(v,x,y,w,h,unit,dec,fs)=>A('value',x,y,{var:v,w,h,unit,dec,fs});
  V('LT01',306,294,50,19,'%',1);V('M02',495,287,44,18,'%',0);V('WT',522,328,50,15,'t/soat',1,9.6);V('AT01',555,350,50,18,'%',1);V('AT02',727,396,60,18,'%',2);V('TT02',537,469,54,18,'°C',1);V('FT03',421,492,70,16,'m³/soat',0,10.8);
  const L_=(t,x,y,a,fs)=>A('label',x,y,{text:t,a:a||'start',fs:fs||13.5,c:'#f1f5f8'});
  L_('Nam material',298,262,'start',14);L_('Tabiiy gaz',153,418);L_('Birlamchi',152,451);L_('havo',152,481);L_('Ikkilamchi havo',152,510);
  L_('Quritish\\nagenti',521,425,'middle');L_('Yakuniy\\nmahsulot',891,425,'middle');L_('Ishlatilgan quritish\\nagenti',1219,23,'middle');
  A('panel',20,14,{kind:'status',w:300,h:64});A('panel',20,85,{kind:'burner',w:300,h:128});
  return M}
function vmBuild(){const svg=$('vmSvg');if(!svg)return;const order=VM.model.map((o,i)=>[o,i]).sort((a,b)=>vmLayer(a[0])-vmLayer(b[0])||a[1]-b[1]);
  svg.innerHTML=VM_DEFS+PIPE_DEFS+SPR_DEFS()+`<image href="${SPR._bg.src}" width="1289" height="807" preserveAspectRatio="none"/><rect id="vmGrid" width="1289" height="807" fill="url(#pGrid)" style="display:${VM.edit?'':'none'}"/><g id="vmL">${order.map(([o])=>`<g class="vo" data-id="${o.id}">${vmObjHtml(o)}</g>`).join('')}</g><g id="vmSelL"></g>`;
  VM.rt=[];svg.querySelectorAll('#vmL > .vo').forEach(g=>{const o=VM.model.find(m=>m.id===g.dataset.id);const r=vmRtFor(o,g);if(r)VM.rt.push(r)});
  if(VM.ctx)VM.rt.forEach(r=>r.dyn&&r.dyn(VM.ctx));vmDrawSel()}
function vmBoxOf(o){const D=T[o.t];if(D.box){const [bx,by,bw,bh]=D.box(o),s=o.s||1,fx=o.fx?-1:1,a=(o.r||0)*Math.PI/180,c=Math.cos(a),n=Math.sin(a);const P=[[bx,by],[bx+bw,by],[bx,by+bh],[bx+bw,by+bh]].map(([x,y])=>{x*=s*fx;y*=s;return [o.x+x*c-y*n,o.y+x*n+y*c]});
  const xs=P.map(p=>p[0]),ys=P.map(p=>p[1]);return {x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)}}
  const g=document.querySelector(`#vmL > .vo[data-id="${o.id}"]`);return g?g.getBBox():null}

// ---------- AI xabarlari ----------
function aiMsgs(k){
  const d=cur.run.d,id=cur.idx,a=cur.e.a,out=[];
  if(a.trip>=0&&k>=a.trip){const e=EV[a.tripJ];out.push(['t',e.hidden?`${e.name} (${fmt(a.trip*P.dt,0)}-daqiqa): ${e.act}. Zaxira termostat gorelkani o‘chiradi; TT02 datchigini mahalliy o‘lchagich bilan tekshiring va almashtiring.`:`${e.name}: ${e.act} (${fmt(a.trip*P.dt,0)}-daqiqa). Sababini aniqlamasdan qayta ishga tushirmang.`])}
  for(const v of cur.run.ev){if(v.k<=k&&IL[v.code]&&v.code!=='feedstop')out.push(['t','PLC blokirovkasi: '+IL[v.code]])}
  const R=id.R[k],j=id.sif[k],tt=id.ttt[k],e=EV[j];
  if(R>=P.RTH){const act={TT01HH:'gaz berishni kamaytiring, 1-2 va 1-1 klapanlarini tekshiring',TT02HH:'gaz klapani 1-2 ni tekshiring, ikkilamchi havoni (1-3) oshiring',LAMLL:'birlamchi havo (1-1, ventilyator) ta’minotini tekshiring, gaz berishni kamaytiring',LTLL:'nam material konveyeri 1 ni tekshiring, ta’minotni kamaytiring',LTHH:'shnek 3 va bunker aralashtirgichi M02 ni tekshiring, kelimni kamaytiring',AT02HH:'material namligi oshgan: ta’minotni (M01) kamaytiring yoki TT02 topshiriqni oshiring'}[e.id];
    out.push(['w',`Xavf yuqori (R = ${fmt(R,2)}): ${e.name} ga ${isFinite(tt)?'~'+fmt(tt,0)+' min':'yaqin'} qoldi. Tavsiya: ${act}.`])}
  if(id.rmax[k]>=4){const q=id.rarg[k],r=id.res;const v=[r.rT,r.rG,r.rA,r.rF,r.rM,r.rI,r.rW][q][k];
    const txt=[`TT02 ko‘rsatkichi o‘txona harorati va oqimlardan hisoblangan qiymatdan ${fmt(Math.abs(v*12),0)} °C ${v<0?'past':'yuqori'} — TT02 datchigini tekshiring (KIP).`,
      `Gaz oqimi FT01 klapan 1-2 holatiga mos kelmaydi (${v>0?'ortiqcha':'kam'}) — klapan zichligini tekshiring.`,
      `Birlamchi havo FT02 klapan 1-1 holatidan ${v<0?'kam':'ko‘p'} — ventilyator va klapan 1-1 ni tekshiring.`,
      `Tarozi WT ko‘rsatkichi shnek M01 tezligiga mos emas — shnek 3 tiqilgan bo‘lishi mumkin.`,
      `Bunker aralashtirgichi M02 tezligi topshiriqdan past — material osilib qolishi mumkin.`,
      `Bunkerga material kelishi me’yordan kam (massa balansi) — konveyer 1 ni tekshiring.`,
      `Kirish materiali namligi (AT01) me’yordan yuqori — mahsulot namligi oshadi.`][q];out.push(['d',txt])}
  if(!out.length)out.push(['ok','Hozircha xavf belgisi yo‘q.']);
  return out;
}
function kvPanel(){
  const d=cur.run.d,id=cur.idx,k=timeK(),a=cur.e.a;const tk=a.trip>=0&&k>=a.trip,warn=id.R[k]>=P.RTH,dg=id.d3[k]||id.d4[k];
  const st=tk?['Hodisa · '+EV[a.tripJ].id,'var(--trip)']:warn?['Ogohlantirish','var(--warn)']:dg?['Diagnostika','var(--diag)']:['Xavfsiz','var(--ok)'];const tt=id.ttt[k];
  $('kv').innerHTML=`<span>Holat</span><span><i class="badge" style="background:${st[1]}">${st[0]}</i></span><span>Vaqt</span><span>${fmt(k*P.dt,1)} min</span>`+
  `<span>TT01 / TT02</span><span>${nb(d.TT01[k],0)} / ${nb(d.TT02[k],1)} °C</span><span>Gaz / havo (λ)</span><span>${nb(d.FT01[k],0)} / ${nb(d.FT02[k],0)} m³/soat (${nb(d.LAM[k],2)})</span>`+
  `<span>Bunker LT01 / WT</span><span>${nb(d.LT01[k],1)} % / ${nb(d.WT[k],2)} t/soat</span><span>Namlik AT01 → AT02</span><span>${nb(d.AT01[k],1)} → ${nb(d.AT02[k],2)} % (model: ${nb(id.res.wPred[k],1)} %)</span>`+
  `<span>Indeks R</span><span>${fmt(id.R[k],2)}</span><span>Eng yaqin hodisa</span><span>${EV[id.sif[k]].name}</span><span>Hodisagacha (joriy tezlikda)</span><span>${isFinite(tt)?'~'+fmt(tt,0)+' min':'—'}</span>`;
  const PRI={t:0,w:1,d:2,ok:3},PL={t:'Kritik',w:'Ogohlantirish',d:'Diagnostika',ok:'Holat'};
  $('msgs').innerHTML=aiMsgs(k).sort((a,b)=>(PRI[a[0]]??9)-(PRI[b[0]]??9)).map(([c,t])=>`<li class="${c}"><span class="pri" data-pl="${c}">${window.tr?tr(PL[c]||''):(PL[c]||'')}</span>${esc(t)}</li>`).join('');
}
function bars(){
  const id=cur.idx,a=cur.e.a,T=id.R.length;const k=hover>=0?hover:(a.warn>=0&&prog>=T-1?a.warn:Math.min(prog,T-1));
  const c=[0,1,2,3].map(j=>P.w[j]*id.x[j][k]);
  $('bars').innerHTML=c.map((v,j)=>`<div class="bar"><span>${XN[j]}</span><div class="track"><div class="fill" style="width:${Math.min(100,v/Math.max(P.RTH,0.01)*100)}%"></div></div><span style="text-align:right;font-variant-numeric:tabular-nums">${fmt(v,2)}</span></div>`).join('');
  const R=id.R[k],mx=c.indexOf(Math.max(...c));$('whyT').textContent='Indeks tarkibi, t = '+fmt(k*P.dt,1)+' min';
  $('why').textContent='R = '+fmt(R,2)+(R>=P.RTH?' — chegaradan yuqori. ':' — chegaradan past. ')+(R>0.05?'Eng katta hissa: '+XN[mx].replace(/ \(x.\)/,'').toLowerCase()+'. Eng yaqin hodisa: '+EV[id.sif[k]].name+(id.rmax[k]>=3?'. Eng katta nomuvofiqlik: '+RES[id.rarg[k]]+'.':'.'):'Tashkil etuvchilar hissasi juda kichik.');
}
function render(){
  if(!cur)return;const d=cur.run.d,id=cur.idx,a=cur.e.a;
  if($('v-trends').classList.contains('on')){
    const truth=$('truth').checked&&mode==='sim';
    const vl=[{k:a.trip,c:css('--trip'),wd:1.5},{k:cur.run.ft,c:css('--gray'),dash:[2,3]}];
    draw($('c1'),{ys:[{y:d.TT01,c:css('--ink'),wd:1.6}],min:800,max:1250,dec:0,lines:[{v:1120,c:css('--gray'),t:'H 1120'},{v:1180,c:css('--trip'),t:'HH 1180',dash:[8,3],r:1}],vl});
    const ys2=[{y:d.TT02,c:css('--ink'),wd:1.6}];{const tm=id.res.Tmix,band=sg=>Float64Array.from(tm,v=>v+sg*24);ys2.push({y:tm,c:css('--mut'),wd:1,dash:[1,3]},{y:band(1),c:css('--mut'),wd:0.8,dash:[1,3]},{y:band(-1),c:css('--mut'),wd:0.8,dash:[1,3]})}if(truth)ys2.push({y:d.trueTT02,c:css('--idx'),wd:1.2,dash:[4,3]});
    draw($('c2'),{ys:ys2,min:250,max:480,dec:0,lines:[{v:P.sp,c:css('--ok'),t:'SP '+fmt(P.sp,0)},{v:380,c:css('--gray'),t:'H 380'},{v:400,c:css('--trip'),t:'HH 400',dash:[8,3],r:1}],vl});
    draw($('c3'),{ys:[{y:d.LAM,c:css('--ink'),wd:1.5}],min:0.7,max:1.5,dec:2,lines:[{v:1.05,c:css('--gray'),t:'L 1,05'},{v:0.95,c:css('--trip'),t:'LL 0,95',dash:[8,3],r:1}],vl});
    const ys4=[{y:d.AT02,c:css('--ink'),wd:1.6},{y:d.AT01,c:css('--mut'),wd:1.1},{y:id.res.wPred,c:css('--warn'),wd:1,dash:[4,3]}];if(truth)ys4.push({y:d.trueW,c:css('--idx'),wd:1,dash:[2,2]});
    draw($('c4'),{ys:ys4,min:0,max:32,dec:0,lines:[{v:6,c:css('--gray'),t:'H 6'},{v:8,c:css('--trip'),t:'HH 8',dash:[8,3],r:1}],vl});
    draw($('c5'),{ys:[{y:d.LT01,c:css('--ink'),wd:1.6}],min:0,max:100,dec:0,lines:[{v:15,c:css('--gray'),t:'L 15'},{v:5,c:css('--trip'),t:'LL 5',dash:[8,3],r:1},{v:85,c:css('--gray'),t:'H 85'},{v:95,c:css('--trip'),t:'HH 95',dash:[8,3],r:1}],vl});
    const Rc=Float64Array.from(id.R);if(a.trip>=0)for(let j=a.trip+1;j<Rc.length;j++)Rc[j]=NaN;
    geo=draw($('c6'),{ys:[{y:Rc,c:css('--warn'),wd:1.8}],min:0,max:1,dec:1,lines:[{v:P.RTH,c:css('--warn'),t:'R* = '+fmt(P.RTH,2)}],vl:vl.concat([{k:a.diag,c:css('--diag'),dash:[4,2],wd:1.5}])});
  }
  mimic();kvPanel();bars();
}
const leadTxt=x=>x===null?null:fmt(x,1)+' min';
function stats(){const e=cur.e,a=e.a;
  if(a.trip<0){const s=f=>f?'signal berdi':'signal yo‘q';$('sIdx').textContent=s(a.warn>=0);$('sAl').textContent=s(a.alarm>=0);$('sDg').textContent=s(a.diag>=0);$('sCb').textContent='hodisa yo‘q';return}
  $('sIdx').textContent=leadTxt(e.L.warn)||'ishlamadi';$('sAl').textContent=leadTxt(e.L.alarm)||'ishlamadi';$('sDg').textContent=leadTxt(e.L.diag)||'ishlamadi';$('sCb').textContent=leadTxt(e.L.comb)||'ishlamadi'}
function load(run){const idx=computeIndex(run.d,model,P);const e=analyseRun(run,idx,P);const dg=diagnose(run,idx,P);cur={run,idx,e,dg,P};stats();render();$('review').innerHTML=reviewHtml()}
// ---------- voqealar va Review ----------
const IL={nofeed:'Material berilishi to‘xtadi (WT ≈ 0) — quruq yurishdan himoya: gaz klapani 1-2 yopildi, gorelka o‘chirildi.',
 feedstop:'Gorelka o‘chgani uchun nam material ta’minoti (M01) va konveyer 1 to‘xtatildi (quritgichni ho‘l material bilan to‘ldirmaslik).',
 lowload:'Bunker to‘lgan (LT01 ≥ 95 %), lekin ta’minot nominalning yarmidan past (WT) — shnek tiqilgan yoki M02 to‘xtagan: 3 daqiqadan so‘ng gaz klapani 1-2 yopildi, gorelka o‘chirildi.',
 backup:'Zaxira termostat (mustaqil TSHH): quritish agentining haqiqiy harorati 400 °C dan oshganini ushladi — gorelka o‘chirildi (TT02 datchigi past ko‘rsatgan).',
 reject:'Sifat blokirovkasi: mahsulot namligi AT02 ≥ 8 % — yaroqsiz mahsulot tayyor mahsulot bunkeriga yuborilmaydi, M01 ta’minlagich va konveyer 1 to‘xtatildi.'};
function buildEvents(){
  const run=cur.run,d=run.d,id=cur.idx,dt=P.dt,N=d.TT01.length,E=[];
  const TR={moisture:'Nam material namligi keskin oshmoqda.',airloss:'Birlamchi havo ta’minoti kamaymoqda (ventilyator / klapan 1-1).',gasleak:'Gaz klapani 1-2 orqali ortiqcha gaz o‘tmoqda.',tt02:'TT02 datchigi siljiy boshladi (past ko‘rsatmoqda).',feedloss:'Nam material konveyeri 1 to‘xtadi.',jam:'Shnekli ta’minlagich 3 tiqila boshladi.',rotor:'Bunker aralashtirgichi M02 to‘xtadi.'};
  for(const v of run.ev){if(v.src==='truth')E.push({k:v.k,src:'Haqiqiy sabab*',txt:TR[v.code]||v.code});
    else if(v.code==='trip'){const e=EV[v.j];E.push({k:v.k,src:v.src==='hidden'?'Yashirin xavf*':'PLC himoyasi',txt:`${e.name}: ${e.act}.`})}
    else if(v.code==='nofeed')E.push({k:v.k,src:'PLC blokirovkasi',txt:'Material berilishi to‘xtadi (WT ≈ 0) — quruq yurishdan himoya: gaz klapani 1-2 yopildi, gorelka o‘chirildi.'});
    else if(v.code==='feedstop')E.push({k:v.k,src:'PLC blokirovkasi',txt:'Gorelka o‘chgani uchun nam material ta’minoti (M01) va konveyer 1 to‘xtatildi (quritgichni ho‘l material bilan to‘ldirmaslik).'})
    else if(IL[v.code])E.push({k:v.k,src:'PLC blokirovkasi',txt:IL[v.code]})}
  const add=(k,src,txt)=>{if(k>=0)E.push({k,src,txt})};
  add(firstRun(k=>d.TT01[k]>=1120,3,N,0),'PLC alarm','TT01 yuqori (≥ 1120 °C).');add(firstRun(k=>d.TT02[k]>=380,3,N,0),'PLC alarm','TT02 yuqori (≥ 380 °C).');
  add(firstRun(k=>d.burner[k]&&d.FT01[k]>60&&d.LAM[k]<=1.05,3,N,0),'PLC alarm','Havo/gaz nisbati past (λ ≤ 1,05).');
  add(firstRun(k=>d.LT01[k]<=15,3,N,0),'PLC alarm','Bunker sathi past (LT01 ≤ 15 %).');add(firstRun(k=>d.LT01[k]>=85,3,N,0),'PLC alarm','Bunker sathi yuqori (LT01 ≥ 85 %).');
  add(firstRun(k=>d.AT02[k]>=6,3,N,0),'PLC alarm','Mahsulot namligi yuqori (AT02 ≥ 6 %).');
  const w=firstRun(k=>id.R[k]>=P.RTH,3,N,0);if(w>=0)add(w,'AI indeksi',`R = ${fmt(id.R[w],2)} ≥ ${fmt(P.RTH,2)}; ${EV[id.sif[w]].name} ga ${isFinite(id.ttt[w])?'~'+fmt(id.ttt[w],0)+' min':'yaqin'} qoldi.`);
  const g=firstRun(k=>id.d3[k]||id.d4[k],P.DK,N,0);if(g>=0)add(g,'AI diagnostika',id.rmax[g]>=4.8?`Nomuvofiqlik: ${RES[id.rarg[g]]}.`:'Jarayon rejimi odatdagidan farq qilmoqda (Isolation Forest).');
  E.sort((a,b)=>a.k-b.k);return E;
}
function mean(a,i,j){let s=0,n=0;for(let k=Math.max(0,i);k<=j&&k<a.length;k++)if(isFinite(a[k])){s+=a[k];n++}return n?s/n:NaN}
function reviewHtml(){
  const run=cur.run,d=run.d,id=cur.idx,e=cur.e,a=e.a,dg=cur.dg,dt=P.dt,N=d.TT01.length;
  const truth=mode==='sim'?TRUTH[run.kind]:null,ok=truth!==null&&dg.code===truth;
  const k0=run.ft>=0?run.ft:(dg.k>=0?dg.k:Math.round(30/dt)),k1=a.trip>=0?a.trip:N-1,pre=[Math.max(0,k0-36),Math.max(0,k0-1)];
  const rows=[['TT01, °C',d.TT01,0],['TT02 (o‘lchangan), °C',d.TT02,1],['FT01 gaz, m³/soat',d.FT01,0],['FT02 birlamchi havo, m³/soat',d.FT02,0],['FT03 ikkilamchi havo, m³/soat',d.FT03,0],['λ (havo/gaz)',d.LAM,2],['Klapan 1-2 (gaz), %',d.U12,0],['Klapan 1-1 (havo), %',d.U11,0],['LT01 bunker, %',d.LT01,1],['WT ta’minot, t/soat',d.WT,2],['AT01 kirish namligi, %',d.AT01,1],['AT02 mahsulot namligi, %',d.AT02,2],['M02 tezligi, %',d.M02,0]];
  const tb=rows.map(r=>{const v0=mean(r[1],...pre),v1=mean(r[1],k1-2,k1);return [r[0],nb(v0,r[2]),nb(v1,r[2]),isFinite(v0)&&isFinite(v1)?(v1-v0>=0?'+':'')+fmt(v1-v0,r[2]):'—']});
  const E=buildEvents(),C=conclusions(k0,k1);const ld=x=>x===null?'ishlamadi':fmt(x,1)+' min';
  let h=`<p><b>${esc(mode==='sim'?KINDS[run.kind]:'Yuklangan ma’lumot')}</b></p>`;
  h+=`<p><b>AI tashxisi:</b> ${esc(CAUSE[dg.code])}${dg.k>=0?' ('+fmt(dg.k*dt,0)+'-daqiqadan)':''}`+(truth!==null?` <span class="pill" style="background:${ok?'var(--ok)':'var(--trip)'}">${ok?'haqiqiy sababga mos':'haqiqiy sababga mos emas'}</span>`:'')+`</p>`;
  h+=`<p>${a.trip>=0?`Hodisa: ${fmt(a.trip*dt,1)}-daqiqada — ${EV[a.tripJ].name}. Hodisadan oldingi ogohlantirishlar: PLC alarmlari — ${ld(e.L.alarm)}, AI indeksi — ${ld(e.L.warn)}, AI diagnostika — ${ld(e.L.diag)}.`:'Himoya yoki sifat hodisasi bo‘lmadi.'}</p>`;
  h+=`<h2>1. Voqealar ketma-ketligi</h2><div class="tw" tabindex="0"><table><tr><th>Vaqt, min</th><th>Manba</th><th>Hodisa</th></tr>`+E.map(v=>`<tr><td>${fmt(v.k*dt,1)}</td><td>${esc(v.src)}</td><td>${esc(v.txt)}</td></tr>`).join('')+`</table></div><p class="note">* Faqat simulyatsiyada ma’lum; real jarayonda tizim uni bevosita ko‘rmaydi.</p>`;
  h+=`<h2>2. Parametrlar o‘zgarishi</h2><div class="tw" tabindex="0"><table><tr><th>Parametr</th><th>Nosozlikdan oldin</th><th>${a.trip>=0?'Hodisa paytida':'Kuzatuv oxirida'}</th><th>O‘zgarish</th></tr>`+tb.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')+`</table></div>`;
  h+=`<h2>3. Texnolog xulosasi</h2><p>${esc(C.tech)}</p>${C.tr.length?'<ul>'+C.tr.map(x=>`<li>${esc(x)}</li>`).join('')+'</ul>':''}`;
  h+=`<h2>4. KIP xulosasi</h2><p>${esc(C.kip)}</p>${C.kr.length?'<ul>'+C.kr.map(x=>`<li>${esc(x)}</li>`).join('')+'</ul>':''}`;
  h+=`<p class="note">Xulosa AI modeli (Isolation Forest, dinamik xavf indeksi) va fizik modellar (aralashma harorati, klapan tavsiflari, massa balansi) asosida avtomatik tuzildi. Yakuniy xulosani texnolog va KIP mutaxassisi tasdiqlashi kerak.</p>`;
  cur.reviewRows=[['Hodisa tahlili (Review)'],['Holat',mode==='sim'?KINDS[run.kind]:'Yuklangan ma’lumot'],['AI tashxisi',CAUSE[dg.code]],...(truth!==null?[['Haqiqiy sabab bilan mosligi',ok?'mos':'mos emas']]:[]),['Hodisa',a.trip>=0?`${fmt(a.trip*dt,1)} min, ${EV[a.tripJ].name}`:'yo‘q'],['PLC alarmlari lead, min',ld(e.L.alarm)],['AI indeksi lead, min',ld(e.L.warn)],['AI diagnostika lead, min',ld(e.L.diag)],[],['Voqealar ketma-ketligi'],['Vaqt, min','Manba','Hodisa'],...E.map(v=>[+(v.k*dt).toFixed(1),v.src,v.txt]),[],['Parametr','Oldin','Hodisa paytida','O‘zgarish'],...tb,[],['Texnolog xulosasi',C.tech],...C.tr.map(x=>['',x]),[],['KIP xulosasi',C.kip],...C.kr.map(x=>['',x])];
  return h;
}
function conclusions(k0,k1){
  const run=cur.run,d=run.d,dg=cur.dg,a=cur.e.a,dt=P.dt,N=d.TT01.length;const m=(arr,i,j)=>mean(arr,i,j);
  const ev=a.trip>=0?`${fmt(a.trip*dt,0)}-daqiqada ${EV[a.tripJ].name.toLowerCase()} hodisasi yuz berdi (${EV[a.tripJ].act})`:'himoya hodisasi bo‘lmadi';
  let plc='';if(a.trip>=0){const e=EV[a.tripJ],k2=Math.min(N-1,a.trip+Math.round(10/dt));
    if(['TT01HH','TT02HH','LAMLL'].includes(e.id))plc=`PLC blokirovkasi bajarildi: gaz ${nb(d.FT01[Math.min(N-1,a.trip+2)],0)} m³/soatga tushdi, 10 daqiqada TT01 ${nb(d.TT01[a.trip],0)} → ${nb(d.TT01[k2],0)} °C. Gorelka o‘chgani uchun 1 daqiqadan so‘ng nam material ta’minoti (M01) va konveyer 1 ham to‘xtatildi.`;
    else if(e.id==='LTLL')plc=`PLC ta’minlagich M01 ni to‘xtatdi (WT ${nb(d.WT[Math.min(N-1,a.trip+2)],2)} t/soat); material kelmagani uchun quruq yurishdan himoya 2 daqiqadan so‘ng gorelkani ham o‘chirdi.`;
    else if(e.id==='LTHH')plc='PLC nam material konveyeri 1 ni to‘xtatdi — bunker to‘lib ketishining oldi olindi.';
    else if(e.id==='AT02HH')plc='PLC sifat blokirovkasi: yaroqsiz mahsulot tayyor mahsulot bunkeriga yuborilmaydi, M01 ta’minlagich va konveyer 1 to‘xtatildi; material kelmagani uchun 2 daqiqadan so‘ng quruq yurishdan himoya gorelkani o‘chiradi.';
    else if(e.id==='TT02TRUE')plc='PLC himoyasi ishlamadi: TT02 datchigi past ko‘rsatgani uchun TT02 HH blokirovkasi ishga tushmadi; zaxira termostat (mustaqil TSHH) 1 daqiqadan so‘ng gorelkani o‘chirdi.'}
  const rT=cur.idx.res.rT,rG=cur.idx.res.rG,rA=cur.idx.res.rA;let tech='',kip='',tr=[],kr=[];
  switch(dg.code){
   case 'moisture':tech=`Kirish materiali namligi (AT01) ${nb(m(d.AT01,k0-30,k0),1)} % dan ${nb(d.AT01[k1],1)} % gacha oshdi. TT02 topshiriqda saqlangani uchun bug‘latish qobiliyati yetmay qoldi va mahsulot namligi (AT02) ${nb(d.AT02[k1],2)} % ga yetdi; ${ev}. AI modeli kirish ma’lumotlari bo‘yicha mahsulot namligini kechikishdan oldin bashorat qildi.`;
     tr=['Nam material manbasini (xomashyo, saqlash sharoiti) tekshirish.','Namlik oshganda ta’minotni (M01) kamaytirish yoki TT02 topshiriqni oshirish tartibini joriy etish.','AT01 bo‘yicha oldindan (feedforward) boshqarishni ko‘rib chiqish.'];
     kip=`O‘lchovlar o‘zaro mos: TT02 aralashma modeli bilan farqi ${fmt(Math.abs(rT[k1]*12),0)} °C, gaz va havo oqimlari klapan holatlariga mos. AT01 va AT02 ko‘rsatkichlari ishonchli.`;kr=['AT01 va AT02 analizatorlarini navbatdagi kalibrlashda tekshirish.'];break;
   case 'airloss':tech=`Birlamchi havo (FT02) ${nb(m(d.FT02,k0-30,k0),0)} dan ${nb(d.FT02[k1],0)} m³/soatga kamaydi, klapan 1-1 esa ${nb(d.U11[k1],0)} % gacha ochildi. Havo/gaz nisbati λ ${nb(d.LAM[k1],2)} ga tushdi — to‘liq yonmaslik va o‘txonada portlovchi aralashma xavfi; ${ev}.`;
     tr=['Birlamchi havo ventilyatori, havo so‘rish filtri va kanallarni tekshirish.','λ past alarmida gaz berishni avtomatik cheklashni ko‘rib chiqish.'];
     kip=`FT02 klapan 1-1 holatidan kutilgan oqimdan ${fmt(Math.abs(rA[k1]*3),0)} % ga kam — muammo havo yo‘lida (klapan, ventilyator), FT02 datchigi emas: λ pasayishi TT01 pasayishi bilan tasdiqlanadi. ${plc}`;kr=['Klapan 1-1 pozitsionerini va FT02 ni tekshirish.'];break;
   case 'gasleak':tech=`Gaz oqimi (FT01) klapan 1-2 buyrug‘idan qat’i nazar oshdi: klapan ${nb(d.U12[k1],0)} % gacha yopildi, FT01 esa ${nb(d.FT01[k1],0)} m³/soat. Quritish agenti harorati ko‘tarildi; ${ev}. Ortiqcha harorat quritgichda yong‘in xavfini oshiradi.`;
     tr=['Gaz klapani 1-2 ni ta’mirlash yoki almashtirish.','Gaz liniyasiga ketma-ket ikkinchi yopuvchi klapan o‘rnatishni ko‘rib chiqish.'];
     kip=`FT01 klapan 1-2 holatidan kutilgan qiymatdan ${fmt(Math.abs(rG[k1]*3),0)} % yuqori: klapan zich yopilmayapti (ichki oqish yoki pozitsioner nosozligi). ${plc}`;kr=['Klapan 1-2 zichligini va pozitsionerini tekshirish.','FT01 o‘lchagichini tekshirish.'];break;
   case 'tt02':tech=`TT02 ko‘rsatkichi topshiriqda (${nb(d.TT02[k1],0)} °C) turibdi, lekin gaz berish va o‘txona harorati (TT01 ${nb(d.TT01[k1],0)} °C) oshgan. Aralashma modeli bo‘yicha haqiqiy quritish agenti harorati ~${fmt(d.TT02[k1]-rT[k1]*12,0)} °C. ${ev}. Mahsulot ortiqcha quritilmoqda (AT02 ${nb(d.AT02[k1],2)} %), quritgichda yong‘in xavfi bor.`;
     tr=['Gorelkani past rejimga o‘tkazib, TT02 ni mahalliy o‘lchagich bilan tekshirish.','TT02 uchun ikkinchi (zaxira) termojuft o‘rnatish.'];
     kip=`TT02 o‘txona harorati va oqimlardan hisoblangan qiymatdan ${fmt(Math.abs(rT[k1]*12),0)} °C past: datchik siljigan (termojuft yoki uning chizig‘i). TT01, FT01–FT03 o‘zaro mos. ${plc}`;kr=['TT02 termojuftini almashtirish va kalibrlash.','Datchik nosozligi diagnostikasini PLC da yoqish.'];break;
   case 'feedloss':tech=`Bunker sathi (LT01) ${nb(m(d.LT01,k0-30,k0),1)} dan ${nb(d.LT01[k1],1)} % gacha tushdi, shnek esa ishlashda davom etdi. Bunkerga material kelishi to‘xtagan (konveyer 1); ${ev}. Materialsiz quritgich ortiqcha qizishi mumkin.`;
     tr=['Nam material konveyeri 1 va uning oldidagi uzatish zanjirini tekshirish.','Bunker sathi past bo‘lganda gorelkani past rejimga o‘tkazish tartibini joriy etish.'];
     kip=`LT01 va WT o‘zaro mos (massa balansi bo‘yicha kelim ~${fmt(Math.max(0,cur.idx.res.inflow[k1]),1)} t/soat): muammo jarayonda, o‘lchovda emas. ${plc}`;kr=['Konveyer 1 ga tezlik yoki yuk datchigi qo‘shishni ko‘rib chiqish.'];break;
   case 'jam':tech=`Shnek M01 ${nb(d.M01[k1],0)} % tezlikda ishlagan holda tarozi WT ${nb(m(d.WT,k0-30,k0),2)} dan ${nb(d.WT[k1],2)} t/soatga kamaydi, bunker sathi oshdi (${nb(d.LT01[k1],1)} %); ${ev}.`;
     tr=['Shnekli ta’minlagich 3 ni tozalash, begona jismlarni tekshirish.','Shnek yuklanishi (tok) nazoratini qo‘shish.'];
     kip=`WT shnek tezligidan kutilgan qiymatdan ${fmt(Math.abs(cur.idx.res.rF[k1]*3),0)} % kam, M02 me’yorda — sabab shnekda. ${plc}`;kr=['Tarozi WT ni tekshirish va kalibrlash.'];break;
   case 'rotor':tech=`Bunker aralashtirgichi M02 tezligi ${nb(d.M02[k1],0)} % ga tushdi (topshiriq ${fmt(P.uM02,0)} %). Material bunkerda osilib qoldi (gumbaz), shnekka tushish kamaydi: WT ${nb(d.WT[k1],2)} t/soat, sath ${nb(d.LT01[k1],1)} %; ${ev}.`;
     tr=['M02 yuritmasini (motor, reduktor, chastota o‘zgartirgich) tekshirish.','Bunkerdagi gumbazni xavfsiz usulda buzish.'];
     kip=`M02 tezlik signali topshiriqdan past; WT ham shnek modelidan kam — sabab bunkerda (M02), shnek emas. ${plc}`;kr=['Chastota o‘zgartirgichning M02 kanali va xatolik jurnalini tekshirish.'];break;
   default:tech=`Jarayon me’yorda kechdi: TT02 ${nb(m(d.TT02,N-60,N-1),0)} °C, mahsulot namligi ${nb(m(d.AT02,N-60,N-1),2)} %. ${ev}.`;kip='O‘lchovlar o‘zaro mos, nomuvofiqlik aniqlanmadi.';
  }
  if(plc&&!kip.includes(plc))kip+=' '+plc;
  return {tech,kip,tr,kr};
}
// ---------- boshqaruv ----------
function runSimNow(anim){if(!simModel)return;mode='sim';model=simModel;const r=rngMake(Math.max(1,Math.floor(+$('seed').value||1)));const run=runPlant($('kind').value,r,P);load(run);
  $('status').textContent=KINDS[run.kind]+(run.ft>=0?' — nosozlik ~'+fmt(run.ft*P.dt,0)+'-daqiqada.':'.');
  if(anim)play();else{prog=run.d.TT01.length;render()}}
function play(){clearInterval(timer);prog=0;hover=-1;const T=cur.run.d.TT01.length;timer=setInterval(()=>{prog+=Math.round(1+(+$('speed').value)*2);if(prog>=T-1){prog=T-1;clearInterval(timer);timer=null}render()},40)}
function mv(e){if(!geo||!cur)return;const rc=e.currentTarget.getBoundingClientRect();const x=e.clientX-rc.left;const k=Math.round((x-geo.m.l)/geo.pw*(geo.T-1));hover=k>=0&&k<=Math.min(prog,geo.T-1)?k:-1;render()}
let hT=null;['c1','c2','c3','c4','c5','c6'].forEach(id=>{const c=$(id);c.addEventListener('pointermove',e=>{clearTimeout(hT);mv(e)});c.addEventListener('pointerdown',e=>{clearTimeout(hT);mv(e)});
  const end=e=>{clearTimeout(hT);hT=setTimeout(()=>{hover=-1;if(cur)render()},e.pointerType==='mouse'?0:1800)};c.addEventListener('pointerup',end);c.addEventListener('pointercancel',end);c.addEventListener('pointerleave',end)});
['rth','w1','w2','w3','w4'].forEach(id=>$(id).addEventListener('input',()=>{readP();if(cur)load(cur.run)}));
['sev','noise'].forEach(id=>{$(id).addEventListener('input',readP);$(id).addEventListener('change',()=>{if(mode==='sim')runSimNow(false)})});
$('truth').onchange=()=>{if(cur)render()};
$('seed').addEventListener('change',()=>{$('seed').value=Math.max(1,Math.floor(+$('seed').value||1))});
$('run').onclick=()=>{if(mode==='sim')runSimNow(true);else if(cur)play()};
$('show').onclick=()=>{clearInterval(timer);timer=null;prog=cur?cur.run.d.TT01.length:0;hover=-1;render()};
['kind','seed'].forEach(id=>$(id).onchange=()=>{if(mode==='sim')runSimNow(false)});
window.addEventListener('resize',()=>{const w=window.innerWidth;if(w!==lastW){lastW=w;if(cur)render()}});
let training=false,trainTok=0;
async function trainAsync(Pt,seed,cb){const g=trainModelGen(Pt,seed);let x;while(!(x=g.next()).done){if(cb)cb(x.value);await tick()}return x.value}
async function retrain(cb){const tok=++trainTok;const m=await trainAsync({...P,noise:1,sev:0},7,cb);if(tok!==trainTok)return false;simModel=m;if(mode==='sim')model=m;return true}
$('apply').onclick=async()=>{if(working||training)return;readPlant();training=true;$('apply').disabled=$('reset').disabled=true;const st=f=>{$('status').textContent='Model qayta o‘qitilmoqda… '+Math.round(f*100)+' %'};st(0);
  try{await retrain(st);lastBatch=null;$('bOut').innerHTML='';$('rocCv').classList.add('hide');$('rocCap').classList.add('hide');if(mode==='sim')runSimNow(false);$('status').textContent='Parametrlar qo‘llandi, model qayta o‘qitildi.'}
  catch(e){$('status').textContent='Xato: '+e.message}finally{training=false;$('apply').disabled=$('reset').disabled=false}};
$('reset').onclick=()=>{const map={pSP:'sp',pFin:'Fin',pM01:'uM01',pM02:'uM02',pU3:'u3',pWin:'win',pMb:'Mb',pTh:'Th',pTresp:'Tresp'};for(const id in map)$(id).value=PDEF[map[id]];$('apply').click()};
// ---------- ommaviy sinov ----------
const METH=[['alarm','Mavjud PLC alarmlari'],['warn','AI indeksi R'],['diag','AI diagnostika'],['comb','Birgalikda (alarm + indeks + diagnostika)']];
async function batchAsync(Pb,mdl,seed,nF,nN,cb){
  const r=rngMake(seed);const res={per:{},m:{},dx:{},sc:{n:[],f:[]}};for(const [k] of METH)res.m[k]={leads:[],miss:0,fa:0};let done=0;const tot=FAULTS.length*nF+nN;
  for(const kind of FAULTS){res.per[kind]={n:0,trip:0};res.dx[kind]=[0,0];for(const [k] of METH)res.per[kind][k]=[];
    for(let i=0;i<nF;i++){const run=runPlant(kind,r,Pb);const idx=computeIndex(run.d,mdl,Pb);const e=analyseRun(run,idx,Pb);const dg=diagnose(run,idx,Pb);
      res.dx[kind][1]++;if(dg.code===TRUTH[kind])res.dx[kind][0]++;res.per[kind].n++;
      {const a0=Math.max(0,run.ft-Math.round(5/Pb.dt)),b0=run.trips.length?run.trips[0].k:idx.R.length-1;let m=0;for(let q=a0;q<=b0;q++)m=Math.max(m,idx.R[q]);res.sc.f.push(m)}
      if(e.a.trip>=0){res.per[kind].trip++;for(const [k] of METH){if(e.L[k]===null){res.m[k].miss++;res.per[kind][k].push(null)}else{res.m[k].leads.push(e.L[k]);res.per[kind][k].push(e.L[k])}}}
      done++;if(done%2===0){cb&&cb(done/tot);await tick()}}}
  res.dx.normal=[0,0];
  for(let i=0;i<nN;i++){const run=runPlant('normal',r,Pb);const idx=computeIndex(run.d,mdl,Pb);const e=analyseRun(run,idx,Pb);for(const [k] of METH)if(e.fired[k])res.m[k].fa++;
    {let m=0;for(let q=Math.round(30/Pb.dt);q<idx.R.length;q++)m=Math.max(m,idx.R[q]);res.sc.n.push(m)}
    const dg=diagnose(run,idx,Pb);res.dx.normal[1]++;if(dg.code==='none')res.dx.normal[0]++;done++;if(done%2===0){cb&&cb(done/tot);await tick()}}
  res.nN=nN;res.nTrip=FAULTS.reduce((s,k)=>s+res.per[k].trip,0);
  for(const [k] of METH){const l=res.m[k].leads,n=l.length+res.m[k].miss;res.m[k].mean=l.length?l.reduce((a,b)=>a+b,0)/l.length:NaN;res.m[k].min=l.length?Math.min(...l):NaN;res.m[k].ok=n?l.filter(x=>x>=Pb.Tresp).length/n:NaN;res.m[k].far=res.m[k].fa/nN}
  res.dxAll=Object.values(res.dx).reduce((s,v)=>[s[0]+v[0],s[1]+v[1]],[0,0]);return res}
function setProg(f){const p=$('prog');p.classList.remove('hide');p.firstElementChild.style.width=Math.round(f*100)+'%'}
async function guard(ids,fn){if(working||training)return;ids=[...ids,'apply','reset'];working=true;ids.forEach(i=>$(i).disabled=true);$('bOut').innerHTML='<p class="msg">Hisoblanmoqda…</p>';setProg(0);
  try{await fn()}catch(e){$('bOut').innerHTML='<p class="msg">Xato: '+esc(String(e.message||e))+'</p>'}working=false;ids.forEach(i=>$(i).disabled=false);$('prog').classList.add('hide')}
const nf=(x,d)=>isFinite(x)?fmt(x,d):'—';
const tbl=(rows,hdr)=>'<div class="tw" tabindex="0"><table><tr>'+hdr.map(h=>`<th>${h}</th>`).join('')+'</tr>'+rows.map(r=>'<tr>'+r.map(c=>`<td>${c}</td>`).join('')+'</tr>').join('')+'</table></div>';
function rocPts(sc){const all=[...new Set([...sc.n,...sc.f])].sort((a,b)=>a-b);const p=all.map(t=>[sc.n.filter(x=>x>=t).length/sc.n.length,sc.f.filter(x=>x>=t).length/sc.f.length]);p.push([0,0],[1,1]);p.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);let auc=0;for(let i=1;i<p.length;i++)auc+=(p[i][0]-p[i-1][0])*(p[i][1]+p[i-1][1])/2;return {p,auc}}
let lastRoc=null;
function drawRoc(sc){lastRoc=sc;const cv=$('rocCv');if(!cv||!sc.n.length||!sc.f.length)return;cv.classList.remove('hide');$('rocCap').classList.remove('hide');
  const {p,auc}=rocPts(sc),x=cv.getContext('2d'),W=cv.width,H=cv.height,L=46,R=14,T=14,B=38,X=v=>L+v*(W-L-R),Y=v=>H-B-v*(H-T-B);
  x.clearRect(0,0,W,H);x.font='12px Segoe UI,Arial';x.fillStyle=css('--mut');x.strokeStyle=css('--line');x.lineWidth=1;
  for(let i=0;i<=5;i++){const v=i/5;x.beginPath();x.moveTo(X(v),Y(0));x.lineTo(X(v),Y(1));x.moveTo(X(0),Y(v));x.lineTo(X(1),Y(v));x.stroke();x.fillText(fmt(v,1),X(v)-8,H-B+16);x.fillText(fmt(v,1),L-28,Y(v)+4)}
  x.fillText('FPR — normal ishda soxta signal ulushi',L+40,H-6);x.save();x.translate(12,H/2+40);x.rotate(-Math.PI/2);x.fillText('TPR — aniqlangan nosozliklar ulushi',0,0);x.restore();
  x.setLineDash([4,4]);x.strokeStyle=css('--gray');x.beginPath();x.moveTo(X(0),Y(0));x.lineTo(X(1),Y(1));x.stroke();x.setLineDash([]);
  x.strokeStyle=css('--idx');x.lineWidth=2;x.beginPath();p.forEach((q,i)=>i?x.lineTo(X(q[0]),Y(q[1])):x.moveTo(X(q[0]),Y(q[1])));x.stroke();
  const fpr=sc.n.filter(v=>v>=P.RTH).length/sc.n.length,tpr=sc.f.filter(v=>v>=P.RTH).length/sc.f.length;x.fillStyle=css('--warn');x.beginPath();x.arc(X(fpr),Y(tpr),5,0,7);x.fill();
  x.fillStyle=css('--ink');x.fillText('R* = '+fmt(P.RTH,2)+': FPR '+fmt(fpr*100,0)+' %, TPR '+fmt(tpr*100,0)+' %',X(0.32),Y(0.18));
  $('rocCap').textContent='ROC egri chizig‘i (xavf indeksi R): AUC = '+fmt(auc,3)+'. Sariq nuqta — joriy ogohlantirish chegarasi R*. Nosozlik uchun baho oynasi: boshlanishidan 5 daqiqa oldin → himoya ishlagunicha; normal ishda 30 daqiqadan keyingi davr.'}
const HDR=['Usul','O‘rtacha ogohlantirish muddati','Eng kichik muddat','Yetarli (≥ javob vaqti) ulushi','O‘tkazib yuborilgan','Normal ishda signal berganlar ulushi'];
$('bRun').onclick=()=>guard(['bRun','b5'],async()=>{
  const s=Math.max(1,+$('seed').value||1)*101,r=await batchAsync({...P},simModel,s,10,50,setProg);
  const rows=METH.map(([k,n])=>{const m=r.m[k];return [n,nf(m.mean,1)+' min',nf(m.min,1)+' min',nf(m.ok*100,0)+' %',m.miss+' / '+r.nTrip,nf(m.far,2)]});
  const mm=a=>{const v=a.filter(x=>x!==null);return v.length?fmt(v.reduce((x,y)=>x+y,0)/v.length,1)+(v.length<a.length?` (${a.length-v.length} o‘tk.)`:''):(a.length?'ishlamadi':'—')};
  const per=FAULTS.map(kind=>{const p=r.per[kind],dx=r.dx[kind];return [KINDS[kind],p.trip+' / '+p.n,mm(p.alarm),mm(p.warn),mm(p.diag),mm(p.comb),dx[0]+' / '+dx[1]]});per.push([KINDS.normal,'—','—','—','—','—',r.dx.normal[0]+' / '+r.dx.normal[1]]);
  const H2=['Holat','Hodisa / jami','PLC alarm, min','AI indeksi, min','AI diagnostika, min','Birgalikda, min','AI tashxisi to‘g‘ri'];
  drawRoc(r.sc);lastBatch={title:'Barcha ssenariylar (variant '+s+')',rows:[HDR,...rows],per:[H2,...per],dx:r.dxAll};
  $('bOut').innerHTML=tbl(rows,HDR)+'<h2 style="margin:16px 0 0;font-size:14px">Holat turlari bo‘yicha</h2>'+tbl(per,H2)+`<p class="msg"><b>AI sabab tashxisi aniqligi: ${r.dxAll[0]} / ${r.dxAll[1]} (${fmt(100*r.dxAll[0]/r.dxAll[1],1)} %)</b></p><p class="note">Ogohlantirish muddati hodisa bo‘lgan ${r.nTrip} ta nosozlik bo‘yicha; “yetarli” — kamida ${fmt(P.Tresp,0)} daqiqa oldin.</p><p class="note">Normal ishda soxta signal (birgalikda usul): ${fmt(r.m[METH[METH.length-1][0]].far*100,0)} % ishlarda, taxminan ${fmt(r.m[METH[METH.length-1][0]].far/(P.N*P.dt/60),3)} ta/soat.</p>`});
$('b5').onclick=()=>guard(['bRun','b5'],async()=>{
  const runs=[];const N=5;for(let v=1;v<=N;v++){const m=await trainAsync({...P,noise:1,sev:0},v*11);runs.push(await batchAsync({...P},m,v*100,10,50,f=>setProg((v-1+f)/N)))}
  const st=a=>{const b=a.filter(isFinite);return b.length?{m:b.reduce((x,y)=>x+y,0)/b.length,lo:Math.min(...b),hi:Math.max(...b)}:{m:NaN,lo:NaN,hi:NaN}};const c=(o,d,u)=>isFinite(o.m)?fmt(o.m,d)+u+' ['+fmt(o.lo,d)+'–'+fmt(o.hi,d)+']':'—';
  const rows=METH.map(([k,n])=>[n,c(st(runs.map(r=>r.m[k].mean)),1,' min'),c(st(runs.map(r=>r.m[k].min)),1,' min'),c(st(runs.map(r=>r.m[k].ok*100)),0,' %'),runs.reduce((s,r)=>s+r.m[k].miss,0)+' / '+runs.reduce((s,r)=>s+r.nTrip,0),c(st(runs.map(r=>r.m[k].far)),2,'')]);
  drawRoc({n:runs.flatMap(r=>r.sc.n),f:runs.flatMap(r=>r.sc.f)});const dx=runs.reduce((s,r)=>[s[0]+r.dxAll[0],s[1]+r.dxAll[1]],[0,0]);lastBatch={title:'5 ta variant bo‘yicha o‘rtacha [min–maks]',rows:[HDR,...rows],dx};
  $('bOut').innerHTML=tbl(rows,HDR)+`<p class="msg"><b>AI sabab tashxisi aniqligi (5 variant): ${dx[0]} / ${dx[1]} (${fmt(100*dx[0]/dx[1],1)} %)</b></p><p class="note">Har bir variantda model qayta o‘qitildi (urug‘ 11·v) va ssenariylar yangidan yaratildi (urug‘ 100·v).</p><p class="note">Normal ishda soxta signal (birgalikda usul): taxminan ${fmt(runs.reduce((a,r)=>a+r.m[METH[METH.length-1][0]].far,0)/runs.length/(P.N*P.dt/60),3)} ta/soat.</p>`});
// ---------- o'z ma'lumotingiz ----------
const COLS=['TT01','TT02','FT01','FT02','FT03','LT01','WT','AT01','AT02','U11','U12','M01','M02'];
const csvRows=parseCsvText;
function parseRows(rows){const err=validateTable(rows);if(err)throw new Error(err);const hd=rows[0].map(x=>String(x).toUpperCase().trim());
  const body=rows.slice(1),T=body.length,d={};for(const v of VARS)d[v]=new Float64Array(T).fill(NaN);
  for(const c of COLS){const i=hd.indexOf(c);if(i<0)continue;d[c]=Float64Array.from(body.map(r=>r[i]!==undefined&&String(r[i]).trim()!==''?parseFloat(String(r[i]).replace(/\s/g,'').replace(',','.')):NaN))}
  if(hd.indexOf('U13')<0)d.U13=new Float64Array(T).fill(P.u3);if(hd.indexOf('M02')<0)d.M02=new Float64Array(T).fill(P.uM02);
  for(let k=0;k<T;k++)d.LAM[k]=d.FT01[k]>20?d.FT02[k]/(P.Lst*d.FT01[k]):NaN;d.trueTT02=d.TT02;d.trueW=d.AT02;d.FIN=new Float64Array(T).fill(NaN);
  d.burner=Uint8Array.from(d.FT01,x=>x>20?1:0);d.feeder=Uint8Array.from(d.WT,x=>x>0.2?1:0);d.conv=new Uint8Array(T).fill(1);
  return {kind:'normal',ft:-1,d,trips:findTrips(d),ev:[],t0:-1,user:true}}
function findTrips(d){const N=d.TT01.length,val={TT01:d.TT01,TT02:d.TT02,LAM:d.LAM,LT01:d.LT01,AT02:d.AT02};
  for(let k=0;k<N;k++)for(let j=0;j<EV.length;j++){const e=EV[j];if(e.hidden)continue;const y=val[e.v][k];if(!isFinite(y))continue;if(e.up?y>=e.T:y<=e.T)return [{k,j}]}return []}
$('csv').onchange=async e=>{const f=e.target.files[0];if(!f)return;
  const old={Qg_max:P.Qg_max,Qa1_max:P.Qa1_max,Ffeed_max:P.Ffeed_max,dt:P.dt};
  try{if(f.size>30e6)throw new Error('Fayl juda katta (30 MB gacha).');
    const dtS=parseFloat($('pDT').value),trP=parseFloat($('pTR').value);
    if(!(dtS>=1&&dtS<=3600))throw new Error('Diskretlik 1–3600 soniya oralig‘ida bo‘lishi kerak.');
    if(!(trP>=10&&trP<=90))throw new Error('Normal deb olinadigan qism 10–90 % oralig‘ida bo‘lishi kerak.');
    let rows;if(/\.xlsx$/i.test(f.name))rows=await readXlsx(await f.arrayBuffer());else rows=csvRows(await f.text());
    if(rows.length>200001)throw new Error('Qatorlar soni 200 000 dan oshmasligi kerak.');
    const run=parseRows(rows);const gq=(id,def)=>{const v=parseFloat($(id).value);return v>0?v:def};P.Qg_max=gq('pQg',PDEF.Qg_max);P.Qa1_max=gq('pQa',PDEF.Qa1_max);P.Ffeed_max=gq('pFm',PDEF.Ffeed_max);P.dt=dtS/60;const nTr=Math.max(60,Math.floor(run.d.TT01.length*trP/100));
    const sub={};for(const v of VARS)sub[v]=run.d[v].slice(0,nTr);sub.burner=run.d.burner.slice(0,nTr);const X=features(sub,P).X.slice(10);model=trainIFS(X,100,Math.min(256,X.length),5);mode='csv';window.__csvName=f.name;load(run);prog=run.d.TT01.length;render();
    $('csvMsg').textContent=f.name+': '+run.d.TT01.length+' qator yuklandi. Model birinchi '+nTr+' qatorda o‘qitildi (normal rejim deb olindi).';$('status').textContent=f.name+' — foydalanuvchi ma’lumoti.';showView('overview')}
  catch(er){Object.assign(P,old);$('csvMsg').textContent='Xato: '+er.message}e.target.value=''};
$('back').onclick=()=>{P.Qg_max=PDEF.Qg_max;P.Qa1_max=PDEF.Qa1_max;P.Ffeed_max=PDEF.Ffeed_max;P.dt=DT;model=simModel;mode='sim';runSimNow(false);$('csvMsg').textContent='Simulyatsiya rejimiga qaytildi.'};
$('sample').onclick=()=>{const run=runPlant('f4',rngMake(9),{...P,noise:1,sev:0});const d=run.d;const rows=[COLS];
  for(let k=0;k<d.TT01.length;k++)rows.push(COLS.map(c=>+(+d[c][k]).toFixed(3)));download('namuna_quritgich.xlsx',buildXlsx([{name:'Ma’lumot',rows}]),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')};
$('xExp').onclick=()=>{if(!cur)return;const d=cur.run.d,id=cur.idx,T=d.TT01.length,nv=(v,n)=>isFinite(v)?+v.toFixed(n):'';
  const hdr=['t, min',...COLS,'lambda','R','x1','x2','x3','x4','AT02 bashorat'];const rows=[hdr];
  for(let k=0;k<T;k++)rows.push([nv(k*P.dt,2),...COLS.map(c=>nv(d[c][k],3)),nv(d.LAM[k],3),nv(id.R[k],4),...[0,1,2,3].map(j=>nv(id.x[j][k],4)),nv(id.res.wPred[k],2)]);
  const sh=[{name:'Review',rows:cur.reviewRows||[['—']]},{name:'Vaqt qatori',rows},{name:'Parametrlar',rows:[['Parametr','Qiymat'],['TT02 topshiriq, °C',P.sp],['Nam material, t/soat',P.Fin],['M01 tezligi, %',P.uM01],['M02 tezligi, %',P.uM02],['Ikkilamchi havo 1-3, %',P.u3],['Kirish namligi, %',P.win],['Bunker sig‘imi, t',P.Mb],['Indeks ufqi, min',P.Th],['R*',P.RTH],['w1..w4',P.w.map(x=>x.toFixed(3)).join(' / ')]]}];
  if(lastBatch){const br=[[lastBatch.title],[],...lastBatch.rows];if(lastBatch.per)br.push([],...lastBatch.per);if(lastBatch.dx)br.push([],['AI tashxisi aniqligi',lastBatch.dx[0]+' / '+lastBatch.dx[1]]);sh.push({name:'Ommaviy sinov',rows:br})}
  download('quritgich_AI_review.xlsx',buildXlsx(sh),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')};
// ---------- bo'limlar ----------
function tickClock(){const d=new Date();const z=n=>String(n).padStart(2,'0');$('clock').textContent=d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate())+' '+z(d.getHours())+':'+z(d.getMinutes())+':'+z(d.getSeconds())}setInterval(tickClock,1000);tickClock();
(()=>{let t=null;try{t=localStorage.getItem('qtheme')}catch(e){}if(t===null&&window.matchMedia&&matchMedia('(prefers-color-scheme: light)').matches)t='light';if(t==='light')document.documentElement.dataset.theme='light'})();
$('theme').onclick=()=>{const r=document.documentElement;r.dataset.theme=r.dataset.theme==='light'?'':'light';try{localStorage.setItem('qtheme',r.dataset.theme==='light'?'light':'dark')}catch(e){}if(cur)render();if(lastRoc&&!$('rocCv').classList.contains('hide'))drawRoc(lastRoc)};
$('refresh').onclick=()=>$('run').click();
const VIEWS={overview:'Umumiy ko‘rinish',mimic:'Mnemosxema','3d':'3D ko‘rinish',trends:'Trendlar',ai:'AI xabarlari va indeks',review:'Hodisa tahlili (Review)',journal:'Hodisalar jurnali',batch:'Ommaviy sinov',data:'O‘z ma’lumotingiz',math:'Matematik model',settings:'Sozlamalar'};
const LIVE=['overview','mimic','3d','trends','ai','review','journal'];
function moveTo(node,view,slot){const pl=document.querySelector(`#v-${view} [data-place="${slot}"]`);if(pl&&node.parentNode!==pl)pl.appendChild(node)}
function showView(v){if(!Object.prototype.hasOwnProperty.call(VIEWS,v))v='overview';document.querySelectorAll('.view').forEach(s=>s.classList.toggle('on',s.id==='v-'+v));document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('on',b.dataset.view===v));
  $('crumb').textContent=window.tr?tr(VIEWS[v]):VIEWS[v];$('crumb').dataset.v=v;$('ctrl').style.display=LIVE.includes(v)?'':'none';
  if(v==='overview'||v==='mimic')moveTo($('mimic'),v,'mimic');if(v==='overview'||v==='mimic')vmWake();if(v==='overview'||v==='ai'){moveTo($('kvwrap'),v,'kv');moveTo($('barswrap'),v,'bars')}
  if(history.replaceState)history.replaceState(null,'','#'+v);window.scrollTo({top:0});lastW=0;if(cur)render()}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
showView((location.hash||'#overview').slice(1));
readP();readPlant();P.dt=DT;
(async()=>{await tick();try{await retrain(f=>{$('status').textContent='Model o‘qitilmoqda… '+Math.round(f*100)+' %'});$('status').textContent='Tayyor.';runSimNow(false)}catch(e){$('status').textContent='Xato: '+e.message}})();
