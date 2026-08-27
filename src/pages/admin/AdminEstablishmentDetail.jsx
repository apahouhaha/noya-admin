import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const CYAN = '#00F2FF'
const SURFACE = '#0F0C1B'
const BORDER = 'rgba(255,255,255,0.06)'
const GREEN = '#00FF88'
const RED = '#ff4444'
const ORANGE = '#FF8C00'
const PURPLE = '#BD00FF'

export default function AdminEstablishmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [estab, setEstab] = useState(null)
  const [merchant, setMerchant] = useState(null)
  const [stats, setStats] = useState(null)
  const [pending, setPending] = useState([])
  const [recentResas, setRecentResas] = useState([])
  const [loading, setLoading] = useState(true)

  const [newEmail, setNewEmail] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailMsg, setEmailMsg] = useState(null)
  const [newSlug, setNewSlug] = useState('')
  const [slugLoading, setSlugLoading] = useState(false)
  const [slugMsg, setSlugMsg] = useState(null)

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const [{ data: e }, { data: allResas }, { data: pendingResas }, { data: recent }] = await Promise.all([
      supabase.from('establishments').select('*').eq('id', id).maybeSingle(),
      supabase.from('reservations').select('status, created_at, start_time, party_size').eq('establishment_id', id),
      supabase.from('reservations').select('id, created_at, start_time, party_size, client_name, client_email, status').eq('establishment_id', id).eq('status', 'pending').order('created_at', { ascending: true }),
      supabase.from('reservations').select('id, created_at, start_time, party_size, client_name, status').eq('establishment_id', id).order('created_at', { ascending: false }).limit(10),
    ])

    // Récupérer le marchand
    let merchant = null
    if (e?.id) {
      const { data: m } = await supabase.from('merchant_accounts').select('*').eq('establishment_id', e.id).maybeSingle()
      if (m?.user_id) {
        const { data: profile } = await supabase.from('profiles').select('email').eq('id', m.user_id).maybeSingle()
        merchant = { ...m, email: m.email || profile?.email }
      } else {
        merchant = m
      }
    }

    setEstab(e)
    setMerchant(merchant)
    setNewSlug(e?.reservation_slug || '')
    setPending(pendingResas || [])
    setRecentResas(recent || [])

    if (allResas) {
      const all = allResas
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const last7 = new Date(now - 7 * 24 * 60 * 60 * 1000)
      const last30 = new Date(now - 30 * 24 * 60 * 60 * 1000)
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

      const byStatus = (s) => all.filter(r => r.status === s)
      const inPeriod = (list, from) => list.filter(r => new Date(r.created_at) >= from)

      const confirmed = byStatus('confirmed')
      const refused = byStatus('refused')
      const noShow = byStatus('no_show')
      const pendingAll = byStatus('pending')
      const cancelled = all.filter(r => r.status?.startsWith('cancelled'))

      const thisMonth = inPeriod(all, thisMonthStart)
      const lastMonth = all.filter(r => new Date(r.created_at) >= lastMonthStart && new Date(r.created_at) < thisMonthStart)
      const last30days = inPeriod(all, last30)

      // Pending > 24h
      const pendingOld = pendingAll.filter(r => {
        const age = (now - new Date(r.created_at)) / 1000 / 3600
        return age > 24
      })

      // Taux
      const confirmRate = all.length ? Math.round((confirmed.length / all.length) * 100) : 0
      const refuseRate = all.length ? Math.round((refused.length / all.length) * 100) : 0
      const noShowRate = all.length ? Math.round((noShow.length / all.length) * 100) : 0
      const avgPartySize = all.length ? (all.reduce((s, r) => s + (r.party_size || 0), 0) / all.length).toFixed(1) : 0

      // Dernière résa
      const sorted = [...all].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      const lastResaDate = sorted[0]?.created_at
      const daysSinceLastResa = lastResaDate ? Math.floor((now - new Date(lastResaDate)) / 1000 / 3600 / 24) : null

      // Warnings
      const warnings = []
      if (pendingOld.length > 0) warnings.push({ level: 'error', msg: `${pendingOld.length} réservation(s) en attente depuis plus de 24h` })
      if (refuseRate > 30) warnings.push({ level: 'warning', msg: `Taux de refus élevé : ${refuseRate}%` })
      if (noShowRate > 15) warnings.push({ level: 'warning', msg: `Taux de no-show élevé : ${noShowRate}%` })
      if (!e?.reservations_enabled) warnings.push({ level: 'info', msg: 'Réservations désactivées' })
      if (daysSinceLastResa !== null && daysSinceLastResa > 30 && all.length > 0) warnings.push({ level: 'warning', msg: `Aucune réservation depuis ${daysSinceLastResa} jours` })
      if (pendingAll.length > 5) warnings.push({ level: 'warning', msg: `${pendingAll.length} demandes en attente` })

      setStats({
        total: all.length,
        thisMonth: thisMonth.length,
        lastMonth: lastMonth.length,
        last30days: last30days.length,
        confirmed: confirmed.length,
        refused: refused.length,
        noShow: noShow.length,
        pendingCount: pendingAll.length,
        cancelled: cancelled.length,
        confirmRate,
        refuseRate,
        noShowRate,
        avgPartySize,
        daysSinceLastResa,
        warnings,
        trend: lastMonth.length ? Math.round(((thisMonth.length - lastMonth.length) / lastMonth.length) * 100) : null,
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
      const { error } = await supabase.from('establishments').update({ reservation_slug: slug }).eq('id', id)
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

  function formatDate(d) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  const statusLabel = { pending: 'En attente', confirmed: 'Confirmée', refused: 'Refusée', no_show: 'No-show', cancelled_by_client: 'Annulée client', cancelled_by_merchant: 'Annulée marchand' }
  const statusColor = { pending: ORANGE, confirmed: GREEN, refused: RED, no_show: '#888', cancelled_by_client: '#666', cancelled_by_merchant: '#666' }

  if (loading) return <p style={{ color: 'rgba(255,255,255,0.4)' }}>Chargement...</p>
  if (!estab) return <p style={{ color: RED }}>Établissement introuvable</p>

  return (
    <div style={{ maxWidth: 960 }}>
      {/* Retour */}
      <button onClick={() => navigate('/admin/etablissements')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 13, marginBottom: 20, padding: 0 }}>
        ← Établissements
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800 }}>{estab.name}</h2>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
            {estab.street}, {estab.zip_code} {estab.city} · {estab.type}
          </p>
        </div>
        <button onClick={toggleReservations} style={{
          padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
          background: estab.reservations_enabled ? 'rgba(255,68,68,0.15)' : 'rgba(0,255,136,0.15)',
          color: estab.reservations_enabled ? RED : GREEN,
        }}>
          {estab.reservations_enabled ? '⏸ Désactiver réservations' : '▶ Activer réservations'}
        </button>
      </div>

      {/* Warnings */}
      {stats?.warnings?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {stats.warnings.map((w, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, marginBottom: 8,
              background: w.level === 'error' ? 'rgba(255,68,68,0.1)' : w.level === 'warning' ? 'rgba(255,140,0,0.1)' : 'rgba(0,242,255,0.08)',
              border: `1px solid ${w.level === 'error' ? 'rgba(255,68,68,0.3)' : w.level === 'warning' ? 'rgba(255,140,0,0.3)' : 'rgba(0,242,255,0.2)'}`,
            }}>
              <span>{w.level === 'error' ? '🚨' : w.level === 'warning' ? '⚠️' : 'ℹ️'}</span>
              <span style={{ fontSize: 13, color: w.level === 'error' ? RED : w.level === 'warning' ? ORANGE : CYAN }}>{w.msg}</span>
            </div>
          ))}
        </div>
      )}

      {/* KPIs */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Total', value: stats.total, color: CYAN },
            { label: '30 derniers jours', value: stats.last30days, color: PURPLE, sub: stats.trend !== null ? `${stats.trend > 0 ? '+' : ''}${stats.trend}% vs mois préc.` : null },
            { label: 'En attente', value: stats.pendingCount, color: stats.pendingCount > 3 ? ORANGE : 'white' },
            { label: 'Confirmées', value: stats.confirmed, color: GREEN },
            { label: 'Refusées', value: stats.refused, color: stats.refuseRate > 30 ? RED : 'white' },
            { label: 'No-shows', value: stats.noShow, color: stats.noShowRate > 15 ? RED : 'white' },
            { label: 'Annulées', value: stats.cancelled, color: 'rgba(255,255,255,0.4)' },
          ].map(s => (
            <div key={s.label} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: s.color }}>{s.value}</div>
              {s.sub && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{s.sub}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Taux */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
          <RateCard label="Taux de confirmation" value={stats.confirmRate} good={70} warn={40} />
          <RateCard label="Taux de refus" value={stats.refuseRate} good={10} warn={30} reverse />
          <RateCard label="Taux de no-show" value={stats.noShowRate} good={5} warn={15} reverse />
        </div>
      )}

      {/* Infos supplémentaires */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
          <InfoCard label="Groupe moyen" value={`${stats.avgPartySize} pers.`} />
          <InfoCard label="Ce mois" value={`${stats.thisMonth} résa`} sub={`${stats.lastMonth} le mois dernier`} />
          <InfoCard label="Dernière résa" value={stats.daysSinceLastResa !== null ? (stats.daysSinceLastResa === 0 ? "Aujourd'hui" : `Il y a ${stats.daysSinceLastResa}j`) : '—'} color={stats.daysSinceLastResa > 30 ? ORANGE : GREEN} />
        </div>
      )}

      {/* Pending réservations */}
      {pending.length > 0 && (
        <Section title={`🕐 Réservations en attente (${pending.length})`}>
          {pending.map(r => {
            const ageHours = Math.floor((new Date() - new Date(r.created_at)) / 1000 / 3600)
            return (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${BORDER}` }}>
                <div>
                  <div style={{ fontSize: 13, color: 'white' }}>{r.client_name} · {r.party_size} pers.</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Pour le {formatDate(r.start_time)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: ageHours > 24 ? RED : ORANGE }}>Reçue il y a {ageHours}h</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{r.client_email}</div>
                </div>
              </div>
            )
          })}
        </Section>
      )}

      {/* Dernières réservations */}
      {recentResas.length > 0 && (
        <Section title="📋 Dernières réservations">
          {recentResas.map(r => (
            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${BORDER}` }}>
              <div>
                <span style={{ fontSize: 13, color: 'white' }}>{r.client_name}</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginLeft: 8 }}>{r.party_size} pers. · {formatDate(r.start_time)}</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: statusColor[r.status] || 'white' }}>
                {statusLabel[r.status] || r.status}
              </span>
            </div>
          ))}
        </Section>
      )}

      {/* Config */}
      <Section title="⚙️ Configuration">
        <Row label="Réservations" value={estab.reservations_enabled ? '✅ Activées' : '❌ Désactivées'} />
        <Row label="Auto-validation" value={estab.auto_validation ? '✅ Oui' : '❌ Non'} />
        <Row label="Capacité" value={`${estab.capacity_max || '—'} couverts`} />
        <Row label="Durée repas" value={`${estab.meal_duration_minutes || '—'} min`} />
        <Row label="Durée slot" value={`${estab.slot_duration || '—'} min`} />
        <Row label="Walk-in" value={`${estab.walk_in_percentage || 0}%`} />
        <Row label="Email notifs" value={estab.reservation_notification_email || 'Même que le compte'} />
        <Row label="Tél. résa" value={estab.reservation_phone || '—'} />
      </Section>

      {/* Compte marchand */}
      <Section title="👤 Compte marchand">
        <Row label="Email" value={merchant?.email || '—'} />
        <Row label="Premium" value={merchant?.is_premium ? '✅ Oui' : '❌ Non'} />
        <Row label="Pioneer" value={merchant?.is_pioneer ? '✅ Oui' : '❌ Non'} />
        <Row label="User ID" value={<code style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{merchant?.user_id || '—'}</code>} />
        <Row label="Étab. ID" value={<code style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{estab.id}</code>} />
        <Row label="Slug URL" value={<code style={{ color: CYAN }}>{estab.reservation_slug || '—'}</code>} />
      </Section>

      {/* Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Changer email */}
        <Section title="✉️ Changer l'email">
          <p style={{ margin: '0 0 10px', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Actuel : <strong style={{ color: 'white' }}>{merchant?.email || '—'}</strong></p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input type="email" placeholder="nouveau@email.com" value={newEmail} onChange={e => setNewEmail(e.target.value)}
              style={{ padding: '8px 12px', background: '#16122C', border: `1px solid ${BORDER}`, borderRadius: 8, color: 'white', fontSize: 13, outline: 'none' }} />
            <button onClick={handleChangeEmail} disabled={emailLoading || !newEmail.trim()}
              style={{ padding: '8px', background: CYAN, color: 'black', fontWeight: 700, border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, opacity: emailLoading || !newEmail.trim() ? 0.5 : 1 }}>
              {emailLoading ? '...' : 'Changer'}
            </button>
          </div>
          {emailMsg && <p style={{ margin: '8px 0 0', fontSize: 12, color: emailMsg.type === 'success' ? GREEN : RED }}>{emailMsg.type === 'success' ? '✅ ' : '❌ '}{emailMsg.text}</p>}
        </Section>

        {/* Changer slug */}
        <Section title="🔗 URL de réservation">
          <p style={{ margin: '0 0 10px', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            <code style={{ color: CYAN }}>reservations.noyalive.fr/{estab.reservation_slug || estab.id}</code>
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input value={newSlug} onChange={e => setNewSlug(e.target.value)}
              style={{ padding: '8px 12px', background: '#16122C', border: `1px solid ${BORDER}`, borderRadius: 8, color: 'white', fontSize: 13, outline: 'none', fontFamily: 'monospace' }} />
            <button onClick={handleChangeSlug} disabled={slugLoading || !newSlug.trim()}
              style={{ padding: '8px', background: CYAN, color: 'black', fontWeight: 700, border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, opacity: slugLoading || !newSlug.trim() ? 0.5 : 1 }}>
              {slugLoading ? '...' : 'Mettre à jour'}
            </button>
          </div>
          {slugMsg && <p style={{ margin: '8px 0 0', fontSize: 12, color: slugMsg.type === 'success' ? GREEN : RED }}>{slugMsg.type === 'success' ? '✅ ' : '❌ '}{slugMsg.text}</p>}
        </Section>
      </div>
    </div>
  )
}

function RateCard({ label, value, good, warn, reverse }) {
  const color = reverse
    ? value <= good ? GREEN : value <= warn ? ORANGE : RED
    : value >= good ? GREEN : value >= warn ? ORANGE : RED
  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color }}>{value}%</div>
    </div>
  )
}

function InfoCard({ label, value, sub, color }) {
  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || 'white' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
      <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.8 }}>{title}</h3>
      {children}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${BORDER}` }}>
      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{label}</span>
      <span style={{ fontSize: 13, color: 'white' }}>{value}</span>
    </div>
  )
}
