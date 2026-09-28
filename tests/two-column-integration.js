const p=PaperVoice,report={checks:[]};
const check=(name,ok,details={})=>{report.checks.push({name,ok,...details});if(!ok)throw Error(name);};
const full='The retinal cells collect light and guide it toward the photoreceptors while preserving the spatial pattern across the neural tissue.';
const left='The retinal cells collect light and guide it toward the photoreceptors',right='while preserving the spatial pattern across the neural tissue.';
const unit={text:full,sentenceText:full,pageIndex:0};
try{
 p.stop();p.set('translation',true);
 const item=await Zotero.Attachments.importFromFile({file:p.testPath('tests/two-column.pdf')}),r=await Zotero.Reader.open(item.id);await r._initPromise;await Zotero.Promise.delay(1200);p.attachReader(r);
 const win=r._internalReader._primaryView._iframeWindow,viewer=win.PDFViewerApplication.pdfViewer;
 viewer.currentScaleValue='page-width';await Zotero.Promise.delay(1000);
 await p.highlightSentence(r,unit,p.generation);await Zotero.Promise.delay(600);
 p.showTranslation(r,unit,'视网膜细胞收集光线并将其引向感光细胞，同时保持神经组织中的空间图案。');await Zotero.Promise.delay(250);
 let match=p.findSentence(r,unit),blocks=p.readingBlocks(match),c=p.caption,fr=c.frame.getBoundingClientRect(),box=c.box.getBoundingClientRect();
 check('Real PDF sentence is detected in two distinct columns',blocks.length===2,{blocks:blocks.map(b=>({left:b.left,right:b.right,top:b.top,bottom:b.bottom}))});
 check('Cross-column caption follows the left source, not the final right rectangle',c.box.style.visibility==='visible'&&Math.abs(box.left-fr.left-blocks[0].left)<3&&Math.abs(box.top-fr.top-blocks[0].bottom-8)<3,{captionLeft:box.left-fr.left,captionTop:box.top-fr.top});
 check('Translation card does not span the gutter into the other column',box.right-fr.left<blocks[1].left);
 check('Visible source text remains highlighted',p.sentenceHighlight.markers.length>0);
 const before=box.top;viewer.container.scrollTop+=35;await Zotero.Promise.delay(250);box=c.box.getBoundingClientRect();
 check('Cross-column caption follows scrolling without disappearing',c.box.style.visibility==='visible'&&Math.abs(before-box.top-35)<3);
 const continuation={text:right,sentenceText:full,pageIndex:0};await p.highlightSentence(r,continuation,p.generation);await Zotero.Promise.delay(650);p.showTranslation(r,continuation,'同时保持神经组织中的空间图案。');await Zotero.Promise.delay(150);
 c=p.caption;fr=c.frame.getBoundingClientRect();box=c.box.getBoundingClientRect();match=p.findSentence(r,continuation);
 check('The next spoken chunk moves the translation to the right column',c.box.style.visibility==='visible'&&Math.abs(box.left-fr.left-match.rects[0].left)<3&&Math.abs(box.top-fr.top-match.rects.at(-1).bottom-8)<3);
 // Real audio must finish with the cross-column sentence, without losing either half.
 p.set('translation',false);p.set('mode','selection');await p.speak(full,r);
 check('Real cross-column sentence completes audio playback',p.state==='idle'&&p.status.includes('完成'),{status:p.status});
 report.passed=true;return report;
}finally{p.stop();p.set('translation',false);p.syncSettings();await IOUtils.writeUTF8(p.testPath('test-results/two-column.json'),JSON.stringify(report,null,2));}
