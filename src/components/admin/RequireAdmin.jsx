import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function RequireAdmin({ children }) {
  const [status, setStatus] = useState('loading') // loading | admin | forbidden

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setStatus('forbidden'); return }

      const { data } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle()

      setStatus(data?.is_admin === true ? 'admin' : 'forbidden')
    }
    check()
  }, [])

  if (status === 'loading') return (
    <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '2px solid #00F2FF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (status === 'forbidden') return <Navigate to="/" replace />

  return children
}
