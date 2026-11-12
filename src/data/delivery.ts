/**
 * Delivery zones from 48 Abiodun Street, Shomolu. One motorcycle, one bag.
 *
 * A courier volumetric weight, a per-kilo adder and a waiting-time meter do not
 * belong on a burger order. The fee covers the ride out and the empty ride home.
 *
 *   ₦140 per km operating cost (midpoint of a ₦130–₦150 Lagos bike estimate)
 *   × 2 for the return
 *   = ₦280 per delivered kilometre
 *   × 1.15 so a fuel jump does not wipe the trip
 *   The client’s base fare is ₦1,900. A short ride never costs less than that.
 *   A longer ride is the kilometre sum, rounded up to the next ₦500.
 *
 *   3 km  → ₦966  → ₦1,900 base fare
 *   7 km  → ₦2,254 → ₦2,500
 *  12 km  → ₦3,864 → ₦4,000
 *  20 km  → ₦6,440 → ₦6,500
 */
export interface DeliveryZone {
  id: string
  name: string
  hint: string
  /** Planning distance from the shop, in kilometres. */
  km: number
  fee: number
  /** Area and street names that mean this zone. Matched as whole words. */
  places: readonly string[]
}

/** What the rider is paid to start, before a longer ride adds distance. */
export const DELIVERY_BASE_FARE = 1900

const NAIRA_PER_DELIVERED_KM = 140 * 2 * 1.15

export function deliveryFeeForKm(km: number): number {
  const ride = km * NAIRA_PER_DELIVERED_KM
  if (ride <= DELIVERY_BASE_FARE) return DELIVERY_BASE_FARE
  return Math.ceil(ride / 500) * 500
}

export const deliveryZones: DeliveryZone[] = [
  {
    id: 'shomolu',
    name: 'Shomolu & Bariga',
    hint: 'Shomolu, Bariga, Akoka, Pedro, Onipanu',
    km: 3,
    fee: deliveryFeeForKm(3),
    places: [
      'shomolu',
      'somolu',
      'bariga',
      'akoka',
      'pedro',
      'onipanu',
      'bajulaiye',
      'bajulaye',
      'abule oja',
      'igbobi',
      'unilag',
      'university of lagos',
      'finbarr',
      'oworonshoki',
      'oworonsoki',
      'ilaje',
    ],
  },
  {
    id: 'yaba',
    name: 'Yaba & Gbagada',
    hint: 'Yaba, Fadeyi, Palmgrove, Gbagada, Anthony',
    km: 7,
    fee: deliveryFeeForKm(7),
    places: [
      'yaba',
      'fadeyi',
      'palmgrove',
      'palm grove',
      'gbagada',
      'anthony',
      'tejuosho',
      'alagomeji',
      'jibowu',
      'iwaya',
      'onike',
      'makoko',
      'ebute metta',
      'yabatech',
      'yaba tech',
      'sabo',
      'adekunle',
    ],
  },
  {
    id: 'mainland',
    name: 'Wider Mainland',
    hint: 'Ikeja, Maryland, Ogudu, Surulere, Mushin',
    km: 12,
    fee: deliveryFeeForKm(12),
    places: [
      'ikeja',
      'maryland',
      'ogudu',
      'surulere',
      'mushin',
      'allen avenue',
      'allen',
      'opebi',
      'alausa',
      'oregun',
      'ojota',
      'ketu',
      'mile 12',
      'magodo',
      'ilupeju',
      'oshodi',
      'isolo',
      'okota',
      'ejigbo',
      'ikotun',
      'egbeda',
      'idimu',
      'abule egba',
      'ogba',
      'agege',
      'dopemu',
      'ojodu',
      'berger',
      'ilasamaja',
      'lawanson',
      'itire',
      'ojuelegba',
      'adeniran ogunsanya',
      'bode thomas',
      'aguda',
      'ijeshatedo',
      'papa ajao',
      'apapa',
      'festac',
      'amuwo',
      'mile 2',
      'onigbongbo',
      'mende',
      'shonibare',
    ],
  },
  {
    id: 'island',
    name: 'Island & Lekki',
    hint: 'Victoria Island, Ikoyi, Lekki, Ajah',
    km: 20,
    fee: deliveryFeeForKm(20),
    places: [
      'victoria island',
      'ikoyi',
      'lekki',
      'ajah',
      'oniru',
      'elegushi',
      'chevron',
      'vgc',
      'ikota',
      'jakande',
      'sangotedo',
      'abraham adesanya',
      'admiralty',
      'banana island',
      'parkview',
      'dolphin',
      'obalende',
      'lagos island',
      'idumota',
      'marina',
      'onikan',
      'ozumba',
      'ikate',
      'agungi',
      'osapa',
      'badore',
      'awoyaya',
      'lakowe',
      'ibeju',
      'epe',
      'vi',
      'v i',
      'cms',
    ],
  },
]

export const deliveryZoneById: Record<string, DeliveryZone> = Object.fromEntries(
  deliveryZones.map((zone) => [zone.id, zone]),
)

export const startingDeliveryFee = Math.min(...deliveryZones.map((zone) => zone.fee))

function normalizeAddress(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/ +/g, ' ')
}

/** The zone named in an address. The area written last wins, so "Akoka, then Yaba" is Yaba. */
export function matchDeliveryZone(address: string): DeliveryZone | undefined {
  const hay = normalizeAddress(address)
  if (hay.length < 3) return undefined
  const padded = ` ${hay} `
  let best: { zone: DeliveryZone; at: number; length: number } | undefined
  for (const zone of deliveryZones) {
    for (const place of zone.places) {
      const needle = ` ${normalizeAddress(place)} `
      if (needle.trim().length < 2) continue
      const at = padded.indexOf(needle)
      if (at < 0) continue
      const length = needle.length
      if (!best || at > best.at || (at === best.at && length > best.length)) {
        best = { zone, at, length }
      }
    }
  }
  return best?.zone
}
