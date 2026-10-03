// ===== Yagona sozlamalar manbai: jarayon parametrlari (taxminiy — real qurilma ma'lumotiga almashtiriladi) =====
// Birliklar: oqim — m3/soat (gaz, havo) va t/soat (material); harorat — °C; vaqt — daqiqa; issiqlik — kJ.
const CONFIG={
  plant:{
    Qg_max:400,Qa1_max:4500,Qa2_max:12000,   // maksimal gaz / birlamchi / ikkilamchi havo sarfi, m3/soat
    LHV:34000,Lst:9.5,lam:1.15,eta:0.50,cpg:1.45,T0:20,   // kJ/m3; m3 havo / m3 gaz; nominal lambda; gorelka FIK; kJ/(m3*K); °C
    sp:350,Kp:0.10,Ti:4,u3:55,Mb:30,Tdry:2,Tlow:3,
    Ffeed_max:10.5,uM01:67,uM02:75,Fin:7.0,win:18,kap:0.92,Tout:120,
    tauF:4,tauD:1.5,tauP:6,delayP:3,beta:1.88,
    noise:1,sev:0,
    w:[0.20,0.50,0.15,0.15],RTH:0.45,Th:30,Tresp:5,D3:0.9,DK:6,nTrain:30,nTrees:100,sub:256
  },
  step:{dtMin:1/6,n:1440}   // 10 s qadam, 4 soat
};
if(typeof module!=='undefined')module.exports=CONFIG;
