import type { PointForecast } from '../lib/flowEngine';
import { Badge } from './Badge';

type TimelineMockProps = {
  pointForecasts: PointForecast[];
  hourLabels: string[];
  selectedPointName: string;
};

function getShortPointLabel(name: string): string {
  return name.replace('Recreation Area', '').replace('Boat Ramp', '').replace('Pull-offs', 'Pull-offs');
}

export function TimelineMock({ pointForecasts, hourLabels, selectedPointName }: TimelineMockProps) {
  return (
    <div className="timeline-grid" role="table" aria-label="Projected river flow timeline">
      <div className="timeline-grid__header" role="row">
        <div className="timeline-grid__corner">Point</div>
        {hourLabels.map((hourLabel) => (
          <div key={hourLabel} className="timeline-grid__hour" role="columnheader">
            {hourLabel}
          </div>
        ))}
      </div>

      {pointForecasts.map((forecast) => (
        <div
          key={forecast.point.name}
          className={`timeline-grid__row ${forecast.point.name === selectedPointName ? 'timeline-grid__row--selected' : ''}`}
          role="row"
        >
          <div className="timeline-grid__point" role="rowheader">
            <strong>{getShortPointLabel(forecast.point.name)}</strong>
            <span>{forecast.point.mileMarker.toFixed(1)} mi</span>
          </div>

          {forecast.hourlySlots.map((slot) => (
            <div key={`${forecast.point.name}-${slot.startMinute}`} className="timeline-grid__cell" role="cell">
              <Badge tone={slot.generators === 2 ? 'danger' : slot.generators === 1 ? 'warn' : 'good'}>
                {slot.generators}G
              </Badge>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}