const p=PaperVoice,report={checks:[]},base=p.testRoot;
const check=(name,ok,details={})=>{report.checks.push({name,ok,...JSON.parse(JSON.stringify(details))});if(!ok)throw Error(name);};
const item=await Zotero.Attachments.importFromFile({file:base+'/tests/multipage.pdf'}),r=await Zotero.Reader.open(item.id);await r._initPromise;await Zotero.Promise.delay(1000);p.attachReader(r);
p.stop();p.set('translation',false);p.set('rate',1.6);p.set('repeat',1);
const play=p.playAudio;let played=[];
p.playAudio=function(...args){played.push(this.currentSentence);return play.apply(this,args);};
const waitPlaying=async()=>{for(let n=0;n<200&&!(p.audio&&!p.audio.paused&&p.audio.currentTime>.05);n++)await Zotero.Promise.delay(50);check('Audio reaches actual playback',!!p.audio&&!p.audio.paused&&p.audio.currentTime>.05,{state:p.state,status:p.status});};
try{
 for(const mode of ['selection','paragraph','sentence']){
  p.set('mode',mode);p.selectionContexts.set(r,{text:'travel to the brain.',pageIndex:1});
  await p.speak('travel to the brain.',r);
  const saved=JSON.parse(p.get('progress.'+item.id));
  check(mode+' stores latest actual sentence location',saved.pageIndex===1&&saved.mode===mode&&saved.anchorOffset>0,{saved});
  p.set('mode','document');played=[];await p.startDocument(r,'resume');
  check('Full reading resumes from '+mode,played[0]==='Neural signals travel to the brain.'&&played.at(-1)==='This is the final sentence.',{played});
 }
 p.set('mode','document');p.syncSettings();played=[];const reading=p.startDocument(r,'begin');await waitPlaying();
 const generation=p.generation,win=r._internalReader._primaryView._iframeWindow,doc=win.document;
 const target=doc.querySelector('.textLayer span')||doc.body;
 target.dispatchEvent(new win.PointerEvent('pointerdown',{bubbles:true}));target.dispatchEvent(new win.MouseEvent('click',{bubbles:true}));win.dispatchEvent(new win.Event('scroll'));
 p.onSelection({doc:r._iframeWindow.document,reader:r,params:{annotation:{text:'This is another selection.',position:{pageIndex:2}}},append(){}});
 await Zotero.Promise.delay(450);
 check('Click, scroll and selection leave continuous reading intact',p.generation===generation&&p.state==='playing'&&!!p.audio);
 const root=p.panels.get(r).root,style=r._iframeWindow.getComputedStyle(root.querySelector('.pv-orb'));
 check('Floating mascot has no white disk or box shadow',style.backgroundColor==='rgba(0, 0, 0, 0)'&&style.boxShadow==='none',{background:style.backgroundColor,shadow:style.boxShadow});
 check('Reading mascot is distinct from ready mascot',root.dataset.state==='playing'&&!!root.querySelector('.pv-mascot-reading')&&r._iframeWindow.getComputedStyle(root.querySelector('.pv-mascot-reading')).opacity==='1');
 p.togglePause();check('Explicit pause freezes playback and changes icon state',p.state==='paused'&&p.audio.paused&&root.dataset.state==='paused');
 p.togglePause();await reading;check('Continuous reading reaches last sentence after interactions',played.at(-1)==='This is the final sentence.'&&p.state==='idle',{played});
 check('Ready icon restored on completion',root.dataset.state==='idle');
 const before=p.get('progress.'+item.id);await p.speak('Sample voice.',r,true);check('Voice sample does not change PDF progress',p.get('progress.'+item.id)===before);
 report.passed=true;return report;
}finally{p.playAudio=play;p.stop();p.set('mode','selection');p.set('rate',1);p.syncSettings();await IOUtils.writeUTF8(base+'/test-results/progress-integration.json',JSON.stringify(report,null,2));}
