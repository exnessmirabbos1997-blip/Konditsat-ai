// Ishga tushirish: node --test tests/
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const S=require('./load');
const P=S.plantDefaults(),model=S.trainModel(P,7);
const N=20;
const run1=(kind,seed,Pg=P)=>{const run=S.runPlant(kind,S.rngMake(seed),Pg);const idx=S.computeIndex(run.d,model,P);return {run,idx,e:S.analyseRun(run,idx,P),dg:S.diagnose(run,idx,P)}};

test('normal ish: soxta signal va himoya hodisasi yo‘q (30 ssenariy)',()=>{
  for(let s=1;s<=30;s++){const {run,e}=run1('normal',1000+s);assert.equal(run.trips.length,0,'seed '+s+': himoya ishladi');assert.equal(e.fired.comb,false,'seed '+s+': soxta signal')}
});

for(const kind of S.FAULTS)test(`${kind}: nosozlik topiladi va sababi to‘g‘ri aniqlanadi (≥ 90 %)`,()=>{
  let det=0,dx=0;for(let s=1;s<=N;s++){const {e,dg}=run1(kind,2000+s);if(e.L.comb!==null)det++;if(dg.code===S.TRUTH[kind])dx++}
  assert.ok(det>=0.9*N,`${kind}: topildi ${det}/${N}`);assert.ok(dx>=0.9*N,`${kind}: tashxis ${dx}/${N}`);
});

test('birgalikda usul PLC alarmidan kech emas (o‘rtacha)',()=>{
  let a=0,c=0,n=0;for(const kind of S.FAULTS)for(let s=1;s<=10;s++){const {e}=run1(kind,3000+s);if(e.L.alarm!==null&&e.L.comb!==null){a+=e.L.alarm;c+=e.L.comb;n++}}
  assert.ok(n>0&&c/n>=a/n,`PLC ${a/n}, birgalikda ${c/n}`);
});

test('model aniq (bir xil urug‘ — bir xil natija)',()=>{
  const a=S.runPlant('f2',S.rngMake(5),P),b=S.runPlant('f2',S.rngMake(5),P);
  assert.deepEqual(Array.from(a.d.TT02),Array.from(b.d.TT02));
});

test('barqaror rejimda massa va energiya balansi',()=>{
  const Pq={...P,noise:0},run=S.runPlant('normal',S.rngMake(3),Pq),d=run.d;
  const avg=a=>{let s=0;for(let i=1200;i<1440;i++)s+=a[i];return s/240};
  const Qg=avg(d.FT01),Qa1=avg(d.FT02),Qa2=avg(d.FT03),TT01=avg(d.TT01),TT02=avg(d.TT02),WT=avg(d.WT),AT01=avg(d.AT01),AT02=avg(d.AT02);
  assert.ok(Math.abs(WT-P.Fin)/P.Fin<0.02,'shnek sarfi kelimga teng bo‘lishi kerak (bunker to‘lmaydi/bo‘shamaydi)');
  const lam=Qa1/(P.Lst*Qg);assert.ok(lam>1.05&&lam<1.25,'lambda '+lam);
  const heatGas=(Qg+Qa1)*P.cpg*(TT01-P.T0),heatMix=(Qg+Qa1+Qa2)*P.cpg*(TT02-P.T0);
  assert.ok(Math.abs(heatGas-heatMix)/heatGas<0.03,'aralashtirishda issiqlik saqlanishi');
  assert.ok(heatGas<=P.eta*Qg*P.LHV*1.01,'gazga berilgan issiqlik gorelka quvvatidan oshmasin');
  const E=P.kap*(Qg+Qa1+Qa2)*1.35*Math.max(0,TT02-P.Tout)/2800/1000;
  const wStar=AT01*Math.exp(-P.beta*E/(WT*AT01/100));assert.ok(Math.abs(wStar-AT02)<0.2,`w* ${wStar} ≈ AT02 ${AT02}`);
  assert.ok(AT02>0&&AT02<AT01,'mahsulot namligi kirishdan past');
});

test('TT02 datchigi muhit haroratidan past ko‘rsatmaydi',()=>{
  for(let s=1;s<=10;s++){const {run}=run1('f4',4000+s);assert.ok(Math.min(...run.d.TT02)>=P.T0-1e-9)}
});

test('o‘lchov asboblari ±10 % masshtab xatosida soxta signal kam (≤ 10 %)',()=>{
  for(const mod of [{Qg_max:440},{Qg_max:360},{Qa1_max:4950},{Qa1_max:4050},{Ffeed_max:11.55},{Ffeed_max:9.45}]){
    let fa=0;for(let s=1;s<=20;s++){const {e}=run1('normal',5000+s,{...P,...mod});if(e.fired.warn||e.fired.diag)fa++}
    assert.ok(fa<=2,JSON.stringify(mod)+': soxta '+fa+'/20');
  }
});

test('Matematik model bo‘limidagi sonlar CONFIG bilan mos',()=>{
  const html=fs.readFileSync(path.join(S.root,'index.html'),'utf8'),c=S.CONFIG.plant;
  const chk=[[`Q<sub>g,max</sub> = ${c.Qg_max},`],[`Q<sub>a1,max</sub> = ${c.Qa1_max},`],[`Q<sub>a2,max</sub> = ${c.Qa2_max} `],[`H<sub>u</sub> = ${c.LHV.toLocaleString('en').replace(/,/g,' ')} kJ/m³`],
    [`F<sub>max</sub> = ${String(c.Ffeed_max).replace('.',',')} t/soat`],[`κ = ${String(c.kap).replace('.',',')}`],[`β = ${String(c.beta).replace('.',',')}`],[`η = ${String(c.eta).replace('.',',')}`],
    [`τ<sub>f</sub> = ${c.tauF}`],[`τ<sub>d</sub> = ${String(c.tauD).replace('.',',')}`],[`τ<sub>p</sub> = ${c.tauP}`],[`TT02 topshiriq ${c.sp} °C`]];
  for(const [t] of chk)assert.ok(html.includes(t),'Matematik model matnida topilmadi: '+t);
});
