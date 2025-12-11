/**
 * Sign Up API Route
 * Creates new user accounts with hashed passwords and profile
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Check if user already exists (case-insensitive)
    const existingUser = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Parse name into firstName, middleName, lastName
    const nameParts = name.split(' ').filter((part: string) => part.length > 0);
    let firstName = '';
    let middleName: string | undefined;
    let lastName = '';

    if (nameParts.length === 1) {
      firstName = nameParts[0];
    } else if (nameParts.length === 2) {
      firstName = nameParts[0];
      lastName = nameParts[1];
    } else if (nameParts.length >= 3) {
      firstName = nameParts[0];
      middleName = nameParts.slice(1, -1).join(' ');
      lastName = nameParts[nameParts.length - 1];
    }

    // Create user with profile in a transaction
    const user = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          name,
          email: email.toLowerCase(), // Store email in lowercase
          hashedPassword,
        },
      });

      // Create profile for the user
      await tx.profile.create({
        data: {
          userId: newUser.id,
          role: 'lead', // Default role for new signups
          firstName,
          middleName,
          lastName,
          email: email.toLowerCase(),
        },
      });

      return newUser;
    });

    console.log('[Signup] User created successfully:', email);

    // Return success (without password)
    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Sign up error:', error);
    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    );
  }
}
