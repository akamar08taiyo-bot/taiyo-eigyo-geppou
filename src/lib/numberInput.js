// 月報の数値入力（訪問件数・千円単位の金額・目標値）の共通パーサ。
//
// 指示書 COMMON-02 / GEPP-14 に対応。
// - 負数・小数・非数・無限大・桁超過を「保存しない」（黙って0や別の値に変えない）
// - 入力途中の空欄はここでは扱わない（呼び出し側が draft として保持する）

// 千円単位で約100億円まで。実務上ありえない桁数の誤入力を止めるための上限。
export const MAX_REPORT_VALUE = 9999999

/**
 * 入力文字列を「0以上の整数」として解釈する。
 * 解釈できない、または範囲外のときは null を返す（＝保存しない）。
 */
export function parseCount(input, { min = 0, max = MAX_REPORT_VALUE } = {}) {
  if (typeof input === 'number') return checkRange(input, min, max)
  if (typeof input !== 'string') return null
  const trimmed = input.trim()
  if (trimmed === '') return null
  // 全角数字と桁区切りを吸収する（全角マイナスはそのまま残して負数として弾く）
  const normalized = trimmed
    .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/[，,]/g, '')
    .replace(/[－ー−]/g, '-')
  if (!/^-?\d+$/.test(normalized)) return null // 小数・指数表記・文字混じりを拒否
  return checkRange(Number(normalized), min, max)
}

function checkRange(value, min, max) {
  if (!Number.isFinite(value) || !Number.isInteger(value)) return null
  if (value < min) return null
  if (max != null && value > max) return null
  return value
}
