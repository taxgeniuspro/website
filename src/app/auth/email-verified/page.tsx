'use client';

import { useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function EmailVerifiedPage() {
  useEffect(() => {
    // Redirect to sign-in after 5 seconds
    const timer = setTimeout(() => {
      window.location.href = '/auth/signin';
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h1>

          <p className="text-gray-600 mb-6">
            Your email has been successfully verified. You can now sign in to your Tax Genius account.
          </p>

          <Link
            href="/auth/signin"
            className="inline-flex items-center justify-center px-6 py-3 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors"
          >
            Sign In Now
          </Link>

          <p className="text-sm text-gray-400 mt-4">
            You will be automatically redirected in 5 seconds...
          </p>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          &copy; {new Date().getFullYear()} Tax Genius Pro. All rights reserved.
        </p>
      </div>
    </div>
  );
}
