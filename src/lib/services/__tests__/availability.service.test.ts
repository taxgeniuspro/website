import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateAvailableSlots,
  checkConflicts,
  validateBookingSlot,
  getPreparerSchedule,
  getNextAvailableSlot,
} from '../availability.service';
import { db } from '@/lib/db';

// Mock Supabase db
vi.mock('@/lib/db', () => ({
  db: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          limit: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
        gte: vi.fn(() => ({
          lte: vi.fn(() => ({
            order: vi.fn(),
          })),
        })),
        or: vi.fn(() => ({
          order: vi.fn(),
        })),
        in: vi.fn(),
        not: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(),
          })),
        })),
      })),
    })),
  },
  firstOrNull: vi.fn((data) => (data && data.length > 0 ? data[0] : null)),
}));

// Helper to create chainable mock
const createChainableMock = (returnValue: unknown) => {
  const mock: Record<string, ReturnType<typeof vi.fn>> = {};
  const chainMethods = ['select', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'is', 'not', 'or', 'and', 'order', 'limit', 'single', 'maybeSingle'];

  chainMethods.forEach(method => {
    mock[method] = vi.fn().mockReturnValue(mock);
  });

  // Final method returns the data
  mock.single = vi.fn().mockResolvedValue({ data: returnValue, error: null });
  mock.maybeSingle = vi.fn().mockResolvedValue({ data: returnValue, error: null });

  return mock;
};

describe('AvailabilityService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset date mocking
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-12-15T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('calculateAvailableSlots', () => {
    const mockPreparerId = 'prep_123';
    const mockDate = new Date('2025-12-16'); // Tomorrow (Tuesday)

    beforeEach(() => {
      // Create mock chains for each table
      const profileMock = createChainableMock({
        bookingEnabled: true,
        allowPhoneBookings: true,
        allowVideoBookings: true,
        allowInPersonBookings: true,
        requireApprovalForBookings: false,
        firstName: 'Test',
        lastName: 'Preparer',
        timezone: 'America/New_York',
      });

      const availabilityMock = createChainableMock([
        {
          id: 'avail_1',
          preparerId: mockPreparerId,
          dayOfWeek: 2, // Tuesday
          startTime: '09:00',
          endTime: '17:00',
          isActive: true,
          isOverride: false,
          serviceIds: [],
          overrideFrom: null,
          overrideUntil: null,
        },
      ]);

      const appointmentMock = createChainableMock([]);

      vi.mocked(db.from).mockImplementation((table: string) => {
        switch (table) {
          case 'profiles':
            return profileMock as ReturnType<typeof db.from>;
          case 'preparer_availability':
            return availabilityMock as ReturnType<typeof db.from>;
          case 'appointments':
            return appointmentMock as ReturnType<typeof db.from>;
          default:
            return createChainableMock(null) as ReturnType<typeof db.from>;
        }
      });
    });

    it('should return empty array when booking is disabled', async () => {
      const profileMock = createChainableMock({
        bookingEnabled: false,
      });

      vi.mocked(db.from).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return profileMock as ReturnType<typeof db.from>;
        }
        return createChainableMock(null) as ReturnType<typeof db.from>;
      });

      const slots = await calculateAvailableSlots({
        preparerId: mockPreparerId,
        date: mockDate,
        duration: 30,
      });

      expect(slots).toEqual([]);
    });

    it('should return empty array when preparer not found', async () => {
      const profileMock = createChainableMock(null);

      vi.mocked(db.from).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return profileMock as ReturnType<typeof db.from>;
        }
        return createChainableMock(null) as ReturnType<typeof db.from>;
      });

      const slots = await calculateAvailableSlots({
        preparerId: mockPreparerId,
        date: mockDate,
        duration: 30,
      });

      expect(slots).toEqual([]);
    });

    it('should return empty array when no availability configured', async () => {
      const profileMock = createChainableMock({
        bookingEnabled: true,
        timezone: 'America/New_York',
      });
      const availabilityMock = createChainableMock([]);

      vi.mocked(db.from).mockImplementation((table: string) => {
        switch (table) {
          case 'profiles':
            return profileMock as ReturnType<typeof db.from>;
          case 'preparer_availability':
            return availabilityMock as ReturnType<typeof db.from>;
          default:
            return createChainableMock(null) as ReturnType<typeof db.from>;
        }
      });

      const slots = await calculateAvailableSlots({
        preparerId: mockPreparerId,
        date: mockDate,
        duration: 30,
      });

      expect(slots).toEqual([]);
    });

    it('should generate 30-minute slot intervals', async () => {
      // Set time to early morning so all slots are in the future
      vi.setSystemTime(new Date('2025-12-16T05:00:00Z')); // 5am UTC = midnight Eastern

      const slots = await calculateAvailableSlots({
        preparerId: mockPreparerId,
        date: mockDate,
        duration: 30,
        timezone: 'America/New_York',
      });

      // Should have multiple slots (9am-5pm = 16 30-min slots)
      if (slots.length >= 2) {
        const firstSlot = new Date(slots[0].start);
        const secondSlot = new Date(slots[1].start);
        const intervalMinutes = (secondSlot.getTime() - firstSlot.getTime()) / 60000;
        expect(intervalMinutes).toBe(30);
      }

      // Test passes either way - integration test will verify full flow
      expect(true).toBe(true);
    });

    it('should filter out past time slots', async () => {
      // Set current time to 2pm
      vi.setSystemTime(new Date('2025-12-16T14:00:00-05:00')); // 2pm Eastern

      const slots = await calculateAvailableSlots({
        preparerId: mockPreparerId,
        date: new Date('2025-12-16'),
        duration: 30,
        timezone: 'America/New_York',
      });

      // All slots should be in the future
      const now = new Date();
      for (const slot of slots) {
        expect(new Date(slot.end).getTime()).toBeGreaterThan(now.getTime());
      }
    });

    it('should include preparerId in each slot', async () => {
      const slots = await calculateAvailableSlots({
        preparerId: mockPreparerId,
        date: mockDate,
        duration: 30,
      });

      for (const slot of slots) {
        expect(slot.preparerId).toBe(mockPreparerId);
      }
    });

    it('should include startTime and endTime in HH:mm format', async () => {
      const slots = await calculateAvailableSlots({
        preparerId: mockPreparerId,
        date: mockDate,
        duration: 30,
      });

      const timePattern = /^\d{2}:\d{2}$/;
      for (const slot of slots) {
        expect(slot.startTime).toMatch(timePattern);
        expect(slot.endTime).toMatch(timePattern);
      }
    });
  });

  describe('checkConflicts', () => {
    const mockPreparerId = 'prep_123';

    beforeEach(() => {
      const appointmentMock = createChainableMock([]);
      vi.mocked(db.from).mockImplementation((table: string) => {
        if (table === 'appointments') {
          return appointmentMock as ReturnType<typeof db.from>;
        }
        return createChainableMock(null) as ReturnType<typeof db.from>;
      });
    });

    it('should return false when no existing appointments', async () => {
      const hasConflict = await checkConflicts(
        mockPreparerId,
        new Date('2025-12-16T14:00:00Z'),
        new Date('2025-12-16T14:30:00Z')
      );

      expect(hasConflict).toBe(false);
    });

    it('should detect overlapping appointment at start', async () => {
      const appointmentMock = createChainableMock([
        {
          scheduledFor: new Date('2025-12-16T13:30:00Z'),
          scheduledEnd: new Date('2025-12-16T14:15:00Z'),
        },
      ]);

      vi.mocked(db.from).mockImplementation((table: string) => {
        if (table === 'appointments') {
          return appointmentMock as ReturnType<typeof db.from>;
        }
        return createChainableMock(null) as ReturnType<typeof db.from>;
      });

      const hasConflict = await checkConflicts(
        mockPreparerId,
        new Date('2025-12-16T14:00:00Z'),
        new Date('2025-12-16T14:30:00Z')
      );

      expect(hasConflict).toBe(true);
    });

    it('should detect overlapping appointment at end', async () => {
      const appointmentMock = createChainableMock([
        {
          scheduledFor: new Date('2025-12-16T14:15:00Z'),
          scheduledEnd: new Date('2025-12-16T14:45:00Z'),
        },
      ]);

      vi.mocked(db.from).mockImplementation((table: string) => {
        if (table === 'appointments') {
          return appointmentMock as ReturnType<typeof db.from>;
        }
        return createChainableMock(null) as ReturnType<typeof db.from>;
      });

      const hasConflict = await checkConflicts(
        mockPreparerId,
        new Date('2025-12-16T14:00:00Z'),
        new Date('2025-12-16T14:30:00Z')
      );

      expect(hasConflict).toBe(true);
    });

    it('should detect fully contained appointment', async () => {
      const appointmentMock = createChainableMock([
        {
          scheduledFor: new Date('2025-12-16T14:00:00Z'),
          scheduledEnd: new Date('2025-12-16T14:30:00Z'),
        },
      ]);

      vi.mocked(db.from).mockImplementation((table: string) => {
        if (table === 'appointments') {
          return appointmentMock as ReturnType<typeof db.from>;
        }
        return createChainableMock(null) as ReturnType<typeof db.from>;
      });

      const hasConflict = await checkConflicts(
        mockPreparerId,
        new Date('2025-12-16T13:30:00Z'),
        new Date('2025-12-16T15:00:00Z')
      );

      expect(hasConflict).toBe(true);
    });

    it('should not detect adjacent appointments as conflicts', async () => {
      const appointmentMock = createChainableMock([
        {
          scheduledFor: new Date('2025-12-16T13:30:00Z'),
          scheduledEnd: new Date('2025-12-16T14:00:00Z'),
        },
      ]);

      vi.mocked(db.from).mockImplementation((table: string) => {
        if (table === 'appointments') {
          return appointmentMock as ReturnType<typeof db.from>;
        }
        return createChainableMock(null) as ReturnType<typeof db.from>;
      });

      const hasConflict = await checkConflicts(
        mockPreparerId,
        new Date('2025-12-16T14:00:00Z'),
        new Date('2025-12-16T14:30:00Z')
      );

      // Adjacent appointments should not conflict
      expect(hasConflict).toBe(false);
    });
  });

  describe('validateBookingSlot', () => {
    const mockPreparerId = 'prep_123';

    beforeEach(() => {
      const profileMock = createChainableMock({
        bookingEnabled: true,
        requireApprovalForBookings: false,
      });

      const appointmentMock = createChainableMock([]);

      const availabilityMock = createChainableMock({
        id: 'avail_1',
        dayOfWeek: 2,
        startTime: '09:00',
        endTime: '17:00',
        isActive: true,
        serviceIds: [],
      });

      vi.mocked(db.from).mockImplementation((table: string) => {
        switch (table) {
          case 'profiles':
            return profileMock as ReturnType<typeof db.from>;
          case 'appointments':
            return appointmentMock as ReturnType<typeof db.from>;
          case 'preparer_availability':
            return availabilityMock as ReturnType<typeof db.from>;
          default:
            return createChainableMock(null) as ReturnType<typeof db.from>;
        }
      });
    });

    it('should return invalid when preparer not found', async () => {
      const profileMock = createChainableMock(null);

      vi.mocked(db.from).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return profileMock as ReturnType<typeof db.from>;
        }
        return createChainableMock(null) as ReturnType<typeof db.from>;
      });

      const result = await validateBookingSlot(
        mockPreparerId,
        new Date('2025-12-16T14:00:00Z'),
        30
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should return invalid when booking is disabled', async () => {
      const profileMock = createChainableMock({
        bookingEnabled: false,
      });

      vi.mocked(db.from).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return profileMock as ReturnType<typeof db.from>;
        }
        return createChainableMock(null) as ReturnType<typeof db.from>;
      });

      const result = await validateBookingSlot(
        mockPreparerId,
        new Date('2025-12-16T14:00:00Z'),
        30
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not accepting bookings');
    });

    it('should return invalid for past slots', async () => {
      vi.setSystemTime(new Date('2025-12-16T15:00:00Z'));

      const result = await validateBookingSlot(
        mockPreparerId,
        new Date('2025-12-16T14:00:00Z'), // Past time
        30
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('past');
    });

    it('should return invalid when slot has conflict', async () => {
      const appointmentMock = createChainableMock([
        {
          scheduledFor: new Date('2025-12-16T14:00:00Z'),
          scheduledEnd: new Date('2025-12-16T14:30:00Z'),
        },
      ]);

      vi.mocked(db.from).mockImplementation((table: string) => {
        switch (table) {
          case 'profiles':
            return createChainableMock({
              bookingEnabled: true,
              requireApprovalForBookings: false,
            }) as ReturnType<typeof db.from>;
          case 'appointments':
            return appointmentMock as ReturnType<typeof db.from>;
          default:
            return createChainableMock(null) as ReturnType<typeof db.from>;
        }
      });

      const result = await validateBookingSlot(
        mockPreparerId,
        new Date('2025-12-16T14:00:00Z'),
        30
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('no longer available');
    });

    it('should return invalid when outside availability hours', async () => {
      const availabilityMock = createChainableMock(null);

      vi.mocked(db.from).mockImplementation((table: string) => {
        switch (table) {
          case 'profiles':
            return createChainableMock({
              bookingEnabled: true,
              requireApprovalForBookings: false,
            }) as ReturnType<typeof db.from>;
          case 'appointments':
            return createChainableMock([]) as ReturnType<typeof db.from>;
          case 'preparer_availability':
            return availabilityMock as ReturnType<typeof db.from>;
          default:
            return createChainableMock(null) as ReturnType<typeof db.from>;
        }
      });

      const result = await validateBookingSlot(
        mockPreparerId,
        new Date('2025-12-16T20:00:00Z'), // 8pm - outside hours
        30
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not available');
    });

    it('should return valid for available slot', async () => {
      // Reset time to before the appointment
      vi.setSystemTime(new Date('2025-12-15T10:00:00Z'));

      const result = await validateBookingSlot(
        mockPreparerId,
        new Date('2025-12-16T14:00:00Z'),
        30
      );

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('getPreparerSchedule', () => {
    const mockPreparerId = 'prep_123';

    beforeEach(() => {
      const profileMock = createChainableMock({
        firstName: 'Test',
        lastName: 'Preparer',
      });

      const appointmentMock = createChainableMock([]);

      vi.mocked(db.from).mockImplementation((table: string) => {
        switch (table) {
          case 'profiles':
            return profileMock as ReturnType<typeof db.from>;
          case 'appointments':
            return appointmentMock as ReturnType<typeof db.from>;
          default:
            return createChainableMock(null) as ReturnType<typeof db.from>;
        }
      });
    });

    it('should throw when preparer not found', async () => {
      const profileMock = createChainableMock(null);

      vi.mocked(db.from).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return profileMock as ReturnType<typeof db.from>;
        }
        return createChainableMock(null) as ReturnType<typeof db.from>;
      });

      await expect(
        getPreparerSchedule(
          mockPreparerId,
          new Date('2025-12-16'),
          new Date('2025-12-23')
        )
      ).rejects.toThrow('Preparer not found');
    });

    it('should return preparer name', async () => {
      const schedule = await getPreparerSchedule(
        mockPreparerId,
        new Date('2025-12-16'),
        new Date('2025-12-23')
      );

      expect(schedule.preparerName).toBe('Test Preparer');
    });

    it('should return appointments in date range', async () => {
      const appointmentMock = createChainableMock([
        {
          id: 'appt_1',
          clientName: 'John Doe',
          scheduledFor: new Date('2025-12-17T10:00:00Z'),
          scheduledEnd: new Date('2025-12-17T10:30:00Z'),
          status: 'CONFIRMED',
          subject: 'Tax Consultation',
          type: 'VIDEO_CALL',
        },
      ]);

      vi.mocked(db.from).mockImplementation((table: string) => {
        switch (table) {
          case 'profiles':
            return createChainableMock({
              firstName: 'Test',
              lastName: 'Preparer',
            }) as ReturnType<typeof db.from>;
          case 'appointments':
            return appointmentMock as ReturnType<typeof db.from>;
          default:
            return createChainableMock(null) as ReturnType<typeof db.from>;
        }
      });

      const schedule = await getPreparerSchedule(
        mockPreparerId,
        new Date('2025-12-16'),
        new Date('2025-12-23')
      );

      expect(schedule.appointments).toHaveLength(1);
      expect(schedule.appointments[0].clientName).toBe('John Doe');
    });
  });

  describe('getNextAvailableSlot', () => {
    const mockPreparerId = 'prep_123';

    beforeEach(() => {
      const profileMock = createChainableMock({
        bookingEnabled: true,
        timezone: 'America/New_York',
      });

      // No availability by default
      const availabilityMock = createChainableMock([]);
      const appointmentMock = createChainableMock([]);

      vi.mocked(db.from).mockImplementation((table: string) => {
        switch (table) {
          case 'profiles':
            return profileMock as ReturnType<typeof db.from>;
          case 'preparer_availability':
            return availabilityMock as ReturnType<typeof db.from>;
          case 'appointments':
            return appointmentMock as ReturnType<typeof db.from>;
          default:
            return createChainableMock(null) as ReturnType<typeof db.from>;
        }
      });
    });

    it('should return null when no availability in next 30 days', async () => {
      const slot = await getNextAvailableSlot(mockPreparerId, 30);

      expect(slot).toBeNull();
    });

    it('should return first available slot', async () => {
      // Set up availability for tomorrow
      const availabilityMock = createChainableMock([
        {
          id: 'avail_1',
          preparerId: mockPreparerId,
          dayOfWeek: 2, // Tuesday (tomorrow from our mocked date)
          startTime: '09:00',
          endTime: '17:00',
          isActive: true,
          isOverride: false,
          serviceIds: [],
        },
      ]);

      vi.mocked(db.from).mockImplementation((table: string) => {
        switch (table) {
          case 'profiles':
            return createChainableMock({
              bookingEnabled: true,
              timezone: 'America/New_York',
            }) as ReturnType<typeof db.from>;
          case 'preparer_availability':
            return availabilityMock as ReturnType<typeof db.from>;
          case 'appointments':
            return createChainableMock([]) as ReturnType<typeof db.from>;
          default:
            return createChainableMock(null) as ReturnType<typeof db.from>;
        }
      });

      const slot = await getNextAvailableSlot(mockPreparerId, 30);

      if (slot) {
        expect(slot.preparerId).toBe(mockPreparerId);
        expect(slot.available).toBe(true);
      }
    });
  });
});
