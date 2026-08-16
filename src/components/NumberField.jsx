import { useState } from 'react'
import { parseCount, MAX_REPORT_VALUE } from '../lib/numberInput.js'

// 月報の数値入力欄。
//
// 指示書 GEPP-14 に対応。
// 従来は onChange で毎回 Number(e.target.value) || 0 を確定していたため、
//  1. 数字を打ち替えようとして欄を空にすると即座に 0 に変わってしまい、
//  2. 負数や桁超過もそのまま保存されていた。
//
// 編集中は入力文字列を draft として保持し、妥当な値になったときだけ確定する。
// 不正な値のときは確定せず、入力文字列を残したままエラー表示にする
// （利用者が打ち直せるよう、入力を消さない）。
export function NumberField({
  value,
  onCommit,
  className,
  style,
  min = 0,
  max = MAX_REPORT_VALUE,
  ariaLabel,
}) {
  const [draft, setDraft] = useState(null) // null = 非編集中（確定値を表示）

  const isInvalid = draft !== null && draft !== '' && parseCount(draft, { min, max }) === null
  const shown = draft !== null ? draft : (Number.isFinite(value) ? String(value) : '')

  const invalidStyle = isInvalid ? { borderColor: '#dc2626', background: '#fef2f2' } : null

  return (
    <input
      type="number"
      min={min}
      max={max}
      step="1"
      className={className}
      style={{ ...style, ...invalidStyle }}
      value={shown}
      aria-label={ariaLabel}
      aria-invalid={isInvalid || undefined}
      title={isInvalid ? `0以上 ${max.toLocaleString('ja-JP')} 以下の整数を入力してください` : undefined}
      onChange={(event) => {
        const raw = event.target.value
        setDraft(raw)
        if (raw === '') return // 空欄の間は 0 に確定しない（打ち直しの途中）
        const parsed = parseCount(raw, { min, max })
        if (parsed !== null) onCommit(parsed)
      }}
      onBlur={() => {
        if (draft === '') {
          onCommit(0) // 空欄のまま欄を離れたときだけ 0 として確定する
          setDraft(null)
          return
        }
        // 不正な値は確定せず、入力文字列とエラー表示を残す
        if (draft === null || parseCount(draft, { min, max }) !== null) setDraft(null)
      }}
    />
  )
}
