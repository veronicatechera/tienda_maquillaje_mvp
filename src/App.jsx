import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { DEFAULT_SETTINGS } from './lib'
import Shop from './Shop.jsx'
import Admin from './admin/Admin.jsx'

export default function App() {
  const [hash, setHash] = useState(window.location.hash)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)

  useEffect(() => {
    const onHash = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => data && setSettings({ ...DEFAULT_SETTINGS, ...data }))
  }, [])

  useEffect(() => {
    document.title = `${settings.name} | Catálogo`
  }, [settings.name])

  if (hash.startsWith('#/admin')) {
    return <Admin settings={settings} onSettingsChange={setSettings} />
  }
  return <Shop settings={settings} />
}
