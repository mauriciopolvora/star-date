export interface SelectedStarInfo {
  index: number;
  id: number | string;
  name: string;
  position: [number, number, number];
  distanceParsec: number;
  distanceLightYears: number;
  luminosity: number;
  colorRGB: [number, number, number];
}
