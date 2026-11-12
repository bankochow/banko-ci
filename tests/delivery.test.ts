import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { deliveryFeeForKm, matchDeliveryZone, startingDeliveryFee } from '../src/data/delivery.ts'
import { quoteOrder } from '../src/lib/quote.ts'

describe('delivery fees', () => {
  test('the base fare is 1900 and longer rides round up to the next 500', () => {
    assert.equal(deliveryFeeForKm(3), 1900)
    assert.equal(deliveryFeeForKm(7), 2500)
    assert.equal(deliveryFeeForKm(12), 4000)
    assert.equal(deliveryFeeForKm(20), 6500)
    assert.equal(startingDeliveryFee, 1900)
  })

  test('an address picks its delivery area', () => {
    assert.equal(matchDeliveryZone('7, Church Street, Akoka')?.id, 'shomolu')
    assert.equal(matchDeliveryZone('12 Bajulaiye Road, opposite the station')?.id, 'shomolu')
    assert.equal(matchDeliveryZone('Herbert Macaulay Way, Yaba')?.id, 'yaba')
    assert.equal(matchDeliveryZone('Allen Avenue, Ikeja')?.id, 'mainland')
    assert.equal(matchDeliveryZone('10 Admiralty Way, Lekki Phase 1')?.id, 'island')
    assert.equal(matchDeliveryZone('near Shomolu, drop at Lekki')?.id, 'island')
    assert.equal(matchDeliveryZone('House 4'), undefined)
  })
})

describe('quote uses the address area', () => {
  const customer = {
    name: 'Ada Chow',
    email: 'ada@example.com',
    phone: '0803 000 0000',
    note: '',
  }

  test('Lekki in the address overrides a cheaper selected zone', () => {
    const quoted = quoteOrder({
      lines: [{ itemId: 'zobo', extras: [], qty: 1 }],
      details: { ...customer, fulfilment: 'delivery', zone: 'shomolu', address: '10 Admiralty Way, Lekki' },
    })
    assert.equal(quoted.ok, true)
    if (!quoted.ok) return
    assert.equal(quoted.order.details.zone, 'island')
    assert.equal(quoted.order.zoneName, 'Island & Lekki')
    assert.equal(quoted.order.deliveryFee, 6500)
  })

  test('Akoka is the Shomolu base fare', () => {
    const quoted = quoteOrder({
      lines: [{ itemId: 'zobo', extras: [], qty: 1 }],
      details: { ...customer, fulfilment: 'delivery', zone: 'island', address: '7 Church Street, Akoka' },
    })
    assert.equal(quoted.ok, true)
    if (!quoted.ok) return
    assert.equal(quoted.order.details.zone, 'shomolu')
    assert.equal(quoted.order.deliveryFee, 1900)
  })
})
