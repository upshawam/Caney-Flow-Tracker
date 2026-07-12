import { describe, expect, it } from 'vitest';
import { getStationForPoint, parseUsgsResponse } from './usgs';

describe('usgs parser', () => {
  it('groups discharge and gauge height by station', () => {
    const snapshot = parseUsgsResponse({
      value: {
        queryInfo: {
          note: [{ title: 'requestDT', value: '2026-07-12T21:58:39.554Z' }],
        },
        timeSeries: [
          {
            sourceInfo: { siteName: 'Caney Fork Near Carthage', siteCode: [{ value: '03426310' }] },
            variable: { variableCode: [{ value: '00060' }] },
            values: [{ value: [{ value: '5420', dateTime: '2026-07-12T16:45:00.000-05:00' }] }],
          },
          {
            sourceInfo: { siteName: 'Caney Fork Near Carthage', siteCode: [{ value: '03426310' }] },
            variable: { variableCode: [{ value: '00065' }] },
            values: [{ value: [{ value: '11.42', dateTime: '2026-07-12T16:45:00.000-05:00' }] }],
          },
          {
            sourceInfo: { siteName: 'Caney Fork at Elmwood', siteCode: [{ value: '03426250' }] },
            variable: { variableCode: [{ value: '00060' }] },
            values: [{ value: [{ value: '1380', dateTime: '2026-07-12T16:30:00.000-05:00' }] }],
          },
        ],
      },
    });

    const carthage = snapshot.stations.find((station) => station.stationId === '03426310');
    const elmwood = snapshot.stations.find((station) => station.stationId === '03426250');

    expect(snapshot.fetchedAt).toBe('2026-07-12T21:58:39.554Z');
    expect(carthage?.dischargeCfs).toBe(5420);
    expect(carthage?.gaugeHeightFt).toBe(11.42);
    expect(elmwood?.dischargeCfs).toBe(1380);
    expect(elmwood?.gaugeHeightFt).toBeNull();
  });

  it('maps upstream and downstream points to the correct station', () => {
    expect(getStationForPoint({ name: 'Happy Hollow Boat Ramp', mileMarker: 3.5 })).toBe('03426250');
    expect(getStationForPoint({ name: 'South Carthage Ag Center', mileMarker: 18.5 })).toBe('03426310');
  });
});