# 安装 Paper Voice

[← 产品首页](../README.md) · **简体中文** / [English](INSTALL.en.md)

> 下载 → 安装声音 → 添加插件。完成后，打开 PDF 即可开始听读。

安装助手支持 **简体中文 / English**，默认跟随系统语言，也可在窗口底部切换。

## 首次安装

从 [最新版本](https://github.com/JunyanKang/paper-voice/releases/latest) 下载对应电脑的完整 ZIP，先解压，再开始安装。

| 电脑 | 下载文件 | 打开的安装助手 |
|---|---|---|
| Windows · Intel / AMD 64 位 | `Paper-Voice-版本号-Windows-x64.zip` | `Paper Voice Setup.exe` |
| Mac · M 系列芯片 | `Paper-Voice-版本号-macOS-arm64.zip` | `Paper Voice Installer.app` |

## 01 · 准备声音

![Mac 安装助手，Windows 使用相同的两步流程](assets/installer-macos.png)

打开 **Paper Voice 安装助手**，点击「安装声音」。第一步右侧出现绿色「✓ 声音已就绪」后，点击「完成」。声音包已包含在下载文件中，无需另行下载或注册账户。

Windows 用户请保留同目录的 `Resources` 文件夹；不要只把安装助手单独拖出。Mac 的声音资源已收纳在安装助手内部。

## 02 · 添加 Zotero 插件

打开 Zotero，依次选择：

**工具 → 插件 → 右上角齿轮 → 从文件安装插件**

![Zotero 插件管理器中的从文件安装入口](assets/plugin-install.png)

英文界面为 **Tools → Plugins → Install Plugin From File**。选择下载包里的 `paper-voice-版本号.xpi`。

## 03 · 开始听读

打开英文 PDF。右下角出现书页精灵后，划选文字即可开始；点击精灵，可调整声音和阅读模式。

![第一次听读：打开精灵面板，选择阅读方式](assets/reader-overview.png)

下一步：[了解四种模式、声音与随行译文](GUIDE.md)。

## 更新已有插件

点击书页精灵 → 设置 → **检查更新** → **安装更新**。

也可在 [最新版本](https://github.com/JunyanKang/paper-voice/releases/latest) 中只下载 `.xpi`，通过 Zotero 插件管理器安装。除发布说明另行注明外，不需要重装声音包。`updates.json` 供插件自动更新使用，无需手动下载。

## 安装遇到问题

**系统提示无法验证开发者或发行者**<br>
当前安装助手未使用 Apple Developer ID 公证或 Windows Authenticode 证书。先确认文件来自本项目的 GitHub Releases。macOS 可在「系统设置 → 隐私与安全性」查看对应应用的允许打开选项；Windows 可查看安全提示中的发行者与文件来源，再决定是否继续。无需关闭全局系统保护。

**Windows 提示缺少 DLL**<br>
运行 `Resources/VC_redist.x64.exe` 安装微软 Visual C++ 运行库，再打开安装助手。

**提示安装文件不完整**<br>
重新完整解压下载的 ZIP。Windows 中安装助手与 `Resources` 必须位于同一文件夹。

**无法下载或更新**<br>
安装包与更新通过 GitHub 提供，需要网络能够访问 GitHub。连接失败时，已安装版本仍可继续使用。

更多信息见 [兼容性与使用说明](COMPATIBILITY.md)。需要帮助时，可到 [Issues](https://github.com/JunyanKang/paper-voice/issues) 留下系统版本、Zotero 版本及错误提示；请勿附带未公开论文或个人资料库。

## 卸载

在 Zotero 插件管理器中停用或移除 Paper Voice。文献和批注不受影响。

若不再需要离线声音，可删除以下目录及其同名前缀备份：

- Mac：`~/Library/Application Support/Zotero/paper-voice-engine`
- Windows：`%APPDATA%\Zotero\Zotero\paper-voice-engine`

个人设置和阅读进度保存在 Zotero 偏好设置的 `extensions.paperVoice.*` 下。
