// 手入力で追加した担当者（空白あり）と、Excel取込（空白なし）の氏名を同一人物として扱うことの検証。
import test from 'node:test'
import assert from 'node:assert/strict'

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
}

const { addRep, applyImportedSalesFigures, applyImportedVisitFigures, getOfficeReport, getYearMonths } = await import('../src/salesReportData.js')

test('手入力の「山田 太郎」と取込の「山田太郎」を同じ担当者として反映する', () => {
  const office = '小倉営業所'
  addRep(office, 2026, '山田 太郎')
  const summary = applyImportedSalesFigures(2026, '05', { [office]: { reps: { '山田太郎': { mokuhyou: 123 } } } })
  assert.deepEqual(summary.created, [])
  const report = getOfficeReport(office)
  assert.deepEqual(report.repNames, ['山田 太郎'])
  assert.equal(getYearMonths(report, 2026)['05'].reps['山田 太郎'].sales.mokuhyou, 123)
})

test('訪問ログ取込でも全角空白の有無を同一人物として扱う', () => {
  const office = '田川営業所'
  addRep(office, 2026, '佐藤　花子')
  applyImportedVisitFigures({ [office]: { '佐藤花子': { 2026: { '06': { visit: { houkatsu: 5 } } } } } })
  const report = getOfficeReport(office)
  assert.deepEqual(report.repNames, ['佐藤　花子'])
  assert.equal(getYearMonths(report, 2026)['06'].reps['佐藤　花子'].visit.houkatsu, 5)
})

test('別人（姓が同じでも名が違う）は別の担当者として追加する', () => {
  const office = '飯塚営業所'
  addRep(office, 2026, '田中 一郎')
  const summary = applyImportedSalesFigures(2026, '05', { [office]: { reps: { '田中次郎': { mokuhyou: 1 } } } })
  assert.equal(summary.created.length, 1)
  assert.deepEqual(getOfficeReport(office).repNames, ['田中 一郎', '田中次郎'])
})
