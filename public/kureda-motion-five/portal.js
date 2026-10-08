// The portal intentionally avoids third-party scripts and external assets.
for(const card of document.querySelectorAll('.work-card')){
 card.addEventListener('pointermove',event=>{
   if(event.pointerType!=='mouse')return;
   const area=card.querySelector('.preview-inner');
   const r=card.getBoundingClientRect();
   const x=((event.clientX-r.left)/r.width-.5)*14;
   const y=((event.clientY-r.top)/r.height-.5)*9;
   area.style.setProperty('filter',`drop-shadow(${x*.3}px ${y*.3}px 19px rgba(156,173,255,.20))`);
 });
 card.addEventListener('pointerleave',()=>card.querySelector('.preview-inner').style.removeProperty('filter'));
}
