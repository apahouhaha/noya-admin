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
  const [alerts, setAlerts] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const now = new Date()
      const last30 = new Date(now - 30 * 24 * 60 * 60 * 1000)
      const yesterday = new Date(now - 24 * 60 * 60 * 1000)

      const [
        { count: totalEstabs },
        { count: activeEstabs },
        { count: totalUsers },
        { count: totalResas },
        { count: pendingResas },
        { count: confirmedResas },
        { count: noShowResas },
        { count: refusedResas },
        { count: resas30 },
        { data: pendingOld },
        { data: allEstabs },
      ] = await Promise.all([
        supabase.from('establishments').select('*', { count: 'exact', head: true }),
        supabase.from('establishments').select('*', { count: 'exact', head: true }).eq('reservations_enabled', true),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('reservations').select('*', { count: 'exact', head: true }),
        supabase.from('reservations').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('reservations').select('*', { count: 'exact', head: true }).eq('status', 'confirmed'),
        supabase.from('reservations').select('*', { count: 'exact', head: true }).eq('status', 'no_show'),
        supabase.from('reservations').select('*', { count: 'exact', head: true }).eq('status', 'refused'),
        supabase.from('reservations').select('*', { count: 'exact', head: true }).gte('created_at', last30.toISOString()),
        supabase.from('reservations').select('establishment_id, created_at').eq('status', 'pending').lt('created_at', yesterday.toISOString()),
        supabase.from('establishments').select('id, name, reservations_enabled'),
      ])

      setStats({ totalEstabs, activeEstabs, totalUsers, totalResas, pendingResas, confirmedResas, noShowResas, refusedResas, resas30 })

      // Construire les alertes
      const newAlerts = []

      // Pending > 24h groupés par établissement
      if (pendingOld?.length > 0) {
        const byEstab = {}
        pendingOld.forEach(r => {
          byEstab[r.establishment_id] = (byEstab[r.establishment_id] || 0) + 1
        })
        Object.entries(byEstab).forEach(([estabId, count]) => {
          const estab = allEstabs?.find(e => e.id === estabId)
          newAlerts.push({ level: 'error', msg: `${estab?.name || estabId} — ${count} demande(s) en attente > 24h`, estabId })
        })
      }

      if (pendingResas > 10) newAlerts.push({ level: 'warning', msg: `${pendingResas} réservations en attente au total` })

      const noShowRate = totalResas ? Math.round((noShowResas / totalResas) * 100) : 0
      if (noShowRate > 15) newAlerts.push({ level: 'warning', msg: `Taux de no-show global élevé : ${noShowRate}%` })

      setAlerts(newAlerts)
    }
    load()
  }, [])

  const confirmRate = stats?.totalResas ? Math.round((stats.confirmedResas / stats.totalResas) * 100) : 0
  const refuseRate = stats?.totalResas ? Math.round((stats.refusedResas / stats.totalResas) * 100) : 0
  const noShowRate = stats?.totalResas ? Math.round((stats.noShowResas / stats.totalResas) * 100) : 0

  return (
    <div>
      <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 700 }}>Vue globale</h2>

      {/* Alertes */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {alerts.map((a, i) => (
            <div key={i} onClick={() => a.estabId && navigate(`/admin/etablissements/${a.estabId}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, marginBottom: 8,
                background: a.level === 'error' ? 'rgba(255,68,68,0.1)' : 'rgba(255,140,0,0.1)',
                border: `1px solid ${a.level === 'error' ? 'rgba(255,68,68,0.3)' : 'rgba(255,140,0,0.3)'}`,
                cursor: a.estabId ? 'pointer' : 'default',
              }}>
              <span>{a.level === 'error' ? '🚨' : '⚠️'}</span>
              <span style={{ fontSize: 13, color: a.level === 'error' ? '#ff4444' : '#FF8C00' }}>{a.msg}</span>
              {a.estabId && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>→ Voir</span>}
            </div>
          ))}
        </div>
      )}

      {!stats ? <p style={{ color: 'rgba(255,255,255,0.4)' }}>Chargement...</p> : (
        <>
          {/* KPIs principaux */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
            {[
              { label: 'Établissements', value: stats.totalEstabs, sub: `${stats.activeEstabs} avec réservations actives`, color: '#00F2FF' },
              { label: 'Utilisateurs', value: stats.totalUsers, sub: 'comptes enregistrés', color: '#BD00FF' },
              { label: 'Réservations totales', value: stats.totalResas, sub: `${stats.resas30} ces 30 derniers jours`, color: '#00FF88' },
              { label: 'En attente', value: stats.pendingResas, sub: 'à traiter', color: stats.pendingResas > 5 ? '#FF8C00' : 'white' },
            ].map(card => (
              <div key={card.label} style={{ background: '#0F0C1B', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 20 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>{card.label}</div>
                <div style={{ fontSize: 36, fontWeight: 900, color: card.color, marginBottom: 4 }}>{card.value ?? '—'}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{card.sub}</div>
              </div>
            ))}
          </div>

          {/* Taux globaux */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {[
              { label: 'Taux de confirmation', value: `${confirmRate}%`, color: confirmRate > 70 ? '#00FF88' : confirmRate > 40 ? '#FF8C00' : '#ff4444' },
              { label: 'Taux de refus', value: `${refuseRate}%`, color: refuseRate < 10 ? '#00FF88' : refuseRate < 30 ? '#FF8C00' : '#ff4444' },
              { label: 'Taux de no-show', value: `${noShowRate}%`, color: noShowRate < 5 ? '#00FF88' : noShowRate < 15 ? '#FF8C00' : '#ff4444' },
            ].map(c => (
              <div key={c.label} style={{ background: '#0F0C1B', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 20 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>{c.label}</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: c.color }}>{c.value}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
