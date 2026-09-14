import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

const CYAN = '#00F2FF'
const GREEN = '#00FF66'
const PURPLE = '#BD00FF'
const SURFACE = '#0F0C1B'
const BORDER = 'rgba(255,255,255,0.06)'

function StatCard({ label, value, color = 'white', sub, trend }) {
  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '16px 20px', flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function MiniBar({ label, value, max, color = CYAN }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: 'rgba(255,255,255,0.7)' }}>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{value}</span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
        <div style={{ height: 4, width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.4s' }} />
      </div>
    </div>
  )
}

export default function AdminGrowth() {
  const [data, setData] = useState(null)
  const [growth, setGrowth] = useState([])
  const [resas, setResas] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [statsRes, growthRes, resasRes] = await Promise.all([
        supabase.rpc('admin_growth_stats'),
        supabase.from('profiles')
          .select('created_at, role')
          .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
          .order('created_at'),
        supabase.from('reservations')
          .select('created_at, status')
          .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
          .order('created_at'),
      ])

      // Agréger par jour
      const byDay = {}
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000)
        const key = d.toISOString().slice(0, 10)
        byDay[key] = { clients: 0, merchants: 0, resas: 0, resas_confirmed: 0 }
      }

      ;(growthRes.data || []).forEach(r => {
        const key = r.created_at.slice(0, 10)
        if (byDay[key]) {
          if (r.role === 'client') byDay[key].clients++
          else if (r.role === 'merchant') byDay[key].merchants++
        }
      })

      ;(resasRes.data || []).forEach(r => {
        const key = r.created_at.slice(0, 10)
        if (byDay[key]) {
          byDay[key].resas++
          if (r.status === 'confirmed') byDay[key].resas_confirmed++
        }
      })

      setGrowth(Object.entries(byDay).map(([day, v]) => ({ day, ...v })))

      // Stats globales depuis RPC ou fallback
      if (!statsRes.error && statsRes.data) {
        setData(statsRes.data)
      } else {
        // Fallback direct
        const [usersRes, merchantsRes, livesRes] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('merchant_accounts').select('id', { count: 'exact', head: true }),
          supabase.from('live_status').select('id', { count: 'exact', head: true }).eq('is_active', true),
        ])
        setData({
          total_users: usersRes.count,
          total_merchants: merchantsRes.count,
          lives_actifs: livesRes.count,
        })
      }

      setResas(resasRes.data || [])
      setLastRefresh(new Date())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Stats calculées
  const totalClients = growth.reduce((s, d) => s + d.clients, 0)
  const totalMerchants = growth.reduce((s, d) => s + d.merchants, 0)
  const totalResas = growth.reduce((s, d) => s + d.resas, 0)
  const totalConfirmed = growth.reduce((s, d) => s + d.resas_confirmed, 0)
  const tauxConfirmation = totalResas > 0 ? Math.round((totalConfirmed / totalResas) * 100) : 0
  const maxDayUsers = Math.max(...growth.map(d => d.clients + d.merchants), 1)
  const maxDayResas = Math.max(...growth.map(d => d.resas), 1)

  // 7 derniers jours actifs
  const last7 = growth.slice(-7)
  const usersLast7 = last7.reduce((s, d) => s + d.clients + d.merchants, 0)
  const resasLast7 = last7.reduce((s, d) => s + d.resas, 0)

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>📈 Croissance</h1>
          <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>30 derniers jours</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {lastRefresh && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{lastRefresh.toLocaleTimeString('fr-FR')}</span>}
          <button onClick={load} disabled={loading} style={{ background: `${CYAN}22`, border: `1px solid ${CYAN}44`, color: CYAN, padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
            {loading ? '...' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* KPIs globaux */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard label="Total utilisateurs" value={data?.total_users ?? '…'} color={CYAN} sub="tous temps" />
        <StatCard label="Total commercants" value={data?.total_merchants ?? '…'} color={PURPLE} sub="inscrits" />
        <StatCard label="Lives actifs" value={data?.lives_actifs ?? '…'} color={GREEN} sub="en ce moment" />
        <StatCard label="Taux confirmation" value={`${tauxConfirmation}%`} color={tauxConfirmation > 50 ? GREEN : '#FF9500'} sub="résas 30j" />
      </div>

      {/* 30 derniers jours */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>

        {/* Nouveaux inscrits */}
        <div style={{ flex: 1, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Nouveaux inscrits / jour</h3>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>+{totalClients + totalMerchants} total · +{usersLast7} cette semaine</span>
          </div>
          {growth.filter(d => d.clients + d.merchants > 0).length === 0 ? (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 12, padding: '20px 0' }}>Aucun inscrit sur la période</div>
          ) : (
            growth.slice(-14).map(d => (
              <MiniBar key={d.day} label={new Date(d.day).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} value={d.clients + d.merchants} max={maxDayUsers} color={CYAN} />
            ))
          )}
        </div>

        {/* Réservations */}
        <div style={{ flex: 1, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Réservations / jour</h3>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{totalResas} total · {resasLast7} cette semaine</span>
          </div>
          {growth.filter(d => d.resas > 0).length === 0 ? (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 12, padding: '20px 0' }}>Aucune réservation sur la période</div>
          ) : (
            growth.slice(-14).map(d => (
              <MiniBar key={d.day} label={new Date(d.day).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} value={d.resas} max={maxDayResas} color={GREEN} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
