import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Play, CheckCircle, ArrowRight, GitMerge } from 'lucide-react'
import { sessionsApi, bankAccountsApi, journalsApi } from '../services/api'
import type { ReconciliationSession, BankAccount, AccountingJournal } from '../types'
import toast from 'react-hot-toast'

const statusColors: Record<string, string> = {
  DRAFT: 'badge-gray', IN_PROGRESS: 'badge-blue', COMPLETED: 'badge-orange', VALIDATED: 'badge-green'
}
const statusLabels: Record<string, string> = {
  DRAFT: 'Brouillon', IN_PROGRESS: 'En cours', COMPLETED: 'Complété', VALIDATED: 'Validé'
}

export default function ReconciliationPage() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    name: '', bank_account: '', journal: '',
    period_start: '', period_end: '', auto_match_threshold: 80, notes: ''
  })

  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => sessionsApi.list().then(r => r.data),
  })
  const { data: accountsData } = useQuery({ queryKey: ['accounts'], queryFn: () => bankAccountsApi.list().then(r => r.data) })
  const { data: journalsData } = useQuery({ queryKey: ['journals'], queryFn: () => journalsApi.list().then(r => r.data) })

  const sessions: ReconciliationSession[] = sessionsData?.results ?? sessionsData ?? []
  const accounts: BankAccount[] = accountsData?.results ?? accountsData ?? []
  const journals: AccountingJournal[] = journalsData?.results ?? journalsData ?? []

  const createSession = useMutation({
    mutationFn: () => sessionsApi.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      setShowCreate(false)
      setForm({ name: '', bank_account: '', journal: '', period_start: '', period_end: '', auto_match_threshold: 80, notes: '' })
      toast.success('Session créée')
    },
    onError: () => toast.error('Erreur lors de la création'),
  })

  const startMatching = useMutation({
    mutationFn: (id: number) => sessionsApi.startMatching(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      toast.success('Rapprochement automatique lancé')
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Erreur'),
  })

  const validate = useMutation({
    mutationFn: (id: number) => sessionsApi.validate(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sessions'] }); toast.success('Session validée') },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Permission insuffisante'),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rapprochement Bancaire</h1>
          <p className="text-slate-500 mt-1">Gérez vos sessions de rapprochement</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={16} /> Nouvelle session</button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
      ) : (
        <div className="grid gap-4">
          {sessions.map(s => {
            const total = s.match_count + s.gap_count
            const progress = total > 0 ? Math.round((s.match_count / total) * 100) : 0
            return (
              <div key={s.id} className="card p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-slate-900 truncate">{s.name}</h3>
                      <span className={statusColors[s.status]}>{statusLabels[s.status]}</span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-500 mt-2">
                      <span>🏦 {s.bank_name} · {s.bank_account_name}</span>
                      <span>📒 {s.journal_name}</span>
                      <span>📅 {s.period_start} → {s.period_end}</span>
                      <span>👤 {s.created_by_name}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-4">
                      <div className="flex-1 max-w-xs">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                          <span>{s.match_count} rapprochés</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div className="bg-primary-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                      <span className={`text-sm ${s.gap_count > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                        {s.gap_count} écart{s.gap_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <Link to={`/reconciliation/${s.id}`} className="btn-secondary text-xs py-1.5">
                      Ouvrir <ArrowRight size={12} />
                    </Link>
                    {s.status !== 'VALIDATED' && (
                      <button
                        onClick={() => startMatching.mutate(s.id)}
                        disabled={startMatching.isPending}
                        className="btn-secondary text-xs py-1.5"
                      >
                        <Play size={12} /> Auto-match
                      </button>
                    )}
                    {s.status === 'IN_PROGRESS' || s.status === 'COMPLETED' ? (
                      <button
                        onClick={() => validate.mutate(s.id)}
                        disabled={validate.isPending}
                        className="btn-secondary text-xs py-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                      >
                        <CheckCircle size={12} /> Valider
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}
          {sessions.length === 0 && (
            <div className="card p-12 text-center text-slate-400">
              <GitMerge size={40} className="mx-auto mb-3 opacity-30" />
              <p>Aucune session de rapprochement</p>
              <button onClick={() => setShowCreate(true)} className="btn-primary mt-4 mx-auto">
                <Plus size={16} /> Créer une session
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-slate-900 mb-4">Nouvelle session de rapprochement</h3>
            <form onSubmit={e => { e.preventDefault(); createSession.mutate() }} className="space-y-4">
              <div><label className="label">Nom *</label>
                <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Rapprochement BNI Oct 2024" /></div>
              <div>
                <label className="label">Compte bancaire *</label>
                <select className="input" value={form.bank_account} onChange={e => setForm({ ...form, bank_account: e.target.value })} required>
                  <option value="">Sélectionner...</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name} ({a.bank_name})</option>)}
                </select>
              </div>
              <div>
                <label className="label">Journal comptable *</label>
                <select className="input" value={form.journal} onChange={e => setForm({ ...form, journal: e.target.value })} required>
                  <option value="">Sélectionner...</option>
                  {journals.map(j => <option key={j.id} value={j.id}>{j.code} - {j.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Période début *</label>
                  <input type="date" className="input" value={form.period_start} onChange={e => setForm({ ...form, period_start: e.target.value })} required /></div>
                <div><label className="label">Période fin *</label>
                  <input type="date" className="input" value={form.period_end} onChange={e => setForm({ ...form, period_end: e.target.value })} required /></div>
              </div>
              <div>
                <label className="label">Seuil de rapprochement auto: <strong>{form.auto_match_threshold}</strong>/200</label>
                <input type="range" min={0} max={200} step={5} value={form.auto_match_threshold}
                  onChange={e => setForm({ ...form, auto_match_threshold: Number(e.target.value) })}
                  className="w-full accent-primary-600" />
              </div>
              <div><label className="label">Notes</label>
                <textarea className="input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1 justify-center">Annuler</button>
                <button type="submit" disabled={createSession.isPending} className="btn-primary flex-1 justify-center">
                  {createSession.isPending ? 'Création...' : 'Créer la session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
