import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { reportsApi } from '../services/api'
import type { DashboardStats } from '../types'

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2']

export default function ReportsPage() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => reportsApi.dashboard().then(r => r.data),
  })

  if (isLoading) return (
    <div className="flex justify-center p-16">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
    </div>
  )

  if (!stats) return null

  const matchRate = stats.total_transactions > 0
    ? Math.round((stats.matched_transactions / stats.total_transactions) * 100)
    : 0

  const pieData = stats.accounts_summary?.map((a: any) => ({
    name: a.account_name,
    value: a.transaction_count,
  })) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Rapports & Analyses</h1>
        <p className="text-slate-500 mt-1">Vue d'ensemble de votre activité de rapprochement</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Taux de rapprochement</p>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-3xl font-bold text-primary-600">{matchRate}%</span>
          </div>
          <div className="mt-3 w-full bg-slate-200 rounded-full h-2">
            <div className="bg-primary-600 h-2 rounded-full" style={{ width: `${matchRate}%` }} />
          </div>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Transactions total</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{stats.total_transactions.toLocaleString('fr-FR')}</p>
          <p className="text-xs text-slate-400 mt-1">{stats.matched_transactions} rapprochées</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Sessions actives</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{stats.active_sessions}</p>
          <p className="text-xs text-slate-400 mt-1">en cours de traitement</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Écarts ouverts</p>
          <p className="text-3xl font-bold text-amber-600 mt-2">{stats.open_gaps}</p>
          <p className="text-xs text-slate-400 mt-1">à justifier</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly bar chart */}
        <div className="card p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Transactions par mois</h2>
          {stats.monthly_data && stats.monthly_data.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.monthly_data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                  cursor={{ fill: '#f1f5f9' }}
                />
                <Bar dataKey="matched" name="Rapprochées" fill="#2563eb" radius={[3, 3, 0, 0]} />
                <Bar dataKey="unmatched" name="Non rapprochées" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-60 text-slate-400 text-sm">Pas de données</div>
          )}
        </div>

        {/* Pie chart by account */}
        <div className="card p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Répartition par compte</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                  {pieData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-60 text-slate-400 text-sm">Pas de données</div>
          )}
        </div>
      </div>

      {/* Accounts summary table */}
      {stats.accounts_summary && stats.accounts_summary.length > 0 && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-slate-100 font-medium text-slate-700">Résumé par compte bancaire</div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Compte</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Banque</th>
                <th className="text-right px-4 py-3 text-slate-500 font-medium">Transactions</th>
                <th className="text-right px-4 py-3 text-slate-500 font-medium">Rapprochées</th>
                <th className="text-right px-4 py-3 text-slate-500 font-medium">Taux</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.accounts_summary.map((a: any) => {
                const rate = a.transaction_count > 0
                  ? Math.round((a.reconciled_count / a.transaction_count) * 100)
                  : 0
                return (
                  <tr key={a.account_id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-900">{a.account_name}</td>
                    <td className="px-4 py-3 text-slate-500">{a.bank_name}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{a.transaction_count.toLocaleString('fr-FR')}</td>
                    <td className="px-4 py-3 text-right text-emerald-600">{a.reconciled_count.toLocaleString('fr-FR')}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${rate >= 90 ? 'text-emerald-600' : rate >= 70 ? 'text-amber-600' : 'text-red-500'}`}>
                        {rate}%
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent sessions */}
      {stats.recent_sessions && stats.recent_sessions.length > 0 && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-slate-100 font-medium text-slate-700">Sessions récentes</div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Session</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Période</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Statut</th>
                <th className="text-right px-4 py-3 text-slate-500 font-medium">Rapprochements</th>
                <th className="text-right px-4 py-3 text-slate-500 font-medium">Écarts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.recent_sessions.map((s: any) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3">
                    <p className="font-medium text-slate-900 truncate max-w-[200px]">{s.name}</p>
                    <p className="text-xs text-slate-400">{s.bank_account_name}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{s.period_start} → {s.period_end}</td>
                  <td className="px-4 py-3">
                    <span className={s.status === 'VALIDATED' ? 'badge-green' : s.status === 'IN_PROGRESS' ? 'badge-blue' : s.status === 'COMPLETED' ? 'badge-orange' : 'badge-gray'}>
                      {s.status === 'VALIDATED' ? 'Validé' : s.status === 'IN_PROGRESS' ? 'En cours' : s.status === 'COMPLETED' ? 'Complété' : 'Brouillon'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">{s.match_count}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={s.gap_count > 0 ? 'text-amber-600 font-medium' : 'text-slate-400'}>{s.gap_count}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
