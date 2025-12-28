import en from './en.json'
import fr from './fr.json'

export type Language = 'en' | 'fr'

export const translations = {
  en,
  fr
} as const

export type TranslationKeys = typeof en

// Helper to get nested translation value
export function getNestedValue(obj: any, path: string): string {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj) || path
}
