import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest } from '@/lib/auth'

function getPermissionsForRole(role: string): string[] {
  const permissions: { [key: string]: string[] } = {
    ADMIN: [
      'Manage Users',
      'Manage Products',
      'Manage Orders',
      'View Analytics',
      'Manage Settings',
      'Manage Vendors',
      'Manage Marketing',
      'View Financial Reports',
      'System Configuration',
    ],
    STAFF: ['View Users', 'Manage Products', 'Manage Orders', 'View Analytics', 'Customer Support'],
    CUSTOMER: ['View Products', 'Place Orders', 'View Order History'],
  }

  return permissions[role] || []
}

// GET all staff members and stats
export async function GET(request: NextRequest) {
  try {
    const { user } = await validateRequest()

    // Only admins can view staff
    if (!user?.id || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all users with ADMIN or STAFF roles
    const allStaff = await prisma.user.findMany({
      where: {
        role: {
          in: ['ADMIN', 'STAFF'],
        },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        lastLoginAt: true,
        isActive: true,
      },
    })

    // Map staff with permissions
    const staff = allStaff.map((member) => ({
      ...member,
      permissions: getPermissionsForRole(member.role),
    }))

    // Calculate stats
    const stats = {
      total: staff.length,
      active: staff.filter((s) => s.emailVerified && s.isActive).length,
      pending: staff.filter((s) => !s.emailVerified).length,
      admins: staff.filter((s) => s.role === 'ADMIN').length,
    }

    // Get role counts
    const roleCounts = await prisma.user.groupBy({
      by: ['role'],
      where: {
        role: {
          in: ['ADMIN', 'STAFF'],
        },
      },
      _count: true,
    })

    const roles = ['ADMIN', 'STAFF'].map((roleName) => ({
      name: roleName,
      count: roleCounts.find((r) => r.role === roleName)?._count || 0,
      permissions: getPermissionsForRole(roleName),
    }))

    // Get recent activity (last 20 sessions)
    const recentSessions = await prisma.session.findMany({
      where: {
        user: {
          role: {
            in: ['ADMIN', 'STAFF'],
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    const recentActivity = recentSessions.map((session, index) => ({
      id: session.id,
      userId: session.userId,
      userName: session.user.name || session.user.email,
      action: 'Logged in',
      timestamp: session.createdAt,
      details: `Session started`,
    }))

    return NextResponse.json({
      staff,
      roles,
      stats,
      recentActivity,
    })
  } catch (error) {
    console.error('Failed to fetch staff:', error)
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 })
  }
}

// CREATE a new staff member
export async function POST(request: NextRequest) {
  try {
    const { user } = await validateRequest()

    if (!user?.id || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, role } = body

    // Validate required fields
    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 })
    }

    // Validate role
    if (!['ADMIN', 'STAFF'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 })
    }

    // Create new staff member
    const newStaff = await prisma.user.create({
      data: {
        id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        email,
        name: name || email.split('@')[0],
        role,
        emailVerified: null,
        isActive: true,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      staff: {
        ...newStaff,
        permissions: getPermissionsForRole(newStaff.role),
      },
    })
  } catch (error) {
    console.error('Failed to create staff member:', error)
    return NextResponse.json({ error: 'Failed to create staff member' }, { status: 500 })
  }
}

// UPDATE a staff member
export async function PUT(request: NextRequest) {
  try {
    const { user } = await validateRequest()

    if (!user?.id || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Validate role if provided
    if (updateData.role && !['ADMIN', 'STAFF', 'CUSTOMER'].includes(updateData.role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const updatedStaff = await prisma.user.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      staff: {
        ...updatedStaff,
        permissions: getPermissionsForRole(updatedStaff.role),
      },
    })
  } catch (error) {
    console.error('Failed to update staff member:', error)
    return NextResponse.json({ error: 'Failed to update staff member' }, { status: 500 })
  }
}

// DELETE a staff member
export async function DELETE(request: NextRequest) {
  try {
    const { user } = await validateRequest()

    if (!user?.id || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Prevent self-deletion
    if (id === user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    // Soft delete by setting isActive to false
    await prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Staff member deactivated successfully',
    })
  } catch (error) {
    console.error('Failed to delete staff member:', error)
    return NextResponse.json({ error: 'Failed to delete staff member' }, { status: 500 })
  }
}
