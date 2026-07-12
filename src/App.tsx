import { useEffect, useMemo, useState } from 'react';
import { Badge } from './components/Badge';
import { PointCards } from './components/PointCards';
import { SectionCard } from './components/SectionCard';
import { TimelineMock } from './components/TimelineMock';
import { mockScheduleDataset, type ScheduleDataset } from './data/mockSchedule';
import { riverPoints } from './data/riverPoints';
import { buildRiverForecast } from './lib/flowEngine';
import { buildUsgsUrl, formatObservedAt, getStationForPoint, parseUsgsResponse, type UsgsSnapshot } from './lib/usgs';

function getReferenceMinute() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function App() {
  const [selectedPointName, setSelectedPointName] = useState(riverPoints[3].name);
  const [scheduleData, setScheduleData] = useState<{
    status: 'loading' | 'success' | 'error';
    dataset: ScheduleDataset;
    error: string | null;
  }>({
    status: 'loading',
    dataset: mockScheduleDataset,
    error: null,
  });
  const [liveData, setLiveData] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    snapshot: UsgsSnapshot | null;
    error: string | null;
  }>({
    status: 'loading',
    snapshot: null,
    error: null,
  });
  const forecast = useMemo(
    () => buildRiverForecast(riverPoints, scheduleData.dataset.blocks, getReferenceMinute(), 12),
    [scheduleData.dataset.blocks],
  );

  useEffect(() => {
    let isActive = true;

    async function loadScheduleData() {
      try {
        const response = await fetch('/data/schedule.json', { cache: 'no-store' });

        if (!response.ok) {
          throw new Error(`Schedule request failed with ${response.status}`);
        }

        const dataset = (await response.json()) as ScheduleDataset;

        if (!isActive) {
          return;
        }

        setScheduleData({
          status: 'success',
          dataset,
          error: null,
        });
      } catch (error) {
        if (!isActive) {
          return;
        }

        setScheduleData({
          status: 'error',
          dataset: mockScheduleDataset,
          error: error instanceof Error ? error.message : 'Unable to load generated schedule data',
        });
      }
    }

    void loadScheduleData();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadLiveData() {
      try {
        const response = await fetch(buildUsgsUrl());

        if (!response.ok) {
          throw new Error(`USGS request failed with ${response.status}`);
        }

        const json = await response.json();
        const snapshot = parseUsgsResponse(json);

        if (!isActive) {
          return;
        }

        setLiveData({ status: 'success', snapshot, error: null });
      } catch (error) {
        if (!isActive) {
          return;
        }

        setLiveData({
          status: 'error',
          snapshot: null,
          error: error instanceof Error ? error.message : 'Unable to load live USGS data',
        });
      }
    }

    void loadLiveData();

    return () => {
      isActive = false;
    };
  }, []);

  const selectedPoint = useMemo(
    () => forecast.pointForecasts.find((pointForecast) => pointForecast.point.name === selectedPointName) ?? forecast.pointForecasts[0],
    [forecast.pointForecasts, selectedPointName],
  );

  const stationsById = useMemo(
    () =>
      Object.fromEntries((liveData.snapshot?.stations ?? []).map((station) => [station.stationId, station])) as Record<
        string,
        UsgsSnapshot['stations'][number] | undefined
      >,
    [liveData.snapshot],
  );

  const liveStationsByPoint = useMemo(
    () =>
      Object.fromEntries(
        forecast.pointForecasts.map((pointForecast) => [
          pointForecast.point.name,
          stationsById[getStationForPoint(pointForecast.point)],
        ]),
      ) as Record<string, UsgsSnapshot['stations'][number] | undefined>,
    [forecast.pointForecasts, stationsById],
  );

  const selectedStation = liveStationsByPoint[selectedPoint.point.name];

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="eyebrow">Caney Fork River</p>
        <h1>Caney Flow Tracker</h1>
        <p className="hero__copy">
          Mobile-first river intel for boat ramps, wading decisions, and quick pre-trip planning.
        </p>

        <div className="hero__badges">
          <Badge tone={scheduleData.dataset.source === 'usace' ? 'good' : scheduleData.status === 'error' ? 'warn' : 'neutral'}>
            {scheduleData.dataset.source === 'usace'
              ? 'USACE schedule loaded'
              : scheduleData.status === 'loading'
                ? 'Schedule loading'
                : 'Mock schedule fallback'}
          </Badge>
          <Badge tone="neutral">Schedule updated: {scheduleData.dataset.updatedAt}</Badge>
          <Badge tone={liveData.status === 'error' ? 'danger' : liveData.status === 'success' ? 'good' : 'warn'}>
            {liveData.status === 'success'
              ? `Live USGS updated: ${formatObservedAt(liveData.snapshot?.fetchedAt ?? null)}`
              : liveData.status === 'error'
                ? 'Live USGS unavailable'
                : 'Live USGS loading'}
          </Badge>
        </div>

        <div className="live-strip">
          {(liveData.snapshot?.stations ?? []).map((station) => (
            <div key={station.stationId} className="live-strip__card">
              <p className="status-box__label">{station.shortLabel}</p>
              <strong>
                {station.dischargeCfs != null ? `${station.dischargeCfs.toLocaleString()} CFS` : 'No flow data'}
              </strong>
              <span>
                {station.gaugeHeightFt != null ? `${station.gaugeHeightFt.toFixed(2)} ft gauge` : 'Gauge unavailable'}
              </span>
            </div>
          ))}
        </div>
      </header>

      <SectionCard title="Flow Timeline" eyebrow="Phase 3 live + predicted view">
        <div className="status-grid">
          <div className="status-box">
            <p className="status-box__label">Selected access point</p>
            <strong>{selectedPoint.point.name}</strong>
            <span>{selectedPoint.point.mileMarker.toFixed(2)} miles from Center Hill Dam</span>
          </div>
          <div className="status-box">
            <p className="status-box__label">Wading safety</p>
            <strong>{selectedPoint.current.wadingSafety}</strong>
            <span>{selectedPoint.current.paddlingProfile}</span>
          </div>
          <div className="status-box">
            <p className="status-box__label">Preschedule source</p>
            <strong>{scheduleData.dataset.source === 'usace' ? 'Center Hill preschedule' : 'Local mock fallback'}</strong>
            <span>{scheduleData.error ?? scheduleData.dataset.reportGeneratedAt ?? 'Static schedule file loaded from /data/schedule.json'}</span>
          </div>
          <div className="status-box">
            <p className="status-box__label">Live verified flow</p>
            <strong>
              {selectedStation?.dischargeCfs != null
                ? `${selectedStation.dischargeCfs.toLocaleString()} CFS`
                : liveData.status === 'error'
                  ? 'Unavailable'
                  : 'Loading'}
            </strong>
            <span>
              {selectedStation?.gaugeHeightFt != null
                ? `${selectedStation.gaugeHeightFt.toFixed(2)} ft at ${selectedStation.shortLabel}`
                : liveData.error ?? 'Waiting for gauge height'}
            </span>
          </div>
        </div>

        <TimelineMock
          pointForecasts={forecast.pointForecasts}
          hourLabels={forecast.hourLabels}
          selectedPointName={selectedPointName}
        />
      </SectionCard>

      <SectionCard title="Point Status Cards" eyebrow="Phase 3 computed + live status">
        <div className="detail-panel">
          <div className="detail-panel__header">
            <div>
              <p className="status-box__label">Active detail card</p>
              <h3>{selectedPoint.point.name}</h3>
            </div>
            <Badge tone={selectedPoint.current.statusTone}>
              {selectedPoint.current.wadingSafety.split('·')[0].trim()}
            </Badge>
          </div>

          <p className="detail-panel__body">
            {selectedPoint.point.name === 'Carthage Lighthouse'
              ? 'Back-up from the Cumberland can stack on top of release waves here, so use extra caution at the final ramp.'
              : `Computed travel windows are based on ${selectedPoint.point.mileMarker.toFixed(2)} river miles from Center Hill Dam.`}
          </p>

          <div className="detail-panel__chips">
            <Badge tone={selectedPoint.current.statusTone}>{selectedPoint.current.wadingSafety}</Badge>
            <Badge tone="neutral">{selectedPoint.current.paddlingProfile}</Badge>
            <Badge tone="warn">52–55°F water warning</Badge>
          </div>

          <p className="detail-panel__compare">
            {selectedStation?.dischargeCfs != null
              ? `Predicted state is paired with ${selectedStation.shortLabel} live flow at ${selectedStation.dischargeCfs.toLocaleString()} CFS and ${selectedStation.gaugeHeightFt?.toFixed(2) ?? '--'} ft. ${selectedPoint.current.nextChangeLabel}.`
              : `${selectedPoint.current.nextChangeLabel}. Live USGS verification is currently unavailable.`}
          </p>

          <p className="point-card__note">
            {scheduleData.dataset.source === 'usace'
              ? `Preschedule report: ${scheduleData.dataset.reportGeneratedAt ?? 'Timestamp unavailable'}`
              : 'Using bundled mock schedule until `/data/schedule.json` is available.'}
          </p>

          <div className="transition-list">
            {selectedPoint.nextTransitions.map((transition) => (
              <div key={`${selectedPoint.point.name}-${transition.atMinute}`} className="transition-list__item">
                <span>{transition.label}</span>
                <Badge tone={transition.generators === 2 ? 'danger' : transition.generators === 1 ? 'warn' : 'good'}>
                  {transition.generators} Gen
                </Badge>
              </div>
            ))}
          </div>

          {selectedPoint.point.note ? <p className="point-card__note">{selectedPoint.point.note}</p> : null}
        </div>

        <PointCards
          pointForecasts={forecast.pointForecasts}
          liveStations={liveStationsByPoint}
          selectedPointName={selectedPointName}
          onSelectPoint={(pointName) => setSelectedPointName(pointName)}
        />
      </SectionCard>
    </main>
  );
}

export default App;