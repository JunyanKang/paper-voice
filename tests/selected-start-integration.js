const p=PaperVoice,report={checks:[]},played=[],play=p.playAudio;
const positions=JSON.parse(await IOUtils.readUTF8(p.testPath('tests/selected-start-positions.json')));
const check=(name,ok,data={})=>{report.checks.push({name,ok,...data});if(!ok)throw Error(name);};
const open=async file=>{const item=await Zotero.Attachments.importFromFile({file:p.testPath('tests/'+file)}),r=await Zotero.Reader.open(item.id);await r._initPromise;await Zotero.Promise.delay(1000);p.attachReader(r);return r;};
p.playAudio=function(...args){played.push({text:this.currentUnit.text,page:this.currentUnit.pageIndex});return play.apply(this,args);};
const select=(r,value)=>{let button;p.onSelection({reader:r,doc:r._iframeWindow.document,params:{annotation:value},append:b=>button=b});return button;};
try{
 p.stop();p.set('translation',false);p.set('rate',1.5);p.setMode('document');p.set('documentStart','selection');p.syncSettings();
 let r=await open('selected-start.pdf');
 check('Document start menu includes selected-position sentence start',!!p.panels.get(r).find('documentStart').querySelector('option[value="selection"]'));
 for(const key of ['letter','word','sentence']){
  played.length=0;const button=select(r,positions[key]);
  check('PDF selection geometry resolves '+key,Number.isInteger(p.selectionContexts.get(r).anchorOffset),{context:p.selectionContexts.get(r)});
  if(key==='letter'){
   check('Selection popup offers sentence-start continuous reading',button.textContent.includes('从此句开始连读'));
   button.click();for(let i=0;i<300&&p.state!=='idle'&&p.state!=='error';i++)await Zotero.Promise.delay(100);
  }else await p.startDocument(r,'selection');
  check('Selecting '+key+' skips the earlier duplicate and reads from the complete Beta sentence to the end',p.state==='idle'&&played.map(x=>x.text).join('|')==='Beta cells detect light.|Final cells preserve signals.',{played:played.slice(),status:p.status});
 }
 played.length=0;r=await open('selected-cross-column.pdf');select(r,positions.column);await p.startDocument(r,'selection');
 check('Selecting the right-column continuation rewinds to the sentence beginning in the left column',played[0]?.text==='The retinal cells collect light and guide it toward the photoreceptors'&&played[1]?.text.startsWith('while preserving'),{first:played.slice(0,2)});

 played.length=0;r=await open('cross-page-sentence.pdf');await r.navigate({pageIndex:1});await Zotero.Promise.delay(600);select(r,positions.page);await p.startDocument(r,'selection');
 check('Selecting on page two starts at the sentence beginning on page one and continues across pages',played.length===2&&played[0].page===0&&played[1].page===1&&played[0].text.startsWith('The retinal'),{played:played.slice()});
 played.length=0;const other=await open('selected-start.pdf');await p.startDocument(other,'selection');
 check('A different PDF without a selection prompts for selection instead of borrowing another document position',played.length===0&&p.status.includes('请先'));
 report.passed=true;return report;
}finally{p.playAudio=play;p.stop();p.set('rate',1);p.setMode('selection');p.set('documentStart','begin');p.syncSettings();await IOUtils.writeUTF8(p.testPath('test-results/selected-start.json'),JSON.stringify(report,null,2));}
