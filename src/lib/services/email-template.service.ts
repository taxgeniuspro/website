/**
 * Email Template Service
 *
 * Manages reusable email templates with variable substitution
 * for quick responses to leads and clients
 *
 * Features:
 * - Create/update/delete custom templates
 * - Variable substitution ({{firstName}}, {{email}}, etc.)
 * - Category organization (LEAD, CLIENT, GENERAL)
 * - Shared templates (admin-created, available to all users)
 * - Usage tracking
 * - Default templates seeding
 *
 * Supported Variables:
 * - {{firstName}} - Recipient's first name
 * - {{lastName}} - Recipient's last name
 * - {{fullName}} - Recipient's full name
 * - {{email}} - Recipient's email address
 * - {{phone}} - Recipient's phone number
 * - {{preparerName}} - Tax preparer's name
 * - {{preparerEmail}} - Tax preparer's professional email
 * - {{professionalEmail}} - Same as preparerEmail
 * - {{year}} - Current year
 * - {{date}} - Current date (formatted)
 * - {{calendarLink}} - Link to book appointment
 * - {{dashboardLink}} - Link to dashboard
 * - {{companyName}} - Company name (Tax Genius Pro)
 */

import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// Local type definitions
interface EmailTemplateRecord {
  id: string;
  profileId?: string | null;
  name: string;
  subject: string;
  body: string;
  category: string;
  isShared: boolean;
  isDefault: boolean;
  usageCount: number;
  lastUsedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Template variables for substitution
 */
export interface TemplateVariables {
  // Recipient info
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;

  // Preparer info
  preparerName?: string;
  preparerEmail?: string;
  professionalEmail?: string;

  // Dynamic values
  year?: number;
  date?: string;
  calendarLink?: string;
  dashboardLink?: string;

  // Custom variables
  [key: string]: string | number | undefined;
}

/**
 * Rendered email template
 */
export interface RenderedTemplate {
  subject: string;
  body: string;
  variables: TemplateVariables;
}

/**
 * Email Template Service
 */
export class EmailTemplateService {
  /**
   * Render template with variable substitution
   *
   * @param template - Template object from database
   * @param variables - Variables to substitute
   * @returns Rendered subject and body
   *
   * @example
   * const rendered = emailTemplateService.renderTemplate(template, {
   *   firstName: 'John',
   *   lastName: 'Doe',
   *   preparerName: 'Ira Johnson',
   *   professionalEmail: 'ira@taxgeniuspro.tax'
   * });
   * // rendered.subject: "Hi John! Let's get started"
   * // rendered.body: "Hi John Doe, I'm Ira Johnson..."
   */
  renderTemplate(
    template: { subject: string; body: string },
    variables: TemplateVariables
  ): RenderedTemplate {
    // Add default values
    const vars: TemplateVariables = {
      ...variables,
      year: variables.year || new Date().getFullYear(),
      date: variables.date || new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      companyName: 'Tax Genius Pro',
      dashboardLink: variables.dashboardLink || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    };

    // Full name fallback
    if (!vars.fullName && vars.firstName && vars.lastName) {
      vars.fullName = `${vars.firstName} ${vars.lastName}`;
    } else if (!vars.fullName && vars.firstName) {
      vars.fullName = vars.firstName;
    }

    // Replace variables in subject
    let subject = template.subject;
    let body = template.body;

    Object.entries(vars).forEach(([key, value]) => {
      if (value !== undefined) {
        const regex = new RegExp(`{{${key}}}`, 'gi');
        subject = subject.replace(regex, String(value));
        body = body.replace(regex, String(value));
      }
    });

    return {
      subject,
      body,
      variables: vars,
    };
  }

  /**
   * Create a new email template
   *
   * @param profileId - User's profile ID (null for shared templates)
   * @param data - Template data
   * @returns Created template
   */
  async createTemplate(
    profileId: string | null,
    data: {
      name: string;
      subject: string;
      body: string;
      category?: string;
      isShared?: boolean;
    }
  ) {
    try {
      logger.info('Creating email template', {
        profileId,
        name: data.name,
        category: data.category,
      });

      const { data: template, error } = await db
        .from('email_templates')
        .insert({
          profileId,
          name: data.name,
          subject: data.subject,
          body: data.body,
          category: data.category || 'GENERAL',
          isShared: data.isShared || false,
          isDefault: false,
          usageCount: 0,
        })
        .select()
        .single();

      if (error) throw error;

      logger.info('Email template created', {
        templateId: template?.id,
        name: template?.name,
      });

      return template as EmailTemplateRecord;
    } catch (error) {
      logger.error('Error creating email template', { error });
      throw error;
    }
  }

  /**
   * Update an existing template
   *
   * @param templateId - Template ID
   * @param profileId - User's profile ID (for permission check)
   * @param data - Updated template data
   * @returns Updated template
   */
  async updateTemplate(
    templateId: string,
    profileId: string,
    data: {
      name?: string;
      subject?: string;
      body?: string;
      category?: string;
    }
  ) {
    try {
      logger.info('Updating email template', { templateId, profileId });

      // Verify ownership (or admin)
      const { data: existingData } = await db
        .from('email_templates')
        .select('*')
        .eq('id', templateId)
        .limit(1);

      const existing = firstOrNull(existingData) as EmailTemplateRecord | null;

      if (!existing) {
        throw new Error('Template not found');
      }

      if (existing.profileId !== profileId && existing.profileId !== null) {
        throw new Error('Not authorized to update this template');
      }

      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.subject !== undefined) updateData.subject = data.subject;
      if (data.body !== undefined) updateData.body = data.body;
      if (data.category !== undefined) updateData.category = data.category;

      const { data: template, error } = await db
        .from('email_templates')
        .update(updateData)
        .eq('id', templateId)
        .select()
        .single();

      if (error) throw error;

      logger.info('Email template updated', { templateId: template?.id });

      return template as EmailTemplateRecord;
    } catch (error) {
      logger.error('Error updating email template', { templateId, error });
      throw error;
    }
  }

  /**
   * Delete a template
   *
   * @param templateId - Template ID
   * @param profileId - User's profile ID (for permission check)
   */
  async deleteTemplate(templateId: string, profileId: string): Promise<void> {
    try {
      logger.info('Deleting email template', { templateId, profileId });

      // Verify ownership
      const { data: existingData } = await db
        .from('email_templates')
        .select('*')
        .eq('id', templateId)
        .limit(1);

      const existing = firstOrNull(existingData) as EmailTemplateRecord | null;

      if (!existing) {
        throw new Error('Template not found');
      }

      if (existing.profileId !== profileId && existing.profileId !== null) {
        throw new Error('Not authorized to delete this template');
      }

      if (existing.isDefault) {
        throw new Error('Cannot delete default templates');
      }

      const { error } = await db
        .from('email_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      logger.info('Email template deleted', { templateId });
    } catch (error) {
      logger.error('Error deleting email template', { templateId, error });
      throw error;
    }
  }

  /**
   * List templates for a user
   *
   * @param profileId - User's profile ID
   * @param category - Optional category filter
   * @returns Array of templates (user's templates + shared templates)
   */
  async listTemplates(profileId: string, category?: string) {
    try {
      logger.info('Listing email templates', { profileId, category });

      // Build query for user's own templates OR shared templates
      let query = db
        .from('email_templates')
        .select('*')
        .or(`profileId.eq.${profileId},isShared.eq.true`)
        .order('isDefault', { ascending: false })
        .order('usageCount', { ascending: false })
        .order('createdAt', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      const { data: templates, error } = await query;

      if (error) throw error;

      logger.info('Email templates retrieved', {
        profileId,
        count: (templates || []).length,
      });

      return (templates || []) as EmailTemplateRecord[];
    } catch (error) {
      logger.error('Error listing email templates', { profileId, error });
      return [];
    }
  }

  /**
   * Get a single template by ID
   *
   * @param templateId - Template ID
   * @param profileId - User's profile ID (for permission check)
   * @returns Template or null
   */
  async getTemplate(templateId: string, profileId: string) {
    try {
      const { data: templateData } = await db
        .from('email_templates')
        .select('*')
        .eq('id', templateId)
        .or(`profileId.eq.${profileId},isShared.eq.true`)
        .limit(1);

      const template = firstOrNull(templateData) as EmailTemplateRecord | null;

      return template;
    } catch (error) {
      logger.error('Error getting email template', { templateId, error });
      return null;
    }
  }

  /**
   * Increment template usage count
   *
   * @param templateId - Template ID
   */
  async incrementUsageCount(templateId: string): Promise<void> {
    try {
      // Get current count
      const { data: templateData } = await db
        .from('email_templates')
        .select('usageCount')
        .eq('id', templateId)
        .limit(1);

      const template = firstOrNull(templateData) as { usageCount: number } | null;

      if (template) {
        await db
          .from('email_templates')
          .update({
            usageCount: (template.usageCount || 0) + 1,
            lastUsedAt: new Date().toISOString(),
          })
          .eq('id', templateId);
      }

      logger.info('Template usage count incremented', { templateId });
    } catch (error) {
      logger.error('Error incrementing template usage', { templateId, error });
    }
  }

  /**
   * Seed default email templates
   * Should be run during initial setup or by admin
   */
  async seedDefaultTemplates(): Promise<void> {
    try {
      logger.info('Seeding default email templates');

      const defaultTemplates = [
        // LEAD Templates
        {
          id: 'default-initial-lead-contact',
          name: 'Initial Lead Contact',
          subject: "Hi {{firstName}}! Let's get started on your {{year}} taxes",
          body: `Hi {{firstName}},

Thank you for your interest in Tax Genius Pro! I'm {{preparerName}}, and I'd be happy to help you with your {{year}} tax return.

I specialize in helping clients maximize their refunds and minimize their tax liability. Here's what you can expect when working with me:

✅ Personalized tax preparation
✅ Maximum deductions and credits
✅ IRS audit protection
✅ E-filing for fastest refunds
✅ Year-round support

I'd love to schedule a brief call to discuss your tax situation and answer any questions you may have.

You can book a time on my calendar here: {{calendarLink}}

Or simply reply to this email with your preferred time, and I'll make it work!

Looking forward to helping you with your taxes,

{{preparerName}}
{{professionalEmail}}
{{companyName}}`,
          category: 'LEAD',
          isShared: true,
          isDefault: true,
        },
        {
          id: 'default-follow-up-with-lead',
          name: 'Follow-up with Lead',
          subject: "Following up on your {{year}} tax return",
          body: `Hi {{firstName}},

I wanted to follow up on my previous email about helping you with your {{year}} tax return.

I know tax season can be stressful, so I wanted to make sure you had all the information you need to move forward.

If you have any questions or would like to schedule a consultation, just let me know!

Best regards,

{{preparerName}}
{{professionalEmail}}
{{companyName}}`,
          category: 'LEAD',
          isShared: true,
          isDefault: true,
        },

        // CLIENT Templates
        {
          id: 'default-welcome-new-client',
          name: 'Welcome New Client',
          subject: 'Welcome to {{companyName}}! Next steps for your tax return',
          body: `Hi {{firstName}},

Welcome to {{companyName}}! I'm excited to work with you on your {{year}} tax return.

Here's what happens next:

1. **Document Upload**: Log into your dashboard ({{dashboardLink}}) and upload your tax documents (W-2s, 1099s, receipts, etc.)

2. **Review**: I'll review your documents and prepare your return within 3-5 business days

3. **Approval**: You'll review your completed return and approve it for filing

4. **Filing**: I'll e-file your return with the IRS and state

5. **Refund**: Expect your refund within 2-3 weeks!

If you have any questions along the way, just reply to this email or call me directly.

Let's get started!

{{preparerName}}
{{professionalEmail}}
{{companyName}}`,
          category: 'CLIENT',
          isShared: true,
          isDefault: true,
        },
        {
          id: 'default-request-missing-documents',
          name: 'Request Missing Documents',
          subject: 'Missing documents needed for your {{year}} tax return',
          body: `Hi {{firstName}},

I've started working on your {{year}} tax return, but I need a few more documents to complete it:

[List the specific documents needed here]

Please upload these documents to your dashboard: {{dashboardLink}}

Once I receive these, I'll be able to complete your return within 2-3 business days.

If you have any questions about what documents you need, just let me know!

Thanks,

{{preparerName}}
{{professionalEmail}}
{{companyName}}`,
          category: 'CLIENT',
          isShared: true,
          isDefault: true,
        },
        {
          id: 'default-tax-return-ready-for-review',
          name: 'Tax Return Ready for Review',
          subject: 'Great news! Your {{year}} tax return is ready',
          body: `Hi {{firstName}},

Great news! I've completed your {{year}} tax return, and it's ready for your review.

**Next Steps:**

1. Log into your dashboard: {{dashboardLink}}
2. Review your completed tax return
3. Approve it for filing

Once you approve, I'll submit it to the IRS right away, and you should see your refund within 2-3 weeks!

If you have any questions about your return, I'm here to help.

{{preparerName}}
{{professionalEmail}}
{{companyName}}`,
          category: 'CLIENT',
          isShared: true,
          isDefault: true,
        },

        // GENERAL Templates
        {
          id: 'default-schedule-a-consultation',
          name: 'Schedule a Consultation',
          subject: "Let's schedule a time to talk about your taxes",
          body: `Hi {{firstName}},

I'd love to schedule a brief consultation to discuss your tax situation and how I can help.

You can book a time on my calendar here: {{calendarLink}}

Or if you prefer, just reply with a few times that work for you, and I'll do my best to accommodate your schedule.

Looking forward to speaking with you!

{{preparerName}}
{{professionalEmail}}
{{companyName}}`,
          category: 'GENERAL',
          isShared: true,
          isDefault: true,
        },
      ];

      for (const template of defaultTemplates) {
        // Check if template exists
        const { data: existingData } = await db
          .from('email_templates')
          .select('id')
          .eq('id', template.id)
          .limit(1);

        const existing = firstOrNull(existingData);

        if (existing) {
          // Update existing
          await db
            .from('email_templates')
            .update({
              name: template.name,
              subject: template.subject,
              body: template.body,
              category: template.category,
              isShared: template.isShared,
              isDefault: template.isDefault,
            })
            .eq('id', template.id);
        } else {
          // Insert new
          await db
            .from('email_templates')
            .insert({
              id: template.id,
              profileId: null, // Shared templates have no owner
              name: template.name,
              subject: template.subject,
              body: template.body,
              category: template.category,
              isShared: template.isShared,
              isDefault: template.isDefault,
              usageCount: 0,
            });
        }
      }

      logger.info('Default email templates seeded successfully', {
        count: defaultTemplates.length,
      });
    } catch (error) {
      logger.error('Error seeding default email templates', { error });
      throw error;
    }
  }
}

// Singleton instance
export const emailTemplateService = new EmailTemplateService();
