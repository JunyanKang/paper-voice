const p=PaperVoice,report={checks:[]},positions=JSON.parse(await IOUtils.readUTF8(p.testPath('tests/selected-start-positions.json')));
const item=await Zotero.Attachments.importFromFile({file:p.testPath('tests/selected-start.pdf')}),r=await Zotero.Reader.open(item.id);await r._initPromise;await Zotero.Promise.delay(700);p.attachReader(r);
const viewer=r._internalReader._primaryView._iframeWindow.PDFViewerApplication.pdfViewer;
try{
 for(const scale of [0.75,1.5,2]){
  viewer.currentScaleValue=String(scale);await Zotero.Promise.delay(800);
  const offset=p.selectionAnchor(r,positions.letter.position);report.checks.push({scale,offset,ok:offset===25});
 }
 report.passed=report.checks.every(c=>c.ok);
}finally{viewer.currentScaleValue='page-width';await IOUtils.writeUTF8(p.testPath('test-results/selected-zoom.json'),JSON.stringify(report,null,2));}
return report;
