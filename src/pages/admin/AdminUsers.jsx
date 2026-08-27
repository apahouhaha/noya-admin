import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const CYAN = '#00F2FF'
const SURFACE = '#0F0C1B'
const BORDER = 'rgba(255,255,255,0.06)'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editEmail, setEditEmail] = useState(null) // { userId, currentEmail }
  const [newEmail, setNewEmail] = useState('')
  const [actionMsg, setActionMsg] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, username, first_name, last_name, email, role, created_at, is_admin')
      .order('created_at', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }

  const filtered = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    `${u.first_name} ${u.last_name}`.toLowerCase().includes(search.toLowerCase())
  )

  async function handleChangeEmail() {
    if (!newEmail.trim() || !editEmail) return
    setActionLoading(true)
    setActionMsg(null)

    try {
      // Mettre à jour dans profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ email: newEmail.trim().toLowerCase() })
        .eq('id', editEmail.userId)

      if (profileError) throw profileError

      // Mettre à jour dans merchant_accounts si applicable
      await supabase
        .from('merchant_accounts')
        .update({ email: newEmail.trim().toLowerCase() })
        .eq('user_id', editEmail.userId)

      // Mettre à jour auth.users via fonction SQL sécurisée (SECURITY DEFINER)
      const { error: rpcError } = await supabase.rpc('admin_update_user_email', {
        target_user_id: editEmail.userId,
        new_email: newEmail.trim().toLowerCase(),
      })
      if (rpcError) throw rpcError

      setActionMsg({ type: 'success', text: `Email mis à jour pour ${newEmail.trim().toLowerCase()}` })
      setEditEmail(null)
      setNewEmail('')
      load()
    } catch (e) {
      setActionMsg({ type: 'error', text: e.message })
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Utilisateurs ({users.length})</h2>
        <input
          placeholder="Rechercher par email, nom..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '8px 14px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, color: 'white', fontSize: 13, width: 280, outline: 'none' }}
        />
      </div>

      {actionMsg && (
        <div style={{ padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, background: actionMsg.type === 'success' ? 'rgba(0,255,136,0.1)' : 'rgba(255,68,68,0.1)', color: actionMsg.type === 'success' ? '#00FF88' : '#ff6666', border: `1px solid ${actionMsg.type === 'success' ? 'rgba(0,255,136,0.2)' : 'rgba(255,68,68,0.2)'}` }}>
          {actionMsg.text}
        </div>
      )}

      {/* Modal changement email */}
      {editEmail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1a1625', borderRadius: 16, padding: 32, maxWidth: 440, width: '100%', border: `1px solid ${BORDER}` }}>
            <h3 style={{ margin: '0 0 8px', color: CYAN }}>Changer l'email</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Actuel : <strong style={{ color: 'white' }}>{editEmail.currentEmail}</strong></p>
            <input
              type="email"
              autoFocus
              placeholder="nouveau@email.com"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', background: '#0F0C1B', border: `1px solid ${BORDER}`, borderRadius: 8, color: 'white', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 16 }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setEditEmail(null); setNewEmail('') }} style={{ flex: 1, padding: '10px', background: 'transparent', border: `1px solid ${BORDER}`, color: 'rgba(255,255,255,0.5)', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>
                Annuler
              </button>
              <button onClick={handleChangeEmail} disabled={actionLoading || !newEmail.trim()} style={{ flex: 1, padding: '10px', background: CYAN, color: 'black', fontWeight: 700, border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, opacity: actionLoading || !newEmail.trim() ? 0.5 : 1 }}>
                {actionLoading ? '...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>Chargement...</p>
      ) : (
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {['Nom', 'Email', 'Rôle', 'Inscrit le', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((user, i) => (
                <tr key={user.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>
                    <div style={{ fontWeight: 600 }}>{user.first_name || user.username || '—'} {user.last_name || ''}</div>
                    {user.is_admin && <span style={{ fontSize: 10, color: CYAN }}>ADMIN</span>}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }}>{user.email || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12 }}>
                    <span style={{ background: user.role === 'merchant' ? 'rgba(189,0,255,0.15)' : 'rgba(255,255,255,0.06)', color: user.role === 'merchant' ? '#BD00FF' : 'rgba(255,255,255,0.5)', padding: '3px 8px', borderRadius: 4 }}>
                      {user.role || 'client'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                    {new Date(user.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button
                      onClick={() => { setEditEmail({ userId: user.id, currentEmail: user.email }); setNewEmail(''); setActionMsg(null) }}
                      style={{ padding: '5px 12px', background: 'rgba(0,242,255,0.08)', border: `1px solid rgba(0,242,255,0.2)`, color: CYAN, borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                    >
                      Changer email
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: 40, margin: 0 }}>Aucun résultat</p>
          )}
        </div>
      )}
    </div>
  )
}
