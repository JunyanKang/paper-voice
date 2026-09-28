const p=PaperVoice,report={checks:[]},out=p.testRoot+'/test-results/citation-highlight.json';
const check=(name,ok,details={})=>{report.checks.push({name,ok,...JSON.parse(JSON.stringify(details))});if(!ok)throw Error(name);};
const item=await Zotero.Attachments.importFromFile({file:p.testRoot+'/tests/citations.pdf'}),r=await Zotero.Reader.open(item.id);await r._initPromise;await Zotero.Promise.delay(1000);p.attachReader(r);
p.stop();p.set('mode','document');p.set('translation',false);p.set('rate',1.6);p.syncSettings();
const generated=[],played=[],synth=p.synthesize,play=p.playAudio;
p.synthesize=function(text,...args){generated.push(text);return synth.call(this,text,...args);};
p.playAudio=function(...args){played.push({text:this.currentSentence,markers:this.sentenceHighlight?.markers.length||0,top:this.sentenceHighlight?.markers[0]?.getBoundingClientRect().top,translationVisible:!!this.caption});return play.apply(this,args);};
try{
 await p.startDocument(r);
 check('Spoken text skips PDF superscript, numeric and author-year citations',generated.length===3&&!generated.some(x=>/¹|¹²|\[2|Smith|2020/.test(x))&&generated[0]==='Retinal development requires glia.',{generated});
 check('Scientific gene, numeric interval and units remain audible',generated[1].includes('SOX2')&&generated[2].includes('[0, 1]')&&generated[2].includes('20 mm2'));
 check('Every sentence receives background highlight with translation disabled',played.length===3&&played.every(x=>x.markers>0&&!x.translationVisible),{played});
 check('Highlight moves to the next sentence',new Set(played.map(x=>Math.round(x.top))).size===3);
 check('Natural completion removes temporary highlight',!p.sentenceHighlight);
 p.set('mode','selection');p.selectedPage=0;
 const speech=p.speak('Retinal development¹² requires glia [2-4].',r);
 for(let i=0;i<120&&p.state!=='playing';i++)await Zotero.Promise.delay(100);
 p.togglePause();check('Pause preserves highlighted sentence',p.state==='paused'&&p.sentenceHighlight?.markers.length>0);
 p.stop();await speech;check('Stop clears all temporary highlight nodes',!p.sentenceHighlight&&!r._internalReader._primaryView._iframeWindow.document.querySelector('[data-paper-voice="sentence-highlight"]'));
 report.passed=true;return report;
}finally{p.synthesize=synth;p.playAudio=play;p.stop();p.set('rate',1);p.set('mode','selection');p.syncSettings();await IOUtils.writeUTF8(out,JSON.stringify(report,null,2));}
