(async () => {
 const base=__PAPER_VOICE_TEST_ROOT__;PaperVoice.testRoot=base;PaperVoice.testPath=relative=>PathUtils.join(base,...relative.replace(/^test-results\//,'test-results/native/').split('/'));
 const mutedRunner=Zotero.isWin&&Services.env.get('PAPER_VOICE_HEADLESS_AUDIO')==='1';
 const report={version:Zotero.version,audioOutput:mutedRunner?'native media muted; CI runner has no physical audio device':'system audio output',checks:[]};
 const check=(name,ok,details={})=>{report.checks.push({name,ok,...details});if(!ok)throw new Error(name);};
 try {
  await IOUtils.writeUTF8(PaperVoice.testPath('test-results/harness-stage.txt'),'await initialization');
  await Zotero.initializationPromise;
  await Zotero.uiReadyPromise;
  await Zotero.Libraries.get(Zotero.Libraries.userLibraryID).waitForDataLoad('item');
  if(mutedRunner){
   // Exercise the real decoder, clock, pause/end events without a nonexistent speaker.
   // This override exists only in the test XPI, never in the distributed plugin.
   const win=PaperVoice.host,NativeAudio=win.Audio;
   win.Audio=function(src){const audio=new NativeAudio(src);audio.muted=true;return audio;};
  }
  await IOUtils.writeUTF8(PaperVoice.testPath('test-results/harness-stage.txt'),'opening fixture');
  const item=await Zotero.Attachments.importFromFile({file:PaperVoice.testPath('tests/fixture.pdf')});
  const reader=await Zotero.Reader.open(item.id);
  await reader._initPromise; await Zotero.Promise.delay(1800);
  PaperVoice.set('enginePath','');PaperVoice.set('mode','selection');PaperVoice.set('translation',false);PaperVoice.attachReader(reader); PaperVoice.showPanel(reader);
  check('Reader toolbar attached',!!reader._iframeWindow.document.querySelector('[data-paper-voice="toolbar"]'));
  check('Panel six voice choices',reader._iframeWindow.document.querySelectorAll('[data-field="voice"] option').length===6);
  PaperVoice.syncSettings();await PaperVoice.ensureWorker();check('Packaged worker starts in Zotero',!!PaperVoice.process);
  const speech=PaperVoice.speak('The human retina transforms light into neural signals. Photoreceptors and glial cells cooperate during development.',reader);
  for(let i=0;i<100 && PaperVoice.state==='loading';i++)await Zotero.Promise.delay(100);
  check('Audio playback started',PaperVoice.state==='playing' && !!PaperVoice.audio,{state:PaperVoice.state,status:PaperVoice.status});
  await Zotero.Promise.delay(350);const before=PaperVoice.audio.currentTime;
  PaperVoice.togglePause();await Zotero.Promise.delay(400);
  check('Pause freezes audio',PaperVoice.state==='paused' && PaperVoice.audio.paused && Math.abs(PaperVoice.audio.currentTime-before)<.1);
  PaperVoice.togglePause();await Zotero.Promise.delay(400);
  check('Resume advances audio',PaperVoice.state==='playing' && PaperVoice.audio.currentTime>before);
  PaperVoice.stop();await speech;check('Stop releases audio',PaperVoice.audio===null && PaperVoice.state==='idle');
  await PaperVoice.speak('A short sentence for completion.',reader);
  check('Playback completes',PaperVoice.state==='idle' && PaperVoice.status.includes('完成'));
  report.passed=true;
 }catch(e){report.passed=false;report.error=String(e);report.stack=e.stack;}
 await IOUtils.writeUTF8(PaperVoice.testPath('test-results/zotero-integration.json'),JSON.stringify(report,null,2));
 let last='';
 Zotero.getMainWindow().setInterval(async()=>{
  const path=PaperVoice.testPath('test-results/test-command.js');if(!(await IOUtils.exists(path)))return;
  const code=await IOUtils.readUTF8(path);if(code===last)return;last=code;
  try{const value=await new Function('Zotero','PaperVoice','IOUtils','Services','ChromeUtils','return (async()=>{'+code+'})()')(Zotero,PaperVoice,IOUtils,Services,ChromeUtils);await IOUtils.writeUTF8(PaperVoice.testPath('test-results/test-command-result.json'),JSON.stringify({ok:true,value},null,2));}
  catch(e){await IOUtils.writeUTF8(PaperVoice.testPath('test-results/test-command-result.json'),JSON.stringify({ok:false,error:String(e),stack:e.stack},null,2));}
 },800);
})();
