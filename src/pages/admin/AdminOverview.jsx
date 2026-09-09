import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const CYAN = '#00F2FF'
const SURFACE = '#0F0C1B'
const BORDER = 'rgba(255,255,255,0.06)'

export default function AdminOverview() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    try {
      setLoading(true)
      
      // Compter les utilisateurs
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      // Compter les commerçants
      const { count: merchantsCount } = await supabase
        .from('merchant_accounts')
        .select('*', { count: 'exact', head: true })

      // Compter les établissements
      const { count: establishmentsCount } = await supabase
        .from('establishments')
        .select('*', { count: 'exact', head: true })

      // Compter les inscriptions pioneers
      const { count: pioneersCount } = await supabase
        .from('landing_partner_leads')
        .select('*', { count: 'exact', head: true })

      // Compter les inscriptions iOS
      const { count: iosCount } = await supabase
        .from('landing_email_signups')
        .select('*', { count: 'exact', head: true })
        .eq('source', 'ios_waitlist')

      // Compter les demandes de déploiement
      const { count: deploymentsCount } = await supabase
        .from('deployment_notifications')
        .select('*', { count: 'exact', head: true })

      setStats({
        users: usersCount || 0,
        merchants: merchantsCount || 0,
        establishments: establishmentsCount || 0,
        pioneers: pioneersCount || 0,
        ios: iosCount || 0,
        deployments: deploymentsCount || 0,
      })
    } catch (err) {
      console.error('Erreur chargement stats:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <p style={{ color: 'rgba(255,255,255,0.4)' }}>Chargement...</p>
  }

  const kpis = [
    { label: 'Utilisateurs totaux', value: stats.users, icon: '👥', color: '#00F2FF' },
    { label: 'Commerçants', value: stats.merchants, icon: '🏪', color: '#BD00FF' },
    { label: 'Établissements', value: stats.establishments, icon: '📍', color: '#A855F7' },
    { label: 'Pionniers inscrits', value: stats.pioneers, icon: '⭐', color: '#D4A500' },
    { label: 'iOS Waitlist', value: stats.ios, icon: '🍎', color: '#555' },
    { label: 'Demandes déploiement', value: stats.deployments, icon: '📋', color: '#00FF88' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 900, color: 'white' }}>
          Tableau de bord
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
          Vue d'ensemble de NOYA LIVE
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 16,
        marginBottom: 40,
      }}>
        {kpis.map((kpi, i) => (
          <div
            key={i}
            style={{
              background: SURFACE,
              border: `1px solid ${BORDER}`,
              borderRadius: 12,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {kpi.label}
                </p>
              </div>
              <span style={{ fontSize: 24 }}>{kpi.icon}</span>
            </div>
            <div style={{
              fontSize: 32,
              fontWeight: 900,
              color: kpi.color,
              letterSpacing: '-1px',
            }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        padding: 24,
      }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'white' }}>
          🚀 Actions rapides
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <a href="/admin/utilisateurs" style={{
            padding: 12,
            background: 'rgba(0,242,255,0.1)',
            border: `1px solid ${CYAN}`,
            borderRadius: 8,
            color: CYAN,
            textDecoration: 'none',
            textAlign: 'center',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}>
            👥 Gérer les utilisateurs
          </a>
          <a href="/admin/etablissements" style={{
            padding: 12,
            background: 'rgba(189,0,255,0.1)',
            border: `1px solid #BD00FF`,
            borderRadius: 8,
            color: '#BD00FF',
            textDecoration: 'none',
            textAlign: 'center',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}>
            🏪 Gérer les établissements
          </a>
          <a href="/admin/deployments" style={{
            padding: 12,
            background: 'rgba(0,255,136,0.1)',
            border: `1px solid #00FF88`,
            borderRadius: 8,
            color: '#00FF88',
            textDecoration: 'none',
            textAlign: 'center',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}>
            📋 Demandes de déploiement
          </a>
          <a href="/admin/pioneers" style={{
            padding: 12,
            background: 'rgba(212,165,0,0.1)',
            border: `1px solid #D4A500`,
            borderRadius: 8,
            color: '#D4A500',
            textDecoration: 'none',
            textAlign: 'center',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}>
            ⭐ Pionniers
          </a>
          <a href="/admin/ios-waitlist" style={{
            padding: 12,
            background: 'rgba(85,85,85,0.1)',
            border: `1px solid #555`,
            borderRadius: 8,
            color: '#999',
            textDecoration: 'none',
            textAlign: 'center',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}>
            🍎 iOS Waitlist
          </a>
        </div>
      </div>
    </div>
  )
}
