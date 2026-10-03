// Modelni (js/config.js + js/sim.js) brauzersiz, Node ichida yuklaydi.
const vm=require('vm'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const ctx=vm.createContext({console,TextEncoder,TextDecoder,Math});
for(const f of ['js/config.js','js/sim.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
module.exports=vm.runInContext(`({CONFIG,KINDS,FAULTS,TRUTH,EV,plantDefaults,rngMake,runPlant,residuals,features,trainModel,computeIndex,analyseRun,diagnose})`,ctx);
module.exports.root=root;
