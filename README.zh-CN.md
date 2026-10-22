<p align="center">
  <img src="assets/cover.png" alt="Codex Theme — Hermes 桌面聊天的石墨纸感主题" width="100%">
</p>

<h1 align="center">Codex Theme</h1>

<p align="center">
  <em>Hermes 桌面聊天的石墨纸感主题 —— 设计语言学自 OpenAI Codex 与 ChatGPT</em>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="license"></a>
  <a href="https://hermes-agent.nousresearch.com/docs"><img src="https://img.shields.io/badge/Hermes-%3E%3D0.22.0-339CFF.svg" alt="hermes"></a>
  <a href="https://hermes-agent.nousresearch.com/docs/developer-guide/desktop-plugin-sdk"><img src="https://img.shields.io/badge/platform-Hermes%20Desktop-lightgrey.svg" alt="platform"></a>
</p>

<p align="center">
  <a href="#亮点">亮点</a> •
  <a href="#效果">效果</a> •
  <a href="#安装">安装</a> •
  <a href="#设置">设置</a> •
  <a href="README.md">English</a>
</p>

亮暗双套配色自动跟随系统外观，字体、圆角与间距按 OpenAI Codex 应用和 ChatGPT
的设计语言调校。

## 亮点

- **亮暗免管** —— 两套手工调校的配色，默认跟随 macOS 外观，也可在设置里钉死一套
- **石墨纸感** —— 平面表面、发丝线边框、层级靠字重（600/500/400）承载；
  蓝色只做交互点缀，绝不用于装饰
- **10px 圆角体系** —— 控件/侧栏行/卡片 10px，用户气泡 12px，输入区 16px
- **6 / 10 / 16 / 24 间距节奏** —— 段落、列表、区块、轮次间距落在同一标尺上，
  长对话读起来像文档
- **1.7 行高** —— 比默认更舒展一档的阅读节奏（标题 1.35、代码 1.55），
  走主题的根行高旋钮，不是零散覆盖
- **880px 阅读栏** —— 比 ChatGPT 的 720–768px 更宽的正文列，设置里三档可选：
  窄 768 / 标准 880 / 宽 992px
- **尊重你的配置** —— 正文字号、聊天字体、界面模式、透明度、列表密度等
  全部仍由 Hermes 自己的设置管理；主题只动主题级样式

## 效果

<p align="center">
  <img src="assets/theme-light.png" alt="浅色配色 —— 渲染样张" width="49%">
  <img src="assets/theme-dark.png" alt="深色配色 —— 渲染样张" width="49%">
</p>

<p align="center"><em>两套配色的渲染样张 —— 左浅色、右深色。</em></p>

## 设计语言

| 原则 | 落法 |
|---|---|
| 石墨纸感 | 近白画布（`#FFFFFF`）/ 近黑画布（`#181818`） |
| 字重承载层级 | 标题 600、标签 500、正文 400 —— 不用装饰色 |
| 蓝色只做交互 | 深色 `#339CFF` / 浅色 `#0B72D9`：链接、焦点环、选区 |
| 发丝线代替阴影 | 1px 描边做层次，表面保持平整 |
| 圆角体系 | 控件 10px · 气泡 12px · 输入区 16px |
| 间距节奏 | 6 / 10 / 16 / 24px 递进 |
| 行高 | 根行高 1.7 —— 比默认舒展一档；标题 1.35、代码 1.55 |
| 阅读栏 | 默认 880px · 三档 768 / 880 / 992px（ChatGPT：720–768px） |

### 配色

| Token | 深色 | 浅色 |
|---|---|---|
| 画布 | `#181818` | `#FFFFFF` |
| 侧栏 | `#171717` | `#F9F9F9` |
| 卡片 | `#212121` | `#F7F7F7` |
| 用户气泡 | `#262626` | `#F4F4F4` |
| 边框 | `#2E2E2E` | `#E7E7E7` |
| 强调色 | `#339CFF` | `#0B72D9` |

## 安装

进入[插件市场](https://hermes-agent.nousresearch.com/docs/plugins)后：

```bash
hermes plugins install codex-theme
```

或直接从 GitHub 安装：

```bash
hermes plugins install ethanz-code/hermes-codex-theme
```

然后打开 **设置 → 插件 → Codex Theme** 点「重新应用」（首次加载时主题也会自动
接管一次）。

> [!TIP]
> 手动 / 开发安装：把 `desktop/plugin.js` 拷到
> `~/.hermes/desktop-plugins/codex-theme/plugin.js`，再在 ⌘K 里运行
> **Reload desktop plugins**。

## 设置

全部入口在 **设置 → 插件 → Codex Theme**（应用原生设置行 + 分段控件）：

| 设置项 | 可选项 | 说明 |
|---|---|---|
| 亮暗模式 | 跟随系统 / 深色 / 浅色 | 默认跟随 macOS 外观 |
| 阅读栏宽度 | 窄（768px）/ 标准（880px，默认）/ 宽（992px） | 主题级旋钮；Hermes 无内置宽度设置 |

`⌘K` 里另有两条低调命令：*Theme: 使用 Codex 主题* 和 *Theme: Codex 主题设置*。

### 这个主题刻意不碰的东西

你的 Hermes 配置归你。主题只绘制**主题级样式**（配色、字体栈兜底、圆角、间距），
所有用户可配置项一概不碰 —— 正文字号（设置 → 外观）、聊天字体
（`display.chat_font`）、界面模式、透明度、会话列表密度、聊天背景、时间戳，
以及 `config.yaml` 里的一切。两条铁律：

> [!IMPORTANT]
> - 主题绝不写 `--chat-text-scale` —— 那个旋钮归 **设置 → 外观** 所有，
>   写了就会出现两个所有者互相覆盖。
> - 主题只在首次安装时接管一次配色；之后你在「外观」里手动选的主题永远优先，
>   「重新应用」是主动操作。

## 披露

按市场规则 13，安装前你应知道的一切：

- **无网络请求。** 不拉取任何东西，也不回传任何东西。
- **无遥测。** 不做任何用量上报。
- **无凭据。** 不读不写任何密钥。
- **不打核心补丁。** 主题、命令面板行、设置页全部通过桌面插件 SDK 注册
  （`THEMES_AREA`、`PALETTE_AREA`、`ctx.registerSettingsPage`、`ctx.i18n`）。
- **存储：** 仅一条插件自有记录（`ctx.storage`），保存设置页的选择
  （亮暗模式、阅读栏宽度）。
- **样式：** 主题的 `customCSS` 由应用自带主题引擎以作用域样式注入，
  与用户皮肤机制完全相同；只改视觉，不改行为。

## 致谢

设计语言致意 **OpenAI Codex 应用**与 **ChatGPT**（石墨纸感配色、圆角体系、
间距节奏）。这是独立的社区主题 —— 与 OpenAI 无隶属、无背书关系。

基于 [Hermes Desktop Plugin SDK](https://hermes-agent.nousresearch.com/docs/developer-guide/desktop-plugin-sdk)
构建，[MIT 许可证](LICENSE) 发布。
