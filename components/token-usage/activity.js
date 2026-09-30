export const name = 'token-usage-activity'
export const inject = ['sessions', 'sessionPersistence', 'sessionController', 'connection']

function tokenCount(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0
}

function pad(n) {
  return String(n).padStart(2, '0')
}

function dayKey(ms) {
  const d = new Date(ms)
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function usageOf(event) {
  if (event === null || typeof event !== 'object' || event.type !== 'assistant/message') return null
  const data = event.data
  if (data === null || typeof data !== 'object' || data.usage === null || typeof data.usage !== 'object') return null
  return { time: typeof event.time === 'number' ? event.time : 0, usage: data.usage }
}

function extractCalls(events, inherited) {
  const calls = []
  for (const event of events) {
    if (tokenCount(event.seq) < inherited) continue
    const found = usageOf(event)
    if (found === null) continue
    calls.push({
      time: found.time,
      tokens:
        tokenCount(found.usage.inputTokens) +
        tokenCount(found.usage.outputTokens) +
        tokenCount(found.usage.cacheReadTokens) +
        tokenCount(found.usage.cacheWriteTokens),
    })
  }
  return calls
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length)
  let index = 0
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length || 1)) }, async () => {
    while (index < items.length) {
      const current = index
      index += 1
      results[current] = await fn(items[current], current)
    }
  })
  await Promise.all(workers)
  return results
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

export function apply(ctx) {
  let cache = null

  async function collectCalls() {
    const sessions = ctx.get('sessions')
    const persistence = ctx.get('sessionPersistence')
    const controller = ctx.get('sessionController')
    const entries = []
    const seen = new Set()
    if (sessions !== undefined) {
      for (const session of sessions.list()) {
        seen.add(String(session.id))
        entries.push({ id: String(session.id), live: true, session })
      }
    }
    if (controller !== undefined) {
      try {
        const listed = await controller.list({})
        for (const item of listed && Array.isArray(listed.items) ? listed.items : []) {
          const id = String(item.sessionId)
          if (seen.has(id)) continue
          seen.add(id)
          entries.push({ id, live: false })
        }
      } catch { /* ignore */ }
    }
    const calls = []
    await mapLimit(entries, 6, async (entry) => {
      try {
        if (entry.live) {
          calls.push(...extractCalls(entry.session.snapshotEvents(), tokenCount(entry.session.inheritedEventCount)))
          return
        }
        if (persistence !== undefined) {
          const handle = await persistence.open(entry.id, 'read')
          try {
            const result = await handle.read()
            calls.push(...extractCalls(result.events, tokenCount(handle.inheritedEventCount)))
          } finally {
            await handle.close()
          }
          return
        }
        if (controller !== undefined) {
          const result = await controller.inspect(entry.id)
          calls.push(...extractCalls(result.events, tokenCount(result.inheritedEventCount)))
        }
      } catch { /* skip session */ }
    })
    return calls
  }

  async function build() {
    if (cache !== null && Date.now() - cache.at < 15000) return cache.value
    const end = startOfDay(new Date())
    const start = new Date(end)
    start.setDate(start.getDate() - 364)
    const weekday = start.getDay() === 0 ? 6 : start.getDay() - 1
    start.setDate(start.getDate() - weekday)
    const days = []
    const byKey = new Map()
    for (let cursor = new Date(start); cursor.getTime() <= end.getTime() + 86400000 - 1; cursor.setDate(cursor.getDate() + 1)) {
      const key = dayKey(cursor.getTime())
      const item = { date: key, requests: 0, tokens: 0 }
      days.push(item)
      byKey.set(key, item)
    }
    const from = start.getTime()
    const to = end.getTime() + 86400000 - 1
    for (const call of await collectCalls()) {
      if (!call.time || call.time < from || call.time > to) continue
      const item = byKey.get(dayKey(call.time))
      if (!item) continue
      item.requests += 1
      item.tokens += call.tokens || 0
    }
    while (days.length % 7 !== 0) {
      days.push({ date: '', requests: 0, tokens: 0 })
    }
    const activeDays = days.filter((item) => item.date && item.requests > 0).length
    const value = {
      start: start.getTime(),
      end: end.getTime(),
      activeDays,
      days,
    }
    cache = { at: Date.now(), value }
    return value
  }

  ctx.effect(() => {
    let disposeRoute
    const attempt = (remaining) => {
      try {
        disposeRoute = ctx.connection.fetch.register({
          path: '/api/token-usage/activity',
          methods: ['GET'],
          requestBody: 'buffered',
          fetch: async () => {
            try {
              return json(await build())
            } catch (cause) {
              return json({ code: 'token-usage/activity-failed', message: String(cause?.message || cause) }, 500)
            }
          },
        })
        return true
      } catch (cause) {
        const message = String((cause && cause.message) || cause)
        if (remaining > 0 && message.includes('already registered')) {
          ctx.timeout(() => {
            if (disposeRoute === undefined) attempt(remaining - 1)
          }, 400)
          return false
        }
        return false
      }
    }
    attempt(10)
    return () => {
      if (disposeRoute !== undefined) disposeRoute()
    }
  }, 'token-usage: /api/token-usage/activity')

  const invalidate = () => { cache = null }
  ctx.effect(() => ctx.on('session/event', (session, event) => {
    if (event !== null && typeof event === 'object' && event.type === 'assistant/message') invalidate()
  }), 'token-usage-activity: events')
}
