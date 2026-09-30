import { Calculator, ClipboardList } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { PlaceholderField } from '../../components/ui/PlaceholderField'
import { ResultItem } from '../../components/ui/ResultItem'

export function TapDrillTool() {
  return (
    <div className="grid gap-4 md:grid-cols-2 md:gap-6">
      <Card title="入力条件" icon={ClipboardList} aside={<Badge>ダミー</Badge>}>
        <div className="grid gap-4">
          <PlaceholderField label="ねじの種類" placeholder="例: メートル並目ねじ" />
          <PlaceholderField label="ねじの呼び" placeholder="例: M10" />
          <PlaceholderField
            label="ピッチ"
            placeholder="例: 1.5"
            kind="number"
            unit="mm"
            hint="ねじの呼びを選ぶと自動で入ります（細目ねじは変更できます）。"
          />
          <PlaceholderField label="加工方法" placeholder="例: 切削タップ" />
        </div>
      </Card>

      <Card title="計算結果" icon={Calculator}>
        <dl>
          <ResultItem label="推奨下穴径" unit="mm" primary note="JIS B 1004 の値を目安に表示します" />
          <div className="mt-3">
            <ResultItem label="市販ドリル径の目安" unit="mm" />
            <ResultItem label="めねじ内径（最小〜最大）" unit="mm" />
            <ResultItem label="ひっかかり率" unit="%" />
          </div>
        </dl>
      </Card>
    </div>
  )
}
