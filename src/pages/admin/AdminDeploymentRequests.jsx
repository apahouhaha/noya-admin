import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const CYAN = '#00F2FF'
const BG = '#050505'
const SURFACE = '#0F0C1B'
const BORDER = 'rgba(255,255,255,0.06)'

export default function AdminDeploymentRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, merchant, client
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    loadRequests()
    // Subscribe to real-time updates
    const subscription = supabase
      .channel('deployment_notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'deployment_notifications' }, (payload) => {
        setRequests(prev => [payload.new, ...prev])
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'deployment_notifications' }, (payload) => {
        setRequests(prev => prev.filter(r => r.id !== payload.old.id))
      })
      .subscribe()

    return () => subscription.unsubscribe()
  }, [])

  async function loadRequests() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('deployment_notifications')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setRequests(data || [])
    } catch (err) {
      console.error('Erreur chargement demandes:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Supprimer cette demande ?')) return
    
    try {
      setDeleting(id)
      const { error } = await supabase
        .from('deployment_notifications')
        .delete()
        .eq('id', id)

      if (error) throw error
      setRequests(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      console.error('Erreur suppression:', err)
      alert('Erreur lors de la suppression')
    } finally {
      setDeleting(null)
    }
  }

  const filteredRequests = filter === 'all' 
    ? requests 
    : requests.filter(r => r.sender_type === filter)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Demandes de déploiement</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'merchant', 'client'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '8px 14px',
                borderRadius: 6,
                border: `1px solid ${filter === f ? CYAN : BORDER}`,
                background: filter === f ? 'rgba(0,242,255,0.1)' : 'transparent',
                color: filter === f ? CYAN : 'rgba(255,255,255,0.6)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {f === 'all' ? '📋 Tout' : f === 'merchant' ? '🏪 Commerçants' : '👤 Clients'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>Chargement...</p>
      ) : filteredRequests.length === 0 ? (
        <div style={{ 
          background: SURFACE, 
          border: `1px solid ${BORDER}`, 
          borderRadius: 12, 
          padding: 40, 
          textAlign: 'center',
          color: 'rgba(255,255,255,0.4)'
        }}>
          <p>Aucune demande</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredRequests.map(req => (
            <div
              key={req.id}
              style={{
                background: SURFACE,
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: 4,
                    background: req.sender_type === 'merchant' ? 'rgba(0,242,255,0.15)' : 'rgba(189,0,255,0.15)',
                    color: req.sender_type === 'merchant' ? CYAN : '#BD00FF',
                  }}>
                    {req.sender_type === 'merchant' ? '🏪 COMMERÇANT' : '👤 CLIENT'}
                  </span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                    {new Date(req.created_at).toLocaleDateString('fr-FR', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>

                {/* Contenu selon le type */}
                {req.sender_type === 'merchant' ? (
                  <div>
                    <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: 'white' }}>
                      Email : {req.target_email}
                    </p>
                    {req.sender_user_id && (
                      <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                        User ID : {req.sender_user_id.slice(0, 8)}...
                      </p>
                    )}
                    {req.source_context === 'web_partner' && (
                      <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(0,242,255,0.7)' }}>
                        Source : Site web (partenaire)
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: 'white' }}>
                      {req.target_business_name}
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                      📍 {req.target_business_city}
                    </p>
                    {req.source_context === 'web_client' && (
                      <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(189,0,255,0.7)' }}>
                        Source : Site web (client)
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, marginLeft: 16, flexShrink: 0 }}>
                {req.sender_type === 'merchant' && (
                  <button
                    onClick={() => handleAction(req)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 6,
                      border: `1px solid ${CYAN}`,
                      background: 'transparent',
                      color: CYAN,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'rgba(0,242,255,0.1)'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'transparent'
                    }}
                  >
                    ✉️ Contacter
                  </button>
                )}
                <button
                  onClick={() => handleDelete(req.id)}
                  disabled={deleting === req.id}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 6,
                    border: `1px solid rgba(255,68,68,0.5)`,
                    background: 'transparent',
                    color: deleting === req.id ? 'rgba(255,68,68,0.5)' : '#ff4444',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: deleting === req.id ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (deleting !== req.id) {
                      e.target.style.background = 'rgba(255,68,68,0.1)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'transparent'
                  }}
                >
                  {deleting === req.id ? '⏳' : '🗑️ Supprimer'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function handleAction(req) {
  // Copier l'email dans le presse-papier
  navigator.clipboard.writeText(req.target_email)
  alert(`Email copié : ${req.target_email}`)
}
