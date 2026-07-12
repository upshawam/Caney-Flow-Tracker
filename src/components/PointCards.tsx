import type { PointForecast } from '../lib/flowEngine';
import type { UsgsStationReading } from '../lib/usgs';
import { Badge } from './Badge';

type PointCardsProps = {
  pointForecasts: PointForecast[];
  liveStations: Record<string, UsgsStationReading | undefined>;
  selectedPointName: string;
  onSelectPoint: (pointName: string) => void;
};

export function PointCards({ pointForecasts, liveStations, selectedPointName, onSelectPoint }: PointCardsProps) {
  return (
    <div className="cards">
      {pointForecasts.map((forecast) => {
        const point = forecast.point;
        const isSelected = point.name === selectedPointName;
        const liveStation = liveStations[point.name];

        return (
          <button
            key={`${point.name}-${point.mileMarker}`}
            type="button"
            className={`point-card point-card--button ${isSelected ? 'point-card--selected' : ''}`}
            onClick={() => onSelectPoint(point.name)}
          >
            <div className="point-card__top">
              <div>
                <h3>{point.name}</h3>
                <p>{point.bank ? `${point.bank} bank · ` : ''}{point.mileMarker.toFixed(2)} mi from dam</p>
              </div>
              <Badge tone={forecast.current.statusTone}>
                {isSelected ? 'Selected' : forecast.current.generators === 0 ? '0 Gen' : `${forecast.current.generators} Gen`}
              </Badge>
            </div>

            <p className="point-card__body">
              {forecast.current.wadingSafety}
            </p>

            <p className="point-card__note">{forecast.current.nextChangeLabel}</p>
            <p className="point-card__note">
              {liveStation?.dischargeCfs != null
                ? `${liveStation.shortLabel} live: ${liveStation.dischargeCfs.toLocaleString()} CFS · ${liveStation.gaugeHeightFt?.toFixed(2) ?? '--'} ft`
                : 'Live USGS reading unavailable'}
            </p>
          </button>
        );
      })}
    </div>
  );
}