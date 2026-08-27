import { useState, useEffect } from 'react'
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import AdminEstablishments from './AdminEstablishments'
import AdminEstablishmentDetail from './AdminEstablishmentDetail'
import AdminUsers from './AdminUsers'

const CYAN = '#00F2FF'
const BG = '#050505'
const SURFACE = '#0F0C1B'
const BORDER = 'rgba(255,255,255,0.06)'

export default function AdminPage() {
  const navigate = useNavigate()
  const [adminEmail, setAdminEmail] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setAdminEmail(user?.email || ''))
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, color: 'white', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: CYAN, fontWeight: 900, fontSize: 18, letterSpacing: 1 }}>NOYA</span>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>|</span>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Dashboard Admin</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{adminEmail}</span>
          <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
            Déconnexion
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1 }}>

        {/* Sidebar */}
        <nav style={{ width: 200, background: SURFACE, borderRight: `1px solid ${BORDER}`, padding: '16px 0', flexShrink: 0 }}>
          {[
            { to: '/admin', label: '📊 Vue globale', exact: true },
            { to: '/admin/etablissements', label: '🏪 Établissements' },
            { to: '/admin/utilisateurs', label: '👥 Utilisateurs' },
          ].map(({ to, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              style={({ isActive }) => ({
                display: 'block', padding: '10px 20px', fontSize: 13, textDecoration: 'none',
                color: isActive ? CYAN : 'rgba(255,255,255,0.5)',
                background: isActive ? 'rgba(0,242,255,0.06)' : 'transparent',
                borderLeft: isActive ? `2px solid ${CYAN}` : '2px solid transparent',
                transition: 'all 0.15s',
              })}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Contenu */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <Routes>
            <Route index element={<AdminOverview />} />
            <Route path="etablissements" element={<AdminEstablishments />} />
            <Route path="etablissements/:id" element={<AdminEstablishmentDetail />} />
            <Route path="utilisateurs" element={<AdminUsers />} />
          </Routes>
        </main>

      </div>
    </div>
  )
}

// ── Vue globale ──────────────────────────────────────────────────────────────
function AdminOverview() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    async function load() {
      const [
        { count: totalEstabs },
        { count: activeEstabs },
        { count: totalUsers },
        { count: totalResas },
        { count: pendingResas },
        { count: confirmedResas },
      ] = await Promise.all([
        supabase.from('establishments').select('*', { count: 'exact', head: true }),
        supabase.from('establishments').select('*', { count: 'exact', head: true }).eq('reservations_enabled', true),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('reservations').select('*', { count: 'exact', head: true }),
        supabase.from('reservations').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('reservations').select('*', { count: 'exact', head: true }).eq('status', 'confirmed'),
      ])
      setStats({ totalEstabs, activeEstabs, totalUsers, totalResas, pendingResas, confirmedResas })
    }
    load()
  }, [])

  const cards = stats ? [
    { label: 'Établissements', value: stats.totalEstabs, sub: `${stats.activeEstabs} avec réservations actives`, color: '#00F2FF' },
    { label: 'Utilisateurs', value: stats.totalUsers, sub: 'comptes enregistrés', color: '#BD00FF' },
    { label: 'Réservations total', value: stats.totalResas, sub: `${stats.pendingResas} en attente · ${stats.confirmedResas} confirmées`, color: '#00FF88' },
  ] : []

  return (
    <div>
      <h2 style={{ margin: '0 0 24px', fontSize: 20, fontWeight: 700 }}>Vue globale</h2>
      {!stats ? (
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>Chargement...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {cards.map(card => (
            <div key={card.label} style={{ background: '#0F0C1B', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>{card.label}</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: card.color, marginBottom: 6 }}>{card.value ?? '—'}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{card.sub}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
