const naira = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
})

/** Formats a Naira amount, e.g. 3500 -> "₦3,500". */
export function formatNaira(amount: number): string {
  return naira.format(amount).replace('NGN', '₦')
}

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
