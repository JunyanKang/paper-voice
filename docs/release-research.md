# Zotero 插件开发与发布参考

查阅日期：2026-09-28。以下来自公开仓库与 GitHub API 的实际结果。

| 项目 | 查阅结果 | Paper Voice 采用的做法 |
|---|---|---|
| [Translate for Zotero](https://github.com/windingwind/zotero-pdf-translate) | 最新正式 release v2.4.7（2026-08-18），附件 translate-for-zotero.xpi；manifest 包含作者、主页、图标、更新地址和 Zotero 版本上下限 | 正式身份信息；一个小型 XPI；明确版本兼容范围；可选使用其公开翻译接口 |
| [Better BibTeX](https://github.com/retorquere/zotero-better-bibtex) | 最新 release v9.0.64（2026-09-09），版本化 XPI 附件 | 版本化下载、变更记录、问题反馈入口 |
| [Zotero Plugin Template](https://github.com/windingwind/zotero-plugin-template) | package.json 声明作者、仓库、bugs、homepage、许可证；标签 v** 触发 release workflow；构建、检查、发布分离 | 标签与版本核对、自动测试和打包、构建产物校验 |

参考源文件：
- https://github.com/windingwind/zotero-pdf-translate/blob/main/addon/manifest.json
- https://github.com/windingwind/zotero-pdf-translate/blob/main/update.json
- https://github.com/windingwind/zotero-plugin-template/blob/main/.github/workflows/release.yml
- https://github.com/windingwind/zotero-plugin-template/blob/main/package.json

Paper Voice 额外需要独立的离线语音包（Apple Silicon/macOS），以及 Python、ONNX、Kokoro、eSpeak 等第三方许可和相应源码。语音模型体积大，不纳入 Git 源码仓库。公开发布前须完成实际 Zotero 播放与安装测试；不能以单元测试替代跨页朗读、鼠标选区和界面测试。

界面设置页放版本、作者、指南、反馈、隐私链接；安装管理器显示主页与作者；README 放完整安装、兼容范围、功能、限制和卸载方法。暂不添加赞助按钮、强制账户或推广信息。
