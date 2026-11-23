import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import Cart from './Cart.jsx'
import { CATEGORIES, money, plural, store } from './lib'

export default function Shop({ settings }) {
  const [products, setProducts] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [mode, setMode] = useState('')
  const [cart, setCart] = useState(() => store.get('beauty_cart', []))
  const [cartOpen, setCartOpen] = useState(false)

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

  return (
    <>
      <header>
        <div className="nav">
          <div className="brand">{settings.name}</div>
          <button className="iconbtn" onClick={() => setCartOpen(true)}>
            Bolsa <span>{cartCount}</span>
          </button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">Beauty · Makeup · Self expression</div>
            <h1>
              Tu belleza,
              <br />
              tu propia
              <br />
              editorial.
            </h1>
            <p>Descubrí productos para crear tu estilo. Explorá el catálogo y prepará tu pedido de forma sencilla.</p>
            <a className="btn light" href="#catalogo">
              Explorar catálogo ↘
            </a>
          </div>
          <div
            className="hero-art"
            role="img"
            aria-label="Imagen de portada"
            style={settings.hero_image_url ? { backgroundImage: `linear-gradient(145deg,rgba(23,21,22,.05),rgba(23,21,22,.5)),url(${JSON.stringify(settings.hero_image_url)})` } : undefined}
          />
        </section>

        <section id="catalogo">
          <div className="section-head">
            <div>
              <div className="eyebrow dark">Selección de belleza</div>
              <h2>El catálogo</h2>
              <p>Productos disponibles y opciones por encargo.</p>
            </div>
            {status === 'ready' && <span className="pill">{plural(list.length, 'producto', 'productos')}</span>}
          </div>

          <div className="tools">
            <input aria-label="Buscar producto" placeholder="Buscar producto..." value={q} onChange={(e) => setQ(e.target.value)} />
            <select aria-label="Categoría" value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="">Todas las categorías</option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select aria-label="Disponibilidad" value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="">Todos</option>
              <option value="stock">En stock</option>
              <option value="order">Por encargo</option>
            </select>
          </div>

          <div className="grid">
            {status === 'loading' && <div className="empty">Cargando catálogo…</div>}
            {status === 'error' && (
              <div className="empty">
                No pudimos cargar el catálogo. <button className="linkbtn" onClick={load}>Reintentar</button>
              </div>
            )}
            {status === 'ready' && list.length === 0 && <div className="empty">No encontramos productos con esos filtros.</div>}
            {status === 'ready' &&
              list.map((p) => {
                const soldOut = p.mode === 'stock' && p.stock < 1
                return (
                  <article className="product" key={p.id}>
                    <div className="product-img">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} loading="lazy" onError={(e) => e.currentTarget.remove()} />
                      ) : (
                        <span>{p.category}</span>
                      )}
                    </div>
                    <div className="product-body">
                      <div className="tag">{[p.brand, p.category].filter(Boolean).join(' · ')}</div>
                      <h3>{p.name}</h3>
                      <div className="desc">{p.description}</div>
                      <div className="price">{money(p.price)}</div>
                      <div className="stock">
                        {p.mode === 'order'
                          ? 'Por encargo · sujeto a confirmación'
                          : soldOut
                            ? 'Agotado'
                            : `Disponible · ${plural(p.stock, 'unidad', 'unidades')}`}
                      </div>
                      <button className="btn" disabled={soldOut} onClick={() => addToCart(p)}>
                        {p.mode === 'order' ? 'Consultar / encargar' : soldOut ? 'Sin stock' : 'Agregar a la bolsa'}
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
          <div>
            <div className="brand light">{settings.name}</div>
            <small>{settings.tagline}</small>
          </div>
          <small>
            {settings.location}
            <br />
            Pedidos y consultas por WhatsApp
            <br />
            <a className="muted-link" href="#/admin">
              Administrar
            </a>
          </small>
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
