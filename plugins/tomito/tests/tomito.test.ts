import { expect, mock, test } from 'claude-code/testing'
import type { On, RenderElement } from 'claude-code'

type Fake = { activity: string; seconds: number; isTicking: boolean; day: string; told: string[] }

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

function fakeTomito(on: On, fake: Fake) {
  on('process.run', ($, e) => {
    const done = (stdout: string) => ({
      value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
    })
    if (e.argv[0] === 'date') return done(`${fake.day}\n`)
    if (e.argv[0] === 'open') {
      fake.told.push('open')
      Object.assign(fake, { activity: 'Session', seconds: 1800, isTicking: false })
      return done('')
    }
    const script = e.argv.filter((_, i) => i % 2 === 0 && i > 0).join('\n')
    const told = /tell application "Tomito" to (\w+)$/.exec(script)?.[1]
    if (told) {
      fake.told.push(told)
      if (told === 'start') fake.isTicking = true
    }
    const stdout = told ? '' : `${fake.activity}|${mmss(fake.seconds)}`
    if (fake.isTicking) fake.seconds -= 3
    return done(stdout)
  })
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('ui.toast', () => ({ value: undefined }))
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('ui.render', ($, e) => {
    const { Box } = $.ui.resolve(e)
    return h(Box, {}) as RenderElement
  })
}

const START = { cwd: '/', surface: 'terminal', isInteractive: true } as const
const BAND = { plugin: 'tomito', surface: 'terminal', component: 'AbovePrompt' } as const
const PROPS = { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 80 } as never

const newFake = (over: Partial<Fake> = {}): Fake => ({
  activity: 'Session', seconds: 1800, isTicking: false, day: '2026-10-13', told: [], ...over,
})

test('focus ending raises the band, and Start break starts the break', async ($, on) => {
  const fake = newFake({ seconds: 6, isTicking: true })
  fakeTomito(on, fake)
  mock.store(on, { day: '2026-10-13' })
  const clock = mock.clock(on)

  await $.session.start(START)
  const before = await $.ui.mount({ ...BAND, props: PROPS })
  expect(await before.find({ text: /Focus session done/ })).toBeUndefined()
  await before.unmount()

  fake.activity = 'Short Break'
  fake.seconds = 300
  fake.isTicking = false
  await clock.advance(3000)
  await clock.advance(3000)

  const ui = await $.ui.mount({ ...BAND, props: PROPS })
  expect(await ui.find({ text: /Focus session done/ })).toBeDefined()
  await ui.press({ key: 'break' })
  expect(fake.told).toEqual(['start'])
  expect(await ui.find({ text: /Focus session done/ })).toBeUndefined()
})

test('a new day relaunches a paused Tomito, back to a full session', async ($, on) => {
  const fake = newFake({ seconds: 754 })
  fakeTomito(on, fake)
  mock.store(on, { day: '2026-10-12' })
  const clock = mock.clock(on)

  await $.session.start(START)
  await clock.advance(3000)
  await clock.advance(3000)
  expect(fake.told).toEqual(['quit', 'open'])

  await clock.advance(120_000)
  expect(fake.told).toEqual(['quit', 'open'])
})

test('a new day leaves a running timer alone, even once it pauses', async ($, on) => {
  const fake = newFake({ seconds: 900, isTicking: true })
  fakeTomito(on, fake)
  mock.store(on, { day: '2026-10-12' })
  const clock = mock.clock(on)

  await $.session.start(START)
  await clock.advance(3000)
  expect(fake.told).toEqual([])

  fake.isTicking = false
  await clock.advance(120_000)
  expect(fake.told).toEqual([])
})
