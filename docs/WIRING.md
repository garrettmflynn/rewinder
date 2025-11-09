# Wiring Guide - TMC2209 Stepper Motor Controller

Complete wiring instructions for connecting TMC2209 stepper drivers to Arduino Mega and stepper motors.

## Table of Contents
- [Single Motor Setup](#single-motor-setup)
- [Multi-Motor Setup](#multi-motor-setup)
- [Power Supply](#power-supply)
- [Troubleshooting](#troubleshooting)

---

## Overview

### What You Need
- **Arduino Mega 2560** (required for multiple hardware UARTs)
- **TMC2209 Stepper Driver Module(s)** (e.g., BIGTREETECH TMC2209 V1.3)
- **NEMA 17 Stepper Motor(s)** (or compatible)
- **Power Supply** (12-24V DC, 2A+ per motor recommended)
- **Jumper wires** and **breadboard** (optional)
- **USB Cable** (Arduino to PC)

### TMC2209 Module Pinout

```
TMC2209 Module (Typical):
┌─────────────────┐
│   VS      GND   │  ← Motor power (12-24V)
│   2B      2A    │  ← Motor coil 2
│   1A      1B    │  ← Motor coil 1
│   VCC     GND   │  ← Logic power (5V)
│   EN      MS1   │  ← Enable, Microstepping (legacy, not used in UART mode)
│   MS2     MS3   │  ← Microstepping (legacy, not used in UART mode)
│   DIAG    INDEX │  ← Diagnostic pin, Index
│   STEP    DIR   │  ← Step and Direction inputs
│   PDN     UART  │  ← Power down (pull high), UART mode select
│   TX      RX    │  ← UART communication
│   CLK     GND   │  ← Clock (optional), Ground
└─────────────────┘

Note: Pin layout varies by manufacturer. Check your specific module's documentation.
```

### Arduino Mega 2560 Hardware Serial Ports

```
Serial0 (USB):    TX0 (Pin 1),  RX0 (Pin 0)   - Used for USB communication
Serial1:          TX1 (Pin 18), RX1 (Pin 19)  ← Motor 0
Serial2:          TX2 (Pin 16), RX2 (Pin 17)  ← Motor 1
Serial3:          TX3 (Pin 14), RX3 (Pin 15)  ← Motor 2
Serial4:          TX4 (Pin -),  RX4 (Pin -)   - Note: Mega only has Serial1-3
```

**Important:** Arduino Mega has only Serial1, Serial2, and Serial3 (plus Serial0 for USB), limiting us to **3 motors max** without additional hardware.

---

## Single Motor Setup

### Motor 0 Wiring

#### Connection Table

| TMC2209 Pin | Arduino Mega Pin | Notes |
|-------------|------------------|-------|
| **Power** | | |
| VS | Power Supply + (12-24V) | Motor power |
| GND (VS side) | Power Supply - | Motor ground |
| VCC | 5V | Logic power |
| GND (VCC side) | GND | Logic ground |
| **Control Signals** | | |
| EN | Pin 8 | Enable (active LOW) |
| DIR | Pin 5 | Direction |
| STEP | Pin 2 | Step pulses |
| **UART Communication** | | |
| TX | Pin 19 (RX1) | TMC → Arduino |
| RX | Pin 18 (TX1) | Arduino → TMC |
| **Configuration** | | |
| PDN | VCC (5V) | Pull high to enable |
| UART | GND | Pull low for UART mode |
| MS1, MS2, MS3 | (leave floating) | Not used in UART mode |
| CLK | (leave floating) | External clock not needed |

#### Stepper Motor Connections

| TMC2209 Pin | Motor Wire | Notes |
|-------------|------------|-------|
| 1A | Coil 1 - Wire 1 | Usually Black or Red |
| 1B | Coil 1 - Wire 2 | Usually Green or Yellow |
| 2A | Coil 2 - Wire 1 | Usually Red or Blue |
| 2B | Coil 2 - Wire 2 | Usually Blue or White |

**Finding Motor Coils:**
- Use multimeter to measure resistance between wire pairs
- Two pairs with continuity (2-5Ω typical) = the two coils
- Connect each pair to 1A/1B and 2A/2B
- If motor vibrates but doesn't move, swap one coil (swap 1A with 1B OR 2A with 2B)

#### Step-by-Step Wiring Procedure

1. **Power OFF everything first!**

2. **Connect Logic Power:**
   ```
   Arduino 5V  → TMC2209 VCC
   Arduino GND → TMC2209 GND (near VCC)
   ```

3. **Connect Control Signals:**
   ```
   Arduino Pin 8  → TMC2209 EN
   Arduino Pin 5  → TMC2209 DIR
   Arduino Pin 2  → TMC2209 STEP
   ```

4. **Connect UART (Critical!):**
   ```
   Arduino Pin 18 (TX1) → TMC2209 RX
   Arduino Pin 19 (RX1) → TMC2209 TX
   ```

5. **Configure TMC2209 Mode:**
   ```
   TMC2209 PDN  → 5V (or VCC)  [Power Down pin - must be HIGH]
   TMC2209 UART → GND          [UART mode select - must be LOW]
   ```

6. **Connect Motor Power:**
   ```
   Power Supply +12/24V → TMC2209 VS
   Power Supply GND     → TMC2209 GND (near VS)
   ```

   **Important:** Also connect Power Supply GND to Arduino GND (common ground)
   ```
   Power Supply GND → Arduino GND
   ```

7. **Connect Stepper Motor:**
   ```
   Motor Coil 1 (2 wires) → TMC2209 1A and 1B
   Motor Coil 2 (2 wires) → TMC2209 2A and 2B
   ```

8. **Verify Connections:**
   - [ ] All grounds connected together (Arduino, TMC2209, Power Supply)
   - [ ] UART RX/TX crossed (Arduino TX → TMC RX, Arduino RX → TMC TX)
   - [ ] PDN pulled HIGH
   - [ ] UART pin pulled LOW
   - [ ] Motor power (VS) NOT connected to Arduino power

### Wiring Diagram (ASCII Art)

```
Power Supply (12-24V)
┌─────────────┐
│     +   -   │
└──┬────┬─────┘
   │    │
   │    └─────┐
   │          │
┌──▼──────────▼─┐
│   TMC2209     │
│               │
│ VS       GND  │
│               │
│ 2B  2A  1A 1B │─────→ Stepper Motor
│               │       (4 wires)
│ VCC     GND   │
│  ▲       ▲    │
└──┼───────┼────┘
   │       │
   │   ┌───┼─────────────┐
   │   │   └──GND───┐    │
   │   │            │    │
   5V  │      ┌─────┼────┼────┐
   │   │      │     │    │    │
┌──▼───▼──────▼─────▼────▼────▼─────┐
│ Arduino Mega 2560                 │
│                                   │
│ Pin 2  (STEP) ←─── STEP           │
│ Pin 5  (DIR)  ←─── DIR            │
│ Pin 8  (EN)   ←─── EN             │
│                                   │
│ Pin 18 (TX1)  ──→ RX              │
│ Pin 19 (RX1)  ←── TX              │
│                                   │
│ 5V, GND (common ground all)       │
│                                   │
│ USB ───→ PC (Web Serial)          │
└───────────────────────────────────┘

Additional TMC2209 connections:
PDN  → 5V (enable driver)
UART → GND (UART mode)
```

---

## Multi-Motor Setup

### Motor 1 Wiring (Add to Motor 0 setup)

| TMC2209 Pin | Arduino Mega Pin | Notes |
|-------------|------------------|-------|
| EN | Pin 9 | Enable |
| DIR | Pin 6 | Direction |
| STEP | Pin 3 | Step pulses |
| TX | Pin 17 (RX2) | TMC → Arduino |
| RX | Pin 16 (TX2) | Arduino → TMC |
| VCC | 5V | Shared with Motor 0 |
| GND | GND | Common ground |
| VS | Power Supply + | Shared motor power |
| PDN | 5V | Pull high |
| UART | GND | UART mode |

**Motor power can be shared** if your power supply can handle the total current draw.

### Motor 2 Wiring (Add to Motor 0 & 1)

| TMC2209 Pin | Arduino Mega Pin | Notes |
|-------------|------------------|-------|
| EN | Pin 10 | Enable |
| DIR | Pin 7 | Direction |
| STEP | Pin 4 | Step pulses |
| TX | Pin 15 (RX3) | TMC → Arduino |
| RX | Pin 14 (TX3) | Arduino → TMC |
| VCC | 5V | Shared |
| GND | GND | Common ground |
| VS | Power Supply + | Shared motor power |
| PDN | 5V | Pull high |
| UART | GND | UART mode |

### Motor 3 (4th Motor) - Not Available

Arduino Mega 2560 only has Serial1, Serial2, and Serial3. For a 4th motor, you would need:
- Arduino with more serial ports (e.g., Mega 2560 doesn't have Serial4)
- OR use SoftwareSerial (not recommended for TMC2209)
- OR use a different microcontroller (ESP32 has more UARTs)

**Current firmware supports up to 3 motors max on Arduino Mega 2560.**

### Multi-Motor Pin Summary

| Signal | Motor 0 | Motor 1 | Motor 2 |
|--------|---------|---------|---------|
| **Enable** | Pin 8 | Pin 9 | Pin 10 |
| **Direction** | Pin 5 | Pin 6 | Pin 7 |
| **Step** | Pin 2 | Pin 3 | Pin 4 |
| **UART RX** | Pin 19 | Pin 17 | Pin 15 |
| **UART TX** | Pin 18 | Pin 16 | Pin 14 |

All motors share:
- 5V (VCC)
- GND (common ground)
- VS (motor power +)
- Each TMC2209 needs PDN → 5V and UART → GND

---

## Power Supply

### Power Requirements

**Per Motor:**
- Voltage: 12-24V DC (check motor specs)
- Current: 0.5-2A per motor (depends on motor and current setting)
- Recommended: 24V 5A supply for 2-3 motors

### Power Distribution

```
Power Supply
    │
    ├──→ Arduino Mega (via barrel jack or Vin pin, if 7-12V)
    │    OR separate 5V supply to Arduino
    │
    └──→ All TMC2209 VS pins (parallel)
         All TMC2209 GND pins (parallel)

Common Ground: Connect ALL grounds together:
- Power supply GND
- Arduino GND
- All TMC2209 GND pins
```

### Important Power Notes

⚠️ **Do NOT connect motor power (VS) to Arduino power pins!**
- VS (12-24V) → Power supply only
- Arduino gets 5V via USB or separate regulator
- Only GND should be common

⚠️ **Current Limits:**
- Arduino 5V pin can supply ~200mA max
- Each TMC2209 logic draws ~10mA (safe to power 3-4 from Arduino 5V)
- If you need more, use external 5V regulator

### Wiring for Multiple Motors

```
          Power Supply (24V, 5A)
          ┌──────────────┐
          │   +24V  GND  │
          └───┬──────┬───┘
              │      │
        ┌─────┼──────┼─────┬────────┐
        │     │      │     │        │
        │  VS │ GND  │  VS │   GND  │
    ┌───┴─────┴──┐ ┌─┴─────┴────┐
    │ TMC2209    │ │ TMC2209    │
    │ Motor 0    │ │ Motor 1    │
    └────────────┘ └────────────┘
         │              │
      Motor A       Motor B

All GND tied together including Arduino GND
```

---

## Configuration

### TMC2209 Address Selection

Each TMC2209 on the same UART bus needs a unique address. In our setup, each motor has its own UART, so all can use address `0b00`:

```cpp
#define M0_ADDR  0b00   // Motor 0 on Serial1
#define M1_ADDR  0b01   // Motor 1 on Serial2 (can also be 0b00)
#define M2_ADDR  0b10   // Motor 2 on Serial3 (can also be 0b00)
```

Since each motor uses a different Serial port, addresses don't need to be unique (but firmware uses different addresses for clarity).

### R_SENSE Value

The TMC2209 uses a sense resistor (R_SENSE) to measure current:

- **Typical value:** 0.11Ω (110 mΩ)
- **Check your module!** Some use 0.10Ω or 0.15Ω
- Look for "R100" or "R110" printed near the current sense resistors

Update in firmware if different:
```cpp
#define R_SENSE  0.11f  // Change to match your module
```

---

## Troubleshooting

### Motor Doesn't Move

**Check:**
1. ✓ Motor power (VS) connected and adequate voltage (12-24V)
2. ✓ Enable pin working (EN should be LOW to enable)
3. ✓ Motor properly connected to 1A/1B/2A/2B
4. ✓ Send `STATUS` command - does `"enabled": 1` show?
5. ✓ Try swapping one coil (1A ↔ 1B or 2A ↔ 2B)

### Motor Vibrates But Doesn't Turn

**Likely cause:** Wrong coil connections

**Fix:** Swap ONE coil:
- Try: Swap 1A with 1B
- If still wrong: Swap back, then swap 2A with 2B

### No UART Communication (STATUS command returns nothing)

**Check:**
1. ✓ TX/RX crossed correctly (Arduino TX1 → TMC RX, Arduino RX1 → TMC TX)
2. ✓ PDN pin pulled HIGH (to 5V or VCC)
3. ✓ UART pin pulled LOW (to GND)
4. ✓ Common ground between Arduino and TMC2209
5. ✓ Baud rate set to 115200 in firmware
6. ✓ Correct Serial port (Serial1 for Motor 0, etc.)

### Motor Gets Hot

**This is normal if:**
- Motor is enabled (holding torque)
- Current setting is high

**Reduce current:**
```
CURRENT 400   // Lower from default 600mA
```

**Add cooling:**
- Heatsink on TMC2209 chip
- Active cooling fan

### Inconsistent Motion / Skipped Steps

**Check:**
1. ✓ Power supply adequate (voltage drooping under load?)
2. ✓ Speed not too high for motor (try lower speed)
3. ✓ Mechanical binding or excessive load
4. ✓ Increase current: `CURRENT 800`
5. ✓ Check microstepping setting (higher = smoother but weaker)

### USB Connection Issues

**Check:**
1. ✓ USB cable is data cable (not charge-only)
2. ✓ Arduino appears in Device Manager / System Report
3. ✓ No other program using the serial port
4. ✓ Using Chrome or Edge browser (Web Serial API)

---

## Safety Notes

⚠️ **Important Safety Information:**

1. **Never hot-plug!** Power off before connecting/disconnecting
2. **Check polarity** on power supply connections
3. **Don't exceed voltage ratings** (24V max for most TMC2209 modules)
4. **Ensure adequate cooling** for high-current applications
5. **Use proper wire gauge** for motor power (20-22 AWG minimum)
6. **Isolate motor power** from Arduino logic power
7. **Fuse protection recommended** on power supply

---

## Quick Reference

### Minimal Working Connection (Motor 0)

```
Power (12-24V):  + → VS,  - → GND (and Arduino GND)
Arduino 5V:      → VCC
Arduino GND:     → GND (common ground!)
Arduino Pin 2:   → STEP
Arduino Pin 5:   → DIR
Arduino Pin 8:   → EN
Arduino Pin 18:  → RX (on TMC)
Arduino Pin 19:  → TX (on TMC)
TMC PDN:         → 5V (HIGH)
TMC UART:        → GND (LOW)
Motor:           → 1A, 1B, 2A, 2B
```

### Testing Procedure

1. Wire as above
2. Upload firmware
3. Open web UI
4. Send: `ENABLE 1`
5. Send: `STATUS` (verify communication)
6. Send: `SPEED 200`
7. Send: `CONT 200` (motor should spin)
8. Send: `STOP`
9. Send: `DIR REV`
10. Send: `CONT 200` (should reverse)

---

## See Also

- [Firmware Documentation](../firmware/motor-controller/README.md)
- [Protocol Specification](PROTOCOL.md)
- [TMC2209 Datasheet](https://www.trinamic.com/fileadmin/assets/Products/ICs_Documents/TMC2209_Datasheet_V103.pdf)
- [Arduino Mega Pinout](https://content.arduino.cc/assets/Pinout-Mega2560rev3_latest.pdf)
