export type ScheduleBlock = {
  start: string;
  end: string;
  generators: 0 | 1 | 2;
  label: string;
};

export type ScheduleHour = {
  hour: number;
  rawValue: number;
  generators: 0 | 1 | 2;
};

export type ScheduleDataset = {
  source: 'mock' | 'usace';
  updatedAt: string;
  reportGeneratedAt?: string;
  reportDate?: string;
  blocks: ScheduleBlock[];
  hourly?: ScheduleHour[];
};

export const mockSchedule: ScheduleBlock[] = [
  { start: '12:00 AM', end: '12:00 PM', generators: 0, label: 'Low & Slow' },
  { start: '12:00 PM', end: '4:00 PM', generators: 1, label: 'Optimal Cruise' },
  { start: '4:00 PM', end: '6:00 PM', generators: 2, label: 'Swift Current' },
  { start: '6:00 PM', end: '12:00 AM', generators: 0, label: 'Drain Down' },
];

export const scheduleUpdatedAt = '2026-07-12 05:00 AM CDT';

export const mockScheduleDataset: ScheduleDataset = {
  source: 'mock',
  updatedAt: scheduleUpdatedAt,
  blocks: mockSchedule,
};