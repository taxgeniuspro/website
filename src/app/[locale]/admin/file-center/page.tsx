import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getUserPermissions, UserRole } from '@/lib/permissions';
import { FileManager } from '@/components/file-manager/FileManager';

export default async function FileCenterPage() {
  const session = await auth(); const user = session?.user;
  if (!user) redirect('/auth/signin');

  const role = user?.role as UserRole | undefined;
  const customPermissions = user?.permissions as any;
  const permissions = getUserPermissions(role || 'client', customPermissions);

  // ✅ Check main permission for page access
  if (!permissions.clientFileCenter) redirect('/forbidden');

  // 🎛️ Extract micro-permissions for file features
  // Fallback to main permission for backward compatibility
  const canView = permissions.files_view ?? permissions.clientFileCenter;
  const canUpload = permissions.files_upload ?? false;
  const canDownload = permissions.files_download ?? permissions.clientFileCenter;
  const canDelete = permissions.files_delete ?? false;
  const canShare = permissions.files_share ?? false;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Client File Centers</h1>
          <p className="text-muted-foreground mt-1">
            Secure document storage and management for all clients
          </p>
        </div>

        {/* File Manager */}
        <FileManager
          showTree={canView}
          allowUpload={canUpload}
          allowFolderCreate={canUpload}
          allowDelete={canDelete}
          allowMove={canUpload}
          allowShare={canShare}
        />
      </div>
    </div>
  );
}
