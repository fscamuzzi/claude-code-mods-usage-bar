import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { UsageWindow } from '../types'

const limits = atom({ plugin: 'usage-bar', key: 'limits' } as const, [] as UsageWindow[])
const tick = atom({ plugin: 'usage-bar', key: 'tick' } as const, 0)

const PANE = 'usage-bar'
const BAR_CELLS = 10
const VIOLET = '#8b5cf6'
const LABELS: Record<string, string> = { five_hour: '5h', seven_day: 'Week', spend_limit: 'Spend' }

// Read the rate-limit windows from the engine; keep the old ones on an empty reading
const refreshLimits = async ($: EngineInterface): Promise<UsageWindow[]> => {
  const { rateLimits } = await $.session.usage()
  const rows = rateLimits.map(r => ({ kind: r.kind, percentUsed: r.percentUsed, resetsAt: r.resetsAt }))
  if (rows.length > 0) await update($, limits, () => rows)
  return rows
}

const formatEta = (ms: number): string => {
  if (ms <= 0) return 'now'
  const minutes = Math.floor(ms / 60000)
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  if (days > 0) return `${days}d${hours}h`
  if (hours > 0) return `${hours}h${minutes % 60}m`
  return `${minutes}m`
}

type Part = { text: string; color?: string; dim?: boolean }

// Pass only the props that are set
const textProps = (p: Part) => ({
  ...(p.color === undefined ? {} : { color: p.color }),
  ...(p.dim ? { dimColor: true } : {}),
})

// One window: label, bar of what is LEFT, percent and reset countdown
const toParts = (w: UsageWindow, now: number): Part[] => {
  const remaining = Math.max(0, Math.min(100, 100 - w.percentUsed))
  const filled = Math.round((remaining / 100) * BAR_CELLS)
  const eta = w.resetsAt ? ` ↻ ${formatEta(Date.parse(w.resetsAt) - now)}` : ''
  const parts: Part[] = [
    { text: `${LABELS[w.kind] ?? w.kind} `, dim: true },
    { text: '█'.repeat(filled), color: VIOLET },
    { text: '░'.repeat(BAR_CELLS - filled), dim: true },
    { text: ` ${Math.round(remaining)}%`, color: VIOLET },
    { text: eta, dim: true },
    { text: '   ' },
  ]
  return parts.filter(p => p.text !== '')
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await refreshLimits($)
    // Every minute: move the countdowns and re-read the figures
    $.clock.every(60000, () => {
      void update($, tick, n => n + 1)
      void refreshLimits($).catch((error: unknown) =>
        $.ui.log(`usage not re-read (${String(error)})`, { to: 'debug' }),
      )
    })
    await $.command.register({ name: 'usage-bar', description: 'Show remaining plan usage in a pane' })
    return next(e)
  })

  // After each turn, and when a plan limit's percent changes
  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('rateLimits')) {
      await update($, limits, () =>
        e.rateLimits.map(r => ({ kind: r.kind, percentUsed: r.percentUsed, resetsAt: r.resetsAt })),
      )
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const rows = await read($, limits)
    await read($, tick)
    // Nothing to show yet, or a survey holds the band: leave it alone
    if (e.props.hasSurvey || rows.length === 0) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const now = await $.clock.now()
    // Keep what the mods after mine draw in the band
    const below = await next(e)
    return (
      <Box flexDirection="column">
        {below}
        <Box>
          {rows.flatMap(w => toParts(w, now)).map(p => (
            <Text {...textProps(p)}>{p.text}</Text>
          ))}
        </Box>
      </Box>
    )
  })

  on('command.run', { command: 'usage-bar' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Usage' })
    return { text: 'Usage pane opened.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const rows = await read($, limits)
    await read($, tick)
    const { Box, Text } = $.ui.resolve(e)
    if (rows.length === 0) return <Text dimColor>No usage data yet.</Text>
    const now = await $.clock.now()
    return (
      <Box flexDirection="column">
        {rows.map(w => (
          <Box>
            {toParts(w, now).map(p => (
              <Text {...textProps(p)}>{p.text}</Text>
            ))}
          </Box>
        ))}
      </Box>
    )
  })
}
