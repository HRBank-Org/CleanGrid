import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Building2, User, MapPin, FileText, Loader2, Info } from 'lucide-react'
import api from '../services/api'

const STEPS = [
  { id: 1, title: 'Business', icon: Building2 },
  { id: 2, title: 'Contact', icon: User },
  { id: 3, title: 'Area', icon: MapPin },
  { id: 4, title: 'Agree', icon: FileText },
]

// Canadian provinces with their tax structures
const PROVINCES = [
  { code: 'ON', name: 'Ontario', taxType: 'HST', rate: '13%', provincialTaxName: null },
  { code: 'BC', name: 'British Columbia', taxType: 'GST+PST', rate: '5% + 7%', provincialTaxName: 'PST' },
  { code: 'AB', name: 'Alberta', taxType: 'GST', rate: '5%', provincialTaxName: null },
  { code: 'SK', name: 'Saskatchewan', taxType: 'GST+PST', rate: '5% + 6%', provincialTaxName: 'PST' },
  { code: 'MB', name: 'Manitoba', taxType: 'GST+PST', rate: '5% + 7%', provincialTaxName: 'RST' },
  { code: 'QC', name: 'Quebec', taxType: 'GST+QST', rate: '5% + 9.975%', provincialTaxName: 'QST' },
  { code: 'NB', name: 'New Brunswick', taxType: 'HST', rate: '15%', provincialTaxName: null },
  { code: 'NS', name: 'Nova Scotia', taxType: 'HST', rate: '15%', provincialTaxName: null },
  { code: 'PE', name: 'Prince Edward Island', taxType: 'HST', rate: '15%', provincialTaxName: null },
  { code: 'NL', name: 'Newfoundland and Labrador', taxType: 'HST', rate: '15%', provincialTaxName: null },
  { code: 'NT', name: 'Northwest Territories', taxType: 'GST', rate: '5%', provincialTaxName: null },
  { code: 'YT', name: 'Yukon', taxType: 'GST', rate: '5%', provincialTaxName: null },
  { code: 'NU', name: 'Nunavut', taxType: 'GST', rate: '5%', provincialTaxName: null },
]

export default function FranchiseeApply() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [applicationId, setApplicationId] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showProvinceSelect, setShowProvinceSelect] = useState(false)
  
  const [form, setForm] = useState({
    // Entity type
    legalType: 'individual',
    
    // Business identity
    legalName: '',
    operatingName: '',
    
    // Tax registration (required for both individual and corporation)
    businessNumber: '',        // CRA Business Number (9 digits)
    gstHstNumber: '',          // GST/HST Registration Number (BN + RT0001)
    provincialTaxNumber: '',   // PST/QST/RST number if applicable
    
    // Contact
    contactName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    province: 'ON',
    postalCode: '',
    
    // Preferences
    preferredFSAs: '',
    vehicleAccess: false,
    experience: '',
    
    // Agreements
    agreesToHRBank: false,
    agreesToInsurance: false,
    agreesToTerms: false,
  })
  
  const selectedProvince = PROVINCES.find(p => p.code === form.province)
  const needsProvincialTax = selectedProvince?.provincialTaxName !== null
  
  const updateForm = (field: string, value: any) => {
    setForm({ ...form, [field]: value })
    if (errors[field]) setErrors({ ...errors, [field]: '' })
  }
  
  const formatBusinessNumber = (value: string) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, '')
    // Format as XXX XXX XXX (9 digits)
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`
  }
  
  const formatGstNumber = (value: string) => {
    // GST/HST format: 123456789RT0001
    const cleaned = value.replace(/[^0-9RT]/gi, '').toUpperCase()
    return cleaned.slice(0, 15)
  }
  
  const validateStep = () => {
    const newErrors: Record<string, string> = {}
    
    if (step === 1) {
      if (!form.legalName) newErrors.legalName = 'Required'
      if (!form.operatingName) newErrors.operatingName = 'Required'
      // Business number validation (optional but if provided, must be valid)
      if (form.businessNumber && form.businessNumber.replace(/\D/g, '').length !== 9) {
        newErrors.businessNumber = 'Must be 9 digits'
      }
    } else if (step === 2) {
      if (!form.contactName) newErrors.contactName = 'Required'
      if (!form.email) newErrors.email = 'Required'
      if (!form.phone) newErrors.phone = 'Required'
      if (!form.address) newErrors.address = 'Required'
      if (!form.city) newErrors.city = 'Required'
      if (!form.postalCode) newErrors.postalCode = 'Required'
    } else if (step === 4) {
      if (!form.agreesToHRBank) newErrors.agreesToHRBank = 'Required'
      if (!form.agreesToInsurance) newErrors.agreesToInsurance = 'Required'
      if (!form.agreesToTerms) newErrors.agreesToTerms = 'Required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  const handleNext = () => {
    if (validateStep()) setStep(step + 1)
  }
  
  const handleSubmit = async () => {
    if (!validateStep()) return
    
    setLoading(true)
    try {
      const response = await api.post('/franchisee/apply', {
        legalType: form.legalType,
        legalName: form.legalName,
        operatingName: form.operatingName,
        businessNumber: form.businessNumber.replace(/\D/g, '') || undefined,
        gstHstNumber: form.gstHstNumber || undefined,
        provincialTaxNumber: form.provincialTaxNumber || undefined,
        contactName: form.contactName,
        email: form.email,
        phone: form.phone,
        address: form.address,
        city: form.city,
        province: form.province,
        postalCode: form.postalCode.toUpperCase().replace(/\s/g, ''),
        preferredFSAs: form.preferredFSAs ? form.preferredFSAs.split(',').map(s => s.trim().toUpperCase()) : [],
        vehicleAccess: form.vehicleAccess,
        experience: form.experience || undefined,
        agreesToHRBank: form.agreesToHRBank,
        agreesToInsuranceMinimums: form.agreesToInsurance,
      })
      
      setApplicationId(response.data.data.application_id)
      setSubmitted(true)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to submit application')
    } finally {
      setLoading(false)
    }
  }
  
  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <Check className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-secondary-900 mb-2 text-center">Application Submitted!</h1>
        <p className="text-gray-500 text-center mb-8 max-w-sm">
          We'll review your application and contact you within 5 business days.
        </p>
        <div className="bg-gray-50 rounded-xl p-4 mb-8 w-full max-w-sm">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Application ID</p>
          <p className="font-mono text-secondary-900 font-medium">{applicationId}</p>
        </div>
        <Link
          to="/application-status"
          state={{ id: applicationId }}
          className="text-primary font-semibold"
        >
          Check Status
        </Link>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen flex flex-col safe-top">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          {step === 1 ? (
            <Link to="/" className="p-2 -ml-2 rounded-full hover:bg-gray-100">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
          ) : (
            <button onClick={() => setStep(step - 1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          )}
          <h1 className="text-lg font-semibold text-secondary-900">Become a Franchisee</h1>
        </div>
        
        {/* Progress */}
        <div className="flex items-center gap-2 mt-4">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex-1 flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step >= s.id
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {step > s.id ? <Check className="w-4 h-4" /> : s.id}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-1 mx-2 rounded ${step > s.id ? 'bg-primary' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Form Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-secondary-900 mb-1">Business Information</h2>
              <p className="text-gray-500 text-sm">Tell us about your business</p>
            </div>
            
            {/* Entity Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Entity Type</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'individual', label: 'Sole Proprietorship' },
                  { value: 'corporation', label: 'Corporation' }
                ].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => updateForm('legalType', type.value)}
                    className={`p-4 rounded-xl border-2 text-left transition-colors ${
                      form.legalType === type.value
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <span className="font-medium text-secondary-900">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Legal Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {form.legalType === 'corporation' ? 'Corporation Legal Name *' : 'Full Legal Name *'}
              </label>
              <input
                type="text"
                value={form.legalName}
                onChange={(e) => updateForm('legalName', e.target.value)}
                className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent ${
                  errors.legalName ? 'border-red-300' : 'border-gray-200'
                }`}
                placeholder={form.legalType === 'corporation' ? 'ABC Cleaning Inc.' : 'John Smith'}
              />
              {errors.legalName && <p className="text-red-500 text-xs mt-1">{errors.legalName}</p>}
            </div>
            
            {/* Operating Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Operating Name (DBA) *</label>
              <input
                type="text"
                value={form.operatingName}
                onChange={(e) => updateForm('operatingName', e.target.value)}
                className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent ${
                  errors.operatingName ? 'border-red-300' : 'border-gray-200'
                }`}
                placeholder="Smith's Cleaning Services"
              />
              {errors.operatingName && <p className="text-red-500 text-xs mt-1">{errors.operatingName}</p>}
            </div>
            
            {/* Tax Registration Section */}
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-start gap-2 mb-4">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-600">
                  Tax registration numbers are required to operate as a CleanGrid franchisee. 
                  If you don't have these yet, you can submit without them and provide later.
                </p>
              </div>
              
              {/* Business Number */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CRA Business Number (BN)
                </label>
                <input
                  type="text"
                  value={form.businessNumber}
                  onChange={(e) => updateForm('businessNumber', formatBusinessNumber(e.target.value))}
                  className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent ${
                    errors.businessNumber ? 'border-red-300' : 'border-gray-200'
                  }`}
                  placeholder="123 456 789"
                  maxLength={11}
                />
                <p className="text-xs text-gray-400 mt-1">9-digit number from CRA</p>
                {errors.businessNumber && <p className="text-red-500 text-xs mt-1">{errors.businessNumber}</p>}
              </div>
              
              {/* GST/HST Number */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GST/HST Registration Number
                </label>
                <input
                  type="text"
                  value={form.gstHstNumber}
                  onChange={(e) => updateForm('gstHstNumber', formatGstNumber(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="123456789RT0001"
                  maxLength={15}
                />
                <p className="text-xs text-gray-400 mt-1">Your BN followed by RT and 4 digits (e.g., RT0001)</p>
              </div>
              
              {/* Province Selection for Tax Context */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Province of Operation
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowProvinceSelect(!showProvinceSelect)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-left flex items-center justify-between"
                  >
                    <span>{selectedProvince?.name || 'Select province'}</span>
                    <span className="text-xs text-gray-400">{selectedProvince?.taxType} ({selectedProvince?.rate})</span>
                  </button>
                  
                  {showProvinceSelect && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                      {PROVINCES.map((prov) => (
                        <button
                          key={prov.code}
                          type="button"
                          onClick={() => {
                            updateForm('province', prov.code)
                            setShowProvinceSelect(false)
                          }}
                          className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between ${
                            form.province === prov.code ? 'bg-primary/5' : ''
                          }`}
                        >
                          <span className="font-medium">{prov.name}</span>
                          <span className="text-xs text-gray-400">{prov.taxType} ({prov.rate})</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Provincial Tax Number (if applicable) */}
              {needsProvincialTax && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {selectedProvince?.provincialTaxName} Registration Number
                  </label>
                  <input
                    type="text"
                    value={form.provincialTaxNumber}
                    onChange={(e) => updateForm('provincialTaxNumber', e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder={`Enter your ${selectedProvince?.provincialTaxName} number`}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {selectedProvince?.code === 'QC' && 'Quebec Sales Tax registration number'}
                    {selectedProvince?.code === 'BC' && 'BC Provincial Sales Tax number'}
                    {selectedProvince?.code === 'SK' && 'Saskatchewan PST Vendor Licence number'}
                    {selectedProvince?.code === 'MB' && 'Manitoba Retail Sales Tax number'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-secondary-900 mb-1">Contact Information</h2>
              <p className="text-gray-500 text-sm">How can we reach you?</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact Name *</label>
              <input
                type="text"
                value={form.contactName}
                onChange={(e) => updateForm('contactName', e.target.value)}
                className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-primary ${
                  errors.contactName ? 'border-red-300' : 'border-gray-200'
                }`}
                placeholder="Primary contact"
              />
              {errors.contactName && <p className="text-red-500 text-xs mt-1">{errors.contactName}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateForm('email', e.target.value)}
                className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-primary ${
                  errors.email ? 'border-red-300' : 'border-gray-200'
                }`}
                placeholder="email@example.com"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => updateForm('phone', e.target.value)}
                className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-primary ${
                  errors.phone ? 'border-red-300' : 'border-gray-200'
                }`}
                placeholder="(416) 555-1234"
              />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Street Address *</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => updateForm('address', e.target.value)}
                className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-primary ${
                  errors.address ? 'border-red-300' : 'border-gray-200'
                }`}
                placeholder="123 Main Street, Suite 100"
              />
              {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => updateForm('city', e.target.value)}
                  className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-primary ${
                    errors.city ? 'border-red-300' : 'border-gray-200'
                  }`}
                  placeholder="Toronto"
                />
                {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code *</label>
                <input
                  type="text"
                  value={form.postalCode}
                  onChange={(e) => updateForm('postalCode', e.target.value.toUpperCase())}
                  className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-primary ${
                    errors.postalCode ? 'border-red-300' : 'border-gray-200'
                  }`}
                  placeholder="M5V 1A1"
                  maxLength={7}
                />
                {errors.postalCode && <p className="text-red-500 text-xs mt-1">{errors.postalCode}</p>}
              </div>
            </div>
            
            {/* Show selected province info */}
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Province:</span> {selectedProvince?.name} • 
                <span className="font-medium"> Tax:</span> {selectedProvince?.taxType} ({selectedProvince?.rate})
              </p>
            </div>
          </div>
        )}
        
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-secondary-900 mb-1">Service Preferences</h2>
              <p className="text-gray-500 text-sm">Where would you like to operate?</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Areas (FSA Codes)</label>
              <input
                type="text"
                value={form.preferredFSAs}
                onChange={(e) => updateForm('preferredFSAs', e.target.value.toUpperCase())}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary"
                placeholder="M5V, M5H, M5G"
              />
              <p className="text-xs text-gray-400 mt-1">Comma-separated FSA codes (first 3 characters of postal codes)</p>
            </div>
            
            <div>
              <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.vehicleAccess}
                  onChange={(e) => updateForm('vehicleAccess', e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-secondary-900">I have access to a vehicle for equipment transport</span>
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Relevant Experience</label>
              <textarea
                value={form.experience}
                onChange={(e) => updateForm('experience', e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary min-h-[100px]"
                placeholder="Describe your experience in cleaning services, property management, or related fields..."
              />
            </div>
          </div>
        )}
        
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-secondary-900 mb-1">Agreements</h2>
              <p className="text-gray-500 text-sm">Please review and accept the following</p>
            </div>
            
            <div className={`p-4 bg-white border-2 rounded-xl ${
              errors.agreesToHRBank ? 'border-red-300' : 'border-gray-100'
            }`}>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.agreesToHRBank}
                  onChange={(e) => updateForm('agreesToHRBank', e.target.checked)}
                  className="w-5 h-5 mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <div>
                  <span className="font-medium text-secondary-900">HR Bank Integration *</span>
                  <p className="text-sm text-gray-500 mt-1">
                    I agree to use HR Bank for workforce scheduling and task management.
                  </p>
                </div>
              </label>
            </div>
            
            <div className={`p-4 bg-white border-2 rounded-xl ${
              errors.agreesToInsurance ? 'border-red-300' : 'border-gray-100'
            }`}>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.agreesToInsurance}
                  onChange={(e) => updateForm('agreesToInsurance', e.target.checked)}
                  className="w-5 h-5 mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <div>
                  <span className="font-medium text-secondary-900">Insurance Requirements *</span>
                  <p className="text-sm text-gray-500 mt-1">
                    I agree to maintain $2M CGL insurance, commercial auto insurance (if using vehicle), 
                    and WSIB coverage where applicable.
                  </p>
                </div>
              </label>
            </div>
            
            <div className={`p-4 bg-white border-2 rounded-xl ${
              errors.agreesToTerms ? 'border-red-300' : 'border-gray-100'
            }`}>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.agreesToTerms}
                  onChange={(e) => updateForm('agreesToTerms', e.target.checked)}
                  className="w-5 h-5 mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <div>
                  <span className="font-medium text-secondary-900">Terms & Conditions *</span>
                  <p className="text-sm text-gray-500 mt-1">
                    I accept the CleanGrid Franchisee Agreement including platform fees, 
                    settlement policies, and tax collection/remittance responsibilities.
                  </p>
                </div>
              </label>
            </div>
            
            {/* Tax Summary */}
            <div className="p-4 bg-blue-50 rounded-xl">
              <h4 className="font-medium text-blue-900 mb-2">Tax Collection Responsibility</h4>
              <p className="text-sm text-blue-700">
                As a {selectedProvince?.name} franchisee, you'll collect <strong>{selectedProvince?.taxType}</strong> at <strong>{selectedProvince?.rate}</strong> on services.
                {needsProvincialTax && (
                  <> You must also be registered for <strong>{selectedProvince?.provincialTaxName}</strong>.</>
                )}
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600">
                <strong>No application fee.</strong> You'll only be charged after approval if training or background checks are required.
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-100 pb-safe">
        {step < 4 ? (
          <button
            onClick={handleNext}
            className="w-full py-4 bg-primary text-white font-semibold rounded-xl shadow-lg shadow-primary/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            Continue
            <ArrowRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-4 bg-secondary text-white font-semibold rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                Submit Application
                <Check className="w-5 h-5" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
