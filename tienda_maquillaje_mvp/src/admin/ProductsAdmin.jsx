import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { CATEGORIES, money, slugify } from '../lib'

const EMPTY = { id: null, name: '', brand: '', category: 'Rostro', mode: 'stock', price: '', cost: '', stock: 0, image_url: '', description: '', active: true }
const MAX_IMAGE_MB = 3

export default function ProductsAdmin() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [msg, setMsg] = useState(null) // {type:'ok'|'error', text}
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*, product_costs(cost)')
      .order('created_at', { ascending: false })
    if (error) return setMsg({ type: 'error', text: error.message })
    setItems(data)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const costOf = (p) => {
    const c = Array.isArray(p.product_costs) ? p.product_costs[0] : p.product_costs
    return c?.cost ?? 0
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  function edit(p) {
    setForm({ ...p, brand: p.brand || '', description: p.description || '', image_url: p.image_url || '', cost: costOf(p) })
    setMsg(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function uploadImage(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return setMsg({ type: 'error', text: 'El archivo debe ser una imagen.' })
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) return setMsg({ type: 'error', text: `La imagen supera ${MAX_IMAGE_MB} MB.` })
    setBusy(true)
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
    const path = `${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('product-images').upload(path, file, { cacheControl: '31536000', contentType: file.type })
    setBusy(false)
    if (error) return setMsg({ type: 'error', text: `No se pudo subir la imagen: ${error.message}` })
    const { data } = supabase.storage.from('product-images').getPublicUrl(path)
    setForm((f) => ({ ...f, image_url: data.publicUrl }))
    setMsg({ type: 'ok', text: 'Imagen subida. Guardá el producto para aplicarla.' })
  }

  async function save(e) {
    e.preventDefault()
    const price = Math.round(Number(form.price))
    if (!form.name.trim() || !(price > 0)) return setMsg({ type: 'error', text: 'Ingresá nombre y un precio mayor a 0.' })

    setBusy(true)
    setMsg(null)
    const row = {
      name: form.name.trim(),
      brand: form.brand.trim() || null,
      category: form.category,
      mode: form.mode,
      price,
      stock: Math.max(0, Math.round(Number(form.stock) || 0)),
      image_url: form.image_url.trim() || null,
      description: form.description.trim() || null,
      active: form.active,
    }

    let id = form.id
    let error
    if (id) {
      ;({ error } = await supabase.from('products').update(row).eq('id', id))
    } else {
      const slug = `${slugify(row.name)}-${Math.random().toString(36).slice(2, 6)}`
      const res = await supabase.from('products').insert({ ...row, slug }).select('id').single()
      error = res.error
      id = res.data?.id
    }
    if (!error) {
      ;({ error } = await supabase
        .from('product_costs')
        .upsert({ product_id: id, cost: Math.max(0, Math.round(Number(form.cost) || 0)) }))
    }
    setBusy(false)
    if (error) return setMsg({ type: 'error', text: error.message })
    setForm(EMPTY)
    setMsg({ type: 'ok', text: 'Producto guardado.' })
    load()
  }

  async function toggleActive(p) {
    const { error } = await supabase.from('products').update({ active: !p.active }).eq('id', p.id)
    if (error) return setMsg({ type: 'error', text: error.message })
    load()
  }

  async function remove(p) {
    if (!window.confirm(`¿Eliminar "${p.name}"? Los pedidos anteriores conservan su nombre y precio.`)) return
    const { error } = await supabase.from('products').delete().eq('id', p.id)
    if (error) return setMsg({ type: 'error', text: error.message })
    if (form.id === p.id) setForm(EMPTY)
    load()
  }

  const price = Number(form.price) || 0
  const cost = Number(form.cost) || 0

  return (
    <div>
      <form className="admin-card" onSubmit={save}>
        <h3>{form.id ? 'Editar producto' : 'Agregar producto'}</h3>
        <div className="form-grid">
          <div className="field"><label htmlFor="p-name">Nombre</label><input id="p-name" value={form.name} onChange={set('name')} required /></div>
          <div className="field"><label htmlFor="p-brand">Marca</label><input id="p-brand" value={form.brand} onChange={set('brand')} /></div>
          <div className="field">
            <label htmlFor="p-cat">Categoría</label>
            <select id="p-cat" value={form.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
          </div>
          <div className="field">
            <label htmlFor="p-mode">Estado comercial</label>
            <select id="p-mode" value={form.mode} onChange={set('mode')}>
              <option value="stock">En stock</option>
              <option value="order">Por encargo</option>
            </select>
          </div>
          <div className="field"><label htmlFor="p-price">Precio de venta (UYU)</label><input id="p-price" type="number" min="1" step="1" value={form.price} onChange={set('price')} required /></div>
          <div className="field"><label htmlFor="p-cost">Costo (privado, UYU)</label><input id="p-cost" type="number" min="0" step="1" value={form.cost} onChange={set('cost')} /></div>
          <div className="field">
            <label htmlFor="p-stock">Unidades disponibles</label>
            <input id="p-stock" type="number" min="0" step="1" value={form.stock} onChange={set('stock')} disabled={form.mode === 'order'} />
          </div>
          <div className="field">
            <label htmlFor="p-active">Visibilidad</label>
            <select id="p-active" value={String(form.active)} onChange={(e) => setForm((f) => ({ ...f, active: e.target.value === 'true' }))}>
              <option value="true">Visible en la tienda</option>
              <option value="false">Oculto</option>
            </select>
          </div>
        </div>
        {price > 0 && cost > 0 && (
          <p className="notice">Ganancia por unidad: <b>{money(price - cost)}</b> ({Math.round(((price - cost) / price) * 100)}% del precio).</p>
        )}
        <div className="field">
          <label htmlFor="p-img">Fotografía</label>
          <input id="p-img" type="file" accept="image/*" onChange={uploadImage} disabled={busy} />
          <input aria-label="URL de la fotografía" placeholder="…o pegá una URL https://" value={form.image_url} onChange={set('image_url')} />
          {form.image_url && <img className="thumb" src={form.image_url} alt="Vista previa" />}
        </div>
        <div className="field"><label htmlFor="p-desc">Descripción</label><textarea id="p-desc" rows="2" value={form.description} onChange={set('description')} /></div>
        {msg && <p className={msg.type === 'error' ? 'error' : 'ok'} role="status">{msg.text}</p>}
        <div className="row">
          <button className="btn" disabled={busy}>{busy ? 'Guardando…' : 'Guardar producto'}</button>
          {form.id && <button type="button" className="btn outline" onClick={() => setForm(EMPTY)}>Cancelar edición</button>}
        </div>
      </form>

      <h3>Productos cargados ({items.length})</h3>
      <div className="table-wrap">
        <table className="admin-table">
          <thead><tr><th>Producto</th><th>Precio</th><th>Costo</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className={p.active ? '' : 'dim'}>
                <td>{p.name}{!p.active && <span className="pill"> oculto</span>}</td>
                <td>{money(p.price)}</td>
                <td>{money(costOf(p))}</td>
                <td>{p.mode === 'order' ? 'Encargo' : `Stock: ${p.stock}`}</td>
                <td className="actions">
                  <button className="btn outline small" onClick={() => edit(p)}>Editar</button>
                  <button className="btn outline small" onClick={() => toggleActive(p)}>{p.active ? 'Ocultar' : 'Mostrar'}</button>
                  <button className="btn outline small" onClick={() => remove(p)}>Borrar</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan="5">Todavía no hay productos.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
