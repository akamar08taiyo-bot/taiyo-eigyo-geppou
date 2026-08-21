// 指示書 GEPP-13 / COMMON-06 の受入条件をテスト化したもの。
// 「破損時に自動初期化せず、直前正常版と破損copyを保全する」
// 「成功の誤表示なし。既存データとbackupを保全」
//
// salesReportData.js はブラウザの localStorage に直接依存しているため、
// テスト用の簡易 localStorage をグローバルに用意してから import する。

import test from 'node:test'
import assert from 'node:assert/strict'

// --- 簡易 localStorage 実装（QuotaExceededError も模擬できる） ---
function makeFakeLocalStorage() {
  const store = new Map()
  let failNextSet = false
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => {
      if (failNextSet) {
        const err = new DOMExceptionLike('QuotaExceededError')
        throw err
      }
      store.set(k, String(v))
    },
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    key: (i) => [...store.keys()][i] ?? null,
    get length() { return store.size },
    _store: store,
    _failNextSet(v) { failNextSet = v },
  }
}
function DOMExceptionLike(name) {
  const e = new Error(name)
  e.name = name
  return e
}

globalThis.localStorage = makeFakeLocalStorage()

const { getOfficeReport, updateOfficeReport, onSaveIssue } = await import('../src/salesReportData.js')

function freshStorage() {
  globalThis.localStorage = makeFakeLocalStorage()
}

test('保存に成功したときは通知されない', () => {
  freshStorage()
  const messages = []
  const unsubscribe = onSaveIssue((m) => messages.push(m))
  updateOfficeReport('行橋営業所', (r) => ({ ...r, repNames: ['山田'] }))
  unsubscribe()
  assert.deepEqual(messages, [])
})

test('保存に失敗したら通知され、失敗が黙って成功扱いにならない', () => {
  freshStorage()
  globalThis.localStorage._failNextSet(true)
  const messages = []
  const unsubscribe = onSaveIssue((m) => messages.push(m))
  updateOfficeReport('行橋営業所', (r) => ({ ...r, repNames: ['山田'] }))
  unsubscribe()
  assert.equal(messages.length, 1)
  assert.match(messages[0], /保存に失敗/)
})

test('保存データが破損していても自動初期化せず、破損データを別キーへ保全する', () => {
  freshStorage()
  globalThis.localStorage.setItem('taiyo-sales-report-v1', '{壊れたJSON')
  const messages = []
  const unsubscribe = onSaveIssue((m) => messages.push(m))
  // 行橋営業所は初期シードを持つため、シードの有無に依存しない営業所で検証する
  const report = getOfficeReport('小倉営業所')
  unsubscribe()

  // 初期状態から開始はするが、通知される
  assert.deepEqual(report.repNames, [])
  assert.equal(messages.length, 1)
  assert.match(messages[0], /読み込みに失敗/)

  // 破損データがどこかへ退避されている（消えていない）
  const keys = [...globalThis.localStorage._store.keys()]
  const backupKey = keys.find((k) => k.startsWith('taiyo-sales-report-v1_corrupted_'))
  assert.ok(backupKey, '破損データの退避キーが見つからない: ' + JSON.stringify(keys))
  assert.equal(globalThis.localStorage.getItem(backupKey), '{壊れたJSON')
})

test('正常なデータの読み込みでは通知されない', () => {
  freshStorage()
  const messages = []
  const unsubscribe = onSaveIssue((m) => messages.push(m))
  const report = getOfficeReport('小倉営業所')
  unsubscribe()
  assert.deepEqual(messages, [])
  assert.deepEqual(report.repNames, [])
})
