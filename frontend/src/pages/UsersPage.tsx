import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, KeyRound, ToggleLeft, ToggleRight } from 'lucide-react'
import { usersApi } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import type { User, UserRole } from '../types'
import { USER_ROLE_LABELS } from '../types'
import toast from 'react-hot-toast'

const ROLES: UserRole[] = [
  'DIRECTEUR_FINANCIER', 'COMPTABLE', 'TRESORIER',
  'CONTROLEUR_GESTION', 'AUDITEUR_INTERNE', 'ADMINISTRATEUR'
]

const roleBadgeColor: Record<UserRole, string> = {
  DIRECTEUR_FINANCIER: 'badge-purple',
  COMPTABLE: 'badge-blue',
  TRESORIER: 'badge-blue',
  CONTROLEUR_GESTION: 'badge-orange',
  AUDITEUR_INTERNE: 'badge-gray',
  ADMINISTRATEUR: 'badge-red',
}

type UserForm = { first_name: string; last_name: string; email: string; role: UserRole; password?: string }

export default function UsersPage() {
  const qc = useQueryClient()
  const { user: me } = useAuth()

  const [editModal, setEditModal] = useState<Partial<User> | null>(null)
  const [createModal, setCreateModal] = useState(false)
  const [pwModal, setPwModal] = useState<number | null>(null)
  const [newPw, setNewPw] = useState('')
  const [form, setForm] = useState<UserForm>({ first_name: '', last_name: '', email: '', role: 'COMPTABLE', password: '' })

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then(r => r.data),
  })
  const users: User[] = usersData?.results ?? usersData ?? []

  const createUser = useMutation({
    mutationFn: (data: UserForm) => usersApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setCreateModal(false)
      setForm({ first_name: '', last_name: '', email: '', role: 'COMPTABLE', password: '' })
      toast.success('Utilisateur créé')
    },
    onError: (e: any) => toast.error(e.response?.data?.email?.[0] || e.response?.data?.detail || 'Erreur'),
  })

  const updateUser = useMutation({
    mutationFn: (data: Partial<User>) => usersApi.update(data.id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setEditModal(null)
      toast.success('Utilisateur mis à jour')
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  })

  const toggleActive = useMutation({
    mutationFn: (id: number) => usersApi.toggleActive(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Statut modifié') },
  })

  const resetPassword = useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) => usersApi.resetPassword(id, password),
    onSuccess: () => { setPwModal(null); setNewPw(''); toast.success('Mot de passe réinitialisé') },
    onError: () => toast.error('Erreur lors de la réinitialisation'),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Utilisateurs</h1>
          <p className="text-slate-500 mt-1">Gérez les accès et les rôles</p>
        </div>
        <button onClick={() => setCreateModal(true)} className="btn-primary">
          <Plus size={16} /> Nouvel utilisateur
        </button>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-10">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary-600" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Utilisateur</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Rôle</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Statut</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Dernière connexion</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900">{u.first_name} {u.last_name}</p>
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className={roleBadgeColor[u.role as UserRole]}>{USER_ROLE_LABELS[u.role as UserRole]}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={u.is_active ? 'badge-green' : 'badge-gray'}>
                      {u.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-500 text-xs">
                    {u.last_login ? new Date(u.last_login).toLocaleDateString('fr-FR') : 'Jamais'}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => setEditModal(u)} title="Modifier"
                        className="p-1.5 hover:bg-slate-100 rounded text-slate-500">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setPwModal(u.id)} title="Réinitialiser mot de passe"
                        className="p-1.5 hover:bg-slate-100 rounded text-slate-500">
                        <KeyRound size={14} />
                      </button>
                      {u.id !== me?.id && (
                        <button onClick={() => toggleActive.mutate(u.id)} title={u.is_active ? 'Désactiver' : 'Activer'}
                          className="p-1.5 hover:bg-slate-100 rounded text-slate-500">
                          {u.is_active ? <ToggleRight size={16} className="text-emerald-600" /> : <ToggleLeft size={16} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400">Aucun utilisateur</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      {createModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Nouvel utilisateur</h3>
            <form onSubmit={e => { e.preventDefault(); createUser.mutate(form) }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Prénom *</label>
                  <input className="input" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} required /></div>
                <div><label className="label">Nom *</label>
                  <input className="input" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} required /></div>
              </div>
              <div><label className="label">Email *</label>
                <input type="email" className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></div>
              <div>
                <label className="label">Rôle *</label>
                <select className="input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value as UserRole })} required>
                  {ROLES.map(r => <option key={r} value={r}>{USER_ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              <div><label className="label">Mot de passe *</label>
                <input type="password" className="input" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={8} /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setCreateModal(false)} className="btn-secondary flex-1 justify-center">Annuler</button>
                <button type="submit" disabled={createUser.isPending} className="btn-primary flex-1 justify-center">
                  {createUser.isPending ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Modifier l'utilisateur</h3>
            <form onSubmit={e => { e.preventDefault(); updateUser.mutate(editModal) }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Prénom</label>
                  <input className="input" value={editModal.first_name ?? ''} onChange={e => setEditModal({ ...editModal, first_name: e.target.value })} /></div>
                <div><label className="label">Nom</label>
                  <input className="input" value={editModal.last_name ?? ''} onChange={e => setEditModal({ ...editModal, last_name: e.target.value })} /></div>
              </div>
              <div>
                <label className="label">Rôle</label>
                <select className="input" value={editModal.role ?? ''} onChange={e => setEditModal({ ...editModal, role: e.target.value as UserRole })}>
                  {ROLES.map(r => <option key={r} value={r}>{USER_ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditModal(null)} className="btn-secondary flex-1 justify-center">Annuler</button>
                <button type="submit" disabled={updateUser.isPending} className="btn-primary flex-1 justify-center">
                  {updateUser.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {pwModal !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Réinitialiser le mot de passe</h3>
            <form onSubmit={e => { e.preventDefault(); resetPassword.mutate({ id: pwModal, password: newPw }) }} className="space-y-4">
              <div>
                <label className="label">Nouveau mot de passe *</label>
                <input type="password" className="input" value={newPw} onChange={e => setNewPw(e.target.value)} required minLength={8} autoFocus />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setPwModal(null); setNewPw('') }} className="btn-secondary flex-1 justify-center">Annuler</button>
                <button type="submit" disabled={resetPassword.isPending || !newPw} className="btn-primary flex-1 justify-center">
                  {resetPassword.isPending ? '...' : 'Réinitialiser'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
