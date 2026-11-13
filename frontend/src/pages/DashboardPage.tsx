import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { reportsApi } from '../services/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Building2, GitMerge, AlertTriangle, CheckCircle, TrendingUp, ArrowRight } from 'lucide-react'
import type { DashboardStats } from '../types'

const statusColors: Record<string, string> = {
  DRAFT: 'badge-gray',
  IN_PROGRESS: 'badge-blue',
  COMPLETED: 'badge-orange',
  VALIDATED: 'badge-green',
}
const statusLabels: Record<string, string> = {
  DRAFT: 'Brouillon',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Complété',
  VALIDATED: 'Validé',
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: () => reportsApi.dashboard().then(r => r.data),
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
    </div>
  )

  const kpis = data?.kpis

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
        <p className="text-slate-500 mt-1">Vue d'ensemble du rapprochement bancaire</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-50 rounded-lg"><Building2 size={20} className="text-blue-600" /></div>
            <span className="text-sm text-slate-500">Comptes actifs</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">{kpis?.total_accounts ?? 0}</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-50 rounded-lg"><GitMerge size={20} className="text-purple-600" /></div>
            <span className="text-sm text-slate-500">Sessions totales</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">{kpis?.total_sessions ?? 0}</p>
          <p className="text-xs text-slate-500 mt-1">{kpis?.validated_sessions ?? 0} validées</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-amber-50 rounded-lg"><AlertTriangle size={20} className="text-amber-600" /></div>
            <span className="text-sm text-slate-500">Écarts ouverts</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">{kpis?.pending_gaps ?? 0}</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-50 rounded-lg"><TrendingUp size={20} className="text-emerald-600" /></div>
            <span className="text-sm text-slate-500">Taux de validation</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">{kpis?.validation_rate ?? 0}%</p>
          <p className="text-xs text-slate-500 mt-1">{kpis?.reconciled_this_month ?? 0} ce mois</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="card p-6 lg:col-span-2">
          <h2 className="font-semibold text-slate-800 mb-4">Activité mensuelle</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data?.monthly_data ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="matches" name="Rapprochements" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="gaps" name="Écarts" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Accounts */}
        <div className="card p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Comptes bancaires</h2>
          <div className="space-y-3">
            {(data?.accounts ?? []).map(acc => (
              <div key={acc.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-800">{acc.name}</p>
                  <p className="text-xs text-slate-500">{acc.bank} · {acc.currency}</p>
                </div>
                <span className="text-xs text-slate-400">{acc.sessions_count} sessions</span>
              </div>
            ))}
            {(data?.accounts ?? []).length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">Aucun compte configuré</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent sessions */}
      <div className="card">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Sessions récentes</h2>
          <Link to="/reconciliation" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
            Tout voir <ArrowRight size={14} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Session</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Période</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Statut</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Progression</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Créé par</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.recent_sessions ?? []).map(s => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <Link to={`/reconciliation/${s.id}`} className="font-medium text-primary-600 hover:underline">{s.name}</Link>
                    <p className="text-xs text-slate-400">{s.bank}</p>
                  </td>
                  <td className="px-4 py-4 text-slate-600 whitespace-nowrap">
                    {s.period_start} → {s.period_end}
                  </td>
                  <td className="px-4 py-4">
                    <span className={statusColors[s.status]}>{statusLabels[s.status]}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-slate-200 rounded-full h-1.5">
                        <div className="bg-primary-600 h-1.5 rounded-full" style={{ width: `${s.progress}%` }} />
                      </div>
                      <span className="text-xs text-slate-500">{s.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{s.created_by}</td>
                </tr>
              ))}
              {(data?.recent_sessions ?? []).length === 0 && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Aucune session</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
