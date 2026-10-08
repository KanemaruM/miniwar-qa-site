
(() => {
  "use strict";
  const body=document.body;
  const engine=body.dataset.engine;
  const poem=body.dataset.poem;
  const stage=document.querySelector(".art-stage");
  const field=document.querySelector(".letter-field");
  const pauseBtn=document.querySelector("#pause");
  const readBtn=document.querySelector("#read");
  const againBtn=document.querySelector("#again");
  const shareBtn=document.querySelector("#share");
  const motionPreference=matchMedia("(prefers-reduced-motion: reduce)");
  if(!poem||!stage||!field)return;

  const chars=Array.from(poem);
  const el=chars.map(c=>{
    const glyph=document.createElement("span");
    glyph.className="letter";
    glyph.textContent=c;
    glyph.setAttribute("aria-hidden","true");
    field.appendChild(glyph);
    return glyph;
  });
  let ghosts=[];
  if(engine==="fire"){
    for(let k=0;k<2;k++){
      ghosts.push(chars.map(c=>{
        const glyph=document.createElement("span");
        glyph.className="letter ghost";
        glyph.setAttribute("aria-hidden","true");
        glyph.textContent=c;
        field.appendChild(glyph);
        return glyph;
      }));
    }
  }
  const period={frill:29,road:31,wheel:33,fire:31}[engine]||30;
  let time=0,lastTime=0,paused=false,straight=motionPreference.matches;
  let W=0,H=0,S=0,advance=0,vertical=false,centerX=0,centerY=0;
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
  const rise=(t,a,b)=>smooth((t-a)/(b-a));
  const envelope=(t,a,b,c,d)=>rise(t,a,b)*(1-rise(t,c,d));
  const mix=(a,b,p)=>a+(b-a)*p;
  const wordStart=w=>poem.indexOf(w);
  const axes=()=>({
    line:(i)=>({x:vertical?0:(i-(chars.length-1)/2)*advance,y:vertical?(i-(chars.length-1)/2)*advance:0,r:0,s:1,a:1}),
    len:vertical?H:W,
  });

  function measure(){
    W=stage.clientWidth;H=stage.clientHeight;
    vertical=window.innerWidth<=700;
    const extent=vertical?H:W;
    S=clamp((extent-(vertical?66:100))/(chars.length*1.23),14,vertical?33:54);
    advance=S*1.22;
    centerX=W/2;
    centerY=H/2;
    const side=S*1.2;
    [...el,...ghosts.flat()].forEach(node=>{
      node.style.fontSize=S+"px";
      node.style.width=side+"px";
      node.style.height=side+"px";
    });
    render();
  }

  function place(node,p,ghost=false){
    const x=centerX+p.x-S*.6;
    const y=centerY+p.y-S*.6;
    node.style.transform="translate3d("+x.toFixed(2)+"px,"+y.toFixed(2)+"px,0) rotate("+(p.r||0).toFixed(2)+"deg) scale("+(p.s||1).toFixed(3)+")";
    node.style.opacity=clamp(p.a===undefined?1:p.a,0,1).toFixed(3);
    if(engine==="fire"){
      node.style.color=p.c||(ghost?"#b34c38":"#262b9f");
      node.style.textShadow=p.shadow||"none";
    }
  }

  function frill(i,base,t){
    const k=envelope(t,2.6,9.4,17,26.2);
    const phrase=wordStart("フリル");
    const proximity=Math.exp(-Math.pow((i-(phrase+1.4))/6.8,2));
    const fold=Math.sin(i*1.48-t*.42);
    const twist=Math.sin(i*.78+t*.26);
    const amplitude=(vertical?W*.15:H*.18)*k*(.38+.65*proximity);
    const p={...base};
    if(vertical){
      p.x+=amplitude*(.74*fold+.26*twist);
      p.y+=k*S*.18*Math.cos(i*2.1-t*.25);
    }else{
      p.y+=amplitude*(.74*fold+.26*twist);
      p.x+=k*S*.21*Math.cos(i*2.1-t*.25);
    }
    p.r=k*(17*fold+7*twist);
    // The frill forms a crease at its three original letters.
    if(i>=phrase&&i<phrase+3){
      const pinch=(i-phrase-1)*S*.31*k;
      if(vertical)p.y-=pinch;else p.x-=pinch;
      p.r+=k*(i-phrase-1)*-12;
    }
    return p;
  }

  function road(i,base,t){
    const k=envelope(t,2.2,10.5,22,29.0);
    const arrival=envelope(t,12,18,21.5,29);
    const u=(i+.5)/chars.length;
    const path=Math.sin(Math.PI*u*2.08)+.28*Math.sin(Math.PI*u*4.16);
    const p={...base};
    if(vertical){
      p.x+=W*.205*k*path;
      p.y-=S*.24*k*Math.sin(Math.PI*u*2);
    }else{
      p.y+=H*.245*k*path;
      p.x+=S*.15*k*Math.sin(Math.PI*u*2);
    }
    p.r+=k*19*Math.cos(Math.PI*u*2.08);
    const dog=wordStart("犬");
    if(i>=dog){
      const local=(i-dog)/Math.max(1,chars.length-dog-1);
      p.s=1+arrival*(.12+.5*local);
      const approach=(.4+.6*local)*arrival;
      if(vertical){p.x+=W*.16*approach;p.y-=S*.15*approach;}
      else {p.y-=H*.13*approach;p.x+=S*.2*approach;}
    }
    return p;
  }

  function wheel(i,base,t){
    const n=chars.length;
    const radius=Math.min(W*.285,H*.29,195);
    const build=rise(t,2.8+i*.09,10.2+i*.055);
    const release=1-rise(t,23.6,30.0);
    const k=build*release;
    const turn=rise(t,9.2,14.7)*.68;
    const angle=-Math.PI/2+(2*Math.PI*i/n)+turn;
    const top={x:Math.cos(angle)*radius,y:Math.sin(angle)*radius,
      r:((angle+Math.PI/2)*180/Math.PI)*.20,s:1,a:1};
    const p={x:mix(base.x,top.x,k),y:mix(base.y,top.y,k),r:mix(0,top.r,k),s:1,a:1};
    const collapse=envelope(t,15.2+i*.06,20.7+i*.02,23.0,29.0);
    const down=clamp(top.y+H*.39+Math.abs(Math.sin(i*2.41))*H*.10,-H*.3,H*.39);
    p.x=mix(p.x,top.x+Math.sin(i*5.6)*W*.135,collapse);
    p.y=mix(p.y,down,collapse);
    p.r+=collapse*(24+Math.sin(i*4.6)*46);
    p.a=1-collapse*.16;
    return p;
  }

  function fire(i,base,t){
    const ignitionStart=wordStart("火");
    const ignitionEnd=wordStart("プリクラ");
    const ignite=envelope(t,5+i*.085,10+i*.05,19,28.5);
    const heat=envelope(t,8.7,12.5,20,29.0);
    const flash=Math.max(0,1-Math.abs(t-12.5)/.74);
    const p={...base};
    const within=i>=ignitionStart&&i<ignitionEnd;
    const photo=i>=ignitionEnd;
    if(within){
      p.r+=(i%2?1:-1)*ignite*8;
      p.s+=ignite*.075;
      const lift=Math.sin(i*1.3+t*.52)*S*.26*ignite;
      if(vertical)p.x+=lift;else p.y+=lift;
      const warmth=clamp(ignite*.85+heat*.1,0,1);
      p.c="rgb("+Math.round(mix(38,184,warmth))+","+Math.round(mix(43,69,warmth))+","+Math.round(mix(159,42,warmth))+")";
      p.shadow="0 0 "+(heat*15).toFixed(1)+"px rgba(193,71,38,"+(heat*.31).toFixed(2)+")";
    }else if(photo){
      p.s+=heat*.20;
      const offset=heat*S*.46;
      if(vertical)p.x+=offset;else p.y+=offset;
      p.shadow="2px -2px 0 rgba(210,87,54,"+(heat*.43).toFixed(2)+")";
    }
    if(flash>.01){
      p.c="rgb("+Math.round(mix(within?184:38,254,flash))+","+Math.round(mix(within?69:43,248,flash))+","+Math.round(mix(within?42:159,237,flash))+")";
    }
    return p;
  }

  function render(){
    if(!W||!H)return;
    const t=time%period;
    const line=axes().line;
    for(let i=0;i<chars.length;i++){
      let p=line(i);
      if(!straight){
        if(engine==="frill")p=frill(i,p,t);
        if(engine==="road")p=road(i,p,t);
        if(engine==="wheel")p=wheel(i,p,t);
        if(engine==="fire")p=fire(i,p,t);
      }
      place(el[i],p);
    }
    if(engine==="fire"){
      const glow=straight?0:Math.max(0,1-Math.abs(t-12.5)/.85);
      const v=Math.round(mix(249,255,glow));
      const g=Math.round(mix(249,250,glow));
      const b=Math.round(mix(247,231,glow));
      stage.style.backgroundColor="rgb("+v+","+g+","+b+")";
      ghosts.forEach((layer,k)=>{
        const echo=straight?0:envelope(t,12.4+k*.6,14.7+k*.5,22.0+k*.6,29.8);
        layer.forEach((node,i)=>{
          const q=line(i);
          if(vertical){q.x+=(k?1:-1)*(19+k*12);q.y+=(k?1:-1)*(13+k*6);}
          else {q.x+=(k?1:-1)*(28+k*17);q.y+=(k?1:-1)*(13+k*7);}
          q.a=echo*(k?.22:.16);
          q.s=.96;
          q.c=k?"#d05e43":"#262b9f";
          place(node,q,true);
        });
      });
    }
  }
  function sync(){
    pauseBtn.textContent=paused?"動きを再開":"動きをとめる";
    pauseBtn.hidden=straight;
    pauseBtn.setAttribute("aria-pressed",String(paused));
    readBtn.textContent=straight?"動きに戻る":"まっすぐ読む";
    readBtn.setAttribute("aria-pressed",String(straight));
  }
  function frame(now){
    if(lastTime&&!paused&&!straight&&!document.hidden)time+=(now-lastTime)/1000;
    lastTime=now;
    if(!paused)render();
    requestAnimationFrame(frame);
  }
  pauseBtn.addEventListener("click",()=>{paused=!paused;sync();render()});
  readBtn.addEventListener("click",()=>{straight=!straight;paused=false;time=0;sync();render()});
  againBtn.addEventListener("click",()=>{time=0;paused=false;straight=false;sync();render()});
  shareBtn.addEventListener("click",async()=>{
    try{
      if(navigator.share)await navigator.share({title:document.title,url:location.href});
      else if(navigator.clipboard){await navigator.clipboard.writeText(location.href);shareBtn.textContent="コピーしました";setTimeout(()=>shareBtn.textContent="共有する",1800)}
    }catch(e){}
  });
  document.addEventListener("visibilitychange",()=>{lastTime=0});
  motionPreference.addEventListener("change",e=>{straight=e.matches;paused=false;time=0;sync();render()});
  if(window.ResizeObserver)new ResizeObserver(measure).observe(stage);
  else window.addEventListener("resize",measure);
  document.documentElement.classList.add("motion-ready");
  measure();sync();requestAnimationFrame(frame);
})();
