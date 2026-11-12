import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { apiUrl } from '../src/lib/api-url.ts'
import { quoteOrder } from '../src/lib/quote.ts'
import { handleCheckout, handleVerify, handleWebhook, metadataFor } from '../src/server/api.ts'
import { paystackSignature, signaturesMatch } from '../src/server/paystack.ts'

const customer = {
  name: 'Ada Chow',
  email: 'Ada@Example.com',
  phone: '0803 000 0000',
  note: 'Extra pepper',
}

describe('quoteOrder', () => {
  test('prices a pickup from the menu and ignores a client total', () => {
    const quoted = quoteOrder({
      total: 1,
      lines: [{ itemId: 'mainland', extras: ['cheese'], qty: 2, price: 1 }],
      details: { ...customer, fulfilment: 'pickup', zone: 'island', address: 'should be ignored' },
    })
    assert.equal(quoted.ok, true)
    if (!quoted.ok) return
    assert.equal(quoted.order.subtotal, 12000)
    assert.equal(quoted.order.deliveryFee, 0)
    assert.equal(quoted.order.total, 12000)
    assert.equal(quoted.order.amountKobo, 1_200_000)
    assert.equal(quoted.order.details.email, 'ada@example.com')
    assert.equal(quoted.order.details.address, '')
    assert.equal(quoted.order.lines[0]?.name, 'Mainland Street Burger (+ Cheese)')
  })

  test('adds the delivery zone fee', () => {
    const quoted = quoteOrder({
      lines: [{ itemId: 'zobo', extras: [], qty: 1 }],
      details: { ...customer, fulfilment: 'delivery', zone: 'shomolu', address: '12 Bajulaiye Road, Shomolu' },
    })
    assert.equal(quoted.ok, true)
    if (!quoted.ok) return
    assert.equal(quoted.order.subtotal, 1500)
    assert.equal(quoted.order.deliveryFee, 1900)
    assert.equal(quoted.order.total, 3400)
    assert.match(quoted.order.summary, /1x Zobo/)
  })

  test('rejects extras on items that do not take them', () => {
    const quoted = quoteOrder({
      lines: [{ itemId: 'fries', extras: ['cheese'], qty: 1 }],
      details: { ...customer, fulfilment: 'pickup' },
    })
    assert.equal(quoted.ok, false)
  })

  test('asks for an email without creating an account', () => {
    const quoted = quoteOrder({
      lines: [{ itemId: 'mainland', extras: [], qty: 1 }],
      details: { ...customer, email: 'not-an-email', fulfilment: 'pickup' },
    })
    assert.equal(quoted.ok, false)
    if (quoted.ok) return
    assert.match(quoted.error, /does not create an account/)
  })

  test('requires a delivery address', () => {
    const quoted = quoteOrder({
      lines: [{ itemId: 'mainland', extras: [], qty: 1 }],
      details: { ...customer, fulfilment: 'delivery', zone: 'yaba', address: 'Yaba' },
    })
    assert.equal(quoted.ok, false)
  })
})

describe('checkout api', () => {
  const order = {
    lines: [{ itemId: 'mainland', extras: ['sausage'], qty: 1 }],
    details: { ...customer, fulfilment: 'delivery', zone: 'shomolu', address: '12 Bajulaiye Road, opposite the station' },
  }

  test('mock checkout then verify returns the priced order', async () => {
    const started = await handleCheckout(
      new Request('http://localhost:5173/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...order, total: 50 }),
      }),
      { mockPayments: true },
    )
    assert.equal(started.status, 200)
    const body = (await started.json()) as { authorizationUrl: string; reference: string; total: number }
    assert.equal(body.total, 7900)
    assert.match(body.authorizationUrl, /^http:\/\/localhost:5173\/order\/paid\?reference=mock_/)

    const verified = await handleVerify(new Request(body.authorizationUrl.replace('/order/paid', '/api/orders/verify')), {
      mockPayments: true,
    })
    assert.equal(verified.status, 200)
    const paid = (await verified.json()) as { status: string; total: number; details: { email: string }; summary: string }
    assert.equal(paid.status, 'success')
    assert.equal(paid.total, 7900)
    assert.equal(paid.details.email, 'ada@example.com')
    assert.match(paid.summary, /Mainland Street Burger \(\+ Sausage\)/)
  })

  test('live checkout charges the menu total and verify reads the order back', async () => {
    const original = globalThis.fetch
    let sent: { amount?: number; email?: string; reference?: string; callback_url?: string; metadata?: unknown } = {}
    globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
      const href = String(url)
      if (href.endsWith('/transaction/initialize')) {
        sent = JSON.parse(String(init?.body))
        return new Response(
          JSON.stringify({
            status: true,
            data: { authorization_url: 'https://checkout.paystack.com/abc', reference: sent.reference },
          }),
        )
      }
      if (href.includes('/transaction/verify/')) {
        return new Response(
          JSON.stringify({
            status: true,
            data: {
              status: 'success',
              amount: sent.amount,
              currency: 'NGN',
              reference: sent.reference,
              paid_at: '2026-11-09T05:00:00.000Z',
              metadata: sent.metadata,
              customer: { email: sent.email },
            },
          }),
        )
      }
      throw new Error(`Unexpected ${href}`)
    }) as typeof fetch
    try {
      const started = await handleCheckout(
        new Request('https://bankochow.com/api/checkout', { method: 'POST', body: JSON.stringify({ ...order, total: 50 }) }),
        { PAYSTACK_SECRET_KEY: 'sk_test_example' },
      )
      assert.equal(started.status, 200)
      const body = (await started.json()) as { total: number; reference: string; authorizationUrl: string }
      assert.equal(body.total, 7900)
      assert.equal(sent.amount, 790_000)
      assert.equal(sent.email, 'ada@example.com')
      assert.equal(sent.callback_url, 'https://bankochow.com/order/paid')
      assert.equal(body.authorizationUrl, 'https://checkout.paystack.com/abc')

      const verified = await handleVerify(
        new Request(`https://bankochow.com/api/orders/verify?reference=${body.reference}`),
        { PAYSTACK_SECRET_KEY: 'sk_test_example' },
      )
      assert.equal(verified.status, 200)
      const paid = (await verified.json()) as { status: string; total: number; summary: string; details: { address: string } }
      assert.equal(paid.status, 'success')
      assert.equal(paid.total, 7900)
      assert.match(paid.summary, /Mainland Street Burger \(\+ Sausage\)/)
      assert.match(paid.details.address, /Bajulaiye/)
    } finally {
      globalThis.fetch = original
    }
  })

  test('the iOS and Android apps can call the same checkout', async () => {
    const preflight = await handleCheckout(
      new Request('https://bankochow.com/api/checkout', {
        method: 'OPTIONS',
        headers: { origin: 'capacitor://localhost', 'access-control-request-method': 'POST' },
      }),
      {},
    )
    assert.equal(preflight.status, 204)
    assert.equal(preflight.headers.get('access-control-allow-origin'), 'capacitor://localhost')

    const started = await handleCheckout(
      new Request('https://bankochow.com/api/checkout', {
        method: 'POST',
        headers: { origin: 'http://localhost', 'content-type': 'application/json' },
        body: JSON.stringify(order),
      }),
      { mockPayments: true },
    )
    assert.equal(started.status, 200)
    assert.equal(started.headers.get('access-control-allow-origin'), 'http://localhost')
    assert.equal(apiUrl('/api/checkout', true), 'https://bankochow.com/api/checkout')
    assert.equal(apiUrl('/api/orders/verify?reference=bc_123', false), '/api/orders/verify?reference=bc_123')
  })

  test('a missing live key does not pretend to take payment', async () => {
    const response = await handleCheckout(
      new Request('https://bankochow.com/api/checkout', {
        method: 'POST',
        body: JSON.stringify(order),
      }),
      {},
    )
    assert.equal(response.status, 503)
  })

  test('rejects a checkout that did not come from the public site', async () => {
    const response = await handleCheckout(
      new Request('https://evil.example/api/checkout', {
        method: 'POST',
        body: JSON.stringify(order),
      }),
      { PAYSTACK_SECRET_KEY: 'sk_test_example', mockPayments: false },
    )
    assert.equal(response.status, 400)
  })

  test('webhook rejects a bad signature and accepts a good one', async () => {
    const secret = 'sk_test_example'
    const raw = JSON.stringify({ event: 'charge.failed', data: { reference: 'bc_test' } })
    const bad = await handleWebhook(
      new Request('https://bankochow.com/api/paystack/webhook', {
        method: 'POST',
        headers: { 'x-paystack-signature': 'nope' },
        body: raw,
      }),
      { PAYSTACK_SECRET_KEY: secret },
    )
    assert.equal(bad.status, 401)

    const signature = await paystackSignature(secret, raw)
    assert.equal(signaturesMatch(signature, signature.toUpperCase()), true)
    const good = await handleWebhook(
      new Request('https://bankochow.com/api/paystack/webhook', {
        method: 'POST',
        headers: { 'x-paystack-signature': signature },
        body: raw,
      }),
      { PAYSTACK_SECRET_KEY: secret },
    )
    assert.equal(good.status, 200)
  })

  test('the Paystack ticket includes the phone and the order', () => {
    const quoted = quoteOrder(order)
    assert.equal(quoted.ok, true)
    if (!quoted.ok) return
    const metadata = metadataFor(quoted.order) as {
      custom_fields: Array<{ variable_name: string; value: string }>
      summary: string
    }
    const phone = metadata.custom_fields.find((field) => field.variable_name === 'phone')
    const fulfilment = metadata.custom_fields.find((field) => field.variable_name === 'fulfilment')
    assert.equal(phone?.value, '0803 000 0000')
    assert.match(fulfilment?.value ?? '', /Delivery/)
    assert.match(metadata.summary, /Mainland Street Burger/)
  })
})
