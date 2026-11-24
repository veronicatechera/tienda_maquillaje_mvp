import { useState } from 'react'
import { supabase } from './supabase'
import Modal from './Modal.jsx'
import { DELIVERY, money, shortId, whatsappLink } from './lib'

export default function Cart({ lines, settings, onClose, onChangeQty, onOrdered }) {
  const [form, setForm] = useState({ name: '', phone: '', delivery: DELIVERY[0], address: '', note: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(null)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const total = lines.reduce((s, l) => s + l.product.price * l.qty, 0)
  const needsAddress = form.delivery !== DELIVERY[0]

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!lines.length) return setError('Agregá al menos un producto.')
    if (!form.name.trim()) return setError('Completá tu nombre.')
    if (needsAddress && !form.address.trim()) return setError('Indicanos la dirección para el envío.')

    setBusy(true)
    const { data, error: err } = await supabase.rpc('create_order', {
      p_name: form.name,
      p_phone: form.phone,
      p_delivery: form.delivery,
      p_address: form.address,
      p_note: form.note,
      p_items: lines.map((l) => ({ product_id: l.product.id, qty: l.qty })),
    })
    setBusy(false)

    if (err) {
      setError(err.message || 'No pudimos registrar el pedido. Probá de nuevo.')
      onOrdered(false) // refresca stock por si cambió
      return
    }
    setDone({ ...data, form })
    onOrdered(true)
  }

  if (done) {
    const text =
      `Hola! Hice el pedido #${shortId(done.order_id)}:\n\n` +
      done.items
        .map((i) => `• ${i.name} x${i.qty} — ${money(i.subtotal)}${i.mode === 'order' ? ' (por encargo)' : ''}`)
        .join('\n') +
      `\n\nTotal estimado: ${money(done.total)}` +
      `\nNombre: ${done.form.name}` +
      `\nEntrega: ${done.form.delivery}` +
      (done.form.address ? `\nZona/dirección: ${done.form.address}` : '') +
      (done.form.note ? `\nComentario: ${done.form.note}` : '') +
      '\n\nQuedo a la espera de confirmar disponibilidad y entrega.'

    return (
      <Modal title="¡Pedido registrado!" onClose={onClose} side>
        <p>
          Tu pedido <b>#{shortId(done.order_id)}</b> por <b>{money(done.total)}</b> quedó registrado.
        </p>
        {settings.phone ? (
          <>
            <p>Un último paso: enviá el pedido por WhatsApp para coordinar disponibilidad, pago y entrega.</p>
            <a className="btn block" href={whatsappLink(settings.phone, text)} target="_blank" rel="noopener noreferrer">
              Enviar por WhatsApp
            </a>
          </>
        ) : (
          <p>Te vamos a contactar para confirmar disponibilidad, pago y entrega.</p>
        )}
        <button className="btn outline block" style={{ marginTop: 10 }} onClick={onClose}>
          Seguir mirando el catálogo
        </button>
      </Modal>
    )
  }

  return (
    <Modal title="Tu bolsa" onClose={onClose} side>
      {lines.length === 0 ? (
        <div className="empty">Tu bolsa está vacía.</div>
      ) : (
        <>
          {lines.map(({ product: p, qty, max }) => (
            <div className="cart-row" key={p.id}>
              <div>
                <b>{p.name}</b>
                <div className="stock">
                  {money(p.price)} c/u, {p.mode === 'order' ? 'por encargo' : 'en stock'}
                </div>
              </div>
              <div className="qty">
                <button type="button" aria-label={`Quitar una unidad de ${p.name}`} onClick={() => onChangeQty(p.id, -1)}>
                  −
                </button>
                <span aria-live="polite">{qty}</span>
                <button
                  type="button"
                  aria-label={`Agregar una unidad de ${p.name}`}
                  disabled={qty >= max}
                  onClick={() => onChangeQty(p.id, 1)}
                >
                  +
                </button>
              </div>
              <b>{money(p.price * qty)}</b>
            </div>
          ))}
          <h3 className="cart-total">Total estimado: {money(total)}</h3>

          <form onSubmit={submit}>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="b-name">Nombre</label>
                <input id="b-name" value={form.name} onChange={set('name')} placeholder="Tu nombre" autoComplete="name" required />
              </div>
              <div className="field">
                <label htmlFor="b-phone">Teléfono</label>
                <input id="b-phone" value={form.phone} onChange={set('phone')} placeholder="Tu teléfono" autoComplete="tel" inputMode="tel" />
              </div>
            </div>
            <div className="field">
              <label htmlFor="b-delivery">Modalidad de entrega</label>
              <select id="b-delivery" value={form.delivery} onChange={set('delivery')}>
                {DELIVERY.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="b-address">Dirección / zona{needsAddress ? '' : ' (opcional)'}</label>
              <input id="b-address" value={form.address} onChange={set('address')} placeholder="Barrio o dirección" required={needsAddress} />
            </div>
            <div className="field">
              <label htmlFor="b-note">Comentario</label>
              <textarea id="b-note" rows="2" value={form.note} onChange={set('note')} placeholder="Color, tono u otra consulta..." />
            </div>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="btn block" disabled={busy}>
              {busy ? 'Registrando…' : 'Hacer pedido'}
            </button>
            <p className="notice">
              El pedido queda sujeto a confirmación de disponibilidad, costo de envío y forma de pago. Después de hacerlo te
              llevamos a WhatsApp para coordinar.
            </p>
          </form>
        </>
      )}
    </Modal>
  )
}
