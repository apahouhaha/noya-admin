import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const CYAN = '#00F2FF'
const SURFACE = '#0F0C1B'
const BORDER = 'rgba(255,255,255,0.06)'

export default function AdminEstablishmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [estab, setEstab] = useState(null)
  const [merchant, setMerchant] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  // Actions
  const [newEmail, setNewEmail] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailMsg, setEmailMsg] = useState(null)
  const [newSlug, setNewSlug] = useState('')
  const [slugLoading, setSlugLoading] = useState(false)
  const [slugMsg, setSlugMsg] = useState(null)

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const [{ data: e }, { data: m }, reservationsData] = await Promise.all([
      supabase.from('establishments').select('*').eq('id', id).maybeSingle(),
      supabase.from('merchant_accounts').select('*').eq('establishment_id', id).maybeSingle(),
      supabase.from('reservations').select('status, created_at, start_time').eq('establishment_id', id),
    ])
    setEstab(e)
    setMerchant(m)
    setNewSlug(e?.reservation_slug || '')

    // Calculer les stats
    if (reservationsData.data) {
      const all = reservationsData.data
      const now = new Date()
      const thisMonth = all.filter(r => new Date(r.created_at) > new Date(now.getFullYear(), now.getMonth(), 1))
      const confirmed = all.filter(r => r.status === 'confirmed')
      const refused = all.filter(r => r.status === 'refused')
      const noShow = all.filter(r => r.status === 'no_show')
      const cancelled = all.filter(r => r.status?.startsWith('cancelled'))
      setStats({
        total: all.length,
        thisMonth: thisMonth.length,
        confirmed: confirmed.length,
        refused: refused.length,
        noShow: noShow.length,
        cancelled: cancelled.length,
        confirmRate: all.length ? Math.round((confirmed.length / all.length) * 100) : 0,
      })
    }
    setLoading(false)
  }

  async function handleChangeEmail() {
    if (!newEmail.trim() || !merchant?.user_id) return
    setEmailLoading(true)
    setEmailMsg(null)
    try {
      const { error } = await supabase.rpc('admin_update_user_email', {
        target_user_id: merchant.user_id,
        new_email: newEmail.trim().toLowerCase(),
      })
      if (error) throw error
      setEmailMsg({ type: 'success', text: `Email mis à jour : ${newEmail.trim().toLowerCase()}` })
      setNewEmail('')
      load()
    } catch (e) {
      setEmailMsg({ type: 'error', text: e.message })
    } finally {
      setEmailLoading(false)
    }
  }

  async function handleChangeSlug() {
    if (!newSlug.trim()) return
    setSlugLoading(true)
    setSlugMsg(null)
    try {
      const slug = newSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
      const { error } = await supabase
        .from('establishments')
        .update({ reservation_slug: slug })
        .eq('id', id)
      if (error) throw error
      setSlugMsg({ type: 'success', text: `Slug mis à jour : ${slug}` })
      setNewSlug(slug)
      load()
    } catch (e) {
      setSlugMsg({ type: 'error', text: e.message })
    } finally {
      setSlugLoading(false)
    }
  }

  async function toggleReservations() {
    await supabase.from('establishments').update({ reservations_enabled: !estab.reservations_enabled }).eq('id', id)
    load()
  }

  if (loading) return <p style={{ color: 'rgba(255,255,255,0.4)' }}>Chargement...</p>
  if (!estab) return <p style={{ color: '#ff4444' }}>Établissement introuvable</p>

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Retour */}
      <button onClick={() => navigate('/admin/etablissements')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 13, marginBottom: 20, padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
        ← Établissements
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800 }}>{estab.name}</h2>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
            {estab.street}, {estab.zip_code} {estab.city} · {estab.type}
          </p>
        </div>
        <button
          onClick={toggleReservations}
          style={{
            padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
            background: estab.reservations_enabled ? 'rgba(255,68,68,0.15)' : 'rgba(0,255,136,0.15)',
            color: estab.reservations_enabled ? '#ff4444' : '#00FF88',
          }}
        >
          {estab.reservations_enabled ? '⏸ Désactiver réservations' : '▶ Activer réservations'}
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 24 }}>
          {[
            { label: 'Total réservations', value: stats.total, color: CYAN },
            { label: 'Ce mois', value: stats.thisMonth, color: '#BD00FF' },
            { label: 'Confirmées', value: stats.confirmed, color: '#00FF88' },
            { label: 'Refusées', value: stats.refused, color: '#ff4444' },
            { label: 'No-shows', value: stats.noShow, color: '#FF8C00' },
            { label: 'Annulées', value: stats.cancelled, color: 'rgba(255,255,255,0.4)' },
            { label: 'Taux confirmation', value: `${stats.confirmRate}%`, color: stats.confirmRate > 70 ? '#00FF88' : stats.confirmRate > 40 ? '#FF8C00' : '#ff4444' },
          ].map(s => (
            <div key={s.label} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Infos compte marchand */}
      <Section title="Compte marchand">
        <Row label="Email compte" value={merchant?.email || '—'} />
        <Row label="Email notifications résa" value={estab.reservation_notification_email || 'Même que le compte'} />
        <Row label="Téléphone résa" value={estab.reservation_phone || '—'} />
        <Row label="Premium" value={merchant?.is_premium ? '✅ Oui' : '❌ Non'} />
        <Row label="Pioneer" value={merchant?.is_pioneer ? '✅ Oui' : '❌ Non'} />
        <Row label="User ID" value={<code style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{merchant?.user_id || '—'}</code>} />
      </Section>

      {/* Action : changer email */}
      <Section title="Changer l'email du compte">
        <p style={{ margin: '0 0 12px', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
          Email actuel : <strong style={{ color: 'white' }}>{merchant?.email || '—'}</strong>
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="email"
            placeholder="nouveau@email.com"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            style={{ flex: 1, padding: '9px 12px', background: '#16122C', border: `1px solid ${BORDER}`, borderRadius: 8, color: 'white', fontSize: 13, outline: 'none' }}
          />
          <button
            onClick={handleChangeEmail}
            disabled={emailLoading || !newEmail.trim()}
            style={{ padding: '9px 18px', background: CYAN, color: 'black', fontWeight: 700, border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, opacity: emailLoading || !newEmail.trim() ? 0.5 : 1 }}
          >
            {emailLoading ? '...' : 'Changer'}
          </button>
        </div>
        {emailMsg && (
          <p style={{ margin: '8px 0 0', fontSize: 12, color: emailMsg.type === 'success' ? '#00FF88' : '#ff4444' }}>
            {emailMsg.type === 'success' ? '✅ ' : '❌ '}{emailMsg.text}
          </p>
        )}
      </Section>

      {/* Action : changer slug */}
      <Section title="URL de réservation (slug)">
        <p style={{ margin: '0 0 12px', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
          URL actuelle : <code style={{ color: CYAN }}>reservations.noyalive.fr/{estab.reservation_slug || estab.id}</code>
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={newSlug}
            onChange={e => setNewSlug(e.target.value)}
            style={{ flex: 1, padding: '9px 12px', background: '#16122C', border: `1px solid ${BORDER}`, borderRadius: 8, color: 'white', fontSize: 13, outline: 'none', fontFamily: 'monospace' }}
          />
          <button
            onClick={handleChangeSlug}
            disabled={slugLoading || !newSlug.trim()}
            style={{ padding: '9px 18px', background: CYAN, color: 'black', fontWeight: 700, border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, opacity: slugLoading || !newSlug.trim() ? 0.5 : 1 }}
          >
            {slugLoading ? '...' : 'Mettre à jour'}
          </button>
        </div>
        {slugMsg && (
          <p style={{ margin: '8px 0 0', fontSize: 12, color: slugMsg.type === 'success' ? '#00FF88' : '#ff4444' }}>
            {slugMsg.type === 'success' ? '✅ ' : '❌ '}{slugMsg.text}
          </p>
        )}
      </Section>

      {/* Infos techniques */}
      <Section title="Infos techniques">
        <Row label="ID" value={<code style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{estab.id}</code>} />
        <Row label="Slug" value={estab.reservation_slug || '—'} />
        <Row label="Auto-validation" value={estab.auto_validation ? '✅ Oui' : '❌ Non'} />
        <Row label="Capacité" value={`${estab.capacity_max || '—'} couverts`} />
        <Row label="Durée repas" value={`${estab.meal_duration_minutes || '—'} min`} />
        <Row label="Slot durée" value={`${estab.slot_duration || '—'} min`} />
        <Row label="Walk-in %" value={`${estab.walk_in_percentage || 0}%`} />
      </Section>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ background: '#0F0C1B', border: `1px solid rgba(255,255,255,0.06)`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.8 }}>{title}</h3>
      {children}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{label}</span>
      <span style={{ fontSize: 13, color: 'white' }}>{value}</span>
    </div>
  )
}
