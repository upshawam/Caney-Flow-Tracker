import { describe, expect, it } from 'vitest';
import { buildScheduleBlocks, mapCenterHillValueToGenerators, parsePrescheduleHtml } from './scrapeSchedule.mjs';

describe('scrapeSchedule', () => {
  it('maps raw Center Hill values to generator states', () => {
    expect(mapCenterHillValueToGenerators(0)).toBe(0);
    expect(mapCenterHillValueToGenerators(45)).toBe(1);
    expect(mapCenterHillValueToGenerators(90)).toBe(2);
    expect(mapCenterHillValueToGenerators(135)).toBe(2);
  });

  it('merges adjacent hourly values into contiguous schedule blocks', () => {
    expect(
      buildScheduleBlocks([
        { hour: 1, rawValue: 0, generators: 0 },
        { hour: 2, rawValue: 0, generators: 0 },
        { hour: 3, rawValue: 45, generators: 1 },
        { hour: 4, rawValue: 90, generators: 2 },
      ]),
    ).toEqual([
      { start: '12:00 AM', end: '2:00 AM', generators: 0, label: 'Low & Slow' },
      { start: '2:00 AM', end: '3:00 AM', generators: 1, label: 'Optimal Cruise' },
      { start: '3:00 AM', end: '4:00 AM', generators: 2, label: 'Swift Current' },
    ]);
  });

  it('parses the first Center Hill schedule from the page pre block', () => {
    const html = `
      <html><body><pre>
GENERATION PRESCHEDULE      31JAN2024     TVA RIVER SCHEDULING
HR       WOL    DAL    COR    CEN    OLD    JPP    CHE    BAR
 1         0      0      0      0     25     30     24     63
 2        40      0      0     45     50     30     24     63
 3        40      0      0     90     50     30     24     63
 4        40      0      0    135     50     30     24     63
 5         0      0      0      0     25     30     24     63
 6         0      0      0      0     25     30     24     63
 7         0      0      0      0     25     30     24     63
 8         0      0      0      0     25     30     24     63
 9         0      0      0      0     25     30     24     63
10         0      0      0      0     25     30     24     63
11         0      0      0      0     25     30     24     63
12         0      0      0      0     25     30     24     63
13         0      0      0      0     25     30     24     63
14         0      0      0      0     25     30     24     63
15         0      0      0      0     25     30     24     63
16         0      0      0      0     25     30     24     63
17         0      0      0      0     25     30     24     63
18         0      0      0      0     25     30     24     63
19         0      0      0      0     25     30     24     63
20         0      0      0      0     25     30     24     63
21         0      0      0      0     25     30     24     63
22         0      0      0      0     25     30     24     63
23         0      0      0      0     25     30     24     63
24         0      0      0      0     25     30     24     63
TOTAL     80      0      0    270    975    720    660   1512
______________________________________________________________
REPORT GENERATED: 31JAN2024 1130 (LOCAL TZ)
      </pre></body></html>`;

    const parsed = parsePrescheduleHtml(html);

    expect(parsed.reportDate).toBe('31JAN2024');
    expect(parsed.reportGeneratedAt).toBe('31JAN2024 1130 (LOCAL TZ)');
    expect(parsed.hourly[1]).toEqual({ hour: 2, rawValue: 45, generators: 1 });
    expect(parsed.blocks.slice(0, 4)).toEqual([
      { start: '12:00 AM', end: '1:00 AM', generators: 0, label: 'Low & Slow' },
      { start: '1:00 AM', end: '2:00 AM', generators: 1, label: 'Optimal Cruise' },
      { start: '2:00 AM', end: '4:00 AM', generators: 2, label: 'Swift Current' },
      { start: '4:00 AM', end: '12:00 AM', generators: 0, label: 'Low & Slow' },
    ]);
  });
});