import { Calculator, ClipboardList } from 'lucide-react'
import { CadDownloadCard } from '../../components/CadDownloadCard'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { PlaceholderField } from '../../components/ui/PlaceholderField'
import { ResultItem } from '../../components/ui/ResultItem'

export function FlangeBoltTool() {
  return (
    <div className="grid gap-4 md:grid-cols-2 md:gap-6">
      <Card title="入力条件" icon={ClipboardList} aside={<Badge>ダミー</Badge>}>
        <div className="grid gap-4">
          <PlaceholderField label="呼び圧力" placeholder="例: 10K" />
          <PlaceholderField label="呼び径" placeholder="例: 50A" />
          <PlaceholderField
            label="ガスケット厚さ"
            placeholder="例: 3.0"
            kind="number"
            unit="mm"
          />
          <PlaceholderField label="座金" placeholder="例: 両側に平座金" />
          <PlaceholderField
            label="ナットからの突き出し"
            placeholder="例: 3"
            kind="number"
            unit="山"
            hint="ナットからボルト先端が出る長さを、ねじ山の数で指定します。"
          />
        </div>
      </Card>

      <Card title="計算結果" icon={Calculator}>
        <dl>
          <ResultItem
            label="必要なボルト長さ"
            unit="mm"
            primary
            note="市販の長さに切り上げた値を表示します"
          />
          <div className="mt-3">
            <ResultItem label="ボルトの呼び" />
            <ResultItem label="ボルト本数" unit="本" />
            <ResultItem label="ボルト穴径" unit="mm" />
            <ResultItem label="ボルト穴中心円径（PCD）" unit="mm" />
            <ResultItem label="フランジ外径" unit="mm" />
            <ResultItem label="フランジ厚さ" unit="mm" />
          </div>
        </dl>
      </Card>

      <CadDownloadCard subject="フランジ・ボルト" className="md:col-span-2" />
    </div>
  )
}
