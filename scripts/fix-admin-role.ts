/**
 * Emergency Script: Set iradwatkins@gmail.com as super_admin
 * Run this once to fix the role immediately
 */

import { clerkClient } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixAdminRole() {
  try {
    console.log('🔍 Searching for iradwatkins@gmail.com in Clerk...')

    const clerk = await clerkClient()
    const users = await clerk.users.getUserList({
      emailAddress: ['iradwatkins@gmail.com'],
    })

    if (users.data.length === 0) {
      console.error('❌ User not found with email: iradwatkins@gmail.com')
      process.exit(1)
    }

    const user = users.data[0]
    console.log(`✅ Found user: ${user.id}`)

    // Update Clerk metadata
    console.log('📝 Setting role to super_admin in Clerk...')
    await clerk.users.updateUserMetadata(user.id, {
      publicMetadata: {
        role: 'super_admin',
      },
    })
    console.log('✅ Clerk metadata updated')

    // Update or create profile in database
    console.log('📝 Updating database profile...')
    const profile = await prisma.profile.findUnique({
      where: { clerkUserId: user.id },
    })

    if (!profile) {
      await prisma.profile.create({
        data: {
          clerkUserId: user.id,
          role: 'SUPER_ADMIN',
          email: user.emailAddresses[0]?.emailAddress || 'iradwatkins@gmail.com',
          firstName: user.firstName || 'Irad',
          lastName: user.lastName || 'Watkins',
        },
      })
      console.log('✅ Profile created in database')
    } else if (profile.role !== 'SUPER_ADMIN') {
      await prisma.profile.update({
        where: { id: profile.id },
        data: { role: 'SUPER_ADMIN' },
      })
      console.log('✅ Profile role updated to SUPER_ADMIN')
    } else {
      console.log('✅ Profile already has SUPER_ADMIN role')
    }

    console.log('')
    console.log('✅ SUCCESS! iradwatkins@gmail.com is now super_admin')
    console.log('🔄 Please sign out and sign back in to see the changes')
    console.log('')
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

fixAdminRole()
