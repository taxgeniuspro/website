'use client';

import { useSession } from 'next-auth/react';
import { TaxAssistantWidget } from '@/components/tax-assistant/TaxAssistantWidget';

export default function DebugWidgetPage() {
  const { data: session } = useSession(); const user = session?.user;
  const role = user?.publicMetadata?.role as string;

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Tax Assistant Widget Debug</h1>

      <div className="bg-muted p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">Your Current Role:</h2>
        <p className="text-2xl font-mono bg-background p-4 rounded">{role || 'Not logged in'}</p>
      </div>

      <div className="bg-muted p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">Widget Status:</h2>
        <p className="text-lg">
          {role === 'tax_preparer' ? (
            <span className="text-green-600 font-semibold">
              ✅ Widget SHOULD be visible (you are a tax_preparer)
            </span>
          ) : (
            <span className="text-red-600 font-semibold">
              ❌ Widget will NOT be visible (role is "{role}", needs to be "tax_preparer")
            </span>
          )}
        </p>
      </div>

      <div className="bg-muted p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Instructions:</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>Check your role above</li>
          <li>If role is "tax_preparer", look for the chat icon (💬) in bottom-right corner</li>
          <li>If role is NOT "tax_preparer", you need to change your role in Clerk or database</li>
          <li>Try hard refreshing the page (Ctrl+Shift+R or Cmd+Shift+R)</li>
        </ol>
      </div>

      {/* Force show widget for testing */}
      <div className="mt-8 bg-yellow-100 dark:bg-yellow-900 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Force Show Widget (Testing):</h2>
        <p className="mb-4">The widget below is forced to show regardless of role:</p>
        <TaxAssistantWidget />
      </div>
    </div>
  );
}
