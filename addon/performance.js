Object.assign(PaperVoice,{
 async playSpeechStream(result,reader,generation,message,onFraction){
  const win=this.host;
  if(!win.AudioContext){let weight=0,total=result.stream.texts.reduce((n,t)=>n+t.length,0);for(let i=0;i<result.stream.texts.length;i++){const clip=await result.stream.get(i);if(generation!==this.generation)return;result.stream.get(i+1).catch(()=>{});await this.playAudio(clip.audio,reader,generation,message,time=>onFraction?.((weight+result.stream.texts[i].length*time/clip.duration)/total));weight+=result.stream.texts[i].length;}return;}
  const paused=this.state==='paused';this.releaseAudio();
  const context=this.speechAudioContext||=(new win.AudioContext());
  const decode=async encoded=>{const t=Date.now(),binary=win.atob(encoded),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);const buffer=await context.decodeAudioData(bytes.buffer);this.markTiming('decode',Date.now()-t);return buffer;};
  const audio=this.audio=new PaperVoiceStreamPlayer(context,result.stream,decode,win);
  return new Promise((resolve,reject)=>{
   this.audioDone=resolve;audio.onended=resolve;audio.onerror=reject;
   audio.onplaying=()=>{if(generation!==this.generation||this.audio!==audio||audio.paused)return;this.firstSound(generation);this.rememberPlayback(this.pendingProgress);this.dismissReadingSelectionPopup(reader,generation);};
   audio.ontimeupdate=()=>{if(generation===this.generation&&this.audio===audio&&!audio.paused)onFraction?.(audio.fraction);};
   this.resumeStatus=message;this.setStatus(paused?'已暂停，点击继续':message,paused?'paused':'playing');
   if(!paused&&generation===this.generation)audio.play().catch(reject);
  });
 },
 beginTiming(generation){this.startupTiming={generation,started:Date.now(),stages:[]};},
 markTiming(name,ms,generation=this.generation){const trace=this.startupTiming;if(trace?.generation===generation&&generation===this.generation&&trace.firstSoundMs===undefined)trace.stages.push({name,ms});},
 firstSound(generation){const trace=this.startupTiming;if(trace?.generation!==generation||trace.firstSoundMs!==undefined)return;trace.firstSoundMs=Date.now()-trace.started;this.recentTimings||=[];this.recentTimings.push(trace);if(this.recentTimings.length>20)this.recentTimings.shift();},
 speechQueue(){return this._speechQueue||=(new PaperVoicePipeline.SpeechQueue(async(text,voice,rate,onStage,generation)=>{
   const t=Date.now();if(generation!==this.generation)throw PaperVoicePipeline.cancelled();
   const result=await this.requestSpeech(text,voice,rate,onStage,generation);this.markTiming('synthesis',Date.now()-t,generation);return result;
  },g=>g===this.generation&&!this.dead));},
 synthesize(text,voice,rate,onStage,generation=this.generation,priority=0){
  this.host.clearTimeout(this.workerIdleTimer);
  const key=JSON.stringify([this.engineRoot(),this.version,voice,rate,text]);
  return this.speechQueue().request(key,[text,voice,rate,onStage],generation,priority).finally(()=>this.scheduleWorkerIdle());
 },
 scheduleWorkerIdle(){
  this.host.clearTimeout(this.workerIdleTimer);if(this.dead)return;
  this.workerIdleTimer=this.host.setTimeout(()=>{if(['playing','paused','loading'].includes(this.state)||this.pending.size||this._speechQueue?.busy){this.scheduleWorkerIdle();return;}const proc=this.process;this.process=null;proc?.kill();this._speechQueue?.clear();this.warmedVoices?.clear();this.speechAudioContext?.suspend().catch(()=>{});},5*60000);
 },
 scheduleWarmup(){
  if(this.dead||this.warmupTimer||['playing','paused','loading'].includes(this.state))return;
  this.warmupTimer=this.host.setTimeout(()=>{this.warmupTimer=null;const g=this.generation,lang=this.get('readTranslation',false)?this.translationVoiceLanguage():this.speechLanguage(),voice=this.get('readTranslation',false)?this.get('voiceFor_'+lang,PaperVoiceCore.voices.find(v=>v.language===lang)?.id||'af_heart'):this.get('voice','af_heart');
   this.warmedVoices||=new Set();if(this.process&&this.warmedVoices.has(voice))return;
   const text=({en:'Ready.',zh:'准备好了。',ja:'準備ができました。',fr:'Prêt.'})[lang]||'Ready.';
   this.synthesize(text,voice,1,null,g,2).then(()=>this.warmedVoices.add(voice),()=>{});
  },450);
 },
 async pageContent(pdf,index){
  this.pageContentCache||=new WeakMap();let cache=this.pageContentCache.get(pdf);if(!cache){cache=new Map();this.pageContentCache.set(pdf,cache);}
  if(!cache.has(index)){const task=(async()=>{const page=Components.utils.waiveXrays(await pdf.getPage(index+1));return {items:(await page.getTextContent()).items,height:Math.abs(page.view?.[3]-page.view?.[1])||undefined};})();cache.set(index,task);task.catch(()=>cache.delete(index));}return cache.get(index);
 },
 async publicationMargins(pdf){
  this.marginTaskCache||=new WeakMap();if(!this.marginTaskCache.has(pdf)){const task=Promise.all(Array.from({length:Math.min(5,pdf.numPages)},(_,i)=>this.pageContent(pdf,i))).then(pages=>PaperVoiceCore.marginSignatures(pages));this.marginTaskCache.set(pdf,task);task.catch(()=>this.marginTaskCache.delete(pdf));}return this.marginTaskCache.get(pdf);
 },
 async pageLayout(reader,index){
  const pdf=reader?._internalReader?._primaryView?._iframeWindow?.PDFViewerApplication?.pdfDocument;if(!pdf)return null;
  this.layoutCache||=new WeakMap();let cache=this.layoutCache.get(pdf);if(!cache){cache=new Map();this.layoutCache.set(pdf,cache);}
  if(!cache.has(index)){const task=(async()=>{const [margins,page]=await Promise.all([this.publicationMargins(pdf),this.pageContent(pdf,index)]);return PaperVoiceCore.pdfLayout(page.items,index,page.height,{margins});})();cache.set(index,task);task.catch(()=>cache.delete(index));}
  return cache.get(index);
 },
 async localUnits(reader,anchor,mode='sentence',generation=this.generation){
  const pdf=reader?._internalReader?._primaryView?._iframeWindow?.PDFViewerApplication?.pdfDocument;if(!pdf)return [];
  let first=Math.max(0,anchor.pageIndex-1),last=Math.min(pdf.numPages-1,anchor.pageIndex+1);
  while(true){
   if(generation!==this.generation||this.dead)throw PaperVoicePipeline.cancelled();
   const pages=[];for(let i=first;i<=last;i++)pages.push(await this.pageLayout(reader,i));
   const units=PaperVoiceCore.layoutUnits(pages),group=PaperVoiceCore.scopeUnits(units,anchor,mode);
   if(!group.length)return [];
   const key=mode==='paragraph'?'paragraphId':'sentenceId';
   const left=first>0&&group[0][key]===units[0][key],right=last<pdf.numPages-1&&group.at(-1)[key]===units.at(-1)[key];
   if(!left&&!right)return units;if(left)first--;if(right)last++;
   await new Promise(resolve=>this.host.setTimeout(resolve,0));
  }
 },
 async documentUnits(reader){
  const pdf=reader?._internalReader?._primaryView?._iframeWindow?.PDFViewerApplication?.pdfDocument;if(!pdf)return [];
  this.documentCache||=new WeakMap();if(!this.documentCache.has(pdf)){const task=(async()=>{const pages=[];for(let i=0;i<pdf.numPages;i++){pages.push(await this.pageLayout(reader,i));await new Promise(resolve=>this.host.setTimeout(resolve,0));}return PaperVoiceCore.layoutUnits(pages);})();this.documentCache.set(pdf,task);task.catch(()=>this.documentCache.delete(pdf));}return this.documentCache.get(pdf);
 },
 createDocumentSource(reader,startPage,generation){
  const pdf=reader._internalReader._primaryView._iframeWindow.PDFViewerApplication.pdfDocument,pages=[];let index=startPage,delivered=-1,base=0,done=false;
  return {async next(){
   while(!done){if(generation!==PaperVoice.generation||PaperVoice.dead)throw PaperVoicePipeline.cancelled();
    const page=await PaperVoice.pageLayout(reader,index++);if(generation!==PaperVoice.generation||PaperVoice.dead)throw PaperVoicePipeline.cancelled();if(!page.text)PaperVoice.documentEmptyPages=(PaperVoice.documentEmptyPages||0)+1;pages.push(page);done=index>=pdf.numPages;
    const all=PaperVoiceCore.layoutUnits(pages),last=all.at(-1);
    // The trailing sentence is provisional until the next page supplies its end.
    const safe=done?all:all.filter(u=>u.sentenceId!==last?.sentenceId);
    const fresh=safe.filter(u=>u.sentenceId+base>delivered);
    if(fresh.length){
     delivered=fresh.at(-1).sentenceId+base;
     const chunk=PaperVoiceCore.spokenUnits(fresh).map(u=>({...u,sentenceId:u.sentenceId+base,paragraphId:u.paragraphId+base}));
     // Retain the unfinished sentence and paragraph, plus one predecessor page.
     // Earlier pages must not be re-segmented for every subsequent page.
     if(!done&&last){const tail=all.filter(u=>u.sentenceId===last.sentenceId||u.paragraphId===last.paragraphId),keep=Math.min(...tail.map(u=>u.pageIndex))-1;while(pages.length>1&&pages[0].pageIndex<keep)base+=PaperVoiceCore.anchorText(pages.shift().text).length;}
     if(chunk.length)return {units:chunk,done};
    }
    await new Promise(resolve=>PaperVoice.host.setTimeout(resolve,0));
   }return {units:[],done:true};}};
 }
});
