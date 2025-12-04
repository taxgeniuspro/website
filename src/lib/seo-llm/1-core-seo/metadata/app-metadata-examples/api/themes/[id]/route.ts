import { type NextRequest, NextResponse } from 'next/server'
import { themeManager } from '@/lib/theme-manager'
import { validateRequest } from '@/lib/auth'

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    // Validate admin access
    const { user } = await validateRequest()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()

    if (body.activate) {
      // Activate theme
      await themeManager.setActiveTheme(id)
      return NextResponse.json({ success: true, message: 'Theme activated' })
    }

    // Update theme
    const theme = await themeManager.saveTheme({
      id,
      ...body,
    })

    return NextResponse.json(theme)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update theme' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    // Validate admin access
    const { user } = await validateRequest()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    await themeManager.deleteTheme(id)

    return NextResponse.json({ success: true, message: 'Theme deleted' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete theme' }, { status: 500 })
  }
}
