import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { User, X, Mail, Phone, MapPin, Building2 } from 'lucide-react'
import { getUserById } from '@/api/admin.api'

interface Props {
  userId: string
  label?: string
  variant?: 'client' | 'chauffeur'
}

export default function UserInfoButton({ userId, label, variant = 'client' }: Props) {
  const [open, setOpen] = useState(false)

  const { data: user, isLoading } = useQuery({
    queryKey: ['user-info', userId],
    queryFn: () => getUserById(userId),
    enabled: open && !!userId,
    staleTime: 60_000,
  })

  const isClient   = variant === 'client'
  const accent     = isClient ? '#f59e0b' : '#8b5cf6'
  const btnClass   = isClient
    ? 'text-amber-400 border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/15'
    : 'text-purple-400 border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/15'

  const fullName = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : ''
  const initials = fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
              || user?.username?.[0]?.toUpperCase() || '?'
  const phone    = (user as any)?.attributes?.phone?.[0]   || (user as any)?.phone
  const company  = (user as any)?.attributes?.company?.[0] || (user as any)?.company
  const address  = (user as any)?.attributes?.address?.[0]

  return (
    <>
      <button onClick={() => setOpen(true)}
        className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border transition-colors ${btnClass}`}>
        <User className="w-3 h-3" />
        {label ?? (isClient ? 'Client' : 'Chauffeur')}
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)} />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative z-10 w-80 rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }}>

            {/* Bandeau coloré en haut */}
            <div className="h-16 w-full relative"
              style={{ background: `linear-gradient(135deg, ${accent}cc, ${accent}55)` }}>
              <button onClick={() => setOpen(false)}
                className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                style={{ background: 'rgba(0,0,0,0.25)' }}>
                <X className="w-3.5 h-3.5 text-white" />
              </button>
            </div>

            {/* Avatar chevauchant le bandeau */}
            <div className="px-5 pb-4">
              <div className="flex items-end gap-3 -mt-8 mb-3">
                <div className="w-16 h-16 rounded-xl border-4 flex items-center justify-center text-white font-bold text-xl shadow-lg flex-shrink-0"
                  style={{ background: accent, borderColor: '#0f172a' }}>
                  {isLoading ? '…' : initials}
                </div>
                <div className="pb-1">
                  <p className="text-white font-bold text-base leading-tight">
                    {isLoading ? '…' : (fullName || user?.username || '—')}
                  </p>
                  <p className="text-xs font-medium mt-0.5" style={{ color: accent }}>
                    {isClient ? 'Client' : 'Chauffeur'}
                  </p>
                </div>
              </div>

              {/* Infos */}
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <div className="w-5 h-5 border-2 rounded-full animate-spin"
                    style={{ borderColor: `${accent}33`, borderTopColor: accent }} />
                </div>
              ) : user ? (
                <div className="space-y-1.5 mt-2">
                  {user.email   && <Field icon={<Mail      size={13}/>} value={user.email}   accent={accent} />}
                  {phone        && <Field icon={<Phone     size={13}/>} value={phone}        accent={accent} />}
                  {company      && <Field icon={<Building2 size={13}/>} value={company}      accent={accent} />}
                  {address      && <Field icon={<MapPin    size={13}/>} value={address}      accent={accent} />}
                  {!user.email && !phone && !company && !address && (
                    <p className="text-white/40 text-xs text-center py-2">Aucun contact renseigné</p>
                  )}
                </div>
              ) : (
                <p className="text-white/40 text-sm text-center py-3">Introuvable</p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}

function Field({ icon, value, accent }: { icon: React.ReactNode; value: string; accent: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg px-3 py-2"
      style={{ background: 'rgba(255,255,255,0.05)' }}>
      <span className="flex-shrink-0" style={{ color: accent }}>{icon}</span>
      <span className="text-white text-sm truncate">{value}</span>
    </div>
  )
}
