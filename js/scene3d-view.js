(function(){
let inited=false,failed=false,wrap,tip;
function fail(m){failed=true;const f=document.getElementById('k3dFall');if(f){f.style.display='flex';f.style.flexDirection='column';if(m){let d=f.querySelector('small');if(!d){d=document.createElement('small');d.style.cssText='display:block;margin-top:10px;font-size:11px;color:#8ea0b4;word-break:break-all;max-width:90%';f.appendChild(d)}d.textContent='Sabab: '+m}}}
function init(){if(inited||failed)return;wrap=document.getElementById('k3dWrap');tip=document.getElementById('k3dTip');
 let ok=false,ee='';try{ok=window.QScene&&QScene.init(wrap,document.getElementById('k3dCv'),tip)}catch(e){console.error(e);ee=String(e&&e.message||e)}
 if(!ok){fail(ee||(window.QScene&&QScene.err)||'');return}inited=true;try{const qs=document.getElementById('k3dQ');if(qs&&QScene.getQ)qs.value=String(QScene.getQ())}catch(e){}
 document.querySelectorAll('#k3dBar [data-cam]').forEach(b=>b.addEventListener('click',()=>QScene.setView(b.dataset.cam)));
 document.getElementById('k3dAuto').addEventListener('click',e=>{e.currentTarget.classList.toggle('on');QScene.setAuto(e.currentTarget.classList.contains('on'))});
 document.getElementById('k3dQ').addEventListener('change',e=>QScene.setQuality(+e.target.value));
 new ResizeObserver(()=>QScene.resize()).observe(wrap);}
function stt(){if(!cur)return null;const k=timeK(),run=cur.run,d=run.d,a=cur.e.a,id=cur.idx,c={d,k,P:cur.P},f=x=>isFinite(x)?x:0;
 const v={};['TT01','TT02','FT01','FT02','FT03','LT01','WT','AT01','AT02','U11','U12','U13','M01','M02','LAM','FIN'].forEach(n=>v[n]=f(d[n][k]));
 const al={};['TT01','TT02','LAM','LT01','AT02','M02','WT','M01'].forEach(n=>{try{al[n]=vmAlarm(n,c)}catch(e){al[n]=''}});
 const trip=a.trip>=0&&k>=a.trip,ev=a.tripJ>=0?EV[a.tripJ]:null;
 let msg='';try{const m=aiMsgs(k);if(m&&m.length)msg=String(m[0][1]).replace(/\s+/g,' ')}catch(e){}
 let fault='';if(id.d4[k]||id.d3[k]){const nm=['TT02 datchigi shubhali','gaz klapani 1-2','havo klapani 1-1','shnek / tarozi','aralashtirgich M02','konveyer 1 (massa)','balans'];fault='⚠ '+(id.rmax[k]>=4?nm[id.rarg[k]]||'balans buzildi':'balans buzildi')}
 return {v,al,on:!!(d.burner[k]&&d.FT01[k]>5),matOn:d.WT[k]>.3,conv:!!(d.conv[k]&&d.FIN[k]>.2),feeder:!!d.feeder[k],fanOn:!!(d.burner[k]||d.FT03[k]>100),
  trip,tripId:ev?ev.id:'',tripName:ev?ev.name:'',warn:a.warn>=0&&k>=a.warn&&!trip,R:f(id.R[k]),k,min:k*P.dt,msg,fault,trend:id.R,
  evs:EV.filter(e=>!e.hidden).map(e=>({n:e.id,A:e.A,T:e.T,up:!!e.up,val:e.v==='LAM'?(d.burner[k]?d.LAM[k]:NaN):d[e.v][k]}))}}
function push(){if(!inited||!document.getElementById('v-3d').classList.contains('on'))return;const s=stt();if(!s)return;QScene.update(s,{RTH:P.RTH});
 const i=document.getElementById('k3dInfo');if(i)i.textContent='TT01 '+s.v.TT01.toFixed(0)+' °C   |   TT02 '+s.v.TT02.toFixed(0)+' °C   |   λ '+(s.on?s.v.LAM.toFixed(2):'—')+'   |   bunker '+s.v.LT01.toFixed(0)+' %   |   namlik AT02 '+s.v.AT02.toFixed(1)+' %   |   AI R = '+s.R.toFixed(2)}
const _r=render;render=function(){_r.apply(this,arguments);push()};
const _s=showView;showView=function(v){_s.apply(this,arguments);const on=v==='3d';if(on){init();if(inited)QScene.setActive(true)}else if(inited)QScene.setActive(false);if(on)push()};
if((location.hash||'')==='#3d'){init();if(inited){QScene.setActive(true);push()}}
})();
