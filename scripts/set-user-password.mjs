#!/usr/bin/env node
/**
 * Set User Password Script
 *
 * Usage: node scripts/set-user-password.mjs <email> <password>
 *
 * Example: node scripts/set-user-password.mjs whitegelisa@gmail.com MyPassword123
 */

import bcrypt from 'bcryptjs';
import pg from 'pg';

const { Client } = pg;

async function setUserPassword(email, password) {
  if (!email || !password) {
    console.error('Usage: node scripts/set-user-password.mjs <email> <password>');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Password must be at least 8 characters long');
    process.exit(1);
  }

  // Database connection
  const DATABASE_URL = process.env.DATABASE_URL ||
    'postgresql://taxgeniuspro_user:TaxGenius2024Secure@72.60.28.175:5435/taxgeniuspro_db?schema=public';

  const client = new Client({
    connectionString: DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Find the user (try both table name formats)
    let userResult;
    try {
      userResult = await client.query(
        'SELECT id, email, name, "hashedPassword" IS NOT NULL as has_password FROM "User" WHERE LOWER(email) = LOWER($1)',
        [email]
      );
    } catch (e) {
      // Try lowercase table name
      userResult = await client.query(
        'SELECT id, email, name, "hashedPassword" IS NOT NULL as has_password FROM users WHERE LOWER(email) = LOWER($1)',
        [email]
      );
    }

    if (userResult.rows.length === 0) {
      console.error(`User not found: ${email}`);
      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log(`Found user: ${user.name} (${user.email})`);
    console.log(`Current password status: ${user.has_password ? 'Has password' : 'No password'}`);

    // Hash the new password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log('Password hashed successfully');

    // Update the user (try both table name formats)
    try {
      await client.query(
        'UPDATE "User" SET "hashedPassword" = $1, "updatedAt" = NOW() WHERE id = $2',
        [hashedPassword, user.id]
      );
    } catch (e) {
      await client.query(
        'UPDATE users SET "hashedPassword" = $1, "updatedAt" = NOW() WHERE id = $2',
        [hashedPassword, user.id]
      );
    }

    console.log(`\n✅ Password set successfully for ${email}`);
    console.log(`\nThe user can now log in at: https://taxgeniuspro.tax/en/auth/signin`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const email = args[0];
const password = args[1];

setUserPassword(email, password);
