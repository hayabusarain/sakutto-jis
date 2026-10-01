import { Citation } from '../../components/Citation'
import { FormulaInfo } from '../../components/ui/FormulaInfo'
import { fixed } from '../../lib/format'
import { pressureBandLabel, pressureBandShortLabel } from './calc'
import { BACKUP_PRESSURE_LIMITS, HARDNESSES, NO_BACKUP_MAX_CLEARANCE } from './data'

/**
 * バックアップリングが要るかの目安（すきま 2g の最大値の表）。
 * 値は旧 JIS B 2406:1991 の表1。現行 JIS B 2401-2:2012 の表とは未照合なので、その旨を出す。
 */
export function BackupClearanceInfo() {
  return (
    <FormulaInfo title="バックアップリングが要るかの目安（すきま 2g）">
      <p>
        バックアップリングを入れずに使える、すきま 2g の最大値です。すきま 2g がこの値を超えるときは、バックアップリングを使います。
      </p>
      <table className="w-full text-xs">
        <caption className="sr-only">バックアップリングなしで使えるすきま 2g の最大値（mm）</caption>
        <thead>
          <tr className="border-b border-zinc-300 text-zinc-600">
            <th scope="col" className="py-1.5 pr-2 text-left font-semibold">
              使用圧力 [MPa]
            </th>
            {HARDNESSES.map((hardness) => (
              <th key={hardness} scope="col" className="py-1.5 pl-2 text-right font-semibold whitespace-nowrap">
                硬さ <span className="num">{hardness}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {BACKUP_PRESSURE_LIMITS.map((limit, index) => (
            <tr key={limit} className="border-b border-zinc-200 last:border-b-0">
              <th scope="row" className="num py-1.5 pr-2 text-left font-normal whitespace-nowrap text-zinc-700">
                <span aria-hidden>{pressureBandShortLabel(index)}</span>
                <span className="sr-only">{pressureBandLabel(index)}</span>
              </th>
              {HARDNESSES.map((hardness) => (
                <td key={hardness} className="num py-1.5 pl-2 text-right font-semibold text-zinc-900">
                  {fixed(NO_BACKUP_MAX_CLEARANCE[hardness][index], 2)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs">
        単位: mm（目安）。「4.0超〜6.3」は 4.0 を超え 6.3 以下の意味です。すきま 2g は直径の差です（ピストン型はシリンダ内径 − ピストンの外径、ロッド型は穴の径 −
        軸径 d）。硬さはデュロメータ硬さ（タイプA）で、材料記号の数字（NBR-70-1 なら 70、NBR-90 なら 90）にあたります。
      </p>
      <p className="text-xs">
        使用圧力が {fixed(BACKUP_PRESSURE_LIMITS[BACKUP_PRESSURE_LIMITS.length - 1], 1)} MPa
        を超えるときは、この表と溝の寸法の表（旧 JIS B 2406 の適用範囲）の対象外です。
      </p>
      <Citation code="JIS B 2406" detail="表1" suffix="の値（現行 JIS B 2401-2:2012 の表とは未照合）" />
    </FormulaInfo>
  )
}
