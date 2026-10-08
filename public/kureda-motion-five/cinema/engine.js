import {works,getWork} from './data.js';
import {LightField} from './shader.js';

const work=getWork(document.body.dataset.work);
if(!work)throw new Error('Unknown work');
const $=(s)=>document.querySelector(s);
const stage=$('.screen');
const glCanvas=$('#lightfield');
const inkCanvas=$('#inkfield');
const ctx=inkCanvas.getContext('2d',{alpha:true,desynchronized:true});
const gpu=new LightField(glCanvas,work);
const txt=[...work.poem];
const n=txt.length;
const C={white:'#f2f1f1',blue:'#b3bbff',rose:'#ffd5e0',teal:'#b6f5ee',gold:'#ffe0a8',lilac:'#f0d7ff'};
const tint={joint:C.blue,frill:C.rose,road:C.teal,wheel:C.gold,future:C.lilac};
const ink=tint[work.slug];
const accent={joint:'#e9eaff',frill:'#ff718b',road:'#7effdb',wheel:'#ffb473',future:'#ffaadf'}[work.slug];
const fpsRate=1000/60;
let W=0,H=0,dpr=1,vertical=false,fontSize=30,spacing=37,center={x:0,y:0},frameHistory=[];
let nowT=0,prevTime=0,paused=false,still=matchMedia('(prefers-reduced-motion: reduce)').matches,
    pointer={x:0,y:0},timelineActive=false,lastChapter=-1;
let lastDisplayT=-1;
const duration=work.duration;
const chapterRanges=[0,duration*.18,duration*.40,duration*.63,duration*.81,duration];
const clip=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,k)=>a+(b-a)*k;
const smooth=x=>{x=clip(x,0,1);return x*x*(3-2*x)};
const ramp=(t,a,b)=>smooth((t-a)/(b-a));
const bump=(t,a,b,c,d)=>ramp(t,a,b)*(1-ramp(t,c,d));
const tri=(t,a,b,c)=>Math.min(ramp(t,a,b),1-ramp(t,b,c));
const fract=x=>x-Math.floor(x);
const noise=(i,k=0)=>fract(Math.sin((i+1)*127.1+(k+1)*311.7)*43758.5453);
const mapPolar=(r,angle)=>({x:r*Math.cos(angle),y:r*Math.sin(angle)});
const rgba=(hex,a)=>{const h=hex.replace('#','');return `rgba(${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)},${a})`};

function setup(){
  W=stage.clientWidth;H=stage.clientHeight;vertical=W<720;
  dpr=Math.min(window.devicePixelRatio||1,window.innerWidth<680?1.65:1.95);
  inkCanvas.width=Math.round(W*dpr);inkCanvas.height=Math.round(H*dpr);
  inkCanvas.style.width=W+'px';inkCanvas.style.height=H+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
  center={x:W*.5,y:H*(vertical?.49:.51)};
  const maxSpan=vertical?H*.62:W*.79;
  fontSize=clip(maxSpan/(n*1.21),vertical?19:24,vertical?41:73);
  spacing=Math.min(fontSize*1.21,maxSpan/(n-1));
  gpu.resize();draw(nowT);
}

function getCamera(t,strength=0){
 const yaw=pointer.x*.06*strength+Math.sin(t*.21)*.10*strength;
 const pitch=pointer.y*.045*strength+Math.sin(t*.13)*.044*strength;
 const dolly=1+strength*(.045*Math.sin(t*.19));
 return {yaw,pitch,dolly};
}
function cameraPt(p,cam){
 const z=p.z||0;
 const cy=Math.cos(cam.yaw),sy=Math.sin(cam.yaw),cp=Math.cos(cam.pitch),sp=Math.sin(cam.pitch);
 let x=p.x*cy+z*sy;
 let zz=z*cy-p.x*sy;
 let y=p.y*cp-zz*sp;
 zz=zz*cp+p.y*sp;
 let ratio=clip((850/(850+zz))*cam.dolly,.37,2.85);
 return {x:center.x+x*ratio,y:center.y+y*ratio,s:ratio,a:p.a??1,r:p.r||0,z:zz};
}
function original(i){return {x:vertical?0:(i-(n-1)*.5)*spacing,y:vertical?(i-(n-1)*.5)*spacing:0,z:0,r:0,a:1,scale:1,hot:0};}
function normalized(arr){
 let mx=arr.reduce((sum,p)=>sum+p.x,0)/arr.length;
 let my=arr.reduce((sum,p)=>sum+p.y,0)/arr.length;
 let maxX=0,maxY=0;
 arr.forEach(p=>{p.x-=mx;p.y-=my;maxX=Math.max(maxX,Math.abs(p.x));maxY=Math.max(maxY,Math.abs(p.y));});
 const scale=Math.min(1,(W*.43)/(maxX+fontSize*.7),(H*.34)/(maxY+fontSize*.7));
 if(scale<1)arr.forEach(p=>{p.x*=scale;p.y*=scale;p.scale*=Math.max(.8,scale)});
 return arr;
}

function joint(t){
 const e=bump(t,2.7,8.5,24.4,32.3);
 const peak=bump(t,9.5,15.1,19.8,26.5);
 const ang0=Math.sin(t*.43)*.23;
 const hinges=[0,.87*Math.sin(t*.24+.2),-1.42*Math.sin(t*.29+.55),1.18*Math.sin(t*.31-.8)];
 let path=[],head={x:0,y:0},theta=0;
 for(let i=0;i<n;i++){
  if(i===3)theta+=hinges[1]*e;
  if(i===7)theta+=hinges[2]*e;
  if(i===12)theta+=hinges[3]*e;
  if(i>0){
   const angle=theta+ang0*e;
   head.x+=Math.sin(angle)*spacing;
   head.y+=Math.cos(angle)*spacing;
  }
  path.push({x:head.x,y:head.y,rot:-(theta+ang0*e)});
 }
 const min=path[0],max=path.at(-1),mid={x:(min.x+max.x)/2,y:(min.y+max.y)/2};
 let out=path.map((p,i)=>{
   let sx=p.x-mid.x,sy=p.y-mid.y;
   if(!vertical){const swapX=sy;sy=-sx;sx=swapX;}
   const orig=original(i);
   const wrap=peak*Math.sin(i*.94+t*.41);
   const spiral=peak*W*.125;
   return {
    ...orig,
    x:lerp(orig.x,sx,e)+Math.sin(i*1.25+t*.48)*spiral*.19,
    y:lerp(orig.y,sy,e)+Math.cos(i*.83+t*.42)*spiral*.11,
    z:140*Math.sin(i/n*Math.PI*3+t*.47)*e+90*wrap,
    r:e*p.rot*180/Math.PI+(vertical?0:90*e)*.35,
    scale:1+.16*peak*Math.sin(i*.8+t*.5),
    hot:e*(.2+.8*(i>=3&&i<=12?1:0)),
   };
 });
 return normalized(out);
}
function frill(t){
 const fold=bump(t,2.9,8.7,22.7,30.1);
 const exposure=bump(t,13,17,22.3,29);
 const start=work.poem.indexOf('フリル');
 const focus=start+1;
 const out=txt.map((_,i)=>{
   const p=original(i),u=i/(n-1),local=Math.exp(-(((i-focus)/7)**2)),
   angle=i*1.51-t*.34,wing=Math.sin(angle),lip=Math.cos(angle);
   const amp=(vertical?W*.32:H*.23)*fold*(.42+.66*local);
   if(vertical){p.x+=amp*wing;p.y+=fold*fontSize*.16*Math.sin(angle*2.0);}
   else{p.y+=amp*wing;p.x+=fold*fontSize*.16*Math.sin(angle*2.0);}
   p.z=lip*170*fold+40*Math.sin(u*5+t*.25)*exposure;
   p.r=wing*fold*35+exposure*Math.sin(i*1.7)*14;
   p.scale=1+fold*.10*lip+exposure*.29*local;
   p.hot=fold*local;
   return p;
 });
 return normalized(out);
}
function road(t){
 const bend=bump(t,2.5,8.5,24.8,29.5),approach=bump(t,11,16.0,23,28.3);
 const dog=work.poem.indexOf('犬');
 return normalized(txt.map((_,i)=>{
  const p=original(i),u=i/(n-1),curl=Math.sin(u*Math.PI*2.10+t*.13)*.88+.32*Math.sin(u*Math.PI*3.8-t*.1);
  const sideways=bend*(vertical?W*.31:H*.24)*curl;
  if(vertical){p.x+=sideways;p.y+=bend*fontSize*.10*Math.sin(u*12+t*.7)}
  else{p.y+=sideways;p.x+=bend*fontSize*.10*Math.sin(u*12+t*.7)}
  p.z=bend*(290-570*u)+approach*(i>=dog?-270:80);
  p.r=bend*(vertical?1:-1)*30*Math.cos(u*8.1+t*.1);
  if(i>=dog){p.scale+=approach*(.46+(i-dog)*.08);p.hot=approach*.92;}
  else {p.a=1-approach*.27;}
  return p;
 }));
}
function wheel(t){
 const rad=Math.min(W*.32,H*.31,vertical?140:245);
 const turn=bump(t,8.0,11.0,20.1,24.0)*1.75+t*.012;
 const out=txt.map((_,i)=>{
  const p=original(i),u=i/n,angle=-Math.PI*.5+Math.PI*2*u+turn;
  const build=ramp(t,2.8+i*.12,9.8+i*.15);
  const collapse=ramp(t,18.2+i*.083,22.9+i*.07);
  const rejoin=ramp(t,26.6,33.5);
  const circle={x:Math.cos(angle)*rad,y:Math.sin(angle)*rad};
  const fall=collapse*(1-rejoin);
  p.x=lerp(p.x,circle.x,build*(1-rejoin));
  p.y=lerp(p.y,circle.y,build*(1-rejoin));
  p.r=build*(1-rejoin)*((angle+Math.PI*.5)*180/Math.PI*.48);
  const kickX=(noise(i,2)-.5)*W*.34;
  const kickY=(noise(i,3)-.2)*H*.56+H*.2*collapse;
  p.x+=fall*kickX;
  p.y+=fall*kickY;
  p.z=fall*(noise(i,4)-.5)*240;
  p.r+=fall*(noise(i,5)-.5)*480;
  p.a=1-fall*.12;p.hot=build*(1-collapse)*.5+fall*.8;
  return p;
 });
 return normalized(out);
}
function future(t){
 const fracture=bump(t,5.2,10.2,19.9,25.5);
 const burnt=bump(t,14.2,16.1,25.4,31.2);
 const flash=Math.pow(Math.max(0,1-Math.abs(t-14.95)/.64),2)+.40*Math.pow(Math.max(0,1-Math.abs(t-18.1)/.30),2);
 const out=txt.map((_,i)=>{
   const p=original(i),v=Math.sin(i*1.7+t*1.12),horizontal=vertical?W*.1:H*.11;
   if(vertical)p.x+=fracture*horizontal*v+burnt*(noise(i,6)-.5)*W*.07;
   else p.y+=fracture*horizontal*v+burnt*(noise(i,6)-.5)*H*.055;
   p.z=fracture*Math.cos(i*.89+t*.53)*190;
   p.r=fracture*v*14+burnt*(noise(i,8)-.5)*21;
   p.scale=1+fracture*.10*Math.sin(i*.8+t*.47);
   p.a=1-burnt*.14;
   p.hot=Math.max(flash,fracture*.55);
   return p;
 });
 return normalized(out);
}
function getPos(t){switch(work.slug){case 'joint':return joint(t);case 'frill':return frill(t);case 'road':return road(t);case 'wheel':return wheel(t);case 'future':return future(t)}}

function cameraFor(t){
 const c={yaw:pointer.x*.018,pitch:pointer.y*.014,dolly:1};
 const strength=bump(t,3,11,duration*.75,duration-1);
 c.yaw+=Math.sin(t*.18)*.22*strength;
 c.pitch+=Math.sin(t*.12)*.14*strength;
 c.dolly=1+.13*strength*Math.sin(t*.16+1.5);
 if(work.slug==='road'){
   c.yaw+=.12*Math.sin(t*.21)*strength;c.dolly+=.12*strength;
 }
 if(work.slug==='wheel')c.yaw*=.44;
 return c;
}
function linePoints(points){return points.map(p=>cameraPt(p,cameraFor(nowT)))}

function drawType(char,p,opt={}){
 if(p.a<=.01||p.s<=.02)return;
 const size=Math.max(5,fontSize*p.s*(opt.scale||1));
 const alpha=clip((opt.alpha??1)*p.a,0,1);
 ctx.save();ctx.translate(p.x,p.y);ctx.rotate((p.r||0)*Math.PI/180);
 ctx.globalAlpha=alpha;
 ctx.font=`500 ${size}px "Hiragino Mincho ProN","Yu Mincho","Noto Serif CJK JP",serif`;
 ctx.textAlign='center';ctx.textBaseline='middle';
 const color=opt.color||ink;
 if(opt.glow){ctx.shadowColor=opt.glowColor||color;ctx.shadowBlur=opt.glow;}
 ctx.fillStyle=color;
 ctx.fillText(char,0,0);
 ctx.restore();
}

function drawLightRays(points,t,mode){
 if(points.length<2)return;
 let strength=bump(t,3.3,9,21.1,29.5);
 if(work.slug==='wheel')strength=bump(t,3.0,9,19.7,25.7);
 if(strength<.01)return;
 ctx.save();ctx.globalAlpha=strength*.27;
 ctx.lineWidth=mode==='frill'?1.45:1.05;
 ctx.shadowColor=accent;ctx.shadowBlur=18;
 ctx.strokeStyle=accent;
 ctx.beginPath();points.forEach((p,i)=>{if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y)});
 if(mode==='wheel'&&t>7&&t<22)ctx.closePath();
 ctx.stroke();ctx.restore();
}
function drawSpecial(points,t){
 if(work.slug==='joint'){
  const e=bump(t,5,9,20,27);
  if(e){ctx.save();ctx.strokeStyle=rgba('#9aafff',.26*e);ctx.lineWidth=1;ctx.shadowColor=accent;ctx.shadowBlur=14;
  for(let i of [3,7,12]){
   const p=points[i];const r=fontSize*.35+p.s*fontSize*.05;
   ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.stroke();
   ctx.beginPath();ctx.arc(p.x,p.y,2.1,0,Math.PI*2);ctx.fillStyle=rgba(accent,.8*e);ctx.fill();
  }ctx.restore();}
 }
 if(work.slug==='frill'){
  const e=bump(t,7,11,20,26);
  ctx.save();ctx.lineWidth=1;
  for(let lane=0;lane<5;lane++){
   ctx.globalAlpha=e*(.14-.022*lane);ctx.strokeStyle=accent;ctx.beginPath();
   points.forEach((p,i)=>{
     const offset=(lane-2)*(2+i%3)*fontSize*.16;
     if(!i)ctx.moveTo(p.x+offset,p.y-offset*.8);else ctx.lineTo(p.x+offset,p.y-offset*.8);
   });ctx.stroke();
  }ctx.restore();
 }
 if(work.slug==='road'){
  const e=bump(t,6,11,23.5,30);
  if(e){ctx.save();ctx.strokeStyle=rgba('#66ffe9',.14*e);ctx.lineWidth=2;
   for(let lane=-1;lane<=1;lane+=2){ctx.beginPath();points.forEach((p,i)=>{
    const ox=vertical?lane*fontSize*.7:0,oy=vertical?0:lane*fontSize*.7;
    if(!i)ctx.moveTo(p.x+ox,p.y+oy);else ctx.lineTo(p.x+ox,p.y+oy)
   });ctx.stroke();}ctx.restore();}
 }
 if(work.slug==='wheel'){
  const build=bump(t,5,10,20,24);
  if(build){
   let x=points.reduce((a,p)=>a+p.x,0)/n,y=points.reduce((a,p)=>a+p.y,0)/n;
   const rad=Math.min(W*.32,H*.31,vertical?140:245);
   ctx.save();ctx.strokeStyle=rgba('#ffb473',build*.19);ctx.shadowColor='#ff9455';ctx.shadowBlur=13;ctx.lineWidth=1.1;
   ctx.beginPath();ctx.arc(x,y,rad,0,Math.PI*2);ctx.stroke();
   for(let i=0;i<n;i+=2){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(points[i].x,points[i].y);ctx.stroke();}
   ctx.restore();
  }
 }
 if(work.slug==='future'){
   const e=bump(t,8,11,25,29);
   if(e){ctx.save();ctx.strokeStyle=rgba('#ffaadf',e*.11);ctx.lineWidth=1;
    for(let y=0;y<H;y+=4){if(noise(y|0,3)>.70){const xx=0.04*W+noise(y|0,4)*W*.34;
      ctx.beginPath();ctx.moveTo(xx,y);ctx.lineTo(xx+W*(.15+.36*noise(y|0,5)),y);ctx.stroke();}}
    ctx.restore();
   }
 }
}
function drawDust(points,t){
 let k=bump(t,13,17,25,duration-1);
 if(work.slug==='wheel')k=bump(t,18.5,22.5,27,duration-1);
 if(work.slug==='future')k=bump(t,14.5,16.5,25,duration-1);
 if(k<.015)return;
 ctx.save();ctx.globalCompositeOperation='lighter';
 const count=vertical?230:360;
 for(let j=0;j<count;j++){
  const idx=j%n,p=points[idx];
  const ang=noise(j,1)*Math.PI*2;
  const dis=(.13+.87*noise(j,2))*Math.min(W,H)*.31*k;
  const drift=(work.slug==='wheel'?t-18:1)*.07;
  const x=p.x+Math.cos(ang+drift)*dis;
  const y=p.y+Math.sin(ang+drift)*dis+Math.sin(t*.31+j)*7*k;
  const alpha=k*k*(.25+.60*noise(j,3));
  ctx.fillStyle=rgba(j%9===0?'#ffffff':accent,alpha);
  const sz=j%17===0?2.4:1.1;
  ctx.fillRect(x,y,sz,sz);
 }
 ctx.restore();
}
function drawScene(t){
 const positions=getPos(t);
 const camera=cameraFor(t);
 const pts=positions.map(p=>{const q=cameraPt(p,camera);return {...q,a:p.a,r:p.r,scale:p.scale,hot:p.hot}});
 const flash=work.slug==='future'?Math.pow(Math.max(0,1-Math.abs(t-14.95)/.53),1.5)+.43*Math.pow(Math.max(0,1-Math.abs(t-18.1)/.28),2):0;
 const active=bump(t,3,9,duration*.77,duration-.5);
 gpu.render(t,still?0:active,still?0:flash,pointer);
 ctx.setTransform(dpr,0,0,dpr,0,0);
 ctx.clearRect(0,0,W,H);
 if(!still){
  // A volumetric color pool also renders on non-WebGL2 browsers.
  const lum=Math.min(W,H)*(.30+.15*active);
  const halo=ctx.createRadialGradient(center.x,center.y,10,center.x,center.y,lum*1.6);
  halo.addColorStop(0,rgba(accent,.09*active));halo.addColorStop(.32,rgba(accent,.052*active));halo.addColorStop(1,rgba(accent,0));
  ctx.fillStyle=halo;ctx.fillRect(0,0,W,H);
  drawLightRays(pts,t,work.slug);
  drawSpecial(pts,t);
  // Optical echo layers: photographed typography without a bitmap.
  const echo=(work.slug==='future'?bump(t,9,12,23,28):bump(t,9,13,22,29));
  if(echo>.01){
   const count=work.slug==='frill'?4:work.slug==='future'?5:3;
   for(let layer=count;layer>=1;layer--){
    const dis=(layer*3.2+echo*8);
    const c=work.slug==='future'?(layer%2?'#fe718d':'#56dffc'):accent;
    pts.forEach((p,i)=>{
      let ox=(noise(i,layer)-.5)*dis*2+Math.cos(i*.57+t*.44)*dis;
      let oy=(noise(i,layer+9)-.5)*dis*2+Math.sin(i*.32+t*.39)*dis;
      drawType(txt[i],{...p,x:p.x+ox,y:p.y+oy},{color:c,alpha:(work.slug==='future'?.09:.042)*echo*(1+(count-layer)*.07),scale:p.scale,glow:layer===1?8:0});
    });
   }
  }
 }
 pts.forEach((p,i)=>{
  let color=ink;
  if(work.slug==='frill'&&i>=work.poem.indexOf('フリル')&&i<work.poem.indexOf('フリル')+3){color=lerpColor('#e9e5f5','#ff7b9b',p.hot)}
  else if(work.slug==='future'&&p.hot>.08){color=lerpColor(ink,'#fff8f6',clip(p.hot*.9,0,1))}
  else if(work.slug==='road'&&i>=work.poem.indexOf('犬')){color=lerpColor(ink,'#ffffff',p.hot*.78)}
  drawType(txt[i],p,{color,scale:p.scale,glow:still?0:Math.max(5,14*(p.hot||0)),glowColor:accent});
 });
 if(!still)drawDust(pts,t);
 if(flash>.001){
  ctx.save();ctx.fillStyle=`rgba(255,247,250,${Math.min(.84,flash*.8)})`;
  ctx.fillRect(0,0,W,H);ctx.restore();
 }
 return flash;
}
function lerpColor(hex1,hex2,k){
 const arr=[hex1,hex2].map(h=>{h=h.replace('#','');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16))});
 return '#'+arr[0].map((v,i)=>Math.round(lerp(v,arr[1][i],k)).toString(16).padStart(2,'0')).join('');
}
function draw(t){
 if(!W||!H)return;
 if(still){const saveT=nowT;nowT=0;const q=txt.map((_,i)=>original(i));
  gpu.render(0,0,0,pointer);ctx.clearRect(0,0,W,H);
  q.forEach((p,i)=>drawType(txt[i],{...cameraPt(p,{yaw:0,pitch:0,dolly:1}),a:1,r:0,scale:1},{color:ink}));
  nowT=saveT;
 }else{drawScene(t)}
}

function captionTime(t){const m=Math.floor(t/60),s=Math.floor(t%60);return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
const progress=$('#progress'),clock=$('#clock'),play=$('#play'),repeat=$('#repeat'),read=$('#read'),info=$('#information');
const sceneLabel=$('#scene-label'),sceneIndex=$('#scene-index');
function syncButtons(){play.textContent=paused?'▶ 再生':'Ⅱ 一時停止';play.setAttribute('aria-pressed',String(paused));
 read.textContent=still?'動きに戻る':'まっすぐ読む';read.setAttribute('aria-pressed',String(still));}
function updateHUD(){
 progress.value=String(Math.round(1000*nowT/duration));
 progress.style.setProperty('--percent',`${nowT/duration*100}%`);
 clock.textContent=`${captionTime(nowT)} / ${captionTime(duration)}`;
 const chapter=Math.min(4,Math.max(0,chapterRanges.findIndex((v,i)=>i<chapterRanges.length-1&&nowT>=v&&nowT<chapterRanges[i+1])));
 if(chapter!==lastChapter){sceneLabel.textContent=work.phases[chapter];sceneIndex.textContent=`SCENE ${String(chapter+1).padStart(2,'0')}`;lastChapter=chapter;}
 const titleVisible=still?1:Math.max(1-ramp(nowT,2.0,5.3),ramp(nowT,duration-3.5,duration-.7));
 $('.film-middle').style.opacity=String(titleVisible);
}
function frame(raf){
 if(prevTime&&!paused&&!still&&!timelineActive&&!document.hidden)nowT=(nowT+(raf-prevTime)/1000)%duration;
 prevTime=raf;
 draw(nowT);updateHUD();requestAnimationFrame(frame);
}
play.addEventListener('click',()=>{if(still)still=false;paused=!paused;syncButtons()});
repeat.addEventListener('click',()=>{nowT=0;paused=false;still=false;syncButtons();draw(nowT);updateHUD()});
read.addEventListener('click',()=>{still=!still;paused=still;syncButtons();draw(nowT)});
progress.addEventListener('pointerdown',()=>{timelineActive=true});
progress.addEventListener('pointerup',()=>{timelineActive=false;prevTime=0});
progress.addEventListener('input',()=>{nowT=Number(progress.value)/1000*duration;draw(nowT);updateHUD()});
progress.addEventListener('change',()=>{timelineActive=false;prevTime=0});
$('#share').addEventListener('click',async()=>{
 const b=$('#share');try{if(navigator.share)await navigator.share({title:document.title,url:location.href});
 else if(navigator.clipboard){await navigator.clipboard.writeText(location.href);b.textContent='コピーしました';setTimeout(()=>b.textContent='共有',1700)}}catch(e){}
});
stage.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'){
 const box=stage.getBoundingClientRect();pointer.x=clip((e.clientX-box.left)/box.width*2-1,-1,1);pointer.y=clip((e.clientY-box.top)/box.height*2-1,-1,1);
}});
stage.addEventListener('pointerleave',()=>{pointer={x:0,y:0}});
$('#fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await stage.requestFullscreen()}catch(e){}});
if(!document.fullscreenEnabled)$('#fullscreen').hidden=true;
const preference=matchMedia('(prefers-reduced-motion: reduce)');
preference.addEventListener('change',e=>{still=e.matches;paused=still;syncButtons();draw(nowT)});
document.addEventListener('visibilitychange',()=>{prevTime=0});
window.addEventListener('resize',setup,{passive:true});
window.addEventListener('orientationchange',setup,{passive:true});
if(window.ResizeObserver)new ResizeObserver(()=>{if(stage.clientWidth!==W||stage.clientHeight!==H)setup()}).observe(stage);
if(new URLSearchParams(location.search).has('t')){nowT=clip(Number(new URLSearchParams(location.search).get('t'))||0,0,duration);paused=true;}
// These DOM nodes expose the unmodified poem and the complete director's note even without JS.
$('#work-title').textContent=work.title;
$('#work-sub').textContent=work.feeling;
$('#work-sub-copy').textContent=work.feeling;
$('#whole-quote').textContent=work.poem;
$('#note-intent').textContent=work.note;
$('#note-tech').textContent=work.tech;
$('#film-number').textContent=work.id;
$('#note-number').textContent=work.id;
$('#note-length').textContent=captionTime(duration);
$('#description-title').textContent=work.title;
$('#chapter-count').textContent=`全5景 / ${captionTime(duration)}`;
for(let i=0;i<5;i++){const item=document.createElement('li');item.innerHTML=`<b>${String(i+1).padStart(2,'0')}</b><span>${work.phases[i]}</span>`;$('#scene-outline').append(item)}
const ix=works.findIndex(w=>w.id===work.id);
$('#prev-work').href=ix===0?'../index.html':`0${ix}.html`;
$('#next-work').href=ix===4?'../index.html':`0${ix+2}.html`;
$('#prev-work').textContent=ix===0?'← 5作品の一覧へ':'← 前の作品';
$('#next-work').textContent=ix===4?'一覧へ戻る ↗':'次の作品 →';
setup();syncButtons();updateHUD();requestAnimationFrame(frame);
