import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus, Search, ToggleLeft, ToggleRight, Key, Edit2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { getUsers, createUser, updateUser, disableUser, enableUser, resetPassword } from '@/api/admin.api'
import Header from '@/components/layout/Header'
import EmptyState from '@/components/shared/EmptyState'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import type { KeycloakUser } from '@/types'

const ROLES = [
  { value: 'ADMIN',       label: 'Admin' },
  { value: 'OPERATEUR',   label: 'Opérateur' },
  { value: 'RESPONSABLE', label: 'Responsable' },
  { value: 'CLIENT',      label: 'Client' },
  { value: 'CHAUFFEUR',   label: 'Chauffeur' },
]

const baseSchema = z.object({
  username:  z.string().min(3, 'Min 3 caractères'),
  email:     z.string().email('Email invalide'),
  firstName: z.string().min(1, 'Requis'),
  lastName:  z.string().min(1, 'Requis'),
  role:      z.string().min(1, 'Choisir un rôle'),
  password:  z.string().optional(),
})
const createSchema = baseSchema.extend({
  password: z.string().min(8, 'Min 8 caractères'),
})
const editSchema = baseSchema
type UserForm = z.infer<typeof baseSchema> & { password?: string }

function UserModal({ user, onClose }: { user?: KeycloakUser; onClose: () => void }) {
  const qc = useQueryClient()
  const isEdit = !!user

  const { register, handleSubmit, formState: { errors } } = useForm<UserForm>({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: {
      username:  user?.username ?? '',
      email:     user?.email ?? '',
      firstName: user?.firstName ?? '',
      lastName:  user?.lastName ?? '',
      role:      (user?.roles?.[0] ?? user?.realmRoles?.[0] ?? '').toUpperCase(),
      password:  '',
    },
  })

  const mutation = useMutation({
    mutationFn: (data: UserForm) =>
      isEdit
        ? updateUser(user!.id, { firstName: data.firstName, lastName: data.lastName, email: data.email, roles: [data.role] })
        : createUser({ username: data.username, email: data.email, firstName: data.firstName, lastName: data.lastName, password: data.password!, role: data.role }),
    onSuccess: () => {
      toast.success(isEdit ? 'Utilisateur mis à jour' : 'Utilisateur créé')
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      onClose()
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Une erreur est survenue'
      toast.error(msg)
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 glass p-6 w-full max-w-lg rounded-2xl shadow-2xl">
        <h2 className="text-slate-100 font-semibold text-base mb-5">
          {isEdit ? "Modifier l'utilisateur" : 'Créer un utilisateur'}
        </h2>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
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
          </div>
          {!isEdit && (
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Nom d'utilisateur</label>
              <input {...register('username')} className="input-dark w-full" />
              {errors.username && <p className="text-xs text-red-400 mt-1">{errors.username.message}</p>}
            </div>
          )}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Email</label>
            <input {...register('email')} type="email" className="input-dark w-full" />
            {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Rôle</label>
            <select {...register('role')} className="input-dark w-full">
              <option value="">Sélectionner...</option>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            {errors.role && <p className="text-xs text-red-400 mt-1">{errors.role.message}</p>}
          </div>
          {!isEdit && (
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Mot de passe</label>
              <input {...register('password')} type="password" className="input-dark w-full" />
              {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-navy-700 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-500 text-white transition-colors disabled:opacity-50">
              {mutation.isPending ? 'Chargement...' : (isEdit ? 'Enregistrer' : 'Créer')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default function UsersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [editUser, setEditUser] = useState<KeycloakUser | undefined>()
  const [showCreate, setShowCreate] = useState(false)
  const [confirmToggle, setConfirmToggle] = useState<KeycloakUser | null>(null)
  const [resetTarget, setResetTarget] = useState<KeycloakUser | null>(null)

  const { data: users = [], isLoading } = useQuery<KeycloakUser[]>({
    queryKey: ['admin-users'],
    queryFn: () => getUsers(),
  })

  const toggleMutation = useMutation({
    mutationFn: (u: KeycloakUser) => u.enabled ? disableUser(u.id) : enableUser(u.id),
    onSuccess: () => {
      toast.success('Statut mis à jour')
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      setConfirmToggle(null)
    },
    onError: () => toast.error('Erreur'),
  })

  const resetMutation = useMutation({
    mutationFn: (id: string) => resetPassword(id),
    onSuccess: () => { toast.success('Email envoyé'); setResetTarget(null) },
    onError: () => toast.error('Erreur'),
  })

  const filtered = users.filter((u: KeycloakUser) =>
    `${u.username} ${u.email} ${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Utilisateurs" subtitle="Gestion des comptes Keycloak" />

      <div className="flex-1 p-6 space-y-5">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..." className="input-dark w-full pl-9 text-sm" />
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" />
            Nouvel utilisateur
          </button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass overflow-hidden">
          {isLoading ? <PageLoader /> : filtered.length === 0 ? (
            <EmptyState title="Aucun utilisateur" description="Aucun résultat." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Utilisateur</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rôle</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Statut</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((u: KeycloakUser, i: number) => (
                  <motion.tr key={u.id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-white/4 hover:bg-white/2 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-xs font-bold text-brand-400">
                          {(u.firstName?.[0] ?? u.username[0]).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-slate-200 font-medium">{u.firstName} {u.lastName}</p>
                          <p className="text-xs text-slate-500">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 text-sm">{u.email}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-500/20 font-medium">
                        {(u.roles?.[0] ?? u.realmRoles?.[0] ?? '—').toLowerCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-medium ${u.enabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {u.enabled ? 'Actif' : 'Désactivé'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditUser(u)}
                          className="p-1.5 rounded-lg hover:bg-brand-600/15 text-slate-500 hover:text-brand-400 transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setResetTarget(u)}
                          className="p-1.5 rounded-lg hover:bg-amber-600/15 text-slate-500 hover:text-amber-400 transition-colors">
                          <Key className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setConfirmToggle(u)}
                          className="p-1.5 rounded-lg hover:bg-red-600/15 text-slate-500 hover:text-red-400 transition-colors">
                          {u.enabled
                            ? <ToggleLeft className="w-3.5 h-3.5" />
                            : <ToggleRight className="w-3.5 h-3.5 text-emerald-400" />}
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </motion.div>
      </div>

      {(showCreate || editUser) && (
        <UserModal user={editUser} onClose={() => { setShowCreate(false); setEditUser(undefined) }} />
      )}

      <ConfirmDialog
        open={!!confirmToggle}
        onOpenChange={v => !v && setConfirmToggle(null)}
        title={confirmToggle?.enabled ? "Désactiver l'utilisateur" : "Activer l'utilisateur"}
        description={`Voulez-vous ${confirmToggle?.enabled ? 'désactiver' : 'activer'} @${confirmToggle?.username} ?`}
        confirmLabel={confirmToggle?.enabled ? 'Désactiver' : 'Activer'}
        confirmVariant={confirmToggle?.enabled ? 'danger' : 'brand'}
        onConfirm={() => confirmToggle && toggleMutation.mutate(confirmToggle)}
        loading={toggleMutation.isPending}
      />

      <ConfirmDialog
        open={!!resetTarget}
        onOpenChange={v => !v && setResetTarget(null)}
        title="Réinitialiser le mot de passe"
        description={`Envoyer un email de réinitialisation à ${resetTarget?.email} ?`}
        confirmLabel="Envoyer"
        onConfirm={() => resetTarget && resetMutation.mutate(resetTarget.id)}
        loading={resetMutation.isPending}
      />
    </div>
  )
}
