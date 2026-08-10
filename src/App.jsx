import React, { useEffect, useMemo, useState } from 'react'
import { api, setCsrfToken } from './api'
import { AnalysisView } from './components/AnalysisView'
import { ProviderSalesView } from './components/ProviderSalesView'
import { ProductAnalysisView } from './components/ProductAnalysisView'
import { SalesReportView } from './components/SalesReportView'
import { LoginScreen } from './components/LoginScreen'
import { Icon } from './components/Icon'
import { parseSalesWorkbookAuto } from './salesReportExcelImport'
import { parseProviderSalesWorkbook } from './providerSalesExcelImport'
import { parseVisitLogWorkbook } from './visitLogImport'
import { applyImportedProviderSales } from './providerSalesData'
import { applyImportedSalesFigures, applyImportedSalesFiguresMultiMonth, applyImportedHanbaiFigures, applyImportedVisitFigures, pickOfficeData, DEFAULT_FISCAL_YEAR, MONTH_LABELS } from './salesReportData'

const currentMonth = () => new Date().toISOString().slice(0, 7)
const fiscalFor = (month) => { const [year, number] = month.split('-').map(Number); return number >= 4 ? year : year - 1 }
const roleLabel = { staff: '営業員', office_admin: '営業所利用', system_admin: '営業所利用' }

const TABS = [
  ['report', '営業月報', 'report'],
  ['analysis', '実績分析', 'chart'],
  ['providerSales', '居宅売上推移分析', 'trendingUp'],
  ['product', '商品販売分析', 'package'],
]

export default function App() {
  const [booting, setBooting] = useState(true)
  const [offices, setOffices] = useState([])
  const [session, setSession] = useState(null)
  const [loginBusy, setLoginBusy] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [activeTab, setActiveTab] = useState('report')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [staff, setStaff] = useState([])
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [month, setMonth] = useState(currentMonth())
  const [fiscalYear, setFiscalYear] = useState(fiscalFor(currentMonth()))
  const [analytics, setAnalytics] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [importBusy, setImportBusy] = useState(false)

  function notify(message, type = 'success') {
    setToast({ message, type })
    window.setTimeout(() => setToast(null), 4800)
  }

  useEffect(() => {
    setBooting(true)
    Promise.all([api.publicOffices(), api.me().catch(() => null)]).then(([publicData, me]) => {
      setOffices(publicData.offices)
      if (me) { setCsrfToken(me.csrfToken); setSession(me) }
    }).finally(() => setBooting(false))
  }, [])

  useEffect(() => {
    if (!session) return
    api.staff().then(({ staff: rows }) => {
      setStaff(rows)
      setSelectedStaffId(session.user.role === 'staff' ? session.user.id : '')
    }).catch((error) => notify(error.message, 'error'))
  }, [session])

  useEffect(() => {
    if (!session || (activeTab !== 'analysis' && activeTab !== 'providerSales')) return
    setAnalyticsLoading(true)
    api.analytics({ fiscalYear, staffId: selectedStaffId, comparisonMonth: month }).then(setAnalytics).catch((error) => notify(error.message, 'error')).finally(() => setAnalyticsLoading(false))
  }, [session, activeTab, fiscalYear, selectedStaffId, month])

  async function handleLogin(form) {
    setLoginBusy(true); setLoginError('')
    try {
      const result = await api.login(form)
      setCsrfToken(result.csrfToken); setSession(result)
    } catch (error) { setLoginError(error.message) }
    finally { setLoginBusy(false) }
  }

  async function logout() {
    try { await api.logout() } catch { /* session is cleared locally either way */ }
    setCsrfToken(''); setSession(null); setStaff([]); setSelectedStaffId(''); setSidebarOpen(false)
  }

  // Excelの中身を見て、売上状況報告書／担当別売上実績／商品分類別販売売上／居宅別売上推移表／訪問ログの
  // どれかを自動判定して反映する。すべてこの1つのボタンから取り込める。
  async function importOneFile(file) {
    if (/\.(xlsx|xlsm)$/i.test(file.name)) {
      let result
      try { result = await parseSalesWorkbookAuto(file) }
      catch (firstError) {
        if (/アプリが更新されたため/.test(firstError.message)) throw firstError
        const trend = await parseProviderSalesWorkbook(file)
        const officeEntry = pickOfficeData(trend.offices, session.office.name)[session.office.name]
        const summary = applyImportedProviderSales(session.office.name, officeEntry)
        return `✓ 居宅別売上推移表を取り込みました（${trend.fiscalYear}年度・${summary.providerCount}件の居宅）。「居宅売上推移分析」タブに反映されます。`
      }
      if (result.type === 'status') {
        const targetYear = result.fiscalYear ?? fiscalYear ?? DEFAULT_FISCAL_YEAR
        const targetMonth = result.monthKey ?? month.split('-')[1]
        const summary = applyImportedSalesFigures(targetYear, targetMonth, pickOfficeData(result.data, session.office.name))
        const total = summary.updated.length + summary.created.length
        return `✓ 売上状況報告書を取り込みました。営業月報（${targetYear}年度${MONTH_LABELS[targetMonth] || targetMonth + '月'}）に${total}件の担当者分を反映しました。`
      }
      if (result.type === 'hanbaiBunrui') {
        const targetYear = result.fiscalYear ?? fiscalYear ?? DEFAULT_FISCAL_YEAR
        const targetMonth = result.monthKey ?? month.split('-')[1]
        const summary = applyImportedHanbaiFigures(targetYear, targetMonth, pickOfficeData(result.data, session.office.name))
        const total = summary.updated.length + summary.created.length
        return `✓ 商品分類別販売売上を取り込みました。営業月報・商品販売分析（${targetYear}年度${MONTH_LABELS[targetMonth] || targetMonth + '月'}）に${total}件の担当者分を反映しました。`
      }
      const targetYear = result.fiscalYear ?? fiscalYear ?? DEFAULT_FISCAL_YEAR
      const summary = applyImportedSalesFiguresMultiMonth(targetYear, pickOfficeData(result.data, session.office.name))
      const total = summary.updated.length + summary.created.length
      return `✓ 担当別売上実績を取り込みました。営業月報（${targetYear}年度）に${total}件の担当者分・${summary.months.length}ヶ月分を反映しました。`
    }
    let result
    try { result = await parseVisitLogWorkbook(file) }
    catch (error) {
      if (/アプリが更新されたため/.test(error.message)) throw error
      throw error
    }
    const summary = applyImportedVisitFigures(pickOfficeData(result.offices, session.office.name))
    const total = summary.updated.length + summary.created.length
    return `✓ 訪問ログを取り込みました。営業月報の訪問実績に${result.matchedRows}/${result.totalRows}件・${total}名分を反映しました。`
  }

  async function handleImportFiles(event) {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (!files.length) return
    setImportBusy(true)
    const results = []
    const errors = []
    for (const file of files) {
      try { results.push(await importOneFile(file)) }
      catch (error) { errors.push(`${file.name}：${error.message || '取り込みに失敗しました。'}`) }
    }
    setImportBusy(false)
    if (results.length) notify(results.join(' / '), errors.length ? 'error' : 'success')
    if (errors.length && !results.length) notify(errors.join('、'), 'error')
    else if (errors.length) notify(`一部失敗：${errors.join('、')}`, 'error')
  }

  const selectedStaffName = useMemo(() => staff.find((person) => person.id === selectedStaffId)?.name || '', [staff, selectedStaffId])
  const scopeLabel = selectedStaffName || '営業所全体'

  if (booting) return <div className="boot-screen"><span className="spinner"/><strong>営業月報を起動しています…</strong></div>
  if (!session) return <LoginScreen offices={offices} onLogin={handleLogin} busy={loginBusy} error={loginError}/>

  let pageContent
  if (activeTab === 'report') {
    pageContent = <SalesReportView officeName={session.office.name} fiscalYear={fiscalYear}/>
  } else if (activeTab === 'analysis') {
    pageContent = <AnalysisView fiscalYear={fiscalYear} setFiscalYear={setFiscalYear} analytics={analytics} loading={analyticsLoading} scopeLabel={scopeLabel} staff={staff} selectedStaffId={selectedStaffId} setSelectedStaffId={setSelectedStaffId} canSelectStaff={session.user.role !== 'staff'}/>
  } else if (activeTab === 'providerSales') {
    pageContent = <ProviderSalesView analytics={analytics} fiscalYear={fiscalYear} setFiscalYear={setFiscalYear} officeName={session.office.name} loading={analyticsLoading} scopeLabel={scopeLabel} staff={staff} selectedStaffId={selectedStaffId} setSelectedStaffId={setSelectedStaffId} canSelectStaff={session.user.role !== 'staff'}/>
  } else {
    pageContent = <ProductAnalysisView officeName={session.office.name} fiscalYear={fiscalYear} setFiscalYear={setFiscalYear}/>
  }

  return <div className="app-shell">
    <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`}>
      <div className="sidebar-brand"><span className="brand-symbol">営</span><span>営業月報</span><button className="sidebar-close icon-button" onClick={() => setSidebarOpen(false)}><Icon name="close"/></button></div>
      <nav>{TABS.map(([key, label, icon]) => <button key={key} className={activeTab === key ? 'active' : ''} onClick={() => { setActiveTab(key); setSidebarOpen(false) }}><Icon name={icon}/>{label}</button>)}</nav>
      <div className="sidebar-bottom"><div className="retention-note"><Icon name="info" size={16}/>営業所ごとにデータを保存</div><button onClick={logout}><Icon name="logout"/>ログアウト</button></div>
    </aside>
    {sidebarOpen && <button className="sidebar-scrim" aria-label="メニューを閉じる" onClick={() => setSidebarOpen(false)}/>}
    <main className="main-content">
      <header className="topbar">
        <button className="mobile-menu icon-button" onClick={() => setSidebarOpen(true)}><Icon name="menu"/></button>
        <div className="mobile-brand"><span className="brand-symbol">営</span>営業月報</div>
        <div className="office-context"><span>営業所</span><strong>{session.office.name}</strong></div>
        <div className="topbar-spacer"/>
        <label className="button button-primary button-import-highlight topbar-import-btn">
          <Icon name="upload" size={17}/>
          <span>{importBusy ? '取り込み中…' : 'Excelを取り込む'}</span>
          <input type="file" accept=".xlsx,.xlsm,.xls,.csv" multiple disabled={importBusy} onChange={handleImportFiles} hidden/>
        </label>
        <div className="user-context"><Icon name="user"/><div><strong>{session.user.name}</strong><span>{roleLabel[session.user.role]}</span></div></div>
      </header>
      <div className="page-content">{pageContent}</div>
    </main>
    {toast && <div className={`toast ${toast.type}`} role="status"><Icon name={toast.type === 'error' ? 'info' : 'check'}/>{toast.message}</div>}
  </div>
}
