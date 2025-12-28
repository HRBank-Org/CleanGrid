import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Briefcase, DollarSign, User } from 'lucide-react'

const navItems = [
  { path: '/franchisee/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/franchisee/jobs', icon: Briefcase, label: 'Jobs' },
  { path: '/franchisee/settlements', icon: DollarSign, label: 'Earnings' },
  { path: '/franchisee/profile', icon: User, label: 'Profile' },
]

export default function FranchiseeLayout() {
  const location = useLocation()
  
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Main Content */}
      <main className="max-w-lg mx-auto">
        <Outlet />
      </main>
      
      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom">
        <div className="max-w-lg mx-auto flex justify-around items-center h-16">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path
            return (
              <NavLink
                key={path}
                to={path}
                className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${
                  isActive ? 'text-primary' : 'text-gray-400'
                }`}
              >
                <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-xs mt-1 ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {label}
                </span>
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
