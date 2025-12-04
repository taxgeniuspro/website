import { type NextRequest, NextResponse } from 'next/server'
import { themeManager } from '@/lib/theme-manager'
import { validateRequest } from '@/lib/auth'
import { cache } from 'ioredis'

export async function GET(): Promise<unknown> {
  try {
    // Cache key for themes
    const cacheKey = 'themes:list'
    const cached = await cache.get(cacheKey)
    if (cached) return NextResponse.json(cached)

    const themes = await themeManager.getThemes()

    // Cache for 1 hour (3600 seconds)
    await cache.set(cacheKey, themes, 3600)

    return NextResponse.json(themes)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch themes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate admin access
    const { user } = await validateRequest()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const name = formData.get('name') as string
    const description = formData.get('description') as string

    if (!file || !name) {
      return NextResponse.json({ error: 'File and name are required' }, { status: 400 })
    }

    // Read CSS file content
    const cssContent = await file.text()

    // Apply theme from CSS
    const theme = await themeManager.applyThemeFromCSS(cssContent, name, description)

    return NextResponse.json(theme)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to upload theme' }, { status: 500 })
  }
}
