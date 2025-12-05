import { SerialService } from './SerialService';

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

// Re-export SerialService as connectionService for simplicity
export const connectionService = new SerialService();

// Also export as serialService for backward compatibility
export { connectionService as serialService };
