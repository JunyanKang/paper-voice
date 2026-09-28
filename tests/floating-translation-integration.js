const p=PaperVoice,report={checks:[]};const check=(name,ok,details={})=>{report.checks.push({name,ok,...details});if(!ok)throw Error(name);};
const open=async file=>{const item=await Zotero.Attachments.importFromFile({file:p.testPath('tests/'+file)}),r=await Zotero.Reader.open(item.id);await r._initPromise;await Zotero.Promise.delay(1000);p.attachReader(r);return r;};
try{
 p.stop();p.set('translation',true);let r=await open('follow.pdf');
 const unit={text:'Cells act as guides, i.e., optical fibers, and/or light collectors, e.g. Müller cells.',pageIndex:0};
 await p.highlightSentence(r,unit,p.generation);await Zotero.Promise.delay(400);
 const translated='细胞充当光学纤维或光收集器，例如米勒细胞。';p.showTranslation(r,unit,translated,'腾讯交互翻译 · 免费通道');await Zotero.Promise.delay(400);
 let c=p.caption,fr=c.frame.getBoundingClientRect(),box=c.box.getBoundingClientRect(),match=p.findSentence(r,unit),last=match.rects.at(-1);
 check('Caption contains only the translation, without repeated English',c.box.textContent===translated);
 check('Available whitespace displays translation immediately below the original',c.inline&&c.box.dataset.placement==='below-source'&&Math.abs(box.top-fr.top-last.bottom-8)<3,{placement:c.box.dataset.placement,sourceBottom:last.bottom,captionTop:box.top-fr.top});
 const container=r._internalReader._primaryView._iframeWindow.PDFViewerApplication.pdfViewer.container,start=box.top,scroll=container.scrollTop;
 container.scrollTop=scroll+45;await Zotero.Promise.delay(250);box=c.box.getBoundingClientRect();
 check('Floating translation follows PDF scrolling instead of staying at screen bottom',Math.abs((start-box.top)-45)<3,{before:start,after:box.top});
 p.hideTranslation();r=await open('fixture.pdf');const dense={text:'The human retina transforms light into neural signals.',pageIndex:0};
 const frame=r._internalReader._primaryView._iframe,originalWidth=frame.style.width,originalHeight=frame.style.height,height=frame.getBoundingClientRect().height;
 p.showTranslation(r,dense,'人类视网膜将光转化为神经信号。这段译文沿原句位置悬浮显示，不会重复英文，也不会盖住后面的正文。','Google 翻译 · 免费通道');await Zotero.Promise.delay(600);
 c=p.caption;fr=frame.getBoundingClientRect();box=c.box.getBoundingClientRect();last=p.findSentence(r,dense).rects.at(-1);
 check('Dense PDF displays the translation directly below the current sentence',c.inline&&box.left>=fr.left&&box.right<=fr.right&&Math.abs(box.top-fr.top-last.bottom-8)<3,{sourceBottom:last.bottom,captionTop:box.top-fr.top,captionLeft:box.left,frameRight:fr.right});
 check('Overlay preserves the full reader width and height without a sidebar or bottom strip',Math.abs(fr.height-height)<1&&frame.style.width===originalWidth&&c.box.style.bottom==='');
 const layer=p.findSentence(r,dense).page.querySelector('.textLayer'),parent=layer.parentElement,next=layer.nextSibling;
 layer.remove();p.positionTranslation(c);check('Temporarily missing PDF text layer hides the stale translation',c.box.style.visibility==='hidden');
 parent.insertBefore(layer,next);for(let i=0;i<40&&c.box.style.visibility!=='visible';i++)await Zotero.Promise.delay(75);
 check('Rebuilt PDF text layer automatically restores the anchored translation',c.box.style.visibility==='visible');
 const width=frame.style.width,node=c.box;p.showTranslation(r,{text:'Photoreceptors and glial cells cooperate during development.',pageIndex:0},'感光细胞和胶质细胞在发育过程中相互协作。','腾讯');await Zotero.Promise.delay(200);
 check('Sentence changes reuse the floating card without resizing the PDF',p.caption.box===node&&frame.style.width===width&&p.caption.box.textContent==='感光细胞和胶质细胞在发育过程中相互协作。');
 p.hideTranslation();check('Turning translation off restores the exact original reader size',frame.style.width===originalWidth&&frame.style.height===originalHeight&&!p.caption);
 report.passed=true;return report;
}finally{p.stop();p.set('translation',false);p.syncSettings();await IOUtils.writeUTF8(p.testPath('test-results/floating-translation.json'),JSON.stringify(report,null,2));}
