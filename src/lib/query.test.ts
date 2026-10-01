import { describe, expect, it } from 'vitest'
import * as boltSize from '../features/bolt-size/calc'
import { BOLT_SIZES, HOLE_CLASSES } from '../features/bolt-size/data'
import { FLANGES, PRESSURE_CLASSES } from '../features/flange-bolt/data'
import * as flange from '../features/flange-bolt/input'
import { TOLERANCE_KINDS } from '../features/general-tolerance/calc'
import { TOLERANCE_CLASSES } from '../features/general-tolerance/data'
import * as tolerance from '../features/general-tolerance/state'
import { oRingNumbers } from '../features/o-ring/calc'
import * as oRing from '../features/o-ring/input'
import { PIPE_THREAD_SIZES } from '../features/pipe-thread/data'
import * as pipeThread from '../features/pipe-thread/input'
import { PIPE_SPEC_KEYS, sizesOf } from '../features/steel-pipe/calc'
import * as steelPipe from '../features/steel-pipe/input'
import { pitchesOf } from '../features/tap-drill/calc'
import { METRIC_SIZES, TOLERANCE_GRADES } from '../features/tap-drill/data'
import * as tapDrill from '../features/tap-drill/input'
import * as threadId from '../features/thread-id/input'
import { QUANTITIES, QUANTITY_KEYS } from '../features/unit-convert/data'
import * as unitConvert from '../features/unit-convert/state'
import { fromQuery, stateQuery, toolHref, toQuery, type FlatState } from './query'

const { DEFAULT_INPUT: TAP_DRILL_DEFAULTS, normalizeTapDrillInput } = tapDrill

const defaults = { d: 10, p: 1.5, grade: 6, drill: '' }

describe('toQuery / fromQuery', () => {
  it('既定値と違う項目だけを書き出す', () => {
    expect(toQuery(defaults, defaults)).toBe('')
    expect(toQuery({ ...defaults, d: 12, p: 1.75 }, defaults)).toBe('d=12&p=1.75')
    expect(toQuery({ ...defaults, drill: '10.2' }, defaults)).toBe('drill=10.2')
  })

  it('クエリから復元し、型を既定値に合わせる', () => {
    expect(fromQuery('?d=12&p=1.75', defaults)).toEqual({
      state: { d: 12, p: 1.75, grade: 6, drill: '' },
      keys: ['d', 'p'],
    })
    expect(fromQuery('drill=8.5', defaults)?.state).toEqual({ ...defaults, drill: '8.5' })
  })

  it('知らないキーだけなら null、数値にならない値も null', () => {
    expect(fromQuery('', defaults)).toBeNull()
    expect(fromQuery('?utm_source=line', defaults)).toBeNull()
    expect(fromQuery('?d=abc', defaults)).toBeNull()
    expect(fromQuery('?d=', defaults)).toBeNull()
  })

  it('往復で元に戻る', () => {
    const state = { d: 3, p: 0.5, grade: 5, drill: '2.5' }
    expect(fromQuery(toQuery(state, defaults), defaults)?.state).toEqual(state)
  })
})

describe('toolHref', () => {
  it('条件付きのリンクを作る', () => {
    expect(toolHref('/tap-drill')).toBe('/tap-drill')
    expect(toolHref('/tap-drill', { d: 12, p: 1.75 })).toBe('/tap-drill?d=12&p=1.75')
    expect(toolHref('/pipe-thread', { size: '1 1/2' })).toBe('/pipe-thread?size=1+1%2F2')
  })
})

describe('stateQuery', () => {
  // d だけ指定されたら、ピッチをそのサイズの最初の値（並目）にする補完
  const coarse: Record<number, number> = { 10: 1.5, 12: 1.75, 16: 2 }
  const normalize = (state: typeof defaults, keys: readonly (keyof typeof defaults)[]) =>
    keys.includes('d') && !keys.includes('p') ? { ...state, p: coarse[state.d] ?? state.p } : state
  const restore = (query: string) => {
    const parsed = fromQuery(query, defaults)!
    return normalize(parsed.state, parsed.keys)
  }

  it('補完で変わらなければ、既定値と違う項目だけを書く', () => {
    expect(stateQuery({ ...defaults, d: 12, p: 1.75 }, defaults, normalize)).toBe('d=12&p=1.75')
    expect(stateQuery({ ...defaults, d: 16, p: 2 }, defaults, normalize)).toBe('d=16&p=2')
  })

  it('既定の条件でも空にせず、戻せる最小の項目を書く（クエリ無しの URL は「前回の入力」の意味になるため）', () => {
    expect(stateQuery(defaults, defaults, normalize)).toBe('d=10')
    expect(restore('d=10')).toEqual(defaults)
    expect(stateQuery(defaults, defaults)).toBe('d=10')
    // 先頭の項目だけでは補完で変わってしまうときは、戻せる次の項目を使う
    const coarseFirst = { p: 1.5, d: 10 }
    const pFromD = (state: typeof coarseFirst, keys: readonly (keyof typeof coarseFirst)[]) =>
      keys.includes('p') && !keys.includes('d') ? { ...state, d: 99 } : state
    expect(stateQuery(coarseFirst, coarseFirst, pFromD)).toBe('d=10')
    // どの1項目でも戻らなければ全項目
    const never = (state: typeof coarseFirst, keys: readonly (keyof typeof coarseFirst)[]) =>
      keys.length < 2 ? { ...state, d: 99 } : state
    expect(stateQuery(coarseFirst, coarseFirst, never)).toBe('p=1.5&d=10')
  })

  it('既定値と同じでも、省くと補完で変わってしまう項目は書く', () => {
    const state = { ...defaults, d: 16, p: 1.5 }
    const query = stateQuery(state, defaults, normalize)
    expect(query).toBe('d=16&p=1.5')
    expect(restore(query)).toEqual(state)
  })

  it('normalize が無ければ toQuery と同じ', () => {
    expect(stateQuery({ ...defaults, d: 16, p: 1.5 }, defaults)).toBe('d=16')
  })

  it('ねじ下穴径: 細目 M16×1.5 を開き直しても細目のまま', () => {
    const state = { ...TAP_DRILL_DEFAULTS, d: 16, p: 1.5 }
    const query = stateQuery(state, TAP_DRILL_DEFAULTS, normalizeTapDrillInput)
    const parsed = fromQuery(query, TAP_DRILL_DEFAULTS)!
    expect(normalizeTapDrillInput(parsed.state, parsed.keys)).toEqual(state)
  })
})

// ---------------------------------------------------------------------------
// 各ツールの入力で、URL に書いた条件が開き直しても同じ条件に戻ること

interface ToolCase<T extends FlatState<T>> {
  /** src/features の下のフォルダ名 */
  dir: string
  /** DEFAULT_INPUT・isValid・normalize を書いているファイル（./input など） */
  module: string
  defaults: T
  isValid: (value: unknown) => value is T
  normalize?: (state: T, keys: readonly (keyof T)[]) => T
  /** 画面で表示しうる条件の例（既定値に重ねる。isValid を通るものだけ確かめる） */
  states: () => Partial<T>[]
  /** 確かめる条件の数の下限（入力の項目が増えて isValid を通らなくなったら気づけるように） */
  minStates: number
  /** URL では表せない（normalize で必ず別の値になる）組み合わせ */
  unrepresentable?: (state: T) => boolean
}

const pick = <V,>(values: readonly V[], index: number): V => values[index % values.length]

function checkTool<T extends FlatState<T>>(tool: ToolCase<T>) {
  const keys = Object.keys(tool.defaults) as (keyof T)[]
  const restore = (query: string): T | null => {
    const parsed = fromQuery(query, tool.defaults)
    if (!parsed) return null
    return tool.normalize ? tool.normalize(parsed.state, parsed.keys) : parsed.state
  }
  const same = (a: T, b: T) => keys.every((key) => a[key] === b[key])

  describe(`stateQuery の往復: ${tool.dir}`, () => {
    it('既定の条件も空でないクエリになり、開き直すと既定の条件に戻る', () => {
      const query = stateQuery(tool.defaults, tool.defaults, tool.normalize)
      expect(query).not.toBe('')
      const restored = restore(query)
      expect(restored).toEqual(tool.defaults)
      expect(tool.isValid(restored)).toBe(true)
    })

    it('表示しうる条件は、どれも空でないクエリになり、開き直すと同じ条件に戻る', () => {
      const states = tool
        .states()
        .map((partial) => ({ ...tool.defaults, ...partial }))
        .filter((state) => tool.isValid(state))
      expect(states.length).toBeGreaterThanOrEqual(tool.minStates)
      const failures: string[] = []
      for (const state of states) {
        const query = stateQuery(state, tool.defaults, tool.normalize)
        if (query === '') failures.push(`空のクエリ: ${JSON.stringify(state)}`)
        if (tool.unrepresentable?.(state)) continue
        const restored = restore(query)
        if (!restored || !same(restored, state)) failures.push(`${query} → ${JSON.stringify(restored)}`)
      }
      expect(failures).toEqual([])
    })
  })

  return { dir: tool.dir, module: tool.module, isValidName: tool.isValid.name, normalizeName: tool.normalize?.name }
}

const FLANGE_OPTIONS = {
  type: ['hex', 'stud'],
  nut: ['style1', 'ja1'],
  washers: [0, 1, 2],
  threads: [1, 2, 3, 4, 5],
  gasket: ['3', '1.5', ''],
  t2: ['', '22'],
  rounding: ['5mm', 'jis'],
  bore: ['', '52.9'],
} as const

const ORING_TEXTS = [
  { mate: '', bottom: '', d1: '', d2: '' },
  { mate: '20', bottom: '', d1: '', d2: '' },
  { mate: '20', bottom: '14.6', d1: '', d2: '' },
  { mate: '45', bottom: '', d1: '', d2: '' },
  { mate: '', bottom: '', d1: '19.8', d2: '2.4' },
  { mate: '', bottom: '', d1: '44.4', d2: '3.1' },
  { mate: 'abc', bottom: '', d1: '19.8', d2: '' },
] as const

const TOOL_CASES = [
  checkTool({
    dir: 'tap-drill',
    module: './input',
    defaults: tapDrill.DEFAULT_INPUT,
    isValid: tapDrill.isTapDrillInput,
    normalize: tapDrill.normalizeTapDrillInput,
    states: () =>
      METRIC_SIZES.flatMap((size) =>
        pitchesOf(size).flatMap((p) =>
          TOLERANCE_GRADES.flatMap((grade) => ['', '8.5', '10,2'].map((drill) => ({ d: size.d, p, grade, drill }))),
        ),
      ),
    minStates: 500,
  }),
  checkTool({
    dir: 'bolt-size',
    module: './calc',
    defaults: boltSize.DEFAULT_INPUT,
    isValid: boltSize.isBoltSizeInput,
    normalize: boltSize.normalizeBoltSizeInput,
    states: () => BOLT_SIZES.flatMap((size) => HOLE_CLASSES.map((holeClass) => ({ d: size.d, holeClass }))),
    minStates: 40,
  }),
  checkTool({
    dir: 'flange-bolt',
    module: './input',
    defaults: flange.DEFAULT_INPUT,
    isValid: flange.isFlangeInput,
    normalize: flange.normalizeFlangeInput,
    // 圧力・呼び径は全部、ほかの項目は呼び径ごとにずらして組み合わせる
    states: () =>
      PRESSURE_CLASSES.flatMap((pressure) =>
        FLANGES[pressure].flatMap((row, i) =>
          [0, 1, 2, 3, 4, 5].map((j) => ({
            pressure,
            size: row.size,
            type: pick(FLANGE_OPTIONS.type, i + j),
            nut: pick(FLANGE_OPTIONS.nut, i + (j >> 1)),
            washers: pick(FLANGE_OPTIONS.washers, i + j),
            threads: pick(FLANGE_OPTIONS.threads, i * 2 + j),
            gasket: pick(FLANGE_OPTIONS.gasket, i + (j >> 1)),
            t2: pick(FLANGE_OPTIONS.t2, i + (j >> 2)),
            rounding: pick(FLANGE_OPTIONS.rounding, i + (j >> 2) + 1),
            bore: pick(FLANGE_OPTIONS.bore, i + j + 1),
          })),
        ),
      ),
    minStates: 300,
  }),
  checkTool({
    dir: 'general-tolerance',
    module: './state',
    defaults: tolerance.DEFAULT_INPUT,
    isValid: tolerance.isGeneralToleranceInput,
    normalize: tolerance.normalizeInput,
    states: () =>
      TOLERANCE_KINDS.flatMap((kind) =>
        TOLERANCE_CLASSES.flatMap((cls) =>
          ['50', '0.5', '120', '', '2000', '12.5'].flatMap((d) =>
            ['90', '45', '', '30.5'].map((angle) => ({ kind, cls, d, angle })),
          ),
        ),
      ),
    minStates: 200,
  }),
  checkTool({
    dir: 'o-ring',
    module: './input',
    defaults: oRing.DEFAULT_INPUT,
    isValid: oRing.isORingInput,
    normalize: oRing.normalizeORingInput,
    states: () =>
      (['P', 'G'] as const).flatMap((series) =>
        oRingNumbers(series).flatMap((no, i) =>
          (['number', 'mating', 'measure'] as const).flatMap((mode) =>
            (['piston', 'rod'] as const).map((housing, h) => ({
              series,
              no,
              mode,
              housing,
              groove: mode === 'mating' ? 'cylinder' : pick(oRing.GROOVE_KINDS, i + h),
              backup: pick([0, 1, 2] as const, i),
              ...pick(ORING_TEXTS, i + h),
            })),
          ),
        ),
      ),
    minStates: 500,
    // 相手寸法から選ぶのは円筒面の溝だけ（normalize で溝の形を円筒面にする）
    unrepresentable: (state) => state.mode === 'mating' && state.groove !== 'cylinder',
  }),
  checkTool({
    dir: 'pipe-thread',
    module: './input',
    defaults: pipeThread.DEFAULT_INPUT,
    isValid: pipeThread.isPipeThreadInput,
    normalize: pipeThread.normalizePipeThreadInput,
    states: () => PIPE_THREAD_SIZES.flatMap((size) => pipeThread.KIND_KEYS.map((kind) => ({ size: size.size, kind }))),
    minStates: 40,
  }),
  checkTool({
    dir: 'steel-pipe',
    module: './input',
    defaults: steelPipe.DEFAULT_INPUT,
    isValid: steelPipe.isSteelPipeInput,
    normalize: steelPipe.normalizeSteelPipeInput,
    states: () =>
      PIPE_SPEC_KEYS.flatMap((spec) =>
        sizesOf(spec).flatMap((size) =>
          ['5.5', '4', '', '6,0'].flatMap((length) => ['1', '10', ''].map((count) => ({ spec, a: size.a, length, count }))),
        ),
      ),
    minStates: 300,
  }),
  checkTool({
    dir: 'thread-id',
    module: './input',
    defaults: threadId.DEFAULT_INPUT,
    isValid: threadId.isThreadIdInput,
    normalize: threadId.normalizeThreadIdInput,
    states: () =>
      threadId.SIDE_KEYS.flatMap((side) =>
        threadId.PITCH_MODES.flatMap((mode) =>
          ['', '20.45'].flatMap((dia) =>
            ['', '1.5'].flatMap((pitch) =>
              ['', '14'].flatMap((tpi) =>
                ['11', '', '6'].flatMap((n) =>
                  ['', '15'].flatMap((len) =>
                    ['', '20.1'].flatMap((dia2) =>
                      ['', '10'].map((gap) => ({ side, mode, dia, pitch, tpi, n, len, dia2, gap })),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    minStates: 1000,
  }),
  checkTool({
    dir: 'unit-convert',
    module: './state',
    defaults: unitConvert.DEFAULT_INPUT,
    isValid: unitConvert.isUnitConvertInput,
    normalize: unitConvert.normalizeInput,
    states: () =>
      QUANTITY_KEYS.flatMap((q) =>
        QUANTITIES[q].units.flatMap((from) =>
          QUANTITIES[q].units
            .filter((to) => to.id !== from.id)
            .flatMap((to) =>
              ['1', '-5', '', '2.5'].flatMap((v) =>
                (['gauge', 'abs'] as const).map((ref) => ({ q, v, from: from.id, to: to.id, ref })),
              ),
            ),
        ),
      ),
    minStates: 500,
  }),
]

describe('stateQuery の往復: 全ツールを確かめているか', () => {
  // 画面のファイルから useToolState(キー, DEFAULT_INPUT, isValid, normalize) の呼び出しを探す
  const sources = import.meta.glob<string>('../features/*/*Tool.tsx', {
    query: '?raw',
    import: 'default',
    eager: true,
  })
  const calls = Object.entries(sources).flatMap(([path, source]) =>
    [...source.matchAll(/useToolState\(\s*[^,]+?,\s*(\w+),\s*(\w+)(?:,\s*(\w+))?\s*,?\s*\)/g)].map((match) => ({
      dir: path.split('/')[2],
      defaultsName: match[1],
      isValidName: match[2],
      normalizeName: match[3],
      defaultsModule: new RegExp(`import \\{[^}]*\\b${match[1]}\\b[^}]*\\} from '([^']+)'`).exec(source)?.[1],
    })),
  )

  it('useToolState を使う画面は、すべて上の一覧で確かめている', () => {
    expect(calls.length).toBeGreaterThan(0)
    for (const call of calls) {
      const tool = TOOL_CASES.find((candidate) => candidate.dir === call.dir)
      expect(tool, call.dir).toBeDefined()
      expect(call.defaultsName, call.dir).toBe('DEFAULT_INPUT')
      expect(call.defaultsModule, call.dir).toBe(tool!.module)
      expect(call.isValidName, call.dir).toBe(tool!.isValidName)
      expect(call.normalizeName, call.dir).toBe(tool!.normalizeName)
    }
    expect(calls.map((call) => call.dir).sort()).toEqual(TOOL_CASES.map((tool) => tool.dir).sort())
  })
})
