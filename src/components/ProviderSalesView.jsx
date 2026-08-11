import React, { useMemo } from 'react'
import { Icon } from './Icon'
import { getOfficeProviderSales, findProviderSales } from '../providerSalesData'

const decimal = (value) => value == null ? '—' : Number(value).toFixed(1)
const yen = (value) => `${Math.round(Number(value) || 0).toLocaleString('ja-JP')}円`
const yenK = (value) => `${Math.round((Number(value) || 0) / 1000).toLocaleString('ja-JP')}千円`

// 'YYYY-MM' の1か月前（年またぎ対応）を返す。
function previousMonthKey(monthKey) {
  if (!monthKey) return null
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(year, month - 2, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/* ============================================================
   「居宅別売上推移表」単体で読み取れる分析（居宅カレンダーの訪問実績を取り込んでいなくても使える）。
   直近で実績が入っている月を自動判定し、前月比で伸びている居宅・減っている居宅・新規／取引ゼロになった居宅・
   売上規模別セグメント・担当者別構成を出す。
============================================================ */
function latestNonZeroMonth(officeSales) {
  let latest = null
  for (const entry of Object.values(officeSales.providers || {})) {
    for (const [monthKey, value] of Object.entries(entry.monthlySales || {})) {
      if (value > 0 && (!latest || monthKey > latest)) latest = monthKey
    }
  }
  return latest
}

const SEGMENT_DEFS = [
  ['今月取引ゼロ', (v) => v === 0],
  ['10万円以下', (v) => v > 0 && v <= 100000],
  ['10〜30万円', (v) => v > 100000 && v <= 300000],
  ['30〜50万円', (v) => v > 300000 && v <= 500000],
  ['50万円超', (v) => v > 500000],
]

function buildStandaloneAnalysis(officeSales) {
  const providers = officeSales.providers || {}
  const latest = latestNonZeroMonth(officeSales)
  if (!latest) return null
  const prev = previousMonthKey(latest)
  const rows = Object.entries(providers).map(([name, entry]) => {
    const cur = entry.monthlySales?.[latest] || 0
    const prevValue = entry.monthlySales?.[prev] || 0
    const diff = cur - prevValue
    const diffRate = prevValue ? Math.round((diff / prevValue) * 1000) / 10 : null
    return { name, repName: entry.repName || '（未設定）', cur, prev: prevValue, diff, diffRate }
  })
  const active = rows.filter((r) => r.cur > 0)
  const totalCur = rows.reduce((sum, r) => sum + r.cur, 0)
  const totalPrev = rows.reduce((sum, r) => sum + r.prev, 0)
  const growing = rows.filter((r) => r.diff > 0).sort((a, b) => b.diff - a.diff)
  const declining = rows.filter((r) => r.diff < 0).sort((a, b) => a.diff - b.diff)
  const newOnes = rows.filter((r) => r.prev === 0 && r.cur > 0).sort((a, b) => b.cur - a.cur)
  const lostOnes = rows.filter((r) => r.prev > 0 && r.cur === 0).sort((a, b) => b.prev - a.prev)
  const segments = SEGMENT_DEFS.map(([label, test]) => {
    const matched = rows.filter((r) => test(r.cur))
    return { label, count: matched.length, total: matched.reduce((sum, r) => sum + r.cur, 0) }
  })
  const repMap = {}
  for (const r of active) repMap[r.repName] = (repMap[r.repName] || 0) + r.cur
  const repTotals = Object.entries(repMap).sort((a, b) => b[1] - a[1])
  return { latest, prev, rows, activeCount: active.length, totalCur, totalPrev, growing, declining, newOnes, lostOnes, segments, repTotals }
}

function Difference({ value }) {
  const tone = value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral'
  return <span className={`comparison-difference ${tone}`}>{value > 0 ? '+' : ''}{decimal(value)}回</span>
}

function YenDiff({ value }) {
  const tone = value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral'
  return <span className={`comparison-difference ${tone}`}>{value > 0 ? '+' : ''}{yen(value)}</span>
}

function monthLabel(monthKey) {
  if (!monthKey) return ''
  const [y, m] = monthKey.split('-')
  return `${y}年${Number(m)}月`
}

function Kpi({ label, value, unit, accent }) {
  return <div className={`kpi-card ${accent ? 'accent' : ''}`}><span>{label}</span><strong>{value}<small>{unit}</small></strong></div>
}

// 「居宅別売上推移表」（Excel取込）だけで完結する分析セクション。訪問データがなくても表示できる。
function StandaloneAnalysisSection({ officeName, scopeLabel }) {
  const officeSales = getOfficeProviderSales(officeName)
  const analysis = useMemo(() => buildStandaloneAnalysis(officeSales), [officeSales])

  if (!analysis) {
    return (
      <section className="staff-panel provider-sales-panel">
        <div className="panel-heading"><div><h2>居宅別売上推移表の分析</h2><span>伸びている居宅・減っている居宅・売上規模別の内訳を確認</span></div></div>
        <div className="provider-sales-empty"><Icon name="info" size={16}/><span>上の「Excelを取り込む」から「居宅別売上推移表」を取り込むと、ここに分析結果が表示されます。</span></div>
      </section>
    )
  }
  const { latest, prev, activeCount, totalCur, totalPrev, growing, declining, newOnes, lostOnes, segments, repTotals } = analysis
  const totalDiff = totalCur - totalPrev
  const maxSegmentTotal = Math.max(1, ...segments.map((s) => s.total))

  return <>
    <section className="staff-panel provider-sales-panel">
      <div className="panel-heading">
        <div><h2>居宅別売上推移表の分析</h2><span>{monthLabel(prev)}→{monthLabel(latest)}の実績をもとに集計（訪問記録がなくても表示されます）</span></div>
        <span className="chart-unit">対象：{scopeLabel}</span>
      </div>
      <section className="kpi-grid sales-kpi-grid">
        <Kpi label={`${monthLabel(latest)}売上合計`} value={yenK(totalCur)} unit=""/>
        <Kpi label="取引のある居宅数" value={activeCount} unit="件"/>
        <Kpi label="前月比" value={`${totalDiff >= 0 ? '+' : ''}${yenK(totalDiff)}`} unit="" accent/>
        <Kpi label="1居宅あたり平均" value={activeCount ? yenK(totalCur / activeCount) : '—'} unit=""/>
      </section>
    </section>

    <section className="analysis-detail-grid">
      <div className="chart-panel">
        <div className="panel-heading"><div><h2>伸びている居宅</h2><span>前月比・増加額が大きい順（上位10件）</span></div></div>
        {growing.length === 0 ? <div className="provider-sales-empty"><Icon name="info" size={16}/><span>前月比で増加している居宅はありません。</span></div> : (
          <div className="responsive-table"><table className="staff-table"><thead><tr><th>居宅</th><th>担当者</th><th>{monthLabel(latest)}</th><th>前月差</th></tr></thead><tbody>
            {growing.slice(0, 10).map((r) => <tr key={r.name}><th>{r.name}</th><td>{r.repName}</td><td>{yen(r.cur)}</td><td><YenDiff value={r.diff}/>{r.diffRate != null && <small> （+{r.diffRate}%）</small>}</td></tr>)}
          </tbody></table></div>
        )}
      </div>
      <div className="chart-panel">
        <div className="panel-heading"><div><h2>減っている居宅</h2><span>前月比・減少額が大きい順（上位10件）</span></div></div>
        {declining.length === 0 ? <div className="provider-sales-empty"><Icon name="info" size={16}/><span>前月比で減少している居宅はありません。</span></div> : (
          <div className="responsive-table"><table className="staff-table"><thead><tr><th>居宅</th><th>担当者</th><th>{monthLabel(latest)}</th><th>前月差</th></tr></thead><tbody>
            {declining.slice(0, 10).map((r) => <tr key={r.name}><th>{r.name}</th><td>{r.repName}</td><td>{yen(r.cur)}</td><td><YenDiff value={r.diff}/>{r.diffRate != null && <small> （{r.diffRate}%）</small>}</td></tr>)}
          </tbody></table></div>
        )}
      </div>
    </section>

    <section className="staff-panel">
      <div className="panel-heading"><div><h2>売上規模別の内訳</h2><span>{monthLabel(latest)}時点・居宅を売上規模で分類</span></div></div>
      <div className="frequency-list">
        {segments.map((s) => <div key={s.label}><span>{s.label}</span><div><i style={{ width: `${s.total / maxSegmentTotal * 100}%` }}/></div><strong>{s.count}件・{yenK(s.total)}</strong></div>)}
      </div>
    </section>

    <section className="analysis-detail-grid">
      <div className="chart-panel">
        <div className="panel-heading"><div><h2>新規に取引が始まった居宅</h2><span>前月0円→{monthLabel(latest)}に売上あり</span></div></div>
        {newOnes.length === 0 ? <div className="provider-sales-empty"><Icon name="info" size={16}/><span>該当する居宅はありません。</span></div> : (
          <div className="responsive-table"><table className="staff-table"><thead><tr><th>居宅</th><th>担当者</th><th>{monthLabel(latest)}</th></tr></thead><tbody>
            {newOnes.map((r) => <tr key={r.name}><th>{r.name}</th><td>{r.repName}</td><td>{yen(r.cur)}</td></tr>)}
          </tbody></table></div>
        )}
      </div>
      <div className="chart-panel">
        <div className="panel-heading"><div><h2>取引がゼロになった居宅</h2><span>前月は売上あり→{monthLabel(latest)}は0円</span></div></div>
        {lostOnes.length === 0 ? <div className="provider-sales-empty"><Icon name="info" size={16}/><span>該当する居宅はありません。</span></div> : (
          <div className="responsive-table"><table className="staff-table"><thead><tr><th>居宅</th><th>担当者</th><th>前月</th></tr></thead><tbody>
            {lostOnes.map((r) => <tr key={r.name}><th>{r.name}</th><td>{r.repName}</td><td>{yen(r.prev)}</td></tr>)}
          </tbody></table></div>
        )}
      </div>
    </section>

    {repTotals.length > 0 && <section className="staff-panel">
      <div className="panel-heading"><div><h2>担当者別 売上構成</h2><span>{monthLabel(latest)}・売上が多い順</span></div></div>
      <div className="responsive-table"><table className="staff-table"><thead><tr><th>担当者</th><th>売上</th><th>構成比</th></tr></thead><tbody>
        {repTotals.map(([name, total]) => <tr key={name}><th>{name}</th><td>{yen(total)}</td><td>{totalCur ? `${Math.round(total / totalCur * 1000) / 10}%` : '—'}</td></tr>)}
      </tbody></table></div>
    </section>}
  </>
}

// 比較月の1か月前（年またぎ対応）の 'YYYY-MM' キーを返す。訪問実績（analytics）との突合用。
function buildProviderSalesRows(analytics, officeName) {
  const comparisonMonth = analytics?.comparisonMonth
  if (!comparisonMonth) return { rows: [], comparisonMonth: null, prevMonth: null }
  const prevMonth = previousMonthKey(comparisonMonth)
  const officeSales = getOfficeProviderSales(officeName)
  const rows = (analytics.providerComparison || []).map((provider) => {
    const visitCur = provider.monthlyVisits.get(comparisonMonth) || 0
    const visitPrev = provider.monthlyVisits.get(prevMonth) || 0
    const visitDiff = visitCur - visitPrev
    const sales = findProviderSales(officeSales, provider.name)
    if (!sales) return { provider, hasSales: false, visitCur, visitPrev, visitDiff }
    const salesCur = sales.monthlySales[comparisonMonth] || 0
    const salesPrev = sales.monthlySales[prevMonth] || 0
    const salesDiff = salesCur - salesPrev
    const perVisit = visitCur ? Math.round(salesCur / visitCur) : null
    const divergent = (visitDiff > 0 && salesDiff < 0) || (visitDiff < 0 && salesDiff > 0)
    return { provider, hasSales: true, visitCur, visitPrev, visitDiff, salesCur, salesPrev, salesDiff, perVisit, divergent }
  })
  rows.sort((a, b) => {
    if (a.divergent !== b.divergent) return a.divergent ? -1 : 1
    if (a.hasSales !== b.hasSales) return a.hasSales ? -1 : 1
    return Math.abs(b.salesDiff || 0) - Math.abs(a.salesDiff || 0)
  })
  return { rows, comparisonMonth, prevMonth }
}

// 「居宅別売上推移表」（Excel取込）を、居宅カレンダーの実訪問データ（analytics）と居宅名で突き合わせ、
// 訪問件数の増減と売上の増減が逆方向に動いている居宅（要確認先）を優先的に見せるページ。
// 訪問データが無くても、上部の「居宅別売上推移表の分析」だけで売上推移を確認できる。
export function ProviderSalesView({ analytics, fiscalYear, setFiscalYear, officeName, loading, scopeLabel, staff, selectedStaffId, setSelectedStaffId, canSelectStaff, importAction }) {
  const printableStaff = staff.filter((person) => person.active && person.role === 'staff')
  const [comparisonYear, comparisonMonth] = (analytics?.comparisonMonth || '').split('-')
  const comparisonLabel = comparisonYear ? `${comparisonYear}年${Number(comparisonMonth)}月` : '今月'
  const providerSales = useMemo(() => buildProviderSalesRows(analytics, officeName), [analytics, officeName])
  const prevMonthLabel = providerSales.prevMonth ? `${Number(providerSales.prevMonth.split('-')[1])}月` : '前月'
  const { rows } = providerSales
  const withSales = rows.filter((row) => row.hasSales)
  const divergentCount = withSales.filter((row) => row.divergent).length
  const totalSalesDiff = withSales.reduce((sum, row) => sum + (row.salesDiff || 0), 0)

  return <>
    <div className="page-header"><div><h1>居宅売上推移分析</h1><p>居宅ごとの売上推移と、訪問件数との突き合わせを確認</p></div><div className="page-header-actions">{importAction}</div></div>
    <section className="analysis-scope">
      <div className="analysis-year-switch">
        <button className="icon-button" aria-label="前年度" onClick={() => setFiscalYear(fiscalYear - 1)}><Icon name="left"/></button>
        <strong>{fiscalYear}年度</strong>
        <button className="icon-button" aria-label="次年度" onClick={() => setFiscalYear(fiscalYear + 1)}><Icon name="right"/></button>
        <span>4月〜翌年3月</span>
      </div>
      <div className="analysis-scope-meta">
        <label><span>分析対象</span><span className="select-wrap"><select aria-label="分析対象の営業員" value={selectedStaffId} onChange={(event) => setSelectedStaffId(event.target.value)} disabled={!canSelectStaff || loading}>{canSelectStaff && <option value="">営業所全体</option>}{printableStaff.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select><Icon name="down" size={15}/></span></label>
        {loading && <span className="status-line"><span className="spinner small"/>集計中…</span>}
      </div>
    </section>

    <StandaloneAnalysisSection officeName={officeName} scopeLabel={scopeLabel}/>

    <section className="staff-panel provider-sales-panel">
      <div className="panel-heading">
        <div><h2>居宅別 訪問件数×売上 推移比較</h2><span>居宅カレンダーの訪問実績と突き合わせ、訪問と売上の動きが逆になっている居宅を確認できます</span></div>
        <span className="chart-unit">対象：{scopeLabel}</span>
      </div>
      {!rows.length ? (
        <div className="provider-sales-empty"><Icon name="info" size={16}/><span>対象年度の訪問記録がありません。居宅カレンダー側でExcelを取り込むと、ここで売上と突き合わせて確認できます。</span></div>
      ) : withSales.length === 0 ? (
        <div className="provider-sales-empty">
          <Icon name="info" size={16}/>
          <span>売上データが取り込まれていません。上の「Excelを取り込む」から「居宅別売上推移表」を取り込むと、ここに反映されます。</span>
        </div>
      ) : (
        <>
          <div className="comparison-legend">
            <span className="kind-attention">要確認（訪問と売上が逆方向） {divergentCount}件</span>
            <span>売上データあり {withSales.length}件</span>
            <span className={totalSalesDiff >= 0 ? 'kind-up' : 'kind-down'}>{comparisonLabel}の売上合計差 {totalSalesDiff >= 0 ? '+' : ''}{yen(totalSalesDiff)}</span>
          </div>
          <div className="responsive-table"><table className="staff-table comparison-table"><thead><tr>
            <th>居宅</th><th>種別</th>
            <th>{prevMonthLabel}訪問</th><th>{comparisonLabel}訪問</th>
            <th>{prevMonthLabel}売上</th><th>{comparisonLabel}売上</th><th>売上差</th>
            <th>訪問1件あたり売上</th><th>状態</th>
          </tr></thead><tbody>
            {rows.map(({ provider, hasSales, visitCur, visitPrev, visitDiff, salesCur, salesPrev, salesDiff, perVisit, divergent }) => (
              <tr key={provider.id} className={divergent ? 'is-divergent' : ''}>
                <th>{provider.name}</th>
                <td><span className={`kind-tag kind-tag-${provider.kind}`}>{provider.kind === 'houkatsu' ? '包括' : '居宅'}</span></td>
                <td>{visitPrev}回</td>
                <td><strong>{visitCur}回</strong><Difference value={visitDiff}/></td>
                {hasSales ? (
                  <>
                    <td>{yen(salesPrev)}</td>
                    <td><strong>{yen(salesCur)}</strong></td>
                    <td><YenDiff value={salesDiff}/></td>
                    <td>{perVisit == null ? '—' : yen(perVisit)}</td>
                    <td>{divergent ? <span className="provider-sales-flag">要確認</span> : <span className="provider-sales-flag ok">—</span>}</td>
                  </>
                ) : (
                  <><td colSpan={4} className="provider-sales-nodata">売上データなし</td><td>—</td></>
                )}
              </tr>
            ))}
          </tbody></table></div>
        </>
      )}
    </section>
  </>
}
