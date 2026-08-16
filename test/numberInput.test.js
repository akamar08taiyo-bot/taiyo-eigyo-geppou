// 指示書 GEPP-14 の受入条件をテスト化したもの。
// 「空欄→再入力が自然に行え、負数・桁超過は保存不可。エラー後も入力文字列を失わない」

import test from 'node:test'
import assert from 'node:assert/strict'
import { parseCount, MAX_REPORT_VALUE } from '../src/lib/numberInput.js'

test('負数は保存しない（null を返す）', () => {
  assert.equal(parseCount('-1'), null)
  assert.equal(parseCount('-100'), null)
  assert.equal(parseCount(-1), null)
  assert.equal(parseCount('－5'), null) // 全角マイナス
  assert.equal(parseCount('ー5'), null)
})

test('桁超過は保存しない', () => {
  assert.equal(parseCount(String(MAX_REPORT_VALUE)), MAX_REPORT_VALUE)
  assert.equal(parseCount(String(MAX_REPORT_VALUE + 1)), null)
  assert.equal(parseCount('99999999999999'), null)
})

test('小数・指数表記・文字混じりは保存しない', () => {
  assert.equal(parseCount('1.5'), null)
  assert.equal(parseCount('1e3'), null)
  assert.equal(parseCount('12abc'), null)
  assert.equal(parseCount('あ'), null)
  assert.equal(parseCount('1 2'), null)
})

test('非数・無限大は保存しない', () => {
  assert.equal(parseCount(NaN), null)
  assert.equal(parseCount(Infinity), null)
  assert.equal(parseCount(-Infinity), null)
  assert.equal(parseCount(1.5), null)
})

test('空欄は保存しない（呼び出し側が draft として保持する）', () => {
  assert.equal(parseCount(''), null)
  assert.equal(parseCount('   '), null)
  assert.equal(parseCount(null), null)
  assert.equal(parseCount(undefined), null)
})

test('通常の値は保存する', () => {
  assert.equal(parseCount('0'), 0)
  assert.equal(parseCount('22'), 22)
  assert.equal(parseCount(1604), 1604)
  assert.equal(parseCount('2499'), 2499)
})

test('全角数字と桁区切りを解釈する', () => {
  assert.equal(parseCount('１２３'), 123)
  assert.equal(parseCount('1,050'), 1050)
  assert.equal(parseCount('２，４１０'), 2410)
})

test('項目別の上限・下限を指定できる', () => {
  assert.equal(parseCount('15', { min: 0, max: 10 }), null)
  assert.equal(parseCount('10', { min: 0, max: 10 }), 10)
  assert.equal(parseCount('0', { min: 1 }), null)
  assert.equal(parseCount('1', { min: 1 }), 1)
})

// NumberField の確定タイミングを、コンポーネントを描画せずに検証する。
// （入力途中の空欄で 0 に確定してしまう GEPP-14 の再現ケース）
function simulateTyping(sequence) {
  let committed = 0
  let draft = null
  for (const raw of sequence) {
    draft = raw
    if (raw === '') continue // 空欄の間は確定しない
    const parsed = parseCount(raw)
    if (parsed !== null) committed = parsed
  }
  return { committed, draft }
}

test('数字を消して打ち直しても、途中で 0 に変わらない', () => {
  // 22 が入っている欄を全部消して 35 と打ち直す
  const result = simulateTyping(['22', '2', '', '3', '35'])
  assert.equal(result.committed, 35)
})

test('負数を打っている間は確定せず、入力文字列は残る', () => {
  const result = simulateTyping(['22', '-', '-5'])
  assert.equal(result.committed, 22) // 元の値のまま
  assert.equal(result.draft, '-5') // 入力は失われない
})
