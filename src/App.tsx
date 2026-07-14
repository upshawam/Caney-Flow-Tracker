import { useEffect, useMemo, useState } from 'react';
import { Badge } from './components/Badge';
import { TimelineMock } from './components/TimelineMock';
import { mockScheduleDataset, type ScheduleDataset } from './data/mockSchedule';
import { riverPoints } from './data/riverPoints';
import { buildRiverForecast, formatMinuteLabel } from './lib/flowEngine';

const SLIDER_HOURS = 12;

function getNowMinute() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function offsetLabel(offsetHours: number): string {
  if (offsetHours === 0) return 'Now';
  const sign = offsetHours > 0 ? '+' : '';
  return `${sign}${offsetHours}h`;
}

function getScheduleFreshnessLabel(dataset: ScheduleDataset): string | null {
  if (dataset.reportGeneratedAt) {
    return `USACE report: ${dataset.reportGeneratedAt}`;
  }

  if (dataset.updatedAt) {
    return `Updated: ${dataset.updatedAt}`;
  }

  return null;
}

function App() {
  const [scheduleData, setScheduleData] = useState<{
    status: 'loading' | 'success' | 'error';
    dataset: ScheduleDataset;
  }>({ status: 'loading', dataset: mockScheduleDataset });

  // offset in whole hours; negative = past, positive = future
  const [offsetHours, setOffsetHours] = useState(0);

  useEffect(() => {
    let isActive = true;

    async function loadScheduleData() {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}data/schedule.json`, { cache: 'no-store' });
        if (!response.ok) throw new Error(`${response.status}`);
        const dataset = (await response.json()) as ScheduleDataset;
        if (isActive) setScheduleData({ status: 'success', dataset });
      } catch {
        if (isActive) setScheduleData({ status: 'error', dataset: mockScheduleDataset });
      }
    }

    void loadScheduleData();
    return () => { isActive = false; };
  }, []);

  const referenceMinute = useMemo(
    () => getNowMinute() + offsetHours * 60,
    [offsetHours],
  );

  const forecast = useMemo(
    () => buildRiverForecast(riverPoints, scheduleData.dataset.blocks, referenceMinute, 12),
    [scheduleData.dataset.blocks, referenceMinute],
  );

  const viewingLabel = useMemo(() => {
    if (offsetHours === 0) return 'Now';
    return `${offsetHours > 0 ? '+' : ''}${offsetHours}h · ${formatMinuteLabel(referenceMinute)}`;
  }, [offsetHours, referenceMinute]);

  const scheduleStatusTone = scheduleData.dataset.source === 'usace' ? 'good' : scheduleData.status === 'error' ? 'warn' : 'neutral';
  const scheduleStatusLabel = scheduleData.dataset.source === 'usace'
    ? 'Live schedule'
    : scheduleData.status === 'loading'
      ? 'Loading…'
      : 'Mock fallback';
  const scheduleFreshnessLabel = getScheduleFreshnessLabel(scheduleData.dataset);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="app-header__title">
          <p className="eyebrow">Caney Fork River</p>
          <h1>Flow Tracker</h1>
        </div>
        <Badge tone={scheduleStatusTone}>{scheduleStatusLabel}</Badge>
      </header>

      <div className="slider-bar">
        <button
          type="button"
          className="slider-bar__step"
          aria-label="One hour back"
          disabled={offsetHours <= -SLIDER_HOURS}
          onClick={() => setOffsetHours((h) => Math.max(-SLIDER_HOURS, h - 1))}
        >
          ‹
        </button>

        <div className="slider-bar__track">
          <input
            type="range"
            min={-SLIDER_HOURS}
            max={SLIDER_HOURS}
            step={1}
            value={offsetHours}
            aria-label="Time offset slider"
            onChange={(e) => setOffsetHours(Number(e.target.value))}
          />
          <div className="slider-bar__ticks">
            {Array.from({ length: SLIDER_HOURS * 2 + 1 }, (_, i) => i - SLIDER_HOURS).map((h) => (
              <span
                key={h}
                className={`slider-bar__tick${h === 0 ? ' slider-bar__tick--now' : ''}`}
              >
                {h % 4 === 0 ? offsetLabel(h) : ''}
              </span>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="slider-bar__step"
          aria-label="One hour forward"
          disabled={offsetHours >= SLIDER_HOURS}
          onClick={() => setOffsetHours((h) => Math.min(SLIDER_HOURS, h + 1))}
        >
          ›
        </button>
      </div>

      <div className="viewing-label">
        <span>Viewing: <strong>{viewingLabel}</strong></span>
        <span className="viewing-label__meta">Forecast reflects propagated dam release travel time at each point</span>
        {scheduleFreshnessLabel && <span className="viewing-label__meta">{scheduleFreshnessLabel}</span>}
        {offsetHours !== 0 && (
          <button type="button" className="viewing-label__reset" onClick={() => setOffsetHours(0)}>
            Back to now
          </button>
        )}
      </div>

      <TimelineMock
        pointForecasts={forecast.pointForecasts}
        hourLabels={forecast.hourLabels}
        selectedPointName=""
      />
    </main>
  );
}

export default App;