export interface DaySchedule {
  dayKey: string;
  dayLabel: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
}

export interface BookingSettings {
  scheduleType: 'days_only' | 'days_and_times';
  slotDurationMinutes: number;
  allowMultipleBookingsPerCustomer: boolean;
  maxBookingsPerCustomer: number;
  capacityPerSlot: number;
  leadTimeValue: number;
  leadTimeUnit: 'minute' | 'hour' | 'day';
  locationType: 'onsite' | 'online' | 'home_visit';
  locationAddress: string;
  workingDays: DaySchedule[];
  exceptions: string[];
}

export const DEFAULT_DAYS: DaySchedule[] = [
  { dayKey: 'saturday', dayLabel: 'السبت', enabled: true, startTime: '09:00', endTime: '18:00' },
  { dayKey: 'sunday', dayLabel: 'الأحد', enabled: true, startTime: '09:00', endTime: '18:00' },
  { dayKey: 'monday', dayLabel: 'الإثنين', enabled: true, startTime: '09:00', endTime: '18:00' },
  { dayKey: 'tuesday', dayLabel: 'الثلاثاء', enabled: true, startTime: '09:00', endTime: '18:00' },
  {
    dayKey: 'wednesday',
    dayLabel: 'الأربعاء',
    enabled: true,
    startTime: '09:00',
    endTime: '18:00',
  },
  { dayKey: 'thursday', dayLabel: 'الخميس', enabled: true, startTime: '09:00', endTime: '18:00' },
  { dayKey: 'friday', dayLabel: 'الجمعة', enabled: false, startTime: '14:00', endTime: '20:00' },
];
