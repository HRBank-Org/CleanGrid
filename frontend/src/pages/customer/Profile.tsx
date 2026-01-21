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
  X,
  Loader2,
  Mail,
} from 'lucide-react'

export default function Profile() {
  const navigate = useNavigate()
  const { user, logout, updateProfile } = useAuthStore()
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  
  // Edit modals
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showEditAddress, setShowEditAddress] = useState(false)
  const [showEditPhone, setShowEditPhone] = useState(false)
  
  // Form states
  const [editName, setEditName] = useState(user?.name || '')
  const [editAddress, setEditAddress] = useState(user?.address || '')
  const [editPostalCode, setEditPostalCode] = useState(user?.postalCode || '')
  const [editPhone, setEditPhone] = useState(user?.phone || '')
  
  const showSuccessToast = (message: string) => {
    setSuccessMessage(message)
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 2000)
  }
  
  const handlePhotoChange = async (base64: string) => {
    setUploading(true)
    try {
      const success = await updateProfile({ profilePhoto: base64 })
      if (success) {
        showSuccessToast('Photo updated!')
      }
    } finally {
      setUploading(false)
    }
  }
  
  const handleSaveName = async () => {
    if (!editName.trim()) return
    setSaving(true)
    try {
      const success = await updateProfile({ name: editName.trim() })
      if (success) {
        showSuccessToast('Name updated!')
        setShowEditProfile(false)
      }
    } finally {
      setSaving(false)
    }
  }
  
  const handleSaveAddress = async () => {
    setSaving(true)
    try {
      const success = await updateProfile({ 
        address: editAddress.trim(),
        postalCode: editPostalCode.trim().toUpperCase()
      })
      if (success) {
        showSuccessToast('Address updated!')
        setShowEditAddress(false)
      }
    } finally {
      setSaving(false)
    }
  }
  
  const handleSavePhone = async () => {
    setSaving(true)
    try {
      const success = await updateProfile({ phone: editPhone.trim() })
      if (success) {
        showSuccessToast('Phone updated!')
        setShowEditPhone(false)
      }
    } finally {
      setSaving(false)
    }
  }
  
  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout()
      navigate('/')
    }
  }

  // Modal component
  const Modal = ({ 
    show, 
    onClose, 
    title, 
    children 
  }: { 
    show: boolean
    onClose: () => void
    title: string
    children: React.ReactNode 
  }) => {
    if (!show) return null
    return (
      <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
        <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[80vh] overflow-auto">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-secondary-900">{title}</h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="p-4">
            {children}
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="px-5 py-6 safe-top pb-24">
      <h1 className="text-2xl font-bold text-secondary-900 mb-6">Profile</h1>
      
      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg z-50 animate-fadeIn">
          <Check className="w-4 h-4" />
          {successMessage}
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
          <button
            onClick={() => {
              setEditName(user?.name || '')
              setShowEditProfile(true)
            }}
            className="w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-100"
          >
            <User className="w-5 h-5 text-gray-400" />
            <div className="flex-1">
              <span className="text-secondary-900">Edit Profile</span>
              <p className="text-sm text-gray-400">{user?.name}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </button>
          
          <button
            onClick={() => {
              setEditAddress(user?.address || '')
              setEditPostalCode(user?.postalCode || '')
              setShowEditAddress(true)
            }}
            className="w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-100"
          >
            <MapPin className="w-5 h-5 text-gray-400" />
            <div className="flex-1">
              <span className="text-secondary-900">Address</span>
              <p className="text-sm text-gray-400">{user?.address || 'Not set'}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </button>
          
          <button
            onClick={() => {
              setEditPhone(user?.phone || '')
              setShowEditPhone(true)
            }}
            className="w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-gray-50 transition-colors"
          >
            <Phone className="w-5 h-5 text-gray-400" />
            <div className="flex-1">
              <span className="text-secondary-900">Phone</span>
              <p className="text-sm text-gray-400">{user?.phone || 'Not set'}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </button>
        </div>
        
        {/* Settings */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <button
            onClick={() => navigate('/payment-methods')}
            className="w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-100"
          >
            <CreditCard className="w-5 h-5 text-gray-400" />
            <span className="flex-1 text-secondary-900">Payment Methods</span>
            <span className="text-xs text-gray-400 mr-2">Coming soon</span>
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </button>
          
          <button
            onClick={() => navigate('/notifications')}
            className="w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-gray-50 transition-colors"
          >
            <Bell className="w-5 h-5 text-gray-400" />
            <span className="flex-1 text-secondary-900">Notifications</span>
            <span className="text-xs text-gray-400 mr-2">Coming soon</span>
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </button>
        </div>
        
        {/* Support */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <a
            href="mailto:support@cleangrid.at"
            className="w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-100"
          >
            <HelpCircle className="w-5 h-5 text-gray-400" />
            <div className="flex-1">
              <span className="text-secondary-900">Help & Support</span>
              <p className="text-sm text-gray-400">support@cleangrid.at</p>
            </div>
            <Mail className="w-5 h-5 text-gray-300" />
          </a>
          
          <button
            onClick={() => navigate('/terms')}
            className="w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-gray-50 transition-colors"
          >
            <FileText className="w-5 h-5 text-gray-400" />
            <span className="flex-1 text-secondary-900">Terms & Privacy</span>
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </button>
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

      {/* Edit Profile Modal */}
      <Modal show={showEditProfile} onClose={() => setShowEditProfile(false)} title="Edit Profile">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Your full name"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowEditProfile(false)}
              className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-600 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveName}
              disabled={saving || !editName.trim()}
              className="flex-1 py-3 bg-primary text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Address Modal */}
      <Modal show={showEditAddress} onClose={() => setShowEditAddress(false)} title="Edit Address">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
            <input
              type="text"
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="123 Main Street, City"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
            <input
              type="text"
              value={editPostalCode}
              onChange={(e) => setEditPostalCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="M5V 3A8"
              maxLength={7}
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowEditAddress(false)}
              className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-600 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAddress}
              disabled={saving}
              className="flex-1 py-3 bg-primary text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Phone Modal */}
      <Modal show={showEditPhone} onClose={() => setShowEditPhone(false)} title="Edit Phone">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              type="tel"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="+1 (555) 123-4567"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowEditPhone(false)}
              className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-600 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSavePhone}
              disabled={saving || !editPhone.trim()}
              className="flex-1 py-3 bg-primary text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
