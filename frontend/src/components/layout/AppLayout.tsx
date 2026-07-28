import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../app/AuthContext'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function AppLayout() {
  const { currentOrganization } = useAuth()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const routeName =
      [
        ['/dashboard', 'Dashboard'],
        ['/leads', 'Leads'],
        ['/companies', 'Customers'],
        ['/contacts', 'Contacts'],
        ['/deals', 'Opportunities'],
        ['/pipeline', 'Sales Pipeline'],
        ['/tasks', 'Tasks'],
        ['/calendar', 'Calendar'],
        ['/activities', 'Activities'],
        ['/email', 'Email'],
        ['/products', 'Products & Services'],
        ['/quotations', 'Quotations'],
        ['/invoices', 'Invoices'],
        ['/support', 'Support'],
        ['/reports', 'Reports'],
        ['/documents', 'Documents'],
        ['/team', 'Team'],
        ['/settings', 'Settings'],
        ['/profile', 'Profile'],
      ].find(([path]) => location.pathname.startsWith(path))?.[1] ?? 'CRM'
    document.title = `${routeName} · ${currentOrganization?.name ?? 'CRM & Sales Pipeline'}`
  }, [currentOrganization?.name, location.pathname])

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar
          collapsed={collapsed}
          onToggleSidebar={() => setCollapsed((value) => !value)}
          onOpenMobile={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
