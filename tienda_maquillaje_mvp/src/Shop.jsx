import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import Cart from './Cart.jsx'
import { CATEGORIES, CATEGORY_TONES, money, plural, store } from './lib'

export default function Shop({ settings }) {
  const [products, setProducts] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [mode, setMode] = useState('')
  const [cart, setCart] = useState(() => store.get('beauty_cart', []))
  const [cartOpen, setCartOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('products')
      .select('id,name,brand,category,description,price,stock,mode,image_url')
      .order('created_at', { ascending: false })
    if (error) return setStatus('error')
    setProducts(data)
    setStatus('ready')
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => store.set('beauty_cart', cart), [cart])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 260)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const maxFor = (p) => (p.mode === 'stock' ? p.stock : 99)

  // Líneas válidas del carrito: producto existente, cantidad ajustada al stock.
  const lines = useMemo(() => {
    if (status !== 'ready') return []
    return cart
      .map((i) => {
        const product = products.find((p) => p.id === i.id)
        if (!product) return null
        const max = maxFor(product)
        const qty = Math.min(i.qty, max)
        return qty > 0 ? { product, qty, max } : null
      })
      .filter(Boolean)
  }, [cart, products, status])

  const cartCount = lines.reduce((s, l) => s + l.qty, 0)

  function addToCart(p) {
    setCart((c) => {
      const cur = c.find((i) => i.id === p.id)
      const qty = Math.min((cur?.qty || 0) + 1, maxFor(p))
      return cur ? c.map((i) => (i.id === p.id ? { ...i, qty } : i)) : [...c, { id: p.id, qty }]
    })
    setCartOpen(true)
  }

  function changeQty(id, delta) {
    const p = products.find((x) => x.id === id)
    if (!p) return
    setCart((c) =>
      c
        .map((i) => (i.id === id ? { ...i, qty: Math.min(i.qty + delta, maxFor(p)) } : i))
        .filter((i) => i.qty > 0),
    )
  }

  const list = products.filter(
    (p) =>
      `${p.name} ${p.brand || ''} ${p.description || ''}`.toLowerCase().includes(q.toLowerCase()) &&
      (!cat || p.category === cat) &&
      (!mode || p.mode === mode),
  )

  // Categorías que tienen productos, con su cantidad.
  const categories = CATEGORIES.map((c) => [c, products.filter((p) => p.category === c).length]).filter(([, n]) => n > 0)

  // El nombre de la tienda ocupa todo el ancho de la portada: cuanto más largo, más chico.
  const mastSize = `clamp(48px, ${Math.min(15, 140 / Math.max(settings.name.length, 6))}vw, 230px)`

  return (
    <>
      <header className="site-head">
        <div className="site-head-in">
          <span className={`brand-mini${scrolled ? ' show' : ''}`} aria-hidden={!scrolled}>
            {settings.name}
          </span>
          <button className="bag" onClick={() => setCartOpen(true)}>
            Bolsa <b>{cartCount}</b>
          </button>
        </div>
      </header>

      <section
        className="cover"
        style={
          settings.hero_image_url
            ? { backgroundImage: `linear-gradient(180deg,rgba(43,17,25,.55),rgba(43,17,25,.8)),url(${JSON.stringify(settings.hero_image_url)})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : undefined
        }
      >
        <h1 className="masthead" style={{ fontSize: mastSize }}>
          {settings.name}
        </h1>
        <div className="cover-row">
          <p className="deck">Tu belleza, tu propia editorial.</p>
          <p className="cover-note">Maquillaje y cuidado facial. Elegí lo que te gusta y hacé tu pedido por WhatsApp.</p>
          <a
            className="btn light"
            href="#catalogo"
            onClick={(e) => {
              e.preventDefault()
              document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            Ver el catálogo
          </a>
        </div>
      </section>

      <main>
        <section className="catalog" id="catalogo">
          <aside className="index" aria-label="Filtros del catálogo">
            <h2>El catálogo</h2>
            <p className="count-line">{status === 'ready' ? plural(list.length, 'producto', 'productos') : 'Cargando…'}</p>

            <input
              className="search"
              aria-label="Buscar producto"
              placeholder="Buscar producto"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />

            <h3>Categorías</h3>
            <ul className="index-list">
              <li>
                <button aria-pressed={cat === ''} onClick={() => setCat('')}>
                  <span>Todo</span><sup>{products.length}</sup>
                </button>
              </li>
              {categories.map(([c, n]) => (
                <li key={c}>
                  <button aria-pressed={cat === c} onClick={() => setCat(cat === c ? '' : c)}>
                    <span>{c}</span>
                    <sup>{n}</sup>
                  </button>
                </li>
              ))}
            </ul>

            <h3>Disponibilidad</h3>
            <ul className="index-list small">
              {[
                ['', 'Todos'],
                ['stock', 'En stock'],
                ['order', 'Por encargo'],
              ].map(([v, label]) => (
                <li key={v}>
                  <button aria-pressed={mode === v} onClick={() => setMode(v)}>
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <div className="grid">
            {status === 'loading' && <div className="empty">Cargando catálogo…</div>}
            {status === 'error' && (
              <div className="empty">
                No pudimos cargar el catálogo. <button className="linkbtn" onClick={load}>Probá de nuevo</button>
              </div>
            )}
            {status === 'ready' && list.length === 0 && (
              <div className="empty">
                No hay productos con esos filtros.{' '}
                <button
                  className="linkbtn"
                  onClick={() => {
                    setQ('')
                    setCat('')
                    setMode('')
                  }}
                >
                  Ver todo el catálogo
                </button>
              </div>
            )}
            {status === 'ready' &&
              list.map((p) => {
                const soldOut = p.mode === 'stock' && p.stock < 1
                const tone = CATEGORY_TONES[p.category] || CATEGORY_TONES.Otros
                return (
                  <article className="product" key={p.id}>
                    <div className="plate" style={{ '--plate-bg': tone.bg, '--plate-fg': tone.fg }}>
                      <span>{p.category}</span>
                      {p.image_url && <img src={p.image_url} alt={p.name} loading="lazy" onError={(e) => e.currentTarget.remove()} />}
                    </div>
                    <div className="product-info">
                      {p.brand && <div className="product-brand">{p.brand}</div>}
                      <div className="product-top">
                        <h3>{p.name}</h3>
                        <div className="price">{money(p.price)}</div>
                      </div>
                      {p.description && <p className="desc">{p.description}</p>}
                      <div className={`stock${p.mode === 'stock' && p.stock > 0 && p.stock <= 2 ? ' low' : ''}`}>
                        {p.mode === 'order'
                          ? 'Por encargo, sujeto a confirmación'
                          : soldOut
                            ? 'Agotado'
                            : p.stock === 1
                              ? 'Última unidad'
                              : `${p.stock} disponibles`}
                      </div>
                      <button className="btn outline" disabled={soldOut} onClick={() => addToCart(p)}>
                        {p.mode === 'order' ? 'Encargar' : soldOut ? 'Agotado' : 'Agregar a la bolsa'}
                      </button>
                    </div>
                  </article>
                )
              })}
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <div className="brand">{settings.name}</div>
          <div className="footer-cols">
            <p>{settings.tagline}</p>
            <p>
              {settings.location}
              <br />
              Pedidos y consultas por WhatsApp
              <br />
              <a className="muted-link" href="#/admin">
                Administrar
              </a>
            </p>
          </div>
        </div>
      </footer>

      {cartOpen && (
        <Cart
          lines={lines}
          settings={settings}
          onClose={() => setCartOpen(false)}
          onChangeQty={changeQty}
          onOrdered={(ok) => {
            if (ok) setCart([])
            load()
          }}
        />
      )}
    </>
  )
}
