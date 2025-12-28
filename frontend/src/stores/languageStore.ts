import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { translations, getNestedValue, type Language } from '../i18n'

interface LanguageState {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: 'en',
      setLanguage: (lang: Language) => set({ language: lang }),
      t: (key: string) => {
        const { language } = get()
        return getNestedValue(translations[language], key)
      }
    }),
    {
      name: 'cleangrid-language'
    }
  )
)
