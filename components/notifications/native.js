// components/notifications/native.js — 桌面系统通知投递（纯 Host 侧，无 ctx 副作用）
//
// 为什么需要这一层：
//   浏览器里的 `new Notification()` 只在「网页」里有效。DSH desktop 是 Electron
//   壳（app.asar 的 /lib/preload-app.cjs 只暴露 dshDesktop.browser/deviceInfo/
//   keyboard/shortcuts/updates，没有任何通知 IPC），页面里的 Notification API
//   即使拿到 granted，弹出来的东西用户也经常看不到——窗口失焦、被遮挡、或用户
//   根本没在 DSH 窗口里。所以「应用级通知」必须由 Host 进程直接调用操作系统
//   的通知中心，绕开浏览器。
//
// 通道（全部用 execFile 直传 argv，**不经过 shell**，因此不存在命令注入）：
//   macOS   /usr/bin/osascript -e <script> <title> <body> <subtitle> <sound>
//   Linux   notify-send --app-name=… --urgency=… <title> <body>
//   Windows 暂不支持（回归 { ok:false, reason:'unsupported-platform' }）
//
// 三条注意：
//   1. `osascript` 发通知时，通知中心里的应用名是「Script Editor」/「osascript」
//      而不是 DSH 本体——这是 macOS 的限制（第三方进程无法冒充已签名的 app id
//      发通知）。能弹出来、能点进来就达到目的了。
//   2. 调用一律异步 + 超时 + 只记日志。发通知失败绝不影响会话，也绝不阻塞
//      事件分发（turn/end 的监听器里同步等 3 秒会把整个 agent 卡住）。
//   3. 探测结果缓存：第一次真的要用时才 `execFile`，之后复用；探测失败也缓存，
//      避免每条通知都去 spawn 一个必然失败的进程。

import { execFile } from 'node:child_process'

/** 单次投递的硬超时。osascript 正常 100ms 内返回，卡住就是系统级异常。 */
const DELIVERY_TIMEOUT_MS = 5000
/** 通知中心里显示的应用名（Linux 的 --app-name）。 */
const APP_NAME = 'DeepSeek Harness'
/** 可选的提示音（macOS）。其它平台忽略。 */
const SOUND_NAME = 'Glass'

/**
 * macOS 的 AppleScript。参数全部从 argv 取，脚本里不拼任何用户文本，
 * 因此标题/正文里出现引号、反斜杠、`$()` 都不会出问题（实测过）。
 */
const APPLESCRIPT = [
  'on run argv',
  '  set theTitle to item 1 of argv',
  '  set theBody to item 2 of argv',
  '  set theSubtitle to item 3 of argv',
  '  set theSound to item 4 of argv',
  '  set theSoundOn to (theSound is "1")',
  '  if theSubtitle is "" then',
  '    if theSoundOn then',
  '      display notification theBody with title theTitle sound name "' + SOUND_NAME + '"',
  '    else',
  '      display notification theBody with title theTitle',
  '    end if',
  '  else',
  '    if theSoundOn then',
  '      display notification theBody with title theTitle subtitle theSubtitle sound name "' + SOUND_NAME + '"',
  '    else',
  '      display notification theBody with title theTitle subtitle theSubtitle',
  '    end if',
  '  end if',
  'end run',
].join('\n')

/**
 * 把通知级别映射成 Linux 的 urgency。macOS 没有等价概念，只用来决定要不要响。
 * `action` 代表「有人在等你操作」，比普通错误更该打断，所以给 critical。
 */
const URGENCY = {
  info: 'normal',
  warning: 'normal',
  error: 'critical',
  action: 'critical',
}

/** 探测结果缓存：`null` 表示还没探测过。 */
let probeCache = null

function run(command, args) {
  return new Promise((resolve) => {
    let settled = false
    const done = (value) => {
      if (settled) return
      settled = true
      resolve(value)
    }
    try {
      const child = execFile(command, args, { timeout: DELIVERY_TIMEOUT_MS, windowsHide: true }, (error, stdout, stderr) => {
        if (error === null || error === undefined) {
          done({ ok: true })
          return
        }
        // ENOENT = 这个命令根本没有；其它错误把 stderr 带回去，方便用户排查。
        const reason = error.code === 'ENOENT' ? 'missing-command' : 'exec-failed'
        done({ ok: false, reason, message: String(stderr || error.message || error).trim() })
      })
      // 子进程不该拖住 Host 退出。
      if (child !== null && typeof child === 'object' && typeof child.unref === 'function') child.unref()
    } catch (cause) {
      done({ ok: false, reason: 'spawn-failed', message: String(cause !== null && typeof cause === 'object' && typeof cause.message === 'string' ? cause.message : cause) })
    }
  })
}

/**
 * 探测当前平台能不能发系统通知。结果缓存，失败也缓存。
 * @returns {Promise<{ supported: boolean, platform: string, channel: string, reason?: string }>}
 */
export async function probe() {
  // 关掉整条通道：自检不该真的往用户屏幕上弹通知；用户也可能想临时静音。
  if (process.env.NOTIFICATIONS_NATIVE === 'off') {
    return { supported: false, platform: process.platform, channel: 'none', reason: 'disabled-by-env' }
  }
  if (probeCache !== null) return probeCache
  const platform = process.platform
  if (platform === 'darwin') {
    const result = await run('/usr/bin/osascript', ['-e', 'return 1'])
    probeCache = result.ok
      ? { supported: true, platform, channel: 'osascript' }
      : { supported: false, platform, channel: 'osascript', reason: result.reason }
    return probeCache
  }
  if (platform === 'linux') {
    const result = await run('notify-send', ['--version'])
    probeCache = result.ok
      ? { supported: true, platform, channel: 'notify-send' }
      : { supported: false, platform, channel: 'notify-send', reason: result.reason }
    return probeCache
  }
  probeCache = { supported: false, platform, channel: 'none', reason: 'unsupported-platform' }
  return probeCache
}

/**
 * 发一条系统通知。永不抛异常；失败返回 `{ ok:false, reason }`。
 *
 * @param {{ title?: string, body?: string, subtitle?: string, level?: string, sound?: boolean }} input
 * @returns {Promise<{ ok: boolean, channel?: string, reason?: string, message?: string }>}
 */
export async function send(input) {
  const source = input !== null && typeof input === 'object' ? input : {}
  const title = String(source.title === undefined || source.title === null ? '' : source.title).trim() || APP_NAME
  const body = String(source.body === undefined || source.body === null ? '' : source.body).trim()
  const subtitle = String(source.subtitle === undefined || source.subtitle === null ? '' : source.subtitle).trim()
  const level = typeof source.level === 'string' ? source.level : 'info'
  const sound = source.sound === true

  const info = await probe()
  if (info.supported !== true) {
    return { ok: false, reason: info.reason !== undefined ? info.reason : 'unsupported-platform', channel: info.channel }
  }
  if (info.channel === 'osascript') {
    const result = await run('/usr/bin/osascript', ['-e', APPLESCRIPT, title, body, subtitle, sound ? '1' : '0'])
    return result.ok ? { ok: true, channel: 'osascript' } : { ok: false, reason: result.reason, message: result.message, channel: 'osascript' }
  }
  if (info.channel === 'notify-send') {
    const args = ['--app-name=' + APP_NAME, '--urgency=' + (URGENCY[level] !== undefined ? URGENCY[level] : 'normal')]
    if (sound) args.push('--hint=string:sound-name:message-new-instant')
    args.push(title, body === '' ? title : body)
    const result = await run('notify-send', args)
    return result.ok ? { ok: true, channel: 'notify-send' } : { ok: false, reason: result.reason, message: result.message, channel: 'notify-send' }
  }
  return { ok: false, reason: 'unsupported-platform', channel: info.channel }
}

/**
 * 打开操作系统的「通知」设置页。
 *
 * 用途：用户「没收到通知 / 看到横幅一闪就没了」时，十有八九不是我们没发出去，
 * 而是系统里这个应用的提醒样式被设成了「横幅」。只有用户自己能改那个设置，
 * 插件能做的是把他直接送到那一页（省掉「设置 → 通知 → 翻应用列表」）。
 *
 * 永不抛异常；失败返回 `{ ok:false, reason }`。
 * @returns {Promise<{ ok: boolean, channel?: string, reason?: string, message?: string }>}
 */
export async function openSettings() {
  // 自检绝不能真的在你脸上打开「系统设置」窗口，所以和 probe/send 一样认这个开关。
  if (process.env.NOTIFICATIONS_NATIVE === 'off') {
    return { ok: false, reason: 'disabled-by-env' }
  }
  if (process.platform === 'darwin') {
    const result = await run('/usr/bin/open', ['x-apple.systempreferences:com.apple.Notifications-Settings.extension'])
    return result.ok ? { ok: true, channel: 'system-settings' } : { ok: false, reason: result.reason, message: result.message }
  }
  if (process.platform === 'linux') {
    // GNOME / KDE 都有通知设置面板，能打开就打开，打不开就告诉用户自己去。
    const result = await run('gnome-control-center', ['notifications'])
    return result.ok ? { ok: true, channel: 'system-settings' } : { ok: false, reason: result.reason, message: result.message }
  }
  return { ok: false, reason: 'unsupported-platform' }
}

/** 自检用：清掉探测缓存，让下一次 probe 重新跑。 */
export function resetProbe() {
  probeCache = null
}
