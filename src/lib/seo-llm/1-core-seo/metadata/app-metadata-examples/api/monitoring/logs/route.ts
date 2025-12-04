import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'
import fs from 'fs'
import path from 'path'

// Store logs in-memory for quick access (last 1000 logs)
const memoryLogs: any[] = []
const MAX_MEMORY_LOGS = 1000

// Also write to a file for persistence
const LOG_FILE = path.join(process.cwd(), 'logs', 'monitoring.jsonl')

// Ensure log directory exists
const logDir = path.dirname(LOG_FILE)
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true })
}

export async function POST(request: NextRequest) {
  try {
    const { logs } = await request.json()

    if (!Array.isArray(logs)) {
      return NextResponse.json({ error: 'Invalid logs format' }, { status: 400 })
    }

    // Get user info if available
    const { user } = await validateRequest()

    // Process each log entry
    for (const log of logs) {
      const enrichedLog = {
        ...log,
        serverTimestamp: new Date().toISOString(),
        userId: log.userId || user?.id,
        userEmail: user?.email,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      }

      // Add to memory logs
      memoryLogs.push(enrichedLog)
      if (memoryLogs.length > MAX_MEMORY_LOGS) {
        memoryLogs.shift()
      }

      // Write to file (append)
      fs.appendFileSync(LOG_FILE, JSON.stringify(enrichedLog) + '\n')

      // For critical errors, store in database
      if (log.type === 'error' && log.level === 'critical') {
        try {
          await prisma.systemLog.create({
            data: {
              type: 'CLIENT_ERROR',
              message: log.message,
              details: log as any,
              userId: user?.id,
            },
          })
        } catch (error) {
          // Silently fail database write
          console.error('Failed to write to database:', error)
        }
      }

      // Special handling for authentication errors
      if (log.category === 'authentication') {
        console.error('🚨 Authentication Error:', {
          message: log.message,
          details: log.details,
          url: log.url,
          userId: log.userId,
        })
      }

      // Special handling for CSP violations
      if (log.category === 'csp') {
        console.warn('⚠️  CSP Violation:', {
          blockedURI: log.details?.blockedURI,
          directive: log.details?.violatedDirective,
          url: log.url,
        })
      }

      // Special handling for payment errors
      if (log.category === 'payment') {
        console.error('💳 Payment Error:', {
          message: log.message,
          details: log.details,
          userId: log.userId,
        })
      }
    }

    return NextResponse.json({ success: true, count: logs.length })
  } catch (error) {
    console.error('Error processing logs:', error)
    return NextResponse.json({ error: 'Failed to process logs' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user } = await validateRequest()

    // Only allow admins to view logs
    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type')
    const category = searchParams.get('category')
    const level = searchParams.get('level')
    const limit = parseInt(searchParams.get('limit') || '100')

    // Filter logs
    let filteredLogs = [...memoryLogs]

    if (type) {
      filteredLogs = filteredLogs.filter((log) => log.type === type)
    }

    if (category) {
      filteredLogs = filteredLogs.filter((log) => log.category === category)
    }

    if (level) {
      filteredLogs = filteredLogs.filter((log) => log.level === level)
    }

    // Get the latest logs
    const logs = filteredLogs.slice(-limit).reverse()

    // Get summary statistics
    const stats = {
      totalLogs: memoryLogs.length,
      errors: memoryLogs.filter((log) => log.type === 'error').length,
      warnings: memoryLogs.filter((log) => log.type === 'warning').length,
      criticalErrors: memoryLogs.filter((log) => log.type === 'error' && log.level === 'critical')
        .length,
      cspViolations: memoryLogs.filter((log) => log.category === 'csp').length,
      authErrors: memoryLogs.filter((log) => log.category === 'authentication').length,
      paymentErrors: memoryLogs.filter((log) => log.category === 'payment').length,
    }

    return NextResponse.json({
      logs,
      stats,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching logs:', error)
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
  }
}
