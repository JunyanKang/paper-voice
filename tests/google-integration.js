const p=PaperVoice,r=Zotero.Reader._readers.at(-1),report={provider:'Google',checks:[],results:[]};
const check=(name,ok,details={})=>{report.checks.push({name,ok,...details});};
const old={provider:p.get('translationProvider'),target:p.get('translationTarget'),enabled:p.get('translation',false)};
try{
 p.stop();p.set('translationProvider','google');p.translationCache.clear();
 const text='The results suggest an association, not a causal mechanism. Müller cells support retinal neurons.';
 for(const [target,pattern] of [['zh-Hans',/[不非]/],['zh-Hant',/[不非]/],['ja',/[ぁ-んァ-ン]/],['fr',/association|causal/i]]){
  p.set('translationTarget',target);const started=Date.now();
  try{const result=await p.translate(text);report.results.push({target,...result,ms:Date.now()-started});check('Google returns '+target,pattern.test(result.text),{source:result.source});}
  catch(e){report.results.push({target,error:String(e),ms:Date.now()-started});check('Google returns '+target,false);}
 }
 p.set('translation',false);p.set('mode','paragraph');p.set('repeat',0);p.set('translationProvider','tencenttransmart');p.set('translationTarget','zh-Hans');p.syncSettings();
 const speech=p.speak('The human retina transforms light into neural signals.',r);
 for(let i=0;i<150&&p.state!=='playing';i++)await Zotero.Promise.delay(100);
 check('Local reading remains playable before Google switch',p.state==='playing');p.togglePause();
 const panel=p.panels.get(r);panel.find('provider').value='google';panel.find('provider').onchange({target:panel.find('provider')});p.toggleTranslation(true);
 for(let i=0;i<290&&(!p.caption||p.caption.box.textContent.includes('正在翻译'));i++)await Zotero.Promise.delay(100);
 const caption=p.caption?.box.textContent||'';check('Switching to Google during narration renders Chinese caption',caption.includes('Google')&&/[神经經]/.test(caption),{caption});
 p.stop();await speech;report.passed=report.checks.every(x=>x.ok);return report;
}finally{p.stop();p.set('translationProvider',old.provider);p.set('translationTarget',old.target);p.set('translation',old.enabled);p.set('mode','selection');p.set('repeat',2);p.syncSettings();await IOUtils.writeUTF8(p.testPath('test-results/google-integration.json'),JSON.stringify(report,null,2));}
