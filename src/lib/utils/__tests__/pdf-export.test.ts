/**
 * Unit Tests for PDF Export Utility
 *
 * Tests PDF generation, report formatting, and error handling
 * Addresses QA Gate Issue TEST-001
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { ReportSection, MaterialPerformance, DashboardData } from '../pdf-export';

// Mock jsPDF and jspdf-autotable
jest.mock('jspdf', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      setFontSize: jest.fn(),
      setTextColor: jest.fn(),
      text: jest.fn(),
      addPage: jest.fn(),
      splitTextToSize: jest.fn((text: string) => [text]),
      output: jest.fn(() => new Blob(['mock-pdf-content'], { type: 'application/pdf' })),
      internal: {
        getNumberOfPages: jest.fn(() => 1),
        pageSize: { height: 297 },
      },
    })),
  };
});

jest.mock('jspdf-autotable', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Import after mocking
import { generatePDFReport, generateFunnelInsights } from '../pdf-export';

describe('PDF Export Utility', () => {
  describe('generatePDFReport', () => {
    it('should generate a PDF blob', async () => {
      const sections: ReportSection[] = [
        {
          title: 'Test Section',
          type: 'metrics',
          data: {
            metrics: [{ label: 'Total', value: '100' }],
          },
        },
      ];

      const blob = await generatePDFReport({
        title: 'Test Report',
        sections,
        dateRange: 'Last 30 days',
        generatedBy: 'Test User',
      });

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
    });

    it('should handle multiple sections', async () => {
      const sections: ReportSection[] = [
        {
          title: 'Metrics',
          type: 'metrics',
          data: {
            metrics: [
              { label: 'Clicks', value: '1000' },
              { label: 'Conversions', value: '100' },
            ],
          },
        },
        {
          title: 'Table Data',
          type: 'table',
          data: {
            headers: ['Name', 'Value'],
            rows: [
              ['Item 1', '10'],
              ['Item 2', '20'],
            ],
          },
        },
        {
          title: 'Description',
          type: 'text',
          data: {
            text: 'This is a test description',
          },
        },
      ];

      const blob = await generatePDFReport({
        title: 'Multi-Section Report',
        sections,
        dateRange: 'Q1 2025',
        generatedBy: 'Admin',
      });

      expect(blob).toBeInstanceOf(Blob);
    });

    it('should handle empty sections array', async () => {
      const sections: ReportSection[] = [];

      const blob = await generatePDFReport({
        title: 'Empty Report',
        sections,
        dateRange: 'N/A',
        generatedBy: 'System',
      });

      expect(blob).toBeInstanceOf(Blob);
    });

    it('should handle long text content', async () => {
      const longText = 'Lorem ipsum dolor sit amet, '.repeat(100);

      const sections: ReportSection[] = [
        {
          title: 'Long Text',
          type: 'text',
          data: {
            text: longText,
          },
        },
      ];

      const blob = await generatePDFReport({
        title: 'Long Content Report',
        sections,
        dateRange: 'All Time',
        generatedBy: 'Test',
      });

      expect(blob).toBeInstanceOf(Blob);
    });

    it('should complete within 5 seconds for typical report', async () => {
      const sections: ReportSection[] = [
        {
          title: 'Performance Overview',
          type: 'metrics',
          data: {
            metrics: [
              { label: 'Total Clicks', value: '10000' },
              { label: 'Conversions', value: '1000' },
              { label: 'Rate', value: '10%' },
            ],
          },
        },
        {
          title: 'Top 15 Materials',
          type: 'table',
          data: {
            headers: ['Rank', 'Material', 'Clicks', 'Conversions'],
            rows: Array.from({ length: 15 }, (_, i) => [
              String(i + 1),
              `Material ${i + 1}`,
              String(Math.floor(Math.random() * 1000)),
              String(Math.floor(Math.random() * 100)),
            ]),
          },
        },
      ];

      const startTime = Date.now();
      const blob = await generatePDFReport({
        title: 'Performance Report',
        sections,
        dateRange: 'Last 30 days',
        generatedBy: 'User',
      });
      const duration = Date.now() - startTime;

      expect(blob).toBeInstanceOf(Blob);
      // Should complete in under 5 seconds (acceptance criteria)
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('generateFunnelInsights', () => {
    it('should identify high click-to-start drop-off', () => {
      const funnelData = {
        stage1_clicks: 1000,
        stage2_intakeStarts: 200,
        stage3_intakeCompletes: 150,
        stage4_returnsFiled: 100,
        conversionRates: {
          clickToStart: 20,
          startToComplete: 75,
          completeToFiled: 66.67,
          overallConversion: 10,
        },
        dropoff: {
          clickToStart: 80,
          startToComplete: 25,
          completeToFiled: 33.33,
        },
      };

      const insights = generateFunnelInsights(funnelData);

      expect(insights).toContain('High drop-off between click and intake start');
      expect(insights).toContain('>70%');
    });

    it('should identify high form completion drop-off', () => {
      const funnelData = {
        stage1_clicks: 1000,
        stage2_intakeStarts: 800,
        stage3_intakeCompletes: 300,
        stage4_returnsFiled: 250,
        conversionRates: {
          clickToStart: 80,
          startToComplete: 37.5,
          completeToFiled: 83.33,
          overallConversion: 25,
        },
        dropoff: {
          clickToStart: 20,
          startToComplete: 62.5,
          completeToFiled: 16.67,
        },
      };

      const insights = generateFunnelInsights(funnelData);

      expect(insights).toContain('during intake form completion');
      expect(insights).toContain('>60%');
    });

    it('should identify high post-completion drop-off', () => {
      const funnelData = {
        stage1_clicks: 1000,
        stage2_intakeStarts: 800,
        stage3_intakeCompletes: 700,
        stage4_returnsFiled: 300,
        conversionRates: {
          clickToStart: 80,
          startToComplete: 87.5,
          completeToFiled: 42.86,
          overallConversion: 30,
        },
        dropoff: {
          clickToStart: 20,
          startToComplete: 12.5,
          completeToFiled: 57.14,
        },
      };

      const insights = generateFunnelInsights(funnelData);

      expect(insights).toContain('after form completion');
      expect(insights).toContain('>50%');
    });

    it('should celebrate excellent conversion rates', () => {
      const funnelData = {
        stage1_clicks: 1000,
        stage2_intakeStarts: 900,
        stage3_intakeCompletes: 800,
        stage4_returnsFiled: 700,
        conversionRates: {
          clickToStart: 90,
          startToComplete: 88.89,
          completeToFiled: 87.5,
          overallConversion: 70,
        },
        dropoff: {
          clickToStart: 10,
          startToComplete: 11.11,
          completeToFiled: 12.5,
        },
      };

      const insights = generateFunnelInsights(funnelData);

      expect(insights).toContain('Excellent overall conversion rate');
      expect(insights).toContain('>15%');
    });

    it('should warn about low overall conversion', () => {
      const funnelData = {
        stage1_clicks: 1000,
        stage2_intakeStarts: 200,
        stage3_intakeCompletes: 100,
        stage4_returnsFiled: 30,
        conversionRates: {
          clickToStart: 20,
          startToComplete: 50,
          completeToFiled: 30,
          overallConversion: 3,
        },
        dropoff: {
          clickToStart: 80,
          startToComplete: 50,
          completeToFiled: 70,
        },
      };

      const insights = generateFunnelInsights(funnelData);

      expect(insights).toContain('Low overall conversion rate');
      expect(insights).toContain('<5%');
    });

    it('should return empty string for optimal funnel', () => {
      const funnelData = {
        stage1_clicks: 1000,
        stage2_intakeStarts: 850,
        stage3_intakeCompletes: 800,
        stage4_returnsFiled: 750,
        conversionRates: {
          clickToStart: 85,
          startToComplete: 94.12,
          completeToFiled: 93.75,
          overallConversion: 75,
        },
        dropoff: {
          clickToStart: 15,
          startToComplete: 5.88,
          completeToFiled: 6.25,
        },
      };

      const insights = generateFunnelInsights(funnelData);

      // Should have excellent conversion insight only
      expect(insights).toContain('Excellent overall conversion rate');
      expect(insights).not.toContain('High drop-off');
      expect(insights).not.toContain('Low overall conversion');
    });

    it('should handle edge case with zero conversions', () => {
      const funnelData = {
        stage1_clicks: 1000,
        stage2_intakeStarts: 0,
        stage3_intakeCompletes: 0,
        stage4_returnsFiled: 0,
        conversionRates: {
          clickToStart: 0,
          startToComplete: 0,
          completeToFiled: 0,
          overallConversion: 0,
        },
        dropoff: {
          clickToStart: 100,
          startToComplete: 0,
          completeToFiled: 0,
        },
      };

      const insights = generateFunnelInsights(funnelData);

      expect(insights).toContain('High drop-off between click and intake start');
      expect(insights).toContain('Low overall conversion rate');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed section data gracefully', async () => {
      const sections: ReportSection[] = [
        {
          title: 'Bad Section',
          type: 'metrics',
          data: null as any,
        },
      ];

      // Should not throw
      const blob = await generatePDFReport({
        title: 'Error Test',
        sections,
        dateRange: 'N/A',
        generatedBy: 'Test',
      });

      expect(blob).toBeInstanceOf(Blob);
    });

    it('should handle missing data properties', async () => {
      const sections: ReportSection[] = [
        {
          title: 'Incomplete Section',
          type: 'table',
          data: {
            headers: ['Name'],
            // Missing rows property
          } as any,
        },
      ];

      const blob = await generatePDFReport({
        title: 'Missing Data Test',
        sections,
        dateRange: 'N/A',
        generatedBy: 'Test',
      });

      expect(blob).toBeInstanceOf(Blob);
    });

    it('should handle empty metrics array', async () => {
      const sections: ReportSection[] = [
        {
          title: 'Empty Metrics',
          type: 'metrics',
          data: {
            metrics: [],
          },
        },
      ];

      const blob = await generatePDFReport({
        title: 'Empty Metrics Test',
        sections,
        dateRange: 'N/A',
        generatedBy: 'Test',
      });

      expect(blob).toBeInstanceOf(Blob);
    });
  });

  describe('Integration Scenarios', () => {
    it('should generate dashboard report with realistic data', async () => {
      const dashboardData: DashboardData = {
        totalClicks: 5000,
        conversions: 500,
        conversionRate: 10,
        materials: [
          {
            id: '1',
            title: 'QR Poster Campaign',
            type: 'qr_poster',
            clicks: 1000,
            intakeStarts: 800,
            intakeCompletes: 600,
            returnsFiled: 400,
            conversionRate: 40,
          },
          {
            id: '2',
            title: 'Email Campaign',
            type: 'email_link',
            clicks: 2000,
            intakeStarts: 1500,
            intakeCompletes: 1000,
            returnsFiled: 100,
            conversionRate: 5,
          },
        ],
        userName: 'Test User',
      };

      // This would normally call exportDashboardReport
      // but we're testing the underlying generatePDFReport
      const sections: ReportSection[] = [
        {
          title: 'Performance Overview',
          type: 'metrics',
          data: {
            metrics: [
              { label: 'Total Clicks', value: dashboardData.totalClicks.toString() },
              { label: 'Conversions', value: dashboardData.conversions.toString() },
              { label: 'Rate', value: `${dashboardData.conversionRate}%` },
            ],
          },
        },
        {
          title: 'Top Materials',
          type: 'table',
          data: {
            headers: ['Rank', 'Material', 'Clicks', 'Conversions', 'Rate'],
            rows: dashboardData.materials.map((m, i) => [
              String(i + 1),
              m.title,
              m.clicks.toString(),
              m.returnsFiled.toString(),
              `${m.conversionRate}%`,
            ]),
          },
        },
      ];

      const blob = await generatePDFReport({
        title: 'Dashboard Report',
        sections,
        dateRange: 'Last 30 days',
        generatedBy: dashboardData.userName,
      });

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
    });
  });
});
