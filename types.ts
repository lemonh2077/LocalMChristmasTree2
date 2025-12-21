
export interface PhotoData {
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  id: number;
}

export enum AppState {
  IDLE = 'IDLE',
  WISHING = 'WISHING',
}
