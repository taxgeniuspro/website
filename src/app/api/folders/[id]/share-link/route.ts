import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { SMSService } from '@/lib/services/sms.service';
import { getResendClient } from '@/lib/resend';

/**
 * POST /api/folders/[id]/share-link
 * Share an upload link via SMS, Email, or In-App message
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: folderId } = await params;
    const body = await req.json();
    const { linkId, method, phoneNumber, email } = body;

    if (!linkId) {
      return NextResponse.json(
        { error: 'Link ID is required' },
        { status: 400 }
      );
    }

    if (!method) {
      return NextResponse.json(
        { error: 'Share method is required (sms, email, or inapp)' },
        { status: 400 }
      );
    }

    // Get tax preparer's profile
    const { data: preparers } = await db.from('profiles')
      .select('*')
      .or(`supabase_user_id.eq.${userId},user_id.eq.${userId},email.eq.${session?.user?.email}`);
    const preparer = firstOrNull(preparers);

    if (!preparer) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get the upload link
    const { data: uploadLinks } = await db.from('folder_upload_links')
      .select(`
        *,
        folder:folders(id, name, path),
        client:profiles!client_id(id, first_name, last_name, phone, user_id),
        creator:profiles!created_by(id, first_name, last_name, company_name)
      `)
      .eq('id', linkId);
    const uploadLink = firstOrNull(uploadLinks);

    if (!uploadLink) {
      return NextResponse.json(
        { error: 'Upload link not found' },
        { status: 404 }
      );
    }

    // Verify the preparer created this link
    if (uploadLink.created_by !== preparer.id && preparer.role !== 'admin') {
      return NextResponse.json(
        { error: 'You do not have permission to share this link' },
        { status: 403 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';
    const uploadUrl = `${baseUrl}/upload/${uploadLink.token}`;

    const clientName = `${uploadLink.client?.first_name || ''} ${uploadLink.client?.last_name || ''}`.trim() || 'Client';
    const preparerName = uploadLink.creator?.company_name || `${uploadLink.creator?.first_name || ''} ${uploadLink.creator?.last_name || ''}`.trim();

    let shareResult: any = {};

    // Share via selected method
    switch (method.toLowerCase()) {
      case 'sms':
        if (!phoneNumber && !uploadLink.client?.phone) {
          return NextResponse.json(
            { error: 'Phone number is required for SMS' },
            { status: 400 }
          );
        }

        if (!SMSService.isConfigured()) {
          return NextResponse.json(
            { error: 'SMS service is not configured. Please contact support.' },
            { status: 503 }
          );
        }

        try {
          await SMSService.sendUploadLink({
            to: phoneNumber || uploadLink.client!.phone!,
            linkUrl: uploadUrl,
            preparerName,
            folderName: uploadLink.folder?.name || '',
            clientName,
          });

          shareResult = {
            method: 'SMS',
            sentTo: phoneNumber || uploadLink.client?.phone,
          };
        } catch (smsError) {
          logger.error('Failed to send SMS', smsError);
          return NextResponse.json(
            { error: 'Failed to send SMS. Please try another method.' },
            { status: 500 }
          );
        }
        break;

      case 'email':
        const recipientEmail = email || (await getUserEmail(uploadLink.client?.user_id!));

        if (!recipientEmail) {
          return NextResponse.json(
            { error: 'Email address is required' },
            { status: 400 }
          );
        }

        try {
          const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@taxgeniuspro.tax';

          await getResendClient().emails.send({
            from: fromEmail,
            to: recipientEmail,
            subject: `${preparerName} has requested documents from you`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Document Upload Request</h2>
                <p>Hi ${clientName}!</p>
                <p>${preparerName} has requested that you upload documents to the <strong>"${uploadLink.folder?.name}"</strong> folder.</p>

                <div style="margin: 30px 0;">
                  <a href="${uploadUrl}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Upload Documents
                  </a>
                </div>

                <p style="color: #666; font-size: 14px;">
                  This link expires in 24 hours.
                </p>

                <p style="color: #666; font-size: 14px; margin-top: 40px;">
                  Or copy this link: <br/>
                  <code style="background-color: #f3f4f6; padding: 4px 8px; border-radius: 4px;">${uploadUrl}</code>
                </p>

                <hr style="margin: 40px 0; border: none; border-top: 1px solid #e5e7eb;" />

                <p style="color: #999; font-size: 12px;">
                  This email was sent by Tax Genius Pro on behalf of ${preparerName}
                </p>
              </div>
            `,
          });

          shareResult = {
            method: 'Email',
            sentTo: recipientEmail,
          };
        } catch (emailError) {
          logger.error('Failed to send email', emailError);
          return NextResponse.json(
            { error: 'Failed to send email. Please try another method.' },
            { status: 500 }
          );
        }
        break;

      case 'inapp':
        try {
          const { NotificationService } = await import('@/lib/services/notification.service');

          await NotificationService.send({
            userId: uploadLink.client?.user_id!,
            type: 'DOCUMENT_UPLOADED',
            title: 'Document Upload Request',
            message: `${preparerName} has requested you upload documents to "${uploadLink.folder?.name}"`,
            channels: ['IN_APP', 'PUSH'],
            metadata: {
              uploadLinkId: uploadLink.id,
              uploadUrl,
              folderId: uploadLink.folder?.id,
              folderName: uploadLink.folder?.name,
              actionUrl: uploadUrl,
            },
          });

          shareResult = {
            method: 'In-App',
            sentTo: clientName,
          };
        } catch (notifError) {
          logger.error('Failed to send in-app notification', notifError);
          return NextResponse.json(
            { error: 'Failed to send notification. Please try another method.' },
            { status: 500 }
          );
        }
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid share method. Use sms, email, or inapp.' },
          { status: 400 }
        );
    }

    // Update link metadata to track how it was shared
    const currentMetadata = (uploadLink.metadata as any) || {};
    await db.from('folder_upload_links')
      .update({
        metadata: {
          ...currentMetadata,
          sharedAt: new Date().toISOString(),
          sharedVia: method.toLowerCase(),
          sharedTo: phoneNumber || email || uploadLink.client?.user_id,
        },
      })
      .eq('id', uploadLink.id);

    logger.info('Upload link shared', {
      linkId: uploadLink.id,
      method: method.toLowerCase(),
      clientId: uploadLink.client?.id,
    });

    return NextResponse.json({
      success: true,
      message: `Upload link sent successfully via ${method}`,
      ...shareResult,
    });
  } catch (error) {
    logger.error('Error sharing upload link:', error);
    return NextResponse.json(
      { error: 'Failed to share upload link' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to get user's email from database
 */
async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const { data: users } = await db.from('users')
      .select('email')
      .eq('id', userId);
    const user = firstOrNull(users);
    return user?.email || null;
  } catch (error) {
    logger.error('Failed to get user email from database', error);
    return null;
  }
}
