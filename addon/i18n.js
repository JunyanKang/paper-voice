/* Interface language is independent of the language chosen for translations. */
var PaperVoiceI18n = (() => {
 const pairs = {
  '单击切换译文语言 · 双击关闭译文':'Click to switch language · Double-click to hide translation',
  '自动识别 PDF 语言':'Detect PDF language',
  '无法确定受支持的朗读语言，请在设置中手动选择英语、中文、日语或法语。':'Language could not be matched to an available voice. Select English, Chinese, Japanese or French in Settings.',
  '朗读语言':'Reading language','中文（普通话）':'Chinese (Mandarin)',
  '请下载最新版完整包，重新安装离线声音以启用多语言朗读。':'Download the latest full package and reinstall offline voices to enable multilingual reading.',
  '普通话 · 女声 Xiaobei':'Mandarin · Female Xiaobei','普通话 · 女声 Xiaoxiao':'Mandarin · Female Xiaoxiao',
  '普通话 · 男声 Yunxi':'Mandarin · Male Yunxi','普通话 · 男声 Yunjian':'Mandarin · Male Yunjian',
  '日本語 · 女声 Alpha':'Japanese · Female Alpha','日本語 · 女声 Tebukuro':'Japanese · Female Tebukuro',
  '日本語 · 男声 Kumo':'Japanese · Male Kumo','Français · 女声 Siwis':'French · Female Siwis',
  'Paper Voice · 免费离线自然朗读':'Paper Voice · Natural offline voices','Paper Voice 论文听读':'Paper Voice paper narration',
  '论文听读':'Listen to your papers','Paper Voice 朗读控制':'Paper Voice playback controls',
  '声音与翻译设置':'Voice and translation settings','收起朗读面板':'Close panel','朗读模式':'Reading mode',
  '划选即读':'Read selection','全文连读':'Continuous reading','段落循环':'Paragraph repeat','单句精听':'Sentence repeat',
  '划选':'Select','全文':'Document','段落':'Paragraph','单句':'Sentence',
  '上一段':'Previous paragraph','下一段':'Next paragraph','重读当前段':'Replay paragraph','重读当前句':'Replay sentence','1 次':'Once',
  '划选段中任意文字，朗读所在完整段落。':'Select any text in a paragraph to hear the whole paragraph.',
  '划选句中任意文字，朗读所在完整句子。':'Select any text in a sentence to hear the whole sentence.',
  '持续循环':'Keep repeating','循环次数':'Repeat count','循环':'Repeat','起点':'Start at','全文朗读起点':'Starting point',
  '从第 1 页':'First page','从当前页':'Current page','从上次进度':'Last position','从选定位置（句首）':'Selected sentence',
  '选择一段文字，留一点时间给耳朵。':'Select a passage. Make room to listen.',
  '上一句':'Previous sentence','下一句':'Next sentence','停止朗读':'Stop reading','停止 · Esc':'Stop · Esc',
  '开始朗读':'Read aloud','开始连读':'Start reading','继续上次':'Resume reading','继续':'Resume','暂停':'Pause',
  '免费离线朗读':'Free offline voices','声音与翻译':'Voice & translation','朗读声音':'Reading voice','声音设置':'Voice settings','声音':'Voice',
  '朗读语速':'Reading speed','语速':'Speed','划选后自动朗读':'Read selections automatically',
  '跟读译文':'Show translation','免费翻译服务':'Translation service','翻译服务':'Service','译文语言':'Translate into',
  '腾讯 · 大陆优先':'Tencent · China','微软 · 免费':'Microsoft · Free','Google · 海外':'Google · Global',
  '简体中文':'Simplified Chinese','繁體中文':'Traditional Chinese',
  '仅开启翻译时，将当前句和下一句发送至所选服务。Google 需网络可达。':'When enabled, the current and next sentences are sent to your chosen service. Google requires network access.',
  '试听当前声音':'Preview voice','自动更新':'Automatic updates','检查更新':'Check for updates','指南':'Guide','反馈':'Feedback','隐私':'Privacy',
  '切换朗读模式':'Switch reading mode','暂停或继续':'Pause or resume','切换跟读翻译':'Toggle translation','译文开关 · Option/Alt + T':'Translation · Option/Alt + T',
  '展开 Paper Voice 朗读面板':'Open Paper Voice','Paper Voice · 点击展开听读':'Paper Voice · Open controls','Paper Voice 书页精灵':'Paper Voice mascot',
  '返回播放控制':'Back to playback','界面语言':'Interface language','跟随 Zotero':'Follow Zotero',
  '声音已保存，下次开始朗读生效':'Voice saved. Applies when you start reading again.',
  '语速已更新，下次开始朗读生效':'Speed saved. Applies when you start reading again.',
  '拖选 PDF 文字，松开鼠标即可朗读':'Select text in a PDF to start listening.',
  '请先打开一篇 PDF，再点击阅读器右上角的「听读」。':'Open a PDF, then click Listen in the reader toolbar.',
  '听读':'Listen','▶ 从此句开始连读':'▶ Read from this sentence','▶ 自然朗读':'▶ Read aloud',
  '划选字母或词，从所在句句首一直读到文末。':'Select a letter or word. Read from its sentence to the end.',
  '拖选文字，松开即读。悬浮按钮随时暂停。':'Select text to listen. Pause with the floating controls.',
  '按页连续听读，可选择起点或继续上次进度。':'Read across pages. Choose a starting point or resume.',
  '划选一个段落，按设定次数反复朗读。':'Select a paragraph and choose how many times to repeat it.',
  '划选一段文字，逐句循环；用左右按钮切换。':'Repeat one sentence at a time. Use the arrows to move on.',
  '请先在这篇 PDF 中划选一段文字':'Select some English text in this PDF first.',
  '正在读取 PDF 正文…':'Reading PDF text…','当前阅读器未就绪，请等待 PDF 加载完成':'Please wait for the PDF to finish loading.',
  '请先在这篇 PDF 中划选字母、单词或句子，再从选定位置开始':'Select a letter, word or sentence in this PDF first.',
  '未能准确定位选区，请在 PDF 中重新划选后再开始':'Unable to locate the selection. Select it again in the PDF.',
  'PDF 没有可提取文字，请先进行 OCR 文字识别':'This PDF has no extractable text. Please run OCR first.',
  '尚未安装离线声音。请打开 Paper Voice 安装助手，完成声音安装后重试。':'Offline voices are not installed. Open the Paper Voice installer, install voices and try again.',
  '语音引擎启动超时，请重试':'Voice engine startup timed out. Please try again.',
  'Paper Voice 已停用':'Paper Voice is disabled.','语音引擎已退出，请点击重读重新启动':'The voice engine stopped. Start reading again to restart it.',
  '本段语音生成超时，请选择较短段落后重试':'Voice generation timed out. Try a shorter passage.',
  '语音引擎已重置，请重试':'The voice engine was reset. Please try again.',
  '选区过长，请分段选择或使用全文连读':'Selection too long. Select a smaller passage or use continuous reading.',
  '选区仅包含引文标记，无需朗读':'This selection contains only citation markers.',
  '请选择可识别的正文；扫描 PDF 需要先做文字识别':'Select text. Scanned PDFs need OCR first.',
  '正在定位所选文字…':'Locating your selection…','正在准备自然语音…':'Preparing voice…','正在翻译…':'Translating…',
  '译文暂不可用':'Translation unavailable','翻译暂不可用':'Translation unavailable',
  '翻译暂时不可用，可切换服务或译文语言。':'Translation unavailable. Try another service or language.',
  '朗读完成 · 可以继续划选下一段':'Finished · Select another passage to continue',
  '无法播放音频，请检查音频输出后重试':'Unable to play audio. Check your audio output and try again.',
  '已暂停，点击继续':'Paused · Press Resume to continue','正在朗读':'Reading','已停止 · 拖选下一段即可朗读':'Stopped · Select another passage to listen',
  '腾讯通道暂不提供繁体中文，请选择微软或 Google':'For Traditional Chinese, choose Microsoft or Google.',
  '微软翻译':'Microsoft Translator','腾讯交互翻译':'Tencent Translator','Google 翻译':'Google Translate','翻译超时':'Translation timed out',
  'Google 暂时连接失败，请重试或切换腾讯 / 微软翻译':'Cannot reach Google. Try again or switch to Tencent / Microsoft.',
  '免费翻译服务暂不可用，请更换服务或译文语言':'Translation service unavailable. Try another service or language.',
  '免费通道':'Free service','通过 GitHub 获取插件更新':'Plugin updates from GitHub','安装更新':'Install update','正在检查':'Checking…','正在更新':'Updating…',
  'Zotero 的插件更新已关闭，可手动检查':'Zotero automatic updates are off. You can check manually.',
  '自动更新已开启 · 由 Zotero 定期检查':'Automatic updates on · Managed by Zotero',
  '自动更新已关闭 · 可随时手动检查':'Automatic updates off · Check manually anytime',
  '暂时无法读取更新设置':'Unable to read update settings.',
  '未能保存更新设置，请重试':'Unable to save update settings. Please try again.',
  '正在连接 GitHub…':'Connecting to GitHub…','发现新版本 ':'New version: ',' · 点击安装更新':' · Select Install update',
  '已是最新版本 ':'Up to date: ','无法检查 GitHub 更新，请稍后重试或查看发布页':'Cannot reach GitHub. Try later or visit Releases.',
  '正在下载并校验插件…':'Downloading and verifying the plugin…',
  '更新未完成，原版本保留，请重新检查':'Update incomplete. Your installed version is unchanged. Check again.',
  '正在下载更新 ':'Downloading update: ','更新已安装':'Update installed',
  '；点击切换为':'; switch to ','关闭跟读翻译':'Hide translation','开启跟读翻译':'Show translation',
  '美音 · 女声':'US · Female','美音 · 男声':'US · Male','英音 · 女声':'UK · Female','英音 · 男声':'UK · Male'
 };
 const keys=Object.keys(pairs).sort((a,b)=>b.length-a.length),sources=new WeakMap();
 function translate(value,language){
  if(language!=='en'||!value)return value;
  let s=String(value).replace(/正在读取第 (\d+)\/(\d+) 页…/g,'Loading page $1/$2…')
   .replace(/朗读完成 · (\d+) 页无文字，已跳过/g,'Finished · Skipped $1 pages without text')
   .replace(/第 (\d+)\/(\d+) 句/g,'Sentence $1/$2').replace(/第 (\d+) 页/g,'Page $1')
   .replace(/第 (\d+)(\/\d+)? 遍/g,'Repeat $1$2').replace(/(?<!\d)1 次/g,'Once').replace(/(\d+) 次/g,'$1 times');
  for(const key of keys)s=s.split(key).join(pairs[key]);
  return s;
 }
 function apply(root,language){
  const update=(node,key,value,set)=>{
   let records=sources.get(node);if(!records){records=new Map();sources.set(node,records);}
   const old=records.get(key),source=old&&old.output===value?old.source:value,output=translate(source,language);
   records.set(key,{source,output});if(output!==value)set(output);
  };
  function visit(node){
   if(node.nodeType===3){update(node,'text',node.nodeValue,v=>node.nodeValue=v);return;}
   if(node.nodeType!==1||['STYLE','SCRIPT'].includes(node.tagName)||node.getAttribute('data-field')==='language')return;
   if(node.getAttribute('data-field')==='preview'&&!['选择一段文字，留一点时间给耳朵。','Select a passage. Make room to listen.'].includes(node.textContent))return;
   for(const name of ['title','aria-label','alt'])if(node.hasAttribute(name))update(node,name,node.getAttribute(name),v=>node.setAttribute(name,v));
   for(const child of Array.from(node.childNodes))visit(child);
  }
  if(root){root.setAttribute('lang',language);visit(root);}
 }
 return {translate,apply};
})();
if(typeof module!=='undefined')module.exports=PaperVoiceI18n;
