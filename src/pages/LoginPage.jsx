import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) { setError(authError.message); setLoading(false); return }

    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', data.user.id).maybeSingle()
    if (!profile?.is_admin) { await supabase.auth.signOut(); setError('Accès refusé'); setLoading(false); return }

    navigate('/', { replace: true })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#0F0C1B', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 40, width: 380 }}>
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div style={{ color: '#00F2FF', fontWeight: 900, fontSize: 22, letterSpacing: 1, marginBottom: 6 }}>NOYA ADMIN</div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Accès réservé</div>
        </div>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={{ padding: '12px 14px', background: '#16122C', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'white', fontSize: 14, outline: 'none' }} />
          <input type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: '12px 14px', background: '#16122C', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'white', fontSize: 14, outline: 'none' }} />
          {error && <p style={{ color: '#ff6666', fontSize: 13, margin: 0 }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ padding: '12px', background: '#00F2FF', color: 'black', fontWeight: 700, border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 15, opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}
