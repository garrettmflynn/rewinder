import { SerialService } from './SerialService';
import { WebUSBService } from './WebUSBService';

export type ConnectionType = 'webusb' | 'webserial' | 'auto';

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

class ConnectionService implements IConnectionService {
  private serialService: SerialService;
  private webUSBService: WebUSBService;
  private activeService: IConnectionService;
  private connectionType: ConnectionType = 'auto';

  constructor() {
    this.serialService = new SerialService();
    this.webUSBService = new WebUSBService();

    // Default to best available
    this.activeService = this.getBestService();
  }

  private getBestService(): IConnectionService {
    // On Android or when WebUSB is preferred, use WebUSB
    const isAndroid = /Android/i.test(navigator.userAgent);
    const webUSBSupported = WebUSBService.isSupported();
    const webSerialSupported = 'serial' in navigator;

    if (this.connectionType === 'webusb' && webUSBSupported) {
      return this.webUSBService;
    }

    if (this.connectionType === 'webserial' && webSerialSupported) {
      return this.serialService;
    }

    // Auto mode: prefer WebUSB on Android, Web Serial on desktop
    if (isAndroid && webUSBSupported) {
      return this.webUSBService;
    }

    if (webSerialSupported) {
      return this.serialService;
    }

    if (webUSBSupported) {
      return this.webUSBService;
    }

    // Fallback (will fail on connect, but provides interface)
    return this.serialService;
  }

  setConnectionType(type: ConnectionType) {
    this.connectionType = type;
    if (!this.activeService.isConnected()) {
      this.activeService = this.getBestService();
    }
  }

  getConnectionType(): ConnectionType {
    return this.connectionType;
  }

  getActiveConnectionMethod(): 'webusb' | 'webserial' {
    return this.activeService === this.webUSBService ? 'webusb' : 'webserial';
  }

  static getAvailableMethods(): { webusb: boolean; webserial: boolean } {
    return {
      webusb: WebUSBService.isSupported(),
      webserial: 'serial' in navigator
    };
  }

  async connect(): Promise<void> {
    this.activeService = this.getBestService();
    return this.activeService.connect();
  }

  async disconnect(): Promise<void> {
    return this.activeService.disconnect();
  }

  async autoReconnect(): Promise<boolean> {
    this.activeService = this.getBestService();
    return this.activeService.autoReconnect();
  }

  async send(command: string, motorId?: number): Promise<void> {
    return this.activeService.send(command, motorId);
  }

  isConnected(): boolean {
    return this.activeService.isConnected();
  }

  setActiveMotor(motorId: number): void {
    this.serialService.setActiveMotor(motorId);
    this.webUSBService.setActiveMotor(motorId);
  }

  getActiveMotor(): number {
    return this.activeService.getActiveMotor();
  }

  onMessage(callback: (message: string) => void): () => void {
    const unsub1 = this.serialService.onMessage(callback);
    const unsub2 = this.webUSBService.onMessage(callback);
    return () => {
      unsub1();
      unsub2();
    };
  }

  onSent(callback: (command: string) => void): () => void {
    const unsub1 = this.serialService.onSent(callback);
    const unsub2 = this.webUSBService.onSent(callback);
    return () => {
      unsub1();
      unsub2();
    };
  }

  onStatusChange(callback: (connected: boolean) => void): () => void {
    const unsub1 = this.serialService.onStatusChange(callback);
    const unsub2 = this.webUSBService.onStatusChange(callback);
    return () => {
      unsub1();
      unsub2();
    };
  }

  onAutoReconnectStatus(callback: (status: string) => void): () => void {
    const unsub1 = this.serialService.onAutoReconnectStatus(callback);
    const unsub2 = this.webUSBService.onAutoReconnectStatus(callback);
    return () => {
      unsub1();
      unsub2();
    };
  }
}

export const connectionService = new ConnectionService();

// Also export as serialService for backward compatibility
export { connectionService as serialService };
