import { useLanguageStore } from '../stores/languageStore'

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguageStore()

  return (
    <div className="flex items-center gap-1 text-sm font-medium">
      <button
        onClick={() => setLanguage('en')}
        className={`px-2 py-1 rounded transition-colors ${
          language === 'en'
            ? 'text-primary bg-primary-50'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        EN
      </button>
      <span className="text-gray-300">|</span>
      <button
        onClick={() => setLanguage('fr')}
        className={`px-2 py-1 rounded transition-colors ${
          language === 'fr'
            ? 'text-primary bg-primary-50'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        FR
      </button>
    </div>
  )
}
