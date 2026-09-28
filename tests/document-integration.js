const base=PaperVoice.testRoot,p=PaperVoice,report={checks:[]};
const check=async(name,ok,data={})=>{report.checks.push({name,ok,...data});await IOUtils.writeUTF8(PaperVoice.testPath('test-results/document-integration.json'),JSON.stringify(report,null,2));if(!ok)throw Error(name);};
const item=await Zotero.Attachments.importFromFile({file:PaperVoice.testPath('tests/multipage.pdf')}),r=await Zotero.Reader.open(item.id);await r._initPromise;
for(let n=0;n<100&&!r._internalReader?._primaryView?._iframeWindow?.PDFViewerApplication?.pdfDocument;n++)await Zotero.Promise.delay(100);
p.attachReader(r);p.set('translation',false);p.set('mode','document');p.set('rate',1.6);p.syncSettings();
let events=[];const play=p.playAudio;p.playAudio=function(a,r,g,m){events.push({text:this.currentSentence,page:this.currentUnit.pageIndex});return play.call(this,a,r,g,m);};
try{
 await p.startDocument(r,'begin');await check('Real PDF plays all three pages through final sentence',p.state==='idle'&&events.length===6&&events.map(x=>x.page).join(',')==='0,0,1,1,2,2'&&events.at(-1).text==='This is the final sentence.',{events});
 await r.navigate({pageIndex:1});await Zotero.Promise.delay(700);events=[];
 await p.startDocument(r,'current');await check('Current-page start begins on page two',events.length===4&&events[0].page===1&&events.at(-1).page===2,{events});
 p.set('progress.'+item.id,JSON.stringify({pageIndex:1,unitInPage:1}));events=[];
 await p.startDocument(r,'resume');await check('Resume starts at saved sentence and completes remaining pages',events.length===3&&events[0].text==='Neural signals travel to the brain.'&&events.at(-1).page===2,{events});
 report.passed=true;return report;
}finally{p.playAudio=play;p.stop();p.set('rate',1);p.syncSettings();await IOUtils.writeUTF8(PaperVoice.testPath('test-results/document-integration.json'),JSON.stringify(report,null,2));}
