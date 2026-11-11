import { expect, mock, test } from 'claude-code/testing'

const PROPS = {
  hasSurvey: false,
  isWorking: false,
  maxRows: 10,
  bodyColumns: 120,
  scroll: { offset: 0, bodyRows: 10 },
  view: {},
}
const MINUTE = 60000

test('draws the remaining bar with a live reset countdown', async ($, on) => {
  const clock = mock.clock(on)
  const now = clock.now()
  // 40% used, so 60% left; the window resets in 42 minutes
  const rateLimits = [
    { kind: 'five_hour', percentUsed: 40, resetsAt: new Date(now + 42 * MINUTE + 30000).toISOString() },
  ]
  // Answer in the engine's place: no session, no network
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 200000 }, rateLimits } }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))

  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
  await $.session.measure({ context: { window: 200000 }, rateLimits, changed: ['rateLimits' as const] })

  const ui = await $.ui.mount({ plugin: 'usage-bar', surface: 'terminal', component: 'AbovePrompt', props: PROPS })
  const found = async (text: string): Promise<number> => (await ui.findAll({ type: 'Text', text })).length

  expect(await found('5h')).toBeGreaterThan(0)
  expect(await found('60%')).toBe(1)
  expect(await found('↻ 42m')).toBe(1)

  // Two minutes later the timer has moved the countdown
  await clock.advance(2 * MINUTE)
  expect(await found('↻ 40m')).toBe(1)
  expect(await found('↻ 42m')).toBe(0)
})
