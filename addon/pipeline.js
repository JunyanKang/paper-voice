/* Bounded, session-local work. No document text or audio is written to disk. */
var PaperVoicePipeline = (()=>{
 const cancelled=()=>Object.assign(new Error('Playback superseded'),{name:'AbortError'});
 class SpeechQueue {
  constructor(run,valid,{maxBytes=32*1024*1024}={}){this.run=run;this.valid=valid;this.maxBytes=maxBytes;this.cache=new Map();this.bytes=0;this.jobs=[];this.busy=false;}
  request(key,args,generation,priority=0){
   if(!this.valid(generation))return Promise.reject(cancelled());
   const cached=this.cache.get(key);if(cached){this.cache.delete(key);this.cache.set(key,cached);return Promise.resolve(cached.value);}
   const existing=[this.active,...this.jobs].find(x=>x&&x.key===key&&x.generation===generation);if(existing){existing.priority=Math.min(existing.priority,priority);return existing.promise;}
   const job={key,args,generation,priority};job.promise=new Promise((resolve,reject)=>Object.assign(job,{resolve,reject}));job.promise.catch(()=>{});this.jobs.push(job);this.pump();return job.promise;
  }
  cancel(){for(const job of this.jobs.filter(x=>!this.valid(x.generation)))job.reject(cancelled());this.jobs=this.jobs.filter(x=>this.valid(x.generation));}
  clear(){this.cache.clear();this.bytes=0;}
  async pump(){
   if(this.busy)return;this.busy=true;
   try{while(this.jobs.length){this.cancel();this.jobs.sort((a,b)=>a.priority-b.priority);const job=this.jobs.shift();if(!job)break;this.active=job;
    try{const value=await this.run(...job.args,job.generation);if(!this.valid(job.generation)){job.reject(cancelled());continue;}
     const bytes=(value.audio?.length||0)*2+job.key.length*2;
     if(bytes<=this.maxBytes){const old=this.cache.get(job.key);if(old)this.bytes-=old.bytes;this.cache.delete(job.key);this.cache.set(job.key,{value,bytes});this.bytes+=bytes;while(this.bytes>this.maxBytes){const [key,item]=this.cache.entries().next().value;this.cache.delete(key);this.bytes-=item.bytes;}}
     job.resolve(value);
    }catch(error){job.reject(error);}
   }}finally{this.active=null;this.busy=false;}
  }
 }
 // Split only at clause boundaries. Preserve the words, punctuation, numbers,
 // brackets and abbreviations; an indivisible clause is left intact.
 function clauses(text,language='en'){
  const target=/^(zh|ja)$/.test(language)?65:180,out=[];let start=0,depth=0;
  for(let i=0;i<text.length;i++){
   const c=text[i];if('([{（【'.includes(c))depth++;if(')]}）】'.includes(c))depth=Math.max(0,depth-1);
   const boundary=depth===0&&(/[，；。！？]/u.test(c)||(/[;,!?]/.test(c)&&/\s/.test(text[i+1]||'')));
   if(boundary&&i-start>=target*.55&&text.length-start>target*1.3){out.push(text.slice(start,i+1).trim());start=i+1;}
  }
  if(text.slice(start).trim())out.push(text.slice(start).trim());return out;
 }
 class ClipStream {
  constructor(texts,generate){this.texts=texts;this.generate=generate;this.clips=new Map();}
  get(index,priority=0){if(index>=this.texts.length)return Promise.resolve(null);if(!this.clips.has(index)){const promise=this.generate(this.texts[index],priority);promise.catch(()=>{});this.clips.set(index,promise);}return this.clips.get(index);}
 }
 return {SpeechQueue,ClipStream,clauses,cancelled};
})();
if(typeof module!=='undefined')module.exports=PaperVoicePipeline;
