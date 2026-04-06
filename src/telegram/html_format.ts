/** Telegram Bot API HTML mode — escape text outside tags. */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Inline monospace “quoted” number or token (Telegram <code>). */
export function codeHtml(value: string | number): string {
  return `<code>${escapeHtml(String(value))}</code>`;
}

/** One ticket row: numbers as spaced <code> blocks (e.g. 7 · 14 · …). */
export function formatNumbersRowHtml(nums: readonly number[]): string {
  return nums.map((n) => codeHtml(n)).join(" · ");
}

/** One ticket row with matched numbers highlighted in bold + code. */
export function formatMatchedNumbersRowHtml(
  nums: readonly number[],
  winningNumbers: readonly number[],
): string {
  const winningSet = new Set(winningNumbers);
  return nums
    .map((n) => {
      const formattedNumber = codeHtml(n);
      return winningSet.has(n) ? `<b>${formattedNumber}</b>` : formattedNumber;
    })
    .join(" · ");
}

/** Winning numbers as a vertical bullet list (one <code> per line). */
export function formatWinningNumbersListHtml(nums: readonly number[]): string {
  return nums.map((n) => `• ${codeHtml(n)}`).join("\n");
}
