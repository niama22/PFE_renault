import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { User, MapPin, Save, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import Header from '@/components/layout/Header'
import { useAuthStore } from '@/store/auth.store'
import { useProfileStore } from '@/store/profile.store'

const profileSchema = z.object({
  firstName:  z.string().min(1, 'Requis'),
  lastName:   z.string().min(1, 'Requis'),
  phone:      z.string().optional(),
  company:    z.string().optional(),
  street:     z.string().min(3, 'Requis'),
  city:       z.string().min(2, 'Requis'),
  postalCode: z.string().min(4, 'Requis'),
  country:    z.string().min(2, 'Requis'),
})
type ProfileForm = z.infer<typeof profileSchema>

export default function ClientProfilePage() {
  const { user } = useAuthStore()
  const { profile, saveProfile } = useProfileStore()
  const [saved, setSaved] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName:  profile?.firstName  ?? user?.firstName ?? '',
      lastName:   profile?.lastName   ?? user?.lastName  ?? '',
      phone:      profile?.phone      ?? '',
      company:    profile?.company    ?? '',
      street:     profile?.address?.street     ?? '',
      city:       profile?.address?.city       ?? '',
      postalCode: profile?.address?.postalCode ?? '',
      country:    profile?.address?.country    ?? 'France',
    },
  })

  function onSubmit(data: ProfileForm) {
    saveProfile({
      firstName: data.firstName,
      lastName:  data.lastName,
      phone:     data.phone,
      company:   data.company,
      address: {
        street:     data.street,
        city:       data.city,
        postalCode: data.postalCode,
        country:    data.country,
      },
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Mon profil" subtitle="Vos informations personnelles et adresse de livraison par défaut" />

      <div className="flex-1 p-6 max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* Infos personnelles */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-brand-400" />
              Informations personnelles
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Prénom</label>
                <input {...register('firstName')} className="input-dark w-full" />
                {errors.firstName && <p className="text-xs text-red-400 mt-1">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Nom</label>
                <input {...register('lastName')} className="input-dark w-full" />
                {errors.lastName && <p className="text-xs text-red-400 mt-1">{errors.lastName.message}</p>}
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Téléphone</label>
                <input {...register('phone')} className="input-dark w-full" placeholder="+33 6 00 00 00 00" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Entreprise</label>
                <input {...register('company')} className="input-dark w-full" placeholder="Votre société" />
              </div>
            </div>
          </motion.div>

          {/* Adresse par défaut */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-brand-400" />
              Adresse de livraison par défaut
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Cette adresse sera pré-remplie automatiquement lors de vos commandes.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Rue et numéro</label>
                <input {...register('street')} className="input-dark w-full" placeholder="12 Rue de la Paix" />
                {errors.street && <p className="text-xs text-red-400 mt-1">{errors.street.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Ville</label>
                  <input {...register('city')} className="input-dark w-full" placeholder="Paris" />
                  {errors.city && <p className="text-xs text-red-400 mt-1">{errors.city.message}</p>}
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Code postal</label>
                  <input {...register('postalCode')} className="input-dark w-full" placeholder="75001" />
                  {errors.postalCode && <p className="text-xs text-red-400 mt-1">{errors.postalCode.message}</p>}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Pays</label>
                <input {...register('country')} className="input-dark w-full" />
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="flex items-center gap-3">
            <button type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors">
              <Save className="w-4 h-4" />
              Enregistrer le profil
            </button>
            {saved && (
              <motion.span initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-1.5 text-sm text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                Profil sauvegardé
              </motion.span>
            )}
          </motion.div>
        </form>
      </div>
    </div>
  )
}
