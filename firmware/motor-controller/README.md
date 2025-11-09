# Multi-Motor Controller Firmware

Arduino firmware for controlling up to 4 TMC2209 stepper motor drivers via Web Serial API.

## Features

- **Multi-Motor Support:** Control 1-4 motors with scalable architecture
- **Motor Addressing:** Target specific motors (M0-M3) or all motors simultaneously
- **Backward Compatible:** Commands without motor ID default to motor 0
- **Non-Blocking Motion:** Continuous and stepped motion without blocking the main loop
- **JSON Responses:** Structured status and acknowledgment messages
- **Modular Design:** MotorDriver class encapsulates all motor functionality

## Hardware Requirements

- Arduino Mega 2560 (or compatible with multiple hardware serial ports)
- TMC2209 stepper driver module(s)
- TMC2209 library (install via Arduino Library Manager)

## Pin Configuration

### Motor 0 (Default)
```cpp
#define M0_EN_PIN    8      // Enable pin
#define M0_DIR_PIN   5      // Direction pin
#define M0_STEP_PIN  2      // Step pin
#define M0_SERIAL    Serial1  // UART for TMC2209
#define M0_ADDR      0b00   // TMC2209 address
```

### Adding More Motors

To enable additional motors, edit `motor-controller.ino`:

1. Set `NUM_MOTORS` to desired count (1-4)
2. Uncomment pin definitions for motors 1-3
3. Connect hardware according to pin assignments

Example for 2 motors:
```cpp
#define NUM_MOTORS 2

// Motor 1 pins (uncomment)
#define M1_EN_PIN    9
#define M1_DIR_PIN   6
#define M1_STEP_PIN  3
#define M1_SERIAL    Serial2
#define M1_ADDR      0b01
```

## Installation

1. Install the TMCStepper library:
   - Open Arduino IDE
   - Go to Sketch → Include Library → Manage Libraries
   - Search for "TMCStepper"
   - Install the latest version

2. Open `motor-controller.ino` in Arduino IDE

3. Configure the number of motors:
   ```cpp
   #define NUM_MOTORS 1  // Set to 1, 2, 3, or 4
   ```

4. Upload to your Arduino Mega

## Usage

### Serial Communication

Connect via USB at 115200 baud. The firmware accepts text commands and returns JSON responses.

See [PROTOCOL.md](../../docs/PROTOCOL.md) for complete command reference.

### Basic Commands

```
ENABLE 1              // Enable motor 0
M1 SPEED 500          // Set motor 1 speed
M0 MOVE 1000          // Move motor 0 by 1000 steps
ALL STATUS            // Get status of all motors
M2 CURRENT 800        // Set motor 2 current to 800mA
```

### Multi-Motor Example

```cpp
// Enable all motors
ALL ENABLE 1

// Set different speeds
M0 SPEED 500
M1 SPEED 1000
M2 SPEED 750

// Move motors simultaneously (non-blocking)
M0 MOVE 2000
M1 MOVE 1500
M2 MOVE 1000

// Check status
ALL STATUS
```

## Architecture

### MotorDriver Class

Each motor is managed by a `MotorDriver` instance that encapsulates:
- TMC2209 configuration
- Non-blocking step generation
- Motion state management
- Status reporting

### Main Loop

```cpp
void loop() {
  // Update all motors (generate step pulses)
  for (int i = 0; i < NUM_MOTORS; i++) {
    if (motors[i] != nullptr) {
      motors[i]->update();
    }
  }

  // Process serial commands
  // ... command parsing ...
}
```

### Command Flow

1. Serial data received
2. Parse motor ID (M0, M1, ALL, or default to M0)
3. Route to appropriate MotorDriver
4. Execute command
5. Return JSON acknowledgment

## Configuration

### TMC2209 Settings

Default values (configured in `MotorDriver::begin()`):

```cpp
- RMS Current: 600mA
- Microsteps: 16
- StealthChop: Enabled
- R_SENSE: 0.11Ω
```

Modify in `MotorDriver.cpp` or send runtime commands:
```
CURRENT 800
MICROSTEPS 32
```

### Speed Limits

Configured in `MotorDriver::setSpeedStepsPerSec()`:

```cpp
- Minimum: 1 step/s
- Maximum: ~10,000 steps/s (50µs half-period)
```

## Troubleshooting

### Motor Not Moving

1. Check enable state: `STATUS` should show `"enabled":1`
2. Verify wiring: EN, DIR, STEP pins
3. Check motor power supply
4. Verify TMC2209 UART connection

### Communication Issues

1. Verify baud rate: 115200
2. Check USB connection
3. Monitor with Serial Monitor (115200 baud)
4. Look for JSON responses

### Multiple Motors Not Working

1. Verify `NUM_MOTORS` is set correctly
2. Ensure pin definitions are uncommented
3. Check that Arduino has enough hardware serial ports
4. Verify each TMC2209 has unique address

## Advanced Features

### Custom Motor Configuration

Modify constructor parameters in `setup()`:

```cpp
motors[0] = new MotorDriver(
  0,                  // Motor ID
  M0_SERIAL,         // Serial port
  M0_EN_PIN,         // Enable pin
  M0_DIR_PIN,        // Direction pin
  M0_STEP_PIN,       // Step pin
  0.11f,             // R_SENSE value
  0b00               // TMC2209 address
);
```

### Extending Commands

Add new commands in `executeCommand()`:

```cpp
else if (cmd.startsWith("MYCOMMAND")) {
  // Custom functionality
  motor->doSomething();
  Serial.println(F("{\"ack\":\"MYCOMMAND\"}"));
}
```

## Performance Notes

- Each motor's `update()` runs every loop iteration
- Step generation uses microsecond timing (non-blocking)
- Command processing is asynchronous
- No delays in main loop for optimal performance

## See Also

- [Protocol Documentation](../../docs/PROTOCOL.md)
- [Web UI Documentation](../../web-ui/README.md)
- [TMCStepper Library](https://github.com/teemuatlut/TMCStepper)
