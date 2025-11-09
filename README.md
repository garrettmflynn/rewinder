# Rewinder - Multi-Motor TMC2209 Controller

Professional stepper motor control system with modern web interface and modular Arduino firmware.

## Overview

Rewinder is a comprehensive solution for controlling TMC2209 stepper motor drivers through a web browser. It features:

- **Modular Architecture** - Clearly separated firmware and UI components
- **Multi-Motor Support** - Control up to 4 motors independently or simultaneously
- **Web Serial Interface** - Direct USB communication from browser (no server required)
- **Modern Web UI** - Built with React, TypeScript, and Tailwind CSS
- **Backward Compatible** - Works with existing single-motor setups

## Project Structure

```
rewinder/
├── firmware/
│   ├── motor-controller/          # Main multi-motor firmware
│   │   ├── motor-controller.ino   # Arduino sketch
│   │   ├── MotorDriver.h          # Motor driver class header
│   │   ├── MotorDriver.cpp        # Motor driver implementation
│   │   └── README.md              # Firmware documentation
│   └── examples/
│       ├── single-motor/          # Original single-motor example
│       └── driver-test/           # Hardware testing sketch
├── web-ui/                        # Modern React web interface
│   ├── src/
│   │   ├── components/            # React components
│   │   ├── services/              # Serial communication service
│   │   └── types/                 # TypeScript definitions
│   ├── package.json
│   └── README.md                  # Web UI documentation
├── docs/
│   └── PROTOCOL.md                # Communication protocol spec
└── README.md                      # This file
```

## Quick Start

### 1. Upload Firmware

```bash
# Open in Arduino IDE
firmware/motor-controller/motor-controller.ino

# Configure number of motors (default: 1)
#define NUM_MOTORS 1

# Upload to Arduino Mega
```

### 2. Run Web Interface

```bash
cd web-ui
npm install
npm run dev
```

### 3. Connect & Control

1. Open `http://localhost:5173` in Chrome/Edge
2. Click "Connect" and select your Arduino
3. Control your motor!

## Features

### Firmware Features

- ✅ **Modular Design** - MotorDriver class encapsulates all motor logic
- ✅ **Multi-Motor Support** - Control 1-4 motors with simple configuration
- ✅ **Motor Addressing** - Target motors by ID (M0-M3) or broadcast (ALL)
- ✅ **Non-Blocking Motion** - Smooth step generation in background
- ✅ **JSON Responses** - Structured status and acknowledgments
- ✅ **Backward Compatible** - Works with old single-motor commands

### Web UI Features

- ✅ **Modern Interface** - Beautiful, responsive design
- ✅ **Real-Time Control** - Instant command feedback
- ✅ **Multi-Motor Ready** - UI prepared for 4-motor support
- ✅ **Serial Console** - Send raw commands and monitor responses
- ✅ **No Installation** - Runs entirely in browser
- ✅ **Development Mode** - Hot reload for rapid iteration

## Hardware Requirements

### Minimum Setup (1 Motor)

- Arduino Mega 2560
- TMC2209 stepper driver module
- Stepper motor
- Power supply (12-24V typically)

### Multi-Motor Setup (2-4 Motors)

- Arduino Mega 2560 (multiple hardware UARTs required)
- 2-4× TMC2209 stepper driver modules
- 2-4× Stepper motors
- Adequate power supply for all motors

### Software Requirements

- Arduino IDE (1.8.13 or newer)
- TMCStepper library (install via Library Manager)
- Node.js (v18+) for web UI
- Chrome or Edge browser (Web Serial API support)

## Documentation

- **[Protocol Specification](docs/PROTOCOL.md)** - Complete command reference
- **[Firmware Guide](firmware/motor-controller/README.md)** - Arduino setup and usage
- **[Web UI Guide](web-ui/README.md)** - Web interface documentation

## Example Usage

### Basic Motor Control

```bash
# Enable motor
ENABLE 1

# Set speed and move
SPEED 500
MOVE 1000

# Continuous motion
CONT 800
STOP

# Check status
STATUS
```

### Multi-Motor Control

```bash
# Enable all motors
ALL ENABLE 1

# Configure different speeds
M0 SPEED 500
M1 SPEED 1000

# Move motors simultaneously
M0 MOVE 2000
M1 MOVE 1500

# Get status of all motors
ALL STATUS
```

## Communication Protocol

### Connection

- **Baud Rate:** 115200
- **Format:** 8-N-1 (8 data bits, no parity, 1 stop bit)
- **Line Ending:** `\n` (newline)

### Command Format

```
[MOTOR_ID] COMMAND [PARAMETERS]
```

Examples:
- `ENABLE 1` - Enable motor 0 (default)
- `M1 SPEED 500` - Set motor 1 speed
- `ALL STOP` - Stop all motors

### Response Format

```json
{"ack": "COMMAND", "motor": 0}
```

See [PROTOCOL.md](docs/PROTOCOL.md) for complete specification.

## Architecture

### Firmware Architecture

```
motor-controller.ino
    ├── MotorDriver[0]  (Motor 0)
    ├── MotorDriver[1]  (Motor 1)
    ├── MotorDriver[2]  (Motor 2)
    └── MotorDriver[3]  (Motor 3)

Each MotorDriver encapsulates:
    ├── TMC2209 driver
    ├── Motion state
    ├── Step generation
    └── Status reporting
```

### Web UI Architecture

```
App
 ├── ConnectionBar
 │   ├── Connect/Disconnect
 │   └── Motor Selector (future)
 ├── MotionControl
 │   ├── Enable/Direction
 │   ├── Speed/Move/Continuous
 │   └── Configuration
 └── Console
     ├── Command Input
     └── Message Log

SerialService
 ├── Connection Management
 ├── Motor Addressing
 └── Message Routing
```

## Multi-Motor Roadmap

### Current Status

- ✅ Firmware supports 1-4 motors
- ✅ Protocol supports motor addressing
- ✅ Web UI has motor selector UI
- ⏳ Motor selector disabled (motor 0 only active)

### To Enable Multi-Motor

1. **Hardware Setup**
   - Connect additional TMC2209 modules
   - Wire to available serial ports (Serial2, Serial3, Serial4)

2. **Firmware Update**
   - Set `NUM_MOTORS` to desired count
   - Uncomment pin definitions for motors 1-3
   - Upload firmware

3. **Web UI Update**
   - Enable motor options in ConnectionBar.tsx
   - Remove `disabled` attribute from selector
   - Deploy updated UI

No protocol or architecture changes needed!

## Development

### Building Firmware

```bash
# Open in Arduino IDE
firmware/motor-controller/motor-controller.ino

# Verify compilation
Sketch → Verify/Compile

# Upload to board
Sketch → Upload
```

### Building Web UI

```bash
cd web-ui

# Development mode
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

### Testing

```bash
# Test firmware with Arduino Serial Monitor
- Set baud rate to 115200
- Send test commands
- Verify JSON responses

# Test web UI
- Open browser console (F12)
- Monitor SerialService logs
- Check command/response flow
```

## Troubleshooting

### Firmware Issues

**Motor not moving:**
- Check wiring (EN, DIR, STEP pins)
- Verify power supply to motor
- Send `STATUS` to check enable state
- Check TMC2209 UART connection

**No serial response:**
- Verify baud rate (115200)
- Check USB cable connection
- Ensure firmware uploaded successfully

### Web UI Issues

**Can't connect:**
- Use Chrome or Edge browser
- Check device in device manager
- Try different USB port
- Grant serial port permission

**Commands not working:**
- Open browser console for errors
- Verify firmware is running
- Check Serial Monitor for responses
- Ensure motor is enabled before motion

## Contributing

Contributions welcome! Areas of interest:

- Additional motor features (homing, limits, etc.)
- Multi-motor choreography
- Configuration persistence (EEPROM)
- Advanced UI features
- Performance optimizations

## License

MIT License - see LICENSE file for details

## Acknowledgments

- TMCStepper library by [teemuatlut](https://github.com/teemuatlut/TMCStepper)
- Web Serial API by W3C
- React team for the amazing framework
- Vite for blazing-fast tooling

## Support

- **Issues:** [GitHub Issues](https://github.com/yourusername/rewinder/issues)
- **Documentation:** See `docs/` directory
- **Examples:** See `firmware/examples/`

---

**Built with ❤️ for precision motion control**
