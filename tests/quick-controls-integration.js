const p=PaperVoice,r=Zotero.Reader._readers.at(-1),report={checks:[]},out=PaperVoice.testPath('test-results/quick-controls.json');
const check=(name,ok,detail={})=>{report.checks.push({name,ok,...detail});if(!ok)throw Error(name);};
p.stop();p.set('mode','paragraph');p.set('repeat',0);p.set('translation',false);p.set('translationProvider','tencenttransmart');p.set('translationTarget','zh-Hans');p.syncSettings();
const speech=p.speak('The human retina transforms light into neural signals.',r);const panel=p.panels.get(r);panel.panel.hidden=true;
try{
 for(let i=0;i<100&&p.state!=='playing';i++)await Zotero.Promise.delay(100);
 check('Installed default engine generates and plays speech',p.state==='playing'&&p.get('enginePath','')==='', {root:p.engineRoot()});
 p.togglePause();p.toggleTranslation(true);
 for(let i=0;i<160&&(!p.caption||p.caption.box.textContent.includes('正在翻译'));i++)await Zotero.Promise.delay(100);
 check('Turning translation on mid-play immediately translates current sentence',p.caption&&p.caption.box.textContent.includes('神经'),{caption:p.caption?.box.textContent});
 check('Mini toggle and setting stay synchronized',panel.action('quickTranslate').getAttribute('aria-pressed')==='true'&&panel.find('translation').checked);
 p.set('translationTarget','ja');p.toggleTranslation(true);
 for(let i=0;i<160&&(!p.caption||p.caption.box.textContent.includes('正在翻译'));i++)await Zotero.Promise.delay(100);
 check('Language change replaces current caption',/[ぁ-んァ-ン]/.test(p.caption?.box.textContent||''),{caption:p.caption?.box.textContent});
 p.toggleTranslation(false);check('Turning translation off clears caption and synchronizes controls',!p.caption&&!panel.find('translation').checked&&panel.action('quickTranslate').getAttribute('aria-pressed')==='false');
 p.set('translationTarget','zh-Hans');p.togglePause();await Zotero.Promise.delay(250);check('Audio resumes after translation changes',p.state==='playing'&&p.audio.currentTime>0);
 p.stop();await speech;check('Stop always releases audio and caption',!p.audio&&!p.caption&&p.state==='idle');
 report.passed=true;return report;
}finally{p.stop();p.set('mode','selection');p.set('repeat',2);p.set('translation',false);p.set('translationTarget','zh-Hans');p.syncSettings();await IOUtils.writeUTF8(out,JSON.stringify(report,null,2));}
