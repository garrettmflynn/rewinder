import type { IConnectionService } from './ConnectionService';

interface SimulatedMotor {
  enabled: boolean;
  moving: boolean;
  direction: 'FWD' | 'REV';
  speed: number;
  stepsRemaining: number;
  continuous: boolean;
  moveInterval: ReturnType<typeof setInterval> | null;
}

export class EmulatorService implements IConnectionService {
  private _connected = false;
  private _activeMotorId = 0;
  private _messageCallbacks = new Set<(message: string) => void>();
  private _sentCallbacks = new Set<(command: string) => void>();
  private _statusCallbacks = new Set<(connected: boolean) => void>();
  private _autoReconnectCallbacks = new Set<(status: string) => void>();
  private _limitSwitchPressed = false;

  private motors: SimulatedMotor[] = [
    { enabled: false, moving: false, direction: 'FWD', speed: 0, stepsRemaining: 0, continuous: false, moveInterval: null },
    { enabled: false, moving: false, direction: 'FWD', speed: 0, stepsRemaining: 0, continuous: false, moveInterval: null },
  ];

  onMessage(callback: (message: string) => void): () => void {
    this._messageCallbacks.add(callback);
    return () => this._messageCallbacks.delete(callback);
  }

  onSent(callback: (command: string) => void): () => void {
    this._sentCallbacks.add(callback);
    return () => this._sentCallbacks.delete(callback);
  }

  onStatusChange(callback: (connected: boolean) => void): () => void {
    this._statusCallbacks.add(callback);
    callback(this._connected);
    return () => this._statusCallbacks.delete(callback);
  }

  onAutoReconnectStatus(callback: (status: string) => void): () => void {
    this._autoReconnectCallbacks.add(callback);
    return () => this._autoReconnectCallbacks.delete(callback);
  }

  setActiveMotor(motorId: number) {
    this._activeMotorId = motorId;
  }

  getActiveMotor(): number {
    return this._activeMotorId;
  }

  isConnected(): boolean {
    return this._connected;
  }

  async connect(): Promise<void> {
    this._connected = true;
    this._statusCallbacks.forEach(cb => cb(true));
  }

  async autoReconnect(): Promise<boolean> {
    return false;
  }

  async disconnect(): Promise<void> {
    this.motors.forEach(m => {
      if (m.moveInterval) clearInterval(m.moveInterval);
      m.moving = false;
      m.stepsRemaining = 0;
      m.continuous = false;
    });
    this._connected = false;
    this._statusCallbacks.forEach(cb => cb(false));
  }

  async send(command: string, motorId?: number): Promise<void> {
    if (!this._connected) throw new Error('Not connected');

    const targetMotor = motorId !== undefined ? motorId : this._activeMotorId;
    const commandWithMotor = targetMotor === 0 ? command : `M${targetMotor} ${command}`;
    this._sentCallbacks.forEach(cb => cb(commandWithMotor.trim()));

    // Small delay to simulate serial latency
    await new Promise(r => setTimeout(r, 2));

    const parts = command.trim().split(/\s+/);
    const cmd = parts[0].toUpperCase();
    const motor = this.motors[targetMotor];
    if (!motor) return;

    switch (cmd) {
      case 'ENABLE':
        motor.enabled = parts[1] === '1';
        this.respond(JSON.stringify({ ack: 'ENABLE', motor: targetMotor }));
        break;

      case 'DIR':
        motor.direction = parts[1] as 'FWD' | 'REV';
        this.respond(JSON.stringify({ ack: 'DIR', motor: targetMotor }));
        break;

      case 'SPEED':
        motor.speed = parseInt(parts[1]) || 0;
        this.respond(JSON.stringify({ ack: 'SPEED', motor: targetMotor }));
        break;

      case 'MOVE': {
        const steps = parseInt(parts[1]) || 0;
        const speed = parseInt(parts[2]) || motor.speed;
        motor.speed = speed;
        motor.stepsRemaining = steps;
        motor.moving = true;
        motor.continuous = false;
        this.respond(JSON.stringify({ ack: 'MOVE', motor: targetMotor }));
        this.simulateMove(targetMotor);
        break;
      }

      case 'CONT': {
        const speed = parseInt(parts[1]) || motor.speed;
        motor.speed = speed;
        motor.moving = true;
        motor.continuous = true;
        motor.stepsRemaining = 999999;
        this.respond(JSON.stringify({ ack: 'CONT', motor: targetMotor }));
        break;
      }

      case 'STOP':
        if (motor.moveInterval) {
          clearInterval(motor.moveInterval);
          motor.moveInterval = null;
        }
        motor.moving = false;
        motor.stepsRemaining = 0;
        motor.continuous = false;
        this.respond(JSON.stringify({ ack: 'STOP', motor: targetMotor }));
        break;

      case 'STATUS':
        this.respond(JSON.stringify({
          motor: targetMotor,
          enabled: motor.enabled ? 1 : 0,
          dir: motor.direction,
          moving: motor.moving ? 1 : 0,
          stepsRemaining: motor.stepsRemaining,
          speed_sps: motor.speed,
          microsteps: 16,
          current_mA: 800,
        }));
        break;
    }
  }

  private simulateMove(motorId: number) {
    const motor = this.motors[motorId];
    if (motor.moveInterval) clearInterval(motor.moveInterval);

    const updateInterval = 100; // ms
    motor.moveInterval = setInterval(() => {
      if (!motor.moving || motor.stepsRemaining <= 0) {
        if (motor.moveInterval) clearInterval(motor.moveInterval);
        motor.moveInterval = null;
        motor.moving = false;
        motor.stepsRemaining = 0;
        return;
      }
      const stepsPerUpdate = Math.round(motor.speed * (updateInterval / 1000));
      motor.stepsRemaining = Math.max(0, motor.stepsRemaining - stepsPerUpdate);
      if (motor.stepsRemaining === 0) {
        if (motor.moveInterval) clearInterval(motor.moveInterval);
        motor.moveInterval = null;
        motor.moving = false;
      }
    }, updateInterval);
  }

  private respond(message: string) {
    setTimeout(() => {
      this._messageCallbacks.forEach(cb => cb(message));
    }, 5);
  }

  /** Simulate limit switch press/release — for testing UI without hardware */
  triggerLimitSwitch(pressed: boolean) {
    this._limitSwitchPressed = pressed;
    this.respond(JSON.stringify({ limitSwitch: pressed }));
    if (pressed) {
      // Firmware sends HOME event when limit switch triggers during movement
      setTimeout(() => {
        const motor = this.motors[1];
        if (motor.moving) {
          if (motor.moveInterval) clearInterval(motor.moveInterval);
          motor.moveInterval = null;
          motor.moving = false;
          motor.stepsRemaining = 0;
          motor.continuous = false;
        }
        this._messageCallbacks.forEach(cb =>
          cb(JSON.stringify({ event: 'HOME', motor: 1 }))
        );
      }, 50);
    }
  }

  get limitSwitchPressed() {
    return this._limitSwitchPressed;
  }

  /** Get simulated motor state — useful for debugging */
  getMotorState(motorId: number) {
    return { ...this.motors[motorId] };
  }
}
