import React, { useMemo, useState } from 'react'
import { Icon } from './Icon'
import { getOfficeReport, getYearMonths, HANBAI_ITEMS, MONTH_KEYS, MONTH_LABELS } from '../salesReportData'

const yen = (n) => `${Math.round(Number(n) || 0).toLocaleString('ja-JP')}`
const num = (n) => `${Math.round(Number(n) || 0).toLocaleString('ja-JP')}`

// 列ヘッダーをクリックすると、そのキーで昇順⇔降順に並び替えられる見出しセル。
function SortTh({ label, sortKey, sort, onSort, align }) {
  const active = sort.key === sortKey
  return (
    <th className={`sortable-th ${align === 'right' ? 'align-right' : ''} ${active ? 'active' : ''}`} onClick={() => onSort(sortKey)}>
      <span>{label}</span>
      <em className="sort-caret">{active ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</em>
    </th>
  )
}
function useSort(defaultKey, defaultDir = 'desc') {
  const [sort, setSort] = useState({ key: defaultKey, dir: defaultDir })
  const onSort = (key) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' ? 'asc' : 'desc' }))
  return [sort, onSort]
}
function sortRows(rows, sort, valueOf) {
  const dir = sort.dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const av = valueOf(a, sort.key)
    const bv = valueOf(b, sort.key)
    if (typeof av === 'string') return dir * av.localeCompare(bv, 'ja')
    return dir * ((av || 0) - (bv || 0))
  })
}

// 「営業月報」タブで取り込んだ販売内訳（住宅改修・特定/一般福祉用具・紙おむつ・消耗品）を、
// 年度全体でカテゴリ別・月別・担当者別に集計して確認できるようにするビュー。
export function ProductAnalysisView({ officeName, fiscalYear, setFiscalYear, importAction, refreshKey }) {
  const report = useMemo(() => getOfficeReport(officeName), [officeName, fiscalYear, refreshKey])
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

  // 担当者×月のクロス集計（件数・売上とも）。月別・担当者別どちらの軸でもソートできるようにするための基礎データ。
  const repRows = useMemo(() => {
    const reps = {}
    for (const monthKey of MONTH_KEYS) {
      const monthReps = months[monthKey]?.reps || {}
      for (const repName of Object.keys(monthReps)) {
        const hanbai = monthReps[repName].hanbai
        if (!hanbai) continue
        if (!reps[repName]) reps[repName] = { name: repName, monthly: {}, kensu: 0, total: 0 }
        let monthSum = 0, monthKensu = 0
        for (const item of HANBAI_ITEMS) { monthSum += hanbai[item]?.jissekiUriage || 0; monthKensu += hanbai[item]?.jissekiKensu || 0 }
        reps[repName].monthly[monthKey] = monthSum
        reps[repName].total += monthSum
        reps[repName].kensu += monthKensu
      }
    }
    return Object.values(reps)
  }, [months])

  const monthlyTotals = useMemo(() => {
    const totals = {}
    for (const monthKey of MONTH_KEYS) totals[monthKey] = repRows.reduce((sum, r) => sum + (r.monthly[monthKey] || 0), 0)
    return totals
  }, [repRows])
  const maxMonthTotal = Math.max(1, ...Object.values(monthlyTotals))

  // 担当者別ランキング用（担当者名／件数／年度売上でソート可能）
  const [repSort, onRepSort] = useSort('total')
  const sortedRepTotals = useMemo(() => sortRows(repRows, repSort, (r, key) => (key === 'name' ? r.name : key === 'kensu' ? r.kensu : r.total)), [repRows, repSort])

  // 担当者×月クロス集計用（担当者名、または任意の月の列でソート可能）
  const [crossSort, onCrossSort] = useSort('total')
  const sortedCrossRows = useMemo(() => sortRows(repRows, crossSort, (r, key) => (key === 'name' ? r.name : key === 'total' ? r.total : (r.monthly[key] || 0))), [repRows, crossSort])

  return <>
    <div className="page-header"><div><h1>商品販売分析</h1><p>住宅改修・福祉用具・紙おむつ・消耗品の販売実績を確認</p></div><div className="page-header-actions">{importAction}</div></div>
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
        <div className="provider-sales-empty"><Icon name="info" size={16}/><span>画面上部「Excelを取り込む」から売上状況報告書・商品分類別販売売上を取り込むと、ここに反映されます。</span></div>
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
        {MONTH_KEYS.map((monthKey) => <div className="bar-item" key={monthKey}><span>{num(monthlyTotals[monthKey])}</span><div><i style={{ height: `${Math.max(3, monthlyTotals[monthKey] / maxMonthTotal * 100)}%` }}/></div><small>{MONTH_LABELS[monthKey]}</small></div>)}
      </div>
    </section>

    {repRows.length > 0 && <section className="staff-panel">
      <div className="panel-heading"><div><h2>担当者別 商品販売実績</h2><span>列見出しをクリックすると並び替えられます</span></div></div>
      <div className="responsive-table"><table className="staff-table sortable-table"><thead><tr>
        <SortTh label="担当者" sortKey="name" sort={repSort} onSort={onRepSort}/>
        <SortTh label="件数" sortKey="kensu" sort={repSort} onSort={onRepSort} align="right"/>
        <SortTh label="年度売上" sortKey="total" sort={repSort} onSort={onRepSort} align="right"/>
      </tr></thead><tbody>
        {sortedRepTotals.map((r) => <tr key={r.name}><th>{r.name}</th><td>{num(r.kensu)}件</td><td>{yen(r.total)}千円</td></tr>)}
      </tbody></table></div>
    </section>}

    {repRows.length > 0 && <section className="staff-panel">
      <div className="panel-heading"><div><h2>担当者×月別 売上一覧</h2><span>担当者名・年度合計・各月の列見出しをクリックすると並び替えられます</span></div><span className="chart-unit">単位：千円</span></div>
      <div className="responsive-table"><table className="staff-table sortable-table"><thead><tr>
        <SortTh label="担当者" sortKey="name" sort={crossSort} onSort={onCrossSort}/>
        {MONTH_KEYS.map((monthKey) => <SortTh key={monthKey} label={MONTH_LABELS[monthKey]} sortKey={monthKey} sort={crossSort} onSort={onCrossSort} align="right"/>)}
        <SortTh label="年度合計" sortKey="total" sort={crossSort} onSort={onCrossSort} align="right"/>
      </tr></thead><tbody>
        {sortedCrossRows.map((r) => <tr key={r.name}>
          <th>{r.name}</th>
          {MONTH_KEYS.map((monthKey) => <td key={monthKey} className="align-right">{r.monthly[monthKey] ? num(r.monthly[monthKey]) : '—'}</td>)}
          <td className="align-right"><strong>{num(r.total)}</strong></td>
        </tr>)}
        <tr className="row-strong">
          <th>営業所計</th>
          {MONTH_KEYS.map((monthKey) => <td key={monthKey} className="align-right">{num(monthlyTotals[monthKey])}</td>)}
          <td className="align-right">{num(grandTotal.jissekiUriage)}</td>
        </tr>
      </tbody></table></div>
    </section>}
  </>
}

function Kpi({ label, value, unit, accent }) {
  return <div className={`kpi-card ${accent ? 'accent' : ''}`}><span>{label}</span><strong>{value}<small>{unit}</small></strong></div>
}
