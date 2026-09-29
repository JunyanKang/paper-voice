# 构建

[← 返回产品首页](../README.md)

本页供需要自行构建的开发者使用。一般用户请从 [Releases](https://github.com/JunyanKang/paper-voice/releases/latest) 下载。

## Zotero 插件

需要 Python 3.12+。运行：

```sh
python3 scripts/build.py
python3 scripts/release_metadata.py
```

产物位于 `dist/Paper Voice/`。XPI 仅收录 `addon/`；更新清单包含实际 XPI 的 SHA512 和 Zotero 兼容范围。

## 图形安装助手

```sh
python3 scripts/build_installer.py
```

- macOS：需要 Xcode Command Line Tools，以 Swift / AppKit 构建 Apple Silicon 应用。
- Windows x64：使用 .NET Framework 编译器构建 WinForms 应用，运行权限为当前用户。

安装助手源代码位于 `installers/`。Apple Developer ID 公证和 Windows Authenticode 签名需要发布者自己的证书；当前构建不声称具备这些签名。

## 离线语音环境

Mac 构建需要已有的便携 Python 与模型目录：

```text
PORTABLE_SOURCE_DIR/
  runtime/python/
  models/tts/kokoro-v1.0.onnx
  models/tts/voices-v1.0.bin
```

```sh
python3 scripts/build_engine.py PORTABLE_SOURCE_DIR
```

Python 来自 [Astral python-build-standalone](https://github.com/astral-sh/python-build-standalone/releases/tag/20260924) 的 CPython 3.12.14 aarch64-apple-darwin install_only。依赖版本见 `engine/requirements-runtime.txt`。运行目录必须可搬移，不得依赖构建机的 Homebrew 路径。

Windows 使用 `python scripts/build_windows.py`，构建 CPython 3.12.10 embedded x64 和对应依赖。模型与许可源使用脚本中固定哈希的历史归档，不能直接替换该归档内容。

模型来源：[Kokoro ONNX models](https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0)。

| 文件 | SHA256 |
|---|---|
| kokoro-v1.0.onnx | `beb0d1848dee9a49da392cc3df26958d46cfa35d321edf434f52949153f0df3a` |
| voices-v1.0.bin | `bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d` |

保留 Python、依赖、模型及 voicebank 的许可；eSpeak NG、phonemizer、libsndfile 对应源码与构建入口随依赖许可一起提供。

## 分发

```sh
python3 scripts/package_release.py
python3 scripts/package_release.py --platform Windows-x64
```

分别在原生安装助手和对应运行环境已准备好的目录中执行。Mac 声音资源内置于 `.app`，Windows 保留与 `.exe` 同目录的 `Resources`。交付包仅包含安装助手、插件、入门指南及运行所需资源，不包含项目测试资料。

发布附件固定为：通用 XPI、两个平台的完整 ZIP、`updates.json`。插件通过 Zotero 原生更新机制从 GitHub 获取新版本；声音包独立于插件更新。
