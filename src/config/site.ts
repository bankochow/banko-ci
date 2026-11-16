/**
 * Single source of truth for business details shown across web, iOS and Android.
 * Update here and every surface (header, footer, order flow, Find Us) follows.
 */
const mainTag = 'No. 1 Street Burger in Lagos!'

export const site = {
  name: 'Banko Chow',
  /** The client's main line. This is the caption that leads everywhere else. */
  tagline: mainTag,
  description:
    'Street food with a classy twist. Born in the streets, inspired by culture, and driven by flavour. Real food, fast.',

  /** Public order line printed on the menu. */
  phoneDisplay: '0907 701 5352',
  phoneTel: '+2349077015352',
  /** International format without "+" — required by wa.me links. */
  whatsapp: '2349077015352',

  instagram: 'bankochow',
  instagramUrl: 'https://instagram.com/bankochow',
  /** Public site. The native apps send checkout here. */
  webOrigin: 'https://bankochow.com',
  /** Android app on Google Play. The iOS listing is not up yet. */
  playStoreUrl: 'https://play.google.com/store/apps/details?id=com.bankochow.app',
  /** The line on the Instagram bio. Same as the main tag. */
  instagramBio: mainTag,

  address: {
    line1: '48 Abiodun Street',
    area: 'Shomolu',
    city: 'Lagos',
    country: 'Nigeria',
  },
  mapsQuery: '48 Abiodun Street, Shomolu, Lagos, Nigeria',

  /** Weekly hours. Sunday is pre-order, not walk-in. */
  hours: [
    { days: 'Monday to Saturday', time: '10am to 7pm' },
    { days: 'Sunday', time: 'Pre-orders only' },
  ],
  /** Kitchen time after payment. Pickup and the rider both wait on this. */
  prepNote: 'Ready in 30 minutes to an hour. Pickup and the rider both start after that.',

  /** CAC business name (BN) registration number. */
  registrationNumber: 'BN 9160362',

  community: 'Chow Nation',
  crew: 'The Street Chow Crew',

  slang: [
    'No. 1 Street Burger in Lagos!',
    'Street has entered fine dining.',
    'This one no dey for traffic.',
    'Burger wey sabi.',
    'For mouth wey sabi taste.',
    'Omo, this thing sweet die.',
    'Street ti take over!',
  ],
} as const

/** One sentence for tight spots. The rows above are the schedule itself. */
export function hoursSummary(): string {
  const [week, sunday] = site.hours
  const sundayTime = sunday.time.charAt(0).toLowerCase() + sunday.time.slice(1)
  return `${week.days}, ${week.time}. ${sunday.days}, ${sundayTime}.`
}

export const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.mapsQuery)}`
export const mapsEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(site.mapsQuery)}&z=16&output=embed`
export const whatsappUrl = (text?: string) =>
  `https://wa.me/${site.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`
export const telUrl = `tel:${site.phoneTel}`
