export class WebUSBService {
  private device: USBDevice | null = null;
  private interfaceNumber = 0;
  private endpointIn = 0;
  private endpointOut = 0;
  private connected = false;
  private reading = false;

  private onMessageCallbacks: Set<(message: string) => void> = new Set();
  private onSentCallbacks: Set<(command: string) => void> = new Set();
  private onStatusChangeCallbacks: Set<(connected: boolean) => void> = new Set();
  private onAutoReconnectCallbacks: Set<(status: string) => void> = new Set();

  // Motor configuration
  private activeMotorId = 0;

  // Buffer for incoming data
  private readBuffer = '';

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
      // Request USB device - filter for Arduino devices
      this.device = await navigator.usb.requestDevice({
        filters: [
          { vendorId: 0x2341 }, // Arduino
          { vendorId: 0x1a86 }, // CH340
          { vendorId: 0x10c4 }, // CP210x
          { vendorId: 0x0403 }, // FTDI
          { vendorId: 0x239a }, // Adafruit
          { vendorId: 0x2e8a }, // Raspberry Pi Pico
        ]
      });

      await this.openDevice();
    } catch (error) {
      throw new Error(`Connection failed: ${error}`);
    }
  }

  async autoReconnect(): Promise<boolean> {
    try {
      if (!navigator.usb) {
        this.notifyAutoReconnect('WebUSB not supported');
        return false;
      }

      this.notifyAutoReconnect('Checking for previous devices...');
      const devices = await navigator.usb.getDevices();

      if (devices.length === 0) {
        this.notifyAutoReconnect('No previous devices found');
        return false;
      }

      this.notifyAutoReconnect('Found previous device, reconnecting...');
      this.device = devices[0];
      await this.openDevice();
      this.notifyAutoReconnect('Auto-reconnected successfully');
      return true;
    } catch (error) {
      this.notifyAutoReconnect(`Auto-reconnect failed: ${error}`);
      console.error('Auto-reconnect error:', error);
      return false;
    }
  }

  private async openDevice(): Promise<void> {
    if (!this.device) {
      throw new Error('No device selected');
    }

    await this.device.open();

    // Find the CDC interface (serial communication)
    if (this.device.configuration === null) {
      await this.device.selectConfiguration(1);
    }

    // Look for CDC data interface
    const interfaces = this.device.configuration?.interfaces || [];

    for (const iface of interfaces) {
      for (const alternate of iface.alternates) {
        // CDC Data interface class is 0x0A
        if (alternate.interfaceClass === 0x0A || alternate.interfaceClass === 0xFF) {
          this.interfaceNumber = iface.interfaceNumber;

          for (const endpoint of alternate.endpoints) {
            if (endpoint.direction === 'in') {
              this.endpointIn = endpoint.endpointNumber;
            } else if (endpoint.direction === 'out') {
              this.endpointOut = endpoint.endpointNumber;
            }
          }
          break;
        }
      }
    }

    // Fallback: use first interface with bulk endpoints
    if (this.endpointIn === 0 || this.endpointOut === 0) {
      for (const iface of interfaces) {
        for (const alternate of iface.alternates) {
          for (const endpoint of alternate.endpoints) {
            if (endpoint.type === 'bulk') {
              if (endpoint.direction === 'in' && this.endpointIn === 0) {
                this.interfaceNumber = iface.interfaceNumber;
                this.endpointIn = endpoint.endpointNumber;
              } else if (endpoint.direction === 'out' && this.endpointOut === 0) {
                this.endpointOut = endpoint.endpointNumber;
              }
            }
          }
        }
      }
    }

    await this.device.claimInterface(this.interfaceNumber);

    // Set up CDC line coding (115200 baud, 8N1)
    try {
      await this.device.controlTransferOut({
        requestType: 'class',
        recipient: 'interface',
        request: 0x20, // SET_LINE_CODING
        value: 0,
        index: this.interfaceNumber
      }, new Uint8Array([
        0x00, 0xC2, 0x01, 0x00, // 115200 baud (little endian)
        0x00, // 1 stop bit
        0x00, // no parity
        0x08  // 8 data bits
      ]));

      // Set control line state (DTR + RTS)
      await this.device.controlTransferOut({
        requestType: 'class',
        recipient: 'interface',
        request: 0x22, // SET_CONTROL_LINE_STATE
        value: 0x03,   // DTR + RTS
        index: this.interfaceNumber
      });
    } catch (e) {
      // Some devices don't support CDC control requests
      console.warn('CDC control setup failed (may be OK):', e);
    }

    this.connected = true;
    this.notifyStatusChange(true);
    this.startReading();
  }

  async disconnect(): Promise<void> {
    try {
      this.connected = false;
      this.reading = false;

      if (this.device) {
        try {
          await this.device.releaseInterface(this.interfaceNumber);
        } catch (e) {
          // Ignore
        }
        await this.device.close();
      }

      this.device = null;
      this.notifyStatusChange(false);
    } catch (error) {
      throw new Error(`Disconnection failed: ${error}`);
    }
  }

  private async startReading(): Promise<void> {
    this.reading = true;
    const decoder = new TextDecoder();

    while (this.reading && this.device && this.connected) {
      try {
        const result = await this.device.transferIn(this.endpointIn, 64);

        if (result.data && result.data.byteLength > 0) {
          const text = decoder.decode(result.data);
          this.readBuffer += text;

          // Process complete lines
          let newlineIndex;
          while ((newlineIndex = this.readBuffer.indexOf('\n')) >= 0) {
            const line = this.readBuffer.slice(0, newlineIndex).trim();
            this.readBuffer = this.readBuffer.slice(newlineIndex + 1);
            if (line) {
              this.notifyMessage(line);
            }
          }
        }
      } catch (error) {
        if (this.connected) {
          console.error('Read error:', error);
          // Try to recover or disconnect
          this.connected = false;
          this.notifyStatusChange(false);
        }
        break;
      }
    }
  }

  async send(command: string, motorId?: number): Promise<void> {
    if (!this.device || !this.connected) {
      throw new Error('Not connected');
    }

    const targetMotor = motorId !== undefined ? motorId : this.activeMotorId;
    const commandWithMotor = targetMotor === 0
      ? command
      : `M${targetMotor} ${command}`;

    const encoder = new TextEncoder();
    const data = encoder.encode(commandWithMotor.trim() + '\n');

    await this.device.transferOut(this.endpointOut, data);
    this.notifySent(commandWithMotor.trim());
  }

  isConnected(): boolean {
    return this.connected;
  }

  static isSupported(): boolean {
    return 'usb' in navigator;
  }
}

export const webUSBService = new WebUSBService();
