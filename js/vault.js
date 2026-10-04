// ===== Parol bilan himoyalangan ombor: haqiqiy teglar AES-256-GCM bilan shifrlangan, kalit PBKDF2-SHA256 dan olinadi =====
// Parolsiz ochib bo'lmaydi: repoda faqat shifrlangan matn turadi. Brauzerda ham, Node'da ham (testlar uchun) ishlaydi.
(function(root){
const C=root.crypto,te=new TextEncoder(),td=new TextDecoder(),ITER=310000;
const b64=u=>{let s='';for(const x of u)s+=String.fromCharCode(x);return btoa(s)},ub64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const valid=b=>!!b&&b.v===1&&Number.isInteger(b.i)&&b.i>=1e4&&b.i<=1e6&&['s','n','c'].every(k=>typeof b[k]==='string'&&b[k].length<200000);
async function key(pw,salt,iter){const m=await C.subtle.importKey('raw',te.encode(pw),'PBKDF2',false,['deriveKey']);
  return C.subtle.deriveKey({name:'PBKDF2',salt,iterations:iter,hash:'SHA-256'},m,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
async function seal(obj,pw){const salt=C.getRandomValues(new Uint8Array(16)),iv=C.getRandomValues(new Uint8Array(12)),k=await key(pw,salt,ITER);
  const c=new Uint8Array(await C.subtle.encrypt({name:'AES-GCM',iv},k,te.encode(JSON.stringify(obj))));return {v:1,i:ITER,s:b64(salt),n:b64(iv),c:b64(c)}}
async function open(box,pw){if(!valid(box)||typeof pw!=='string'||!pw)return null;
  try{const k=await key(pw,ub64(box.s),box.i);return JSON.parse(td.decode(await C.subtle.decrypt({name:'AES-GCM',iv:ub64(box.n)},k,ub64(box.c))))}catch(e){return null}}
const V={seal,open,valid,available:()=>!!(C&&C.subtle)};
if(typeof module!=='undefined'&&module.exports)module.exports=V;else root.Vault=V;
})(typeof window!=='undefined'?window:globalThis);
