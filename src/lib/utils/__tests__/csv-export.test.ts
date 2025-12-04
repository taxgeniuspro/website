/**
 * Unit Tests for CSV Export Utility
 *
 * Tests CSV generation, formatting, and special character handling
 * Addresses QA Gate Issue TEST-001
 */

import { describe, it, expect } from '@jest/globals';
import { generateCSV, type ExportColumn, type MaterialPerformance } from '../csv-export';

describe('CSV Export Utility', () => {
  describe('generateCSV', () => {
    it('should generate valid CSV with headers', () => {
      const data = [
        { name: 'John', age: 30, city: 'New York' },
        { name: 'Jane', age: 25, city: 'Los Angeles' },
      ];

      const columns: ExportColumn[] = [
        { key: 'name', label: 'Name' },
        { key: 'age', label: 'Age' },
        { key: 'city', label: 'City' },
      ];

      const csv = generateCSV(data, columns);

      expect(csv).toContain('Name,Age,City');
      expect(csv).toContain('John,30,New York');
      expect(csv).toContain('Jane,25,Los Angeles');
    });

    it('should apply custom formatters', () => {
      const data = [{ amount: 1234.56, rate: 0.15 }];

      const columns: ExportColumn[] = [
        {
          key: 'amount',
          label: 'Amount',
          formatter: (val) => `$${val.toFixed(2)}`,
        },
        {
          key: 'rate',
          label: 'Rate',
          formatter: (val) => `${(val * 100).toFixed(1)}%`,
        },
      ];

      const csv = generateCSV(data, columns);

      expect(csv).toContain('$1234.56');
      expect(csv).toContain('15.0%');
    });

    it('should handle empty data gracefully', () => {
      const data: any[] = [];

      const columns: ExportColumn[] = [
        { key: 'name', label: 'Name' },
        { key: 'value', label: 'Value' },
      ];

      const csv = generateCSV(data, columns);

      // Should still have headers
      expect(csv).toBe('Name,Value\n');
    });

    it('should handle null and undefined values', () => {
      const data = [{ name: 'John', age: null, city: undefined }];

      const columns: ExportColumn[] = [
        { key: 'name', label: 'Name' },
        { key: 'age', label: 'Age' },
        { key: 'city', label: 'City' },
      ];

      const csv = generateCSV(data, columns);

      expect(csv).toContain('John,,');
    });

    it('should escape commas in values', () => {
      const data = [{ name: 'Smith, John', city: 'New York, NY' }];

      const columns: ExportColumn[] = [
        { key: 'name', label: 'Name' },
        { key: 'city', label: 'City' },
      ];

      const csv = generateCSV(data, columns);

      expect(csv).toContain('"Smith, John"');
      expect(csv).toContain('"New York, NY"');
    });

    it('should escape double quotes in values', () => {
      const data = [{ description: 'Product "Premium" Edition' }];

      const columns: ExportColumn[] = [{ key: 'description', label: 'Description' }];

      const csv = generateCSV(data, columns);

      expect(csv).toContain('Product ""Premium"" Edition');
    });

    it('should escape newlines in values', () => {
      const data = [{ notes: 'Line 1\nLine 2\nLine 3' }];

      const columns: ExportColumn[] = [{ key: 'notes', label: 'Notes' }];

      const csv = generateCSV(data, columns);

      // Newlines should be wrapped in quotes
      expect(csv).toMatch(/"Line 1\nLine 2\nLine 3"/);
    });

    it('should handle complex material performance data', () => {
      const materials: Partial<MaterialPerformance>[] = [
        {
          id: '1',
          title: 'QR Poster Campaign',
          type: 'qr_poster',
          clicks: 150,
          intakeStarts: 100,
          intakeCompletes: 75,
          returnsFiled: 50,
          conversionRate: 33.33,
        },
      ];

      const columns: ExportColumn[] = [
        { key: 'title', label: 'Material Name' },
        { key: 'type', label: 'Type' },
        { key: 'clicks', label: 'Clicks' },
        { key: 'returnsFiled', label: 'Conversions' },
        {
          key: 'conversionRate',
          label: 'Rate',
          formatter: (val) => `${val.toFixed(2)}%`,
        },
      ];

      const csv = generateCSV(materials as any[], columns);

      expect(csv).toContain('QR Poster Campaign');
      expect(csv).toContain('qr_poster');
      expect(csv).toContain('150');
      expect(csv).toContain('50');
      expect(csv).toContain('33.33%');
    });

    it('should handle special characters in headers', () => {
      const data = [{ value: 100 }];

      const columns: ExportColumn[] = [{ key: 'value', label: 'Value ($, €, £)' }];

      const csv = generateCSV(data, columns);

      expect(csv).toContain('Value ($, €, £)');
    });

    it('should generate consistent output for same input', () => {
      const data = [{ name: 'Test', value: 123 }];

      const columns: ExportColumn[] = [
        { key: 'name', label: 'Name' },
        { key: 'value', label: 'Value' },
      ];

      const csv1 = generateCSV(data, columns);
      const csv2 = generateCSV(data, columns);

      expect(csv1).toBe(csv2);
    });

    it('should handle large datasets efficiently', () => {
      const data = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Material ${i}`,
        value: Math.random() * 1000,
      }));

      const columns: ExportColumn[] = [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Name' },
        { key: 'value', label: 'Value' },
      ];

      const startTime = Date.now();
      const csv = generateCSV(data, columns);
      const duration = Date.now() - startTime;

      // Should complete in under 1 second
      expect(duration).toBeLessThan(1000);

      // Should have 1001 lines (header + 1000 data rows)
      const lines = csv.split('\n');
      expect(lines.length).toBe(1001);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string values', () => {
      const data = [{ name: '', value: '' }];

      const columns: ExportColumn[] = [
        { key: 'name', label: 'Name' },
        { key: 'value', label: 'Value' },
      ];

      const csv = generateCSV(data, columns);

      expect(csv).toBe('Name,Value\n,\n');
    });

    it('should handle numeric zero values', () => {
      const data = [{ count: 0, rate: 0.0 }];

      const columns: ExportColumn[] = [
        { key: 'count', label: 'Count' },
        { key: 'rate', label: 'Rate' },
      ];

      const csv = generateCSV(data, columns);

      expect(csv).toContain('0,0');
    });

    it('should handle boolean values', () => {
      const data = [{ active: true, verified: false }];

      const columns: ExportColumn[] = [
        { key: 'active', label: 'Active' },
        { key: 'verified', label: 'Verified' },
      ];

      const csv = generateCSV(data, columns);

      expect(csv).toContain('true,false');
    });

    it('should handle date objects with formatter', () => {
      const testDate = new Date('2025-10-13T00:00:00Z');
      const data = [{ date: testDate }];

      const columns: ExportColumn[] = [
        {
          key: 'date',
          label: 'Date',
          formatter: (date) => date.toLocaleDateString(),
        },
      ];

      const csv = generateCSV(data, columns);

      expect(csv).toContain(testDate.toLocaleDateString());
    });

    it('should handle mixed data types in same column', () => {
      const data = [{ value: 123 }, { value: 'text' }, { value: null }, { value: undefined }];

      const columns: ExportColumn[] = [{ key: 'value', label: 'Value' }];

      const csv = generateCSV(data, columns);

      expect(csv).toContain('123');
      expect(csv).toContain('text');
    });
  });

  describe('Performance and Limits', () => {
    it('should handle maximum realistic dataset (10000 rows)', () => {
      const data = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        title: `Material ${i}`,
        clicks: Math.floor(Math.random() * 1000),
        conversions: Math.floor(Math.random() * 100),
        rate: Math.random() * 100,
      }));

      const columns: ExportColumn[] = [
        { key: 'id', label: 'ID' },
        { key: 'title', label: 'Title' },
        { key: 'clicks', label: 'Clicks' },
        { key: 'conversions', label: 'Conversions' },
        { key: 'rate', label: 'Rate', formatter: (v) => `${v.toFixed(2)}%` },
      ];

      const startTime = Date.now();
      const csv = generateCSV(data, columns);
      const duration = Date.now() - startTime;

      // Should complete in under 2 seconds (per acceptance criteria)
      expect(duration).toBeLessThan(2000);

      // Verify output integrity
      const lines = csv.split('\n');
      expect(lines[0]).toContain('ID,Title,Clicks,Conversions,Rate');
      expect(lines.length).toBe(10001); // header + 10000 rows
    });

    it('should not corrupt data with concurrent generation', () => {
      const data = [{ name: 'Test', value: 123 }];
      const columns: ExportColumn[] = [
        { key: 'name', label: 'Name' },
        { key: 'value', label: 'Value' },
      ];

      // Generate multiple CSVs "simultaneously"
      const csv1 = generateCSV(data, columns);
      const csv2 = generateCSV(data, columns);
      const csv3 = generateCSV(data, columns);

      // All should be identical
      expect(csv1).toBe(csv2);
      expect(csv2).toBe(csv3);
    });
  });
});
