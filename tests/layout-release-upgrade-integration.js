// Run after v1.2.2 is public; never modify a user's normal Zotero profile.
const root=PaperVoice.testRoot,path=PaperVoice.testPath,out=path('test-results/layout-release-upgrade.json');
if(Services.dirsvc.get('ProfD',Components.interfaces.nsIFile).path!==root+'/test-profile')throw Error('Requires isolated QA profile');
const report={checks:[],suites:[]},check=async(name,ok,details={})=>{report.checks.push({name,ok,...details});await IOUtils.writeUTF8(out,JSON.stringify(report,null,2));if(!ok)throw Error(name);};
const {AddonManager}=ChromeUtils.importESModule('resource://gre/modules/AddonManager.sys.mjs');
PaperVoice.stop();await PaperVoice.checkForUpdates();
await check('Native updater discovers public v1.2.2',PaperVoice.updateState==='available'&&PaperVoice.updateInstall.version==='1.2.2');
await PaperVoice.installUpdate();
for(let i=0;i<200&&((await AddonManager.getAddonByID(PaperVoice.id)).version!=='1.2.2'||Zotero.PaperVoice?.dead);i++)await Zotero.Promise.delay(100);
await check('Downloaded production XPI is installed as v1.2.2',(await AddonManager.getAddonByID(PaperVoice.id)).version==='1.2.2');
const p=Zotero.PaperVoice;p.testRoot=root;p.testPath=path;
for(const file of ['layout-playback-integration.js','figure-reference-integration.js']){
 const code=await IOUtils.readUTF8(path('tests/'+file));
 const result=await new Function('Zotero','PaperVoice','IOUtils','Services','ChromeUtils','return (async()=>{'+code+'})()')(Zotero,p,IOUtils,Services,ChromeUtils);
 report.suites.push({file,...result});await check('Published plugin passes '+file,result.passed&&result.checks.every(x=>x.ok));
}
await p.checkForUpdates();await check('Published plugin reports the installed version as current',p.updateState==='current',{message:p.updateMessage});
report.passed=true;p.stop();await IOUtils.writeUTF8(out,JSON.stringify(report,null,2));return report;
