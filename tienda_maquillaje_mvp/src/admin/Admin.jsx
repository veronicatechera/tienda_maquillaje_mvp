import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import ProductsAdmin from './ProductsAdmin.jsx'
import OrdersAdmin from './OrdersAdmin.jsx'
import SettingsAdmin from './SettingsAdmin.jsx'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (err) setError('Email o contraseña incorrectos.')
  }

  return (
    <form className="admin-card" onSubmit={submit}>
      <h2>Ingresar</h2>
      <div className="field">
        <label htmlFor="a-email">Email</label>
        <input id="a-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="a-pass">Contraseña</label>
        <input id="a-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn block" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'}</button>
    </form>
  )
}

const TABS = [
  ['products', 'Productos'],
  ['orders', 'Pedidos'],
  ['settings', 'Tienda'],
]

export default function Admin({ settings, onSettingsChange }) {
  const [session, setSession] = useState(undefined) // undefined = cargando
  const [isAdmin, setIsAdmin] = useState(null)
  const [tab, setTab] = useState('products')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return setIsAdmin(null)
    supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data))
  }, [session])

  const logout = () => supabase.auth.signOut()

  return (
    <div className="admin-page">
      <header className="admin-top">
        <div className="brand">{settings.name} · Administración</div>
        <div className="nav-actions">
          <a className="btn outline" href="#/">← Ver tienda</a>
          {session && <button className="btn outline" onClick={logout}>Salir</button>}
        </div>
      </header>

      <div className="admin-body">
        {session === undefined && <p>Cargando…</p>}
        {session === null && <Login />}
        {session && isAdmin === null && <p>Verificando permisos…</p>}
        {session && isAdmin === false && (
          <div className="admin-card">
            <h2>Sin permisos</h2>
            <p>
              Ingresaste como <b>{session.user.email}</b>, pero esta cuenta no figura como administradora. Agregala en la tabla
              <code> admins</code> desde Supabase.
            </p>
          </div>
        )}
        {session && isAdmin && (
          <>
            <div className="admin-tabs" role="tablist">
              {TABS.map(([id, label]) => (
                <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
                  {label}
                </button>
              ))}
            </div>
            {tab === 'products' && <ProductsAdmin />}
            {tab === 'orders' && <OrdersAdmin settings={settings} />}
            {tab === 'settings' && <SettingsAdmin settings={settings} onSaved={onSettingsChange} />}
          </>
        )}
      </div>
    </div>
  )
}
