import { fulfilmentLabel, type QuotedOrder } from '../lib/quote.ts'

const PAYSTACK = 'https://api.paystack.co'

export interface PaystackTransaction {
  status: string
  amount: number
  currency: string
  reference: string
  paidAt: string | null
  email: string
  metadata: unknown
}

interface PaystackEnvelope {
  status?: boolean
  message?: string
  data?: {
    authorization_url?: string
    reference?: string
    status?: string
    amount?: number
    currency?: string
    paid_at?: string | null
    metadata?: unknown
    customer?: { email?: string }
  }
}

export function orderMetadata(order: QuotedOrder): Record<string, unknown> {
  const fulfilment = fulfilmentLabel(order)
  const fields = [
    { display_name: 'Customer', variable_name: 'customer_name', value: order.details.name },
    { display_name: 'Phone', variable_name: 'phone', value: order.details.phone },
    { display_name: 'Fulfilment', variable_name: 'fulfilment', value: fulfilment.slice(0, 200) },
    { display_name: 'Order', variable_name: 'order_summary', value: order.summary.slice(0, 200) },
  ]
  if (order.details.note) {
    fields.push({ display_name: 'Note', variable_name: 'kitchen_note', value: order.details.note.slice(0, 200) })
  }
  return {
    custom_fields: fields,
    summary: order.summary,
    order: {
      lines: order.lines.map(({ itemId, extras, qty }) => ({ itemId, extras, qty })),
      details: order.details,
    },
  }
}

export async function initializeTransaction(
  secret: string,
  order: QuotedOrder,
  reference: string,
  callbackUrl: string,
): Promise<{ authorizationUrl: string; reference: string }> {
  const response = await fetch(`${PAYSTACK}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: order.details.email,
      amount: order.amountKobo,
      currency: 'NGN',
      reference,
      callback_url: callbackUrl,
      metadata: orderMetadata(order),
    }),
  })
  const body = (await response.json().catch(() => null)) as PaystackEnvelope | null
  const authorizationUrl = body?.data?.authorization_url
  const returnedReference = body?.data?.reference
  if (!response.ok || !body?.status || !authorizationUrl || !returnedReference) {
    throw new Error(body?.message || 'Paystack could not start the payment.')
  }
  return { authorizationUrl, reference: returnedReference }
}

export async function verifyTransaction(secret: string, reference: string): Promise<PaystackTransaction> {
  const response = await fetch(`${PAYSTACK}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  })
  const body = (await response.json().catch(() => null)) as PaystackEnvelope | null
  const data = body?.data
  if (!response.ok || !body?.status || !data?.reference || typeof data.amount !== 'number') {
    throw new Error(body?.message || 'Paystack could not confirm the payment.')
  }
  return {
    status: data.status ?? 'unknown',
    amount: data.amount,
    currency: data.currency ?? '',
    reference: data.reference,
    paidAt: data.paid_at ?? null,
    email: data.customer?.email ?? '',
    metadata: data.metadata ?? null,
  }
}

export async function paystackSignature(secret: string, rawBody: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
  return [...new Uint8Array(mac)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function signaturesMatch(expected: string, received: string): boolean {
  const left = expected.trim().toLowerCase()
  const right = received.trim().toLowerCase()
  if (left.length !== right.length) return false
  let mismatch = 0
  for (let i = 0; i < left.length; i++) mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i)
  return mismatch === 0
}
