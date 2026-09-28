const p=PaperVoice,report={bridgeAvailable:!!Zotero.PDFTranslate?.api?.translate,checks:[]},path=PaperVoice.testRoot+'/test-results/translation-matrix.json';
try{
 for(const provider of ['tencenttransmart','bing','google'])for(const target of ['zh-Hans','zh-Hant','ja','ko','fr','de','es','ru']){
  p.set('translationProvider',provider);p.set('translationTarget',target);
  try{const result=await p.translate('The retina detects light.');report.checks.push({provider,target,ok:!!result.text,...result});}
  catch(e){report.checks.push({provider,target,ok:provider==='tencenttransmart'&&target==='zh-Hant',expectedUnsupported:provider==='tencenttransmart'&&target==='zh-Hant',error:String(e)});}
  await IOUtils.writeUTF8(path,JSON.stringify(report,null,2));
 }
 report.passed=report.checks.every(x=>x.ok);return report;
}finally{p.set('translationProvider','tencenttransmart');p.set('translationTarget','zh-Hans');p.set('translation',false);p.syncSettings();await IOUtils.writeUTF8(path,JSON.stringify(report,null,2));}
