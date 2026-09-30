import { describe, expect, it } from 'vitest'
import {
  candidateHref,
  candidatesFor,
  diameterSigma,
  distanceToRange,
  hasFormAmbiguity,
  judgeTaper,
  matchLevel,
  pitchFromCount,
  pitchFromTpi,
  rankCandidates,
  relatedLinksFor,
  tpiFromPitch,
  type Measurement,
} from './calc'

const top = (measurement: Measurement, count = 5) =>
  rankCandidates(measurement)
    .slice(0, count)
    .map((c) => c.label)

describe('ピッチ', () => {
  it('山数 ⇔ ピッチ', () => {
    expect(pitchFromTpi(14)).toBeCloseTo(1.8143, 4)
    expect(pitchFromTpi(28)).toBeCloseTo(0.9071, 4)
    expect(tpiFromPitch(1.75)).toBeCloseTo(14.514, 3)
    expect(tpiFromPitch(pitchFromTpi(19))).toBeCloseTo(19, 9)
  })

  it('山頂 n 個の距離 L から P = L ÷ (n − 1)', () => {
    // 14山のねじで11山（10ピッチ）を測ると 18.14mm
    expect(pitchFromCount(11, 18.14)).toBeCloseTo(1.814, 3)
    expect(pitchFromCount(11, 17.5)).toBe(1.75)
    expect(pitchFromCount(2, 1.5)).toBe(1.5)
  })

  it('数えた山が1個以下・整数でない・距離が0以下なら null', () => {
    expect(pitchFromCount(1, 10)).toBeNull()
    expect(pitchFromCount(0, 10)).toBeNull()
    expect(pitchFromCount(10.5, 10)).toBeNull()
    expect(pitchFromCount(11, 0)).toBeNull()
    expect(pitchFromCount(11, -3)).toBeNull()
    expect(pitchFromCount(11, Number.NaN)).toBeNull()
  })
})

describe('テーパの判定（2か所の外径）', () => {
  it('10mm 離れて 0.625mm 違えばテーパ（1/16）', () => {
    const result = judgeTaper(20.45, 21.075, 10)
    expect(result.expected).toBe(0.625)
    expect(result.difference).toBeCloseTo(0.625, 9)
    expect(result.verdict).toBe('taper')
  })

  it('同じ径なら平行', () => {
    expect(judgeTaper(20.9, 20.92, 10).verdict).toBe('parallel')
  })

  it('境目は差 = 間隔 ÷ 32', () => {
    expect(judgeTaper(20, 20.3125, 10).verdict).toBe('taper')
    expect(judgeTaper(20, 20.3, 10).verdict).toBe('parallel')
  })

  it('間隔が短すぎる・差が大きすぎるときは判定しない', () => {
    expect(judgeTaper(20, 20.2, 3)).toMatchObject({ verdict: 'unclear', reason: 'short' })
    expect(judgeTaper(20, 21.5, 10)).toMatchObject({ verdict: 'unclear', reason: 'too-large' })
  })
})

describe('候補の範囲', () => {
  it('R1/2 おねじ: 管端 20.955 − 8.16/16 = 20.445 〜 有効ねじ部の端 20.955 + (13.2 − 8.16)/16 = 21.27', () => {
    const r = candidatesFor('external').find((c) => c.key === 'R1/2')!
    expect(r.range).toEqual({ min: 20.445, max: 21.27 })
    expect(r.form).toBe('taper')
  })

  it('Rc1/2 めねじ: 奥端 18.631 − 12.7/16 = 17.837 〜 入口 18.631', () => {
    const rc = candidatesFor('internal').find((c) => c.key === 'Rc1/2')!
    expect(rc.range).toEqual({ min: 17.837, max: 18.631 })
  })

  it('M12 めねじ: 6H の内径 10.106〜10.441', () => {
    const m12 = candidatesFor('internal').find((c) => c.key === 'M12x1.75')!
    expect(m12.label).toBe('M12')
    expect(m12.range).toEqual({ min: 10.106, max: 10.441 })
  })

  it('細目は「M12×1.25」、G と Rp のめねじは1つの候補', () => {
    expect(candidatesFor('external').find((c) => c.key === 'M12x1.25')!.label).toBe('M12×1.25')
    const g = candidatesFor('internal').find((c) => c.key === 'G1/2')!
    expect(g.label).toBe('G1/2・Rp1/2')
    expect(g.range).toEqual({ min: 18.631, max: 19.172 })
  })

  it('すべての候補で min ≤ basic 付近 ≤ max、キーは重複しない', () => {
    for (const side of ['external', 'internal'] as const) {
      const list = candidatesFor(side)
      expect(new Set(list.map((c) => c.key)).size).toBe(list.length)
      for (const c of list) expect(c.range.min, c.key).toBeLessThanOrEqual(c.range.max)
    }
  })

  it('範囲からの距離', () => {
    expect(distanceToRange(20.5, { min: 20.445, max: 21.27 })).toBe(0)
    expect(distanceToRange(20.4, { min: 20.445, max: 21.27 })).toBe(-0.045)
    expect(distanceToRange(12.2, { min: 12, max: 12 })).toBe(0.2)
  })
})

describe('判別（アイデアの例）', () => {
  it('外径 20.45・14山 → R1/2 が1位（M20 ではない）', () => {
    const ranked = top({ side: 'external', diameter: 20.45, pitch: pitchFromTpi(14) })
    expect(ranked[0]).toBe('R1/2')
    expect(ranked[1]).toBe('G1/2')
    expect(ranked).not.toContain('M20')
  })

  it('外径 11.8・P1.75 → M12 が1位', () => {
    const ranked = rankCandidates({ side: 'external', diameter: 11.8, pitch: 1.75 })
    expect(ranked[0].label).toBe('M12')
    expect(ranked[0].deltaDiameter).toBe(-0.2)
    expect(ranked[0].deltaPitch).toBe(0)
    expect(matchLevel(ranked[0].score)).toBe('good')
  })

  it('外径 9.7・28山 → R1/8・G1/8 が M10×1 より上', () => {
    const ranked = top({ side: 'external', diameter: 9.7, pitch: pitchFromTpi(28) }, 10)
    expect(ranked.slice(0, 2).sort()).toEqual(['G1/8', 'R1/8'])
    expect(ranked.indexOf('M10×1')).toBeGreaterThan(1)
  })

  it('10ピッチを数えた値（11山で 18.14mm）でも R1/2', () => {
    const pitch = pitchFromCount(11, 18.14)!
    expect(top({ side: 'external', diameter: 20.45, pitch })[0]).toBe('R1/2')
  })

  it('メートルのピッチゲージで 14山を 1.75 と読んでも R1/2 が1位', () => {
    expect(top({ side: 'external', diameter: 20.45, pitch: 1.75 })[0]).toBe('R1/2')
  })

  it('ピッチが無いと径だけで並べ、メートルねじは呼び径ごとに1つ（外径 20.0 → M20）', () => {
    const ranked = rankCandidates({ side: 'external', diameter: 20, pitch: null })
    expect(ranked[0].label).toBe('M20')
    expect(ranked[0].deltaPitch).toBeNull()
    expect(ranked.filter((c) => c.metric?.size.d === 20)).toHaveLength(1)
    // 並目の無いサイズは最初の細目
    expect(ranked.find((c) => c.metric?.size.d === 15)?.label).toBe('M15×1.5')
  })

  it('ピッチが無いと、外径 20.4 は R1/2（管端）と M20 が両方上位に出る', () => {
    const ranked = top({ side: 'external', diameter: 20.4, pitch: null }, 3)
    expect(ranked).toContain('R1/2')
    expect(ranked).toContain('M20')
  })

  it('径だけでは R と G を区別できないとき、テーパの判定で順位が決まる（外径 20.95・14山）', () => {
    const measurement: Measurement = { side: 'external', diameter: 20.95, pitch: pitchFromTpi(14) }
    const ranked = rankCandidates(measurement)
    expect(ranked.slice(0, 2).map((c) => c.label).sort()).toEqual(['G1/2', 'R1/2'])
    expect(hasFormAmbiguity(ranked)).toBe(true)
    expect(top({ ...measurement, form: 'parallel' })[0]).toBe('G1/2')
    expect(top({ ...measurement, form: 'taper' })[0]).toBe('R1/2')
    expect(hasFormAmbiguity(rankCandidates({ ...measurement, form: 'parallel' }))).toBe(false)
  })

  it('管端を測った値（20.5）でテーパと分かれば R1/2、平行と分かれば G1/2 が1位', () => {
    expect(top({ side: 'external', diameter: 20.5, pitch: pitchFromTpi(14), form: 'taper' })[0]).toBe('R1/2')
    expect(top({ side: 'external', diameter: 20.5, pitch: pitchFromTpi(14), form: 'parallel' })[0]).toBe('G1/2')
  })

  it('M12 と R1/2 のように形もサイズも違うときは紛らわしさの注意を出さない', () => {
    expect(hasFormAmbiguity(rankCandidates({ side: 'external', diameter: 11.8, pitch: 1.75 }))).toBe(false)
  })
})

describe('判別（めねじ）', () => {
  it('内径 10.2・P1.75 → M12', () => {
    expect(top({ side: 'internal', diameter: 10.2, pitch: 1.75 })[0]).toBe('M12')
  })

  it('内径 18.6・14山 → Rc1/2 と G1/2・Rp1/2 が上位2つ（M20×1.5 ではない）', () => {
    const ranked = top({ side: 'internal', diameter: 18.6, pitch: pitchFromTpi(14) })
    expect(ranked.slice(0, 2).sort()).toEqual(['G1/2・Rp1/2', 'Rc1/2'])
  })

  it('内径 18.9・14山（G の下穴径）→ G1/2・Rp1/2 が1位', () => {
    expect(top({ side: 'internal', diameter: 18.9, pitch: pitchFromTpi(14) })[0]).toBe('G1/2・Rp1/2')
  })
})

describe('境界', () => {
  it('径が0以下・数値でないなら候補なし', () => {
    expect(rankCandidates({ side: 'external', diameter: 0, pitch: 1 })).toEqual([])
    expect(rankCandidates({ side: 'external', diameter: Number.NaN, pitch: 1 })).toEqual([])
  })

  it('インチねじ（1/2-13 UNC: 12.7mm・13山）はどれにもよく合わない', () => {
    const [best] = rankCandidates({ side: 'external', diameter: 12.7, pitch: pitchFromTpi(13) })
    expect(matchLevel(best.score)).toBe('poor')
  })

  it('径の差の目安は 0.1 + 1%', () => {
    expect(diameterSigma(12)).toBeCloseTo(0.22, 9)
  })
})

describe('リンク', () => {
  it('メートルねじ → 下穴径ツール（d と p）、並目でボルトのサイズがあれば二面幅', () => {
    const m12 = rankCandidates({ side: 'external', diameter: 11.8, pitch: 1.75 })[0]
    expect(candidateHref(m12)).toBe('/tap-drill?d=12&p=1.75')
    expect(relatedLinksFor(m12).map((l) => l.to)).toEqual(['/tap-drill?d=12&p=1.75', '/bolt-size?d=12'])
  })

  it('細目は二面幅へのリンクを出さない', () => {
    const fine = rankCandidates({ side: 'external', diameter: 12, pitch: 1.25 })[0]
    expect(fine.label).toBe('M12×1.25')
    expect(relatedLinksFor(fine).map((l) => l.to)).toEqual(['/tap-drill?d=12&p=1.25'])
  })

  it('管用ねじ → 管用ねじツール（size と kind）と鋼管（a）', () => {
    const r = rankCandidates({ side: 'external', diameter: 20.45, pitch: pitchFromTpi(14) })[0]
    expect(candidateHref(r)).toBe('/pipe-thread?size=1%2F2&kind=R')
    expect(relatedLinksFor(r).map((l) => l.to)).toEqual(['/pipe-thread?size=1%2F2&kind=R', '/steel-pipe?a=15A'])
    const g = rankCandidates({ side: 'internal', diameter: 18.9, pitch: pitchFromTpi(14) })[0]
    expect(candidateHref(g)).toBe('/pipe-thread?size=1%2F2&kind=G')
  })

  it('1/16 は対応する管が無いので鋼管へのリンクを出さない', () => {
    const r = rankCandidates({ side: 'external', diameter: 7.6, pitch: pitchFromTpi(28), form: 'taper' })[0]
    expect(r.label).toBe('R1/16')
    expect(relatedLinksFor(r)).toHaveLength(1)
  })
})
