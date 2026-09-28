const p=PaperVoice,report={checks:[]},synth=p.synthesize,generated=[];
const check=(name,ok,data={})=>{report.checks.push({name,ok,...data});if(!ok)throw Error(name);};
p.synthesize=function(text,...args){generated.push(text);return synth.call(this,text,...args);};
try{
 p.stop();p.set('translation',false);p.setMode('document');p.set('rate',1.3);
 const item=await Zotero.Attachments.importFromFile({file:p.testPath('tests/figure-references.pdf')}),r=await Zotero.Reader.open(item.id);await r._initPromise;await Zotero.Promise.delay(900);p.attachReader(r);
 await p.startDocument(r);
 check('Real PDF figure, supplemental and extended-data references are excluded from audio',generated.length===3&&!generated.some(x=>/Fig|Table|Supplementary|Extended|S1|S2|2a/.test(x)),{generated});
 check('Scientific measurements and gene names are preserved',generated[2]==='The tissue (20 mm2) expresses SOX2.');
 check('All reference-filtered sentences complete real audio playback',p.state==='idle'&&p.status.includes('完成'));
 report.passed=true;return report;
}finally{p.synthesize=synth;p.stop();p.set('rate',1);p.setMode('selection');await IOUtils.writeUTF8(p.testPath('test-results/figure-references.json'),JSON.stringify(report,null,2));}
