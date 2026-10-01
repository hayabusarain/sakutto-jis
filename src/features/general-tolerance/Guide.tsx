import type { MouseEvent, ReactNode } from 'react'
import { Faq, GuideSection } from '../../components/Guide'
import { usePersistentState } from '../../hooks/usePersistentState'
import { stateQuery } from '../../lib/query'
import { formatTolerance, linearLimits, lookupTolerance, type ToleranceKind } from './calc'
import { MIN_SIZE, type ToleranceClass } from './data'
import {
  DEFAULT_INPUT,
  isGeneralToleranceInput,
  normalizeInput,
  STORAGE_KEY,
  type GeneralToleranceInput,
} from './state'

/** 表の値（数値は data.ts から引く。手書きしない） */
function tol(kind: ToleranceKind, cls: ToleranceClass, size: number): string {
  const found = lookupTolerance(kind, cls, size)
  return found.status === 'ok' ? formatTolerance(kind, found.tolerance) : '—'
}

function range(kind: ToleranceKind, cls: ToleranceClass, size: number): string {
  const found = lookupTolerance(kind, cls, size)
  return found.status === 'ok' || found.status === 'none' ? found.range.label : '—'
}

function limits(cls: ToleranceClass, size: number): string {
  const found = lookupTolerance('linear', cls, size)
  if (found.status !== 'ok') return '—'
  const { lower, upper } = linearLimits(size, 0, found.tolerance)
  return `${lower} 〜 ${upper} mm`
}

/**
 * 同じページの条件を切り替えるリンク。ページは読み直さずに入力を書き換え、結果へスクロールする
 * （同じツールへの Link では入力が URL から読み直されないため）。新しいタブで開けば URL の条件で表示される。
 */
function TryLink({ input, children }: { input: Partial<GeneralToleranceInput>; children: ReactNode }) {
  const [, setInput] = usePersistentState(STORAGE_KEY, DEFAULT_INPUT, isGeneralToleranceInput)
  const next = { ...DEFAULT_INPUT, ...input }
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    setInput(next)
    document.getElementById('general-tolerance-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  // ツールが URL に書くのと同じクエリ（開き直したときに同じ条件になる）
  const query = stateQuery(next, DEFAULT_INPUT, normalizeInput)
  return (
    <a href={`/general-tolerance${query ? `?${query}` : ''}`} onClick={handleClick}>
      {children}
    </a>
  )
}

/** ページ下部の「解説・よくある質問」 */
export function GeneralToleranceGuide() {
  return (
    <GuideSection>
      <Faq q="普通公差とは？">
        <p>
          図面で寸法ごとに公差（±0.1 など）を書いていない寸法に、まとめて適用する許容差です。JIS B 0405
          では、長さ寸法・面取り部分の長さ寸法・角度寸法について、精級 f・中級 m・粗級 c・極粗級 v の4つの等級で決められています。主に削り加工（除去加工）や板金で作る部品が対象です。
        </p>
      </Faq>
      <Faq q="図面にはどう書く？">
        <p>
          表題欄の中か近くに、規格番号と等級を「<span className="num">JIS B 0405-m</span>」のように書きます。「普通公差{' '}
          <span className="num">JIS B 0405-m</span>」と書くことも多いです。ISO の図面では「<span className="num">ISO 2768-m</span>」です。
        </p>
        <p>
          幾何公差（真直度・直角度など）の普通公差は別の規格（JIS B 0419）で、「<span className="num">JIS B 0419-mK</span>
          」のように長さの等級と組み合わせて書くことがあります。このツールは JIS B 0405 の長さ・角度だけを扱っています。
        </p>
      </Faq>
      <Faq q="中級 m で 100 mm の普通公差は？">
        <p>
          100 mm は「{range('linear', 'm', 100)}」の区分で、中級 m は <span className="num">{tol('linear', 'm', 100)} mm</span>
          。つまり <span className="num">{limits('m', 100)}</span> です（
          <TryLink input={{ d: '100', cls: 'm', kind: 'linear' }}>100 mm で計算</TryLink>）。
        </p>
        <p>
          同じ 100 mm でも、精級 f なら <span className="num">{tol('linear', 'f', 100)}</span>、粗級 c なら{' '}
          <span className="num">{tol('linear', 'c', 100)}</span> mm です。
        </p>
      </Faq>
      <Faq q="3 mm ちょうどはどの区分？">
        <p>
          区分は「〜を超え〜以下」なので、3 mm ちょうどは「{range('linear', 'm', 3)}」に入ります（中級 m で{' '}
          <span className="num">{tol('linear', 'm', 3)} mm</span>）。6・30・120 mm なども同じく、小さい方の区分です。
        </p>
      </Faq>
      <Faq q={`${MIN_SIZE} mm より小さい寸法は？`}>
        <p>
          {MIN_SIZE} mm 未満の寸法には普通公差の表を使わず、寸法のあとに許容差を個々に指示します。また、精級 f の 2000 mm
          を超える寸法、極粗級 v の 3 mm 以下の寸法は表に値がありません（「—」）。
        </p>
      </Faq>
      <Faq q="面取り（C1）や丸み（R2）の普通公差は？">
        <p>
          かどの面取り・丸みの寸法は、長さ寸法とは別の表を使います。中級 m なら C1 は{' '}
          <span className="num">{tol('chamfer', 'm', 1)} mm</span>、R5 は{' '}
          <span className="num">{tol('chamfer', 'm', 5)} mm</span>（
          <TryLink input={{ kind: 'chamfer', d: '1', cls: 'm' }}>C1 で計算</TryLink>）。
        </p>
      </Faq>
      <Faq q="角度の普通公差は何で決まる？">
        <p>
          角度をはさむ2辺のうち、短い方の辺の長さで決まります。例えば中級 m で短い方の辺が 30 mm なら{' '}
          <span className="num">{tol('angle', 'm', 30)}</span>、200 mm なら <span className="num">{tol('angle', 'm', 200)}</span>
          です（
          <TryLink input={{ kind: 'angle', d: '30', cls: 'm', angle: '90' }}>90°・短辺 30 mm で計算</TryLink>）。
        </p>
      </Faq>
      <Faq q="ISO 2768 との関係は？">
        <p>
          JIS B 0405 は ISO 2768-1 に対応する規格で、許容差の値は同じです。海外の図面の「ISO 2768-m」も、このツールの中級
          m の値で確認できます。
        </p>
      </Faq>
      <Faq q="はめあい（H7・g6 など）の公差は？">
        <p>
          穴と軸のはめあいの公差は、普通公差とは別の規格（JIS B 0401）で決められています。このツールでは扱っていません。
        </p>
      </Faq>
    </GuideSection>
  )
}
