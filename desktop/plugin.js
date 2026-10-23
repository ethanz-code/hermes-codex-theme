/**
 * codex-theme — Codex × ChatGPT 风格主题（亮/暗双套，随系统切换）
 *
 * 设计语言（学自 OpenAI Codex 应用 + ChatGPT Web 的设计精髓）：
 *   - 石墨纸感（graphite-on-paper）：近白画布 / 近黑 #181818，正文主导、chrome 克制
 *   - 无彩体系：灰阶承载层级（字重 600/500/400），蓝色只做交互点缀
 *   - 发丝线代替阴影：1px 边框做层次，表面保持平整
 *   - 圆角走 OpenAI 官方刻度：内联代码 4px、侧栏行 8px、控件 10px、卡片/菜单/弹窗/气泡 12px、composer 20px
 *   - 边框统一 10% 前景色（浅 #e7e7e7 / 深 #2a2a2a）；用户气泡前景 5%（浅 #f3f3f3 / 深 #202020）无描边
 *   - 间距节奏：4px 网格；行高 1.7（紧凑 1.55 / 宽松 1.8）
 *   - 阅读栏 768 / 880 / 992px 三档（默认 880px）
 *
 * 控制入口（不在输入框加东西）：
 *   设置 → 插件 → Codex Theme：亮暗模式（跟随系统/深色/浅色）、阅读宽度、内容间距、
 *   字体（正文字体/代码字体）、语言（跟随系统/中文/英文，文案全走 i18n）、反馈问题（GitHub Issues）
 *   ⌘K：「Theme: 使用 Codex 主题」「Theme: Codex 主题设置」
 *
 * 安装：~/.hermes/desktop-plugins/codex-theme/plugin.js（目录名 == id）
 */

import { Button, host, PALETTE_AREA, pluginSettingsHref, requestTheme, SegmentedControl, THEMES_AREA, usePluginI18n, useTheme } from '@hermes/plugin-sdk'
import { useState } from 'react'
import { jsx, jsxs } from 'react/jsx-runtime'

const ID = 'codex-theme'
const ISSUES_URL = 'https://github.com/ethanz-code/hermes-codex-theme/issues'

// ─── 偏好（阅读宽度 / 内容间距 / 字体），注册时与设置页共用 ─────────────────
// 只动主题级的旋钮；不碰 Hermes 自己的配置项（如 --chat-text-scale 正文缩放、
// 聊天字体 display.chat_font、界面模式、透明度等），避免与设置互相覆盖。

// 三档阅读栏：紧凑 768 / 舒适 880（默认）/ 宽松 992px。
// 旧版 42/46/54rem 偏好按像素就近迁移（旧「宽」864px ≈ 新「舒适」880px 的微调值）。
const COL_WIDTHS = [
  { value: '48rem', labelKey: 'compact' },
  { value: '55rem', labelKey: 'comfortable' },
  { value: '62rem', labelKey: 'roomy' }
]
const LEGACY_COL_WIDTH = { '42rem': '48rem', '46rem': '48rem', '54rem': '55rem' }

// 字体档位：正文字体 → --dt-font-sans，代码字体 → --dt-font-mono。
// 每档都排了中文回退（苹方/雅黑/思源），中英文混排皆可；「默认」档不写规则，
// 沿用主题与应用自己的字体（含 display.chat_font / desktop.font_family）。
// 只覆盖主题级变量本身，不写 Hermes 的字体配置项。
const TEXT_FONTS = [
  { value: 'default', labelKey: 'fontDefault' },
  {
    value: 'serif',
    labelKey: 'fontSerif',
    stack: "Georgia, 'Times New Roman', 'Songti SC', STSong, 'Noto Serif SC', 'Source Han Serif SC', SimSun, serif"
  },
  {
    value: 'mono',
    labelKey: 'fontMonoText',
    stack: "'SF Mono', SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans CJK SC', monospace"
  }
]
const CODE_FONTS = [
  { value: 'default', labelKey: 'fontDefault' },
  {
    value: 'fira',
    labelKey: 'fontFira',
    stack: "'Fira Code', 'FiraCode Nerd Font', 'JetBrains Mono', 'SF Mono', SFMono-Regular, Menlo, Consolas, 'Liberation Mono', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans CJK SC', monospace"
  },
  {
    value: 'courier',
    labelKey: 'fontCourier',
    stack: "'Courier New', Courier, Menlo, Consolas, 'Liberation Mono', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans CJK SC', monospace"
  }
]

// 档位规则用 !important：主题每次应用都把 --dt-font-* 写在 <html> 内联样式上，
// 普通规则压不过内联，重要声明可以（已在 Chromium 实测）。
const FONT_PRESET_RULES = [
  ...TEXT_FONTS.map(o => ['data-codex-text-font', o.value, '--dt-font-sans', o.stack]),
  ...CODE_FONTS.map(o => ['data-codex-code-font', o.value, '--dt-font-mono', o.stack])
]
  .filter(entry => entry[3])
  .map(([attr, value, cssVar, stack]) => `html[${attr}='${value}'] { ${cssVar}: ${stack} !important; }`)
  .join('\n')

// 三档内容间距：紧凑 / 舒适（默认）/ 宽松 —— 行高与段距整档缩放，
// 见 customCSS 的 html[data-codex-density] 规则。
const DENSITIES = [
  { value: 'compact', labelKey: 'compact' },
  { value: 'comfortable', labelKey: 'comfortable' },
  { value: 'roomy', labelKey: 'roomy' }
]

const PREF_DEFAULTS = { colWidth: '55rem', density: 'comfortable', language: 'system', fontText: 'default', fontCode: 'default' }
const LANGUAGES = ['system', 'zh', 'en']
let storage = null
let pluginOs = null

// 语言偏好变化的订阅口（设置页切换语言时重建 ⌘K / 设置页标题等注册期文案）。
const languageListeners = new Set()

function onLanguagePrefChange(listener) {
  languageListeners.add(listener)
  return () => languageListeners.delete(listener)
}

function normalizeColWidth(value) {
  const v = LEGACY_COL_WIDTH[value] || value
  return COL_WIDTHS.some(o => o.value === v) ? v : PREF_DEFAULTS.colWidth
}

function normalizeLanguage(value) {
  return LANGUAGES.includes(value) ? value : PREF_DEFAULTS.language
}

function normalizeDensity(value) {
  return DENSITIES.some(o => o.value === value) ? value : PREF_DEFAULTS.density
}

function normalizeFont(value, list) {
  return list.some(o => o.value === value) ? value : 'default'
}

function getPref(key) {
  const v = storage ? storage.get('prefs', null) : null
  const raw = (v && v[key]) || PREF_DEFAULTS[key]
  if (key === 'colWidth') return normalizeColWidth(raw)
  if (key === 'density') return normalizeDensity(raw)
  if (key === 'language') return normalizeLanguage(raw)
  if (key === 'fontText') return normalizeFont(raw, TEXT_FONTS)
  if (key === 'fontCode') return normalizeFont(raw, CODE_FONTS)
  return raw
}

function setPref(key, value) {
  const next = { ...PREF_DEFAULTS, ...((storage && storage.get('prefs', null)) || {}), [key]: value }
  if (storage) storage.set('prefs', next)
  applyPrefs(next)
  if (key === 'language') languageListeners.forEach(listener => listener())
}

function applyPrefs(prefs) {
  const stored = prefs || (storage ? storage.get('prefs', null) : null) || {}
  const p = { ...PREF_DEFAULTS, ...stored }
  const root = document.documentElement
  root.style.setProperty('--composer-width', normalizeColWidth(p.colWidth))
  root.dataset.codexDensity = normalizeDensity(p.density)
  root.dataset.codexTextFont = normalizeFont(p.fontText, TEXT_FONTS)
  root.dataset.codexCodeFont = normalizeFont(p.fontCode, CODE_FONTS)
}

function openIssues() {
  if (pluginOs && typeof pluginOs.openExternal === 'function') {
    pluginOs.openExternal(ISSUES_URL)
  } else {
    console.error('[codex-theme] ctx.os.openExternal unavailable in this build')
  }
}

// ─── 双套配色（Codex 基准 + ChatGPT 石墨纸感的灰阶） ─────────────────────────
// 取值对齐官方 token（apps-sdk-ui / Codex 桌面端内嵌 CSS）：
// 边框 = 前景 10%（浅）/ 12%（深）；用户气泡 = 前景 5%/8% 无描边；
// accent 浅 #0285FF / 深 #339CFF，焦点环浅 #0169CC / 深 #0285FF。

const dark = {
  background: '#181818',
  foreground: '#f5f5f5',
  card: '#212121',
  cardForeground: '#f5f5f5',
  muted: '#262626',
  mutedForeground: '#9b9b9b',
  popover: '#232323',
  popoverForeground: '#f5f5f5',
  primary: '#339cff',
  primaryForeground: '#ffffff',
  secondary: '#242424',
  secondaryForeground: '#e8e8e8',
  accent: '#272727',
  accentForeground: '#ededed',
  border: '#2a2a2a',
  input: '#242424',
  ring: '#0285ff',
  midground: '#339cff',
  midgroundForeground: '#ffffff',
  composerRing: '#339cff',
  destructive: '#e5484d',
  destructiveForeground: '#ffffff',
  sidebarBackground: '#171717',
  sidebarBorder: '#2a2a2a',
  userBubble: '#202020',
  userBubbleBorder: 'transparent'
}

const light = {
  background: '#ffffff',
  foreground: '#1a1a1a',
  card: '#f7f7f7',
  cardForeground: '#1a1a1a',
  muted: '#f4f4f4',
  mutedForeground: '#6f6f6f',
  popover: '#ffffff',
  popoverForeground: '#1a1a1a',
  primary: '#0285ff',
  primaryForeground: '#ffffff',
  secondary: '#f1f1f1',
  secondaryForeground: '#2c2c2c',
  accent: '#efefef',
  accentForeground: '#2c2c2c',
  border: '#e7e7e7',
  input: '#f6f6f6',
  ring: '#0169cc',
  midground: '#0285ff',
  midgroundForeground: '#ffffff',
  composerRing: '#0285ff',
  destructive: '#c93a36',
  destructiveForeground: '#ffffff',
  sidebarBackground: '#f9f9f9',
  sidebarBorder: '#e7e7e7',
  userBubble: '#f3f3f3',
  userBubbleBorder: 'transparent'
}

// ─── 样式基底（圆角刻度 / 发丝线 / 间距节奏 / 弹窗 / 侧栏 / 设置页面板） ────────

const customCSS = `
/* 阅读栏与字号基线（默认阅读栏 880px；具体值由设置页 --composer-width 覆盖。
   行高走主题 typography.line-height（--dt-line-height: 1.7），此处只管阅读栏。 */
:root {
  --composer-width: 55rem;
  --dt-user-bubble-max-width: 78%;
  --conversation-text-base-size: 0.9375rem;
  --conversation-base-line-height: 1.5rem;
  --conversation-tool-base-size: 0.75rem;
  --conversation-caption-base-size: 0.75rem;
  --conversation-caption-base-line-height: 1rem;

  /* 间距档位的基准档（舒适） */
  --paragraph-gap: 0.625rem;
  --turn-block-gap: 1.25rem;
  --tool-row-gap: 0.5rem;
  --codex-bubble-pad-y: 0.625rem;
  --codex-bubble-pad-x: 0.875rem;
  --codex-li-gap: 0.3rem;

  /* 圆角刻度（OpenAI radius-sm/md/lg/xl/3xl） */
  --codex-radius-inline: 0.25rem;
  --codex-radius-row: 0.5rem;
  --codex-radius-control: 0.625rem;
  --codex-radius-card: 0.75rem;
  --codex-radius-composer: 1.25rem;

  /* 浮层阴影（elevation + 1px hairline 边） */
  --codex-shadow-menu: 0 2px 4px -1px rgb(0 0 0 / 0.08), 0 0 0 1px var(--dt-border);
  --codex-shadow-dialog: 0 8px 16px 0 #00000012, 0 2px 6px 0 #0000000d, 0 0 0 1px var(--dt-border);
}
html.dark {
  --codex-shadow-menu: 0 2px 4px -1px rgb(0 0 0 / 0.2), 0 0 0 1px var(--dt-border);
  --codex-shadow-dialog: 0 8px 16px 0 #00000059, 0 2px 8px 0 #0003, 0 0 0 1px var(--dt-border);
}

/* 内容间距档位：紧凑 / 舒适（默认即上方基准）/ 宽松 */
html[data-codex-density='compact'] {
  --paragraph-gap: 0.5rem;
  --turn-block-gap: 0.875rem;
  --tool-row-gap: 0.375rem;
  --codex-bubble-pad-y: 0.5rem;
  --codex-bubble-pad-x: 0.75rem;
  --codex-li-gap: 0.2rem;
  --dt-line-height: 1.55 !important;
}
html[data-codex-density='roomy'] {
  --paragraph-gap: 0.875rem;
  --turn-block-gap: 1.625rem;
  --tool-row-gap: 0.625rem;
  --codex-bubble-pad-y: 0.75rem;
  --codex-bubble-pad-x: 1rem;
  --codex-li-gap: 0.4rem;
  --dt-line-height: 1.8 !important;
}

/* 正文：ChatGPT 式阅读节奏 —— 字重承载层级，行距随间距档位（与 --dt-line-height
   一致，双保险：消息容器与 .aui-md 都显式声明，防止被内层 leading-* 类覆盖） */
[data-slot='aui_assistant-message-content'] {
  line-height: var(--dt-line-height);
}
[data-slot='aui_assistant-message-content'] .aui-md {
  line-height: var(--dt-line-height);
}
[data-slot='aui_assistant-message-content'] .aui-md :where(h1, h2, h3, h4) {
  font-weight: 600;
  letter-spacing: -0.012em;
  margin-block: 1.5rem 0.5rem;
  line-height: 1.35;
}
[data-slot='aui_assistant-message-content'] .aui-md :where(p) {
  margin-block: var(--paragraph-gap) 0;
}

/* 用户气泡：前景 5%（浅 #f3f3f3 / 深 #202020）、12px 圆角、无描边无阴影 */
.composer-human-message {
  border-radius: var(--codex-radius-card);
  padding: var(--codex-bubble-pad-y) var(--codex-bubble-pad-x);
  box-shadow: none;
  line-height: var(--dt-line-height);
}

/* 用户气泡宽度：贴合内容、右对齐（发送方），上限 --dt-user-bubble-max-width 后换行。
   作用域必须落在 [data-slot='aui_user-bubble-actions'] —— 编辑态输入框复用同一个
   .composer-human-message class（app 内 ui-prompt-input__container），不能一起收缩；
   后代选择器把特异性抬到 0,2,0，压过气泡链上的 w-full / max-w-full（不依赖注入顺序）。
   overflow-wrap: anywhere 兜底超长无空格串（内层文本自带 wrap-anywhere，此处双保险）。 */
[data-slot='aui_user-message-root'] [data-slot='aui_user-bubble-actions'] {
  width: fit-content;
  max-width: var(--dt-user-bubble-max-width, 78%);
  margin-left: auto;
  overflow-wrap: anywhere;
}

/* 气泡本体只贴自身文本：分支线程的 checkpoint 行（restore/1/2/next）比短文本宽时，
   外层 fit-content 会被该行撑宽，短气泡跟着变宽；对气泡 button 再收缩一次并右对齐，
   hover 操作按钮（absolute right-2 bottom-2）仍贴气泡右下角。
   --human-msg-line-height 就近覆盖 app 在 message-root 上的 1.3：sticky 4 行截断的
   max-height 按 4 * --human-msg-line-height * 字号计算，须与气泡实际行高一致。 */
[data-slot='aui_user-message-root'] [data-slot='aui_user-bubble-actions'] .composer-human-message {
  border: none;
  width: fit-content;
  margin-left: auto;
  --human-msg-line-height: var(--dt-line-height);
}

/* 用户气泡底色：调研取前景 5%（浅 #f3f3f3 / 深 #202020）。两个坑：
   1) 浅色下 --theme-mix-bubble 为 0%，气泡链路（--theme-bubble-seed →
      --ui-chat-bubble-background）只吃 --theme-neutral-card #fcfcfc，主题 userBubble
      被丢弃；2) --dt-user-bubble 在 :root 定义、var() 在定义处替换，下游改
      --ui-chat-bubble-background 不传导。故直接在气泡作用域覆盖 --dt-user-bubble，
      并保留 --user-bubble-keep（气泡透明度设置）的合成。 */
[data-slot='aui_user-message-root'] [data-slot='aui_user-bubble-actions'] {
  --dt-user-bubble: color-mix(in srgb, #f3f3f3 var(--user-bubble-keep, 100%), transparent);
}
html.dark [data-slot='aui_user-message-root'] [data-slot='aui_user-bubble-actions'] {
  --dt-user-bubble: color-mix(in srgb, #202020 var(--user-bubble-keep, 100%), transparent);
}

/* 代码块 / 代码卡片：卡片 12px 圆角 */
[data-slot='code-card'],
[data-slot='aui_user-fence'],
[data-slot='aui_assistant-message-content'] .aui-md [data-streamdown='code-block'] {
  border-radius: var(--codex-radius-card);
}
[data-slot='aui_assistant-message-content'] .aui-md :where(:not(pre) > code),
[data-slot='aui_user-inline-code'] {
  border-radius: var(--codex-radius-inline);
  padding: 0.08em 0.3em;
  font-size: 0.88em;
  border: none;
  background: color-mix(in srgb, var(--theme-foreground) 5%, transparent);
}

/* 表格：发丝线，无重边框 */
[data-slot='aui_assistant-message-content'] .aui-md table {
  border-collapse: collapse;
}
[data-slot='aui_assistant-message-content'] .aui-md :where(th, td) {
  border-color: var(--dt-border);
}

/* 工具调用 / 思考等脚手架行：扁平、等宽字标签、可读性优先（不做过淡的灰） */
:root {
  --conversation-scaffold-text: color-mix(in srgb, var(--theme-foreground) 74%, transparent);
  --conversation-scaffold-meta: color-mix(in srgb, var(--theme-foreground) 52%, transparent);
}
[data-conversation-scaffold] {
  font-family: var(--dt-font-sans);
  color: color-mix(in srgb, var(--theme-foreground) 78%, transparent);
}
[data-conversation-scaffold] code,
[data-conversation-scaffold] [data-slot='aui_turn-duration'] {
  font-family: var(--dt-font-mono);
}
[data-conversation-scaffold] code {
  background: color-mix(in srgb, var(--theme-foreground) 6%, transparent);
  padding: 0.05em 0.35em;
  border-radius: var(--codex-radius-inline);
}
[data-slot='aui_turn-duration'] {
  font-size: var(--conversation-caption-font-size);
  color: var(--ui-text-tertiary);
}

/* ── 内容排版（Markdown）：ChatGPT 式节奏 6/10/16/24，层级靠字重与留白 ── */
[data-slot='aui_assistant-message-content'] .aui-md :where(ul, ol) {
  margin-block: 0.625rem;
  padding-left: 1.35em;
}
[data-slot='aui_assistant-message-content'] .aui-md :where(li) {
  margin-block: var(--codex-li-gap);
}
[data-slot='aui_assistant-message-content'] .aui-md :where(li > ul, li > ol) {
  margin-block: 0.125rem;
}
[data-slot='aui_assistant-message-content'] .aui-md :where(blockquote) {
  margin-block: 0.75rem;
  padding: 0.25rem 0 0.25rem 0.9rem;
  border-left: 2px solid var(--dt-border);
  color: var(--ui-text-secondary);
}
[data-slot='aui_assistant-message-content'] .aui-md :where(h1) { font-size: 1.375em; }
[data-slot='aui_assistant-message-content'] .aui-md :where(h2) { font-size: 1.25em; }
[data-slot='aui_assistant-message-content'] .aui-md :where(h3) { font-size: 1.125em; }
[data-slot='aui_assistant-message-content'] .aui-md :where(h4) { font-size: 1em; }
[data-slot='aui_assistant-message-content'] .aui-md :where(strong) {
  font-weight: 600;
}
[data-slot='aui_assistant-message-content'] .aui-md :where(hr) {
  margin-block: 1.5rem;
  border-color: var(--dt-border);
}
[data-slot='aui_assistant-message-content'] .aui-md :where(pre) {
  font-size: 0.85em;
  line-height: 1.55;
}
[data-slot='aui_assistant-message-content'] .aui-md :where(th) {
  font-weight: 600;
}
[data-slot='aui_assistant-message-content'] .aui-md :where(th, td) {
  padding: 0.45rem 0.75rem;
}

/* 文本选区：品牌色淡染（保持对比度） */
::selection {
  background: color-mix(in srgb, var(--theme-midground) 22%, transparent);
}

/* 输入区：20px 圆角卡片、发丝线、无阴影 */
[data-slot='composer-surface'] {
  border-radius: var(--codex-radius-composer);
  box-shadow: none;
  border: 1px solid var(--dt-border);
}

/* ── 弹窗 / 浮层：统一 12px 圆角、统一边框线、elevation 阴影、Codex 遮罩 ── */
[data-slot='dialog-overlay'] {
  background: rgba(0, 0, 0, 0.3);
}
html.dark [data-slot='dialog-overlay'] {
  background: rgba(0, 0, 0, 0.5);
}
[data-slot='dialog-content'] {
  border-radius: var(--codex-radius-card);
  border: 1px solid var(--dt-border);
  box-shadow: var(--codex-shadow-dialog);
}
[data-slot='dropdown-menu-content'],
[data-slot='dropdown-menu-sub-content'],
[data-slot='context-menu-content'],
[data-slot='context-menu-sub-content'],
[data-slot='select-content'],
[data-slot='popover-content'],
[data-slot='command'] {
  border-radius: var(--codex-radius-card);
  border: 1px solid var(--dt-border);
  box-shadow: var(--codex-shadow-menu);
}
[data-slot='dropdown-menu-item'],
[data-slot='dropdown-menu-checkbox-item'],
[data-slot='dropdown-menu-radio-item'],
[data-slot='context-menu-item'],
[data-slot='context-menu-checkbox-item'],
[data-slot='select-item'],
[data-slot='command-item'] {
  border-radius: 0.375rem;
}
[data-slot='tooltip-content'] {
  border-radius: var(--codex-radius-row);
}

/* ── 左侧侧边栏（ChatGPT 式：行 8px 圆角、hover 淡灰、发丝分隔） ── */
[data-tour='sessions-sidebar'] :is(.bg-\\\\\\\\(--ui-row-active-background\\\\\\\\), .bg-\\\\\\\\(--ui-row-open-background\\\\\\\\)),
[data-tour='sessions-sidebar'] :is([class*='ui-row-active-background'], [class*='ui-row-open-background']) {
  border-radius: var(--codex-radius-row);
}
[data-tour='sessions-sidebar'] button:not([data-row-actions] button) {
  border-radius: var(--codex-radius-row);
}
[data-tour='sessions-sidebar'] [data-working='true'],
.arc-border.arc-row {
  border-radius: var(--codex-radius-row);
}
:root {
  --ui-row-active-background: color-mix(in srgb, var(--theme-foreground) 7%, transparent);
  --ui-row-open-background: color-mix(in srgb, var(--theme-foreground) 4%, transparent);
}

/* ── 插件设置页：Codex 面板卡片（标题卡 + 分组面板 + 发丝分隔行） ── */
.codex-settings {
  display: grid;
  gap: 16px;
  max-width: 640px;
}
.codex-settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 2px 0;
}
.codex-settings-header-main {
  min-width: 0;
  flex: 1;
}
.codex-settings-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ui-text-primary);
}
.codex-settings-status {
  font-size: 12px;
  color: var(--ui-text-tertiary);
  margin-top: 4px;
}
.codex-settings-panel {
  border: 1px solid var(--dt-border);
  border-radius: var(--codex-radius-card);
  background: var(--dt-card);
  overflow: hidden;
}
.codex-settings-panel-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--ui-text-tertiary);
  padding: 12px 16px 6px;
}
.codex-settings-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
}
.codex-settings-row + .codex-settings-row {
  border-top: 1px solid var(--dt-border);
}
.codex-settings-row-main {
  flex: 1;
  min-width: 0;
}
.codex-settings-row-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--ui-text-primary);
}
.codex-settings-row-hint {
  font-size: 12px;
  line-height: 1.5;
  color: var(--ui-text-tertiary);
  margin-top: 3px;
}
.codex-settings-row-action {
  flex-shrink: 0;
  white-space: nowrap;
}

/* ── 字体档位（设置页切换即时生效）── 主题把 --dt-font-sans / --dt-font-mono 写在
   <html> 内联样式上，这里用 !important 的档位规则压过内联值；「默认」档无规则，
   走主题/应用原值。规则由 TEXT_FONTS / CODE_FONTS 生成。 */
${FONT_PRESET_RULES}
`

const codexTheme = {
  name: 'codex',
  colors: light,
  darkColors: dark,
  typography: {
    fontSans:
      "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
    fontMono: "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
    // 根行高（画到 --dt-line-height）：正文、消息内容、界面文字统一的行距基线。
    // 这是主题唯一的行高旋钮——之前没设，正文一直在吃 app 默认 1.5。
    // 「内容间距」档位会按 html[data-codex-density] 覆盖此值。
    lineHeight: '1.7'
  },
  customCSS
}

// ─── 设置页（设置 → 插件 → Codex Theme）────────────────────────────────────────

// 自带文案（不改 app 的 i18n 目录）；默认跟随系统/应用语言，缺省回退英文，
// 也可在设置页固定为中文或英文（prefs.language）。
const LOCALES = {
  en: {
    title: 'Codex Theme',
    themeLabel: 'Codex',
    themeDescription: 'Codex × ChatGPT · dual palette (light/dark) · follows the system appearance',
    paletteApply: 'Theme: Use Codex theme',
    paletteSettings: 'Theme: Codex theme settings',
    status: name => `Active: ${name} · dual palette (light/dark), design language after OpenAI Codex & ChatGPT`,
    reapply: 'Reapply',
    reapplied: 'Codex theme reapplied',
    panelAppearance: 'Appearance',
    modeLabel: 'Appearance mode',
    modeHint: '“Follow system” switches light/dark with the macOS appearance. Text size stays under Settings → Appearance.',
    followSystem: 'Follow system',
    dark: 'Dark',
    light: 'Light',
    panelTypography: 'Typography & layout',
    widthLabel: 'Reading width',
    widthHint: 'Prose column width — Compact 768px · Comfortable 880px · Roomy 992px (ChatGPT uses 720–768px).',
    densityLabel: 'Content spacing',
    densityHint: 'Line height and paragraph rhythm — Compact 1.55 · Comfortable 1.7 (default) · Roomy 1.8.',
    compact: 'Compact',
    comfortable: 'Comfortable',
    roomy: 'Roomy',
    fontLabel: 'Text font',
    fontHint: 'Typeface for UI and prose. “Default” keeps the theme/app font settings; every preset carries Chinese fallbacks so mixed Chinese/English text renders well.',
    codeLabel: 'Code font',
    codeHint: 'Monospace for code blocks and inline code, with Chinese fallbacks. Fira Code / JetBrains Mono must be installed locally — otherwise the system mono kicks in.',
    fontDefault: 'Default',
    fontSerif: 'Serif',
    fontMonoText: 'Mono',
    fontFira: 'Fira Code',
    fontCourier: 'Courier',
    panelGeneral: 'General',
    languageLabel: 'Language',
    languageHint: 'Language for this plugin’s UI (settings, palette, popups) — follows the system & app language by default, or pin it below.',
    langZh: '中文',
    langEn: 'English',
    feedbackLabel: 'Feedback',
    feedbackHint: 'Found a bug or have a suggestion? Report it on GitHub Issues.',
    feedbackAction: 'Open GitHub Issues'
  },
  zh: {
    title: 'Codex 主题',
    themeLabel: 'Codex',
    themeDescription: 'Codex × ChatGPT · 亮暗双套 · 随系统切换',
    paletteApply: 'Theme: 使用 Codex 主题',
    paletteSettings: 'Theme: Codex 主题设置',
    status: name => `当前生效：${name} · 亮暗双套，设计语言学自 OpenAI Codex 与 ChatGPT`,
    reapply: '重新应用',
    reapplied: 'Codex 主题已重新应用',
    panelAppearance: '外观',
    modeLabel: '亮暗模式',
    modeHint: '「跟随系统」自动跟随 macOS 外观。正文字号沿用「外观」设置，此处不覆盖。',
    followSystem: '跟随系统',
    dark: '深色',
    light: '浅色',
    panelTypography: '排版与布局',
    widthLabel: '阅读宽度',
    widthHint: '正文列宽 —— 紧凑 768px · 舒适 880px · 宽松 992px（ChatGPT 为 720–768px）。',
    densityLabel: '内容间距',
    densityHint: '行距与段落节奏 —— 紧凑 1.55 · 舒适 1.7（默认）· 宽松 1.8。',
    compact: '紧凑',
    comfortable: '舒适',
    roomy: '宽松',
    fontLabel: '正文字体',
    fontHint: '界面与正文的字体。「默认」沿用主题与应用的字体设置；其余档位带中文回退，中英文混排皆可读。',
    codeLabel: '代码字体',
    codeHint: '代码块与行内代码的等宽字体，中文按苹方/雅黑回退。Fira Code、JetBrains Mono 需本机已安装，否则自动回退系统等宽。',
    fontDefault: '默认',
    fontSerif: '衬线',
    fontMonoText: '等宽',
    fontFira: 'Fira Code',
    fontCourier: 'Courier',
    panelGeneral: '通用',
    languageLabel: '语言',
    languageHint: '本插件界面（设置页、⌘K、弹窗）的显示语言 —— 默认跟随系统与应用语言，也可固定为中文或英文。',
    langZh: '中文',
    langEn: 'English',
    feedbackLabel: '反馈问题',
    feedbackHint: '遇到问题或有功能建议？到 GitHub Issues 反馈。',
    feedbackAction: '打开 GitHub Issues'

  }
}

function lookupMessage(locale, key, args) {
  const bundle = locale === 'zh' ? LOCALES.zh : LOCALES.en
  const value = bundle[key] !== undefined ? bundle[key] : LOCALES.en[key]
  if (value === undefined) return key
  return typeof value === 'function' ? value(...args) : value
}

// prefs.language 固定为 zh/en 时绕过应用语言；'system' 交给 SDK 的翻译器
// （跟随系统/应用语言，缺省回退英文）。fallbackT：ctx.i18n.t 或 usePluginI18n(ID)。
function makeT(fallbackT) {
  return (key, ...args) => {
    const lang = getPref('language')
    return lang === 'system' ? fallbackT(key, ...args) : lookupMessage(lang, key, args)
  }
}

function buildTheme(t) {
  return { ...codexTheme, label: t('themeLabel'), description: t('themeDescription') }
}

function SettingsRow({ title, hint, control }) {
  return jsxs('div', {
    className: 'codex-settings-row',
    children: [
      jsxs('div', {
        className: 'codex-settings-row-main',
        children: [
          jsx('div', { className: 'codex-settings-row-title', children: title }),
          jsx('div', { className: 'codex-settings-row-hint', children: hint })
        ]
      }),
      jsx('div', { className: 'codex-settings-row-action', children: control })
    ]
  })
}

function SettingsPanel({ title, rows }) {
  return jsxs('section', {
    className: 'codex-settings-panel',
    children: [
      jsx('div', { className: 'codex-settings-panel-title', children: title }),
      ...rows
    ]
  })
}

function SettingsPage() {
  const t = makeT(usePluginI18n(ID))
  const { mode, setMode, themeName } = useTheme()
  const [colWidth, setColWidth] = useState(() => getPref('colWidth'))
  const [language, setLanguage] = useState(() => getPref('language'))
  const [density, setDensity] = useState(() => getPref('density'))
  const [fontText, setFontText] = useState(() => getPref('fontText'))
  const [fontCode, setFontCode] = useState(() => getPref('fontCode'))

  const pickWidth = value => {
    setPref('colWidth', value)
    setColWidth(value)
  }

  const pickLanguage = value => {
    setPref('language', value)
    setLanguage(value)
  }

  const pickDensity = value => {
    setPref('density', value)
    setDensity(value)
  }

  const pickTextFont = value => {
    setPref('fontText', value)
    setFontText(value)
  }

  const pickCodeFont = value => {
    setPref('fontCode', value)
    setFontCode(value)
  }

  return jsxs('div', {
    className: 'codex-settings',
    children: [
      jsxs('div', {
        className: 'codex-settings-header',
        children: [
          jsxs('div', {
            className: 'codex-settings-header-main',
            children: [
              jsx('div', { className: 'codex-settings-title', children: t('title') }),
              jsx('div', { className: 'codex-settings-status', children: t('status', themeName) })
            ]
          }),
          jsx('div', {
            className: 'codex-settings-row-action',
            children: jsx(Button, {
              variant: 'outline',
              size: 'sm',
              onClick: () => {
                requestTheme('codex')
                applyPrefs()
                host.notify({ kind: 'info', message: t('reapplied') })
              },
              children: t('reapply')
            })
          })
        ]
      }),

      jsx(SettingsPanel, {
        title: t('panelAppearance'),
        rows: [
          jsx(SettingsRow, {
            key: 'mode',
            title: t('modeLabel'),
            hint: t('modeHint'),
            control: jsx(SegmentedControl, {
              value: mode,
              onChange: v => setMode(v),
              options: [
                { id: 'system', label: t('followSystem') },
                { id: 'dark', label: t('dark') },
                { id: 'light', label: t('light') }
              ]
            })
          })
        ]
      }),

      jsx(SettingsPanel, {
        title: t('panelTypography'),
        rows: [
          jsx(SettingsRow, {
            key: 'width',
            title: t('widthLabel'),
            hint: t('widthHint'),
            control: jsx(SegmentedControl, {
              value: colWidth,
              onChange: pickWidth,
              options: COL_WIDTHS.map(o => ({ id: o.value, label: t(o.labelKey) }))
            })
          }),
          jsx(SettingsRow, {
            key: 'density',
            title: t('densityLabel'),
            hint: t('densityHint'),
            control: jsx(SegmentedControl, {
              value: density,
              onChange: pickDensity,
              options: DENSITIES.map(o => ({ id: o.value, label: t(o.labelKey) }))
            })
          }),
          jsx(SettingsRow, {
            key: 'textFont',
            title: t('fontLabel'),
            hint: t('fontHint'),
            control: jsx(SegmentedControl, {
              value: fontText,
              onChange: pickTextFont,
              options: TEXT_FONTS.map(o => ({ id: o.value, label: t(o.labelKey) }))
            })
          }),
          jsx(SettingsRow, {
            key: 'codeFont',
            title: t('codeLabel'),
            hint: t('codeHint'),
            control: jsx(SegmentedControl, {
              value: fontCode,
              onChange: pickCodeFont,
              options: CODE_FONTS.map(o => ({ id: o.value, label: t(o.labelKey) }))
            })
          })
        ]
      }),

      jsx(SettingsPanel, {
        title: t('panelGeneral'),
        rows: [
          jsx(SettingsRow, {
            key: 'language',
            title: t('languageLabel'),
            hint: t('languageHint'),
            control: jsx(SegmentedControl, {
              value: language,
              onChange: pickLanguage,
              options: [
                { id: 'system', label: t('followSystem') },
                { id: 'zh', label: t('langZh') },
                { id: 'en', label: t('langEn') }
              ]
            })
          }),
          jsx(SettingsRow, {
            key: 'feedback',
            title: t('feedbackLabel'),
            hint: t('feedbackHint'),
            control: jsx(Button, {
              variant: 'outline',
              size: 'sm',
              onClick: openIssues,
              children: t('feedbackAction')
            })
          })
        ]
      })
    ]
  })
}

// ─── 插件入口 ─────────────────────────────────────────────────────────────────

export default {
  id: ID,
  name: 'Codex Theme',
  // 面板描述的唯一来源（desktop 契约无 version/author 字段，尾注与 plugin.yaml 的 version/author 同步）
  description: 'Codex × ChatGPT inspired theme for the Hermes Desktop chat — dual light/dark palettes that follow the system appearance, graphite-on-paper typography with a 1.7 root line height and content-spacing presets (1.55/1.7/1.8), the OpenAI radius scale (inline 4px / rows 8px / controls 10px / cards 12px / composer 20px), hairline borders, and a bilingual Settings page (appearance mode, 768/880/992px reading width, text & code font presets, zh/en language, GitHub Issues feedback). (v1.1.0 · ethanz-code)',
  register(ctx) {
    storage = ctx.storage
    pluginOs = ctx.os || null
    ctx.i18n.register(LOCALES)
    const t = makeT(ctx.i18n.t)

    // 首次安装时自动接管一次主题；之后完全尊重用户在「外观」里的手动选择
    // （避免每次启动/热重载把用户选的其它主题抢回来）。切回 Codex：
    // 设置页「重新应用」或 ⌘K。
    if (!storage.get('installed', false)) {
      storage.set('installed', true)
      requestTheme('codex')
    }
    applyPrefs()

    // 装载确认（热重载/启动排查的地面真值，见 desktop.log）
    console.log('[codex-theme] register ok v1.1.0')

    // 注册期文案（主题名/描述、⌘K 标签、设置页标题）随语言重建：
    // 主题本体（外观设置网格 / ⌘K / /skin 皆可见）、设置 → 插件 → Codex Theme、⌘K 入口。
    let disposeStatic = () => {}

    const registerStatic = () => {
      disposeStatic()
      const disposeThemeAndPalette = ctx.registerMany([
        { id: 'codex', area: THEMES_AREA, data: buildTheme(t) },
        {
          id: 'palette-apply',
          area: PALETTE_AREA,
          data: {
            id: 'codex-theme.apply',
            label: t('paletteApply'),
            keywords: ['codex', 'theme', '主题', 'appearance', '外观'],
            run: () => {
              requestTheme('codex')
              applyPrefs()
            }
          }
        },
        {
          id: 'palette-settings',
          area: PALETTE_AREA,
          data: {
            id: 'codex-theme.settings',
            label: t('paletteSettings'),
            keywords: ['codex', 'theme', 'settings', '设置', '深色', '浅色', '亮', '暗', 'font', '字体', '代码'],
            run: () => host.navigate(pluginSettingsHref('codex-theme'))
          }
        }
      ])
      const disposeSettingsPage =
        typeof ctx.registerSettingsPage === 'function'
          ? ctx.registerSettingsPage({
              id: 'codex-theme',
              title: t('title'),
              icon: 'paintcan',
              render: () => jsx(SettingsPage, {})
            })
          : (console.error('[codex-theme] ctx.registerSettingsPage unavailable in this build'), () => {})
      disposeStatic = () => {
        disposeThemeAndPalette()
        disposeSettingsPage()
      }
    }

    registerStatic()
    ctx.i18n.onLocaleChange(registerStatic)
    onLanguagePrefChange(registerStatic)
  }
}
