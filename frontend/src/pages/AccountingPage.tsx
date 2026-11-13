import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Upload, Trash2, Pencil } from 'lucide-react'
import { journalsApi, accountingEntriesApi, bankAccountsApi } from '../services/api'
import type { AccountingJournal, AccountingEntry, BankAccount } from '../types'
import toast from 'react-hot-toast'

const JOURNAL_TYPES = ['BANQUE', 'VENTES', 'ACHATS', 'CAISSE', 'OD', 'PAIE']

export default function AccountingPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'journals' | 'entries'>('journals')
  const [journalModal, setJournalModal] = useState<Partial<AccountingJournal> | null>(null)
  const [importModal, setImportModal] = useState(false)
  const [importForm, setImportForm] = useState({ journal: '', file_format: 'CSV', file: null as File | null })

  const { data: journalsData } = useQuery({ queryKey: ['journals'], queryFn: () => journalsApi.list().then(r => r.data) })
  const { data: entriesData } = useQuery({ queryKey: ['entries'], queryFn: () => accountingEntriesApi.list({ page_size: 50 }).then(r => r.data) })
  const { data: accountsData } = useQuery({ queryKey: ['accounts'], queryFn: () => bankAccountsApi.list().then(r => r.data) })

  const journals: AccountingJournal[] = journalsData?.results ?? journalsData ?? []
  const entries: AccountingEntry[] = entriesData?.results ?? entriesData ?? []
  const accounts: BankAccount[] = accountsData?.results ?? accountsData ?? []

  const saveJournal = useMutation({
    mutationFn: (d: Partial<AccountingJournal>) => d.id ? journalsApi.update(d.id, d) : journalsApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['journals'] }); setJournalModal(null); toast.success('Journal sauvegardé') },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  })

  const importMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      fd.append('journal', importForm.journal)
      fd.append('file_format', importForm.file_format)
      if (importForm.file) fd.append('file', importForm.file)
      return accountingEntriesApi.import(fd)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries'] })
      setImportModal(false)
      toast.success('Écritures importées')
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Erreur d\'import'),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Comptabilité</h1>
          <p className="text-slate-500 mt-1">Journaux comptables et écritures</p>
        </div>
        <div className="flex gap-2">
          {tab === 'journals' && (
            <button onClick={() => setJournalModal({})} className="btn-primary"><Plus size={16} /> Nouveau journal</button>
          )}
          {tab === 'entries' && (
            <button onClick={() => setImportModal(true)} className="btn-primary"><Upload size={16} /> Importer des écritures</button>
          )}
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        {(['journals', 'entries'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm rounded-md transition-colors font-medium ${tab === t ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
            {t === 'journals' ? `Journaux (${journals.length})` : `Écritures (${entriesData?.count ?? entries.length})`}
          </button>
        ))}
      </div>

      {tab === 'journals' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Code</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Nom</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Type</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Compte lié</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Écritures</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {journals.map(j => (
                <tr key={j.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono text-sm font-medium text-slate-900">{j.code}</td>
                  <td className="px-4 py-4 text-slate-700">{j.name}</td>
                  <td className="px-4 py-4"><span className="badge-blue">{j.journal_type}</span></td>
                  <td className="px-4 py-4 text-slate-500 text-xs">{j.bank_account_name ?? '—'}</td>
                  <td className="px-4 py-4 text-slate-600">{j.entries_count}</td>
                  <td className="px-4 py-4">
                    <button onClick={() => setJournalModal(j)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500">
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {journals.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-400">Aucun journal créé</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'entries' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Date</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Pièce</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Journal</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Compte</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Description</th>
                <th className="text-right px-4 py-3 text-slate-500 font-medium">Débit</th>
                <th className="text-right px-4 py-3 text-slate-500 font-medium">Crédit</th>
                <th className="text-center px-4 py-3 text-slate-500 font-medium">Rappr.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map(e => (
                <tr key={e.id} className={`hover:bg-slate-50 ${e.is_reconciled ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{e.entry_date}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{e.piece_number || '—'}</td>
                  <td className="px-4 py-3"><span className="badge-blue text-xs">{e.journal_code}</span></td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{e.account_code}</td>
                  <td className="px-4 py-3 text-slate-700 max-w-[200px] truncate" title={e.description}>{e.description}</td>
                  <td className="px-4 py-3 text-right text-red-600 font-medium">
                    {Number(e.debit) > 0 ? Number(e.debit).toLocaleString('fr-FR') : ''}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                    {Number(e.credit) > 0 ? Number(e.credit).toLocaleString('fr-FR') : ''}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={e.is_reconciled ? 'badge-green' : 'badge-gray'}>{e.is_reconciled ? '✓' : '—'}</span>
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr><td colSpan={8} className="px-6 py-10 text-center text-slate-400">Aucune écriture</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Journal Modal */}
      {journalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-slate-900 mb-4">{journalModal.id ? 'Modifier' : 'Nouveau'} journal</h3>
            <form onSubmit={e => { e.preventDefault(); saveJournal.mutate(journalModal) }} className="space-y-4">
              <div><label className="label">Code *</label><input className="input" value={journalModal.code ?? ''} onChange={e => setJournalModal({ ...journalModal, code: e.target.value })} required /></div>
              <div><label className="label">Nom *</label><input className="input" value={journalModal.name ?? ''} onChange={e => setJournalModal({ ...journalModal, name: e.target.value })} required /></div>
              <div>
                <label className="label">Type *</label>
                <select className="input" value={journalModal.journal_type ?? ''} onChange={e => setJournalModal({ ...journalModal, journal_type: e.target.value })} required>
                  <option value="">Sélectionner...</option>
                  {JOURNAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Compte bancaire lié</label>
                <select className="input" value={journalModal.bank_account ?? ''} onChange={e => setJournalModal({ ...journalModal, bank_account: Number(e.target.value) || null as any })}>
                  <option value="">Aucun</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setJournalModal(null)} className="btn-secondary flex-1 justify-center">Annuler</button>
                <button type="submit" disabled={saveJournal.isPending} className="btn-primary flex-1 justify-center">Sauvegarder</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {importModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Importer des écritures</h3>
            <form onSubmit={e => { e.preventDefault(); importMutation.mutate() }} className="space-y-4">
              <div>
                <label className="label">Journal *</label>
                <select className="input" value={importForm.journal} onChange={e => setImportForm({ ...importForm, journal: e.target.value })} required>
                  <option value="">Sélectionner...</option>
                  {journals.map(j => <option key={j.id} value={j.id}>{j.code} - {j.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Format</label>
                <select className="input" value={importForm.file_format} onChange={e => setImportForm({ ...importForm, file_format: e.target.value })}>
                  <option value="CSV">CSV</option>
                  <option value="EXCEL">Excel</option>
                </select>
              </div>
              <div>
                <label className="label">Fichier *</label>
                <input type="file" className="input" required accept=".csv,.xlsx,.xls"
                  onChange={e => setImportForm({ ...importForm, file: e.target.files?.[0] ?? null })} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setImportModal(false)} className="btn-secondary flex-1 justify-center">Annuler</button>
                <button type="submit" disabled={importMutation.isPending} className="btn-primary flex-1 justify-center">
                  {importMutation.isPending ? 'Import...' : 'Importer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
