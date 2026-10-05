/* Articulated frame sequences; the element itself never shakes or rotates. */
var PaperVoiceCompanion = {
 sets:{ready:['roll','crossleg','stretch','thumbsup','magnify','notes','plane','tea','bow'],reading:['microphone','thumbsup','stretch','rest','magnify','notes','plane','tea','bow']},
 // Palm centres measured on the 256px cells of the dock-present atlas.
 dockHands:[[68,190],[67,181],[47,166],[39,120],[30,112],[30,100],[41,98],[45,90],[50,76],[50,62],[58,54],[60,49],[48,75],[48,75],[47,81],[44,78],[43,82],[42,81],[42,76],[44,76],[44,76],[46,76],[46,76],[46,76]],
 hand(progress){const f=Math.max(0,Math.min(1,progress))*23,i=Math.floor(f),a=this.dockHands[i],b=this.dockHands[Math.min(23,i+1)],t=f-i;return {x:(a[0]+(b[0]-a[0])*t)/256,y:(a[1]+(b[1]-a[1])*t)/256};},
 frameCount:24,frameMs:62.5,breakInterval:30*60*1000,
 shuffled(ids,last,random=Math.random){const queue=ids.slice();for(let i=queue.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[queue[i],queue[j]]=[queue[j],queue[i]];}if(queue[0]===last)[queue[0],queue[1]]=[queue[1],queue[0]];return queue;},
 player(sprite,assetURI,onFinish) {
  const win=sprite.ownerDocument.defaultView,images=new Map();let ticket=0,request=null,current=null;
  const load=id=>{if(!images.has(id)){const image=new win.Image();image.src=assetURI+'animations/'+id+'.png';images.set(id,image);}return images.get(id);};
  const draw=frame=>{if(sprite.dataset.frame===String(frame))return;sprite.style.backgroundPosition=((frame%6)*20)+'% '+(Math.floor(frame/6)*100/3)+'%';sprite.dataset.frame=String(frame);};
  const cancel=()=>{ticket++;if(request!==null)win.cancelAnimationFrame(request);request=null;};
  const finish=()=>{cancel();if(current){draw(PaperVoiceCompanion.frameCount-1);onFinish?.();}};
  const still=id=>{cancel();current=id;sprite.style.backgroundImage=`url("${load(id).src}")`;sprite.dataset.gesture=id;draw(PaperVoiceCompanion.frameCount-1);};
  const play=async id=>{
   cancel();const token=ticket,image=load(id);try{await image.decode();}catch(_){if(token===ticket)onFinish?.();return;}
   if(token!==ticket||!sprite.isConnected)return;
   current=id;sprite.style.backgroundImage=`url("${image.src}")`;sprite.dataset.gesture=id;draw(0);let start=null;
   const step=now=>{if(token!==ticket)return;if(start===null)start=now;const frame=Math.min(PaperVoiceCompanion.frameCount-1,Math.floor((now-start)/PaperVoiceCompanion.frameMs));draw(frame);if(now-start<PaperVoiceCompanion.frameCount*PaperVoiceCompanion.frameMs)request=win.requestAnimationFrame(step);else{request=null;onFinish?.();}};
   request=win.requestAnimationFrame(step);
  };
  // Decode lazily: hidden readers do not load every animation sheet at startup.
  const preload=async id=>{try{await load(id).decode();return true;}catch(_){return false;}};
  // Seek uses the panel's clock, including reversals; no second animation timer.
  const seek=(id,progress)=>{const image=load(id);if(!image.complete||!image.naturalWidth)return false;cancel();current=id;sprite.style.backgroundImage=`url("${image.src}")`;sprite.dataset.gesture=id;draw(Math.round(Math.max(0,Math.min(1,progress))*(PaperVoiceCompanion.frameCount-1)));return true;};
  return {play,still,finish,preload,seek,dispose(){cancel();images.clear();}};
 }
};
if(typeof module!=='undefined')module.exports=PaperVoiceCompanion;
