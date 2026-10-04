// ===== Hisobotni ko'rish oynasi: avval ko'rinadi, keyin "Chop etish" yoki "PDF sifatida saqlash" (haqiqiy .pdf fayl, kutubxonasiz) =====
(function(){
const $=id=>document.getElementById(id),T=s=>window.tr?window.tr(s):s;
let dlg=null,cur='';
function build(){
  dlg=document.createElement('dialog');dlg.id='rpDlg';dlg.setAttribute('aria-labelledby','rpT');
  dlg.innerHTML='<div class="rpH"><h2 id="rpT" class="sh" style="margin:0"></h2><div class="btns" style="margin:0"><button type="button" id="rpPrint"></button><button type="button" id="rpPdf"></button><button type="button" class="sec" id="rpClose"></button></div></div><p class="note" id="rpMsg" role="status" style="margin:6px 0"></p><iframe id="rpFr" title="Hisobot" style="width:100%;flex:1;min-height:0;border:1px solid var(--line);border-radius:6px;background:#fff"></iframe>';
  document.body.appendChild(dlg);
  $('rpClose').onclick=()=>dlg.close();
  $('rpPrint').onclick=()=>{try{const w=$('rpFr').contentWindow;w.focus();w.print()}catch(e){$('rpMsg').textContent=T('Chop etib bo‘lmadi: ')+e.message}};
  $('rpPdf').onclick=async()=>{const m=$('rpMsg');m.textContent=T('PDF tayyorlanmoqda…');try{const u=await toPdf(cur);const b=new Blob([u],{type:'application/pdf'}),a=document.createElement('a');
    a.href=URL.createObjectURL(b);a.download='hisobot.pdf';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000);m.textContent=T('PDF saqlandi: hisobot.pdf')}catch(e){m.textContent=T('PDF yaratib bo‘lmadi: ')+e.message}}}
function open(html){if(!dlg)build();cur=html;$('rpT').textContent=T('Hisobotni ko‘rish');$('rpPrint').textContent=T('🖨 Chop etish');$('rpPdf').textContent=T('💾 PDF sifatida saqlash');$('rpClose').textContent=T('Yopish');
  $('rpMsg').textContent=T('Hisobotni ko‘rib chiqing; keyin chop eting yoki PDF sifatida saqlang.');$('rpFr').srcdoc=html;if(!dlg.open)dlg.showModal()}
// ---- minimal PDF yozuvchisi (A4, Helvetica, JPEG rasmlar) ----
const W=595,H=842,M=40,CW=W-2*M,enc=new TextEncoder();
const MAP={'‘':'\x91','’':'\x92','“':'\x93','”':'\x94','—':'\x97','–':'\x96','°':'\xB0','³':'\xB3','²':'\xB2','·':'\xB7','×':'\xD7','λ':'lambda','≥':'>=','≤':'<=','↔':'<->','→':'->','₁':'1','₂':'2','₃':'3','₄':'4','●':'*','○':'o','↻':'','⏪':''};
const win=s=>{let o='';for(const ch of String(s)){if(MAP[ch]!==undefined)o+=MAP[ch];else{const c=ch.charCodeAt(0);o+=c<256?ch:'?'}}return o};
const lat1=s=>{const u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i)&255;return u};
const esc=s=>s.replace(/[\\()]/g,m=>'\\'+m);
const cat=a=>{let n=0;for(const x of a)n+=x.length;const o=new Uint8Array(n);let p=0;for(const x of a){o.set(x,p);p+=x.length}return o};
function wrap(txt,size,w,bold){const k=size*(bold?0.58:0.53),mx=Math.max(8,Math.floor(w/k)),out=[];for(const para of win(txt).split('\n')){let l='';for(const word of para.split(/\s+/).filter(Boolean)){
  let wd=word;while(wd.length>mx){if(l){out.push(l);l=''}out.push(wd.slice(0,mx));wd=wd.slice(mx)}
  if((l?l+' '+wd:wd).length>mx){out.push(l);l=wd}else l=l?l+' '+wd:wd}out.push(l)}return out}
function loadImg(src){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error('rasm'));i.src=src})}
async function jpeg(src){const i=await loadImg(src),c=document.createElement('canvas');c.width=i.naturalWidth;c.height=i.naturalHeight;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(i,0,0);
  const d=atob(c.toDataURL('image/jpeg',.88).split(',')[1]),u=new Uint8Array(d.length);for(let k=0;k<d.length;k++)u[k]=d.charCodeAt(k);return {u,w:c.width,h:c.height}}
async function toPdf(html){
  const doc=new DOMParser().parseFromString(html,'text/html'),pages=[],imgs=[];let ops=[],y=H-M;
  const newPage=()=>{pages.push({ops:ops.join('\n'),im:ops.im||[]});ops=[];ops.im=[];y=H-M};ops.im=[];
  const need=h=>{if(y-h<M)newPage()};
  const text=(s,x,yy,size,bold)=>ops.push('BT /F'+(bold?2:1)+' '+size+' Tf '+x.toFixed(1)+' '+yy.toFixed(1)+' Td ('+esc(s)+') Tj ET');
  const para=(t,size,bold,gap)=>{for(const l of wrap(t,size,CW,bold)){need(size+3);y-=size+3;text(l,M,y,size,bold)}y-=gap||0};
  for(const el of doc.body.children){const tag=el.tagName;
    if(tag==='H1'){para(el.textContent,18,1,8)}
    else if(tag==='H2'){y-=6;need(el.nextElementSibling&&el.nextElementSibling.tagName==='IMG'?200:40);para(el.textContent,13,1,2);ops.push(M+' '+(y-1).toFixed(1)+' m '+(W-M)+' '+(y-1).toFixed(1)+' l 0.6 G S');y-=4}
    else if(tag==='P'){const c=el.cloneNode(true);c.querySelectorAll('br').forEach(b=>b.replaceWith('\n'));para(c.textContent.replace(/[ \t]*\n[ \t]*/g,'\n').trim(),10,0,5)}
    else if(tag==='TABLE'){for(const tr of el.rows){const cells=[...tr.cells].map(c=>c.textContent.trim()),n=cells.length||1,w=n===2?[CW*0.62,CW*0.38]:Array(n).fill(CW/n),hd=tr.cells[0]&&tr.cells[0].tagName==='TH';
        const lines=cells.map((c,i)=>wrap(c,9.5,w[i]-8,hd)),rows=Math.max(1,...lines.map(l=>l.length)),rh=rows*12+6;need(rh);let x=M;
        for(let i=0;i<n;i++){ops.push(x.toFixed(1)+' '+(y-rh).toFixed(1)+' '+w[i].toFixed(1)+' '+rh+' re '+(hd?'0.92 g f 0 g ':'')+'0.5 G S');lines[i].forEach((l,j)=>text(l,x+4,y-10-j*12,9.5,hd));x+=w[i]}y-=rh}y-=8}
    else if(tag==='IMG'){try{const im=await jpeg(el.getAttribute('src')),w=Math.min(CW,im.w),h=w*im.h/im.w,hh=Math.min(h,H-2*M),ww=hh*im.w/im.h;need(hh+6);const id=imgs.length;imgs.push(im);ops.im.push(id);ops.push('q '+ww.toFixed(1)+' 0 0 '+hh.toFixed(1)+' '+M+' '+(y-hh).toFixed(1)+' cm /Im'+id+' Do Q');y-=hh+8}catch(e){para('[rasm yuklanmadi]',9,0,4)}}
    else{const t=el.textContent.trim();if(t)para(t,10,0,4)}}
  newPage();
  // obyektlar: 1 Catalog, 2 Pages, 3 F1, 4 F2, 5.. rasmlar, so'ng har sahifa uchun (sahifa, kontent)
  const objs=[],add=b=>{objs.push(b);return objs.length};
  add(lat1('<< /Type /Catalog /Pages 2 0 R >>'));add(null);add(lat1('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'));add(lat1('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'));
  const imgObj=imgs.map(im=>add(cat([lat1('<< /Type /XObject /Subtype /Image /Width '+im.w+' /Height '+im.h+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+im.u.length+' >>\nstream\n'),im.u,lat1('\nendstream')])));
  const kids=[];
  pages.forEach((pg,i)=>{const body=lat1(pg.ops+'\nBT /F1 8 Tf '+(W/2-10)+' 22 Td ('+(i+1)+' / '+pages.length+') Tj ET'),pageNo=objs.length+1;
    kids.push(pageNo);add(lat1('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+W+' '+H+'] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << '+pg.im.map(k=>'/Im'+k+' '+imgObj[k]+' 0 R').join(' ')+' >> >> /Contents '+(pageNo+1)+' 0 R >>'));
    add(cat([lat1('<< /Length '+body.length+' >>\nstream\n'),body,lat1('\nendstream')]))});
  objs[1]=lat1('<< /Type /Pages /Kids ['+kids.map(k=>k+' 0 R').join(' ')+'] /Count '+kids.length+' >>');
  const parts=[lat1('%PDF-1.4\n')],off=[];let pos=parts[0].length;
  objs.forEach((o,i)=>{off.push(pos);const a=lat1((i+1)+' 0 obj\n'),b=lat1('\nendobj\n');parts.push(a,o,b);pos+=a.length+o.length+b.length});
  let x='xref\n0 '+(objs.length+1)+'\n0000000000 65535 f \n';off.forEach(o=>x+=String(o).padStart(10,'0')+' 00000 n \n');
  parts.push(lat1(x+'trailer\n<< /Size '+(objs.length+1)+' /Root 1 0 R >>\nstartxref\n'+pos+'\n%%EOF'));return cat(parts)}
window.Report={open,toPdf};
})();
