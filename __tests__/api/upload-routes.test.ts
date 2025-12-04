import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * File Upload API Tests
 *
 * Tests the file upload endpoints including:
 * - Document upload
 * - File type validation
 * - Size limits
 * - Virus scanning (if implemented)
 * - Access control
 * - Storage security
 */

const API_BASE = 'http://localhost:3005/api/documents';

describe('File Upload Routes', () => {
  let authToken: string;

  beforeAll(async () => {
    // Get auth token
    const loginResponse = await fetch('http://localhost:3005/api/auth/test-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'client@test.com',
        password: 'client123',
      }),
    });

    const data = await loginResponse.json();
    authToken = data.token || '';
  });

  describe('POST /api/documents/upload', () => {
    it('should upload valid PDF document', async () => {
      const formData = new FormData();
      const testPdf = new Blob(['%PDF-1.4 test content'], { type: 'application/pdf' });
      formData.append('file', testPdf, 'test-document.pdf');
      formData.append('category', 'tax_document');

      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty('fileId');
      expect(data).toHaveProperty('url');
      expect(data.filename).toBe('test-document.pdf');
    });

    it('should upload valid image (JPG/PNG)', async () => {
      const formData = new FormData();
      // Minimal valid PNG header
      const pngData = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
      const testImage = new Blob([pngData], { type: 'image/png' });
      formData.append('file', testImage, 'test-image.png');

      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      expect(response.status).toBe(200);
    });

    it('should reject executable files', async () => {
      const formData = new FormData();
      const maliciousFile = new Blob(['MZ\x90\x00'], { type: 'application/x-msdownload' });
      formData.append('file', maliciousFile, 'malware.exe');

      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toMatch(/file type|not allowed|invalid/i);
    });

    it('should reject files exceeding size limit', async () => {
      const formData = new FormData();
      // Create a 15MB file (exceeds typical 10MB limit)
      const largeFile = new Blob([new ArrayBuffer(15 * 1024 * 1024)], {
        type: 'application/pdf',
      });
      formData.append('file', largeFile, 'large-file.pdf');

      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      expect(response.status).toBe(413);
      const data = await response.json();
      expect(data.error).toMatch(/too large|size limit|maximum/i);
    });

    it('should validate file extension matches MIME type', async () => {
      const formData = new FormData();
      // PDF content with .jpg extension
      const mismatchedFile = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
      formData.append('file', mismatchedFile, 'fake-image.jpg');

      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      // Should either reject or normalize
      if (response.status !== 200) {
        const data = await response.json();
        expect(data.error).toBeDefined();
      }
    });

    it('should sanitize filename', async () => {
      const formData = new FormData();
      const testFile = new Blob(['test'], { type: 'application/pdf' });
      formData.append('file', testFile, '../../../etc/passwd.pdf');

      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      // Filename should be sanitized
      expect(data.filename).not.toContain('..');
      expect(data.filename).not.toContain('/');
      expect(data.filename).not.toContain('\\');
    });

    it('should reject files with null bytes', async () => {
      const formData = new FormData();
      const testFile = new Blob(['test\x00content'], { type: 'application/pdf' });
      formData.append('file', testFile, 'null-byte.pdf');

      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      expect(response.status).toBe(400);
    });

    it('should require authentication', async () => {
      const formData = new FormData();
      const testFile = new Blob(['test'], { type: 'application/pdf' });
      formData.append('file', testFile, 'test.pdf');

      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
        // No auth token
      });

      expect(response.status).toBe(401);
    });

    it('should handle multiple file uploads', async () => {
      const formData = new FormData();

      for (let i = 0; i < 3; i++) {
        const file = new Blob([`test content ${i}`], { type: 'application/pdf' });
        formData.append('files', file, `document-${i}.pdf`);
      }

      const response = await fetch(`${API_BASE}/upload/multiple`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.files).toHaveLength(3);
    });

    it('should prevent MIME type spoofing', async () => {
      const formData = new FormData();
      // Executable with image MIME type
      const spoofedFile = new Blob(['MZ\x90\x00'], { type: 'image/jpeg' });
      formData.append('file', spoofedFile, 'fake-image.jpg');

      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      // Should detect actual file type
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/documents/:id', () => {
    it('should download uploaded document', async () => {
      // First upload a file
      const formData = new FormData();
      const testFile = new Blob(['test content'], { type: 'application/pdf' });
      formData.append('file', testFile, 'test.pdf');

      const uploadResponse = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      const { fileId } = await uploadResponse.json();

      // Download the file
      const downloadResponse = await fetch(`${API_BASE}/${fileId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(downloadResponse.status).toBe(200);
      expect(downloadResponse.headers.get('content-type')).toContain('pdf');
    });

    it('should enforce access control on downloads', async () => {
      // Upload as one user
      const formData = new FormData();
      const testFile = new Blob(['private content'], { type: 'application/pdf' });
      formData.append('file', testFile, 'private.pdf');

      const uploadResponse = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      const { fileId } = await uploadResponse.json();

      // Try to download as different user
      const loginResponse = await fetch('http://localhost:3005/api/auth/test-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'other@test.com',
          password: 'other123',
        }),
      });

      const { token: otherToken } = await loginResponse.json();

      const downloadResponse = await fetch(`${API_BASE}/${fileId}`, {
        headers: {
          Authorization: `Bearer ${otherToken}`,
        },
      });

      expect(downloadResponse.status).toBe(403);
    });

    it('should return 404 for non-existent files', async () => {
      const response = await fetch(`${API_BASE}/non-existent-id`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(404);
    });

    it('should serve files with correct headers', async () => {
      // Upload a file
      const formData = new FormData();
      const testFile = new Blob(['test'], { type: 'application/pdf' });
      formData.append('file', testFile, 'test.pdf');

      const uploadResponse = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      const { fileId } = await uploadResponse.json();

      // Download
      const response = await fetch(`${API_BASE}/${fileId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      // Check security headers
      expect(response.headers.get('content-disposition')).toBeDefined();
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    });
  });

  describe('DELETE /api/documents/:id', () => {
    it('should delete own documents', async () => {
      // Upload a file
      const formData = new FormData();
      const testFile = new Blob(['test'], { type: 'application/pdf' });
      formData.append('file', testFile, 'to-delete.pdf');

      const uploadResponse = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      const { fileId } = await uploadResponse.json();

      // Delete the file
      const deleteResponse = await fetch(`${API_BASE}/${fileId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(deleteResponse.status).toBe(200);

      // Verify it's deleted
      const getResponse = await fetch(`${API_BASE}/${fileId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(getResponse.status).toBe(404);
    });

    it('should prevent deleting other users files', async () => {
      // Upload as one user
      const formData = new FormData();
      const testFile = new Blob(['test'], { type: 'application/pdf' });
      formData.append('file', testFile, 'protected.pdf');

      const uploadResponse = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      const { fileId } = await uploadResponse.json();

      // Try to delete as different user
      const loginResponse = await fetch('http://localhost:3005/api/auth/test-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'other@test.com',
          password: 'other123',
        }),
      });

      const { token: otherToken } = await loginResponse.json();

      const deleteResponse = await fetch(`${API_BASE}/${fileId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${otherToken}`,
        },
      });

      expect(deleteResponse.status).toBe(403);
    });
  });

  describe('Storage Security', () => {
    it('should store files outside webroot', async () => {
      const formData = new FormData();
      const testFile = new Blob(['test'], { type: 'application/pdf' });
      formData.append('file', testFile, 'test.pdf');

      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      const { url } = await response.json();

      // URL should not expose filesystem path
      expect(url).not.toMatch(/\/uploads\//);
      expect(url).not.toMatch(/\.\./);
    });

    it('should use unique IDs for filenames', async () => {
      const formData = new FormData();
      const testFile = new Blob(['test'], { type: 'application/pdf' });
      formData.append('file', testFile, 'same-name.pdf');

      const response1 = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      const response2 = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      const data1 = await response1.json();
      const data2 = await response2.json();

      // Should have different IDs/URLs
      expect(data1.fileId).not.toBe(data2.fileId);
    });
  });
});
