/* Window motion stays in memory. A rounded, high-DPI snapshot is bent as one
 * continuous GPU mesh; no window pixels are stored or sent anywhere. */
var PaperVoiceDockMotion = {
 smooth(t) { t=Math.max(0,Math.min(1,t));return t*t*t*(t*(t*6-15)+10); },
 // The edge away from the icon leads. The near edge follows through a narrower
 // neck; each row has its own continuous trajectory, not a rigid scale/skew.
 row(p,v,width,height,anchor) {
  const near=anchor.y>=height/2?v:1-v,edge=Math.max(0,Math.min(1,near));
  // Fitting can place the icon inside the panel's vertical range. Reduce the
  // travelling wave there so adjacent rows cannot fold across each other.
  const outside=Math.max(0,anchor.y>=height/2?anchor.y-height:-anchor.y);
  const lag=.16*Math.min(1,outside/(height*.08));
  const rise=this.smooth((p-edge*lag)/(1-lag));
  // Travel begins while the sheet is still slender. The leading edge opens
  // first and the neck releases last, avoiding a large rigid block at the icon.
  const spread=this.smooth((p-.22-edge*.23)/(.62-edge*.07));
  const neck=Math.min(5/width,.025),scale=neck+(1-neck)*spread;
  return {center:anchor.x+(width/2-anchor.x)*spread,y:anchor.y+(v*height-anchor.y)*rise,scale};
 },
 mesh(panel,orb) {
  const doc=panel.ownerDocument,win=doc.defaultView,b=panel.getBoundingClientRect(),o=orb.getBoundingClientRect();
  const anchor={x:o.x+o.width/2-b.x,y:o.y+o.height*.54-b.y},pad=32;
  const source=doc.createElement('canvas'),ratio=Math.min(2,win.devicePixelRatio||1);
  source.width=Math.ceil((b.width+pad*2)*ratio);source.height=Math.ceil((b.height+pad*2)*ratio);
  const ctx=source.getContext('2d'),style=win.getComputedStyle(panel),radius=parseFloat(style.borderRadius)||22;
  if(!ctx?.drawWindow)throw Error('Window capture unavailable');
  ctx.scale(ratio,ratio);
  // drawWindow does not reproduce Gecko's composited backdrop-filter surface.
  // Capture only the actual foreground (with its user/theme alpha), never a
  // flattened screenshot containing PDF text. All overrides are restored in
  // the same task before a browser frame can be displayed.
  const isolation=doc.createElement('style');
  isolation.textContent='html,body{background:transparent!important}body > :not(.pv-shell){opacity:0!important}.pv-shell > :not(.pv-panel){opacity:0!important}.pv-panel{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}';
  doc.head.append(isolation);
  try{ctx.drawWindow(win,b.x-pad,b.y-pad,b.width+pad*2,b.height+pad*2,'rgba(0,0,0,0)');}finally{isolation.remove();}
  const left=Math.floor(Math.min(b.x-pad,o.x-pad)),top=Math.floor(Math.min(b.y-pad,o.y-pad));
  const width=Math.ceil(Math.max(b.right+pad,o.right+pad)-left),height=Math.ceil(Math.max(b.bottom+pad,o.bottom+pad)-top);
  const blurPad=72,background=doc.createElement('canvas'),blurred=doc.createElement('canvas');
  background.width=blurred.width=Math.ceil((width+blurPad*2)*ratio);background.height=blurred.height=Math.ceil((height+blurPad*2)*ratio);
  const bg=background.getContext('2d'),visibility=panel.style.visibility;bg.scale(ratio,ratio);panel.style.visibility='hidden';
  try{bg.drawWindow(win,left-blurPad,top-blurPad,width+blurPad*2,height+blurPad*2,'rgba(0,0,0,0)');}finally{panel.style.visibility=visibility;}
  const blurredContext=blurred.getContext('2d');
  blurredContext.filter=(style.backdropFilter||'none').replace(/([\d.]+)px/g,(_,n)=>(Number(n)*ratio)+'px');
  blurredContext.drawImage(background,0,0);background.width=background.height=0;
  const canvas=doc.createElement('canvas');canvas.className='pv-dock-motion';canvas.setAttribute('aria-hidden','true');
  canvas.style.cssText=`position:fixed;left:${left}px;top:${top}px;width:${width}px;height:${height}px;pointer-events:none;z-index:20;`;
  canvas.width=Math.ceil(width*ratio);canvas.height=Math.ceil(height*ratio);
  const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true,depth:false,stencil:false});
  if(!gl)throw Error('Window mesh unavailable');
  let program,vertex,fragment,texture,backdrop,positions,uvs,indices,disposed=false;
  const destroy=()=>{if(disposed)return;disposed=true;canvas.remove();gl.deleteBuffer(positions);gl.deleteBuffer(uvs);gl.deleteBuffer(indices);gl.deleteTexture(texture);gl.deleteTexture(backdrop);gl.deleteProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);gl.getExtension('WEBGL_lose_context')?.loseContext();source.width=source.height=blurred.width=blurred.height=canvas.width=canvas.height=0;};
  try {
   const shader=(kind,text)=>{const s=gl.createShader(kind);gl.shaderSource(s,text);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);throw Error('Window mesh shader unavailable');}return s;};
   vertex=shader(gl.VERTEX_SHADER,'attribute vec2 a_position;attribute vec2 a_uv;varying vec2 v_uv;varying vec2 v_screen;void main(){gl_Position=vec4(a_position,0.,1.);v_uv=a_uv;v_screen=vec2((a_position.x+1.)*.5,(1.-a_position.y)*.5);}');
   fragment=shader(gl.FRAGMENT_SHADER,'precision mediump float;varying vec2 v_uv;varying vec2 v_screen;uniform sampler2D u_image;uniform sampler2D u_backdrop;uniform vec4 u_panel;uniform vec4 u_bgRect;void main(){vec4 fg=texture2D(u_image,v_uv);vec2 pixel=v_uv*(u_panel.xy+2.*u_panel.z)-u_panel.z;vec2 q=abs(pixel-u_panel.xy*.5)-(u_panel.xy*.5-u_panel.w);float edge=length(max(q,0.))+min(max(q.x,q.y),0.)-u_panel.w;float cover=1.-smoothstep(-.5,.5,edge);vec4 bg=texture2D(u_backdrop,u_bgRect.xy+v_screen*u_bgRect.zw);float glass=(1.-fg.a)*cover;gl_FragColor=vec4(fg.rgb+bg.rgb*glass,fg.a+bg.a*glass);}');
   program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
   if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Window mesh linking unavailable');
   gl.useProgram(program);gl.viewport(0,0,canvas.width,canvas.height);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
   texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);gl.uniform1i(gl.getUniformLocation(program,'u_image'),0);
   backdrop=gl.createTexture();gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,backdrop);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,blurred);gl.uniform1i(gl.getUniformLocation(program,'u_backdrop'),1);
   gl.uniform4f(gl.getUniformLocation(program,'u_panel'),b.width,b.height,pad,radius);
   gl.uniform4f(gl.getUniformLocation(program,'u_bgRect'),blurPad/(width+blurPad*2),blurPad/(height+blurPad*2),width/(width+blurPad*2),height/(height+blurPad*2));
   // Shared vertices avoid seams between strips, even on a Retina display.
   const rows=96,points=new Float32Array((rows+1)*4),uv=new Float32Array(points.length),order=new Uint16Array(rows*6);
   for(let i=0;i<=rows;i++){uv.set([0,i/rows,1,i/rows],i*4);if(i<rows){const n=i*2;order.set([n,n+1,n+2,n+1,n+3,n+2],i*6);}}
   positions=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,positions);gl.bufferData(gl.ARRAY_BUFFER,points.byteLength,gl.DYNAMIC_DRAW);
   const pos=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
   uvs=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,uvs);gl.bufferData(gl.ARRAY_BUFFER,uv,gl.STATIC_DRAW);
   const tex=gl.getAttribLocation(program,'a_uv');gl.enableVertexAttribArray(tex);gl.vertexAttribPointer(tex,2,gl.FLOAT,false,0,0);
   indices=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indices);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,order,gl.STATIC_DRAW);
   panel.parentElement.append(canvas);
   return {canvas,anchor,draw:(p,grip)=>{
    if(disposed)return;
    if(grip){anchor.x=grip.x-b.x;anchor.y=grip.y-b.y;}
    for(let i=0;i<=rows;i++){
     const v=(-pad+(b.height+pad*2)*i/rows)/b.height,row=this.row(p,v,b.width,b.height,anchor);
     const x=b.x+row.center-left,y=b.y+row.y-top,half=(b.width/2+pad)*row.scale;
     points.set([(x-half)/width*2-1,1-y/height*2,(x+half)/width*2-1,1-y/height*2],i*4);
    }
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.bindBuffer(gl.ARRAY_BUFFER,positions);gl.bufferSubData(gl.ARRAY_BUFFER,0,points);
    gl.drawElements(gl.TRIANGLES,order.length,gl.UNSIGNED_SHORT,0);
   },destroy};
  }catch(error){destroy();throw error;}
 },
 create(panel,orb,fit) {
  const win=panel.ownerDocument.defaultView,query=win.matchMedia('(prefers-reduced-motion: reduce)');
  let rendering=null,frame=0,progress=0,velocity=0,target=false,last=0,fallback=null,fallbackBox=null,disposed=false,companion=null;
  const notify=(moving)=>companion?.(Math.max(0,Math.min(1,progress)),moving,target);
  const paint=()=>{
   // Never fade two translucent surfaces over one another. Keep one fully
   // rendered surface until its geometry matches the live panel exactly.
   const grip=notify(true);rendering.draw(Math.max(0,Math.min(1,progress)),grip);
  };
  const settle=show=>{
   win.cancelAnimationFrame(frame);frame=0;fallback?.cancel();fallback=null;rendering?.destroy();rendering=null;
   progress=show?1:0;velocity=0;panel.hidden=!show;panel.inert=!show;panel.style.pointerEvents=show?'':'none';
   panel.style.visibility='';panel.style.willChange='';panel.style.transformOrigin='';panel.dataset.pvVisible=String(show);
   delete panel.dataset.dockMotion;delete panel.dataset.dockRenderer;notify(false);
  };
  const tick=now=>{
   if(disposed)return;
   // Analytic critical damping is independent of display refresh rate, and
   // retains velocity on reversal instead of jumping onto a fresh easing curve.
   const dt=Math.min(.04,Math.max(0,(now-last)/1000));last=now;
   const omega=target?8.8:9.5,d=progress-Number(target),c=velocity+omega*d,e=Math.exp(-omega*dt);
   progress=Number(target)+(d+c*dt)*e;velocity=(velocity-omega*c*dt)*e;
   paint();
   if(Math.abs(progress-Number(target))<.001&&Math.abs(velocity)<.025){settle(target);return;}
   frame=win.requestAnimationFrame(tick);
  };
  const show=visible=>{
   if(disposed)return;
   visible=!!visible;
   if(panel.dataset.pvVisible===String(visible)&&(rendering||fallback||panel.hidden===!visible))return;
   target=visible;
   if(!visible&&panel.hidden&&!rendering&&!fallback){settle(false);return;}
   if(!visible&&panel.contains(panel.ownerDocument.activeElement))orb.focus({preventScroll:true});
   if(query.matches){settle(visible);if(visible)fit();return;}
   const wasHidden=panel.hidden;panel.hidden=false;panel.dataset.pvVisible=String(visible);panel.inert=true;panel.style.pointerEvents='none';
   panel.dataset.dockMotion=visible?'opening':'closing';
   if(rendering){notify(true);return;}
   if(!fallback){
    fit();
    try {
     rendering=this.mesh(panel,orb);progress=wasHidden?0:1;velocity=0;paint();panel.style.visibility='hidden';
     panel.dataset.dockRenderer='mesh';last=win.performance.now();
     const motionCanvas=rendering.canvas;
     motionCanvas.addEventListener('webglcontextlost',()=>{if(rendering?.canvas===motionCanvas)settle(target);},{once:true});
     frame=win.requestAnimationFrame(tick);return;
    }catch(_){rendering?.destroy();rendering=null;panel.style.visibility='';/* Older graphics drivers retain a gentle, reversible DOM path. */}
    const b=panel.getBoundingClientRect(),o=orb.getBoundingClientRect(),base=panel.style.transform||'translate(0px,0px)';
    fallbackBox=b;panel.style.transformOrigin=`${o.x+o.width/2-b.x}px ${o.y+o.height/2-b.y}px`;panel.style.willChange='transform,opacity';
    if(!panel.animate){settle(visible);return;}
    fallback=panel.animate([{transform:base+' scale(.001,0)'},{transform:base+' scale(1)'}],{duration:680,easing:'cubic-bezier(.2,.75,.16,1)',fill:'both'});
    fallback.pause();fallback.currentTime=wasHidden?0:680;
   }
   panel.dataset.dockRenderer='fallback';const animation=fallback;
   const follow=()=>{if(fallback!==animation||disposed)return;progress=animation.effect.getComputedTiming().progress??Number(target);const grip=notify(true);if(grip&&fallbackBox)panel.style.transformOrigin=`${grip.x-fallbackBox.x}px ${grip.y-fallbackBox.y}px`;frame=win.requestAnimationFrame(follow);};win.cancelAnimationFrame(frame);follow();animation.playbackRate=visible?1:-1.12;animation.play();
   animation.finished.then(()=>{if(fallback===animation)settle(target);},()=>{});
  };
  const refit=()=>{if(rendering||fallback)settle(target);if(!panel.hidden)fit();};
  const reduced=()=>{if(query.matches&&(rendering||fallback))settle(target);};
  const background=()=>{if(panel.ownerDocument.hidden&&(rendering||fallback))settle(target);};
  win.addEventListener('resize',refit);query.addEventListener('change',reduced);panel.ownerDocument.addEventListener('visibilitychange',background);
  panel._pvDockVisibility=show;
  return {refit,setCompanion(listener){companion=listener;},finish(){if(rendering||fallback)settle(target);},dispose(){disposed=true;settle(false);delete panel._pvDockVisibility;win.removeEventListener('resize',refit);query.removeEventListener('change',reduced);panel.ownerDocument.removeEventListener('visibilitychange',background);}};
 }
};
