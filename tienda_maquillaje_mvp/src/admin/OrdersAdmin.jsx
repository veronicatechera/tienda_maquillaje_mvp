import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { ORDER_STATUS, money, shortId, toWhatsAppNumber, whatsappLink } from '../lib'

export default function OrdersAdmin() {
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false })
      .limit(200)
    setLoading(false)
    if (err) return setError(err.message)
    setError('')
    setOrders(data)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function setStatus(o, status) {
    if (status === 'cancelado' && !window.confirm('¿Cancelar el pedido? El stock de los productos vuelve a quedar disponible.')) return
    const { error: err } = await supabase.rpc('set_order_status', { p_order_id: o.id, p_status: status })
    if (err) return setError(err.message)
    load()
  }

  return (
    <div>
      <div className="row between">
        <h3>Pedidos recibidos</h3>
        <button className="btn outline small" onClick={load} disabled={loading}>{loading ? 'Actualizando…' : 'Actualizar'}</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {!loading && orders.length === 0 && <div className="empty">Todavía no hay pedidos.</div>}
      {orders.map((o) => (
        <article className={`order ${o.status}`} key={o.id}>
          <div className="row between">
            <div>
              <b>#{shortId(o.id)}</b> · {new Date(o.created_at).toLocaleString('es-UY')}
              <div>{o.customer_name}{o.customer_phone ? ` · ${o.customer_phone}` : ''}</div>
            </div>
            <div className="order-total">{money(o.total)}</div>
          </div>
          <ul>
            {o.order_items.map((i) => (
              <li key={i.id}>{i.name} × {i.qty} — {money(i.unit_price * i.qty)}{i.mode === 'order' ? ' (por encargo)' : ''}</li>
            ))}
          </ul>
          <div className="stock">
            {o.delivery}{o.address ? ` · ${o.address}` : ''}{o.note ? ` · “${o.note}”` : ''}
          </div>
          <div className="row">
            <label className="inline">
              Estado{' '}
              <select value={o.status} disabled={o.status === 'cancelado'} onChange={(e) => setStatus(o, e.target.value)}>
                {ORDER_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            {o.customer_phone && (
              <a className="btn outline small" target="_blank" rel="noopener noreferrer"
                 href={whatsappLink(toWhatsAppNumber(o.customer_phone), `Hola ${o.customer_name}! Te escribo por tu pedido #${shortId(o.id)}.`)}>
                Escribir por WhatsApp
              </a>
            )}
          </div>
        </article>
      ))}
    </div>
  )
}
