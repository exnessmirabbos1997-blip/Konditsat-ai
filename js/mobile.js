// ===== Mobil qulaylik: 3D asboblar paneli yig'iladi, taqqoslash paneli kichraytiriladi =====
(function(){
const $=id=>document.getElementById(id);
const mq=window.matchMedia?matchMedia('(max-width:700px)'):{matches:false,addEventListener(){}};
const bar=$('k3dBar'),menu=$('k3dMenu');
if(bar&&menu){menu.addEventListener('click',()=>{const o=bar.classList.toggle('open');menu.setAttribute('aria-expanded',o)});
  // kamera/rejim tugmasi bosilgach menyu yopiladi (mobil)
  bar.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&b!==menu&&mq.matches&&b.dataset.cam)bar.classList.remove('open')})}
const cmp=$('k3dCmp');
if(cmp){if(mq.matches)cmp.classList.add('min');
  cmp.addEventListener('click',e=>{if(e.target.closest('b')&&mq.matches)cmp.classList.toggle('min')})}
})();
