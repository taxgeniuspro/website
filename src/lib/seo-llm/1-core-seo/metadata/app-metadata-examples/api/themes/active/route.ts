import { NextResponse } from 'next/server'
import { themeManager } from '@/lib/theme-manager'
import { cache } from 'ioredis'

export async function GET(): Promise<unknown> {
  try {
    // Cache key for active theme
    const cacheKey = 'themes:active'
    const cached = await cache.get(cacheKey)
    if (cached) return NextResponse.json(cached)

    const activeTheme = await themeManager.getActiveTheme()

    if (!activeTheme) {
      // Return default theme if no active theme
      const defaultTheme = themeManager.getDefaultTheme()
      await cache.set(cacheKey, defaultTheme, 3600)
      return NextResponse.json(defaultTheme)
    }

    // Cache for 1 hour (3600 seconds)
    await cache.set(cacheKey, activeTheme, 3600)

    return NextResponse.json(activeTheme)
  } catch (error) {
    // Return default theme on error
    return NextResponse.json(themeManager.getDefaultTheme())
  }
}
