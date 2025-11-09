# Rewinder Communication Protocol

This document describes the serial communication protocol between the web UI and the Arduino firmware for controlling TMC2209 stepper motors.

## Connection Parameters

- **Baud Rate:** 115200
- **Data Bits:** 8
- **Parity:** None
- **Stop Bits:** 1
- **Flow Control:** None

## Message Format

All messages are ASCII text terminated with a newline character (`\n`).

### Command Structure

Commands sent to the firmware follow this structure:

```
[MOTOR_ID] COMMAND [PARAMETERS]
```

- `[MOTOR_ID]`: Optional. Format: `M0`, `M1`, `M2`, `M3`, or `ALL`
- If no motor ID is specified, defaults to Motor 0 (backward compatible)
- `COMMAND`: The operation to perform
- `[PARAMETERS]`: Command-specific parameters

### Response Structure

Responses from the firmware are JSON-formatted strings:

```json
{"ack": "COMMAND", "motor": 0}
```

or

```json
{"err": "error description"}
```

## Supported Commands

### 1. ENABLE

Enable or disable the motor driver.

**Syntax:**
```
[M0] ENABLE <0|1>
```

**Parameters:**
- `0`: Disable motor (high impedance)
- `1`: Enable motor (holding torque)

**Response:**
```json
{"ack": "ENABLE", "motor": 0}
```

**Examples:**
```
ENABLE 1          // Enable motor 0
M1 ENABLE 0       // Disable motor 1
ALL ENABLE 1      // Enable all motors
```

---

### 2. DIR

Set motor direction.

**Syntax:**
```
[M0] DIR <FWD|REV>
```

**Parameters:**
- `FWD`: Forward direction
- `REV`: Reverse direction

**Response:**
```json
{"ack": "DIR", "motor": 0}
```

**Examples:**
```
DIR FWD           // Set motor 0 to forward
M2 DIR REV        // Set motor 2 to reverse
```

---

### 3. SPEED

Set the default step speed (steps per second).

**Syntax:**
```
[M0] SPEED <steps_per_second>
```

**Parameters:**
- `steps_per_second`: Positive float (1-20000)

**Response:**
```json
{"ack": "SPEED", "motor": 0}
```

**Examples:**
```
SPEED 500         // Set motor 0 to 500 steps/s
M1 SPEED 1000     // Set motor 1 to 1000 steps/s
```

---

### 4. MOVE

Move a specific number of steps at a given speed.

**Syntax:**
```
[M0] MOVE <steps> [steps_per_second]
```

**Parameters:**
- `steps`: Number of steps to move (positive integer)
- `steps_per_second`: Optional speed override

**Response:**
```json
{"ack": "MOVE", "motor": 0}
```

**Examples:**
```
MOVE 200          // Move 200 steps at current speed
MOVE 1000 500     // Move 1000 steps at 500 steps/s
M1 MOVE 500       // Move motor 1 by 500 steps
```

---

### 5. CONT

Start continuous motion at specified speed.

**Syntax:**
```
[M0] CONT <steps_per_second>
```

**Parameters:**
- `steps_per_second`: Continuous speed (defaults to 200 if <= 0)

**Response:**
```json
{"ack": "CONT", "motor": 0}
```

**Examples:**
```
CONT 500          // Start continuous motion at 500 steps/s
M2 CONT 1000      // Motor 2 continuous at 1000 steps/s
```

---

### 6. STOP

Stop all motion immediately.

**Syntax:**
```
[M0] STOP
```

**Response:**
```json
{"ack": "STOP", "motor": 0}
```

**Examples:**
```
STOP              // Stop motor 0
M1 STOP           // Stop motor 1
ALL STOP          // Stop all motors
```

---

### 7. CURRENT

Set motor current in milliamps.

**Syntax:**
```
[M0] CURRENT <milliamps>
```

**Parameters:**
- `milliamps`: Current setting (100-2000 mA)

**Response:**
```json
{"ack": "CURRENT", "motor": 0}
```

**Examples:**
```
CURRENT 600       // Set motor 0 to 600mA
M1 CURRENT 800    // Set motor 1 to 800mA
```

---

### 8. MICROSTEPS

Set microstepping resolution.

**Syntax:**
```
[M0] MICROSTEPS <steps>
```

**Parameters:**
- `steps`: Microstepping value (1-256)
- Common values: 1, 2, 4, 8, 16, 32, 64, 128, 256

**Response:**
```json
{"ack": "MICROSTEPS", "motor": 0}
```

**Examples:**
```
MICROSTEPS 16     // Set motor 0 to 16 microsteps
M1 MICROSTEPS 32  // Set motor 1 to 32 microsteps
```

---

### 9. STATUS

Request current motor status.

**Syntax:**
```
[M0] STATUS
```

**Response:**
```json
{
  "motor": 0,
  "enabled": 1,
  "dir": "FWD",
  "moving": 0,
  "stepsRemaining": 0,
  "speed_sps": 500,
  "microsteps": 16,
  "current_mA": 600
}
```

**For ALL motors:**
```
ALL STATUS
```

**Response:**
```json
{
  "motors": [
    {...motor 0 status...},
    {...motor 1 status...}
  ]
}
```

---

## Multi-Motor Addressing

The firmware supports up to 4 motors (M0-M3). Configure the number of active motors by setting `NUM_MOTORS` in the firmware.

### Motor Selection

Commands can target:
- **Specific motor:** `M0 COMMAND`, `M1 COMMAND`, etc.
- **Default motor (0):** `COMMAND` (backward compatible)
- **All motors:** `ALL COMMAND`

### Example Session

```
→ ENABLE 1
← {"ack":"ENABLE","motor":0}

→ M1 ENABLE 1
← {"ack":"ENABLE","motor":1}

→ ALL SPEED 500
← {"ack":"SPEED","motor":0}
← {"ack":"SPEED","motor":1}

→ M0 MOVE 1000
← {"ack":"MOVE","motor":0}

→ STATUS
← {"motor":0,"enabled":1,"dir":"FWD","moving":1,"stepsRemaining":500,"speed_sps":500,"microsteps":16,"current_mA":600}
```

## Error Handling

Errors are returned in JSON format:

```json
{"err": "description"}
```

Common errors:
- `{"err": "Invalid motor ID: 5"}` - Motor ID out of range
- `{"err": "unknown command"}` - Command not recognized
- `{"err": "MOVE parse"}` - Failed to parse MOVE parameters

## Implementation Notes

### Backward Compatibility

- Commands without motor ID prefix default to motor 0
- Old firmware will ignore motor ID prefixes (treats them as unknown commands)
- New firmware accepts both old and new command formats

### Non-Blocking Operation

- The `MOVE` command returns immediately while the motor moves in the background
- Use `STATUS` to check if motion is complete (`moving`: 0, `stepsRemaining`: 0)
- `STOP` can interrupt any motion

### Speed Limits

- Minimum speed: 1 step/s
- Maximum speed: Determined by `halfPeriodUs` minimum (50µs = ~10,000 steps/s)
- Practical maximum depends on motor characteristics

### Current Limits

- Minimum: 100mA
- Maximum: 2000mA
- Actual limit depends on TMC2209 specifications and R_SENSE value
