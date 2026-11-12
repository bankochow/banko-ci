import { site, whatsappUrl } from '../config/site.ts'
import { formatNaira } from './format.ts'
import type { OrderDetails } from './order.ts'

export interface PaidBag {
  reference?: string
  total?: number
  summary?: string
  details?: OrderDetails
  zoneName?: string
}

/** The number the customer typed. A paid bag does not go out without one. */
function buyerPhone(phone: string | undefined): string | null {
  const trimmed = phone?.trim() ?? ''
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length < 10 || digits.length > 15) return null
  return trimmed
}

/** The message the crew gets on the shop WhatsApp after Paystack has taken the money. */
export function paidBagMessage(order: PaidBag): string | null {
  const details = order.details
  const summary = order.summary?.trim()
  const phone = buyerPhone(details?.phone)
  if (!details || !summary || !phone || !order.reference || typeof order.total !== 'number') return null

  const where =
    details.fulfilment === 'delivery'
      ? `Delivery — ${order.zoneName || 'area not set'}\n${details.address}`
      : `Pickup — ${site.address.line1}, ${site.address.area}`

  const lines = ['PAID on Paystack', `Ref: ${order.reference}`, details.name.trim(), `Phone: ${phone}`, '', summary, '', where]
  if (details.note) lines.push('', `Note: ${details.note}`)
  lines.push('', `Total paid: ${formatNaira(order.total)}`)
  return lines.join('\n')
}

export function paidBagWhatsappUrl(order: PaidBag): string | null {
  const message = paidBagMessage(order)
  return message ? whatsappUrl(message) : null
}
