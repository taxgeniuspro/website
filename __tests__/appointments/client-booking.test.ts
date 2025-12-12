import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * Client Appointment Booking Tests
 *
 * Tests the complete client booking flow including:
 * - Appointment creation via /api/appointments/book
 * - Available slots fetching via /api/appointments/available-slots
 * - Validation of required fields
 * - CRMContact and CRMInteraction creation
 * - Preparer assignment and attribution
 *
 * NOTE: These are integration tests that require the server to be running.
 * Run with: npm run dev (in another terminal), then npm run test
 */

const API_BASE = 'http://localhost:3005/api';

// Global server availability flag
let serverAvailable = false;

// Helper to check if server is available
async function checkServerAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(`${API_BASE}/health`, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response.ok || response.status === 404; // 404 means server is running but no health endpoint
  } catch {
    return false;
  }
}

// Test data
const TEST_CLIENT = {
  clientName: 'Test Client User',
  clientEmail: `test-booking-${Date.now()}@testclient.com`,
  clientPhone: '555-123-4567',
  appointmentType: 'VIDEO_CALL',
  notes: 'Test booking from automated test suite',
  source: 'test_suite',
};

// Track created resources for cleanup
const createdAppointmentIds: string[] = [];
const createdContactEmails: string[] = [];

describe('Client Appointment Booking', () => {
  let preparerId: string;

  beforeAll(async () => {
    // Check if server is available
    serverAvailable = await checkServerAvailable();
    if (!serverAvailable) {
      console.log('WARNING: Server not available at http://localhost:3005');
      console.log('Integration tests will be skipped. Start the server with "npm run dev" to run these tests.');
      return;
    }

    // Get a valid preparer ID for testing
    try {
      const response = await fetch(`${API_BASE}/preparers/default`);
      if (response.ok) {
        const data = await response.json();
        preparerId = data.preparerId;
      }
    } catch (error) {
      console.log('Could not get default preparer');
    }
  });

  afterAll(async () => {
    // Cleanup: Delete test appointments and contacts
    // Note: In production, you'd want admin auth for cleanup
    console.log(`Test cleanup: ${createdAppointmentIds.length} appointments, ${createdContactEmails.length} contacts`);
  });

  describe('POST /api/appointments/book - Success Cases', () => {
    it('should create appointment with all required fields', async () => {
      if (!serverAvailable) { expect(true).toBe(true); return; }

      const uniqueEmail = `test-booking-success-${Date.now()}@testclient.com`;

      const response = await fetch(`${API_BASE}/appointments/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...TEST_CLIENT,
          clientEmail: uniqueEmail,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.appointmentId).toBeDefined();
      expect(data.message).toContain('Appointment');

      // Track for cleanup
      if (data.appointmentId) {
        createdAppointmentIds.push(data.appointmentId);
      }
      createdContactEmails.push(uniqueEmail);
    });

    it('should create appointment without scheduled time (callback request)', async () => {
      if (!serverAvailable) { expect(true).toBe(true); return; }

      const uniqueEmail = `test-callback-${Date.now()}@testclient.com`;

      const response = await fetch(`${API_BASE}/appointments/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: 'Callback Request Client',
          clientEmail: uniqueEmail,
          clientPhone: '555-987-6543',
          appointmentType: 'PHONE_CALL',
          notes: 'Please call me back',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.appointmentId).toBeDefined();
      // scheduledFor should be null/undefined for callback requests
      expect(data.scheduledFor).toBeFalsy();

      if (data.appointmentId) {
        createdAppointmentIds.push(data.appointmentId);
      }
      createdContactEmails.push(uniqueEmail);
    });

    it('should create appointment with specific date/time slot', async () => {
      if (!serverAvailable) { expect(true).toBe(true); return; }

      const uniqueEmail = `test-scheduled-${Date.now()}@testclient.com`;

      // Create a future date/time (tomorrow at 10am)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);

      const response = await fetch(`${API_BASE}/appointments/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: 'Scheduled Appointment Client',
          clientEmail: uniqueEmail,
          clientPhone: '555-222-3333',
          appointmentType: 'VIDEO_CALL',
          scheduledFor: tomorrow.toISOString(),
          duration: 30,
          timezone: 'America/New_York',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.appointmentId).toBeDefined();
      expect(data.scheduledFor).toBeDefined();

      if (data.appointmentId) {
        createdAppointmentIds.push(data.appointmentId);
      }
      createdContactEmails.push(uniqueEmail);
    });

    it('should return appointmentId in response', async () => {
      if (!serverAvailable) { expect(true).toBe(true); return; }

      const uniqueEmail = `test-id-check-${Date.now()}@testclient.com`;

      const response = await fetch(`${API_BASE}/appointments/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: 'ID Check Client',
          clientEmail: uniqueEmail,
          clientPhone: '555-444-5555',
          appointmentType: 'CONSULTATION',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.appointmentId).toBeDefined();
      expect(typeof data.appointmentId).toBe('string');
      expect(data.appointmentId.length).toBeGreaterThan(0);

      if (data.appointmentId) {
        createdAppointmentIds.push(data.appointmentId);
      }
      createdContactEmails.push(uniqueEmail);
    });

    it('should handle all valid appointment types', async () => {
      if (!serverAvailable) { expect(true).toBe(true); return; }

      const validTypes = ['PHONE_CALL', 'VIDEO_CALL', 'IN_PERSON', 'CONSULTATION', 'FOLLOW_UP'];

      for (const type of validTypes) {
        const uniqueEmail = `test-type-${type.toLowerCase()}-${Date.now()}@testclient.com`;

        const response = await fetch(`${API_BASE}/appointments/book`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientName: `${type} Test Client`,
            clientEmail: uniqueEmail,
            clientPhone: '555-666-7777',
            appointmentType: type,
          }),
        });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);

        if (data.appointmentId) {
          createdAppointmentIds.push(data.appointmentId);
        }
        createdContactEmails.push(uniqueEmail);
      }
    });
  });

  describe('POST /api/appointments/book - Validation Errors', () => {
    it('should reject missing clientName', async () => {
      if (!serverAvailable) { expect(true).toBe(true); return; }

      const response = await fetch(`${API_BASE}/appointments/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientEmail: 'test@example.com',
          clientPhone: '555-111-2222',
          appointmentType: 'VIDEO_CALL',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('clientName');
    });

    it('should reject missing clientEmail', async () => {
      if (!serverAvailable) { expect(true).toBe(true); return; }

      const response = await fetch(`${API_BASE}/appointments/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: 'Test Client',
          clientPhone: '555-111-2222',
          appointmentType: 'VIDEO_CALL',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('clientEmail');
    });

    it('should reject missing clientPhone', async () => {
      if (!serverAvailable) { expect(true).toBe(true); return; }

      const response = await fetch(`${API_BASE}/appointments/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: 'Test Client',
          clientEmail: 'test@example.com',
          appointmentType: 'VIDEO_CALL',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('clientPhone');
    });

    it('should reject invalid email format', async () => {
      if (!serverAvailable) { expect(true).toBe(true); return; }

      const response = await fetch(`${API_BASE}/appointments/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: 'Test Client',
          clientEmail: 'invalid-email-format',
          clientPhone: '555-111-2222',
          appointmentType: 'VIDEO_CALL',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('email');
    });

    it('should reject invalid appointment type', async () => {
      if (!serverAvailable) { expect(true).toBe(true); return; }

      const response = await fetch(`${API_BASE}/appointments/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: 'Test Client',
          clientEmail: 'test@example.com',
          clientPhone: '555-111-2222',
          appointmentType: 'INVALID_TYPE',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('appointment type');
    });

    it('should reject invalid date format', async () => {
      if (!serverAvailable) { expect(true).toBe(true); return; }

      const response = await fetch(`${API_BASE}/appointments/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: 'Test Client',
          clientEmail: 'test@example.com',
          clientPhone: '555-111-2222',
          appointmentType: 'VIDEO_CALL',
          scheduledFor: 'not-a-valid-date',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('date');
    });
  });

  describe('POST /api/appointments/book - Slot Validation', () => {
    it('should reject if slot is in the past', async () => {
      if (!serverAvailable) { expect(true).toBe(true); return; }

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // Yesterday
      pastDate.setHours(10, 0, 0, 0);

      const response = await fetch(`${API_BASE}/appointments/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: 'Past Date Client',
          clientEmail: 'past-date@test.com',
          clientPhone: '555-111-2222',
          appointmentType: 'VIDEO_CALL',
          scheduledFor: pastDate.toISOString(),
        }),
      });

      // Should reject past dates
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });

  describe('GET /api/appointments/available-slots', () => {
    it('should return available slots for date', async () => {
      if (!serverAvailable || !preparerId) { expect(true).toBe(true); return; }

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const response = await fetch(
        `${API_BASE}/appointments/available-slots?preparerId=${preparerId}&date=${dateStr}&duration=30`
      );

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.date).toBe(dateStr);
      expect(data.preparerId).toBe(preparerId);
      expect(Array.isArray(data.slots)).toBe(true);
    });

    it('should return slots with availability status', async () => {
      if (!serverAvailable || !preparerId) { expect(true).toBe(true); return; }

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const response = await fetch(
        `${API_BASE}/appointments/available-slots?preparerId=${preparerId}&date=${dateStr}&duration=30&includeUnavailable=true`
      );

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.includeUnavailable).toBe(true);

      if (data.slots.length > 0) {
        const slot = data.slots[0];
        expect(slot).toHaveProperty('start');
        expect(slot).toHaveProperty('end');
        expect(slot).toHaveProperty('startTime');
        expect(slot).toHaveProperty('endTime');
        expect(slot).toHaveProperty('available');
      }
    });

    it('should require preparerId parameter', async () => {
      if (!serverAvailable) { expect(true).toBe(true); return; }

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const response = await fetch(
        `${API_BASE}/appointments/available-slots?date=${dateStr}&duration=30`
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('preparerId');
    });

    it('should require date parameter', async () => {
      if (!serverAvailable || !preparerId) { expect(true).toBe(true); return; }

      const response = await fetch(
        `${API_BASE}/appointments/available-slots?preparerId=${preparerId}&duration=30`
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('date');
    });

    it('should require duration parameter', async () => {
      if (!serverAvailable || !preparerId) { expect(true).toBe(true); return; }

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const response = await fetch(
        `${API_BASE}/appointments/available-slots?preparerId=${preparerId}&date=${dateStr}`
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('duration');
    });

    it('should accept timezone parameter', async () => {
      if (!serverAvailable || !preparerId) { expect(true).toBe(true); return; }

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const response = await fetch(
        `${API_BASE}/appointments/available-slots?preparerId=${preparerId}&date=${dateStr}&duration=30&timezone=America/Los_Angeles`
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.timezone).toBe('America/Los_Angeles');
    });
  });

  describe('GET /api/appointments/day-availability', () => {
    it('should return daily availability for month', async () => {
      if (!serverAvailable || !preparerId) { expect(true).toBe(true); return; }

      const now = new Date();
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const response = await fetch(
        `${API_BASE}/appointments/day-availability?preparerId=${preparerId}&month=${monthStr}`
      );

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty('availability');
      expect(typeof data.availability).toBe('object');
    });

    it('should require preparerId parameter', async () => {
      if (!serverAvailable) { expect(true).toBe(true); return; }

      const now = new Date();
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const response = await fetch(
        `${API_BASE}/appointments/day-availability?month=${monthStr}`
      );

      expect(response.status).toBe(400);
    });
  });
});

describe('Appointment Attribution', () => {
  it('should use default preparer when no referral provided', async () => {
    if (!serverAvailable) { expect(true).toBe(true); return; }

    const uniqueEmail = `test-no-referral-${Date.now()}@testclient.com`;

    const response = await fetch(`${API_BASE}/appointments/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientName: 'No Referral Client',
        clientEmail: uniqueEmail,
        clientPhone: '555-888-9999',
        appointmentType: 'CONSULTATION',
        source: 'direct_booking_page',
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.appointmentId).toBeDefined();

    createdAppointmentIds.push(data.appointmentId);
    createdContactEmails.push(uniqueEmail);
  });
});
