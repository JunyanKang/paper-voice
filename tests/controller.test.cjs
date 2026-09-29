const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
const core=require('../addon/core.js');
const tick=()=>new Promise(r=>setTimeout(r,0));
function setup(){
 const prefs=new Map(),errors=[];
 const host={setTimeout,clearTimeout,setInterval,clearInterval};
 const context={PaperVoiceCore:core,Components:{utils:{waiveXrays:x=>x}},PaperVoiceTranslation:{},Zotero:{Prefs:{get:k=>prefs.get(k),set:(k,v)=>prefs.set(k,v)},getMainWindow:()=>host,logError:e=>errors.push(e)},console};
 vm.createContext(context);vm.runInContext(fs.readFileSync('addon/main.js','utf8'),context);
 const p=context.PaperVoice;p.showPanel=()=>{};p.ensurePanel=()=>{};p.updatePanels=()=>{};
 const generated=[],played=[],nativePlay=p.playAudio;
 p.synthesize=text=>new Promise((resolve,reject)=>generated.push({text,resolve:()=>resolve({audio:text}),reject}));
 p.playAudio=async audio=>{played.push(audio)};
 return {p,generated,played,errors,host,nativePlay};
}
test('rapid re-selection only plays the latest text',async()=>{
 const {p,generated,played}=setup();const a=p.speak('First selection',{});await tick();
 const b=p.speak('Second selection',{});const c=p.speak('Latest selection',{});
 generated[0].resolve();await tick();assert.equal(generated.length,2);assert.equal(generated[1].text,'Latest selection');
 generated[1].resolve();await Promise.all([a,b,c]);assert.deepEqual(played,['Latest selection']);
});
test('stop during synthesis prevents all playback',async()=>{
 const {p,generated,played}=setup();const a=p.speak('Pending sentence',{});await tick();p.stop();generated[0].resolve();await a;assert.deepEqual(played,[]);assert.equal(p.state,'idle');
});
test('prefetched old paragraph cannot play after a new selection',async()=>{
 const {p,generated,played}=setup();let finish;
 p.playAudio=audio=>{played.push(audio);return new Promise(r=>{finish=r;p.audioDone=r;});};
 const a=p.speak('The retina is a complex tissue. '.repeat(30),{});await tick();generated[0].resolve();await tick();
 assert.equal(generated.length,2);const b=p.speak('New selected sentence',{});generated[1].resolve();await tick();
 assert.equal(generated[2].text,'New selected sentence');generated[2].resolve();await tick();finish();await Promise.all([a,b]);
 assert.equal(played.length,2);assert.equal(played[1],'New selected sentence');
});
test('synthesis error is shown and does not produce audio',async()=>{
 const {p,generated,played}=setup();const a=p.speak('A sentence',{});await tick();generated[0].reject(new Error('engine failed'));await a;
 assert.equal(p.state,'error');assert.equal(p.status,'engine failed');assert.deepEqual(played,[]);
});
test('selection rerenders debounce and avoid duplicate speech',async()=>{
 const {p}=setup();let calls=[];p.speak=async text=>calls.push(text);
 const doc={createElement:()=>({dataset:{},style:{},addEventListener(){}})};
 const e={doc,reader:{},params:{annotation:{text:'Selected words',position:{pageIndex:0}}},append(){}};
 p.onSelection(e);p.onSelection(e);p.onSelection(e);await new Promise(r=>setTimeout(r,330));assert.deepEqual(calls,['Selected words']);
});
test('turning off auto prevents delayed selection from speaking',async()=>{
 const {p}=setup();let calls=0;p.speak=async()=>calls++;
 p.onSelection({doc:{createElement:()=>({dataset:{},style:{},addEventListener(){}})},reader:{},params:{annotation:{text:'Selected words'}},append(){}});
 p.set('auto',false);await new Promise(r=>setTimeout(r,330));assert.equal(calls,0);
});
test('paragraph repeats exact count and reuses generated audio',async()=>{
 const {p,played}=setup();p.set('mode','paragraph');p.set('repeat',3);let count=0;
 p.synthesize=async text=>{count++;return {audio:text}};
 await p.speak('First sentence. Second sentence.',{});
 assert.deepEqual(played,['First sentence.','Second sentence.','First sentence.','Second sentence.','First sentence.','Second sentence.']);assert.equal(count,2);
});
test('single sentence repetition and next sentence navigation',async()=>{
 const {p,played}=setup();p.set('mode','sentence');p.set('repeat',2);p.synthesize=async text=>({audio:text});
 await p.speak('First sentence. Second sentence.',{});assert.deepEqual(played,['First sentence.','First sentence.']);
 p.sentenceIndex=1;await p.speak(p.lastText,{},false,true);assert.deepEqual(played.slice(2),['Second sentence.','Second sentence.']);
});
test('infinite loop can always stop',async()=>{
 const {p,played}=setup();p.set('mode','paragraph');p.set('repeat',0);p.synthesize=async text=>({audio:text});
 p.playAudio=async text=>{played.push(text);if(played.length===4)p.stop();};await p.speak('One sentence.',{});assert.equal(played.length,4);assert.equal(p.state,'idle');
});
test('whole document reads pages in order and skips blank scans',async()=>{
 const {p,played}=setup();p.synthesize=async text=>({audio:text});const pages=[];
 const r={navigate:({pageIndex})=>pages.push(pageIndex),_internalReader:{_primaryView:{_iframeWindow:{PDFViewerApplication:{pdfDocument:{numPages:3,getPage:async n=>({getTextContent:async()=>({items:n===2?[]:[{str:`Page ${n}.`,hasEOL:true}]})})}}}}}};
 await p.startDocument(r);assert.deepEqual(played,['Page 1.','Page 3.']);assert.deepEqual(pages,[0,2]);assert.equal(p.documentEmptyPages,1);
});
test('current-page start ignores stale initial view state; resume retains sentence position',async()=>{
 const {p,played}=setup();p.synthesize=async text=>({audio:text});
 const r={itemID:42,navigate(){},_internalReader:{_primaryView:{_viewState:{pageIndex:0},_iframeWindow:{PDFViewerApplication:{pdfViewer:{currentPageNumber:2},pdfDocument:{numPages:3,getPage:async n=>({getTextContent:async()=>({items:[{str:`Page ${n}. Final sentence ${n}.`}]})})}}}}}};
 await p.startDocument(r,'current');assert.deepEqual(played,['Page 2.','Final sentence 2.','Page 3.','Final sentence 3.']);played.length=0;
 p.set('progress.42',JSON.stringify({pageIndex:1,unitInPage:1}));await p.startDocument(r,'resume');assert.deepEqual(played,['Final sentence 2.','Page 3.','Final sentence 3.']);
 p.set('progress.42','corrupt');played.length=0;await p.startDocument(r,'resume');assert.equal(played[0],'Page 1.');
});
test('speech drops citations while keeping original sentence for highlighting',async()=>{
 const {p,played}=setup();let highlighted=[];p.synthesize=async text=>({audio:text});p.highlightSentence=async(r,unit)=>highlighted.push(unit.sentenceText||unit.text);
 await p.speak('Retinal cells [1–3] detect light (Smith et al., 2020).',{});
 assert.deepEqual(played,['Retinal cells detect light.']);assert.match(highlighted[0],/\[1–3\]/);
 played.length=0;await p.speak('[12]',{});assert.equal(played.length,0);assert.equal(p.state,'idle');
});
function progressReader(id=42){return {itemID:id,navigate(){},_internalReader:{_primaryView:{_iframeWindow:{PDFViewerApplication:{pdfViewer:{currentPageNumber:1},pdfDocument:{numPages:2,getPage:async n=>({getTextContent:async()=>({items:[{str:n===1?'First sentence. Second sentence.':'Neural signals travel to the brain. The final sentence.'}]})})}}}}}};}
test('selected letter starts at its containing sentence and continues to the end',async()=>{
 const {p,played}=setup(),r=progressReader();p.synthesize=async text=>({audio:text});
 p.selectionContexts.set(r,{text:'e',pageIndex:0,anchorOffset:core.anchorText('First sentence. S').length});
 await p.startDocument(r,'selection');assert.deepEqual(played,['Second sentence.','Neural signals travel to the brain.','The final sentence.']);
});
test('selected start never substitutes the first occurrence when a letter is ambiguous',async()=>{
 const {p,played}=setup(),r=progressReader();p.synthesize=async text=>({audio:text});
 p.selectionContexts.set(r,{text:'e',pageIndex:0});await p.startDocument(r,'selection');assert.equal(played.length,0);assert.match(p.status,/重新划选/);
 await p.startDocument(progressReader(43),'selection');assert.equal(played.length,0);assert.match(p.status,/请先/);
});
test('resume follows the latest actual reading in every mode, including partial sentences',async()=>{
 const {p,played}=setup(),r=progressReader();p.synthesize=async text=>({audio:text});
 p.playAudio=async text=>{p.rememberPlayback(p.pendingProgress);played.push(text);};
 for(const mode of ['selection','paragraph','sentence']){
  p.set('mode',mode);p.set('repeat',1);p.selectionContexts.set(r,{text:'travel to the brain.',pageIndex:1});
  await p.speak('travel to the brain.',r);
  const saved=JSON.parse(p.get('progress.42'));assert.equal(saved.pageIndex,1);assert.equal(saved.mode,mode);assert.ok(saved.anchorOffset>0);
  p.set('mode','document');played.length=0;await p.startDocument(r,'resume');
  assert.deepEqual(played,['Neural signals travel to the brain.','The final sentence.']);
 }
});
test('progress is isolated by PDF; loading, stopped and sample speech cannot overwrite it',async()=>{
 const {p,generated}=setup(),r=progressReader(),other=progressReader(43);p.set('progress.42','original');
 p.selectionContexts.set(r,{text:'First sentence.',pageIndex:0});
 const speech=p.speak('First sentence.',r);await tick();assert.equal(p.get('progress.42'),'original');p.stop();generated[0].resolve();await speech;
 p.rememberPlayback({reader:r,unit:{pageIndex:0,text:'Old'},generation:p.generation-1,mode:'selection'});assert.equal(p.get('progress.42'),'original');
 p.synthesize=async text=>({audio:text});p.playAudio=async()=>p.rememberPlayback(p.pendingProgress);
 await p.speak('A sample voice.',r,true);assert.equal(p.get('progress.42'),'original');
 await p.speak('First sentence.',other);assert.equal(p.get('progress.42'),'original');assert.equal(JSON.parse(p.get('progress.43')).text,'First sentence.');
});
test('ordinary PDF pointer gestures do not cancel full document playback',()=>{
 const {p}=setup();let down;
 const inner={addEventListener:(event,handler)=>{if(event==='pointerdown')down=handler;}};
 const outer={body:{},addEventListener(){},querySelectorAll:()=>[{contentDocument:inner}],querySelector:()=>({})};
 const r={_iframeWindow:{document:outer}};p.attachReader(r);p.currentReader=r;p.playbackMode='document';p.state='playing';const generation=p.generation;
 down({target:{closest:()=>null}});assert.equal(p.generation,generation);assert.equal(p.state,'playing');
 p.playbackMode='selection';down({target:{closest:()=>null}});assert.equal(p.state,'idle');
});

test('pausing before media play resolves remains paused and does not save unheard progress',async()=>{
 const {p,host,nativePlay}=setup();let rejectPlay;
 host.atob=()=>'';host.Blob=class {};host.URL={createObjectURL:()=> 'blob:test',revokeObjectURL(){}};
 host.Audio=class {play(){return new Promise((resolve,reject)=>{rejectPlay=reject;});}pause(){}removeAttribute(){}load(){}};
 p.pendingProgress={reader:{itemID:42},unit:{pageIndex:0,text:'Sentence.'},generation:p.generation};
 const audio=nativePlay.call(p,'',{},p.generation,'Playing');p.togglePause();rejectPlay(new Error('AbortError'));await tick();
 assert.equal(p.state,'paused');assert.equal(p.get('progress.42'),undefined);p.stop();await audio;
});
