import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  MessageCircle, 
  Phone, 
  Mail, 
  HelpCircle, 
  FileText, 
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Clock,
  MapPin
} from 'lucide-react'

interface FAQ {
  question: string
  answer: string
}

const faqs: FAQ[] = [
  {
    question: "How do I book a cleaning?",
    answer: "Tap 'Get Quote' on the home screen, select your property, choose a service and frequency, pick a date and time, then complete payment. Your cleaning will be confirmed instantly!"
  },
  {
    question: "Can I reschedule or cancel my booking?",
    answer: "Yes! Go to 'My Bookings', tap on the booking you want to change, and select 'Reschedule' or 'Cancel'. Cancellations made 24+ hours before are fully refunded."
  },
  {
    question: "What's included in a regular cleaning?",
    answer: "Regular cleaning includes: dusting all surfaces, vacuuming/mopping floors, cleaning bathrooms (toilet, sink, shower/tub), kitchen cleaning (counters, sink, stovetop exterior), and making beds."
  },
  {
    question: "What's the difference between regular and deep cleaning?",
    answer: "Deep cleaning includes everything in regular cleaning PLUS: inside appliances (oven, fridge, microwave), baseboards, light fixtures, window sills, inside cabinets, and detailed scrubbing of all surfaces."
  },
  {
    question: "Do I need to be home during the cleaning?",
    answer: "No, you don't need to be home. Just provide access instructions (lockbox code, building access, etc.) in the booking notes. Many customers prefer to return to a freshly cleaned home!"
  },
  {
    question: "What if I'm not satisfied with the cleaning?",
    answer: "Your satisfaction is guaranteed! If you're not happy, contact us within 24 hours and we'll send a cleaner back at no extra charge, or provide a refund for the unsatisfactory areas."
  },
  {
    question: "Are your cleaners insured and background-checked?",
    answer: "Yes! All CleanGrid franchisees carry comprehensive liability insurance and WSIB coverage. All cleaning staff undergo thorough background checks before being approved."
  },
  {
    question: "How does payment work?",
    answer: "Your card is authorized when you book, but not charged until the cleaning is complete. This protects you - you only pay for completed, satisfactory service."
  },
  {
    question: "Do you bring cleaning supplies?",
    answer: "Yes, our cleaners bring all necessary supplies and equipment. If you have specific eco-friendly products you prefer, just let us know in the booking notes."
  },
  {
    question: "What areas do you serve?",
    answer: "CleanGrid currently serves the Greater Toronto Area (GTA) including Toronto, Mississauga, Brampton, Markham, Vaughan, and surrounding areas. We're expanding to more regions soon!"
  }
]

export default function HelpSupport() {
  const navigate = useNavigate()
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-secondary-900">Help & Support</h1>
        </div>
      </div>

      <div className="p-4 space-y-6 pb-24">
        {/* Contact Options */}
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-secondary-900">Contact Us</h2>
            <p className="text-sm text-gray-500">We're here to help!</p>
          </div>
          
          <a 
            href="mailto:support@cleangrid.at"
            className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition-colors border-b border-gray-100"
          >
            <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-secondary-900">Email Support</p>
              <p className="text-sm text-gray-500">support@cleangrid.at</p>
            </div>
            <ExternalLink className="w-5 h-5 text-gray-300" />
          </a>

          <a 
            href="tel:+12892768830"
            className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition-colors border-b border-gray-100"
          >
            <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">
              <Phone className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-secondary-900">Phone Support</p>
              <p className="text-sm text-gray-500">+1 (289) 276-8830</p>
            </div>
            <ExternalLink className="w-5 h-5 text-gray-300" />
          </a>

          <div className="flex items-center gap-4 px-4 py-4">
            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-secondary-900">Support Hours</p>
              <p className="text-sm text-gray-500">Mon-Fri 8AM-8PM, Sat-Sun 9AM-5PM EST</p>
            </div>
          </div>
        </div>

        {/* FAQs */}
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-secondary-900">Frequently Asked Questions</h2>
          </div>
          
          <div className="divide-y divide-gray-100">
            {faqs.map((faq, index) => (
              <div key={index}>
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <HelpCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="flex-1 font-medium text-secondary-900 text-sm">
                    {faq.question}
                  </span>
                  <ChevronDown 
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      expandedFaq === index ? 'rotate-180' : ''
                    }`} 
                  />
                </button>
                {expandedFaq === index && (
                  <div className="px-4 pb-4 pl-12">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-secondary-900">Quick Links</h2>
          </div>
          
          <button
            onClick={() => navigate('/terms')}
            className="w-full flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition-colors border-b border-gray-100"
          >
            <FileText className="w-5 h-5 text-gray-400" />
            <span className="flex-1 text-secondary-900">Terms of Service</span>
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </button>

          <button
            onClick={() => navigate('/privacy')}
            className="w-full flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition-colors border-b border-gray-100"
          >
            <FileText className="w-5 h-5 text-gray-400" />
            <span className="flex-1 text-secondary-900">Privacy Policy</span>
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </button>

          <button
            onClick={() => navigate('/book')}
            className="w-full flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition-colors"
          >
            <MapPin className="w-5 h-5 text-gray-400" />
            <span className="flex-1 text-secondary-900">Service Areas</span>
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </button>
        </div>

        {/* Emergency Notice */}
        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-amber-900">Urgent Issue?</p>
              <p className="text-sm text-amber-700 mt-1">
                For same-day booking issues or emergencies, please call us directly at{' '}
                <a href="tel:+12892768830" className="font-medium underline">
                  +1 (289) 276-8830
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
