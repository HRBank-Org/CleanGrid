import { useNavigate } from 'react-router-dom'
import { User, Building2, MapPin, FileCheck, CreditCard, Bell, HelpCircle, LogOut, ChevronRight } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useLanguageStore } from '../../stores/languageStore'

export default function FranchiseeProfile() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { t } = useLanguageStore()

  const handleLogout = () => {
    logout()
    navigate('/franchisee')
  }

  const menuItems = [
    { icon: Building2, label: 'Business Details', path: '/franchisee/business' },
    { icon: MapPin, label: 'My Territories', path: '/franchisee/territories' },
    { icon: FileCheck, label: 'Compliance Documents', path: '/franchisee/compliance' },
    { icon: CreditCard, label: 'Payout Settings', path: '/franchisee/payout' },
    { icon: Bell, label: 'Notifications', path: '/franchisee/notifications' },
    { icon: HelpCircle, label: 'Help & Support', path: '/franchisee/support' },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-secondary-900">{user?.name}</h2>
            <p className="text-gray-500">{user?.email}</p>
            <span className="inline-block mt-1 text-xs bg-primary-50 text-primary px-2 py-1 rounded-full font-medium">
              Franchisee Owner
            </span>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
        {menuItems.map(({ icon: Icon, label, path }) => (
          <button
            key={label}
            onClick={() => navigate(path)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Icon className="w-5 h-5 text-gray-400" />
              <span className="font-medium text-secondary-900">{label}</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </button>
        ))}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 p-4 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition-colors"
      >
        <LogOut className="w-5 h-5" />
        {t('profile.logout')}
      </button>
    </div>
  )
}
