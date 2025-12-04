import { type NextRequest, NextResponse } from 'next/server'
import { themeManager } from '@/lib/theme-manager'
import { validateRequest } from '@/lib/auth'
import { ThemeImporter } from '@/lib/theme-importer'

export async function POST(request: NextRequest) {
  try {
    // Validate admin access
    const { user } = await validateRequest()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { url, name, description, applyImmediately = false } = body

    if (!url) {
      return NextResponse.json({ error: 'Theme URL is required' }, { status: 400 })
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    // Import theme from URL
    const importer = new ThemeImporter()
    const themeData = await importer.importFromURL(url)

    // Create theme name if not provided
    const themeName = name || themeData.name || `Imported Theme ${Date.now()}`

    // Apply theme using existing theme manager
    const theme = await themeManager.applyThemeFromCSS(
      themeData.cssContent,
      themeName,
      description || themeData.description
    )

    // Apply immediately if requested
    if (applyImmediately && theme.id) {
      await themeManager.setActiveTheme(theme.id)

      // Update globals.css directly for immediate effect
      await themeManager.updateGlobalCSS(theme)
    }

    return NextResponse.json({
      success: true,
      theme,
      applied: applyImmediately,
      message: applyImmediately
        ? 'Theme imported and applied successfully'
        : 'Theme imported successfully',
    })
  } catch (error) {
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        return NextResponse.json(
          { error: 'Failed to fetch theme from URL. Please check the URL and try again.' },
          { status: 400 }
        )
      }
      if (error.message.includes('parse')) {
        return NextResponse.json(
          { error: 'Failed to parse theme data. The URL may not contain valid theme information.' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json({ error: 'Failed to import theme' }, { status: 500 })
  }
}

// Get import history
export async function GET(): Promise<unknown> {
  try {
    const { user } = await validateRequest()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all themes sorted by creation date
    const themes = await themeManager.getThemes()

    return NextResponse.json({
      themes,
      totalCount: themes.length,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch import history' }, { status: 500 })
  }
}
