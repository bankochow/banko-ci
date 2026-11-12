import assert from 'node:assert/strict'
import test from 'node:test'
import { paidBagMessage, paidBagWhatsappUrl } from '../src/lib/paid-bag.ts'
import type { OrderDetails } from '../src/lib/order.ts'

const details: OrderDetails = {
  name: 'Ada',
  email: 'ada@example.com',
  phone: '08030000000',
  fulfilment: 'delivery',
  zone: 'mainland',
  address: '12 Bode Thomas, Surulere',
  note: 'No onions',
}

test('a paid bag is addressed to the shop WhatsApp and says it is already paid', () => {
  const order = {
    reference: 'bc_testref',
    total: 7500,
    summary: '1x Mainland Street Burger — ₦6,000',
    details,
    zoneName: 'Lagos Mainland',
  }
  const message = paidBagMessage(order)
  assert.ok(message)
  assert.match(message, /^PAID on Paystack/)
  assert.match(message, /Ref: bc_testref/)
  assert.match(message, /Phone: 08030000000/)
  assert.match(message, /No onions/)
  assert.match(message, /Total paid:/)
  assert.doesNotMatch(message, /ada@example.com/)

  const url = paidBagWhatsappUrl(order)
  assert.ok(url)
  assert.match(url, /^https:\/\/wa\.me\/2349077015352\?text=/)
  assert.match(decodeURIComponent(url), /PAID on Paystack/)
})

test('an unpaid or incomplete bag does not open WhatsApp', () => {
  assert.equal(paidBagWhatsappUrl({ reference: 'bc_testref', total: 5000, summary: '', details }), null)
  assert.equal(paidBagWhatsappUrl({ reference: 'bc_testref', summary: '1x Fries — ₦3,500', details }), null)
  assert.equal(
    paidBagWhatsappUrl({ reference: 'bc_testref', total: 5000, summary: '1x Fries — ₦3,500', details: { ...details, phone: '' } }),
    null,
  )
})
