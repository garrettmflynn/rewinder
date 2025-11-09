export interface SerialMessage {
  direction: 'sent' | 'received';
  content: string;
  timestamp: Date;
}

export interface MotorConfig {
  id: number;
  speed: number;
  microsteps: number;
  current: number;
  enabled: boolean;
  direction: 'FWD' | 'REV';
}

export interface MotorStatus {
  motor: number;
  enabled: number;
  dir: 'FWD' | 'REV';
  moving: number;
  stepsRemaining: number;
  speed_sps: number;
  microsteps: number;
  current_mA: number;
}
