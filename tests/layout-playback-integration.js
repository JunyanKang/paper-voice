const p=PaperVoice,report={checks:[]},full='The retinal cells collect light and guide it toward the photoreceptors while preserving the spatial pattern across the neural tissue.';
const check=(name,ok,data={})=>{report.checks.push({name,ok,...data});if(!ok)throw Error(name);};
const translate=p.translate,remember=p.rememberPlayback,records=[],jobs=[],requests=[];
const open=async file=>{const item=await Zotero.Attachments.importFromFile({file:p.testPath('tests/'+file)}),r=await Zotero.Reader.open(item.id);await r._initPromise;await Zotero.Promise.delay(900);p.attachReader(r);return r;};
// Isolate layout from service availability; speech synthesis and media events stay real.
p.translate=async text=>{requests.push(text);return {text:'视网膜细胞收集光线并将其引向感光细胞，同时保持神经组织中的空间图案。',source:'定位测试固定译文'};};
p.rememberPlayback=function(progress){
 remember.call(this,progress);if(!progress)return;
 const {reader:r,unit}=progress;
 jobs.push((async()=>{await Zotero.Promise.delay(800);const win=r._internalReader._primaryView._iframeWindow,container=win.PDFViewerApplication.pdfViewer.container,match=p.findSentence(r,unit),rect=match?.rects[0],c=p.caption,fr=c?.frame.getBoundingClientRect(),box=c?.box.getBoundingClientRect();records.push({page:unit.pageIndex,text:unit.text,spoken:unit.spokenText,translation:unit.translationText,highlight:p.sentenceHighlight?.unit.text,scrollTop:container.scrollTop,scrollLeft:container.scrollLeft,visible:!!rect&&rect.top>=0&&rect.top<container.clientHeight&&rect.left>=0&&rect.left<container.clientWidth,captionVisible:c?.box.style.visibility==='visible'&&c?.box.style.opacity==='1',captionLeft:box?.left-fr?.left,sourceLeft:rect?.left,audioTime:p.audio?.currentTime});})());
};
try{
 p.stop();p.set('translation',true);p.set('rate',1.3);p.setMode('sentence');p.set('repeat',2);
 let r=await open('two-column.pdf');const viewer=r._internalReader._primaryView._iframeWindow.PDFViewerApplication.pdfViewer;viewer.currentScaleValue='2';await Zotero.Promise.delay(700);
 const playing=p.speak(full,r);for(let i=0;i<200&&p.state!=='playing';i++)await Zotero.Promise.delay(50);
 p.togglePause();const unit=p.currentUnit;await Zotero.Promise.delay(700);check('Pausing the left half does not prematurely move to the right half',p.state==='paused'&&p.currentUnit===unit);
 p.togglePause();await playing;await Promise.all(jobs);
 // A resume repeats the playing event for the same fragment; collapse adjacent duplicates.
 const distinct=records.filter((x,i)=>!i||x.text!==records[i-1].text);report.columns=distinct;
 check('Actual short-sentence playback crosses columns in both repeat cycles',distinct.length===4&&distinct[0].text.includes('collect')&&distinct[1].text.startsWith('while')&&distinct[2].text===distinct[0].text&&distinct[3].text===distinct[1].text);
 check('The right column triggers horizontal and vertical focus movement',distinct[1].scrollLeft>distinct[0].scrollLeft+40&&distinct[1].scrollTop<distinct[0].scrollTop-100,{positions:distinct});
 check('Each playing fragment and translation are visible at high zoom',distinct.every(x=>x.visible&&x.captionVisible));
 check('Highlight follows the current column instead of the entire cross-column sentence',distinct.every(x=>x.highlight===x.text));
 check('Both halves translate the same complete sentence',requests.every(t=>t===full)&&distinct.every(x=>x.translation===full));
 records.length=0;jobs.length=0;requests.length=0;p.setMode('selection');r=await open('cross-page-sentence.pdf');
 await p.speak(full,r);await Promise.all(jobs);report.selectedPages=records.slice();
 check('A selected sentence automatically continues onto page two during real playback',records.length===2&&records[0].page===0&&records[1].page===1,{positions:records});
 check('Selection highlights and captions follow onto the next page',records.every(x=>x.visible&&x.captionVisible&&x.highlight===x.text));
 check('A selected cross-page sentence keeps its complete translation',requests.every(t=>t===full));
 const saved=JSON.parse(p.get('progress.'+r.itemID,'{}'));check('Recent progress records the actually played second-page fragment',saved.pageIndex===1&&saved.text.startsWith('while'));
 records.length=0;jobs.length=0;requests.length=0;p.setMode('document');await p.startDocument(r);await Promise.all(jobs);report.documentPages=records.slice();
 check('Full-document playback preserves the cross-page sentence and follows both pages',records.length===2&&records[0].page===0&&records[1].page===1&&records.every(x=>x.visible&&x.captionVisible&&x.translation===full),{positions:records});
 check('Document translation is requested with complete cross-page context',requests.every(t=>t===full));
 report.passed=true;return report;
}finally{p.translate=translate;p.rememberPlayback=remember;p.stop();p.set('translation',false);p.set('rate',1);p.set('repeat',2);p.setMode('selection');p.syncSettings();await IOUtils.writeUTF8(p.testPath('test-results/layout-playback.json'),JSON.stringify(report,null,2));}
