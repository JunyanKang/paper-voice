/* Schedule decoded WAV chunks on one audio clock; pause preserves the sample position. */
var PaperVoiceStreamPlayer = class {
 constructor(context,stream,decode,win){
  this.context=context;this.stream=stream;this.decode=decode;this.win=win;this.buffers=[];this.nodes=[];this.position=0;this.paused=true;this.closed=false;this.epoch=0;this.cursor=0;this.index=0;this.offset=0;this.scheduledEnd=0;this.started=false;this.pumping=false;
 }
 get currentTime(){if(this.paused)return this.position;let position=this.position;for(const entry of this.nodes)if(this.context.currentTime>=entry.at)position=Math.max(position,entry.start+Math.min(entry.length,this.context.currentTime-entry.at));return position;}
 get fraction(){let time=this.currentTime,weight=0;const total=this.stream.texts.reduce((n,t)=>n+t.length,0);for(let i=0;i<this.buffers.length;i++){const buffer=this.buffers[i];if(!buffer)break;const used=Math.max(0,Math.min(1,time/buffer.duration));weight+=this.stream.texts[i].length*used;time-=buffer.duration;if(time<=0)break;}return total?Math.min(1,weight/total):1;}
 async play(){
  if(this.closed||!this.paused)return;const epoch=++this.epoch;
  await this.context.resume();if(this.closed||epoch!==this.epoch)return;
  this.paused=false;this.cursor=this.context.currentTime+.025;this.index=0;let offset=this.position;
  while(this.buffers[this.index]&&offset>=this.buffers[this.index].duration-.0001){offset-=this.buffers[this.index].duration;this.index++;}
  this.offset=Math.max(0,offset);this.scheduledEnd=this.position;this.started=false;
  this.timer=this.win.setInterval(()=>this.tick(),30);this.pump();
 }
 pause(){this.position=this.currentTime;this.paused=true;this.epoch++;this.win.clearInterval(this.timer);for(const item of this.nodes){try{item.node.stop();}catch(_){}item.node.disconnect();}this.nodes=[];}
 removeAttribute(){}
 load(){this.pause();this.closed=true;this.buffers=[];}
 async pump(){
  if(this.pumping||this.paused||this.closed)return;this.pumping=true;const epoch=this.epoch;
  try{
   while(!this.paused&&!this.closed&&epoch===this.epoch&&this.index<this.stream.texts.length&&this.cursor-this.context.currentTime<6){
    const index=this.index;
    if(!this.buffers[index]){const clip=await this.stream.get(index,0);if(this.closed||epoch!==this.epoch)return;const buffer=await this.decode(clip.audio);if(this.closed||epoch!==this.epoch)return;this.buffers[index]=buffer;}
    if(this.closed||this.paused||epoch!==this.epoch)return;
    const buffer=this.buffers[index],offset=this.offset,length=buffer.duration-offset,node=this.context.createBufferSource();node.buffer=buffer;node.connect(this.context.destination);
    const at=Math.max(this.cursor,this.context.currentTime+.01);node.start(at,offset);
    this.nodes.push({node,at,length,start:this.scheduledEnd});this.scheduledEnd+=length;this.cursor=at+length;this.offset=0;this.index++;
   }
  }catch(error){if(!this.closed&&epoch===this.epoch){this.pause();this.onerror?.(error);}}
  finally{this.pumping=false;}
 }
 tick(){
  if(this.paused||this.closed)return;
  if(!this.started&&this.nodes.length&&this.context.currentTime>=this.nodes[0].at){this.started=true;this.onplaying?.();}
  this.ontimeupdate?.();this.pump();
  if(this.index>=this.stream.texts.length&&this.context.currentTime>=this.cursor&&!this.pumping){this.position=this.scheduledEnd;this.pause();this.onended?.();}
 }
};
if(typeof module!=='undefined')module.exports=PaperVoiceStreamPlayer;
