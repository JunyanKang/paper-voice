<p align="center"><img src="addon/assets/mascot.png" width="72" alt="Paper Voice"></p>

<h1 align="center">隐私说明</h1>

<p align="center">了解哪些内容留在本机，以及何时会连接外部服务。</p>
<p align="center"><b>简体中文</b> · <a href="PRIVACY.en.md">English</a></p>
<p align="center"><a href="README.md">产品首页</a> · <a href="docs/GUIDE.md">使用指南</a> · <a href="docs/INSTALL.md">安装与卸载</a></p>

Paper Voice 不含遥测、广告、统计 SDK 或用户账户。插件、离线朗读与公共翻译通道免费；可选大模型翻译使用用户自己的 API 密钥，费用由服务商收取。

## 留在本机的内容

**声音生成。** 原文或已获取的译文交给本机 Kokoro 进程生成语音，不上传到语音服务。播放音频保存在内存中；循环朗读期间暂存，任务结束后释放。

**阅读设置与进度。** 声音、语速、模式、翻译语言、主题、透明度、译文字体字号、角色互动开关与间隔，以及每篇 PDF 的最近位置，保存在 Zotero 偏好设置中。最近位置包含页码和用于定位续读的短句。

未结束的朗读还会保存当前模式、文字位置、划选或句段队列及剩余重复次数，以便重启或更新后继续。主动停止或读完后清除会话记录，保留最近阅读位置。译文仅在内存中缓存，最多 300 条，退出后清除。

**个人背景。** 导入的 PNG、JPG 或 WebP 图片在本机裁切、重新编码为 JPEG，不保留原始元数据。处理后的图片保存在 Zotero 配置目录，不发送至翻译服务或 GitHub，可在外观设置中移除。

**原文件。** 插件不写入 PDF、批注或文献元数据。译文和高亮属于临时界面元素。

## 何时发送文字

翻译需要联网，由所选服务接收翻译所需文字：

<div align="center">

<table align="center">
<thead>
<tr>
  <th align="center">功能</th>
  <th align="center">默认状态</th>
  <th align="center">发送的内容</th>
</tr>
</thead>
<tbody>
<tr>
  <td align="center"><strong>划词翻译</strong></td>
  <td align="center">开启</td>
  <td align="center">所选范围的文字；划选范围补全不完整单词，单句／段落范围扩展到所在句段</td>
</tr>
<tr>
  <td align="center"><strong>显示译文</strong></td>
  <td align="center">关闭</td>
  <td align="center">当前原句及预取的下一句</td>
</tr>
<tr>
  <td align="center"><strong>朗读译文</strong></td>
  <td align="center">关闭</td>
  <td align="center">当前原句及预取的下一句</td>
</tr>
</tbody>
</table>

</div>

服务可以是腾讯、微软、Google 或用户配置的大模型 API。服务商可收到文字、IP 地址及一般网络请求信息，并适用其自身的隐私政策。插件不会上传整篇 PDF 文件、批注或文献库。

**完全离线使用：** 在「设置 → 译文」中关闭「划词翻译」「显示译文」「朗读译文」。

安装兼容版本的 Translate for Zotero 时，Paper Voice 优先通过其公开接口请求指定免费服务；不读取其密钥，也不选择付费服务。接口不可用时，请求同一服务的免费公共通道。

## 大模型 API 密钥

大模型仅在用户选择并配置后使用，不内置共享密钥。

- 密钥保存在当前 Zotero 配置的加密登录存储中，不写入偏好设置、调试日志、源代码或发布包，可在设置中移除。
- 模型与接入地址保存在偏好设置中。请求包含翻译文字、目标语言及任务提示，服务商依据自己的隐私与计费政策处理。
- 自定义地址只能使用 HTTPS；本机服务允许 HTTP。不接受 URL 中的密钥，也不跟随携带密钥的重定向。

## 更新、外部链接与卸载

Zotero 检查更新时访问 `kanglab.cool/paper-voice/updates.json`（由 GitHub Pages 托管），下载相应 XPI；这些请求不发送论文内容。点击指南、反馈或隐私链接时，打开相应 GitHub 页面。

停用插件会停止朗读并移除临时界面。卸载后，声音包与偏好设置可按[安装指南中的卸载步骤](docs/INSTALL.md#卸载)清理。

---

[产品首页](README.md) · [使用指南](docs/GUIDE.md) · [安装与卸载](docs/INSTALL.md) · [反馈问题](https://github.com/JunyanKang/paper-voice/issues)
