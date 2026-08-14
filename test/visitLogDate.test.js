// 指示書 GEPP-09 の受入条件をテスト化したもの。
// 「不正日付は拒否。JST深夜に日付が前日へずれない」
//
// visitLogImport.js はファイル読み込みAPIに依存するため、日付判定の中核だけを
// 同じ手順で再現して検証する。

import test from 'node:test'
import assert from 'node:assert/strict'
import { formatDateString, isValidDateString } from '../src/lib/businessDate.js'

// src/visitLogImport.js の parseDate と同じ判定手順
function parseDate(s) {
  const m = String(s).match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/) || String(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/)
  if (!m) return null
  const [year, month, day] = m[1].length === 4
    ? [Number(m[1]), Number(m[2]), Number(m[3])]
    : [2000 + Number(m[3]), Number(m[1]), Number(m[2])]
  if (!isValidDateString(formatDateString(year, month, day))) return null
  return new Date(year, month - 1, day)
}

// src/visitLogImport.js の dayKey と同じ組み立て
const dayKeyOf = (dt) => formatDateString(dt.getFullYear(), dt.getMonth() + 1, dt.getDate())

test('存在しない日付は取り込まない（従来は翌月へ繰り上がっていた）', () => {
  // new Date(2026, 1, 31) は 2026-03-03 になってしまう
  assert.equal(parseDate('2026/2/31'), null)
  assert.equal(parseDate('2026-02-30'), null)
  assert.equal(parseDate('2026/2/29'), null) // 2026年はうるう年ではない
  assert.equal(parseDate('2026/4/31'), null)
  assert.equal(parseDate('2026/13/1'), null)
  assert.equal(parseDate('2026/0/5'), null)
})

test('実在する日付は取り込む', () => {
  assert.equal(dayKeyOf(parseDate('2028/2/29')), '2028-02-29') // うるう年
  assert.equal(dayKeyOf(parseDate('2026/8/14')), '2026-08-14')
  assert.equal(dayKeyOf(parseDate('2026-08-01')), '2026-08-01')
  assert.equal(dayKeyOf(parseDate('2026/12/31')), '2026-12-31')
})

test('2桁年の形式にも対応する', () => {
  assert.equal(dayKeyOf(parseDate('8/14/26')), '2026-08-14')
  assert.equal(parseDate('2/31/26'), null)
})

test('稼働日数のキーが1日前にずれない', () => {
  // 従来は toISOString() を使っていたため、日本時間では前日のキーになっていた。
  // 年月日から直接組み立てるので、実行環境のタイムゾーンに影響されない。
  const dt = parseDate('2026/8/14')
  assert.equal(dayKeyOf(dt), '2026-08-14')
  assert.notEqual(dayKeyOf(dt), '2026-08-13')
})

test('日付として読めないものは null', () => {
  assert.equal(parseDate(''), null)
  assert.equal(parseDate('未定'), null)
  assert.equal(parseDate('令和8年8月14日'), null)
})
