import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const CYAN = '#00F2FF'
const BG = '#050505'
const SURFACE = '#0F0C1B'
const BORDER = 'rgba(255,255,255,0.06)'

export default function AdminPioneerLeads() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    loadLeads()
    // Subscribe to real-time updates
    const subscription = supabase
      .channel('landing_partner_leads')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'landing_partner_leads' }, (payload) => {
        setLeads(prev => [payload.new, ...prev])
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'landing_partner_leads' }, (payload) => {
        setLeads(prev => prev.filter(l => l.id !== payload.old.id))
      })
      .subscribe()

    return () => subscription.unsubscribe()
  }, [])

  async function loadLeads() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('landing_partner_leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setLeads(data || [])
    } catch (err) {
      console.error('Erreur chargement pioneers:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Supprimer cette inscription ?')) return
    
    try {
      setDeleting(id)
      const { error } = await supabase
        .from('landing_partner_leads')
        .delete()
        .eq('id', id)

      if (error) throw error
      setLeads(prev => prev.filter(l => l.id !== id))
    } catch (err) {
      console.error('Erreur suppression:', err)
      alert('Erreur lors de la suppression')
    } finally {
      setDeleting(null)
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
    alert(`Copié : ${text}`)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700 }}>Inscriptions Pionniers</h2>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
            Établissements inscrits au programme pioneer via le site web
          </p>
        </div>
        <div style={{
          background: 'rgba(0,242,255,0.1)',
          border: `1px solid ${CYAN}`,
          borderRadius: 8,
          padding: '8px 16px',
          color: CYAN,
          fontWeight: 600,
          fontSize: 14,
        }}>
          {leads.length} inscriptions
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>Chargement...</p>
      ) : leads.length === 0 ? (
        <div style={{ 
          background: SURFACE, 
          border: `1px solid ${BORDER}`, 
          borderRadius: 12, 
          padding: 40, 
          textAlign: 'center',
          color: 'rgba(255,255,255,0.4)'
        }}>
          <p>Aucune inscription pour le moment</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {leads.map(lead => (
            <div
              key={lead.id}
              style={{
                background: SURFACE,
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: 16,
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 16,
                alignItems: 'start',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <span style={{
                    fontSize: 14,
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: 4,
                    background: 'rgba(0,242,255,0.15)',
                    color: CYAN,
                  }}>
                    🏪 ÉTABLISSEMENT
                  </span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                    {new Date(lead.created_at).toLocaleDateString('fr-FR', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
                  <div>
                    <p style={{ margin: '0 0 4px', fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>Nom</p>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'white' }}>
                      {lead.establishment_name}
                    </p>
                  </div>
                  
                  {lead.city && (
                    <div>
                      <p style={{ margin: '0 0 4px', fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>Ville</p>
                      <p style={{ margin: 0, fontSize: 15, color: 'white' }}>
                        📍 {lead.city}
                      </p>
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: lead.message ? 12 : 0 }}>
                  <div>
                    <p style={{ margin: '0 0 4px', fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>Email</p>
                    <p style={{ margin: 0, fontSize: 14, color: CYAN, cursor: 'pointer', textDecoration: 'underline' }}
                       onClick={() => copyToClipboard(lead.email)}>
                      {lead.email}
                    </p>
                  </div>

                  {lead.phone && (
                    <div>
                      <p style={{ margin: '0 0 4px', fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>Téléphone</p>
                      <p style={{ margin: 0, fontSize: 14, color: 'white', cursor: 'pointer', textDecoration: 'underline' }}
                         onClick={() => copyToClipboard(lead.phone)}>
                        {lead.phone}
                      </p>
                    </div>
                  )}
                </div>

                {lead.message && (
                  <div style={{
                    background: 'rgba(189,0,255,0.05)',
                    border: '1px solid rgba(189,0,255,0.1)',
                    borderRadius: 8,
                    padding: 12,
                    marginTop: 12,
                  }}>
                    <p style={{ margin: '0 0 6px', fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>Message</p>
                    <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {lead.message}
                    </p>
                  </div>
                )}
              </div>

              {/* Delete button */}
              <button
                onClick={() => handleDelete(lead.id)}
                disabled={deleting === lead.id}
                style={{
                  padding: '8px 14px',
                  borderRadius: 6,
                  border: `1px solid rgba(255,68,68,0.5)`,
                  background: 'transparent',
                  color: deleting === lead.id ? 'rgba(255,68,68,0.5)' : '#ff4444',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: deleting === lead.id ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  if (deleting !== lead.id) {
                    e.target.style.background = 'rgba(255,68,68,0.1)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent'
                }}
              >
                {deleting === lead.id ? '⏳' : '🗑️ Supprimer'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
