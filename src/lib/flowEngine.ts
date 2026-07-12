import type { RiverPoint } from '../data/riverPoints';
import type { ScheduleBlock } from '../data/mockSchedule';

export type GeneratorCount = 0 | 1 | 2;

export type NormalizedScheduleBlock = ScheduleBlock & {
  startMinute: number;
  endMinute: number;
};

export type PropagatedWave = {
  generators: GeneratorCount;
  label: string;
  damStartMinute: number;
  damEndMinute: number;
  arrivalStartMinute: number;
  arrivalEndMinute: number;
  travelMinutes: number;
};

export type FlowInterval = {
  startMinute: number;
  endMinute: number;
  generators: GeneratorCount;
};

export type ForecastHour = {
  label: string;
  startMinute: number;
  generators: GeneratorCount;
};

export type PointTransition = {
  atMinute: number;
  label: string;
  generators: GeneratorCount;
};

export type PointCurrentStatus = {
  generators: GeneratorCount;
  statusTone: 'good' | 'warn' | 'danger' | 'neutral';
  wadingSafety: string;
  paddlingProfile: string;
  nextChangeLabel: string;
};

export type PointForecast = {
  point: RiverPoint;
  waves: PropagatedWave[];
  effectiveIntervals: FlowInterval[];
  hourlySlots: ForecastHour[];
  current: PointCurrentStatus;
  nextTransitions: PointTransition[];
};

export type RiverForecast = {
  referenceMinute: number;
  hourLabels: string[];
  pointForecasts: PointForecast[];
};

const SPEED_BY_GENERATOR: Record<GeneratorCount, number> = {
  0: 1.5,
  1: 2.75,
  2: 3.75,
};

const MINUTES_IN_DAY = 24 * 60;

export function parseTimeLabel(label: string): number {
  const match = label.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!match) {
    throw new Error(`Unsupported time label: ${label}`);
  }

  const [, rawHour, rawMinute, meridiem] = match;
  const minute = Number(rawMinute);
  const hour12 = Number(rawHour) % 12;
  const hour24 = meridiem.toUpperCase() === 'PM' ? hour12 + 12 : hour12;

  return hour24 * 60 + minute;
}

export function formatMinuteLabel(totalMinutes: number): string {
  const wrappedMinutes = ((Math.round(totalMinutes) % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
  const dayOffset = Math.floor(totalMinutes / MINUTES_IN_DAY);
  const hour24 = Math.floor(wrappedMinutes / 60);
  const minute = wrappedMinutes % 60;
  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const minuteText = String(minute).padStart(2, '0');
  const dayText = dayOffset > 0 ? ` +${dayOffset}d` : '';

  return `${hour12}:${minuteText} ${suffix}${dayText}`;
}

export function normalizeSchedule(schedule: ScheduleBlock[]): NormalizedScheduleBlock[] {
  return schedule.map((block) => {
    const startMinute = parseTimeLabel(block.start);
    const rawEndMinute = parseTimeLabel(block.end);
    const endMinute = rawEndMinute <= startMinute ? rawEndMinute + MINUTES_IN_DAY : rawEndMinute;

    return {
      ...block,
      startMinute,
      endMinute,
    };
  });
}

function getTravelMinutes(distanceMiles: number, generators: GeneratorCount): number {
  return (distanceMiles / SPEED_BY_GENERATOR[generators]) * 60;
}

function getDominantGeneratorAtMinute(intervals: FlowInterval[], minute: number): GeneratorCount {
  return intervals.find((interval) => minute >= interval.startMinute && minute < interval.endMinute)?.generators ?? 0;
}

function buildEffectiveIntervals(waves: PropagatedWave[], horizonMinute: number): FlowInterval[] {
  const boundaries = new Set<number>([0, horizonMinute]);

  waves.forEach((wave) => {
    boundaries.add(Math.max(0, Math.min(horizonMinute, wave.arrivalStartMinute)));
    boundaries.add(Math.max(0, Math.min(horizonMinute, wave.arrivalEndMinute)));
  });

  const sorted = [...boundaries].sort((left, right) => left - right);
  const intervals: FlowInterval[] = [];

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const startMinute = sorted[index];
    const endMinute = sorted[index + 1];

    if (endMinute <= startMinute) {
      continue;
    }

    const midpoint = startMinute + (endMinute - startMinute) / 2;
    const activeGenerators = waves
      .filter((wave) => midpoint >= wave.arrivalStartMinute && midpoint < wave.arrivalEndMinute)
      .map((wave) => wave.generators);

    const generators = activeGenerators.length > 0 ? (Math.max(...activeGenerators) as GeneratorCount) : 0;
    const previous = intervals.at(-1);

    if (previous && previous.generators === generators) {
      previous.endMinute = endMinute;
      continue;
    }

    intervals.push({ startMinute, endMinute, generators });
  }

  return intervals;
}

function buildPaddlingProfile(generators: GeneratorCount): string {
  if (generators === 2) {
    return '2 Gen · Swift Current · advanced paddlers only';
  }

  if (generators === 1) {
    return '1 Gen · Optimal Cruise · fast moving and trackable';
  }

  return '0 Gen · Low & Slow · expect shallow shoals and dragging';
}

function buildCurrentStatus(
  intervals: FlowInterval[],
  referenceMinute: number,
): PointCurrentStatus {
  const currentInterval = intervals.find(
    (interval) => referenceMinute >= interval.startMinute && referenceMinute < interval.endMinute,
  ) ?? { startMinute: referenceMinute, endMinute: referenceMinute + 60, generators: 0 as GeneratorCount };

  const previousIntervalIndex = intervals.findIndex((interval) => interval === currentInterval) - 1;
  const previousInterval = previousIntervalIndex >= 0 ? intervals[previousIntervalIndex] : undefined;
  const nextInterval = intervals.find((interval) => interval.startMinute >= currentInterval.endMinute);
  const nearBoundary =
    Math.abs(referenceMinute - currentInterval.startMinute) <= 60 ||
    Math.abs(currentInterval.endMinute - referenceMinute) <= 60;
  const transitioning =
    currentInterval.generators === 0 &&
    nearBoundary &&
    [previousInterval?.generators, nextInterval?.generators].some((value) => typeof value === 'number' && value > 0);

  if (currentInterval.generators > 0) {
    return {
      generators: currentInterval.generators,
      statusTone: 'danger',
      wadingSafety: `Red · Dangerous / Active ${currentInterval.generators} Gen flow`,
      paddlingProfile: buildPaddlingProfile(currentInterval.generators),
      nextChangeLabel: nextInterval
        ? `Next change around ${formatMinuteLabel(nextInterval.startMinute)}`
        : 'No additional changes in the current forecast window',
    };
  }

  if (transitioning) {
    return {
      generators: 0,
      statusTone: 'warn',
      wadingSafety: 'Yellow · Caution / Water rising or falling',
      paddlingProfile: 'Transition Zone · watch for moving edges and changing shoals',
      nextChangeLabel: nextInterval
        ? `Next change around ${formatMinuteLabel(nextInterval.startMinute)}`
        : 'Recent release still moving through downstream sections',
    };
  }

  return {
    generators: 0,
    statusTone: 'good',
    wadingSafety: 'Green · Safe / Sustained 0 Gen',
    paddlingProfile: buildPaddlingProfile(0),
    nextChangeLabel: nextInterval
      ? `Next change around ${formatMinuteLabel(nextInterval.startMinute)}`
      : 'No changes in the current forecast window',
  };
}

export function buildPointForecast(
  point: RiverPoint,
  schedule: ScheduleBlock[],
  referenceMinute: number,
  horizonHours = 36,
  timelineHours = 12,
): PointForecast {
  const normalizedSchedule = normalizeSchedule(schedule);
  const horizonMinute = Math.max(referenceMinute + timelineHours * 60, horizonHours * 60);
  const waves = normalizedSchedule.map((block) => {
    const travelMinutes = getTravelMinutes(point.mileMarker, block.generators);

    return {
      generators: block.generators,
      label: block.label,
      damStartMinute: block.startMinute,
      damEndMinute: block.endMinute,
      arrivalStartMinute: block.startMinute + travelMinutes,
      arrivalEndMinute: block.endMinute + travelMinutes,
      travelMinutes,
    };
  });

  const effectiveIntervals = buildEffectiveIntervals(waves, horizonMinute);
  const projectionStartMinute = Math.floor(referenceMinute / 60) * 60;
  const hourlySlots = Array.from({ length: timelineHours }, (_, index) => {
    const startMinute = projectionStartMinute + index * 60;
    const midpoint = startMinute + 30;

    return {
      label: formatMinuteLabel(startMinute),
      startMinute,
      generators: getDominantGeneratorAtMinute(effectiveIntervals, midpoint),
    };
  });

  const current = buildCurrentStatus(effectiveIntervals, referenceMinute);
  const nextTransitions = effectiveIntervals
    .filter((interval) => interval.startMinute > referenceMinute)
    .slice(0, 4)
    .map((interval) => ({
      atMinute: interval.startMinute,
      label: formatMinuteLabel(interval.startMinute),
      generators: interval.generators,
    }));

  return {
    point,
    waves,
    effectiveIntervals,
    hourlySlots,
    current,
    nextTransitions,
  };
}

export function buildRiverForecast(
  points: RiverPoint[],
  schedule: ScheduleBlock[],
  referenceMinute: number,
  timelineHours = 12,
): RiverForecast {
  const pointForecasts = points.map((point) => buildPointForecast(point, schedule, referenceMinute, 36, timelineHours));
  const hourLabels = pointForecasts[0]?.hourlySlots.map((slot) => slot.label) ?? [];

  return {
    referenceMinute,
    hourLabels,
    pointForecasts,
  };
}
