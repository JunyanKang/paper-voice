<p align="center"><img src="addon/assets/mascot.png" width="72" alt="Paper Voice"></p>

<h1 align="center">论文，也可以听。</h1>

<p align="center">在 Zotero 中听原文、看译文，按自己的节奏读懂论文。</p>
<p align="center"><b>简体中文</b> · <a href="README.en.md">English</a></p>

<p align="center"><b>免费开源 · 离线朗读 · 随读定位</b></p>
<p align="center"><a href="https://github.com/JunyanKang/paper-voice/releases/latest">下载安装器</a> · <a href="docs/INSTALL.md">安装指南</a> · <a href="docs/GUIDE.md">使用指南</a></p>

Paper Voice 是一款免费的 Zotero 听读插件，把朗读、原文和翻译放在同一个阅读空间。从一句难懂的论述，到一篇想仔细读完的论文，都可以按自己的节奏听下去。

## 为论文阅读而设计

- **听着读，跟得上。** 正在朗读的句子清晰高亮，页面随阅读前进，随时知道听到了哪里。
- **跨语言，少一点打断。** 译文就在原句旁，遇到陌生表达，无需离开论文来回查阅。
- **让声音适合你。** 支持中、英、日、法语离线朗读；英语可选美音、英音及男女声，语速也由你决定。

## 一句精听，一篇连读

难懂的句子，多听几遍；重要的段落，停下来细读；想把握全文，就从这里继续。划选、单句、段落、全文四种模式，让听读跟上你的思路。

<p align="center"><img src="docs/assets/reading-panel-zh.png" width="340" alt="Paper Voice 阅读面板，可选择划选、单句、段落和全文模式。"></p>
<p align="center"><sub>选择听读范围，找到自己的阅读节奏。</sub></p>

听到哪里，目光就跟到哪里。原文高亮和页面跟随让长篇阅读更容易衔接；随时暂停、回听，下一次再接着读。

<p align="center"><img src="docs/assets/reading-focus-zh.png" width="720" alt="PDF 中当前句子高亮，译文显示在原句下方。"></p>
<p align="center"><sub>声音、原文与译文，在同一处相遇。图中为演示段落。</sub></p>

## 译文就在原句旁

划选文字，即可查看译文。从一个词到一整段，按需要理解眼前的内容，再从这里开始听。也可以直接听译文，同时对照原文阅读。

<p align="center"><img src="docs/assets/selection-translation-zh.png" width="400" alt="划选后的翻译卡片，包含翻译范围、译文和开始朗读按钮。"></p>
<p align="center"><sub>划选、看译文、开始听，不必离开当前段落。</sub></p>

支持多种翻译语言，可选择内置翻译服务，也可接入自己的大模型服务。[了解翻译功能 →](docs/TRANSLATION.md)

## 快速安装

适用于 **Zotero 10**。先安装并打开 Zotero，再从 [官方发布页](https://github.com/JunyanKang/paper-voice/releases/latest) 获取对应安装器。

<div align="center">

<table align="center">
<thead>
<tr>
  <th align="center">Windows</th>
  <th align="center">macOS</th>
</tr>
</thead>
<tbody>
<tr>
  <td align="center"><strong>EXE 安装器</strong></td>
  <td align="center"><strong>DMG 安装器</strong></td>
</tr>
<tr>
  <td align="center">Intel / AMD x64</td>
  <td align="center">Apple 芯片 · macOS 14+</td>
</tr>
</tbody>
</table>

</div>

1. **下载安装器。** 选择 Windows 或 Mac 版本，打开后点击「下载并安装」。
2. **启用 Paper Voice。** 按提示完成安装，在 Zotero「工具 → 插件」中启用。
3. **开始听读。** 打开论文，划选一段文字，即可开始。

<p align="center"><img src="docs/assets/installer-windows.png" width="560" alt="Paper Voice 中文安装器，提供下载并安装按钮和安装进度。"></p>
<p align="center"><sub>安装器帮你准备插件与离线声音。图示为 Windows 版。</sub></p>

PDF 需要能选中文字；扫描件请先进行文字识别（OCR）。[查看图文安装指南 →](docs/INSTALL.md)

## 免费听读，安心使用

插件开源，离线朗读免费，无需订阅。首次联网下载声音后，即可在本机朗读。

翻译需要联网，只发送待翻译的文字，不上传整篇 PDF 或文献库。可选的大模型服务使用你自己的 API 密钥，可能产生服务商费用。[了解数据与隐私 →](PRIVACY.md)

## 文档与支持

<div align="center">

<table align="center">
<thead>
<tr>
  <th align="center">我想…</th>
  <th align="center">阅读</th>
</tr>
</thead>
<tbody>
<tr>
  <td align="center">安装、升级或更换声音路径</td>
  <td align="center"><a href="docs/INSTALL.md">安装指南</a></td>
</tr>
<tr>
  <td align="center">了解模式、跳转和快捷键</td>
  <td align="center"><a href="docs/GUIDE.md">使用指南</a></td>
</tr>
<tr>
  <td align="center">设置翻译或接入大模型</td>
  <td align="center"><a href="docs/TRANSLATION.md">翻译指南</a></td>
</tr>
<tr>
  <td align="center">了解平台支持与限制</td>
  <td align="center"><a href="docs/COMPATIBILITY.md">兼容性</a></td>
</tr>
<tr>
  <td align="center">参与开发</td>
  <td align="center"><a href="docs/BUILD.md">构建与发布</a></td>
</tr>
</tbody>
</table>

</div>

问题与建议请提交至 [Issues](https://github.com/JunyanKang/paper-voice/issues)，附上系统、Zotero 版本和可复现的步骤。

<p align="center">Created by <a href="https://github.com/JunyanKang">Junyan Kang</a> · <a href="LICENSE">MIT License</a> · <a href="docs/ACKNOWLEDGMENTS.md">致谢</a></p>
