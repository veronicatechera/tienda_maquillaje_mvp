export const CATEGORIES = ['Rostro', 'Ojos', 'Labios', 'Uñas', 'Accesorios', 'Cuidado facial', 'Otros']
export const DELIVERY = ['Retiro coordinado', 'Envío (coordinar costo)']
export const ORDER_STATUS = ['pendiente', 'confirmado', 'entregado', 'cancelado']

export const DEFAULT_SETTINGS = {
  name: 'Tienda de belleza',
  phone: '',
  tagline: 'Una tienda independiente de maquillaje.',
  location: 'Colonia · Uruguay',
  hero_image_url: null,
}

const fmt = new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU', maximumFractionDigits: 0 })
export const money = (n) => fmt.format(Number(n) || 0)

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

// localStorage puede no existir (modo privado, navegadores internos de apps): nunca debe romper la página.
export const store = {
  get(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key)
      return raw ? JSON.parse(raw) : fallback
    } catch {
      return fallback
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* ignorar */
    }
  },
}

export const onlyDigits = (s = '') => String(s).replace(/\D/g, '')

// Número uruguayo escrito como 099 123 456 → 59899123456
export function toWhatsAppNumber(raw = '') {
  const d = onlyDigits(raw)
  if (d.startsWith('598')) return d
  if (d.startsWith('0')) return '598' + d.slice(1)
  return d
}

export const whatsappLink = (phone, text) =>
  `https://wa.me/${onlyDigits(phone)}?text=${encodeURIComponent(text)}`

export function slugify(s) {
  return (
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'producto'
  )
}

export const shortId = (uuid = '') => uuid.slice(0, 8).toUpperCase()

// Color de la lámina de cada categoría mientras el producto no tiene foto.
export const CATEGORY_TONES = {
  Rostro: { bg: '#dcc9b9', fg: '#461e2b' },
  Ojos: { bg: '#461e2b', fg: '#f4efe8' },
  Labios: { bg: '#6b3345', fg: '#f4efe8' },
  Uñas: { bg: '#7a6169', fg: '#f4efe8' },
  Accesorios: { bg: '#171516', fg: '#dcc9b9' },
  'Cuidado facial': { bg: '#e9dfd7', fg: '#461e2b' },
  Otros: { bg: '#b89a83', fg: '#2b1119' },
}
