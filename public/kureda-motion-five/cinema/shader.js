/** GPU-powered procedural light. It never uses generated images or video. */
export class LightField {
  constructor(canvas,work){
    this.canvas=canvas;this.work=work;
    this.gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:false,stencil:false,desynchronized:true,powerPreference:'low-power'});
    this.enabled=false;
    if(!this.gl){canvas.style.display='none';return}
    const gl=this.gl;
    const vert=`#version 300 es
      precision mediump float;
      void main(){ vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.0-1.0,0.0,1.0);}`;
    const frag=`#version 300 es
      precision highp float;
      out vec4 fragColor;
      uniform vec2 res;
      uniform float time;
      uniform float energy;
      uniform float flash;
      uniform float mode;
      uniform vec2 mouse;
      uniform vec3 baseA;
      uniform vec3 baseB;
      uniform vec3 glow;
      float hash(vec2 p){p=fract(p*vec2(123.34,345.45));p+=dot(p,p+34.345);return fract(p.x*p.y);}
      float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      float fbn(vec2 p){float s=0.,w=.5;for(int i=0;i<4;i++){s+=w*n2(p);p=p*2.05+vec2(9.,17.);w*=.5;}return s;}
      void main(){
        vec2 uv=gl_FragCoord.xy/res;
        vec2 xy=(uv-.5)*vec2(res.x/res.y,1.0);
        float r=length(xy);
        float tt=time*.11;
        float f=fbn(xy*3.6+vec2(tt,-tt*.45));
        float angle=atan(xy.y,xy.x);
        vec2 warp=xy+vec2(sin(xy.y*7.+tt)*.065,cos(xy.x*7.-tt*.9)*.04)*energy;
        float veil=fbn(warp*5.0+vec2(tt*.8,tt*.4));
        float bloom=exp(-14.0*length(warp-vec2(mouse.x*.09,mouse.y*.08)));
        float rays=pow(max(0.,cos(angle*6.+tt*1.45+f*2.0)),12.)*exp(-r*2.4);
        float ring=exp(-abs(r-(.19+.012*sin(tt*3.)))*35.)*.16;
        float flareLight=(bloom*.29+rays*.18+ring*.1+pow(max(0.,veil-.36),2.)*.45)*energy;
        float haze=smoothstep(.19,.83,f)*.28;
        vec3 col=mix(baseA,baseB,smoothstep(-.65,.8,xy.y*.57+xy.x*.23+haze));
        col+=glow*(flareLight+.045*veil);
        if(mode>1.5&&mode<2.5){
          float road=exp(-pow(abs(xy.x+.24*sin(xy.y*4.-tt*1.4)+.1*sin(xy.y*9.+tt)),2.)*36.);
          col+=glow*road*energy*.10;
        }
        if(mode>2.5&&mode<3.5){
          float halo=exp(-pow((r-.255),2.)*145.)*.17*energy;
          col+=glow*halo;
        }
        if(mode>3.5){
          float analogue=sin(uv.y*res.y*.34+time*.8)*.008;
          float hot=exp(-r*r*11.)*(energy*.14+flash*.55);
          col+=glow*(hot+analogue);
        }
        float vignette=1.-.49*smoothstep(.24,.72,r);
        col*=vignette;
        col+=vec3(.86,.89,1.)*flash*.98;
        float grain=hash(gl_FragCoord.xy+time*17.)-.5;
        col+=grain*(.014+.015*energy);
        fragColor=vec4(max(col,vec3(0.0)),1.0);
      }`;
    const shader=(type,source)=>{
      const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
      if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error('Shader '+gl.getShaderInfoLog(s));
      return s;
    };
    try{
      const p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,vert));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,frag));gl.linkProgram(p);
      if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
      gl.useProgram(p);this.program=p;
      this.locs={};for(const name of ['res','time','energy','flash','mode','mouse','baseA','baseB','glow'])this.locs[name]=gl.getUniformLocation(p,name);
      this.vao=gl.createVertexArray();gl.bindVertexArray(this.vao);this.enabled=true;
      this.resize();
    }catch(err){console.warn('WebGL2 unavailable; CSS fallback active',err);this.enabled=false;canvas.style.display='none';}
  }
  resize(){
    if(!this.enabled)return;
    const w=this.canvas.clientWidth,h=this.canvas.clientHeight;
    if(!w||!h)return;
    const dpr=Math.min(devicePixelRatio||1,1.4);
    this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);
    this.gl.viewport(0,0,this.canvas.width,this.canvas.height);
  }
  render(t,energy=0,flash=0,mouse=[0,0]){
    if(!this.enabled)return;
    const gl=this.gl,u=this.locs,p=this.work.palette;
    gl.useProgram(this.program);gl.bindVertexArray(this.vao);
    gl.uniform2f(u.res,this.canvas.width,this.canvas.height);
    gl.uniform1f(u.time,t);gl.uniform1f(u.energy,energy);gl.uniform1f(u.flash,flash);
    gl.uniform1f(u.mode,Number(this.work.id)-1);
    gl.uniform2f(u.mouse,mouse[0],mouse[1]);
    gl.uniform3fv(u.baseA,p.a);gl.uniform3fv(u.baseB,p.b);gl.uniform3fv(u.glow,p.glow);
    gl.drawArrays(gl.TRIANGLES,0,3);
  }
}
