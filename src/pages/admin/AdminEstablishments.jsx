import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const CYAN = '#00F2FF'
const SURFACE = '#0F0C1B'
const BORDER = 'rgba(255,255,255,0.06)'

export default function AdminEstablishments() {
  console.log('AdminEstablishments component rendering')
  const navigate = useNavigate()
  const [establishments, setEstablishments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('establishments')
      .select(`
        id, name, city, type, reservations_enabled, reservation_slug, phone, created_at,
        merchant_accounts(email, is_premium, is_pioneer)
      `)
      .order('created_at', { ascending: false })
    console.log('Establishments loaded:', data)
    setEstablishments(data || [])
    setLoading(false)
  }

  const filtered = establishments.filter(e =>
    e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.city?.toLowerCase().includes(search.toLowerCase()) ||
    e.reservation_slug?.toLowerCase().includes(search.toLowerCase()) ||
    e.merchant_accounts?.[0]?.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Établissements ({establishments.length})</h2>
        <input
          placeholder="Rechercher..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '8px 14px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, color: 'white', fontSize: 13, width: 240, outline: 'none' }}
        />
      </div>

      {loading ? (
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>Chargement...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(estab => {
            const merchant = estab.merchant_accounts?.[0]
            return (
              <div
                key={estab.id}
                onClick={() => navigate(`/admin/etablissements/${estab.id}`)}
                style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,242,255,0.3)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = BORDER}
              >
                {/* Statut */}
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: estab.reservations_enabled ? '#00FF88' : 'rgba(255,255,255,0.2)', flexShrink: 0 }} />

                {/* Nom + infos */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{estab.name}</span>
                    {merchant?.is_premium && <span style={{ background: 'rgba(189,0,255,0.15)', color: '#BD00FF', fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>PREMIUM</span>}
                    {merchant?.is_pioneer && <span style={{ background: 'rgba(0,242,255,0.1)', color: CYAN, fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>PIONEER</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                    {estab.city} · {estab.type} · {merchant?.email || 'Pas de marchand'}
                  </div>
                </div>

                {/* Slug */}
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
                  {estab.reservation_slug || estab.id.slice(0, 8) + '...'}
                </div>

                {/* Résa */}
                <div style={{ fontSize: 12, color: estab.reservations_enabled ? '#00FF88' : 'rgba(255,255,255,0.25)', flexShrink: 0 }}>
                  {estab.reservations_enabled ? 'Résa actives' : 'Résa off'}
                </div>

                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: 40 }}>Aucun résultat</p>
          )}
        </div>
      )}
    </div>
  )
}
