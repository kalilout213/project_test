import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard, Building2, FileText, BookOpen, GitMerge,
  BarChart3, Users, LogOut, ChevronLeft, ChevronRight, User, Menu
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { USER_ROLE_LABELS } from '../types'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const navItems = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/banks', label: 'Banques', icon: Building2 },
  { to: '/statements', label: 'Relevés', icon: FileText },
  { to: '/accounting', label: 'Comptabilité', icon: BookOpen },
  { to: '/reconciliation', label: 'Rapprochement', icon: GitMerge },
  { to: '/reports', label: 'Rapports', icon: BarChart3 },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = async () => {
    await logout()
    toast.success('Déconnexion réussie')
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className={clsx(
        'flex flex-col bg-slate-900 text-slate-100 transition-all duration-300 shrink-0',
        collapsed ? 'w-16' : 'w-64'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shrink-0 font-bold text-white text-sm">
            TG
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="font-bold text-sm text-white truncate">TRAORE Group</p>
              <p className="text-xs text-slate-400 truncate">Rapprochement Bancaire</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              )}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}

          {user?.role === 'ADMINISTRATEUR' && (
            <>
              {!collapsed && (
                <p className="px-3 pt-4 pb-1 text-xs text-slate-500 uppercase tracking-wider">Admin</p>
              )}
              <NavLink
                to="/users"
                className={({ isActive }) => clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                )}
                title={collapsed ? 'Utilisateurs' : undefined}
              >
                <Users size={18} className="shrink-0" />
                {!collapsed && <span>Utilisateurs</span>}
              </NavLink>
            </>
          )}
        </nav>

        {/* User + collapse */}
        <div className="p-2 border-t border-slate-700 space-y-1">
          {!collapsed && (
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
              <p className="text-xs text-slate-400 truncate">{user ? USER_ROLE_LABELS[user.role] : ''}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={collapsed ? 'Déconnexion' : undefined}
          >
            <LogOut size={18} className="shrink-0" />
            {!collapsed && <span>Déconnexion</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            {!collapsed && <span>Réduire</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="text-sm text-slate-500">Groupe TRAORE — Système de Rapprochement Bancaire</div>
          </div>
          <div className="flex items-center gap-2">
            <User size={16} className="text-slate-500" />
            <span className="text-sm text-slate-700 font-medium">{user?.full_name}</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
