import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Zap, Trash2, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react'
import { sessionsApi, matchesApi, gapsApi } from '../services/api'
import type { ReconciliationSession, BankTransaction, AccountingEntry, ReconciliationMatch, ReconciliationGap } from '../types'
import toast from 'react-hot-toast'

export default function ReconciliationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const sessionId = Number(id)
  const qc = useQueryClient()

  const [selectedTx, setSelectedTx] = useState<BankTransaction | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<AccountingEntry | null>(null)
  const [showGaps, setShowGaps] = useState(false)
  const [justification, setJustification] = useState('')
  const [justifyingGap, setJustifyingGap] = useState<number | null>(null)

  const { data: session } = useQuery<ReconciliationSession>({
    queryKey: ['session', sessionId],
    queryFn: () => sessionsApi.get(sessionId).then(r => r.data),
  })

  const { data: txData } = useQuery({
    queryKey: ['unmatched-tx', sessionId],
    queryFn: () => sessionsApi.unmatchedTransactions(sessionId, { page_size: 100 }).then(r => r.data),
    enabled: !!sessionId,
  })

  const { data: entryData } = useQuery({
    queryKey: ['unmatched-entries', sessionId],
    queryFn: () => sessionsApi.unmatchedEntries(sessionId, { page_size: 100 }).then(r => r.data),
    enabled: !!sessionId,
  })

  const { data: matchesData } = useQuery({
    queryKey: ['matches', sessionId],
    queryFn: () => matchesApi.list({ session: sessionId }).then(r => r.data),
    enabled: !!sessionId,
  })

  const { data: gapsData } = useQuery({
    queryKey: ['gaps', sessionId],
    queryFn: () => gapsApi.list({ session: sessionId }).then(r => r.data),
    enabled: !!sessionId,
  })

  const { data: suggestions } = useQuery({
    queryKey: ['suggestions', sessionId, selectedTx?.id],
    queryFn: () => sessionsApi.suggestMatches(sessionId, selectedTx!.id).then(r => r.data),
    enabled: !!selectedTx,
  })

  const unmatchedTxs: BankTransaction[] = txData?.results ?? txData ?? []
  const unmatchedEntries: AccountingEntry[] = entryData?.results ?? entryData ?? []
  const matches: ReconciliationMatch[] = matchesData?.results ?? matchesData ?? []
  const gaps: ReconciliationGap[] = gapsData?.results ?? gapsData ?? []

  const createMatch = useMutation({
    mutationFn: () => matchesApi.create({
      session: sessionId,
      bank_transaction: selectedTx!.id,
      accounting_entry: selectedEntry!.id,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unmatched-tx', sessionId] })
      qc.invalidateQueries({ queryKey: ['unmatched-entries', sessionId] })
      qc.invalidateQueries({ queryKey: ['matches', sessionId] })
      qc.invalidateQueries({ queryKey: ['session', sessionId] })
      setSelectedTx(null); setSelectedEntry(null)
      toast.success('Rapprochement manuel créé')
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Erreur'),
  })

  const deleteMatch = useMutation({
    mutationFn: (id: number) => matchesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unmatched-tx', sessionId] })
      qc.invalidateQueries({ queryKey: ['unmatched-entries', sessionId] })
      qc.invalidateQueries({ queryKey: ['matches', sessionId] })
      toast.success('Rapprochement supprimé')
    },
  })

  const explainGap = useMutation({
    mutationFn: ({ gapId, j }: { gapId: number; j: string }) => gapsApi.explain(gapId, j),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gaps', sessionId] })
      setJustifyingGap(null); setJustification('')
      toast.success('Écart justifié')
    },
  })

  const scoreColor = (score: number) => score >= 150 ? 'text-emerald-600' : score >= 80 ? 'text-amber-600' : 'text-red-500'

  const fmtAmount = (amount: string | number, type?: string) => {
    const n = Number(amount).toLocaleString('fr-FR', { minimumFractionDigits: 0 })
    return type === 'DEBIT' ? `-${n}` : `+${n}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/reconciliation" className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft size={18} className="text-slate-500" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{session?.name}</h1>
          <p className="text-sm text-slate-500">{session?.period_start} → {session?.period_end}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-slate-500">{unmatchedTxs.length} tx non rapprochées · {unmatchedEntries.length} écritures</span>
          {selectedTx && selectedEntry && (
            <button onClick={() => createMatch.mutate()} disabled={createMatch.isPending} className="btn-primary">
              <CheckCircle size={16} /> Rapprocher
            </button>
          )}
        </div>
      </div>

      {/* Split view */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Bank transactions */}
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-slate-100 font-medium text-slate-700 text-sm">
            Transactions bancaires non rapprochées ({unmatchedTxs.length})
          </div>
          <div className="overflow-y-auto max-h-96 divide-y divide-slate-100">
            {unmatchedTxs.map(tx => (
              <button key={tx.id} onClick={() => setSelectedTx(selectedTx?.id === tx.id ? null : tx)}
                className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${selectedTx?.id === tx.id ? 'bg-primary-50 border-l-2 border-primary-600' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm text-slate-700 truncate">{tx.description}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{tx.transaction_date} · {tx.reference || 'sans réf.'}</p>
                  </div>
                  <span className={`text-sm font-medium shrink-0 ${tx.transaction_type === 'DEBIT' ? 'text-red-600' : 'text-emerald-600'}`}>
                    {fmtAmount(tx.amount, tx.transaction_type)}
                  </span>
                </div>
              </button>
            ))}
            {unmatchedTxs.length === 0 && (
              <p className="text-center text-slate-400 py-8 text-sm">Toutes les transactions sont rapprochées ✓</p>
            )}
          </div>
        </div>

        {/* Accounting entries */}
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-slate-100 font-medium text-slate-700 text-sm">
            Écritures comptables non rapprochées ({unmatchedEntries.length})
            {selectedTx && suggestions && (suggestions as any[]).length > 0 && (
              <span className="ml-2 badge-blue">{(suggestions as any[]).length} suggestion(s)</span>
            )}
          </div>
          <div className="overflow-y-auto max-h-96 divide-y divide-slate-100">
            {unmatchedEntries.map(entry => {
              const suggestion = selectedTx ? (suggestions as any[] | undefined)?.find((s: any) => s.entry?.id === entry.id) : null
              return (
                <button key={entry.id} onClick={() => setSelectedEntry(selectedEntry?.id === entry.id ? null : entry)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${selectedEntry?.id === entry.id ? 'bg-primary-50 border-l-2 border-primary-600' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 mr-3">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-slate-700 truncate">{entry.description}</p>
                        {suggestion && <span className={`text-xs font-bold ${scoreColor(suggestion.score)}`}>{suggestion.score}pts</span>}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{entry.entry_date} · {entry.piece_number || entry.account_code}</p>
                    </div>
                    <span className={`text-sm font-medium shrink-0 ${entry.transaction_type === 'DEBIT' ? 'text-red-600' : 'text-emerald-600'}`}>
                      {fmtAmount(entry.amount, entry.transaction_type)}
                    </span>
                  </div>
                </button>
              )
            })}
            {unmatchedEntries.length === 0 && (
              <p className="text-center text-slate-400 py-8 text-sm">Toutes les écritures sont rapprochées ✓</p>
            )}
          </div>
        </div>
      </div>

      {/* Matches */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-medium text-slate-700">
          Rapprochements effectués ({matches.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Transaction bancaire</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Écriture comptable</th>
                <th className="text-center px-4 py-3 text-slate-500 font-medium">Score</th>
                <th className="text-center px-4 py-3 text-slate-500 font-medium">Type</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {matches.map(m => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="text-slate-700 truncate max-w-[200px]">{m.bank_transaction_data?.description}</p>
                    <p className="text-xs text-slate-400">{m.bank_transaction_data?.transaction_date} · {Number(m.bank_transaction_data?.amount).toLocaleString('fr-FR')}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-700 truncate max-w-[200px]">{m.accounting_entry_data?.description}</p>
                    <p className="text-xs text-slate-400">{m.accounting_entry_data?.entry_date} · {Number(m.accounting_entry_data?.amount).toLocaleString('fr-FR')}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-bold ${scoreColor(m.score)}`}>{m.score}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={m.is_manual ? 'badge-purple' : 'badge-blue'}>{m.is_manual ? 'Manuel' : 'Auto'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => { if (confirm('Annuler ce rapprochement ?')) deleteMatch.mutate(m.id) }}
                      className="p-1.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {matches.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Aucun rapprochement</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gaps */}
      <div className="card overflow-hidden">
        <button onClick={() => setShowGaps(!showGaps)}
          className="w-full flex items-center justify-between p-4 border-b border-slate-100 hover:bg-slate-50 text-left">
          <span className="font-medium text-slate-700">Écarts ({gaps.length})</span>
          {showGaps ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showGaps && (
          <div className="divide-y divide-slate-100">
            {gaps.map(g => (
              <div key={g.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={g.status === 'OUVERT' ? 'badge-orange' : g.status === 'EXPLIQUE' ? 'badge-blue' : 'badge-green'}>
                        {g.status}
                      </span>
                      <span className="text-xs text-slate-500">{g.gap_type.replace(/_/g, ' ')}</span>
                    </div>
                    {g.bank_transaction_data && (
                      <p className="text-sm text-slate-700">🏦 {g.bank_transaction_data.description} — {Number(g.bank_transaction_data.amount).toLocaleString('fr-FR')}</p>
                    )}
                    {g.accounting_entry_data && (
                      <p className="text-sm text-slate-700">📒 {g.accounting_entry_data.description} — {Number(g.accounting_entry_data.amount).toLocaleString('fr-FR')}</p>
                    )}
                    {g.justification && <p className="text-xs text-slate-500 mt-1 italic">"{g.justification}"</p>}
                  </div>
                  {g.status === 'OUVERT' && (
                    justifyingGap === g.id ? (
                      <div className="flex gap-2 items-end">
                        <input className="input w-48 text-xs" placeholder="Justification..." value={justification}
                          onChange={e => setJustification(e.target.value)} />
                        <button onClick={() => explainGap.mutate({ gapId: g.id, j: justification })}
                          disabled={!justification} className="btn-primary text-xs py-1.5">OK</button>
                        <button onClick={() => setJustifyingGap(null)} className="btn-secondary text-xs py-1.5">×</button>
                      </div>
                    ) : (
                      <button onClick={() => setJustifyingGap(g.id)} className="btn-secondary text-xs py-1.5 shrink-0">
                        Justifier
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
            {gaps.length === 0 && (
              <p className="text-center text-slate-400 py-6 text-sm">Aucun écart</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
