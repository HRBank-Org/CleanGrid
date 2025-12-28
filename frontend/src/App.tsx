import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'

// Layouts
import PublicLayout from './layouts/PublicLayout'
import CustomerLayout from './layouts/CustomerLayout'
import FranchiseeLayout from './layouts/FranchiseeLayout'
import AdminLayout from './layouts/AdminLayout'

// Public Pages
import Welcome from './pages/Welcome'
import Login from './pages/Login'
import Signup from './pages/Signup'
import FranchiseeApply from './pages/FranchiseeApply'
import ApplicationStatus from './pages/ApplicationStatus'

// Customer Pages
import Home from './pages/customer/Home'
import Bookings from './pages/customer/Bookings'
import Properties from './pages/customer/Properties'
import Profile from './pages/customer/Profile'

// Franchisee Pages
import FranchiseeLogin from './pages/franchisee/FranchiseeLogin'
import FranchiseeDashboard from './pages/franchisee/FranchiseeDashboard'
import FranchiseeJobs from './pages/franchisee/FranchiseeJobs'
import FranchiseeSettlements from './pages/franchisee/FranchiseeSettlements'
import FranchiseeProfile from './pages/franchisee/FranchiseeProfile'

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminApplications from './pages/admin/AdminApplications'
import AdminTerritories from './pages/admin/AdminTerritories'
import AdminProfile from './pages/admin/AdminProfile'

function ProtectedRoute({ children, redirectTo = '/login' }: { children: React.ReactNode, redirectTo?: string }) {
  const { token, isLoading } = useAuthStore()
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    )
  }
  
  if (!token) {
    return <Navigate to={redirectTo} replace />
  }
  
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/apply" element={<FranchiseeApply />} />
        <Route path="/application-status" element={<ApplicationStatus />} />
      </Route>
      
      {/* Protected Customer Routes */}
      <Route
        element={
          <ProtectedRoute>
            <CustomerLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/home" element={<Home />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/properties" element={<Properties />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      
      {/* Franchisee Routes */}
      <Route path="/franchisee" element={<FranchiseeLogin />} />
      <Route
        element={
          <ProtectedRoute redirectTo="/franchisee">
            <FranchiseeLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/franchisee/dashboard" element={<FranchiseeDashboard />} />
        <Route path="/franchisee/jobs" element={<FranchiseeJobs />} />
        <Route path="/franchisee/settlements" element={<FranchiseeSettlements />} />
        <Route path="/franchisee/profile" element={<FranchiseeProfile />} />
      </Route>
      
      {/* Admin Routes */}
      <Route path="/admin" element={<AdminLogin />} />
      <Route
        element={
          <ProtectedRoute redirectTo="/admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/applications" element={<AdminApplications />} />
        <Route path="/admin/territories" element={<AdminTerritories />} />
        <Route path="/admin/profile" element={<AdminProfile />} />
      </Route>
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
