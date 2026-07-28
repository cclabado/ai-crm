import {
  Activity,
  BarChart3,
  Building2,
  Calendar,
  CheckSquare,
  Contact,
  FileText,
  FolderOpen,
  Kanban,
  Layers,
  LifeBuoy,
  Mail,
  Package,
  Receipt,
  Settings,
  Target,
  Users,
  X,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../app/AuthContext'
import { cn } from '../../lib/cn'

const sections = [
  { label: '', items: [{ to: '/dashboard', label: 'Dashboard', icon: BarChart3 }] },
  {
    label: 'Sales',
    items: [
      { to: '/leads', label: 'Leads', icon: Target },
      { to: '/companies', label: 'Customers', icon: Building2 },
      { to: '/contacts', label: 'Contacts', icon: Contact },
      { to: '/deals', label: 'Opportunities', icon: Activity },
      { to: '/pipeline', label: 'Sales Pipeline', icon: Kanban },
    ],
  },
  {
    label: 'Productivity',
    items: [
      { to: '/tasks', label: 'Tasks', icon: CheckSquare },
      { to: '/calendar', label: 'Calendar', icon: Calendar },
      { to: '/activities', label: 'Activities', icon: Activity },
      { to: '/email', label: 'Email', icon: Mail },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/products', label: 'Products & Services', icon: Package },
      { to: '/quotations', label: 'Quotes', icon: FileText },
      { to: '/invoices', label: 'Invoices', icon: Receipt },
    ],
  },
  { label: 'Service', items: [{ to: '/support', label: 'Support Tickets', icon: LifeBuoy }] },
  {
    label: 'Analytics',
    items: [
      { to: '/reports', label: 'Reports & Analytics', icon: BarChart3 },
      { to: '/documents', label: 'Documents', icon: FolderOpen },
    ],
  },
  {
    label: 'Admin',
    items: [
      { to: '/team', label: 'Team', icon: Users },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
]

interface SidebarProps {
  collapsed: boolean
  mobileOpen: boolean
  onCloseMobile: () => void
}

export default function Sidebar({ collapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  const { currentOrganization } = useAuth()
  const companyName = currentOrganization?.name ?? 'CRM & Sales Pipeline'

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white transition-[width,transform] duration-200 lg:static lg:z-auto lg:translate-x-0',
          collapsed ? 'lg:w-16' : 'lg:w-60',
          mobileOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-full',
        )}
      >
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 px-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600">
            <Layers className="h-4 w-4 text-white" aria-hidden="true" />
          </div>
          <div className={cn('min-w-0', collapsed && 'lg:hidden')}>
            <p className="truncate text-sm font-bold tracking-tight text-slate-900" title={companyName}>
              {companyName}
            </p>
            <p className="text-[10px] font-medium text-slate-400">CRM & Sales Pipeline</p>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation"
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Primary navigation" className="flex-1 overflow-y-auto p-2">
          {sections.map((section) => (
            <div key={section.label || 'main'} className="mb-2">
              {section.label && (
                <p
                  className={cn(
                    'px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400',
                    collapsed && 'lg:hidden',
                  )}
                >
                  {section.label}
                </p>
              )}
              {section.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onCloseMobile}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'relative mb-0.5 flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors',
                      collapsed && 'lg:justify-center lg:px-0',
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute left-0 h-5 w-0.5 rounded-r-full bg-blue-600" />}
                      <Icon
                        className={cn('h-4 w-4 shrink-0', isActive ? 'text-blue-600' : 'text-slate-400')}
                        aria-hidden="true"
                      />
                      <span className={cn('truncate', collapsed && 'lg:hidden')}>{label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}
