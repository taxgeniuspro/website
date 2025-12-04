/**
 * Force admin role update with cache invalidation
 * This script bypasses middleware and forces Clerk to update the role
 */

import { clerkClient } from '@clerk/nextjs/server'

async function forceAdminRole() {
  const email = 'iradwatkins@gmail.com'

  try {
    console.log(`🔍 Forcing admin role for ${email}...`)

    const clerk = await clerkClient()

    // Get user by email
    const users = await clerk.users.getUserList({
      emailAddress: [email],
    })

    if (users.data.length === 0) {
      console.error(`❌ No user found with email: ${email}`)
      process.exit(1)
    }

    const user = users.data[0]
    console.log(`✅ Found user: ${user.id}`)

    // Current role
    const currentRole = user.publicMetadata?.role
    console.log(`📋 Current role in database: ${currentRole}`)

    // Force update with cache invalidation
    await clerk.users.updateUserMetadata(user.id, {
      publicMetadata: {
        role: 'admin',
        lastRoleUpdate: new Date().toISOString(),
        forceUpdate: Date.now() // Force cache bust
      },
    })

    console.log(`✅ Successfully FORCED admin role for ${email}`)

    // Verify the update
    const updatedUser = await clerk.users.getUser(user.id)
    const newRole = updatedUser.publicMetadata?.role
    console.log(`✅ Verified role in database: ${newRole}`)

    if (newRole === 'admin') {
      console.log(`🎉 SUCCESS! Role is now admin.`)
      console.log(``)
      console.log(`⚠️  IMPORTANT NEXT STEPS:`)
      console.log(`1. User MUST sign out completely`)
      console.log(`2. Close ALL browser tabs for taxgeniuspro.tax`)
      console.log(`3. Wait 10 seconds`)
      console.log(`4. Sign back in`)
      console.log(`5. Or use incognito/private window for instant test`)
    } else {
      console.log(`❌ Role update failed. Role is still: ${newRole}`)
    }

  } catch (error) {
    console.error('❌ Error forcing admin role:', error)
    process.exit(1)
  }
}

forceAdminRole()
