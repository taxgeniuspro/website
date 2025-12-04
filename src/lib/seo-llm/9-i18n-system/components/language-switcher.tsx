'use client'

import { usePathname, useRouter } from '@/lib/i18n/navigation'
import { useLocale } from 'next-intl'
import { useTenantInfo } from '@/components/tenants/tenant-provider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Globe, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LanguageSwitcherProps {
  variant?: 'select' | 'dropdown' | 'buttons'
  className?: string
  showFlag?: boolean
  showName?: boolean
}

export function LanguageSwitcher({
  variant = 'dropdown',
  className,
  showFlag = true,
  showName = true,
}: LanguageSwitcherProps) {
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const tenant = useTenantInfo()

  // Get supported locales from tenant or default
  const supportedLocales = tenant?.locales || ['en', 'es']

  // Language configurations
  const languages = {
    en: {
      code: 'en',
      name: 'English',
      nativeName: 'English',
      flag: '🇺🇸',
    },
    es: {
      code: 'es',
      name: 'Spanish',
      nativeName: 'Español',
      flag: '🇪🇸',
    },
    fr: {
      code: 'fr',
      name: 'French',
      nativeName: 'Français',
      flag: '🇫🇷',
    },
    de: {
      code: 'de',
      name: 'German',
      nativeName: 'Deutsch',
      flag: '🇩🇪',
    },
    it: {
      code: 'it',
      name: 'Italian',
      nativeName: 'Italiano',
      flag: '🇮🇹',
    },
    pt: {
      code: 'pt',
      name: 'Portuguese',
      nativeName: 'Português',
      flag: '🇵🇹',
    },
    nl: {
      code: 'nl',
      name: 'Dutch',
      nativeName: 'Nederlands',
      flag: '🇳🇱',
    },
    ru: {
      code: 'ru',
      name: 'Russian',
      nativeName: 'Русский',
      flag: '🇷🇺',
    },
    ja: {
      code: 'ja',
      name: 'Japanese',
      nativeName: '日本語',
      flag: '🇯🇵',
    },
    ko: {
      code: 'ko',
      name: 'Korean',
      nativeName: '한국어',
      flag: '🇰🇷',
    },
    zh: {
      code: 'zh',
      name: 'Chinese',
      nativeName: '中文',
      flag: '🇨🇳',
    },
    ar: {
      code: 'ar',
      name: 'Arabic',
      nativeName: 'العربية',
      flag: '🇸🇦',
    },
  }

  // Filter languages by supported locales
  const availableLanguages = supportedLocales
    .map((code) => languages[code as keyof typeof languages])
    .filter(Boolean)

  const currentLanguage = languages[locale as keyof typeof languages]

  const handleLanguageChange = async (newLocale: string) => {
    // Navigate to new locale
    router.replace(pathname, { locale: newLocale })

    // Also save user preference to database if they're logged in
    try {
      await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredLanguage: newLocale }),
      })
    } catch (error) {
      // Silently fail - language change still works via cookie
      console.error('Failed to save language preference:', error)
    }
  }

  // Don't render if only one language is supported
  if (availableLanguages.length <= 1) {
    return null
  }

  if (variant === 'select') {
    return (
      <Select value={locale} onValueChange={handleLanguageChange}>
        <SelectTrigger className={cn('w-auto', className)}>
          <SelectValue>
            <div className="flex items-center gap-2">
              {showFlag && currentLanguage?.flag}
              {showName && <span className="hidden sm:inline">{currentLanguage?.nativeName}</span>}
              <span className="sm:hidden">{locale.toUpperCase()}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {availableLanguages.map((language) => (
            <SelectItem key={language.code} value={language.code}>
              <div className="flex items-center gap-2">
                {showFlag && language.flag}
                <span>{language.nativeName}</span>
                {locale === language.code && <Check className="h-4 w-4 ml-auto" />}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (variant === 'buttons') {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        {availableLanguages.map((language) => (
          <Button
            key={language.code}
            className="px-2 py-1"
            size="sm"
            variant={locale === language.code ? 'default' : 'ghost'}
            onClick={() => handleLanguageChange(language.code)}
          >
            {showFlag && language.flag}
            {showName && <span className="ml-1 hidden sm:inline">{language.nativeName}</span>}
            <span className="ml-1 sm:hidden">{language.code.toUpperCase()}</span>
          </Button>
        ))}
      </div>
    )
  }

  // Default: dropdown variant
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className={cn('gap-2', className)} size="sm" variant="ghost">
          <Globe className="h-4 w-4" />
          {showFlag && currentLanguage?.flag}
          {showName && <span className="hidden sm:inline">{currentLanguage?.nativeName}</span>}
          <span className="sm:hidden">{locale.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableLanguages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            className="flex items-center gap-2"
            onClick={() => handleLanguageChange(language.code)}
          >
            {showFlag && language.flag}
            <span>{language.nativeName}</span>
            <span className="text-xs text-gray-500 ml-auto">{language.name}</span>
            {locale === language.code && <Check className="h-4 w-4 ml-2" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Compact version for mobile/small spaces
export function CompactLanguageSwitcher({ className }: { className?: string }) {
  return (
    <LanguageSwitcher className={className} showFlag={true} showName={false} variant="dropdown" />
  )
}

// Full version for desktop/large spaces
export function FullLanguageSwitcher({ className }: { className?: string }) {
  return (
    <LanguageSwitcher className={className} showFlag={true} showName={true} variant="dropdown" />
  )
}

// Button group version
export function LanguageButtonGroup({ className }: { className?: string }) {
  return (
    <LanguageSwitcher className={className} showFlag={true} showName={false} variant="buttons" />
  )
}

// Hook to get language information
export function useLanguageInfo() {
  const locale = useLocale()
  const tenant = useTenantInfo()

  const languages = {
    en: { name: 'English', nativeName: 'English', flag: '🇺🇸', direction: 'ltr' },
    es: { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', direction: 'ltr' },
    fr: { name: 'French', nativeName: 'Français', flag: '🇫🇷', direction: 'ltr' },
    de: { name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', direction: 'ltr' },
    ar: { name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', direction: 'rtl' },
  }

  const currentLanguage = languages[locale as keyof typeof languages]
  const supportedLocales = tenant?.locales || ['en', 'es']

  return {
    locale,
    currentLanguage,
    supportedLocales,
    isRTL: currentLanguage?.direction === 'rtl',
  }
}
