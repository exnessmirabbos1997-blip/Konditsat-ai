// ===== Quritish qurilmasi: jarayon modeli, PLC himoyasi, AI indeksi, sabab tashxisi =====
const DT=CONFIG.step.dtMin, NSTEP=CONFIG.step.n;               // 10 s qadam, 4 soat
function rngMake(seed){let a=seed>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function gauss(r){let u=0,v=0;while(u===0)u=r();while(v===0)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
const clip=(x,a,b)=>Math.min(b,Math.max(a,x));
const KINDS={normal:'Normal ish',f1:'Nam material namligi keskin oshdi',f2:'Birlamchi havo yetishmovchiligi (1-1 klapan / ventilyator)',f3:'Gaz klapani 1-2 zich yopilmayapti (gaz oshib ketdi)',f4:'TT02 harorat datchigi siljishi (past ko‘rsatmoqda)',f5:'Nam material kelishi to‘xtadi (konveyer 1)',f6:'Shnekli ta’minlagich 3 tiqilib qoldi',f7:'Bunker aralashtirgichi M02 to‘xtadi — material osilib qoldi'};
const FAULTS=['f1','f2','f3','f4','f5','f6','f7'];
const CAUSE={none:'Nosozlik belgisi topilmadi',moisture:'Kirish materiali namligining oshishi',airloss:'Birlamchi havo yetishmovchiligi',gasleak:'Gaz klapani 1-2 orqali ortiqcha gaz o‘tishi',tt02:'TT02 datchigining siljishi',feedloss:'Nam material kelishining to‘xtashi',jam:'Shnekli ta’minlagichning tiqilishi',rotor:'Bunker aralashtirgichi (M02) to‘xtashi va materialning osilib qolishi'};
const TRUTH={normal:'none',f1:'moisture',f2:'airloss',f3:'gasleak',f4:'tt02',f5:'feedloss',f6:'jam',f7:'rotor'};
// himoya hodisalari: turi, o'zgaruvchi, alarm, trip, yo'nalish
const EV=[
 {id:'TT01HH',v:'TT01',A:1120,T:1180,up:1,name:'TT01 yuqori-yuqori (o‘txona)',act:'gaz klapani 1-2 yopildi — gorelka o‘chirildi'},
 {id:'TT02HH',v:'TT02',A:380,T:400,up:1,name:'TT02 yuqori-yuqori (quritish agenti)',act:'gaz klapani 1-2 yopildi — gorelka o‘chirildi'},
 {id:'LAMLL',v:'LAM',A:1.05,T:0.95,up:0,name:'Havo/gaz nisbati past-past',act:'gaz klapani 1-2 yopildi — gorelka o‘chirildi'},
 {id:'LTLL',v:'LT01',A:15,T:5,up:0,name:'Bunker sathi past-past (LT01)',act:'M01 ta’minlagich to‘xtatildi; material kelmagani uchun 2 daqiqadan so‘ng quruq yurishdan himoya gorelkani o‘chiradi'},
 {id:'LTHH',v:'LT01',A:85,T:95,up:1,name:'Bunker sathi yuqori-yuqori (LT01)',act:'nam material konveyeri 1 to‘xtatildi (material kelishi to‘xtaydi); ta’minot kam bo‘lib qolsa (WT < 50 %) 3 daqiqadan so‘ng gorelka ham o‘chiriladi'},
 {id:'AT02HH',v:'AT02',A:6,T:8,up:1,name:'Mahsulot namligi yuqori-yuqori (AT02)',act:'yaroqsiz mahsulot tayyor mahsulot bunkeriga yuborilmaydi: M01 ta’minlagich va konveyer 1 to‘xtatildi, 2 daqiqadan so‘ng gorelka quruq yurishdan himoya bilan o‘chadi'},
 {id:'TT02TRUE',v:'trueTT02',A:380,T:405,up:1,hidden:1,name:'Quritish agentining haqiqiy harorati 400 °C chegarasidan oshdi (yashirin xavf)',act:'TT02 noto‘g‘ri ko‘rsatgani uchun PLC himoyasi ishlamadi; zaxira termostat (mustaqil TSHH) 1 daqiqadan so‘ng gorelkani o‘chiradi'}];
function plantDefaults(){const c=JSON.parse(JSON.stringify(CONFIG.plant));c.dt=DT;c.N=NSTEP;return c}
// o'zgaruvchi nomlari
const VARS=['TT01','TT02','FT01','FT02','FT03','LT01','WT','AT01','AT02','U11','U12','U13','M01','M02','LAM','FIN'];
function runPlant(kind,r,P){
  const KS=new Set(kind.split('+'));   // 'f1+f4' — bir vaqtda ikki nosozlik
  const N=P.N,dt=P.dt,nz=P.noise;const S=()=>P.sev>0?P.sev:r();
  const d={};for(const v of VARS)d[v]=new Float64Array(N);d.trueTT02=new Float64Array(N);d.trueW=new Float64Array(N);d.burner=new Uint8Array(N);d.feeder=new Uint8Array(N);d.conv=new Uint8Array(N);
  let L=KS.has('f5')?20+r()*25:(KS.has('f6')||KS.has('f7'))?75+r()*12:35+r()*35;
  let win=P.win+gauss(r)*1.0,Tf=1050,Td=P.sp,wout=4,ou=0,ow=0,integ=0,uG=62,uA=61,burner=true,feeder=true,conv=true;
  let ft=-1,nfT=0,bTripK=-1,lwT=0,hidK=-1;const t0=Math.floor((15+r()*100)/dt);          // nosozlik boshlanishi
  const sv=S(),tauFault=(20+60*r())*(P.slow||1)/dt;
  const dW=7+6*sv,hAir=0.55-0.25*sv,leakMax=300+150*sv,drift=60+60*sv,jam=0.4-0.3*sv,rot=0.4-0.3*sv;
  const buf=new Float64Array(Math.round(P.delayP/dt)+1);let bi=0;buf.fill(4);
  const ev=[],trips=[],done={};let lastTT02=P.sp,lastFT02=null;
  const bias={TT01:gauss(r)*3,TT02:gauss(r)*1,FT01:gauss(r)*0.01,FT02:gauss(r)*0.01};
  const B=180;   // 30 daqiqalik barqarorlashtirish (yozilmaydi)
  for(let kk=0;kk<N+B;kk++){
    const k=kk-B;const rec=k>=0;const kx=Math.max(0,k);
    const t=k*dt;const fk=Math.max(0,Math.min(1,(k-t0)/tauFault));const on=rec&&k>=t0&&kind!=='normal';
    if(on&&ft<0){ft=k;ev.push({k,src:'truth',code:TRUTH[kind.split('+')[0]]})}
    // tashqi ta'sirlar
    ou+=(-ou/40)*dt+0.12*Math.sqrt(dt)*gauss(r);ow+=(-ow/60)*dt+0.10*Math.sqrt(dt)*gauss(r);
    let Fin=conv?P.Fin*(1+0.05*ou):0; if(KS.has('f5')&&on)Fin=0;
    let winT=win+ow; if(KS.has('f1')&&on)winT+=dW*fk;
    // ta'minlagich
    let eff=1; if(KS.has('f6')&&on)eff=1-(1-jam)*fk;
    // M02 — bunker aralashtirgichi: to'xtasa material osilib qoladi (gumbaz), ta'minot kamayadi
    let rh=1; if(KS.has('f7')&&on){rh=1-0.9*Math.min(1,(k-t0)/Math.max(1,tauFault*0.2));eff*=1-(1-rot)*fk}
    let Ff=feeder?P.Ffeed_max*P.uM01/100*eff:0; if(L<=0.5)Ff=Math.min(Ff,Fin);
    L=clip(L+(Fin-Ff)/P.Mb*100*dt/60,0,100);
    const m02=P.uM02*rh;
    // gorelka: PI (TT02 o'lchangan) -> 1-2; havo oqimi PI -> 1-1
    const TT02m_prev=lastTT02;
    if(burner){const e=P.sp-TT02m_prev;integ=clip(integ+e*dt/P.Ti,-400,400);uG=clip(62+P.Kp*(e+integ),5,100)}else uG=0;
    let Qg=uG/100*P.Qg_max; if(KS.has('f3')&&on&&burner)Qg+=leakMax*fk; if(!burner)Qg=0;
    const target=P.lam*P.Lst*Math.max(Qg,40);
    let ha=1; if(KS.has('f2')&&on)ha=1-(1-hAir)*fk;
    const Qa1_prev=lastFT02===null?target:lastFT02; uA=clip(uA+0.02*(target-Qa1_prev)*dt*6/60,5,100);
    const Qa1=uA/100*P.Qa1_max*ha; const Qa2=P.u3/100*P.Qa2_max;
    const lam=Qg>1?Qa1/(P.Lst*Qg):9.99;
    const comb=Math.min(1,lam);
    const TfStar=P.T0+(Qg>1?P.eta*Qg*P.LHV*comb/((Qg+Qa1)*P.cpg):0);
    Tf+=(TfStar-Tf)*dt/P.tauF;
    const TdStar=((Qg+Qa1)*Tf+Qa2*P.T0)/(Qg+Qa1+Qa2);
    Td+=(TdStar-Td)*dt/P.tauD;
    // quritish
    const Qda=Qg+Qa1+Qa2;const E=P.kap*Qda*1.35*Math.max(0,Td-P.Tout)/2800/1000; // bug'latish qobiliyati, t/soat
    const water=Ff*winT/100;
    const wStar=water>0.01?Math.max(0.8,winT*Math.exp(-P.beta*E/water)):wout;
    wout+=(wStar-wout)*dt/P.tauP; buf[bi]=wout;bi=(bi+1)%buf.length;const wDel=buf[bi];
    // TT02 datchigi
    let TT02m=Td+bias.TT02+gauss(r)*1.5*nz; if(KS.has('f4')&&on)TT02m-=drift*fk; TT02m=Math.max(P.T0,TT02m);
    const m={TT01:Tf+bias.TT01+gauss(r)*3*nz,TT02:TT02m,trueTT02:Td,FT01:Qg*(1+bias.FT01+gauss(r)*0.008*nz),FT02:Qa1*(1+bias.FT02+gauss(r)*0.008*nz),FT03:Qa2*(1+gauss(r)*0.008*nz),
      LT01:L+gauss(r)*0.3*nz,WT:Ff*(1+gauss(r)*0.015*nz),AT01:winT+gauss(r)*0.15*nz,AT02:Math.max(0,wDel+gauss(r)*0.1*nz),trueW:wout,U11:uA,U12:uG,U13:P.u3,M01:feeder?P.uM01:0,M02:m02+gauss(r)*0.3*nz,FIN:Fin};
    m.LAM=m.FT01>20?m.FT02/(P.Lst*m.FT01):NaN;
    lastTT02=m.TT02;lastFT02=m.FT02;
    if(!rec)continue;
    for(const q in m)d[q][k]=m[q];
    d.burner[k]=burner?1:0; d.feeder[k]=feeder?1:0; d.conv[k]=conv?1:0;
    // PLC himoyasi
    const val={TT01:d.TT01[k],TT02:d.TT02[k],LAM:d.LAM[k],LT01:d.LT01[k],AT02:d.AT02[k],trueTT02:Td};
    for(let j=0;j<EV.length;j++){const e=EV[j];if(done[e.id])continue;const y=val[e.v];if(!isFinite(y))continue;
      const hit=e.up?y>=e.T:y<=e.T; if(e.id==='LAMLL'&&(!burner||d.FT01[k]<60))continue;
      if(hit){done[e.id]=1;trips.push({k,j});ev.push({k,src:e.hidden?'hidden':'plc',code:'trip',j});if(e.hidden){hidK=k;continue}
        if(e.id==='TT01HH'||e.id==='TT02HH'||e.id==='LAMLL'){burner=false;bTripK=k} if(e.id==='LTLL')feeder=false; if(e.id==='LTHH')conv=false; if(e.id==='AT02HH'){feeder=false;conv=false;ev.push({k,src:'plc',code:'reject'})}}}
    // blokirovkalar (PLC): material kelmasa gorelka o'chadi; gorelka o'chsa nam material berilmaydi
    if(burner){if(!feeder||Ff<0.3)nfT+=dt;else nfT=0;if(nfT>=P.Tdry){burner=false;ev.push({k,src:'plc',code:'nofeed'})}}
    // bunker to'lgan (LTHH) bo'lsa-yu ta'minot nominalning yarmidan past bo'lsa — shnek tiqilgan / M02 to'xtagan: quritgich to'xtatiladi
    if(burner&&feeder&&done.LTHH){const cap=P.Ffeed_max*P.uM01/100;if(Ff<0.5*cap)lwT+=dt;else lwT=0;if(lwT>=P.Tlow){burner=false;bTripK=k;ev.push({k,src:'plc',code:'lowload'})}}
    // zaxira (mustaqil) termostat: TT02 datchigi yolg'on ko'rsatsa ham haqiqiy harorat 400 dan oshsa gorelka o'chadi
    if(hidK>=0&&burner&&k>=hidK+Math.round(1/dt)){burner=false;bTripK=k;ev.push({k,src:'plc',code:'backup'})}
    if(bTripK>=0&&feeder&&k>=bTripK+Math.round(1/dt)){feeder=false;conv=false;ev.push({k,src:'plc',code:'feedstop'})}
  }
  return {kind,ft,d,trips,ev,t0};
}
// ---- fizik qoldiqlar (izchillik tekshiruvi) ----
function residuals(d,P){
  const N=d.TT01.length,o={Tmix:new Float64Array(N),rI:new Float64Array(N),rW:new Float64Array(N),rT:new Float64Array(N),rG:new Float64Array(N),rA:new Float64Array(N),rF:new Float64Array(N),rM:new Float64Array(N),wPred:new Float64Array(N),inflow:new Float64Array(N)};
  const has=k=>isFinite(k);let wp=4;
  for(let k=0;k<N;k++){
    const Qg=d.FT01[k],Qa1=d.FT02[k],Qa2=d.FT03[k],Tf=d.TT01[k];
    const Tmix=((Qg+Qa1)*Tf+Qa2*P.T0)/Math.max(1,Qg+Qa1+Qa2);
    o.Tmix[k]=Tmix;o.rT[k]=has(d.TT02[k])&&has(Tf)?(d.TT02[k]-Tmix)/12:0;                         // TT02: o'lchangan - aralashma modeli
    o.rG[k]=has(d.U12[k])&&d.U12[k]>0.5?(Qg-d.U12[k]/100*P.Qg_max)/(0.03*P.Qg_max):0; // gaz: FT01 - klapan modeli
    o.rA[k]=has(d.U11[k])?(Qa1-d.U11[k]/100*P.Qa1_max)/(0.03*P.Qa1_max):0;         // havo: FT02 - klapan modeli
    o.rF[k]=has(d.M01[k])&&d.M01[k]>0?(d.WT[k]-P.Ffeed_max*d.M01[k]/100)/(0.03*P.Ffeed_max):0; // WT - shnek modeli
    o.rM[k]=has(d.M02[k])?(d.M02[k]-P.uM02)/1.5:0;                                   // M02 tezligi - buyruq
    // kutilayotgan mahsulot namligi (kirish ma'lumotlaridan)
    const Qda=Qg+Qa1+Qa2,Ff=d.WT[k],win=d.AT01[k];const E=P.kap*Qda*1.35*Math.max(0,d.TT02[k]-P.Tout)/2800/1000;
    const wat=Ff*win/100;const ws=wat>0.01?win*Math.exp(-P.beta*E/wat):wp;wp=ws;o.wPred[k]=ws;
  }
  const w=Math.round(15/P.dt);
  for(let k=0;k<N;k++){const a=Math.max(0,k-w);let sw=0;for(let j=a;j<=k;j++)sw+=d.WT[j];sw/=(k-a+1);
    let sx=0,sy=0,n=k-a+1;for(let j=a;j<=k;j++){sx+=j;sy+=d.LT01[j]}const mx=sx/n,my=sy/n;let sxy=0,sxx=0;for(let j=a;j<=k;j++){sxy+=(j-mx)*(d.LT01[j]-my);sxx+=(j-mx)*(j-mx)}
    const dL=sxx>0?sxy/sxx/P.dt:0;   // LT01 qiyaligi — eng kichik kvadratlar (oxirgi nuqtalar farqidan shovqinga ~4 marta chidamliroq)
    o.inflow[k]=k<w?P.Fin:sw+dL*P.Mb/100*60;
    o.rI[k]=k<w?0:(o.inflow[k]-P.Fin)/1.0;                        // bunker massa balansi: taxminiy kelim - nominal
    o.rW[k]=isFinite(d.AT01[k])?(d.AT01[k]-P.win)/1.0:0;}         // kirish namligi - nominal
  return o;
}
function features(d,P){const R=residuals(d,P);const N=d.TT01.length,X=new Array(N);for(let k=0;k<N;k++)X[k]=[R.rT[k],R.rG[k],R.rA[k],R.rF[k],R.rM[k],R.rI[k],R.rW[k]];return {R,X}}
// ---- Isolation Forest ----
function cfun(n){return n<=1?0:2*(Math.log(n-1)+0.5772156649)-2*(n-1)/n}
function buildTree(data,idx,depth,maxD,r){const n=idx.length;if(depth>=maxD||n<=1)return {size:n};const f=Math.floor(r()*data[0].length);let mn=Infinity,mx=-Infinity;for(const i of idx){const v=data[i][f];if(v<mn)mn=v;if(v>mx)mx=v}if(mn===mx)return {size:n};const sp=mn+r()*(mx-mn);const l=[],rr=[];for(const i of idx)(data[i][f]<sp?l:rr).push(i);return {f,sp,l:buildTree(data,l,depth+1,maxD,r),r:buildTree(data,rr,depth+1,maxD,r)}}
function pathLen(t,x,d){while(t.size===undefined){t=x[t.f]<t.sp?t.l:t.r;d++}return d+cfun(t.size)}
function ifScore(m,x){let s=0;for(const t of m.trees)s+=pathLen(t,x,0);return Math.pow(2,-(s/m.trees.length)/m.c)}
function trainIF(data,nTrees,sub,seed){const r=rngMake(seed);const trees=[];const maxD=Math.ceil(Math.log2(sub));for(let t=0;t<nTrees;t++){const pool=Array.from({length:data.length},(_,i)=>i),m=Math.min(sub,pool.length);for(let i=0;i<m;i++){const j=i+Math.floor(r()*(pool.length-i));[pool[i],pool[j]]=[pool[j],pool[i]]}trees.push(buildTree(data,pool.slice(0,m),0,maxD,r))}
  const m={trees,c:cfun(sub)};const sc=data.map(x=>ifScore(m,x)).sort((a,b)=>a-b);m.smin=sc[Math.floor(sc.length*0.5)];m.smax=Math.max(sc[sc.length-1],m.smin+1e-6);return m}
// qoldiqlarni normal ma'lumotdagi tarqoqlikka moslash: p99(|r|) > 2,5 bo'lsa (shovqin ko'p) shu ustun kengaytiriladi, aks holda 1
function fitScale(data){const q=data[0].length,sc=[];for(let j=0;j<q;j++){const a=data.map(x=>Math.abs(x[j])).sort((u,v)=>u-v);const p99=a[Math.floor(a.length*0.99)]||0;sc.push(Math.max(1,p99/2.5))}return sc}
function trainIFS(data,nTrees,sub,seed){const sc=fitScale(data);const m=trainIF(data.map(x=>x.map((v,i)=>v/sc[i])),nTrees,sub,seed);m.sc=sc;return m}
function trainModel(P,seed){const r=rngMake(seed);let data=[];for(let i=0;i<P.nTrain;i++){const run=runPlant('normal',r,P);const X=features(run.d,P).X;for(let k=30;k<X.length;k+=2)data.push(X[k])}const m=trainIFS(data,P.nTrees,P.sub,seed+1);m.noise=P.noise||1;return m}
// ---- dinamik xavf indeksi ----
function slopeOf(a,k,w,dt){const i=Math.max(0,k-w);let s1=0,n1=0,s2=0,n2=0;for(let j=i;j<=Math.min(k,i+2);j++)if(isFinite(a[j])){s1+=a[j];n1++}for(let j=Math.max(i,k-2);j<=k;j++)if(isFinite(a[j])){s2+=a[j];n2++}if(!n1||!n2||k-i<3)return 0;return (s2/n2-s1/n1)/((k-i-2)*dt)}
function computeIndex(d,model,P){
  const N=d.TT01.length,{R,X}=features(d,P),w=P.w,Th=P.Th,W=Math.round(3/P.dt);
  if(model.sc){const Q=['rT','rG','rA','rF','rM','rI','rW'],sc=model.sc;   // qoldiqlar normal ma'lumotdagi tarqoqlikka bo'linadi (CSV rejimida real shovqin uchun)
    for(let k=0;k<N;k++)for(let q=0;q<7;q++)X[k][q]/=sc[q];
    Q.forEach((n,q)=>{if(sc[q]!==1)for(let k=0;k<N;k++)R[n][k]/=sc[q]})}
  const out={R:new Float64Array(N),x:[[],[],[],[]],sif:new Int8Array(N),ttt:new Float64Array(N),d3:new Uint8Array(N),d4:new Uint8Array(N),res:R,iso:new Float64Array(N),rmax:new Float64Array(N),rarg:new Int8Array(N)};
  const soft=new Float64Array(N);for(let k=0;k<N;k++)soft[k]=isFinite(R.Tmix[k])?Math.max(d.TT02[k],R.Tmix[k]-10):d.TT02[k];   // TT02 yumshoq datchik bilan
  const sm=(a,n)=>{const o=new Float64Array(a.length);let s=0,c=0;const q=[];for(let k=0;k<a.length;k++){const v=a[k];if(isFinite(v)){q.push(v);s+=v;c++;if(q.length>n){s-=q.shift();c--}}o[k]=c?s/c:NaN}return o};
  const SMN=Math.max(1,Math.round(Math.max(1,P.noise||1)/P.dt));   // 1 daqiqalik harakatlanuvchi o'rtacha: bitta shovqinli o'lchov "alarmga yaqin" deb hisoblanmasin
  const val={TT01:sm(d.TT01,SMN),TT02:sm(soft,SMN),LAM:sm(d.LAM,SMN),LT01:sm(d.LT01,SMN),AT02:sm(d.AT02,SMN)};
  const thr={TT01:0.5,TT02:0.3,LAM:0.002,LT01:0.02,AT02:0.01};
  const rn=Math.max(1,(P.noise||1)/(model.noise||1)),zf=rn>1?[1,rn,rn,rn,1,1,1]:null;   // Isolation Forest kirishi: oqim o'lchagichlari (r_G, r_A, r_F) shovqini oshgan bo'lsa shu nisbatga bo'linadi (tashxis qoldiqlari o'zgarmaydi)
  for(let k=0;k<N;k++){
    let best=-1,bj=0,btt=Infinity,bx1=0,bx2=0;
    for(let j=0;j<EV.length;j++){const e=EV[j];if(e.hidden)continue;const a=val[e.v],y=a[k];if(!isFinite(y))continue;
      if(e.v==='LAM'&&!d.burner[k])continue;
      const z=2*e.A-e.T;const x1=e.up?clip((y-z)/(e.T-z),0,1):clip((z-y)/(z-e.T),0,1);
      let v=slopeOf(a,k,W,P.dt),tt=Infinity;
      if(e.v==='AT02'){ // model bo'yicha kutilayotgan namlik: w(t) -> wPred, tauP+kechikish
        const wp=R.wPred[k];if(wp>e.T&&y<e.T){tt=P.delayP+P.tauP*Math.log(Math.max(1.0001,(wp-y)/(wp-e.T)))}
        else if(y>=e.T)tt=0;}
      else if(e.up?v>thr[e.v]:v<-thr[e.v]) tt=Math.max(0,(e.T-y)/v);
      const x2=clip(1-tt/Th,0,1);const s=w[0]*x1+w[1]*x2;
      if(s>best){best=s;bj=j;btt=tt;bx1=x1;bx2=x2}}
    const xi=X[k];let rm=0,ra=0;for(let q=0;q<7;q++){if(Math.abs(xi[q])>rm){rm=Math.abs(xi[q]);ra=q}}
    const iso=k<W?0:clip((ifScore(model,zf?xi.map((v,q)=>v/zf[q]):xi)-model.smin)/(model.smax-model.smin),0,1);
    const x3=Math.max(iso,clip((rm-3)/2,0,1)),x4=clip((rm-3)/4,0,1);
    out.x[0].push(bx1);out.x[1].push(bx2);out.x[2].push(x3);out.x[3].push(x4);out.sif[k]=bj;out.ttt[k]=btt;out.iso[k]=iso;out.rmax[k]=rm;out.rarg[k]=ra;
    out.R[k]=clip(w[0]*bx1+w[1]*bx2+w[2]*x3+w[3]*x4,0,1);
    out.d3[k]=k>=W&&(iso>=0.98||rm>=4.8)?1:0;out.d4[k]=k>=W&&rm>=4.8?1:0;
  }
  return out;
}
function firstRun(cond,K,T,from){let c=0;for(let k=Math.max(0,from||0);k<T;k++){c=cond(k)?c+1:0;if(c>=K)return k-K+1}return -1}
function alarmCond(d){return k=>d.TT01[k]>=1120||d.TT02[k]>=380||(d.burner[k]&&d.FT01[k]>60&&d.LAM[k]<=1.05)||d.LT01[k]<=15||d.LT01[k]>=85||d.AT02[k]>=6}
function analyseRun(run,idx,P){
  const d=run.d,N=d.TT01.length,dt=P.dt;const from=run.kind==='normal'||run.ft<0?0:Math.max(0,run.ft-Math.round(5/dt));
  const trip=run.trips.length?run.trips[0].k:-1,tripJ=run.trips.length?run.trips[0].j:-1;
  const alarm=firstRun(alarmCond(d),3,N,from),warn=firstRun(k=>idx.R[k]>=P.RTH,3,N,from),diag=firstRun(k=>idx.d3[k]||idx.d4[k],P.DK,N,from);
  const lead=x=>(trip>=0&&x>=0&&x<=trip)?(trip-x)*dt:null;const L={alarm:lead(alarm),warn:lead(warn),diag:lead(diag)};const c=[L.alarm,L.warn,L.diag].filter(x=>x!==null);L.comb=c.length?Math.max(...c):null;
  const fired={alarm:alarm>=0,warn:warn>=0,diag:diag>=0};fired.comb=fired.alarm||fired.warn||fired.diag;
  return {a:{trip,tripJ,alarm,warn,diag},L,fired};
}
function diagnose(run,idx,P){
  const d=run.d,R=idx.res,N=d.TT01.length,dt=P.dt,K=Math.round(3/dt);
  const f=(c,k)=>firstRun(c,k||K,N,0);
  const cand=[['tt02',f(k=>R.rT[k]<-4)],['gasleak',f(k=>R.rG[k]>4)],['airloss',f(k=>R.rA[k]<-4)],['jam',f(k=>R.rF[k]<-4)],['rotor',f(k=>R.rM[k]<-4)],
   ['feedloss',f(k=>R.rI[k]<-4,Math.round(5/dt))],
   ['moisture',f(k=>R.rW[k]>4)]];
  // eng erta paydo bo'lgan belgi — asosiy sabab (himoya ishlagach paydo bo'ladigan ikkilamchi belgilar e'tiborga olinmaydi); vaqt teng bo'lsa ustuvorlik bo'yicha
  const pr=['tt02','gasleak','airloss','rotor','jam','feedloss','moisture'];
  let best=null;
  for(const [c,k] of cand){if(k<0)continue;if(!best||k<best.k||(k===best.k&&pr.indexOf(c)<pr.indexOf(best.code)))best={code:c,k}}
  return best||{code:'none',k:-1};
}

/* ===== Excel (.xlsx) o'qish va yozish — kutubxonasiz ===== */
const CRCT=(()=>{const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc32(u){let c=0xFFFFFFFF;for(let i=0;i<u.length;i++)c=CRCT[(c^u[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0}
function zipStore(files){
  const te=new TextEncoder(),parts=[],cen=[];let off=0;
  for(const f of files){
    const nm=te.encode(f.name),d=f.data,crc=crc32(d);
    const lh=new DataView(new ArrayBuffer(30));
    lh.setUint32(0,0x04034b50,true);lh.setUint16(4,20,true);lh.setUint16(6,0x0800,true);lh.setUint16(8,0,true);lh.setUint16(10,0,true);lh.setUint16(12,33,true);
    lh.setUint32(14,crc,true);lh.setUint32(18,d.length,true);lh.setUint32(22,d.length,true);lh.setUint16(26,nm.length,true);lh.setUint16(28,0,true);
    parts.push(new Uint8Array(lh.buffer),nm,d);
    const ch=new DataView(new ArrayBuffer(46));
    ch.setUint32(0,0x02014b50,true);ch.setUint16(4,20,true);ch.setUint16(6,20,true);ch.setUint16(8,0x0800,true);ch.setUint16(10,0,true);ch.setUint16(12,0,true);ch.setUint16(14,33,true);
    ch.setUint32(16,crc,true);ch.setUint32(20,d.length,true);ch.setUint32(24,d.length,true);ch.setUint16(28,nm.length,true);ch.setUint32(42,off,true);
    cen.push(new Uint8Array(ch.buffer),nm);
    off+=30+nm.length+d.length;
  }
  const cdSize=cen.reduce((a,b)=>a+b.length,0);
  const e=new DataView(new ArrayBuffer(22));e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,cdSize,true);e.setUint32(16,off,true);
  const all=[...parts,...cen,new Uint8Array(e.buffer)];const out=new Uint8Array(off+cdSize+22);let p=0;for(const a of all){out.set(a,p);p+=a.length}return out;
}
const xesc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function colName(i){let s='';i++;while(i>0){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26)}return s}
function buildXlsx(sheets){
  const te=new TextEncoder(),U=s=>te.encode(s);const H='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  const NS='xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
  const files=[];
  files.push({name:'[Content_Types].xml',data:U(H+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+sheets.map((s,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')+'</Types>')});
  files.push({name:'_rels/.rels',data:U(H+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')});
  files.push({name:'xl/workbook.xml',data:U(H+`<workbook ${NS} xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>`+sheets.map((s,i)=>`<sheet name="${xesc(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')+'</sheets></workbook>')});
  files.push({name:'xl/_rels/workbook.xml.rels',data:U(H+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sheets.map((s,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')+`<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`)});
  files.push({name:'xl/styles.xml',data:U(H+`<styleSheet ${NS}><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`)});
  sheets.forEach((s,i)=>{
    const nc=Math.max(...s.rows.map(r=>r.length));
    let x=H+`<worksheet ${NS}><cols><col min="1" max="${nc}" width="18" customWidth="1"/></cols><sheetData>`;
    s.rows.forEach((r,ri)=>{x+=`<row r="${ri+1}">`;r.forEach((v,ci)=>{
      const ref=colName(ci)+(ri+1),st=ri===0?' s="1"':'';
      if(typeof v==='number'&&isFinite(v))x+=`<c r="${ref}"${st}><v>${v}</v></c>`;
      else if(v!==''&&v!=null)x+=`<c r="${ref}"${st} t="inlineStr"><is><t>${xesc(v)}</t></is></c>`;
    });x+='</row>'});
    x+='</sheetData></worksheet>';files.push({name:`xl/worksheets/sheet${i+1}.xml`,data:U(x)});
  });
  return zipStore(files);
}
async function inflateRaw(u8){
  if(typeof DecompressionStream==='undefined')throw new Error('Brauzeringiz .xlsx o‘qishni qo‘llamaydi. Faylni CSV qilib saqlab yuklang.');
  const ds=new DecompressionStream('deflate-raw');const w=ds.writable.getWriter();w.write(u8);w.close();
  return new Uint8Array(await new Response(ds.readable).arrayBuffer());
}
async function unzip(buf){
  const u=new Uint8Array(buf),dv=new DataView(buf);let e=-1;
  for(let i=u.length-22;i>=Math.max(0,u.length-65600);i--){if(dv.getUint32(i,true)===0x06054b50){e=i;break}}
  if(e<0)throw new Error('Bu .xlsx fayl emas (yoki buzilgan).');
  const n=dv.getUint16(e+10,true);let p=dv.getUint32(e+16,true);const td=new TextDecoder(),out={};
  for(let i=0;i<n;i++){
    if(dv.getUint32(p,true)!==0x02014b50)break;
    const meth=dv.getUint16(p+10,true),cs=dv.getUint32(p+20,true),nl=dv.getUint16(p+28,true),xl=dv.getUint16(p+30,true),cl=dv.getUint16(p+32,true),lo=dv.getUint32(p+42,true);
    const name=td.decode(u.subarray(p+46,p+46+nl));p+=46+nl+xl+cl;
    if(!/^xl\/(worksheets\/sheet\d+\.xml|sharedStrings\.xml|workbook\.xml)$/.test(name))continue;
    const ln=dv.getUint16(lo+26,true),lx=dv.getUint16(lo+28,true),st=lo+30+ln+lx,raw=u.subarray(st,st+cs);
    out[name]=td.decode(meth===0?raw:await inflateRaw(raw));
  }
  return out;
}
async function readXlsx(buf){
  const z=await unzip(buf);const dp=new DOMParser();
  const sn=Object.keys(z).filter(k=>/worksheets\/sheet\d+\.xml/.test(k)).sort((a,b)=>parseInt(a.match(/\d+/g).pop())-parseInt(b.match(/\d+/g).pop()));
  if(!sn.length)throw new Error('Excel fayldan varaq topilmadi.');
  const ss=[];if(z['xl/sharedStrings.xml']){const d=dp.parseFromString(z['xl/sharedStrings.xml'],'application/xml');for(const si of d.getElementsByTagName('si'))ss.push([...si.getElementsByTagName('t')].map(t=>t.textContent).join(''))}
  const d=dp.parseFromString(z[sn[0]],'application/xml');const rows=[];
  for(const r of d.getElementsByTagName('row')){
    const row=[];
    for(const c of r.getElementsByTagName('c')){
      const ref=c.getAttribute('r')||'';const m=ref.match(/^([A-Z]+)/);let ci=0;if(m)for(const ch of m[1])ci=ci*26+ch.charCodeAt(0)-64;ci--;
      const t=c.getAttribute('t'),ve=c.getElementsByTagName('v')[0];let val='';
      if(t==='s'&&ve)val=ss[+ve.textContent]||'';else if(t==='inlineStr')val=[...c.getElementsByTagName('t')].map(x=>x.textContent).join('');else if(ve)val=ve.textContent;
      row[ci<0?row.length:ci]=String(val);
    }
    for(let i=0;i<row.length;i++)if(row[i]===undefined)row[i]='';
    if(row.some(x=>x!==''))rows.push(row);
  }
  return rows;
}
function download(name,u8,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([u8],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
