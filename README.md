<p align="center"><img src="addon/assets/mascot.png" width="72" alt="Paper Voice"></p>

<h1 align="center">论文，也可以听。</h1>

<p align="center">在 Zotero 中听原文、看译文，按自己的节奏读懂论文。</p>
<p align="center"><b>简体中文</b> · <a href="README.en.md">English</a></p>

<p align="center"><b>免费开源 · 离线朗读 · 随读定位</b></p>
<p align="center"><a href="https://github.com/JunyanKang/paper-voice/releases/latest">下载安装器</a> · <a href="docs/INSTALL.md">安装指南</a> · <a href="docs/GUIDE.md">使用指南</a></p>

Paper Voice 为 Zotero PDF 阅读器加入自然语音朗读与随句翻译。从一句难懂的论述，到连续读完整篇论文，让听、看和理解发生在同一处。

## 为论文阅读而设计

- **更连贯的正文听读。** 过滤可识别的文献标注、页眉页脚和图注，优化单位、比例、上下标的读法，不改动 PDF 或批注。
- **适合自己的声音。** 自动识别朗读语言，提供 14 种离线声音，英语可选美音、英音及男女声。
- **顺手的阅读空间。** 自定义快捷键、主题和译文字体；面板需要时展开，回到正文操作时自动收起。

<p align="center"><img src="docs/assets/settings-appearance-zh.png" width="340" alt="外观集中设置，阅读时只留下需要的控件。"></p>
<p align="center"><sub>外观集中设置，阅读时只留下需要的控件。</sub></p>

## 一句精听，一篇连读

选择一个词，就能听所在的完整句子或段落；也可以只读划选内容，或从选定句开始连续阅读。单句、划选和段落支持循环，最近的阅读位置会在重启、更新后保留。

<p align="center"><img src="docs/assets/reading-panel-zh.png" width="340" alt="四种阅读模式，把听读范围交给你。"></p>
<p align="center"><sub>四种阅读模式，把听读范围交给你。</sub></p>

页面随朗读滚动、换栏和翻页。遇到想再听一次的内容，按 **←** 重读当前句；按 **↓** 向下一句，按 **空格** 暂停或继续。悬浮控制条也能完成句子与段落跳转。

<p align="center"><img src="docs/assets/reading-focus-zh.png" width="720" alt="实际界面 · 正在听的句子高亮，译文紧随原文。示例文字用于演示。"></p>
<p align="center"><sub>实际界面 · 正在听的句子高亮，译文紧随原文。示例文字用于演示。</sub></p>

## 译文就在原句旁

**划选即译**，可在划选、单句和段落之间切换翻译范围。朗读时，译文跟随当前句；开启 **朗读译文** 后，只播放译文声音，原文仍保持高亮定位。

<p align="center"><img src="docs/assets/selection-translation-zh.png" width="400" alt="选择翻译范围，查看译文，再从这里开始听。"></p>
<p align="center"><sub>选择翻译范围，查看译文，再从这里开始听。</sub></p>

翻译可选腾讯、微软、Google，也可接入自己的大模型 API。支持多种译文目标语言；英语、中文、日语与法语可使用离线声音朗读。[翻译设置与 API 接入 →](docs/TRANSLATION.md)

## 下载与安装

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

1. **准备声音：** 打开安装器，点击「下载并安装」，首次按需下载插件和声音。
2. **启用插件：** 按提示退出 Zotero，安装器自动安装到所选配置；首次打开后，在「工具 → 插件」中启用 Paper Voice。
3. **开始听读：** 打开可选中文字的 PDF，划选正文，点击书页精灵选择阅读模式。

[详细安装步骤、其他安装路径与升级 →](docs/INSTALL.md)

## 免费与隐私

插件与离线朗读免费，无需订阅或 API 密钥。首次下载声音需要联网，之后原文朗读在本机完成。扫描件需先进行 OCR。

翻译需要联网，划词翻译默认开启；仅发送翻译所需文字，不上传整篇 PDF 或文献库。可选大模型使用自己的 API 密钥，费用由服务商决定。[数据与隐私 →](PRIVACY.md)

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
