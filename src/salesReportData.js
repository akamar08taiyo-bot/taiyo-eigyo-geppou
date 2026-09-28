// 営業月報：所長が使っていたExcel（年間予算進捗と対応策）を再現するデータ層。
// 初期値は空欄。手入力またはExcel取込で入力していく。
const STORE_KEY = 'taiyo-sales-report-v1'

export const MONTH_KEYS = ['04', '05', '06', '07', '08', '09', '10', '11', '12', '01', '02', '03']
export const MONTH_LABELS = { '04': '4月', '05': '5月', '06': '6月', '07': '7月', '08': '8月', '09': '9月', '10': '10月', '11': '11月', '12': '12月', '01': '1月', '02': '2月', '03': '3月' }
// 会計年度: 4月始まり。'04'〜'12'はfiscalYear、'01'〜'03'はfiscalYear+1のカレンダー年。
export const fiscalCalendarYear = (fiscalYear, monthKey) => (Number(monthKey) >= 4 ? fiscalYear : fiscalYear + 1)

export const VISIT_FIELDS = [
  ['houkatsu', '包括（統括）'], ['kyotaku', '居宅'], ['shisetsu', '施設等'], ['kojin', '個人宅'], ['yakusho', '役所'],
  ['rentalSoudan', 'レンタル相談'], ['rentalKaigo', '介護保険納品'], ['rentalJihi', '自費（特価）納品'], ['rentalKaishu', '回収'], ['rentalKoukan', '交換'],
  ['hanbaiSoudan', '商品販売相談'], ['hanbaiNouhin', '商品販売納品'],
  ['kaishuSoudan', '住宅改修相談'], ['kaishuGenba', '現場調査'], ['kaishuKouji', '工事立ち合い'],
  ['keikakusho', '福祉用具サービス計画書'], ['monitoring', 'モニタリング'], ['tantousha', '担当者会議'], ['claim', 'クレーム対応等'], ['shukin', '集金'],
  ['doukou', '同行・応援'], ['sonota', 'その他'], ['kadou', '稼働日数'],
]

export function emptyVisit() {
  const v = {}
  for (const [key] of VISIT_FIELDS) v[key] = 0
  return v
}

export function visitTotal(v) {
  return (v.houkatsu || 0) + (v.kyotaku || 0) + (v.shisetsu || 0) + (v.kojin || 0) + (v.yakusho || 0)
}

export function sumVisits(list) {
  const out = emptyVisit()
  for (const v of list) for (const [key] of VISIT_FIELDS) out[key] += Number(v?.[key] || 0)
  return out
}

// 月間売上（売上状況報告書）＋累計売上（売上推移）の手入力欄
export function emptySalesFigures() {
  return {
    rentalNouhinKeikei: 0,       // 新規納品金額（売上状況報告書）
    zenGetsuKaishu: 0,           // 前月回収金額（売上状況報告書）
    mokuhyou: 0,                 // 目標値（売上状況報告書）
    touGetsuKaishu: 0,           // 当月回収金額（売上状況報告書）
    rentalYosanTanki: 0,         // レンタル予算（単月・担当別売上実績）
    rentalJissekiTanki: 0,       // レンタル実績値（単月・担当別売上実績）
    hanbaiYosan: 0,              // 商品販売予算（単月・担当別売上実績）
    hanbaiUriage: 0,             // 商品販売実績（単月・担当別売上実績）
    kaishuuYosan: 0,             // 住宅改修予算（単月・担当別売上実績）
    kaishuuUriage: 0,            // 住宅改修実績（単月・担当別売上実績）
    // 年度累計側（担当別売上実績の「年度累計」列）
    rentalYosanAtsumu: 0,        // レンタル予算（年度累計）
    rentalJissekiAtsumu: 0,      // レンタル累計金額（年度累計実績）
    hanbaiYosanAtsumu: 0,        // 商品販売予算（年度累計）
    hanbaiUriageAtsumu: 0,       // 商品販売累計金額（年度累計実績）
    kaishuuYosanAtsumu: 0,       // 住宅改修予算（年度累計）
    kaishuuUriageAtsumu: 0,      // 住宅改修累計金額（年度累計実績）
  }
}

export function sumSalesFigures(list) {
  const keys = Object.keys(emptySalesFigures())
  const out = emptySalesFigures()
  for (const s of list) for (const k of keys) out[k] += Number(s?.[k] || 0)
  return out
}

// 販売内訳（手入力）: 予算/実績 の 件数・売上
export const HANBAI_ITEMS = ['①住宅改修', '②特定福祉用具', '③一般福祉用具', '④紙おむつ販売', '⑤消耗品販売']
export function emptyHanbaiUchiwake() {
  const o = {}
  for (const name of HANBAI_ITEMS) o[name] = { yosanKensu: 0, yosanUriage: 0, jissekiKensu: 0, jissekiUriage: 0 }
  return o
}
export function sumHanbaiUchiwake(list) {
  const out = emptyHanbaiUchiwake()
  for (const h of list) for (const name of HANBAI_ITEMS) {
    if (!h?.[name]) continue
    out[name].yosanKensu += Number(h[name].yosanKensu || 0)
    out[name].yosanUriage += Number(h[name].yosanUriage || 0)
    out[name].jissekiKensu += Number(h[name].jissekiKensu || 0)
    out[name].jissekiUriage += Number(h[name].jissekiUriage || 0)
  }
  return out
}

// ターゲット包括・居宅（手入力の顧客数・売上一覧）
export function emptyTarget() { return { lastMar: { count: 0, sales: 0 }, thisMonth: { count: 0, sales: 0 } } }

// 介護保険レンタル／特価ベッドレンタル／包括・居宅訪問 の目標（設定から変更可、デフォルトはExcelの値）
export const DEFAULT_GOALS = {
  kaigoRental: { mokuhyou: 6 },        // 新規介護保険ご利用者獲得件数（月）
  tokkaBed: { mokuhyou: 2 },           // 新規特価ベッドご利用者獲得件数（月）
  houmon: { houkatsu: 22, kyotaku: 11 }, // 目標訪問件数（月・包括／居宅）
}

function defaultRepEntry(overrides = {}) {
  return {
    visit: overrides.visit || emptyVisit(),
    sales: { ...emptySalesFigures(), ...(overrides.sales || {}) },
    hanbai: overrides.hanbai || emptyHanbaiUchiwake(),
    targets: overrides.targets || {},   // { [targetName]: emptyTarget() }
    kaigoRentalJisseki: overrides.kaigoRentalJisseki ?? { houkatsu: 0, kyotaku: 0 },
    tokkaBedJisseki: overrides.tokkaBedJisseki ?? { houkatsu: 0, kyotaku: 0 },
    houmonJisseki: overrides.houmonJisseki ?? { houkatsu: 0, kyotaku: 0 },
    soukatsu: overrides.soukatsu || '',     // 総括（自由記述）
    jigetsuTaisaku: overrides.jigetsuTaisaku || '', // 次月対策（自由記述）
  }
}

/* ============================================================
   売上予算の組み立てロジック
   レンタルはストック（前月の残高に積み上がる）のため、担当者ごとに「4月のスタート値」と
   「純増額」だけを決め、伸ばす月にだけ純増額を積み上げて各月の予算を作る。
   伸ばさない月は前月の金額をそのまま引き継ぐ。
   住宅改修・商品販売・特価ベッドは月額を1つ決め、年間を通して同じ金額を各月に置く（計は12ヶ月分の合計）。
   営業所計は常に担当者の合計（手入力しない）。
============================================================ */
export const RENTAL_GROWTH_MONTHS = ['05', '06', '07', '10', '11', '12', '03']
const GROWTH_MONTH_SET = new Set(RENTAL_GROWTH_MONTHS)

// スタート値と純増額から、4月〜3月の12ヶ月分のレンタル予算を作る。
export function buildRentalMonthly(start, growth) {
  let steps = 0
  return MONTH_KEYS.map((monthKey) => {
    if (GROWTH_MONTH_SET.has(monthKey)) steps += 1
    return Math.round((Number(start) || 0) + (Number(growth) || 0) * steps)
  })
}

const flat12 = (value) => Array(12).fill(Math.round(Number(value) || 0))

// 旧形式（12ヶ月ぶんの配列を直接持っていた頃）のデータからスタート値・純増額・月額を推定する。
// 4月の値をスタート値、最初の伸ばす月（5月）との差を純増額とみなす。
function budgetParamsOf(entry) {
  const source = entry || {}
  if (source.rentalStart != null || source.rentalGrowth != null) {
    return {
      rentalStart: Number(source.rentalStart) || 0,
      rentalGrowth: Number(source.rentalGrowth) || 0,
      kaishuu: Number(source.kaishuu) || 0,
      hanbai: Number(source.hanbai) || 0,
      tokkaBed: Number(source.tokkaBed) || 0,
    }
  }
  const rental = source.rentalMonthly || []
  return {
    rentalStart: Number(rental[0]) || 0,
    rentalGrowth: Math.max(0, (Number(rental[1]) || 0) - (Number(rental[0]) || 0)),
    kaishuu: Number((source.kaishuuMonthly || [])[0]) || 0,
    hanbai: Number((source.hanbaiMonthly || [])[0]) || 0,
    tokkaBed: Number((source.tokkaBedMonthly || [])[0]) || 0,
  }
}

// 担当者1人分の入力値（スタート値・純増額・月額）から、表示用の12ヶ月配列を作る。
export function repBudgetOf(report, repName) {
  const entry = report?.budget?.reps?.[repName]
  const params = budgetParamsOf(entry)
  return {
    ...params,
    rentalMonthly: buildRentalMonthly(params.rentalStart, params.rentalGrowth),
    kaishuuMonthly: flat12(params.kaishuu),
    hanbaiMonthly: flat12(params.hanbai),
    tokkaBedMonthly: flat12(params.tokkaBed),
    shouhinhinLastYearAvg: Number(entry?.shouhinhinLastYearAvg) || 0,
    shouhinhinTargetAvg: Number(entry?.shouhinhinTargetAvg) || 0,
  }
}

// 営業所計は担当者全員の合計。手入力は受け付けず、常に再計算する。
export function officeBudgetOf(report) {
  const names = report?.repNames || []
  const zero = () => Array(12).fill(0)
  const totals = { rentalMonthly: zero(), kaishuuMonthly: zero(), hanbaiMonthly: zero(), tokkaBedMonthly: zero() }
  let lastYearAvg = 0
  let targetAvg = 0
  for (const name of names) {
    const rep = repBudgetOf(report, name)
    for (const key of Object.keys(totals)) {
      for (let index = 0; index < 12; index += 1) totals[key][index] += rep[key][index]
    }
    lastYearAvg += rep.shouhinhinLastYearAvg
    targetAvg += rep.shouhinhinTargetAvg
  }
  return { ...totals, shouhinhinLastYearAvg: lastYearAvg, shouhinhinTargetAvg: targetAvg, ninzu: names.length }
}

export const DEFAULT_FISCAL_YEAR = 2026
// 保存・読み込みの失敗をReact側（App.jsx）へ伝えるための簡易購読機構。
// このファイルはデータ層でReactに依存しないため、イベント通知だけを提供し、
// 実際のトースト表示は購読側（App.jsx）が行う。
const saveIssueListeners = new Set()
export function onSaveIssue(listener) {
  saveIssueListeners.add(listener)
  return () => saveIssueListeners.delete(listener)
}
function reportSaveIssue(message) {
  for (const listener of saveIssueListeners) {
    try { listener(message) } catch { /* 通知先のエラーはデータ層に波及させない */ }
  }
}

function load() {
  let raw
  try {
    raw = localStorage.getItem(STORE_KEY)
    const data = raw ? JSON.parse(raw) : {}
    data.offices = data.offices || {}
    return data
  } catch {
    // 破損データを黙って消さず、別キーへ退避してから空の状態を返す
    try {
      if (raw) localStorage.setItem(`${STORE_KEY}_corrupted_${Date.now()}`, raw)
    } catch { /* 退避に失敗しても読み込み自体は継続する */ }
    reportSaveIssue('保存データの読み込みに失敗したため、この端末を初期状態から開始します。破損したデータはこの端末に残していますので、復旧が必要な場合はご連絡ください。')
    return { offices: {} }
  }
}

// 成功時はtrue、失敗時はfalseを返す。呼び出し側はこれを見て「保存できた」と
// 誤表示しないこと（COMMON-06）。失敗はここで一元的にトースト通知する。
function save(data) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data))
    return true
  } catch {
    reportSaveIssue('保存に失敗しました。この操作の内容は保存されていません。端末の空き容量、またはプライベート/シークレットモードでないことをご確認ください。')
    return false
  }
}

// 旧バージョン（年度の概念がなく report.months が単一年度分だった頃）のデータを、
// monthsByYear[DEFAULT_FISCAL_YEAR] へ移行する。
function migrateReport(report) {
  if (report.months && !report.monthsByYear) {
    report.monthsByYear = { [DEFAULT_FISCAL_YEAR]: report.months }
    delete report.months
  }
  if (!report.monthsByYear) report.monthsByYear = {}
  return report
}

function emptyYearMonths() { return Object.fromEntries(MONTH_KEYS.map((k) => [k, { reps: {} }])) }

// 指定年度の月別データ（存在しなければ空データ）を取得する読み取り専用ヘルパー。
export function getYearMonths(report, fiscalYear) {
  return report.monthsByYear?.[fiscalYear] || emptyYearMonths()
}

// レポートに現在含まれる年度一覧（+ 表示中の年度は必ず含める）を昇順で返す。
export function listFiscalYears(report, currentFiscalYear) {
  const years = new Set(Object.keys(report.monthsByYear || {}).map(Number))
  years.add(DEFAULT_FISCAL_YEAR)
  if (currentFiscalYear != null) years.add(currentFiscalYear)
  return [...years].sort((a, b) => a - b)
}

export function getOfficeReport(officeName) {
  const data = load()
  if (!data.offices[officeName]) {
    // 社員の実名・実績・評価をソースに含めないため、どの営業所も空の状態から開始する。
    // （既にこの端末に保存されているデータはそのまま使う）
    data.offices[officeName] = emptyOfficeSeed()
    save(data)
  }
  const migrated = migrateReport(data.offices[officeName])
  if (migrated !== data.offices[officeName]) { data.offices[officeName] = migrated; save(data) }
  return data.offices[officeName]
}

function emptyOfficeSeed() {
  return {
    repNames: [],
    monthsByYear: {},
    budget: { office: { rentalMonthly: Array(12).fill(0), kaishuuMonthly: Array(12).fill(0), hanbaiMonthly: Array(12).fill(0), tokkaBedMonthly: Array(12).fill(0), shouhinhinLastYearAvg: 0, shouhinhinTargetAvg: 0, ninzu: 0 }, reps: {} },
    goals: DEFAULT_GOALS,
    kamiTermGoals: { officeName: '', personName: '', items: [], kadaiItems: [] },
    interviews: { shimoki: '', kamiki: '' },
    honnendoTaisaku: { honnendo: '', kamiki: '', shimoki: '', honnendoSoukatsu: '', jinendo: '' },
  }
}

export function updateOfficeReport(officeName, updater) {
  const data = load()
  const current = migrateReport(data.offices[officeName] || emptyOfficeSeed())
  data.offices[officeName] = updater(current)
  save(data)
  return data.offices[officeName]
}

export function addRep(officeName, fiscalYear, name) {
  return updateOfficeReport(officeName, (report) => {
    const repNames = report.repNames.includes(name) ? report.repNames : [...report.repNames, name]
    const monthsByYear = { ...report.monthsByYear }
    const months = { ...getYearMonths(report, fiscalYear) }
    for (const key of MONTH_KEYS) months[key] = { reps: { ...months[key].reps, [name]: months[key].reps[name] || defaultRepEntry() } }
    monthsByYear[fiscalYear] = months
    return { ...report, repNames, monthsByYear }
  })
}

export function removeRep(officeName, name) {
  return updateOfficeReport(officeName, (report) => {
    const repNames = report.repNames.filter((n) => n !== name)
    const monthsByYear = {}
    for (const [year, months] of Object.entries(report.monthsByYear)) {
      const yearMonths = {}
      for (const key of MONTH_KEYS) {
        const reps = { ...months[key].reps }
        delete reps[name]
        yearMonths[key] = { reps }
      }
      monthsByYear[year] = yearMonths
    }
    return { ...report, repNames, monthsByYear }
  })
}

export function updateRepEntry(officeName, fiscalYear, monthKey, repName, patch) {
  return updateOfficeReport(officeName, (report) => {
    const monthsByYear = { ...report.monthsByYear }
    const months = { ...getYearMonths(report, fiscalYear) }
    const monthData = months[monthKey] || { reps: {} }
    const current = monthData.reps[repName] || defaultRepEntry()
    months[monthKey] = { reps: { ...monthData.reps, [repName]: { ...current, ...patch } } }
    monthsByYear[fiscalYear] = months
    return { ...report, monthsByYear }
  })
}

// 取り込んだExcel/CSVに含まれる営業所と、今開いている営業所が一致するかを確認する。
// 他営業所のデータが紛れ込んで誤って上書きされることを防ぐため、一致しなければエラーにする。
export function pickOfficeData(officeDataMap, officeName) {
  if (officeDataMap[officeName]) return { [officeName]: officeDataMap[officeName] }
  const others = Object.keys(officeDataMap)
  throw new Error(`このファイルには「${officeName}」のデータが含まれていません（含まれる営業所：${others.join('、') || 'なし'}）。営業所を確認してください。`)
}

// Excel取込結果（{ [officeName]: { reps: { [repName]: 部分的なsalesFigures } } }）を
// 選択中の年度・月に反映する。担当者名はまず完全一致、なければ前方一致（姓のみのデータに対応）で照合し、
// どちらも該当しなければ新しい担当者として追加する。
// 担当者名を既存のrepNamesと照合する。完全一致→前方一致（姓のみのデータに対応）の順で探し、
// 見つからなければrepNamesに追加した上で新しい名前を返す。repNamesはこの関数の中でのみ変更する
// （呼び出し側は返り値のrepNamesを使うこと）。
// 取込側は氏名の空白を取り除いた形（例：山田太郎）で渡してくるが、画面から手で追加した担当者は
// 「山田 太郎」のように空白を含むことがある。空白の有無で別人扱いになり、同じ人が2行に分かれて
// 数字が分散していたため、照合は空白（全角・半角）を無視して行う。
const repNameKey = (name) => String(name || '').replace(/[\s　]+/g, '')
function resolveRepName(repNames, parsedName) {
  const key = repNameKey(parsedName)
  const matched = repNames.find((n) => repNameKey(n) === key) || repNames.find((n) => repNameKey(n).startsWith(key) || key.startsWith(repNameKey(n)))
  if (matched) return { repNames, matched, created: false }
  return { repNames: [...repNames, parsedName], matched: parsedName, created: true }
}

// officeごとに1回のload/saveでまとめて反映し、担当者数×月数ぶんの個別書き込み（毎回のJSON全体シリアライズ）を避ける。
export function applyImportedSalesFigures(fiscalYear, monthKey, officeDataMap) {
  const summary = { updated: [], created: [] }
  for (const [officeName, entry] of Object.entries(officeDataMap)) {
    const repsData = entry.reps || {}
    updateOfficeReport(officeName, (report) => {
      let repNames = report.repNames
      const monthsByYear = { ...report.monthsByYear }
      const months = { ...getYearMonths(report, fiscalYear) }
      const monthData = months[monthKey] || { reps: {} }
      const nextReps = { ...monthData.reps }
      for (const [parsedName, patch] of Object.entries(repsData)) {
        const resolved = resolveRepName(repNames, parsedName)
        repNames = resolved.repNames
        const current = nextReps[resolved.matched] || defaultRepEntry()
        nextReps[resolved.matched] = { ...current, sales: { ...(current.sales || emptySalesFigures()), ...patch } }
        summary[resolved.created ? 'created' : 'updated'].push(`${officeName} / ${resolved.matched}`)
      }
      months[monthKey] = { reps: nextReps }
      monthsByYear[fiscalYear] = months
      return { ...report, repNames, monthsByYear }
    })
  }
  return summary
}

// 担当別売上実績のように、1ファイルに複数月分（{ [officeName]: { reps: { [repName]: { [monthKey]: 部分的なsalesFigures } } } }）
// が入っている取込結果を反映する。担当者名の照合ルールはapplyImportedSalesFiguresと同じ。officeごとに1回のload/saveでまとめる。
export function applyImportedSalesFiguresMultiMonth(fiscalYear, officeDataMap) {
  const summary = { updated: [], created: [], months: new Set() }
  for (const [officeName, entry] of Object.entries(officeDataMap)) {
    const repsData = entry.reps || {}
    updateOfficeReport(officeName, (report) => {
      let repNames = report.repNames
      const monthsByYear = { ...report.monthsByYear }
      const months = { ...getYearMonths(report, fiscalYear) }
      for (const [parsedName, byMonth] of Object.entries(repsData)) {
        const resolved = resolveRepName(repNames, parsedName)
        repNames = resolved.repNames
        for (const [monthKey, patch] of Object.entries(byMonth)) {
          const monthData = months[monthKey] || { reps: {} }
          const current = monthData.reps[resolved.matched] || defaultRepEntry()
          months[monthKey] = { reps: { ...monthData.reps, [resolved.matched]: { ...current, sales: { ...(current.sales || emptySalesFigures()), ...patch } } } }
          summary.months.add(monthKey)
        }
        summary[resolved.created ? 'created' : 'updated'].push(`${officeName} / ${resolved.matched}`)
      }
      monthsByYear[fiscalYear] = months
      return { ...report, repNames, monthsByYear }
    })
  }
  return { updated: summary.updated, created: summary.created, months: [...summary.months].sort() }
}

// 商品分類別販売売上の取込結果（{ [officeName]: { reps: { [repName]: { [HANBAI_ITEM名]: { jissekiKensu, jissekiUriage } } } } }）を
// 選択中の年度・月の販売内訳（実績のみ、予算は変更しない）に反映する。担当者名の照合ルールは他の取込と同じ。
export function applyImportedHanbaiFigures(fiscalYear, monthKey, officeDataMap) {
  const summary = { updated: [], created: [] }
  for (const [officeName, entry] of Object.entries(officeDataMap)) {
    const repsData = entry.reps || {}
    updateOfficeReport(officeName, (report) => {
      let repNames = report.repNames
      const monthsByYear = { ...report.monthsByYear }
      const months = { ...getYearMonths(report, fiscalYear) }
      const monthData = months[monthKey] || { reps: {} }
      const nextReps = { ...monthData.reps }
      for (const [parsedName, itemPatch] of Object.entries(repsData)) {
        const resolved = resolveRepName(repNames, parsedName)
        repNames = resolved.repNames
        const current = nextReps[resolved.matched] || defaultRepEntry()
        const currentHanbai = current.hanbai || emptyHanbaiUchiwake()
        const nextHanbai = { ...currentHanbai }
        for (const [itemName, patch] of Object.entries(itemPatch)) {
          nextHanbai[itemName] = { ...currentHanbai[itemName], ...patch }
        }
        nextReps[resolved.matched] = { ...current, hanbai: nextHanbai }
        summary[resolved.created ? 'created' : 'updated'].push(`${officeName} / ${resolved.matched}`)
      }
      months[monthKey] = { reps: nextReps }
      monthsByYear[fiscalYear] = months
      return { ...report, repNames, monthsByYear }
    })
  }
  return summary
}

// 訪問ログ取込結果（{ [officeName]: { [repName]: { [fiscalYear]: { [monthKey]: { visit } } } } }）を反映する。
// 担当者名はまず完全一致、なければ前方一致（姓のみのデータに対応）で照合し、どちらも該当しなければ新しい担当者として追加する。
// officeごとに1回のload/saveでまとめて反映する。
export function applyImportedVisitFigures(officeDataMap) {
  const summary = { updated: [], created: [] }
  for (const [officeName, repsByYear] of Object.entries(officeDataMap)) {
    updateOfficeReport(officeName, (report) => {
      let repNames = report.repNames
      const monthsByYear = { ...report.monthsByYear }
      for (const [parsedName, years] of Object.entries(repsByYear)) {
        const resolved = resolveRepName(repNames, parsedName)
        repNames = resolved.repNames
        for (const [fiscalYearStr, monthsData] of Object.entries(years)) {
          const fiscalYear = Number(fiscalYearStr)
          const months = { ...(monthsByYear[fiscalYear] || getYearMonths({ monthsByYear }, fiscalYear)) }
          for (const [monthKey, bucket] of Object.entries(monthsData)) {
            const monthData = months[monthKey] || { reps: {} }
            const current = monthData.reps[resolved.matched] || defaultRepEntry()
            months[monthKey] = { reps: { ...monthData.reps, [resolved.matched]: { ...current, visit: { ...(current.visit || emptyVisit()), ...bucket.visit } } } }
          }
          monthsByYear[fiscalYear] = months
        }
        summary[resolved.created ? 'created' : 'updated'].push(`${officeName} / ${resolved.matched}`)
      }
      return { ...report, repNames, monthsByYear }
    })
  }
  return summary
}

// その年度・月までの累計（4月からmonthKeyまでの各reps合算値）を計算する。
// 年度累計そのものを表すフィールド（担当別売上実績の「年度累計」列からそのまま入る値）は、
// 月をまたいで合算すると二重計上になるため、対象月時点の値をそのまま使う。
const ATSUMU_KEYS = ['rentalYosanAtsumu', 'rentalJissekiAtsumu', 'hanbaiYosanAtsumu', 'hanbaiUriageAtsumu', 'kaishuuYosanAtsumu', 'kaishuuUriageAtsumu']

export function cumulativeSalesThrough(report, fiscalYear, monthKey) {
  const idx = MONTH_KEYS.indexOf(monthKey)
  const upTo = MONTH_KEYS.slice(0, idx + 1)
  const months = getYearMonths(report, fiscalYear)
  const totals = {}
  for (const repName of report.repNames) {
    const list = upTo.map((k) => months[k]?.reps?.[repName]?.sales).filter(Boolean)
    const summed = sumSalesFigures(list)
    const latest = months[monthKey]?.reps?.[repName]?.sales
    for (const k of ATSUMU_KEYS) summed[k] = latest?.[k] || 0
    totals[repName] = summed
  }
  return totals
}

// 年度累計の欄が未入力（0）のときは、4月〜対象月の単月の値を合計して表示に使う。
// 手入力で単月だけ入れた場合に年度累計が0のままになるのを防ぐ（入力済みの年度累計はそのまま優先）。
const ATSUMU_FROM_TANKI = {
  rentalYosanAtsumu: 'rentalYosanTanki',
  rentalJissekiAtsumu: 'rentalJissekiTanki',
  hanbaiYosanAtsumu: 'hanbaiYosan',
  hanbaiUriageAtsumu: 'hanbaiUriage',
  kaishuuYosanAtsumu: 'kaishuuYosan',
  kaishuuUriageAtsumu: 'kaishuuUriage',
}
export function salesWithCumulativeFallback(months, repName, monthKey) {
  const sales = { ...emptySalesFigures(), ...(months?.[monthKey]?.reps?.[repName]?.sales || {}) }
  const derived = new Set()
  const upTo = MONTH_KEYS.slice(0, MONTH_KEYS.indexOf(monthKey) + 1)
  for (const [atsumuKey, tankiKey] of Object.entries(ATSUMU_FROM_TANKI)) {
    if (Number(sales[atsumuKey] || 0) !== 0) continue
    const total = upTo.reduce((acc, k) => acc + Number(months?.[k]?.reps?.[repName]?.sales?.[tankiKey] || 0), 0)
    if (total !== 0) { sales[atsumuKey] = total; derived.add(atsumuKey) }
  }
  return { sales, derived }
}

export { emptyOfficeSeed, defaultRepEntry }
