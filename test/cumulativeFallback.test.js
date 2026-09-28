// 年度累計が未入力のとき、4月〜対象月の単月の合計で補って表示することの検証。
import test from 'node:test'
import assert from 'node:assert/strict'

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} }
const { salesWithCumulativeFallback } = await import('../src/salesReportData.js')

const months = {
  '04': { reps: { A: { sales: { hanbaiUriage: 100, hanbaiYosan: 90, rentalJissekiTanki: 500 } } } },
  '05': { reps: { A: { sales: { hanbaiUriage: 120, hanbaiYosan: 90, rentalJissekiTanki: 510 } } } },
  '06': { reps: { A: { sales: { hanbaiUriage: 130, hanbaiYosan: 90, rentalJissekiTanki: 520, kaishuuUriageAtsumu: 999 } } } },
}

test('年度累計が0なら単月の合計を使い、入力済みの年度累計はそのまま使う', () => {
  const { sales, derived } = salesWithCumulativeFallback(months, 'A', '06')
  assert.equal(sales.hanbaiUriageAtsumu, 350)
  assert.equal(sales.hanbaiYosanAtsumu, 270)
  assert.equal(sales.rentalJissekiAtsumu, 1530)
  assert.equal(sales.kaishuuUriageAtsumu, 999)
  assert.ok(derived.has('hanbaiUriageAtsumu'))
  assert.ok(!derived.has('kaishuuUriageAtsumu'))
})

test('対象月より後の月は合計に含めない', () => {
  const { sales } = salesWithCumulativeFallback(months, 'A', '05')
  assert.equal(sales.hanbaiUriageAtsumu, 220)
})

test('単月も未入力なら0のまま（補った印も付けない）', () => {
  const { sales, derived } = salesWithCumulativeFallback({}, 'A', '04')
  assert.equal(sales.hanbaiUriageAtsumu, 0)
  assert.equal(derived.size, 0)
})
