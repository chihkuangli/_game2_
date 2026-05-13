export interface Point {
  x: number;
  y: number;
}

export interface GameObject extends Point {
  width: number;
  height: number;
}

export interface Ball extends Point {
  radius: number;
  dx: number;
  dy: number;
  speed: number;
}

export interface Paddle extends GameObject {
  speed: number;
}

export interface Brick extends GameObject {
  value: number;
  color: string;
  isDestroyed: boolean;
  padding: number;
}

export type GameStatus = 'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'VICTORY';

export interface GameState {
  score: number;
  lives: number;
  status: GameStatus;
}
