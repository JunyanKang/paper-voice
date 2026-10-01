var PaperVoiceScope;
async function startup({ rootURI, version }, reason) {
  await Zotero.initializationPromise;
  PaperVoiceScope = { Zotero, ChromeUtils, Services, IOUtils, PathUtils, Components };
  Services.scriptloader.loadSubScript(rootURI + 'vendor/tinyld.js', PaperVoiceScope);
  Services.scriptloader.loadSubScript(rootURI + 'core.js', PaperVoiceScope);
  Services.scriptloader.loadSubScript(rootURI + 'i18n.js', PaperVoiceScope);
  Services.scriptloader.loadSubScript(rootURI + 'panel-style.js', PaperVoiceScope);
  Services.scriptloader.loadSubScript(rootURI + 'panel.js', PaperVoiceScope);
  Services.scriptloader.loadSubScript(rootURI + 'translation.js', PaperVoiceScope);
  Services.scriptloader.loadSubScript(rootURI + 'updater.js', PaperVoiceScope);
  Services.scriptloader.loadSubScript(rootURI + 'themes.js', PaperVoiceScope);
  Services.scriptloader.loadSubScript(rootURI + 'main.js', PaperVoiceScope);
  const resources=Services.io.getProtocolHandler('resource').QueryInterface(Components.interfaces.nsIResProtocolHandler);
  resources.setSubstitutionWithFlags('paper-voice',Services.io.newURI(rootURI),resources.ALLOW_CONTENT_ACCESS);
  PaperVoiceScope.PaperVoice.version = version;
  PaperVoiceScope.PaperVoice.assetURI = 'resource://paper-voice/assets/';
  PaperVoiceScope.PaperVoice.cssText = PaperVoiceScope.PaperVoiceStyle;
  PaperVoiceScope.PaperVoice.initTranslation();
  await PaperVoiceScope.PaperVoice.start();
}
async function shutdown(data, reason) {
  if (PaperVoiceScope) await PaperVoiceScope.PaperVoice.shutdown();
  PaperVoiceScope = null;
  Services.io.getProtocolHandler('resource').QueryInterface(Components.interfaces.nsIResProtocolHandler).setSubstitution('paper-voice',null);
}
function install() {}
function uninstall() {}
function onMainWindowLoad({ window }) { PaperVoiceScope?.PaperVoice.addWindow(window); }
function onMainWindowUnload({ window }) { PaperVoiceScope?.PaperVoice.removeWindow(window); }
