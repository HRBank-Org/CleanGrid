import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import Avatar from '../../components/Avatar'
import {
  User,
  MapPin,
  Phone,
  CreditCard,
  Bell,
  HelpCircle,
  FileText,
  LogOut,
  ChevronRight,
  Check,
} from 'lucide-react'

export default function Profile() {
  const navigate = useNavigate()
  const { user, logout, updateProfile, isLoading } = useAuthStore()
  const [uploading, setUploading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  
  const handlePhotoChange = async (base64: string) => {
    setUploading(true)
    try {
      const success = await updateProfile({ profilePhoto: base64 })
      if (success) {
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 2000)
      }
    } finally {
      setUploading(false)
    }
  }
  
  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout()
      navigate('/')
    }
  }
  
  const menuItems = [
    { icon: User, label: 'Edit Profile', onClick: () => {} },
    { icon: MapPin, label: 'Address', subtitle: user?.address || 'Not set', onClick: () => {} },
    { icon: Phone, label: 'Phone', subtitle: user?.phone, onClick: () => {} },
  ]
  
  const settingsItems = [
    { icon: CreditCard, label: 'Payment Methods', onClick: () => {} },
    { icon: Bell, label: 'Notifications', onClick: () => {} },
  ]
  
  const supportItems = [
    { icon: HelpCircle, label: 'Help & Support', onClick: () => {} },
    { icon: FileText, label: 'Terms & Privacy', onClick: () => {} },
  ]
  
  return (
    <div className="px-5 py-6 safe-top">
      <h1 className="text-2xl font-bold text-secondary-900 mb-6">Profile</h1>
      
      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg z-50 animate-fadeIn">
          <Check className="w-4 h-4" />
          Photo updated!
        </div>
      )}
      
      {/* Profile Card */}
      <div className="bg-white rounded-2xl p-6 mb-6 border border-gray-100 shadow-sm text-center">
        <div className="flex justify-center mb-4">
          <Avatar
            name={user?.name}
            photo={user?.profilePhoto}
            size="lg"
            editable
            onPhotoChange={handlePhotoChange}
            uploading={uploading}
          />
        </div>
        <h2 className="text-xl font-semibold text-secondary-900">{user?.name}</h2>
        <p className="text-gray-500">{user?.email}</p>
        <p className="text-xs text-primary mt-1">Tap photo to change</p>
      </div>
      
      {/* Menu Sections */}
      <div className="space-y-4">
        {/* Account */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {menuItems.map((item, index) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className={`w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-gray-50 transition-colors ${
                index < menuItems.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <item.icon className="w-5 h-5 text-gray-400" />
              <div className="flex-1">
                <span className="text-secondary-900">{item.label}</span>
                {item.subtitle && (
                  <p className="text-sm text-gray-400">{item.subtitle}</p>
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </button>
          ))}
        </div>
        
        {/* Settings */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {settingsItems.map((item, index) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className={`w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-gray-50 transition-colors ${
                index < settingsItems.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <item.icon className="w-5 h-5 text-gray-400" />
              <span className="flex-1 text-secondary-900">{item.label}</span>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </button>
          ))}
        </div>
        
        {/* Support */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {supportItems.map((item, index) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className={`w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-gray-50 transition-colors ${
                index < supportItems.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <item.icon className="w-5 h-5 text-gray-400" />
              <span className="flex-1 text-secondary-900">{item.label}</span>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </button>
          ))}
        </div>
        
        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-4 bg-white rounded-2xl border border-red-200 text-red-500 font-semibold hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </div>
  )
}
