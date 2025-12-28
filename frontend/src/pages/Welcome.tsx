import { Link } from 'react-router-dom'
import { Calendar, ShieldCheck, CreditCard, Building2, ChevronRight } from 'lucide-react'

export default function Welcome() {
  return (
    <div className="min-h-screen flex flex-col px-6 py-12 safe-top">
      {/* Logo & Tagline */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <img 
          src="/cleangrid-logo.png" 
          alt="CleanGrid" 
          className="h-20 mb-6"
        />
        <p className="text-gray-500 text-center max-w-xs">
          Book trusted cleaning services for your home or business across Canada
        </p>
        
        {/* Features */}
        <div className="flex justify-center gap-8 mt-10">
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 bg-primary-50 rounded-full flex items-center justify-center mb-2">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xs font-medium text-gray-600">Easy Booking</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 bg-primary-50 rounded-full flex items-center justify-center mb-2">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xs font-medium text-gray-600">Trusted Pros</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 bg-primary-50 rounded-full flex items-center justify-center mb-2">
              <CreditCard className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xs font-medium text-gray-600">Secure Pay</span>
          </div>
        </div>
      </div>
      
      {/* CTAs */}
      <div className="space-y-3 pb-safe">
        <Link
          to="/signup"
          className="block w-full py-4 bg-primary text-white text-center font-semibold rounded-xl shadow-lg shadow-primary/30 active:scale-[0.98] transition-transform"
        >
          Get Started
        </Link>
        <Link
          to="/login"
          className="block w-full py-4 bg-white text-primary text-center font-semibold rounded-xl border-2 border-primary active:scale-[0.98] transition-transform"
        >
          Sign In
        </Link>
        
        {/* Franchisee Link */}
        <Link
          to="/apply"
          className="flex items-center justify-center gap-2 py-4 text-primary"
        >
          <Building2 className="w-5 h-5" />
          <span className="font-medium">Become a Franchisee</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
