/* Articulated frame sequences; the element itself never shakes or rotates. */
var PaperVoiceCompanion = {
 sets:{ready:['roll','crossleg','stretch','thumbsup','magnify','notes','plane','tea','bow'],reading:['microphone','thumbsup','stretch','rest','magnify','notes','plane','tea','bow']},
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
  return {play,still,finish,dispose(){cancel();images.clear();}};
 }
};
if(typeof module!=='undefined')module.exports=PaperVoiceCompanion;
