import { quoteOrder, type QuotedOrder } from '../lib/quote.ts'
import { initializeTransaction, orderMetadata, paystackSignature, signaturesMatch, verifyTransaction } from './paystack.ts'

export interface CheckoutEnv {
  /** Paystack secret key, sk_test_… or sk_live_…. Never send this to the browser. */
  PAYSTACK_SECRET_KEY?: string
  /** Dev server only. Production functions leave this unset. */
  mockPayments?: boolean
}

const mockOrders = new Map<string, QuotedOrder>()

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })

/** The iOS and Android apps call this API from their own origin. The website is same-origin. */
function callerAllowed(origin: string): boolean {
  if (origin === 'https://bankochow.com' || origin === 'https://www.bankochow.com') return true
  if (origin === 'capacitor://localhost' || origin === 'http://localhost' || origin === 'https://localhost') return true
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
}

function applyCors(response: Response, request: Request): Response {
  const origin = request.headers.get('origin')
  if (!origin || !callerAllowed(origin)) return response
  const headers = new Headers(response.headers)
  headers.set('access-control-allow-origin', origin)
  headers.set('access-control-allow-methods', 'GET, POST, OPTIONS')
  headers.set('access-control-allow-headers', 'content-type')
  headers.set('vary', 'Origin')
  return new Response(response.body, { status: response.status, headers })
}

async function fromAppOrSite(request: Request, run: () => Promise<Response>): Promise<Response> {
  if (request.method === 'OPTIONS') return applyCors(new Response(null, { status: 204 }), request)
  return applyCors(await run(), request)
}

function publicOrigin(request: Request): string | null {
  const origin = new URL(request.url).origin
  if (origin === 'https://bankochow.com' || origin === 'https://www.bankochow.com') return origin
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin
  return null
}

function referenceToken(): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function orderFromMetadata(metadata: unknown): QuotedOrder | null {
  const record = typeof metadata === 'string' ? safeJson(metadata) : metadata
  if (!record || typeof record !== 'object') return null
  const order = (record as { order?: unknown }).order
  const quoted = quoteOrder(orderToInput(order))
  return quoted.ok ? quoted.order : null
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function orderToInput(order: unknown): unknown {
  if (!order || typeof order !== 'object') return null
  const quoted = order as Partial<QuotedOrder>
  return { lines: quoted.lines, details: quoted.details }
}

function paidBody(order: QuotedOrder, reference: string, paidAt: string | null) {
  return {
    status: 'success' as const,
    reference,
    paidAt,
    total: order.total,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    summary: order.summary,
    details: order.details,
    zoneName: order.zoneName,
  }
}

export function handleCheckout(request: Request, env: CheckoutEnv): Promise<Response> {
  return fromAppOrSite(request, () => checkout(request, env))
}

async function checkout(request: Request, env: CheckoutEnv): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405)
  const origin = publicOrigin(request)
  if (!origin) return json({ error: 'Checkout is only available on bankochow.com.' }, 400)

  const raw = await request.text()
  if (raw.length > 20_000) return json({ error: 'That order is too large.' }, 413)
  const quoted = quoteOrder(safeJson(raw))
  if (!quoted.ok) return json({ error: quoted.error }, 400)

  if (env.mockPayments && !env.PAYSTACK_SECRET_KEY) {
    const reference = `mock_${referenceToken()}`
    mockOrders.set(reference, quoted.order)
    return json({
      authorizationUrl: `${origin}/order/paid?reference=${reference}`,
      reference,
      total: quoted.order.total,
    })
  }

  const secret = env.PAYSTACK_SECRET_KEY
  if (!secret) {
    return json(
      { error: 'Card payment is not switched on yet. Call the shop and the crew will take the order.' },
      503,
    )
  }

  try {
    const started = await initializeTransaction(secret, quoted.order, `bc_${referenceToken()}`, `${origin}/order/paid`)
    return json({ authorizationUrl: started.authorizationUrl, reference: started.reference, total: quoted.order.total })
  } catch (error) {
    return json({ error: paystackProblem(error, 'Paystack could not start the payment. Nothing was charged.') }, 502)
  }
}

export function handleVerify(request: Request, env: CheckoutEnv): Promise<Response> {
  return fromAppOrSite(request, () => verify(request, env))
}

async function verify(request: Request, env: CheckoutEnv): Promise<Response> {
  if (request.method !== 'GET') return json({ error: 'Use GET.' }, 405)
  const reference = new URL(request.url).searchParams.get('reference')?.trim() ?? ''
  if (!/^[A-Za-z0-9_-]{6,100}$/.test(reference)) return json({ error: 'That payment reference is not valid.' }, 400)

  if (reference.startsWith('mock_')) {
    if (!env.mockPayments) return json({ error: 'That payment could not be found.' }, 404)
    const order = mockOrders.get(reference)
    if (!order) return json({ error: 'That payment could not be found.' }, 404)
    return json(paidBody(order, reference, new Date().toISOString()))
  }

  const secret = env.PAYSTACK_SECRET_KEY
  if (!secret) return json({ error: 'Card payment is not switched on yet.' }, 503)

  try {
    const transaction = await verifyTransaction(secret, reference)
    if (transaction.status !== 'success' || transaction.currency !== 'NGN') {
      return json({ status: transaction.status, reference, error: 'The payment was not completed.' }, 402)
    }
    const order = orderFromMetadata(transaction.metadata)
    if (!order || order.amountKobo !== transaction.amount) {
      return json({
        status: 'success',
        reference,
        paidAt: transaction.paidAt,
        total: transaction.amount / 100,
        email: transaction.email,
        summary: '',
        error: 'Payment was received. Call the shop with this reference so the crew can confirm the bag.',
      })
    }
    return json(paidBody(order, transaction.reference, transaction.paidAt))
  } catch (error) {
    return json({ error: paystackProblem(error, 'Paystack could not confirm the payment.') }, 502)
  }
}

function paystackProblem(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : fallback
  if (/key|secret|bearer|authori[sz]ation/i.test(message)) return fallback
  return message
}

export async function handleWebhook(request: Request, env: CheckoutEnv): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405)
  const secret = env.PAYSTACK_SECRET_KEY
  if (!secret) return json({ error: 'Card payment is not switched on yet.' }, 503)

  const raw = await request.text()
  const signature = request.headers.get('x-paystack-signature') ?? ''
  const expected = await paystackSignature(secret, raw)
  if (!signaturesMatch(expected, signature)) return json({ error: 'Invalid signature.' }, 401)

  const event = safeJson(raw) as { event?: string; data?: { reference?: string } } | null
  if (event?.event === 'charge.success' && event.data?.reference) {
    try {
      const transaction = await verifyTransaction(secret, event.data.reference)
      if (transaction.status !== 'success') return json({ error: 'Payment was not successful.' }, 409)
    } catch {
      return json({ error: 'Paystack could not confirm the payment.' }, 502)
    }
  }
  return json({ received: true })
}

/** Used by tests to confirm the ticket Paystack stores for the crew. */
export function metadataFor(order: QuotedOrder): Record<string, unknown> {
  return orderMetadata(order)
}
