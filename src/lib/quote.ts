import { site } from '../config/site.ts'
import { catalogById, extraById } from '../data/catalog.ts'
import { deliveryZoneById, matchDeliveryZone } from '../data/delivery.ts'
import { formatNaira } from './format.ts'
import type { OrderDetails } from './order.ts'

const MAX_QTY = 20
const MAX_LINES = 30

export interface QuoteLine {
  itemId: string
  extras: string[]
  qty: number
  name: string
  unitPrice: number
  lineTotal: number
}

export interface QuotedOrder {
  lines: QuoteLine[]
  details: OrderDetails
  zoneName: string
  subtotal: number
  deliveryFee: number
  total: number
  /** What Paystack charges, in kobo. */
  amountKobo: number
  summary: string
}

export function describeLine(itemId: string, extras: string[]): string {
  const item = catalogById[itemId]
  const name = item?.category === 'street-burgers' ? `${item.name} Street Burger` : (item?.name ?? itemId)
  if (extras.length === 0) return name
  return `${name} (+ ${extras.map((id) => extraById[id]?.name ?? id).join(', ')})`
}

function cleanText(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, max)
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 80
}

function phoneDigits(value: string): string {
  return value.replace(/\D/g, '')
}

function deliveryFeeFor(details: OrderDetails): number {
  if (details.fulfilment !== 'delivery') return 0
  return deliveryZoneById[details.zone]?.fee ?? 0
}

/** Prices the bag from the menu. The client's own total is ignored. */
export function quoteOrder(input: unknown): { ok: true; order: QuotedOrder } | { ok: false; error: string } {
  if (!input || typeof input !== 'object') return { ok: false, error: 'The order could not be read.' }
  const body = input as { lines?: unknown; details?: unknown }
  if (!Array.isArray(body.lines)) return { ok: false, error: 'The bag is missing.' }
  if (body.lines.length > MAX_LINES) return { ok: false, error: 'That bag has too many different items.' }

  const lines: QuoteLine[] = []
  for (const raw of body.lines) {
    if (!raw || typeof raw !== 'object') return { ok: false, error: 'One of the items could not be read.' }
    const line = raw as { itemId?: unknown; extras?: unknown; qty?: unknown }
    if (typeof line.itemId !== 'string') return { ok: false, error: 'One of the items could not be read.' }
    const item = catalogById[line.itemId]
    if (!item) return { ok: false, error: 'One of the items is no longer on the menu.' }
    const qty = Math.floor(Number(line.qty))
    if (!Number.isFinite(qty) || qty < 1 || qty > MAX_QTY) return { ok: false, error: 'Check the quantity on each item.' }

    const extraIds = Array.isArray(line.extras)
      ? [...new Set(line.extras.filter((id): id is string => typeof id === 'string'))]
      : []
    if (extraIds.length > 0 && !item.allowExtras) return { ok: false, error: `${item.name} does not take extras.` }
    let extrasTotal = 0
    for (const id of extraIds) {
      const extra = extraById[id]
      if (!extra) return { ok: false, error: 'One of the extras is no longer on the menu.' }
      extrasTotal += extra.price
    }
    const unitPrice = item.price + extrasTotal
    lines.push({
      itemId: item.id,
      extras: extraIds,
      qty,
      name: describeLine(item.id, extraIds),
      unitPrice,
      lineTotal: unitPrice * qty,
    })
  }
  if (lines.length === 0) return { ok: false, error: 'Your bag is empty.' }

  const incoming = body.details && typeof body.details === 'object' ? (body.details as Partial<OrderDetails>) : {}
  const fulfilment = incoming.fulfilment === 'delivery' ? 'delivery' : incoming.fulfilment === 'pickup' ? 'pickup' : null
  if (!fulfilment) return { ok: false, error: 'Choose pickup or delivery.' }

  const details: OrderDetails = {
    name: cleanText(incoming.name, 80),
    email: cleanText(incoming.email, 80).toLowerCase(),
    phone: cleanText(incoming.phone, 20),
    fulfilment,
    zone: '',
    address: '',
    note: cleanText(incoming.note, 240),
  }
  if (details.name.length < 2) return { ok: false, error: 'Add your name so the crew knows who the order is for.' }
  if (!validEmail(details.email)) return { ok: false, error: 'Add an email so Paystack can send the receipt. This does not create an account.' }
  const digits = phoneDigits(details.phone)
  if (digits.length < 10 || digits.length > 15) return { ok: false, error: 'Add a phone number the crew can call about this order.' }

  let zoneName = ''
  if (fulfilment === 'delivery') {
    details.address = cleanText(incoming.address, 240)
    if (details.address.length < 6) return { ok: false, error: 'Add a delivery address with a street and a landmark.' }
    const fromAddress = matchDeliveryZone(details.address)
    const chosen = typeof incoming.zone === 'string' ? deliveryZoneById[incoming.zone] : undefined
    const zone = fromAddress ?? chosen
    if (!zone) return { ok: false, error: 'Add the area, like Akoka, Yaba, Ikeja or Lekki, so we can set the delivery fee.' }
    details.zone = zone.id
    zoneName = zone.name
  }

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0)
  const deliveryFee = deliveryFeeFor(details)
  const total = subtotal + deliveryFee
  const summary = lines.map((line) => `${line.qty}x ${line.name} — ${formatNaira(line.lineTotal)}`).join('\n')

  return {
    ok: true,
    order: {
      lines,
      details,
      zoneName,
      subtotal,
      deliveryFee,
      total,
      amountKobo: total * 100,
      summary,
    },
  }
}

export function fulfilmentLabel(order: QuotedOrder): string {
  if (order.details.fulfilment === 'pickup') return `Pickup at ${site.address.line1}, ${site.address.area}`
  return `Delivery · ${order.zoneName} · ${order.details.address}`
}
