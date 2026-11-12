/**
 * Menu prices and names, with no images attached.
 * The website and the Paystack function both price an order from this file,
 * so a customer cannot send their own total.
 */
export type CategoryId = 'street-burgers' | 'chop-life' | 'drinks' | 'extras' | 'faaji'

export interface CatalogItem {
  id: string
  category: CategoryId
  name: string
  tagline: string
  description: string
  ingredients: string[]
  /** Price in Naira. */
  price: number
  badge?: string
  /** Whether sausage or cheese can be added. */
  allowExtras?: boolean
}

export interface CatalogExtra {
  id: string
  name: string
  price: number
}

export const extras: CatalogExtra[] = [
  { id: 'sausage', name: 'Sausage', price: 1000 },
  { id: 'cheese', name: 'Cheese', price: 1000 },
]

export const catalog: CatalogItem[] = [
  {
    id: 'mainland',
    category: 'street-burgers',
    name: 'Mainland',
    tagline: 'Suya wey dey burst brain.',
    description:
      'Smoky ram suya tucked into soft, toasted Agege bread with crisp lettuce, fresh tomatoes and a generous run of Banko special sauce.',
    ingredients: ['Agege bread', 'Ram suya', 'Lettuce', 'Tomatoes', 'Banko special sauce'],
    price: 5000,
    badge: 'Best seller',
    allowExtras: true,
  },
  {
    id: 'island',
    category: 'street-burgers',
    name: 'Island',
    tagline: 'Perfectly spiced, properly stacked.',
    description:
      'Shredded, perfectly spiced chicken on toasted Agege bread, layered with lettuce, tomatoes and Banko special sauce.',
    ingredients: ['Agege bread', 'Shredded chicken', 'Lettuce', 'Tomatoes', 'Banko special sauce'],
    price: 5500,
    allowExtras: true,
  },
  {
    id: 'linkbridge',
    category: 'street-burgers',
    name: 'Linkbridge',
    tagline: 'Mainland meets Island.',
    description:
      'The best of both sides in one bun: ram suya and shredded chicken together with lettuce, tomatoes and Banko special sauce.',
    ingredients: ['Agege bread', 'Ram suya', 'Shredded chicken', 'Lettuce', 'Tomatoes', 'Banko special sauce'],
    price: 6000,
    badge: 'Loaded',
    allowExtras: true,
  },
  {
    id: 'chop-life-combo',
    category: 'chop-life',
    name: 'Chop Life Combo',
    tagline: 'The full plate.',
    description: 'A Street Burger with fries, four chicken wings and a drink.',
    ingredients: ['Street Burger', 'Fries', 'Chicken wings (4 pcs)', 'Drink'],
    price: 15000,
    badge: 'New',
  },
  {
    id: 'chop-life-mini',
    category: 'chop-life',
    name: 'Chop Life Mini',
    tagline: 'Wings, fries and a drink.',
    description: 'Fries, four chicken wings and a drink. No burger required.',
    ingredients: ['Fries', 'Chicken wings (4 pcs)', 'Drink'],
    price: 9500,
    badge: 'New',
  },
  {
    id: 'zobo',
    category: 'drinks',
    name: 'Zobo',
    tagline: 'Zero added sugar. All the flavour.',
    description:
      'Freshly made zobo, served chilled and made with love and zero added sugar. Because you shouldn’t have to choose between taste and health.',
    ingredients: ['Hibiscus', 'Ginger', 'Pineapple', 'Cloves'],
    price: 1500,
    badge: 'Fresh daily',
  },
  {
    id: 'sausage',
    category: 'extras',
    name: 'Sausage',
    tagline: 'Add to any Street Burger.',
    description: 'A juicy sausage added to your Street Burger.',
    ingredients: ['Sausage'],
    price: 1000,
  },
  {
    id: 'cheese',
    category: 'extras',
    name: 'Cheese',
    tagline: 'Melted over the filling.',
    description: 'A slice of cheese melted over your filling.',
    ingredients: ['Cheese'],
    price: 1000,
  },
  {
    id: 'fries',
    category: 'extras',
    name: 'Fries',
    tagline: 'Golden, peppery, and made for sauce.',
    description: 'A portion of fries.',
    ingredients: ['Fries'],
    price: 3500,
    badge: 'New',
  },
  {
    id: 'wings-4',
    category: 'extras',
    name: 'Chicken Wings (4 pcs)',
    tagline: 'Crispy wings with a proper kick.',
    description: 'Four pieces of chicken wings.',
    ingredients: ['Chicken wings'],
    price: 6000,
    badge: 'New',
  },
  {
    id: 'wings-8',
    category: 'extras',
    name: 'Chicken Wings (8 pcs)',
    tagline: 'Double the wings.',
    description: 'Eight pieces of chicken wings.',
    ingredients: ['Chicken wings'],
    price: 11000,
    badge: 'New',
  },
  {
    id: 'sauce',
    category: 'extras',
    name: 'Banko Special Sauce',
    tagline: 'The sauce, on its own.',
    description: 'Banko special sauce.',
    ingredients: ['Banko special sauce'],
    price: 5000,
    badge: 'New',
  },
  {
    id: 'faaji-10',
    category: 'faaji',
    name: 'Faaji Box of 10',
    tagline: 'Box of 10.',
    description: 'A Faaji Box of 10.',
    ingredients: [],
    price: 25000,
    badge: 'New',
  },
  {
    id: 'faaji-20',
    category: 'faaji',
    name: 'Faaji Box of 20',
    tagline: 'Box of 20.',
    description: 'A Faaji Box of 20.',
    ingredients: [],
    price: 45000,
    badge: 'New',
  },
]

export const catalogById = Object.fromEntries(catalog.map((item) => [item.id, item])) as Record<string, CatalogItem>
export const extraById = Object.fromEntries(extras.map((extra) => [extra.id, extra])) as Record<string, CatalogExtra>
