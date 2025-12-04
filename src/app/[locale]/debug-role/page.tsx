import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DebugRolePage() {
  const session = await auth(); const user = session?.user;

  if (!user) {
    redirect('/auth/signin');
  }

  const role = user?.role;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Debug: User Role</h1>

        <div className="bg-card border rounded-lg p-6 space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">User ID</p>
            <p className="font-mono">{user.id}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-mono">{user.email}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Current Role</p>
            <p className="font-mono text-lg">
              {role ? (
                <span className={role === 'admin' ? 'text-green-500' : 'text-yellow-500'}>
                  {role as string}
                </span>
              ) : (
                <span className="text-red-500">NO ROLE SET</span>
              )}
            </p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Full Public Metadata</p>
            <pre className="bg-muted p-4 rounded mt-2 overflow-auto">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">All User Data</p>
            <pre className="bg-muted p-4 rounded mt-2 overflow-auto max-h-96">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <h2 className="text-xl font-bold">Instructions to Change Role:</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Contact an authorized administrator:</li>
            <ul className="list-disc list-inside ml-6 mt-2">
              <li>taxgeniuses.tax@gmail.com</li>
              <li>taxgenius.tax@gmail.com</li>
              <li>iradwatkins@gmail.com</li>
              <li>goldenprotaxes@gmail.com</li>
            </ul>
            <li>Provide your email: {user.email}</li>
            <li>Request the desired role (tax_preparer or affiliate)</li>
            <li>Admin will update your role using the admin set-role API</li>
            <li>Sign out completely and sign back in to see the change</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
