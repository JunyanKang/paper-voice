<p align="center"><img src="../addon/assets/mascot.png" width="72" alt="Paper Voice"></p>

<h1 align="center">兼容性与使用说明</h1>

<p align="center">平台支持、声音与翻译特性，以及 PDF 处理范围。</p>
<p align="center"><b>简体中文</b> · <a href="COMPATIBILITY.en.md">English</a></p>
<p align="center"><a href="../README.md">产品首页</a> · <a href="INSTALL.md">安装帮助</a> · <a href="GUIDE.md">使用指南</a></p>

## 平台范围

<div align="center">

<table align="center">
<thead>
<tr>
  <th align="center">组件</th>
  <th align="center">当前范围</th>
</tr>
</thead>
<tbody>
<tr>
  <td align="center">Zotero 插件</td>
  <td align="center">Zotero 10</td>
</tr>
<tr>
  <td align="center">Mac 离线声音</td>
  <td align="center">Apple Silicon（M 系列），macOS 14 或更新版本</td>
</tr>
<tr>
  <td align="center">Windows 离线声音</td>
  <td align="center">Intel / AMD x64</td>
</tr>
<tr>
  <td align="center">Intel Mac、Windows ARM、Linux、旧版 Zotero</td>
  <td align="center">当前未提供经过验证的安装器</td>
</tr>
</tbody>
</table>

</div>

Mac 原生验证使用 Zotero 10.0.3 beta。Windows 自动化环境为 Windows Server 2022 x64 和官方 Zotero 10.0.3 beta，覆盖真实媒体解码、播放计时、暂停及结束事件；物理扬声器和耳机输出尚未进行 Windows 实机验收。这些记录说明验证边界，不代表对所有系统版本和硬件的兼容承诺。

安装器已在 macOS 和 Windows 自动化环境通过自定义路径安装、四语言真实声音合成、复用、取消、损坏下载拒绝与修复验证。

安装助手以当前用户权限安装声音。Mac 使用本地签名，尚未通过 Apple Developer ID 公证；Windows 尚未使用 Authenticode 签名。系统可能显示安全提示，处理方式见 [安装指南](INSTALL.md#安装遇到问题)。

## 声音

采用 Kokoro-82M 本地语音合成模型，提供英语、普通话、日语、法语共 14 种声音。它是自然语音合成，不是真人逐字录音；基因名、公式、罕见术语及缩写的发音仍可能需要核对。

中日文发音前端及词典由安装器下载并安装；是否需要更换旧声音包，请查看[升级说明](GUIDE.md#怎样更新)。朗读语言默认在本机自动识别，也可手动选择；当前未提供俄语朗读，翻译仍支持俄语。中日文使用 Misaki，日文词典为 UniDic-lite；专业术语、多音字及语言混排可能存在误读。

常见计量单位会按朗读语言展开；数字和单位之间的空格、μ／µ 字符、平方／立方及常见复合单位均可识别。复杂公式、PDF 丢失的上标及未收录的单位仍依赖语音引擎的读法。

第一次安装需通过安装器联网下载插件、引擎和声音；之后声音合成可离线完成。翻译和版本更新需要联网。

## PDF 与定位

- PDF 需要可提取的文本层。扫描文档请先 OCR；本插件不提供 OCR。
- 阅读顺序和选区定位依赖 PDF 文本层。复杂双栏、页眉、脚注、公式或不规则排版可能影响顺序，必要时可划选段落阅读。
- 分句支持英语、中文、日文和法文标点。异常缩写和 PDF 断行可能影响句首判断。
- 跨栏、跨页采用布局边界分段播放，段间可能短暂停顿；没有逐词声学时间戳。
- 全文连读会略过可识别的图注及空白或无文本页；标题、参考文献列表和无法识别的图注仍可能进入朗读。
- 页脚出版信息根据页面下方的位置、字号与出版信息标签识别，不要求它位于提取结果末尾；同时略过可识别的书目页眉和页码。异常排版或与正文混合的元数据仍可能需要手动划选。
- 引文过滤采用规则识别，无法覆盖所有排版。纯数字方括号（如 `[0, 1]`）统一略过，真正的数字区间也可能被略过。

高亮与译文属于临时显示，不会修改原文、永久批注或文献元数据。

## 翻译与网络

划词翻译默认开启，将所选范围的文字发送至所选服务：划选范围会补全不完整单词，单句和段落范围会展开至所在句段。显示译文和朗读译文默认关闭；开启后会发送当前句及预取的下一句。在 **设置 → 译文** 关闭这三项后，可完全离线听读。

<div align="center">

<table align="center">
<thead>
<tr>
  <th align="center">服务</th>
  <th align="center">使用提示</th>
</tr>
</thead>
<tbody>
<tr>
  <td align="center">腾讯</td>
  <td align="center">默认选项；当前适配通道不提供繁体中文。</td>
</tr>
<tr>
  <td align="center">微软</td>
  <td align="center">可作为备用，并支持繁体中文。</td>
</tr>
<tr>
  <td align="center">Google</td>
  <td align="center">需网络能够访问 Google 翻译；不同网络环境下可能超时。</td>
</tr>
</tbody>
</table>

</div>

这些免费公共通道可能限流、调整或失效，不保证所有地区、运营商和校园网持续可用。腾讯和微软不依赖 Google 或 OpenAI 服务。显示译文失败不影响原文朗读；仅朗读译文时需要先成功获取译文。可切换服务重试。

专业术语和复杂限定关系仍需以原文为准。机器译文适合辅助理解，不等同于人工审校译稿。若安装了兼容版本的 Translate for Zotero，插件会优先使用其公开翻译接口；没有该插件时也可独立使用。

安装器由 GitHub Releases 提供，插件、声音与更新清单由 GitHub Pages 提供。更新请求不包含论文内容，失败时保留现有版本。更多数据说明见 [隐私说明](../PRIVACY.md)。

## 可选大模型 API

大模型翻译使用用户自己的 API 密钥，不属于免费公共通道。国内外服务提供配置预设，也支持自定义 OpenAI 兼容地址；Claude 使用 Messages 格式。实际可用的模型、地区与密钥类型由服务商决定。MiniMax 已在 Zotero 中完成真实请求与流式显示验证；其他预设已检查接口格式和适配解析，未使用各家的付费密钥逐一实测。

模型响应可能含有错误或不自然的表述；重要术语、数字和结论应对照原文。服务限流、模型思考与网络状况会影响等待时间。配置和使用方法见[大模型翻译指南](TRANSLATION.md)。

---

[产品首页](../README.md) · [使用指南](GUIDE.md) · [安装帮助](INSTALL.md) · [隐私说明](../PRIVACY.md)
