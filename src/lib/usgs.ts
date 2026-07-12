import type { RiverPoint } from '../data/riverPoints';

export const USGS_STATIONS = [
  {
    id: '03426310',
    shortLabel: 'Carthage',
    displayName: 'USGS Near Carthage, TN',
  },
  {
    id: '03426250',
    shortLabel: 'Elmwood',
    displayName: 'USGS at Elmwood, TN',
  },
] as const;

export type UsgsStationId = (typeof USGS_STATIONS)[number]['id'];

export type UsgsStationReading = {
  stationId: UsgsStationId;
  shortLabel: string;
  displayName: string;
  siteName: string;
  dischargeCfs: number | null;
  gaugeHeightFt: number | null;
  observedAt: string | null;
};

export type UsgsSnapshot = {
  stations: UsgsStationReading[];
  fetchedAt: string;
};

type UsgsValue = {
  value?: string;
  dateTime?: string;
};

type UsgsSeries = {
  sourceInfo?: {
    siteName?: string;
    siteCode?: Array<{ value?: string }>;
  };
  variable?: {
    variableCode?: Array<{ value?: string }>;
  };
  values?: Array<{
    value?: UsgsValue[];
  }>;
};

type UsgsResponse = {
  value?: {
    queryInfo?: {
      note?: Array<{ title?: string; value?: string }>;
    };
    timeSeries?: UsgsSeries[];
  };
};

const DISCHARGE_CODE = '00060';
const GAGE_CODE = '00065';

export function buildUsgsUrl() {
  return 'https://waterservices.usgs.gov/nwis/iv/?format=json&sites=03426310,03426250&parameterCd=00060,00065&siteStatus=all';
}

function parseNumber(value?: string) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getStationForPoint(point: RiverPoint): UsgsStationId {
  return point.mileMarker >= 18.5 ? '03426310' : '03426250';
}

export function formatObservedAt(value: string | null) {
  if (!value) {
    return 'Unavailable';
  }

  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function parseUsgsResponse(response: UsgsResponse): UsgsSnapshot {
  const grouped = new Map<string, Partial<UsgsStationReading>>();
  const timeSeries = response.value?.timeSeries ?? [];

  for (const series of timeSeries) {
    const siteCode = series.sourceInfo?.siteCode?.[0]?.value;
    const variableCode = series.variable?.variableCode?.[0]?.value;
    const latestValue = series.values?.[0]?.value?.at(-1);

    if (!siteCode || !variableCode || !latestValue) {
      continue;
    }

    const stationMeta = USGS_STATIONS.find((station) => station.id === siteCode);

    if (!stationMeta) {
      continue;
    }

    const existing = grouped.get(siteCode) ?? {
      stationId: stationMeta.id,
      shortLabel: stationMeta.shortLabel,
      displayName: stationMeta.displayName,
      siteName: series.sourceInfo?.siteName ?? stationMeta.displayName,
      dischargeCfs: null,
      gaugeHeightFt: null,
      observedAt: null,
    };

    if (variableCode === DISCHARGE_CODE) {
      existing.dischargeCfs = parseNumber(latestValue.value);
      existing.observedAt = latestValue.dateTime ?? existing.observedAt ?? null;
    }

    if (variableCode === GAGE_CODE) {
      existing.gaugeHeightFt = parseNumber(latestValue.value);
      existing.observedAt = latestValue.dateTime ?? existing.observedAt ?? null;
    }

    grouped.set(siteCode, existing);
  }

  const fetchedAt =
    response.value?.queryInfo?.note?.find((note) => note.title === 'requestDT')?.value ?? new Date().toISOString();

  return {
    fetchedAt,
    stations: USGS_STATIONS.map((station) => {
      const reading = grouped.get(station.id);

      return {
        stationId: station.id,
        shortLabel: station.shortLabel,
        displayName: station.displayName,
        siteName: reading?.siteName ?? station.displayName,
        dischargeCfs: reading?.dischargeCfs ?? null,
        gaugeHeightFt: reading?.gaugeHeightFt ?? null,
        observedAt: reading?.observedAt ?? null,
      };
    }),
  };
}