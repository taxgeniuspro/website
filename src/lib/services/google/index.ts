/**
 * Google Services - Company Level Integrations
 *
 * All Google services for Tax Genius company operations.
 * Uses service account authentication for server-to-server access.
 */

export { googleAuthService } from './google-auth.service';
export { googleSheetsService } from './google-sheets.service';
export { googleDriveCompanyService } from './google-drive-company.service';
export { googleCalendarCompanyService } from './google-calendar-company.service';

// Preparer-specific Google services
export { googleDrivePreparerService } from './google-drive-preparer.service';
export { googleSheetsPreparerService } from './google-sheets-preparer.service';
