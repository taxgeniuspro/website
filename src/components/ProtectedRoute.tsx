import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from 'next-auth/react';
import { Skeleton } from '@/components/ui/skeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'client' | 'affiliate' | 'preparer';
  requireProfile?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requireProfile = false,
}) => {
  const { data: session, status } = useSession();
  const user = session?.user;
  const loading = status === 'loading';
  const location = useLocation();

  // Show loading while authentication state is being determined
  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If profile is required but user doesn't have one, redirect to profile setup
  if (requireProfile && !user.profile) {
    return <Navigate to="/setup-profile" state={{ from: location }} replace />;
  }

  // If specific role is required, check user's role
  if (requiredRole && user.role !== requiredRole) {
    // Redirect based on user's actual role or to a generic unauthorized page
    if (user.role) {
      switch (user.role) {
        case 'client':
          return <Navigate to="/dashboard/client" replace />;
        case 'affiliate':
          return <Navigate to="/dashboard/affiliate" replace />;
        case 'preparer':
          return <Navigate to="/dashboard/preparer" replace />;
        default:
          return <Navigate to="/dashboard" replace />;
      }
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
