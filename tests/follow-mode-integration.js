const p=PaperVoice,report={checks:[]};
const check=(name,ok,data={})=>{report.checks.push({name,ok,...JSON.parse(JSON.stringify(data))});if(!ok)throw Error(name);};
const item=await Zotero.Attachments.importFromFile({file:p.testPath('tests/follow.pdf')}),r=await Zotero.Reader.open(item.id);await r._initPromise;await Zotero.Promise.delay(1000);p.attachReader(r);
p.stop();p.set('translation',false);p.set('rate',1.6);p.setMode('document');p.syncSettings();
const play=p.playAudio,synth=p.synthesize,spoken=[],positions=[];
p.synthesize=function(text,...args){spoken.push(text);return synth.call(this,text,...args);};
p.playAudio=async function(...args){
 await Zotero.Promise.delay(500);
 const unit=this.currentUnit,match=this.findSentence(r,unit),win=r._internalReader._primaryView._iframeWindow,container=win.PDFViewerApplication.pdfViewer.container;
 positions.push({text:unit.text,page:unit.pageIndex,scrollTop:container.scrollTop,top:match?.rects[0].top-container.getBoundingClientRect().top,height:container.clientHeight,markers:this.sentenceHighlight?.markers.length||0});
 return play.apply(this,args);
};
try{
 await p.startDocument(r);
 report.playback={state:p.state,status:p.status,positions,spoken};
 check('User optical-fiber sentence excludes every author/year group after chunking',spoken.join(' ').includes('living optical fibers')&&!spoken.some(x=>/Franze|Agte|Labin|Zueva|2007|2011|2014/.test(x)),{spoken});
 check('Abbreviations and and/or are expanded before synthesis',spoken.some(x=>x.includes('that is')&&x.includes('and or')&&x.includes('for example')));
 check('All spoken positions are found and highlighted',positions.every(x=>Number.isFinite(x.top)&&x.markers>0),{positions});
 check('Reading focus follows content down the same page',new Set(positions.filter(x=>x.page===0).map(x=>Math.round(x.scrollTop))).size>=3);
 check('Reading advances onto the second page',positions.some(x=>x.page===1)&&positions.at(-1).text.includes('final sentence'));
 check('Spoken content stays near upper-middle viewport',positions.every(x=>x.top>=0&&x.top<x.height*.58),{positions});
 const panel=p.panels.get(r),buttons=Array.from(panel.root.querySelectorAll('[data-mode]'));
 check('Four labelled mode icons replace the mode dropdown',buttons.length===4&&!panel.root.querySelector('select[data-field="mode"]')&&buttons.every(x=>!!x.querySelector('img')&&!!x.getAttribute('aria-label')));
 panel.root.querySelector('[data-mode="selection"]').click();const modes=[];
 for(let i=0;i<4;i++){panel.action('quickMode').click();modes.push(p.get('mode'));check('Active mode marker stays synchronized '+i,buttons.filter(x=>x.getAttribute('aria-pressed')==='true').length===1&&panel.root.querySelector('[aria-pressed="true"][data-mode]').dataset.mode===p.get('mode'));}
 check('Floating mode button cycles through all four modes',modes.join(',')==='document,paragraph,sentence,selection');
 check('Mode cycle sits immediately left of playback control',panel.action('quickMode').nextElementSibling===panel.action('quickPause'));
 await p.loadUpdateSettings();await p.checkForUpdates();check('Native Zotero updater can read the public GitHub manifest',p.updateState==='current'||p.updateState==='available',{state:p.updateState,message:p.updateMessage});
 panel.panel.hidden=false;panel.action('settings').click();await Zotero.Promise.delay(200);
 const box=panel.panel.getBoundingClientRect();check('Settings fit in viewport without a panel scrollbar',box.top>=0&&box.bottom<=r._iframeWindow.innerHeight&&panel.panel.scrollHeight<=panel.panel.clientHeight,{top:box.top,bottom:box.bottom,viewport:r._iframeWindow.innerHeight,height:box.height});
 report.passed=true;return report;
}finally{p.playAudio=play;p.synthesize=synth;p.stop();p.set('rate',1);p.setMode('selection');p.syncSettings();await IOUtils.writeUTF8(p.testPath('test-results/follow-mode-integration.json'),JSON.stringify(report,null,2));}
