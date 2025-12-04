import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * CRM API Routes Tests
 *
 * Tests the CRM endpoints including:
 * - Contact management (CRUD operations)
 * - Pipeline stages
 * - Role-based access control
 * - Data validation
 * - Security
 */

const API_BASE = 'http://localhost:3005/api/crm';

describe('CRM API Routes', () => {
  let authToken: string;
  let testContactId: string;

  beforeAll(async () => {
    // Setup: Get auth token
    const loginResponse = await fetch('http://localhost:3005/api/auth/test-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'preparer@test.com',
        password: 'preparer123',
      }),
    });

    if (loginResponse.ok) {
      const data = await loginResponse.json();
      authToken = data.token || '';
    }
  });

  afterAll(async () => {
    // Cleanup: Delete test contact if created
    if (testContactId && authToken) {
      await fetch(`${API_BASE}/contacts/${testContactId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
    }
  });

  describe('GET /api/crm/contacts', () => {
    it('should list contacts with authentication', async () => {
      const response = await fetch(`${API_BASE}/contacts`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty('contacts');
      expect(Array.isArray(data.contacts)).toBe(true);
    });

    it('should reject unauthenticated requests', async () => {
      const response = await fetch(`${API_BASE}/contacts`);

      expect(response.status).toBe(401);
    });

    it('should filter by pipeline stage', async () => {
      const response = await fetch(`${API_BASE}/contacts?stage=LEAD`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      // All contacts should be in LEAD stage
      data.contacts.forEach((contact: any) => {
        expect(contact.stage).toBe('LEAD');
      });
    });

    it('should support pagination', async () => {
      const response = await fetch(`${API_BASE}/contacts?page=1&limit=10`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty('pagination');
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(10);
      expect(data.contacts.length).toBeLessThanOrEqual(10);
    });

    it('should search contacts by name/email', async () => {
      const response = await fetch(`${API_BASE}/contacts?search=john`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      // Results should match search term
      data.contacts.forEach((contact: any) => {
        const searchableText = `${contact.firstName} ${contact.lastName} ${contact.email}`.toLowerCase();
        expect(searchableText).toContain('john');
      });
    });
  });

  describe('POST /api/crm/contacts', () => {
    it('should create a new contact', async () => {
      const newContact = {
        firstName: 'John',
        lastName: 'Doe',
        email: `test-${Date.now()}@example.com`,
        phone: '+1234567890',
        stage: 'LEAD',
      };

      const response = await fetch(`${API_BASE}/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(newContact),
      });

      expect(response.status).toBe(201);
      const data = await response.json();

      expect(data.contact).toMatchObject({
        firstName: 'John',
        lastName: 'Doe',
        email: newContact.email,
        stage: 'LEAD',
      });

      testContactId = data.contact.id;
    });

    it('should validate required fields', async () => {
      const invalidContact = {
        firstName: 'John',
        // Missing email
      };

      const response = await fetch(`${API_BASE}/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(invalidContact),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('email');
    });

    it('should validate email format', async () => {
      const invalidContact = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email',
      };

      const response = await fetch(`${API_BASE}/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(invalidContact),
      });

      expect(response.status).toBe(400);
    });

    it('should prevent duplicate emails', async () => {
      const contact = {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'existing@example.com',
      };

      // Create first contact
      const response1 = await fetch(`${API_BASE}/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(contact),
      });

      expect(response1.status).toBe(201);

      // Try to create duplicate
      const response2 = await fetch(`${API_BASE}/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(contact),
      });

      expect(response2.status).toBe(409);
    });

    it('should sanitize input to prevent XSS', async () => {
      const xssContact = {
        firstName: '<script>alert("xss")</script>',
        lastName: 'Doe',
        email: 'xss@example.com',
        notes: '<img src=x onerror=alert("xss")>',
      };

      const response = await fetch(`${API_BASE}/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(xssContact),
      });

      expect(response.status).toBe(201);
      const data = await response.json();

      // Should strip or escape HTML
      expect(data.contact.firstName).not.toContain('<script>');
      expect(data.contact.notes).not.toContain('<img');
    });
  });

  describe('PATCH /api/crm/contacts/:id', () => {
    it('should update contact fields', async () => {
      if (!testContactId) return;

      const updates = {
        phone: '+9876543210',
        stage: 'QUALIFIED',
      };

      const response = await fetch(`${API_BASE}/contacts/${testContactId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(updates),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.contact.phone).toBe('+9876543210');
      expect(data.contact.stage).toBe('QUALIFIED');
    });

    it('should validate stage transitions', async () => {
      if (!testContactId) return;

      const invalidUpdate = {
        stage: 'INVALID_STAGE',
      };

      const response = await fetch(`${API_BASE}/contacts/${testContactId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(invalidUpdate),
      });

      expect(response.status).toBe(400);
    });

    it('should reject updates to restricted fields', async () => {
      if (!testContactId) return;

      const restrictedUpdate = {
        id: 'new_id',
        createdAt: new Date().toISOString(),
      };

      const response = await fetch(`${API_BASE}/contacts/${testContactId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(restrictedUpdate),
      });

      // Should either ignore or reject restricted fields
      const data = await response.json();
      expect(data.contact.id).toBe(testContactId);
    });
  });

  describe('DELETE /api/crm/contacts/:id', () => {
    it('should soft delete contacts', async () => {
      // Create a contact to delete
      const contact = {
        firstName: 'ToDelete',
        lastName: 'User',
        email: `delete-${Date.now()}@example.com`,
      };

      const createResponse = await fetch(`${API_BASE}/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(contact),
      });

      const { contact: created } = await createResponse.json();

      // Delete the contact
      const deleteResponse = await fetch(`${API_BASE}/contacts/${created.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(deleteResponse.status).toBe(200);

      // Verify it's no longer in list
      const listResponse = await fetch(`${API_BASE}/contacts`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const { contacts } = await listResponse.json();
      const found = contacts.find((c: any) => c.id === created.id);
      expect(found).toBeUndefined();
    });

    it('should return 404 for non-existent contact', async () => {
      const response = await fetch(`${API_BASE}/contacts/non-existent-id`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(404);
    });
  });

  describe('Role-Based Access Control', () => {
    it('should allow tax_preparer access to CRM', async () => {
      // Already using preparer token
      const response = await fetch(`${API_BASE}/contacts`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
    });

    it('should block CLIENT role from CRM', async () => {
      // Login as client
      const loginResponse = await fetch('http://localhost:3005/api/auth/test-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'client@test.com',
          password: 'client123',
        }),
      });

      const { token } = await loginResponse.json();

      const response = await fetch(`${API_BASE}/contacts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(403);
    });

    it('should allow super_admin full access', async () => {
      // Login as admin
      const loginResponse = await fetch('http://localhost:3005/api/auth/test-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@test.com',
          password: 'admin123',
        }),
      });

      const { token } = await loginResponse.json();

      const response = await fetch(`${API_BASE}/contacts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);
    });
  });

  describe('Data Security', () => {
    it('should not expose sensitive fields', async () => {
      const response = await fetch(`${API_BASE}/contacts`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const { contacts } = await response.json();

      contacts.forEach((contact: any) => {
        expect(contact).not.toHaveProperty('password');
        expect(contact).not.toHaveProperty('ssn');
        expect(contact).not.toHaveProperty('creditCard');
      });
    });

    it('should use HTTPS in production', () => {
      if (process.env.NODE_ENV === 'production') {
        expect(API_BASE).toMatch(/^https:/);
      }
    });

    it('should prevent SQL injection', async () => {
      const sqlInjection = {
        firstName: "'; DROP TABLE contacts; --",
        email: 'test@example.com',
      };

      const response = await fetch(`${API_BASE}/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(sqlInjection),
      });

      // Should either sanitize or reject
      expect(response.status).not.toBe(500);

      // Verify contacts table still exists
      const listResponse = await fetch(`${API_BASE}/contacts`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(listResponse.status).toBe(200);
    });
  });
});
