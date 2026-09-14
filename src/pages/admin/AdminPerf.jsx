import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

const CYAN = '#00F2FF'
const GREEN = '#00FF66'
const ORANGE = '#FF9500'
const RED = '#FF3B30'
const SURFACE = '#0F0C1B'
const BORDER = 'rgba(255,255,255,0.06)'

const TABLES = [
  'notifications', 'live_pics', 'reservations', 'profiles',
  'live_attendance', 'live_status', 'friendships', 'live_posts',
  'realtime_monitor_logs', 'live_attendance',
]

function SizeBar({ name, bytes, maxBytes }) {
  const pct = maxBytes > 0 ? Math.round((bytes / maxBytes) * 100) : 0
  const color = bytes > 50_000_000 ? RED : bytes > 10_000_000 ? ORANGE : CYAN
  const fmt = bytes > 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB`
             : bytes > 1_000 ? `${Math.round(bytes / 1_000)} kB`
             : `${bytes} B`
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }}>{name}</span>
        <span style={{ color, fontWeight: 700 }}>{fmt}</span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
        <div style={{ height: 4, width: `${Math.max(pct, 1)}%`, background: color, borderRadius: 2, transition: 'width 0.4s' }} />
      </div>
    </div>
  )
}

function StatCard({ label, value, color = 'white', sub }) {
  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '16px 20px', flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export default function AdminPerf() {
  const [sizes, setSizes] = useState([])
  const [counts, setCounts] = useState({})
  const [realtimeErrors, setRealtimeErrors] = useState(0)
  const [realtimeReconnects, setRealtimeReconnects] = useState(0)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Tailles des tables via SQL
      const { data: sizeData } = await supabase.rpc('admin_table_sizes_raw')

      // Comptes lignes tables critiques
      const tableQueries = await Promise.all([
        supabase.from('notifications').select('id', { count: 'exact', head: true }),
        supabase.from('live_pics').select('id', { count: 'exact', head: true }),
        supabase.from('reservations').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('live_attendance').select('id', { count: 'exact', head: true }),
        supabase.from('friendships').select('id', { count: 'exact', head: true }),
      ])

      setCounts({
        notifications: tableQueries[0].count,
        live_pics: tableQueries[1].count,
        reservations: tableQueries[2].count,
        profiles: tableQueries[3].count,
        live_attendance: tableQueries[4].count,
        friendships: tableQueries[5].count,
      })

      // Realtime monitor
      const [errRes, reconnRes] = await Promise.all([
        supabase.from('realtime_monitor_logs').select('id', { count: 'exact', head: true }).eq('event', 'error').gte('timestamp', new Date(Date.now() - 7 * 86400000).toISOString()),
        supabase.from('realtime_monitor_logs').select('id', { count: 'exact', head: true }).eq('event', 'reconnected').gte('timestamp', new Date(Date.now() - 7 * 86400000).toISOString()),
      ])
      setRealtimeErrors(errRes.count || 0)
      setRealtimeReconnects(reconnRes.count || 0)

      if (sizeData) setSizes(sizeData)

      setLastRefresh(new Date())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const totalSize = sizes.reduce((s, t) => s + (t.size_bytes || 0), 0)
  const maxSize = Math.max(...sizes.map(t => t.size_bytes || 0), 1)
  const fmtTotal = totalSize > 1_000_000 ? `${(totalSize / 1_000_000).toFixed(1)} MB` : `${Math.round(totalSize / 1_000)} kB`

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>⚙️ Performances techniques</h1>
          <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Base de données & infrastructure</p>
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
        <StatCard label="Taille DB totale" value={fmtTotal} color={CYAN} sub="tables surveillées" />
        <StatCard label="Erreurs Realtime 7j" value={realtimeErrors} color={realtimeErrors > 10 ? RED : realtimeErrors > 0 ? ORANGE : GREEN} sub="WebSocket" />
        <StatCard label="Reconnexions 7j" value={realtimeReconnects} color={realtimeReconnects > 20 ? ORANGE : GREEN} sub="récupérations auto" />
        <StatCard label="Profiles total" value={counts.profiles ?? '…'} color="white" sub="utilisateurs en base" />
      </div>

      <div style={{ display: 'flex', gap: 16 }}>

        {/* Tailles tables */}
        <div style={{ flex: 1, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Taille des tables</h3>
          <p style={{ margin: '0 0 20px', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
            Surveiller les tables qui grossissent vite → prévoir archivage
          </p>
          {sizes.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 12, padding: '20px 0' }}>
              Données non disponibles — RPC admin_table_sizes_raw manquante
            </div>
          ) : (
            sizes.sort((a, b) => b.size_bytes - a.size_bytes).map(t => (
              <SizeBar key={t.table_name} name={t.table_name} bytes={t.size_bytes} maxBytes={maxSize} />
            ))
          )}

          {/* Seuils */}
          <div style={{ marginTop: 16, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
            <div style={{ marginBottom: 4 }}><span style={{ color: CYAN }}>●</span> &lt; 10 MB : normal</div>
            <div style={{ marginBottom: 4 }}><span style={{ color: ORANGE }}>●</span> 10–50 MB : surveiller</div>
            <div><span style={{ color: RED }}>●</span> &gt; 50 MB : prévoir archivage</div>
          </div>
        </div>

        {/* Lignes tables */}
        <div style={{ flex: 1, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Nombre de lignes</h3>
          <p style={{ margin: '0 0 20px', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Tables critiques pour les performances RLS</p>
          {Object.entries(counts).map(([table, count]) => (
            <div key={table} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}>
              <span style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.7)' }}>{table}</span>
              <span style={{ fontWeight: 700, color: count > 100000 ? ORANGE : CYAN }}>{count?.toLocaleString('fr-FR') ?? '…'}</span>
            </div>
          ))}

          <div style={{ marginTop: 16, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
            💡 Les tables <strong style={{ color: 'rgba(255,255,255,0.6)' }}>notifications</strong> et <strong style={{ color: 'rgba(255,255,255,0.6)' }}>live_pics</strong> grossissent le plus vite. Au-delà de 100k lignes, envisager un archivage périodique.
          </div>
        </div>

      </div>
    </div>
  )
}
