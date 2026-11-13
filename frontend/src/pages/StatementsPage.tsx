import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, Trash2, Eye, FileText } from 'lucide-react'
import { statementsApi, transactionsApi, bankAccountsApi } from '../services/api'
import type { BankStatement, BankTransaction, BankAccount, PaginatedResponse } from '../types'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const statusBadge: Record<string, string> = {
  PENDING: 'badge-gray', PROCESSING: 'badge-blue', COMPLETED: 'badge-green', ERROR: 'badge-red'
}
const statusLabel: Record<string, string> = {
  PENDING: 'En attente', PROCESSING: 'En cours', COMPLETED: 'Importé', ERROR: 'Erreur'
}

export default function StatementsPage() {
  const qc = useQueryClient()
  const [selectedStatement, setSelectedStatement] = useState<BankStatement | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadForm, setUploadForm] = useState({ bank_account: '', file_format: 'CSV', file: null as File | null })
  const [txPage, setTxPage] = useState(1)

  const { data: statementsData, isLoading } = useQuery({
    queryKey: ['statements'],
    queryFn: () => statementsApi.list().then(r => r.data),
  })
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => bankAccountsApi.list().then(r => r.data),
  })
  const { data: txData } = useQuery({
    queryKey: ['transactions', selectedStatement?.id, txPage],
    queryFn: () => transactionsApi.listByStatement(selectedStatement!.id, { page: txPage }).then(r => r.data),
    enabled: !!selectedStatement,
  })

  const statements: BankStatement[] = statementsData?.results ?? statementsData ?? []
  const accounts: BankAccount[] = accountsData?.results ?? accountsData ?? []
  const txs: PaginatedResponse<BankTransaction> | undefined = txData

  const uploadMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      fd.append('bank_account', uploadForm.bank_account)
      fd.append('file_format', uploadForm.file_format)
      if (uploadForm.file) fd.append('file', uploadForm.file)
      return statementsApi.upload(fd)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['statements'] })
      setShowUpload(false)
      setUploadForm({ bank_account: '', file_format: 'CSV', file: null })
      toast.success('Relevé importé avec succès')
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Erreur d\'import'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => statementsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['statements'] }); toast.success('Relevé supprimé') },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Relevés bancaires</h1>
          <p className="text-slate-500 mt-1">Importez et consultez vos relevés bancaires</p>
        </div>
        <button onClick={() => setShowUpload(true)} className="btn-primary">
          <Upload size={16} /> Importer un relevé
        </button>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Statement list */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="p-4 border-b border-slate-100 font-medium text-slate-700">
            Relevés ({statements.length})
          </div>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-y-auto max-h-[60vh]">
              {statements.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedStatement(s); setTxPage(1) }}
                  className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${selectedStatement?.id === s.id ? 'bg-primary-50 border-r-2 border-primary-600' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{s.file_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{s.bank_account_name}</p>
                      {s.period_start && (
                        <p className="text-xs text-slate-400 mt-0.5">{s.period_start} → {s.period_end}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={statusBadge[s.status]}>{statusLabel[s.status]}</span>
                      <span className="text-xs text-slate-400">{s.transaction_count} tx</span>
                    </div>
                  </div>
                </button>
              ))}
              {statements.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-8">Aucun relevé importé</p>
              )}
            </div>
          )}
        </div>

        {/* Transaction table */}
        <div className="lg:col-span-3 card overflow-hidden">
          {selectedStatement ? (
            <>
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{selectedStatement.file_name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{txs?.count ?? 0} transactions</p>
                </div>
                <button onClick={() => { if (confirm('Supprimer ce relevé et toutes ses transactions ?')) deleteMutation.mutate(selectedStatement.id); setSelectedStatement(null) }}
                  className="p-1.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-slate-500 font-medium">Date</th>
                      <th className="text-left px-4 py-3 text-slate-500 font-medium">Description</th>
                      <th className="text-left px-4 py-3 text-slate-500 font-medium">Réf.</th>
                      <th className="text-right px-4 py-3 text-slate-500 font-medium">Débit</th>
                      <th className="text-right px-4 py-3 text-slate-500 font-medium">Crédit</th>
                      <th className="text-center px-4 py-3 text-slate-500 font-medium">Rappr.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(txs?.results ?? []).map(tx => (
                      <tr key={tx.id} className={`hover:bg-slate-50 ${tx.is_reconciled ? 'opacity-60' : ''}`}>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{tx.transaction_date}</td>
                        <td className="px-4 py-3 text-slate-700 max-w-[200px] truncate" title={tx.description}>{tx.description}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs font-mono">{tx.reference || '—'}</td>
                        <td className="px-4 py-3 text-right text-red-600 font-medium">
                          {tx.transaction_type === 'DEBIT' ? Number(tx.amount).toLocaleString('fr-FR') : ''}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                          {tx.transaction_type === 'CREDIT' ? Number(tx.amount).toLocaleString('fr-FR') : ''}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={tx.is_reconciled ? 'badge-green' : 'badge-gray'}>
                            {tx.is_reconciled ? '✓' : '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {txs && txs.count > 25 && (
                <div className="p-3 border-t border-slate-100 flex items-center justify-between text-sm">
                  <span className="text-slate-500">Page {txPage} / {Math.ceil(txs.count / 25)}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setTxPage(p => Math.max(1, p - 1))} disabled={!txs.previous} className="btn-secondary py-1 px-3">←</button>
                    <button onClick={() => setTxPage(p => p + 1)} disabled={!txs.next} className="btn-secondary py-1 px-3">→</button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <FileText size={40} className="mb-3 opacity-30" />
              <p>Sélectionnez un relevé</p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Importer un relevé</h3>
            <form onSubmit={e => { e.preventDefault(); uploadMutation.mutate() }} className="space-y-4">
              <div>
                <label className="label">Compte bancaire *</label>
                <select className="input" value={uploadForm.bank_account}
                  onChange={e => setUploadForm({ ...uploadForm, bank_account: e.target.value })} required>
                  <option value="">Sélectionner...</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name} ({a.bank_name})</option>)}
                </select>
              </div>
              <div>
                <label className="label">Format du fichier *</label>
                <select className="input" value={uploadForm.file_format}
                  onChange={e => setUploadForm({ ...uploadForm, file_format: e.target.value })}>
                  <option value="CSV">CSV</option>
                  <option value="EXCEL">Excel (.xlsx)</option>
                  <option value="MT940">MT940 (SWIFT)</option>
                  <option value="CAMT053">CAMT.053 (ISO 20022)</option>
                </select>
              </div>
              <div>
                <label className="label">Fichier *</label>
                <input type="file" className="input" required
                  accept=".csv,.xlsx,.xls,.txt,.xml,.sta"
                  onChange={e => setUploadForm({ ...uploadForm, file: e.target.files?.[0] ?? null })} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowUpload(false)} className="btn-secondary flex-1 justify-center">Annuler</button>
                <button type="submit" disabled={uploadMutation.isPending} className="btn-primary flex-1 justify-center">
                  {uploadMutation.isPending ? 'Import...' : 'Importer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
