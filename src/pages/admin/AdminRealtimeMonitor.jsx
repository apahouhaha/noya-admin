import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

const CYAN = '#00F2FF'
const GREEN = '#00FF66'
const RED = '#FF3B30'
const ORANGE = '#FF9500'
const SURFACE = '#0F0C1B'
const BORDER = 'rgba(255,255,255,0.06)'

function StatCard({ label, value, color = 'white', sub }) {
  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '16px 20px', minWidth: 140 }}>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function Badge({ children, color = CYAN }) {
  return (
    <span style={{ background: `${color}22`, color, border: `1px solid ${color}44`, borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
      {children}
    </span>
  )
}

export default function AdminRealtimeMonitor() {
  const [summary, setSummary] = useState([])
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: sumData }, { data: recentData }] = await Promise.all([
        supabase
          .from('realtime_monitor_summary')
          .select('*')
          .order('hour', { ascending: false })
          .limit(48),
        supabase
          .from('realtime_monitor_logs')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(50),
      ])
      setSummary(sumData || [])
      setRecent(recentData || [])
      setLastRefresh(new Date())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 60000) // refresh auto toutes les min
    return () => clearInterval(interval)
  }, [load])

  // Agrégats globaux (7 derniers jours)
  const totalErrors = summary.reduce((s, r) => s + (r.errors || 0), 0)
  const totalReconnects = summary.reduce((s, r) => s + (r.reconnects || 0), 0)
  const maxAffected = summary.reduce((s, r) => Math.max(s, r.affected_users || 0), 0)

  // Par channel
  const byChannel = summary.reduce((acc, r) => {
    if (!acc[r.channel]) acc[r.channel] = { errors: 0, reconnects: 0, users: 0 }
    acc[r.channel].errors += r.errors || 0
    acc[r.channel].reconnects += r.reconnects || 0
    acc[r.channel].users = Math.max(acc[r.channel].users, r.affected_users || 0)
    return acc
  }, {})

  const healthStatus = totalErrors === 0
    ? { label: '✅ Stable', color: GREEN }
    : totalErrors < 10
    ? { label: '⚠️ Attention', color: ORANGE }
    : { label: '🔴 Critique', color: RED }

  return (
    <div style={{ maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>📡 Monitoring Realtime</h1>
          <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
            Connexions WebSocket Supabase — 7 derniers jours
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {lastRefresh && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
              Mis à jour {lastRefresh.toLocaleTimeString('fr-FR')}
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            style={{ background: `${CYAN}22`, border: `1px solid ${CYAN}44`, color: CYAN, padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
          >
            {loading ? '...' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* Statut global */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard label="Statut" value={healthStatus.label} color={healthStatus.color} sub="7 derniers jours" />
        <StatCard label="Erreurs totales" value={totalErrors} color={totalErrors > 0 ? RED : GREEN} sub="connexions échouées" />
        <StatCard label="Reconnexions" value={totalReconnects} color={totalReconnects > 0 ? ORANGE : GREEN} sub="reprises auto" />
        <StatCard label="Max users affectés" value={maxAffected} color="white" sub="simultanément" />
      </div>

      {/* Seuils */}
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 24, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, marginRight: 12 }}>⚡ Seuils d'alerte</span>
        <span style={{ marginRight: 16 }}>
          <span style={{ color: GREEN }}>● 0 erreur</span> = OK
        </span>
        <span style={{ marginRight: 16 }}>
          <span style={{ color: ORANGE }}>● 1–10 erreurs/heure</span> = surveiller
        </span>
        <span>
          <span style={{ color: RED }}>● &gt;10 erreurs/heure</span> = upgrader le plan Supabase
        </span>
      </div>

      {/* Par channel */}
      {Object.keys(byChannel).length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Par channel</h2>
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {['Channel', 'Erreurs', 'Reconnexions', 'Max users'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(byChannel)
                  .sort((a, b) => b[1].errors - a[1].errors)
                  .map(([channel, data]) => (
                    <tr key={channel} style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 12 }}>{channel}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <Badge color={data.errors > 0 ? RED : GREEN}>{data.errors}</Badge>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <Badge color={data.reconnects > 0 ? ORANGE : GREEN}>{data.reconnects}</Badge>
                      </td>
                      <td style={{ padding: '10px 16px', color: 'rgba(255,255,255,0.5)' }}>{data.users}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dernières erreurs */}
      <div>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Dernières erreurs
        </h2>
        {recent.filter(r => r.event === 'error').length === 0 ? (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
            ✅ Aucune erreur récente
          </div>
        ) : (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {['Heure', 'Channel', 'Statut', 'Erreur'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.filter(r => r.event === 'error').slice(0, 20).map(row => (
                  <tr key={row.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: '8px 16px', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>
                      {new Date(row.timestamp).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '8px 16px', fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
                      {row.channel}
                    </td>
                    <td style={{ padding: '8px 16px' }}>
                      <Badge color={RED}>{row.status}</Badge>
                    </td>
                    <td style={{ padding: '8px 16px', color: 'rgba(255,255,255,0.4)', fontSize: 11, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.error || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Si aucune donnée */}
      {!loading && summary.length === 0 && recent.length === 0 && (
        <div style={{ marginTop: 24, padding: 24, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
          📭 Aucune donnée — le monitoring se remplit automatiquement en production avec de vrais utilisateurs.
        </div>
      )}

    </div>
  )
}
