# Single Motor Example

This is the original single-motor controller firmware, preserved for reference and backward compatibility.

## Description

A simple, monolithic implementation for controlling a single TMC2209 stepper motor driver via USB serial.

## Features

- All code in one file
- Simple command parser
- Non-blocking step generation
- JSON responses
- No motor addressing (single motor only)

## Usage

This example is useful for:
- Learning the basics
- Testing a single motor setup
- Minimal firmware footprint
- Quick prototyping

## Migrating to Multi-Motor

For multi-motor support, use the main `motor-controller` firmware instead. It offers:
- Modular architecture
- Support for 1-4 motors
- Motor addressing (M0-M3)
- Cleaner code organization
- Same commands (backward compatible)

See: `firmware/motor-controller/README.md`

## Commands

All standard commands work without motor ID prefix:

```
ENABLE 1
SPEED 500
MOVE 1000
STOP
STATUS
```

See [Protocol Documentation](../../../docs/PROTOCOL.md) for details.
