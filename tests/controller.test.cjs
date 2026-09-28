const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
const core=require('../addon/core.js');
const tick=()=>new Promise(r=>setTimeout(r,0));
function setup(){
 const prefs=new Map(),errors=[];
 const host={setTimeout,clearTimeout,setInterval,clearInterval};
 const context={PaperVoiceCore:core,Components:{utils:{waiveXrays:x=>x}},PaperVoiceTranslation:{},Zotero:{Prefs:{get:k=>prefs.get(k),set:(k,v)=>prefs.set(k,v)},getMainWindow:()=>host,logError:e=>errors.push(e)},console};
 vm.createContext(context);vm.runInContext(fs.readFileSync('addon/main.js','utf8'),context);
 const p=context.PaperVoice;p.showPanel=()=>{};p.ensurePanel=()=>{};p.updatePanels=()=>{};
 const generated=[],played=[];
 p.synthesize=text=>new Promise((resolve,reject)=>generated.push({text,resolve:()=>resolve({audio:text}),reject}));
 p.playAudio=async audio=>{played.push(audio)};
 return {p,generated,played,errors};
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
