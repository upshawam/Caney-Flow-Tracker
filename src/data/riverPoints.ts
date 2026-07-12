export type RiverPoint = {
  name: string;
  mileMarker: number;
  bank?: 'Left' | 'Right' | 'Center';
  note?: string;
};

export const riverPoints: RiverPoint[] = [
  { name: 'Long Branch Recreation Area', mileMarker: 0.0, bank: 'Right' },
  { name: 'Buffalo Valley Recreation Area', mileMarker: 0.0, bank: 'Left' },
  { name: 'Lancaster Pull-offs', mileMarker: 0.75 },
  { name: 'Happy Hollow Boat Ramp', mileMarker: 3.5 },
  { name: "Betty's Island Boat Ramp", mileMarker: 9.0 },
  { name: 'Stonewall Bridge Boat Ramp', mileMarker: 14.5 },
  { name: 'South Carthage Ag Center', mileMarker: 18.5 },
  { name: 'Carthage Lighthouse', mileMarker: 21.0, note: 'Mouth of the Cumberland confluence' },
];