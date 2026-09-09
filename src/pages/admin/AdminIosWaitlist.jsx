import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const CYAN = '#00F2FF'
const BG = '#050505'
const SURFACE = '#0F0C1B'
const BORDER = 'rgba(255,255,255,0.06)'

export default function AdminIosWaitlist() {
  const [signups, setSignups] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    loadSignups()
    // Subscribe to real-time updates
    const subscription = supabase
      .channel('landing_email_signups')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'landing_email_signups' }, (payload) => {
        // Filtrer en code pour ne garder que iOS
        if (payload.new.source === 'ios_waitlist') {
          setSignups(prev => [payload.new, ...prev])
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'landing_email_signups' }, (payload) => {
        setSignups(prev => prev.filter(s => s.id !== payload.old.id))
      })
      .subscribe()

    return () => subscription.unsubscribe()
  }, [])

  async function loadSignups() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('landing_email_signups')
        .select('*')
        .eq('source', 'ios_waitlist')
        .order('created_at', { ascending: false })

      if (error) throw error
      setSignups(data || [])
    } catch (err) {
      console.error('Erreur chargement iOS signups:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Supprimer cette inscription ?')) return
    
    try {
      setDeleting(id)
      const { error } = await supabase
        .from('landing_email_signups')
        .delete()
        .eq('id', id)

      if (error) throw error
      setSignups(prev => prev.filter(s => s.id !== id))
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
          <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700 }}>Testeurs Bêta</h2>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
            Utilisateurs inscrits pour tester l'app en bêta
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
          {signups.length} inscriptions
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>Chargement...</p>
      ) : signups.length === 0 ? (
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
          {signups.map(signup => (
            <div
              key={signup.id}
              style={{
                background: SURFACE,
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: 16,
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 16,
                alignItems: 'center',
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
                    🍎 iOS
                  </span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                    {new Date(signup.created_at).toLocaleDateString('fr-FR', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>

                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'white' }}>
                  <span style={{ cursor: 'pointer', textDecoration: 'underline', color: CYAN }}
                        onClick={() => copyToClipboard(signup.email)}>
                    {signup.email}
                  </span>
                </p>
              </div>

              {/* Delete button */}
              <button
                onClick={() => handleDelete(signup.id)}
                disabled={deleting === signup.id}
                style={{
                  padding: '8px 14px',
                  borderRadius: 6,
                  border: `1px solid rgba(255,68,68,0.5)`,
                  background: 'transparent',
                  color: deleting === signup.id ? 'rgba(255,68,68,0.5)' : '#ff4444',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: deleting === signup.id ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  if (deleting !== signup.id) {
                    e.target.style.background = 'rgba(255,68,68,0.1)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent'
                }}
              >
                {deleting === signup.id ? '⏳' : '🗑️ Supprimer'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
