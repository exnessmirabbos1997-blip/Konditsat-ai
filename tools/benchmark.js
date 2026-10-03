// AI xavf indeksini oddiy statistik usullar (EWMA, CUSUM) bilan solishtirish: ROC/AUC va belgilangan soxta signal darajasida ogohlantirish muddati.
// Ishga tushirish: node tools/benchmark.js  → docs/BENCHMARK.md
const fs=require('fs'),path=require('path');
const S=require('../tests/load');
const P=S.plantDefaults(),model=S.trainModel(P,7);
const SENS=['TT01','TT02','FT01','FT02','FT03','LT01','WT','AT01','AT02'];
const NN=100,NF=30,KINDS=[...S.FAULTS,'f1+f4','f2+f6','f3+f5'];
const dt=P.dt;
// --- normal ma'lumotdan har bir datchikning o'rtacha va tarqoqligi (30 daqiqadan keyin)
const calib=(()=>{const acc={};SENS.forEach(v=>acc[v]=[]);for(let s=1;s<=30;s++){const r=S.runPlant('normal',S.rngMake(9000+s),P);SENS.forEach(v=>{for(let k=180;k<r.d[v].length;k+=3)acc[v].push(r.d[v][k])})}
  const o={};for(const v of SENS){const a=acc[v],m=a.reduce((x,y)=>x+y,0)/a.length,sd=Math.sqrt(a.reduce((x,y)=>x+(y-m)**2,0)/a.length)||1;o[v]={m,sd}}return o})();
function ewma(run){const N=run.d.TT01.length,out=new Float64Array(N);const z=new Float64Array(SENS.length);const lam=0.2;
  for(let k=0;k<N;k++){let mx=0;SENS.forEach((v,i)=>{const x=(run.d[v][k]-calib[v].m)/calib[v].sd;z[i]=lam*(isFinite(x)?x:0)+(1-lam)*z[i];mx=Math.max(mx,Math.abs(z[i])/Math.sqrt(lam/(2-lam)))});out[k]=mx}return out}
function cusum(run){const N=run.d.TT01.length,out=new Float64Array(N),sp=new Float64Array(SENS.length),sn=new Float64Array(SENS.length);
  for(let k=0;k<N;k++){let mx=0;SENS.forEach((v,i)=>{const x=(run.d[v][k]-calib[v].m)/calib[v].sd;sp[i]=Math.max(0,sp[i]+x-0.5);sn[i]=Math.max(0,sn[i]-x-0.5);mx=Math.max(mx,sp[i],sn[i])});out[k]=mx}return out}
const METHODS={'AI xavf indeksi R':(run)=>S.computeIndex(run.d,model,P).R,'EWMA (9 datchik)':ewma,'CUSUM (9 datchik)':cusum};
// --- ssenariylar
function bench(Pg){
const normal=[],faulty=[];
for(let s=1;s<=NN;s++)normal.push(S.runPlant('normal',S.rngMake(10000+s),Pg));
for(const kd of KINDS)for(let s=1;s<=NF;s++)faulty.push(S.runPlant(kd,S.rngMake(20000+s),Pg));
const win=r=>[Math.max(0,r.ft-Math.round(5/dt)),r.trips.length?r.trips[0].k:r.d.TT01.length];
const res={};
for(const [name,fn] of Object.entries(METHODS)){
  const ns=normal.map(r=>fn(r)),fs_=faulty.map(r=>fn(r));
  const nScore=ns.map(a=>{let m=0;for(let k=180;k<a.length;k++)m=Math.max(m,a[k]);return m});     // 30 daqiqa o'tish davri tashlab yuboriladi
  const fScore=fs_.map((a,i)=>{const [a0,b0]=win(faulty[i]);let m=0;for(let k=a0;k<=Math.min(b0,a.length-1);k++)m=Math.max(m,a[k]);return m});
  const all=[...new Set([...nScore,...fScore])].sort((x,y)=>x-y);const roc=[];
  for(const th of all){roc.push([nScore.filter(x=>x>=th).length/NN,fScore.filter(x=>x>=th).length/fScore.length])}
  roc.push([0,0]);roc.sort((p,q)=>p[0]-q[0]||p[1]-q[1]);let auc=0;for(let i=1;i<roc.length;i++)auc+=(roc[i][0]-roc[i-1][0])*(roc[i][1]+roc[i-1][1])/2;auc+=(1-roc[roc.length-1][0])*(roc[roc.length-1][1]+1)/2;
  // soxta signal ≤ 2 % bo'ladigan eng past chegara
  let th=all.find(t=>nScore.filter(x=>x>=t).length/NN<=0.02);if(th===undefined)th=Infinity;
  const tpr=fScore.filter(x=>x>=th).length/fScore.length;
  const leads=[];faulty.forEach((r,i)=>{if(!r.trips.length)return;const a=fs_[i],[a0,b0]=win(r);let hit=-1;for(let k=a0;k<=b0;k++)if(a[k]>=th){hit=k;break}if(hit>=0)leads.push((r.trips[0].k-hit)*dt)});
  const tripN=faulty.filter(r=>r.trips.length).length;
  res[name]={auc,fpr:nScore.filter(x=>x>=th).length/NN,tpr,meanLead:leads.length?leads.reduce((x,y)=>x+y,0)/leads.length:null,found:leads.length,tripN};
}
return {res,nF:faulty.length};}
const SC=[['Nominal sharoit (shovqin ×1, nosozlik jiddiyligi tasodifiy)',P],['Shovqin ×2 (model ×1 da o‘qitilgan)',{...P,noise:2}],['Yengil nosozliklar (jiddiylik 0,3)',{...P,sev:0.3}],['Sekin rivojlanish (×3 sekinroq)',{...P,slow:3}]];
let md=`# Benchmark: AI xavf indeksi va EWMA / CUSUM\n\nSintetik ma'lumotda: ${NN} ta normal ish va ${KINDS.length} turdagi nosozlikdan ${NF} tadan (3 tasi bir vaqtdagi ikki nosozlik). Baho oynasi — nosozlik boshlanishidan 5 daqiqa oldin → himoya ishlagunicha; normal ishda 30 daqiqadan keyingi butun davr. Chegara har bir usul uchun normal ishlarning ≤ 2 % ida soxta signal beradigan eng past qiymat qilib tanlangan (adolatli taqqoslash). Baza usullar 9 ta datchikning har biriga alohida (EWMA λ = 0,2; CUSUM k = 0,5σ), nominal normal ma'lumotdan olingan o'rtacha va σ bilan; AI modeli nominal shovqinda o'qitilgan.\n`;
for(const [label,Pg] of SC){const {res}=bench(Pg);md+=`\n## ${label}\n\n| Usul | AUC | Soxta signal | Aniqlangan (TPR) | O'rtacha ogohlantirish, min | Aniqlangan / himoya ishlagan |\n|---|---|---|---|---|---|\n`;
 for(const [n,r] of Object.entries(res))md+=`| ${n} | ${r.auc.toFixed(3)} | ${(r.fpr*100).toFixed(0)} % | ${(r.tpr*100).toFixed(0)} % | ${r.meanLead===null?'—':r.meanLead.toFixed(1)} | ${r.found} / ${r.tripN} |\n`;}
md+=`\n**Xulosa uchun eslatma:** oddiy EWMA ham aniqlash vaqtida AI ga yaqin; AI ning asosiy ustunligi — sababni aniqlash (tashxis) va fizik izchillik qoldiqlari, EWMA/CUSUM esa faqat "nimadir o'zgardi" deydi. Ma'lumot shu simulyatorning o'zidan, real qurilmada natija boshqacha bo'lishi mumkin.\n`;
fs.writeFileSync(path.join(__dirname,'..','docs','BENCHMARK.md'),md);console.log(md);
