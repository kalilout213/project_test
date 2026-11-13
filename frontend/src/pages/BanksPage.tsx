import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react'
import { banksApi, bankAccountsApi, currenciesApi } from '../services/api'
import type { Bank, BankAccount, Currency } from '../types'
import toast from 'react-hot-toast'

export default function BanksPage() {
  const [tab, setTab] = useState<'banks' | 'accounts'>('banks')
  const qc = useQueryClient()

  const { data: banksData } = useQuery({ queryKey: ['banks'], queryFn: () => banksApi.list().then(r => r.data) })
  const { data: accountsData } = useQuery({ queryKey: ['accounts'], queryFn: () => bankAccountsApi.list().then(r => r.data) })
  const { data: currenciesData } = useQuery({ queryKey: ['currencies'], queryFn: () => currenciesApi.list().then(r => r.data) })

  const banks: Bank[] = banksData?.results ?? banksData ?? []
  const accounts: BankAccount[] = accountsData?.results ?? accountsData ?? []
  const currencies: Currency[] = currenciesData?.results ?? currenciesData ?? []

  const [bankModal, setBankModal] = useState<Partial<Bank> | null>(null)
  const [accountModal, setAccountModal] = useState<Partial<BankAccount> | null>(null)

  const saveBank = useMutation({
    mutationFn: (data: Partial<Bank>) =>
      data.id ? banksApi.update(data.id, data) : banksApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['banks'] }); setBankModal(null); toast.success('Banque sauvegardée') },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  })

  const deleteBank = useMutation({
    mutationFn: (id: number) => banksApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['banks'] }); toast.success('Banque supprimée') },
    onError: () => toast.error('Impossible de supprimer (comptes liés ?)'),
  })

  const saveAccount = useMutation({
    mutationFn: (data: Partial<BankAccount>) =>
      data.id ? bankAccountsApi.update(data.id, data) : bankAccountsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounts'] }); setAccountModal(null); toast.success('Compte sauvegardé') },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  })

  const deleteAccount = useMutation({
    mutationFn: (id: number) => bankAccountsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounts'] }); toast.success('Compte supprimé') },
    onError: () => toast.error('Impossible de supprimer'),
  })

  const ACCOUNT_TYPES = ['PRINCIPAL', 'PAIE', 'FOURNISSEURS', 'INVESTISSEMENT', 'PROJET', 'TAXES', 'FILIALES']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Banques & Comptes</h1>
          <p className="text-slate-500 mt-1">Gérez vos banques et comptes bancaires</p>
        </div>
        <button
          onClick={() => tab === 'banks' ? setBankModal({}) : setAccountModal({})}
          className="btn-primary"
        >
          <Plus size={16} /> {tab === 'banks' ? 'Nouvelle banque' : 'Nouveau compte'}
        </button>
      </div>

      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        {(['banks', 'accounts'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm rounded-md transition-colors font-medium ${tab === t ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
            {t === 'banks' ? `Banques (${banks.length})` : `Comptes (${accounts.length})`}
          </button>
        ))}
      </div>

      {tab === 'banks' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Banque</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Pays</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">SWIFT</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Comptes</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {banks.map(b => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900">{b.name}</p>
                    <p className="text-xs text-slate-400">{b.code}</p>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{b.country}</td>
                  <td className="px-4 py-4 text-slate-600 font-mono text-xs">{b.swift_code || '—'}</td>
                  <td className="px-4 py-4 text-slate-600">{b.accounts_count}</td>
                  <td className="px-4 py-4">
                    <span className={b.is_active ? 'badge-green' : 'badge-red'}>{b.is_active ? 'Actif' : 'Inactif'}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setBankModal(b)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-700">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => { if (confirm('Supprimer cette banque ?')) deleteBank.mutate(b.id) }}
                        className="p-1.5 hover:bg-red-50 rounded text-slate-500 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {banks.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-400">Aucune banque configurée</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'accounts' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Compte</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Banque</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Type</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Devise</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accounts.map(a => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900">{a.account_name}</p>
                    <p className="text-xs text-slate-400 font-mono">{a.account_number}</p>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{a.bank_name}</td>
                  <td className="px-4 py-4"><span className="badge-blue">{a.account_type}</span></td>
                  <td className="px-4 py-4 text-slate-600">{a.currency_code}</td>
                  <td className="px-4 py-4">
                    <span className={a.is_active ? 'badge-green' : 'badge-red'}>{a.is_active ? 'Actif' : 'Inactif'}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setAccountModal(a)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => { if (confirm('Supprimer ce compte ?')) deleteAccount.mutate(a.id) }}
                        className="p-1.5 hover:bg-red-50 rounded text-slate-500 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {accounts.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-400">Aucun compte configuré</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Bank Modal */}
      {bankModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-slate-900 mb-4">{bankModal.id ? 'Modifier' : 'Nouvelle'} banque</h3>
            <form onSubmit={e => { e.preventDefault(); saveBank.mutate(bankModal) }} className="space-y-4">
              <div>
                <label className="label">Code *</label>
                <input className="input" value={bankModal.code ?? ''} onChange={e => setBankModal({ ...bankModal, code: e.target.value })} required />
              </div>
              <div>
                <label className="label">Nom *</label>
                <input className="input" value={bankModal.name ?? ''} onChange={e => setBankModal({ ...bankModal, name: e.target.value })} required />
              </div>
              <div>
                <label className="label">Pays</label>
                <input className="input" value={bankModal.country ?? "Côte d'Ivoire"} onChange={e => setBankModal({ ...bankModal, country: e.target.value })} />
              </div>
              <div>
                <label className="label">Code SWIFT</label>
                <input className="input" value={bankModal.swift_code ?? ''} onChange={e => setBankModal({ ...bankModal, swift_code: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="bank-active" checked={bankModal.is_active ?? true}
                  onChange={e => setBankModal({ ...bankModal, is_active: e.target.checked })} />
                <label htmlFor="bank-active" className="text-sm text-slate-700">Banque active</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setBankModal(null)} className="btn-secondary flex-1 justify-center">Annuler</button>
                <button type="submit" disabled={saveBank.isPending} className="btn-primary flex-1 justify-center">
                  {saveBank.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account Modal */}
      {accountModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-slate-900 mb-4">{accountModal.id ? 'Modifier' : 'Nouveau'} compte</h3>
            <form onSubmit={e => { e.preventDefault(); saveAccount.mutate(accountModal) }} className="space-y-4">
              <div>
                <label className="label">Banque *</label>
                <select className="input" value={accountModal.bank ?? ''} onChange={e => setAccountModal({ ...accountModal, bank: Number(e.target.value) })} required>
                  <option value="">Sélectionner...</option>
                  {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Numéro de compte *</label>
                <input className="input" value={accountModal.account_number ?? ''} onChange={e => setAccountModal({ ...accountModal, account_number: e.target.value })} required />
              </div>
              <div>
                <label className="label">Nom du compte *</label>
                <input className="input" value={accountModal.account_name ?? ''} onChange={e => setAccountModal({ ...accountModal, account_name: e.target.value })} required />
              </div>
              <div>
                <label className="label">Devise *</label>
                <select className="input" value={accountModal.currency ?? ''} onChange={e => setAccountModal({ ...accountModal, currency: Number(e.target.value) })} required>
                  <option value="">Sélectionner...</option>
                  {currencies.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Type de compte</label>
                <select className="input" value={accountModal.account_type ?? 'PRINCIPAL'} onChange={e => setAccountModal({ ...accountModal, account_type: e.target.value })}>
                  {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setAccountModal(null)} className="btn-secondary flex-1 justify-center">Annuler</button>
                <button type="submit" disabled={saveAccount.isPending} className="btn-primary flex-1 justify-center">
                  {saveAccount.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
