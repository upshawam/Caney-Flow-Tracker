import { describe, expect, it } from 'vitest';
import { mockSchedule } from '../data/mockSchedule';
import { riverPoints } from '../data/riverPoints';
import { buildPointForecast, formatMinuteLabel, parseTimeLabel } from './flowEngine';

describe('flowEngine', () => {
  it('parses 12-hour clock labels correctly', () => {
    expect(parseTimeLabel('12:00 AM')).toBe(0);
    expect(parseTimeLabel('12:00 PM')).toBe(720);
    expect(parseTimeLabel('4:30 PM')).toBe(16 * 60 + 30);
  });

  it('calculates downstream arrival windows for a point', () => {
    const happyHollow = riverPoints.find((point) => point.name === 'Happy Hollow Boat Ramp');

    if (!happyHollow) {
      throw new Error('Happy Hollow Boat Ramp not found');
    }

    const forecast = buildPointForecast(happyHollow, mockSchedule, parseTimeLabel('2:00 PM'));
    const oneGenWave = forecast.waves.find((wave) => wave.generators === 1);

    expect(oneGenWave).toBeDefined();
    expect(formatMinuteLabel(oneGenWave!.arrivalStartMinute)).toBe('1:16 PM');
    expect(formatMinuteLabel(oneGenWave!.arrivalEndMinute)).toBe('5:16 PM');
  });

  it('handles overlapping waves by favoring the strongest active release', () => {
    const lighthouse = riverPoints.find((point) => point.name === 'Carthage Lighthouse');

    if (!lighthouse) {
      throw new Error('Carthage Lighthouse not found');
    }

    const forecast = buildPointForecast(lighthouse, mockSchedule, parseTimeLabel('9:00 PM'));
    const overlappingInterval = forecast.effectiveIntervals.find(
      (interval) => interval.startMinute <= parseTimeLabel('9:45 PM') && interval.endMinute >= parseTimeLabel('9:45 PM'),
    );

    expect(overlappingInterval?.generators).toBe(2);
    expect(formatMinuteLabel(overlappingInterval!.startMinute)).toBe('9:36 PM');
  });
});