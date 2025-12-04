/**
 * Attribution Service Unit Tests
 *
 * Tests for multi-strategy attribution system
 * Part of Epic 6: Lead Tracking Dashboard Enhancement - Story 9
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import {
  getAttribution,
  getReferrerAttributionStats,
  trackReferrerVisit
} from '@/lib/services/attribution.service'
import { prisma } from '@/lib/db'

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    lead: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    referrerVisit: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}))

describe('Attribution Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getAttribution', () => {
    it('should find cookie-based attribution with 100% confidence', async () => {
      // Mock: Cookie with referrer username found
      const mockCookie = {
        username: 'johnsmith',
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      }

      // Simulate cookie being present
      global.document = {
        cookie: `referrer_username=${mockCookie.username}; expires=${mockCookie.expires.toUTCString()}`
      } as unknown as Document

      const result = await getAttribution('test@example.com', '555-123-4567')

      expect(result.attribution.attributionMethod).toBe('cookie')
      expect(result.attribution.attributionConfidence).toBe(100)
      expect(result.attribution.referrerUsername).toBe('johnsmith')
    })

    it('should fall back to email match with 90% confidence', async () => {
      // Mock: No cookie, but email has previous referrer visit
      const mockVisit = {
        id: 'visit-123',
        email: 'test@example.com',
        referrerUsername: 'janesmith',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
      }

      ;(prisma.referrerVisit.findFirst as jest.Mock).mockResolvedValueOnce(mockVisit)

      const result = await getAttribution('test@example.com', '555-123-4567')

      expect(result.attribution.attributionMethod).toBe('email_match')
      expect(result.attribution.attributionConfidence).toBe(90)
      expect(result.attribution.referrerUsername).toBe('janesmith')
    })

    it('should fall back to phone match with 85% confidence', async () => {
      // Mock: No cookie, no email match, but phone has previous visit
      ;(prisma.referrerVisit.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // No email match
        .mockResolvedValueOnce({ // Phone match
          id: 'visit-456',
          phone: '5551234567',
          referrerUsername: 'bobsmith',
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        })

      const result = await getAttribution('test@example.com', '555-123-4567')

      expect(result.attribution.attributionMethod).toBe('phone_match')
      expect(result.attribution.attributionConfidence).toBe(85)
      expect(result.attribution.referrerUsername).toBe('bobsmith')
    })

    it('should return direct attribution when no matches found', async () => {
      // Mock: No cookie, no email, no phone
      ;(prisma.referrerVisit.findFirst as jest.Mock).mockResolvedValue(null)

      const result = await getAttribution('test@example.com', '555-123-4567')

      expect(result.attribution.attributionMethod).toBe('direct')
      expect(result.attribution.attributionConfidence).toBe(100)
      expect(result.attribution.referrerUsername).toBeNull()
    })

    it('should prioritize cookie over email match', async () => {
      // Mock: Both cookie AND email match exist
      global.document = {
        cookie: `referrer_username=cookieuser; expires=${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString()}`
      } as unknown as Document

      ;(prisma.referrerVisit.findFirst as jest.Mock).mockResolvedValue({
        referrerUsername: 'emailuser'
      })

      const result = await getAttribution('test@example.com', '555-123-4567')

      // Cookie should win
      expect(result.attribution.attributionMethod).toBe('cookie')
      expect(result.attribution.referrerUsername).toBe('cookieuser')
    })

    it('should ignore expired cookies', async () => {
      // Mock: Expired cookie
      global.document = {
        cookie: `referrer_username=expireduser; expires=${new Date(Date.now() - 1000).toUTCString()}`
      } as unknown as Document

      ;(prisma.referrerVisit.findFirst as jest.Mock).mockResolvedValue(null)

      const result = await getAttribution('test@example.com', '555-123-4567')

      // Should fall back to direct
      expect(result.attribution.attributionMethod).toBe('direct')
      expect(result.attribution.referrerUsername).toBeNull()
    })

    it('should ignore visits older than 14 days', async () => {
      // Mock: Visit from 15 days ago
      ;(prisma.referrerVisit.findFirst as jest.Mock).mockResolvedValue({
        referrerUsername: 'olduser',
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
      })

      const result = await getAttribution('test@example.com', '555-123-4567')

      // Should fall back to direct (visit too old)
      expect(result.attribution.attributionMethod).toBe('direct')
    })
  })

  describe('getReferrerAttributionStats', () => {
    it('should calculate correct attribution breakdown', async () => {
      // Mock leads with different attribution methods
      const mockLeads = [
        { attributionMethod: 'cookie' },
        { attributionMethod: 'cookie' },
        { attributionMethod: 'cookie' },
        { attributionMethod: 'email_match' },
        { attributionMethod: 'email_match' },
        { attributionMethod: 'phone_match' },
        { attributionMethod: 'direct' },
      ]

      ;(prisma.lead.findMany as jest.Mock).mockResolvedValue(mockLeads)
      ;(prisma.lead.count as jest.Mock).mockResolvedValue(7)

      const stats = await getReferrerAttributionStats('testuser')

      expect(stats.totalLeads).toBe(7)
      expect(stats.byMethod.cookie).toBe(3)
      expect(stats.byMethod.emailMatch).toBe(2)
      expect(stats.byMethod.phoneMatch).toBe(1)
      expect(stats.byMethod.direct).toBe(1)
    })

    it('should calculate cross-device rate correctly', async () => {
      // Mock: 3 cookie, 2 email, 1 phone = 3 cross-device out of 6 = 50%
      const mockLeads = [
        { attributionMethod: 'cookie' },
        { attributionMethod: 'cookie' },
        { attributionMethod: 'cookie' },
        { attributionMethod: 'email_match' },
        { attributionMethod: 'email_match' },
        { attributionMethod: 'phone_match' },
      ]

      ;(prisma.lead.findMany as jest.Mock).mockResolvedValue(mockLeads)
      ;(prisma.lead.count as jest.Mock).mockResolvedValue(6)

      const stats = await getReferrerAttributionStats('testuser')

      // 2 email + 1 phone = 3 cross-device out of 6 = 50%
      expect(stats.crossDeviceRate).toBe(50)
    })

    it('should return zero stats for user with no leads', async () => {
      ;(prisma.lead.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.lead.count as jest.Mock).mockResolvedValue(0)

      const stats = await getReferrerAttributionStats('newuser')

      expect(stats.totalLeads).toBe(0)
      expect(stats.byMethod.cookie).toBe(0)
      expect(stats.crossDeviceRate).toBe(0)
    })
  })

  describe('trackReferrerVisit', () => {
    it('should create visit record with email', async () => {
      const mockVisit = {
        id: 'visit-789',
        email: 'test@example.com',
        referrerUsername: 'testuser',
        createdAt: new Date()
      }

      ;(prisma.referrerVisit.create as jest.Mock).mockResolvedValue(mockVisit)

      const result = await trackReferrerVisit({
        referrerUsername: 'testuser',
        email: 'test@example.com',
        phone: null,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...'
      })

      expect(result).toEqual(mockVisit)
      expect(prisma.referrerVisit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          referrerUsername: 'testuser',
          email: 'test@example.com'
        })
      })
    })

    it('should sanitize phone number before saving', async () => {
      await trackReferrerVisit({
        referrerUsername: 'testuser',
        email: null,
        phone: '(555) 123-4567',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...'
      })

      expect(prisma.referrerVisit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          phone: '5551234567' // Sanitized: numbers only
        })
      })
    })

    it('should not create duplicate visit within 24 hours', async () => {
      // Mock: Recent visit found
      ;(prisma.referrerVisit.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing-visit',
        email: 'test@example.com',
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
      })

      const result = await trackReferrerVisit({
        referrerUsername: 'testuser',
        email: 'test@example.com',
        phone: null,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...'
      })

      // Should return existing visit, not create new one
      expect(result.id).toBe('existing-visit')
      expect(prisma.referrerVisit.create).not.toHaveBeenCalled()
    })
  })
})
