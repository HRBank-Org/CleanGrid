import { useNavigate } from 'react-router-dom'
import { User, Shield, Bell, Settings, HelpCircle, LogOut, ChevronRight } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useLanguageStore } from '../../stores/languageStore'

export default function AdminProfile() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { t } = useLanguageStore()

  const handleLogout = () => {
    logout()
    navigate('/admin')
  }

  const menuItems = [
    { icon: Shield, label: 'Security Settings', path: '/admin/security' },
    { icon: Bell, label: 'Notifications', path: '/admin/notifications' },
    { icon: Settings, label: 'System Settings', path: '/admin/settings' },
    { icon: HelpCircle, label: 'Documentation', path: '/admin/docs' },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-secondary-900 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-secondary-900">{user?.name}</h2>
            <p className="text-gray-500">{user?.email}</p>
            <span className="inline-block mt-1 text-xs bg-secondary-900 text-primary px-2 py-1 rounded-full font-medium">
              Administrator
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

      {/* Version Info */}
      <p className="text-center text-gray-400 text-xs">
        CleanGrid Admin Console v1.0.0
      </p>
    </div>
  )
}
