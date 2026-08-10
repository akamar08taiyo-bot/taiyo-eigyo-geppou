import React, { useMemo } from 'react'
import { Icon } from './Icon'
import { getOfficeReport, getYearMonths, HANBAI_ITEMS, MONTH_KEYS, MONTH_LABELS } from '../salesReportData'

const yen = (n) => `${Math.round(Number(n) || 0).toLocaleString('ja-JP')}`
const num = (n) => `${Math.round(Number(n) || 0).toLocaleString('ja-JP')}`

// 「営業月報」タブで取り込んだ販売内訳（住宅改修・特定/一般福祉用具・紙おむつ・消耗品）を、
// 年度全体でカテゴリ別・月別・担当者別に集計して確認できるようにするビュー。
export function ProductAnalysisView({ officeName, fiscalYear, setFiscalYear }) {
  const report = useMemo(() => getOfficeReport(officeName), [officeName, fiscalYear])
  const months = useMemo(() => getYearMonths(report, fiscalYear), [report, fiscalYear])

  const categoryTotals = useMemo(() => {
    const acc = {}
    for (const item of HANBAI_ITEMS) acc[item] = { yosanKensu: 0, yosanUriage: 0, jissekiKensu: 0, jissekiUriage: 0 }
    for (const monthKey of MONTH_KEYS) {
      const monthReps = months[monthKey]?.reps || {}
      for (const repName of Object.keys(monthReps)) {
        const hanbai = monthReps[repName].hanbai
        if (!hanbai) continue
        for (const item of HANBAI_ITEMS) {
          if (!hanbai[item]) continue
          acc[item].yosanKensu += hanbai[item].yosanKensu || 0
          acc[item].yosanUriage += hanbai[item].yosanUriage || 0
          acc[item].jissekiKensu += hanbai[item].jissekiKensu || 0
          acc[item].jissekiUriage += hanbai[item].jissekiUriage || 0
        }
      }
    }
    return acc
  }, [months])

  const grandTotal = HANBAI_ITEMS.reduce((sum, item) => ({
    yosanUriage: sum.yosanUriage + categoryTotals[item].yosanUriage,
    jissekiUriage: sum.jissekiUriage + categoryTotals[item].jissekiUriage,
    jissekiKensu: sum.jissekiKensu + categoryTotals[item].jissekiKensu,
  }), { yosanUriage: 0, jissekiUriage: 0, jissekiKensu: 0 })

  const monthlyTrend = useMemo(() => MONTH_KEYS.map((monthKey) => {
    const monthReps = months[monthKey]?.reps || {}
    let total = 0
    for (const repName of Object.keys(monthReps)) {
      const hanbai = monthReps[repName].hanbai
      if (!hanbai) continue
      for (const item of HANBAI_ITEMS) total += hanbai[item]?.jissekiUriage || 0
    }
    return { monthKey, label: MONTH_LABELS[monthKey], total }
  }), [months])
  const maxMonthTotal = Math.max(1, ...monthlyTrend.map((m) => m.total))

  const repTotals = useMemo(() => {
    const acc = {}
    for (const monthKey of MONTH_KEYS) {
      const monthReps = months[monthKey]?.reps || {}
      for (const repName of Object.keys(monthReps)) {
        const hanbai = monthReps[repName].hanbai
        if (!hanbai) continue
        acc[repName] = acc[repName] || 0
        for (const item of HANBAI_ITEMS) acc[repName] += hanbai[item]?.jissekiUriage || 0
      }
    }
    return Object.entries(acc).sort((a, b) => b[1] - a[1])
  }, [months])

  return <>
    <div className="page-header"><div><h1>商品販売分析</h1><p>住宅改修・福祉用具・紙おむつ・消耗品の販売実績を確認</p></div></div>
    <section className="analysis-scope">
      <div className="analysis-year-switch">
        <button className="icon-button" aria-label="前年度" onClick={() => setFiscalYear(fiscalYear - 1)}><Icon name="left"/></button>
        <strong>{fiscalYear}年度</strong>
        <button className="icon-button" aria-label="次年度" onClick={() => setFiscalYear(fiscalYear + 1)}><Icon name="right"/></button>
        <span>4月〜翌年3月</span>
      </div>
    </section>

    <section className="kpi-grid sales-kpi-grid">
      <Kpi label="年度商品販売実績（件数）" value={num(grandTotal.jissekiKensu)} unit="件"/>
      <Kpi label="年度商品販売実績（売上）" value={yen(grandTotal.jissekiUriage)} unit="千円"/>
      <Kpi label="年度商品販売予算" value={yen(grandTotal.yosanUriage)} unit="千円"/>
      <Kpi label="予算差" value={`${grandTotal.jissekiUriage - grandTotal.yosanUriage >= 0 ? '+' : ''}${yen(grandTotal.jissekiUriage - grandTotal.yosanUriage)}`} unit="千円" accent/>
    </section>

    <section className="staff-panel">
      <div className="panel-heading"><div><h2>カテゴリ別内訳</h2><span>住宅改修・特定/一般福祉用具・紙おむつ・消耗品</span></div></div>
      {HANBAI_ITEMS.every((item) => categoryTotals[item].jissekiUriage === 0 && categoryTotals[item].yosanUriage === 0) ? (
        <div className="provider-sales-empty"><Icon name="info" size={16}/><span>「営業月報」タブで売上状況報告書・商品分類別販売売上を取り込むと、ここに反映されます。</span></div>
      ) : (
        <div className="responsive-table"><table className="staff-table"><thead><tr><th>区分</th><th>件数</th><th>売上（実績）</th><th>予算</th><th>予算差</th></tr></thead><tbody>
          {HANBAI_ITEMS.map((item) => {
            const t = categoryTotals[item]
            const diff = t.jissekiUriage - t.yosanUriage
            return <tr key={item}><th>{item}</th><td>{num(t.jissekiKensu)}件</td><td>{yen(t.jissekiUriage)}千円</td><td>{yen(t.yosanUriage)}千円</td><td className={diff >= 0 ? 'kind-up' : 'kind-down'}>{diff >= 0 ? '+' : ''}{yen(diff)}千円</td></tr>
          })}
          <tr className="row-strong"><th>合計</th><td>{num(grandTotal.jissekiKensu)}件</td><td>{yen(grandTotal.jissekiUriage)}千円</td><td>{yen(grandTotal.yosanUriage)}千円</td><td className={grandTotal.jissekiUriage - grandTotal.yosanUriage >= 0 ? 'kind-up' : 'kind-down'}>{grandTotal.jissekiUriage - grandTotal.yosanUriage >= 0 ? '+' : ''}{yen(grandTotal.jissekiUriage - grandTotal.yosanUriage)}千円</td></tr>
        </tbody></table></div>
      )}
    </section>

    <section className="chart-panel">
      <div className="panel-heading"><div><h2>月別売上推移</h2><span>年度順（4月から3月）</span></div><span className="chart-unit">単位：千円</span></div>
      <div className="bar-chart" role="img" aria-label="月別商品販売売上">
        {monthlyTrend.map((m) => <div className="bar-item" key={m.monthKey}><span>{num(m.total)}</span><div><i style={{ height: `${Math.max(3, m.total / maxMonthTotal * 100)}%` }}/></div><small>{m.label}</small></div>)}
      </div>
    </section>

    {repTotals.length > 0 && <section className="staff-panel">
      <div className="panel-heading"><div><h2>担当者別 商品販売実績</h2><span>年度売上合計が多い順</span></div></div>
      <div className="responsive-table"><table className="staff-table"><thead><tr><th>担当者</th><th>年度売上</th></tr></thead><tbody>
        {repTotals.map(([name, total]) => <tr key={name}><th>{name}</th><td>{yen(total)}千円</td></tr>)}
      </tbody></table></div>
    </section>}
  </>
}

function Kpi({ label, value, unit, accent }) {
  return <div className={`kpi-card ${accent ? 'accent' : ''}`}><span>{label}</span><strong>{value}<small>{unit}</small></strong></div>
}
