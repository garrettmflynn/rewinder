export class SerialService {
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private connected = false;
  private onMessageCallbacks: Set<(message: string) => void> = new Set();
  private onSentCallbacks: Set<(command: string) => void> = new Set();
  private onStatusChangeCallbacks: Set<(connected: boolean) => void> = new Set();
  private onAutoReconnectCallbacks: Set<(status: string) => void> = new Set();

  // Motor configuration
  private activeMotorId = 0;  // Default to motor 0 for backward compatibility

  onMessage(callback: (message: string) => void): () => void {
    this.onMessageCallbacks.add(callback);
    return () => this.onMessageCallbacks.delete(callback);
  }

  onSent(callback: (command: string) => void): () => void {
    this.onSentCallbacks.add(callback);
    return () => this.onSentCallbacks.delete(callback);
  }

  onStatusChange(callback: (connected: boolean) => void): () => void {
    this.onStatusChangeCallbacks.add(callback);
    // Immediately call with current status
    callback(this.connected);
    return () => this.onStatusChangeCallbacks.delete(callback);
  }

  onAutoReconnectStatus(callback: (status: string) => void): () => void {
    this.onAutoReconnectCallbacks.add(callback);
    return () => this.onAutoReconnectCallbacks.delete(callback);
  }

  private notifyStatusChange(status: boolean) {
    this.onStatusChangeCallbacks.forEach(cb => cb(status));
  }

  private notifyAutoReconnect(status: string) {
    this.onAutoReconnectCallbacks.forEach(cb => cb(status));
  }

  private notifyMessage(message: string) {
    this.onMessageCallbacks.forEach(cb => cb(message));
  }

  private notifySent(command: string) {
    this.onSentCallbacks.forEach(cb => cb(command));
  }

  setActiveMotor(motorId: number) {
    this.activeMotorId = motorId;
  }

  getActiveMotor(): number {
    return this.activeMotorId;
  }

  async connect(): Promise<void> {
    try {
      this.port = await navigator.serial.requestPort();
      await this.openPort();
    } catch (error) {
      throw new Error(`Connection failed: ${error}`);
    }
  }

  async autoReconnect(): Promise<boolean> {
    try {
      if (!navigator.serial) {
        this.notifyAutoReconnect('Web Serial API not supported');
        return false;
      }

      this.notifyAutoReconnect('Checking for previous devices...');
      const ports = await navigator.serial.getPorts();

      if (ports.length === 0) {
        this.notifyAutoReconnect('No previous devices found');
        return false;
      }

      this.notifyAutoReconnect('Found previous device, reconnecting...');
      this.port = ports[0]; // Use the first previously authorized port
      await this.openPort();
      this.notifyAutoReconnect('Auto-reconnected successfully');
      return true;
    } catch (error) {
      this.notifyAutoReconnect(`Auto-reconnect failed: ${error}`);
      console.error('Auto-reconnect error:', error);
      return false;
    }
  }

  private async openPort(): Promise<void> {
    if (!this.port) {
      throw new Error('No port selected');
    }

    await this.port.open({ baudRate: 115200 });
    this.writer = this.port.writable.getWriter();
    this.reader = this.port.readable.getReader();
    this.connected = true;
    this.notifyStatusChange(true);
    this.readLoop();
  }

  async disconnect(): Promise<void> {
    try {
      this.connected = false;
      if (this.reader) {
        await this.reader.cancel();
        this.reader.releaseLock();
      }
      if (this.writer) {
        this.writer.releaseLock();
      }
      if (this.port) {
        await this.port.close();
      }
      this.notifyStatusChange(false);
    } catch (error) {
      throw new Error(`Disconnection failed: ${error}`);
    }
  }

  private async readLoop(): Promise<void> {
    const decoder = new TextDecoder();
    let buffer = '';

    while (this.connected && this.reader) {
      try {
        const { value, done } = await this.reader.read();
        if (done) break;

        if (value) {
          buffer += decoder.decode(value, { stream: true });
          let newlineIndex;
          while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, newlineIndex).trim();
            buffer = buffer.slice(newlineIndex + 1);
            if (line) {
              this.notifyMessage(line);
            }
          }
        }
      } catch (error) {
        if (this.connected) {
          console.error('Read error:', error);
        }
        break;
      }
    }
  }

  async send(command: string, motorId?: number): Promise<void> {
    if (!this.writer) {
      throw new Error('Not connected');
    }

    // Use provided motorId or default to activeMotorId
    const targetMotor = motorId !== undefined ? motorId : this.activeMotorId;

    // Prefix command with motor ID if not motor 0 (backward compatibility)
    // Motor 0 commands don't need prefix for backward compatibility with old firmware
    const commandWithMotor = targetMotor === 0
      ? command
      : `M${targetMotor} ${command}`;

    const encoder = new TextEncoder();
    await this.writer.write(encoder.encode(commandWithMotor.trim() + '\n'));

    // Notify listeners about sent command
    this.notifySent(commandWithMotor.trim());
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export const serialService = new SerialService();
