import { SerialService } from './SerialService';
import { EmulatorService } from './EmulatorService';

export interface IConnectionService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  autoReconnect(): Promise<boolean>;
  send(command: string, motorId?: number): Promise<void>;
  isConnected(): boolean;
  setActiveMotor(motorId: number): void;
  getActiveMotor(): number;
  onMessage(callback: (message: string) => void): () => void;
  onSent(callback: (command: string) => void): () => void;
  onStatusChange(callback: (connected: boolean) => void): () => void;
  onAutoReconnectStatus(callback: (status: string) => void): () => void;
}

/**
 * Proxy service that delegates to either a real SerialService or an EmulatorService.
 * Manages callback forwarding so subscribers don't need to know which backend is active.
 */
class ConnectionProxy implements IConnectionService {
  private _serial: SerialService;
  private _emulator: EmulatorService;
  private _backend: IConnectionService;
  private _isEmulated = false;

  // Own callback registries — forwarded to whichever backend is active
  private _messageCallbacks = new Set<(message: string) => void>();
  private _sentCallbacks = new Set<(command: string) => void>();
  private _statusCallbacks = new Set<(connected: boolean) => void>();
  private _autoReconnectCallbacks = new Set<(status: string) => void>();
  private _backendUnsubs: (() => void)[] = [];

  constructor() {
    this._serial = new SerialService();
    this._emulator = new EmulatorService();
    this._backend = this._serial;
    this._bindBackend();
  }

  get isEmulated() { return this._isEmulated; }
  get emulator() { return this._emulator; }

  async setEmulatorMode(enabled: boolean) {
    if (enabled === this._isEmulated) return;

    // Disconnect current backend
    if (this._backend.isConnected()) {
      await this._backend.disconnect();
    }

    this._isEmulated = enabled;
    this._backend = enabled ? this._emulator : this._serial;
    this._rebindBackend();

    // Notify status change for the new backend's current state
    const connected = this._backend.isConnected();
    this._statusCallbacks.forEach(cb => cb(connected));
  }

  private _bindBackend() {
    this._backendUnsubs = [
      this._backend.onMessage(msg => this._messageCallbacks.forEach(cb => cb(msg))),
      this._backend.onSent(cmd => this._sentCallbacks.forEach(cb => cb(cmd))),
      this._backend.onStatusChange(status => this._statusCallbacks.forEach(cb => cb(status))),
      this._backend.onAutoReconnectStatus(status => this._autoReconnectCallbacks.forEach(cb => cb(status))),
    ];
  }

  private _rebindBackend() {
    this._backendUnsubs.forEach(fn => fn());
    this._backendUnsubs = [];
    this._bindBackend();
  }

  // --- IConnectionService delegation ---

  connect() { return this._backend.connect(); }
  disconnect() { return this._backend.disconnect(); }
  autoReconnect() { return this._backend.autoReconnect(); }
  send(command: string, motorId?: number) { return this._backend.send(command, motorId); }
  isConnected() { return this._backend.isConnected(); }
  setActiveMotor(motorId: number) { this._backend.setActiveMotor(motorId); }
  getActiveMotor() { return this._backend.getActiveMotor(); }

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
    // Immediately call with current status
    callback(this._backend.isConnected());
    return () => this._statusCallbacks.delete(callback);
  }

  onAutoReconnectStatus(callback: (status: string) => void): () => void {
    this._autoReconnectCallbacks.add(callback);
    return () => this._autoReconnectCallbacks.delete(callback);
  }
}

export const connectionService = new ConnectionProxy();

// Also export as serialService for backward compatibility
export { connectionService as serialService };
