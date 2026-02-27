export type SystemMode = 'idle' | 'running' | 'paused' | 'resetting';

export interface OscillationState {
  direction: 'FWD' | 'REV';
  stepsTotal: number;
  stepsRemaining: number;
  legCount: number;
}

export interface LimitSwitchState {
  pressed: boolean;
  pressedAtPause: boolean;
  changedWhilePaused: boolean;
}

export interface WindingState {
  mode: SystemMode;
  oscillation: OscillationState;
  limitSwitch: LimitSwitchState;
  pauseTimestamp: number | null;
}

export function createWindingState(): WindingState {
  return {
    mode: 'idle',
    oscillation: {
      direction: 'FWD',
      stepsTotal: 0,
      stepsRemaining: 0,
      legCount: 0,
    },
    limitSwitch: {
      pressed: false,
      pressedAtPause: false,
      changedWhilePaused: false,
    },
    pauseTimestamp: null,
  };
}
