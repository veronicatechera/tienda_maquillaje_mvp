import { useState } from 'react'
import { supabase } from '../supabase'
import { onlyDigits } from '../lib'

export default function SettingsAdmin({ settings, onSaved }) {
  const [form, setForm] = useState({
    name: settings.name,
    phone: settings.phone,
    tagline: settings.tagline,
    location: settings.location,
    hero_image_url: settings.hero_image_url || '',
  })
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function save(e) {
    e.preventDefault()
    const phone = onlyDigits(form.phone)
    if (phone && (phone.length < 10 || phone.length > 15)) {
      return setMsg({ type: 'error', text: 'El WhatsApp debe incluir el código de país. Uruguay: 598 + número sin el 0 inicial (ej. 59899123456).' })
    }
    setBusy(true)
    const row = {
      name: form.name.trim() || 'Tienda de belleza',
      phone,
      tagline: form.tagline.trim(),
      location: form.location.trim(),
      hero_image_url: form.hero_image_url.trim() || null,
    }
    const { error } = await supabase.from('settings').update(row).eq('id', 1)
    setBusy(false)
    if (error) return setMsg({ type: 'error', text: error.message })
    onSaved({ ...settings, ...row })
    setForm({ ...form, phone })
    setMsg({ type: 'ok', text: 'Configuración guardada.' })
  }

  return (
    <form className="admin-card" onSubmit={save}>
      <h3>Datos de la tienda</h3>
      <div className="field"><label htmlFor="s-name">Nombre visible de la marca</label><input id="s-name" value={form.name} onChange={set('name')} /></div>
      <div className="field">
        <label htmlFor="s-phone">WhatsApp con código de país, solo números</label>
        <input id="s-phone" value={form.phone} onChange={set('phone')} placeholder="59899123456" inputMode="numeric" />
      </div>
      <div className="field"><label htmlFor="s-tag">Texto del pie de página</label><input id="s-tag" value={form.tagline} onChange={set('tagline')} /></div>
      <div className="field"><label htmlFor="s-loc">Ubicación (pie de página)</label><input id="s-loc" value={form.location} onChange={set('location')} /></div>
      <div className="field"><label htmlFor="s-hero">Imagen de portada (URL, opcional)</label><input id="s-hero" value={form.hero_image_url} onChange={set('hero_image_url')} placeholder="https://..." /></div>
      {msg && <p className={msg.type === 'error' ? 'error' : 'ok'} role="status">{msg.text}</p>}
      <button className="btn" disabled={busy}>{busy ? 'Guardando…' : 'Guardar configuración'}</button>
    </form>
  )
}
