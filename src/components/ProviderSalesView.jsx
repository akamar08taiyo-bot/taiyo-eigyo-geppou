import React, { useMemo } from 'react'
import { Icon } from './Icon'
import { getOfficeProviderSales, findProviderSales } from '../providerSalesData'

const decimal = (value) => value == null ? '—' : Number(value).toFixed(1)
const yen = (value) => `${Math.round(Number(value) || 0).toLocaleString('ja-JP')}円`

// 比較月の1か月前（年またぎ対応）の 'YYYY-MM' キーを返す。
function previousMonthKey(monthKey) {
  if (!monthKey) return null
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(year, month - 2, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

// 居宅ごとに「訪問件数の増減」と「売上の増減」を突き合わせる。
// 訪問と売上が逆方向に動いている居宅（訪問が減っているのに売上は増えている等）を
// divergent（要確認）としてマークし、営業視点で深堀りすべき先を絞り込めるようにする。
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

function Difference({ value }) {
  const tone = value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral'
  return <span className={`comparison-difference ${tone}`}>{value > 0 ? '+' : ''}{decimal(value)}回</span>
}

function YenDiff({ value }) {
  const tone = value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral'
  return <span className={`comparison-difference ${tone}`}>{value > 0 ? '+' : ''}{yen(value)}</span>
}

// 「居宅別売上推移表」（Excel取込）を、居宅カレンダーの実訪問データ（analytics）と居宅名で突き合わせ、
// 訪問件数の増減と売上の増減が逆方向に動いている居宅（要確認先）を優先的に見せるページ。
export function ProviderSalesView({ analytics, fiscalYear, setFiscalYear, officeName, loading, scopeLabel, staff, selectedStaffId, setSelectedStaffId, canSelectStaff }) {
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
    <div className="page-header"><div><h1>居宅売上推移分析</h1><p>居宅ごとの訪問件数と売上の動きを突き合わせて確認</p></div></div>
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

    <section className="staff-panel provider-sales-panel">
      <div className="panel-heading">
        <div><h2>居宅別 訪問件数×売上 推移比較</h2><span>「居宅別売上推移表」を取り込むと、訪問件数と売上の動きが逆になっている居宅を確認できます</span></div>
        <span className="chart-unit">対象：{scopeLabel}</span>
      </div>
      {!rows.length ? (
        <div className="provider-sales-empty"><Icon name="info" size={16}/><span>対象年度の訪問記録がありません。まず「営業月報」タブから訪問ログ、または居宅カレンダー側でExcelを取り込んでください。</span></div>
      ) : withSales.length === 0 ? (
        <div className="provider-sales-empty">
          <Icon name="info" size={16}/>
          <span>売上データが取り込まれていません。上のタブから「居宅別売上推移表」を取り込むと、ここに反映されます。</span>
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
