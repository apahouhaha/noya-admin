import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

const CYAN = '#00F2FF'
const GREEN = '#00FF66'
const RED = '#FF3B30'
const ORANGE = '#FF9500'
const SURFACE = '#0F0C1B'
const BORDER = 'rgba(255,255,255,0.06)'

function HealthRow({ label, value, total, unit = '', color, threshold }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  const status = threshold
    ? (pct > threshold.danger ? RED : pct > threshold.warn ? ORANGE : GREEN)
    : color || CYAN
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: `1px solid ${BORDER}` }}>
      <div style={{ flex: 1, fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: status, minWidth: 60, textAlign: 'right' }}>
        {value}{unit}
        {total > 0 && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 400, marginLeft: 6 }}>({pct}%)</span>}
      </div>
      {total > 0 && (
        <div style={{ width: 100, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
          <div style={{ height: 4, width: `${pct}%`, background: status, borderRadius: 2 }} />
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color = 'white', sub }) {
  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '16px 20px', flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export default function AdminHealth() {
  const [stats, setStats] = useState(null)
  const [tableSizes, setTableSizes] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [
        { count: totalResas },
        { count: confirmedResas },
        { count: refusedResas },
        { count: cancelledResas },
        { count: totalPics },
        { count: approvedPics },
        { count: pendingPics },
        { count: totalNotifs },
        { count: unreadNotifs },
        sizesRes,
      ] = await Promise.all([
        supabase.from('reservations').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
        supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('status', 'confirmed').gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
        supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('status', 'refused').gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
        supabase.from('reservations').select('id', { count: 'exact', head: true }).inFilter('status', ['cancelled', 'cancelled_in_time', 'cancelled_late']).gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
        supabase.from('live_pics').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
        supabase.from('live_pics').select('id', { count: 'exact', head: true }).eq('is_approved', true).gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
        supabase.from('live_pics').select('id', { count: 'exact', head: true }).eq('is_approved', false),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('is_read', false),
        supabase.rpc('admin_table_sizes'),
      ])

      setStats({
        totalResas, confirmedResas, refusedResas, cancelledResas,
        totalPics, approvedPics, pendingPics,
        totalNotifs, unreadNotifs,
      })

      if (!sizesRes.error && sizesRes.data) {
        setTableSizes(sizesRes.data)
      } else {
        // Fallback
        const r = await supabase.from('realtime_monitor_logs').select('id', { count: 'exact', head: true })
        setTableSizes([])
      }

      setLastRefresh(new Date())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const tauxConfirmation = stats?.totalResas > 0 ? Math.round((stats.confirmedResas / stats.totalResas) * 100) : 0
  const tauxAnnulation = stats?.totalResas > 0 ? Math.round((stats.cancelledResas / stats.totalResas) * 100) : 0
  const tauxApproPics = stats?.totalPics > 0 ? Math.round((stats.approvedPics / stats.totalPics) * 100) : 0

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>🏥 Santé de l'app</h1>
          <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Indicateurs qualité — 30 derniers jours</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {lastRefresh && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{lastRefresh.toLocaleTimeString('fr-FR')}</span>}
          <button onClick={load} disabled={loading} style={{ background: `${CYAN}22`, border: `1px solid ${CYAN}44`, color: CYAN, padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
            {loading ? '...' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard label="Taux confirmation résas" value={`${tauxConfirmation}%`} color={tauxConfirmation > 60 ? GREEN : tauxConfirmation > 30 ? ORANGE : RED} sub="30 derniers jours" />
        <StatCard label="Taux annulation" value={`${tauxAnnulation}%`} color={tauxAnnulation < 20 ? GREEN : tauxAnnulation < 40 ? ORANGE : RED} sub="30 derniers jours" />
        <StatCard label="Taux appro photos" value={`${tauxApproPics}%`} color={tauxApproPics > 70 ? GREEN : ORANGE} sub="30 derniers jours" />
        <StatCard label="Photos en attente" value={stats?.pendingPics ?? '…'} color={stats?.pendingPics > 10 ? ORANGE : GREEN} sub="modération" />
        <StatCard label="Notifs non lues" value={stats?.unreadNotifs ?? '…'} color={stats?.unreadNotifs > 100 ? ORANGE : GREEN} sub="total en base" />
      </div>

      <div style={{ display: 'flex', gap: 16 }}>

        {/* Réservations */}
        <div style={{ flex: 1, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Réservations</h3>
          <p style={{ margin: '0 0 16px', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{stats?.totalResas ?? '…'} au total sur 30 jours</p>
          <HealthRow label="✅ Confirmées" value={stats?.confirmedResas ?? 0} total={stats?.totalResas} color={GREEN} />
          <HealthRow label="❌ Refusées" value={stats?.refusedResas ?? 0} total={stats?.totalResas} threshold={{ warn: 20, danger: 40 }} />
          <HealthRow label="🚫 Annulées" value={stats?.cancelledResas ?? 0} total={stats?.totalResas} threshold={{ warn: 20, danger: 40 }} />
        </div>

        {/* Photos live */}
        <div style={{ flex: 1, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Photos Live</h3>
          <p style={{ margin: '0 0 16px', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{stats?.totalPics ?? '…'} soumises sur 30 jours</p>
          <HealthRow label="✅ Approuvées" value={stats?.approvedPics ?? 0} total={stats?.totalPics} color={GREEN} />
          <HealthRow label="⏳ En attente (toutes)" value={stats?.pendingPics ?? 0} total={stats?.totalPics} color={ORANGE} />
        </div>

        {/* Notifications */}
        <div style={{ flex: 1, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Notifications</h3>
          <p style={{ margin: '0 0 16px', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{stats?.totalNotifs ?? '…'} sur 7 jours</p>
          <HealthRow label="📬 Non lues (total)" value={stats?.unreadNotifs ?? 0} color={stats?.unreadNotifs > 100 ? ORANGE : GREEN} />
          <div style={{ marginTop: 16, padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            💡 Si les notifs non lues dépassent 500, envisager un job de nettoyage automatique des notifs &gt; 30 jours.
          </div>
        </div>

      </div>
    </div>
  )
}
