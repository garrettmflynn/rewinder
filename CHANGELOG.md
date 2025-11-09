# Changelog

## [Unreleased] - 2025-11-09

### Added
- **Auto-Reconnect Functionality**
  - Web UI automatically reconnects to previously authorized Arduino devices on page load
  - Visual feedback during reconnection with yellow pulsing indicator
  - Status messages show reconnection progress
  - No need to manually select device after first authorization

- **Multi-Motor Architecture**
  - Modular `MotorDriver` class for clean code organization
  - Support for 1-4 motors with simple configuration
  - Motor addressing protocol (M0-M3, ALL)
  - Backward compatible with single-motor commands
  - Web UI prepared for multi-motor control

- **Comprehensive Documentation**
  - Complete wiring guide with pinouts and diagrams (docs/WIRING.md)
  - Complete protocol specification (docs/PROTOCOL.md)
  - Firmware guide with setup instructions
  - Web UI documentation
  - Project overview and quick start guide

- **Improved Repository Structure**
  - Separated firmware and web-ui into clear directories
  - Example firmware in firmware/examples/
  - Professional organization for multi-component project

### Changed
- **Firmware Improvements**
  - Refactored monolithic code into MotorDriver class
  - Better error handling and validation
  - Consistent JSON response format
  - Enhanced status reporting

- **Web UI Enhancements**
  - Updated SerialService with autoreconnect support
  - Connection status shows reconnection progress
  - Motor selector UI (currently motor 0 only)
  - Better TypeScript type definitions
  - Improved error handling

### Removed
- Legacy backup directories (WebSerialSingleMotor, DriverTest, etc.)
- Redundant code and files
- Unnecessary gitignore entries

### Technical Details

#### Auto-Reconnect Implementation
```typescript
// SerialService now includes:
- autoReconnect(): Promise<boolean>
- onAutoReconnectStatus(callback)
- Automatic reconnect attempt on page load
- Uses navigator.serial.getPorts() to find authorized devices
```

#### Multi-Motor Support
```cpp
// Firmware configuration:
#define NUM_MOTORS 1  // Set to 1-4

// Command examples:
ENABLE 1          // Motor 0 (backward compatible)
M1 SPEED 500      // Motor 1
ALL STATUS        // All motors
```

### Migration Guide

#### For Existing Users
No changes required! The new firmware is fully backward compatible:
- All existing commands work unchanged
- Motor 0 is the default (no prefix needed)
- Auto-reconnect is opt-in (browser permission)

#### To Enable Multi-Motor
1. Wire additional TMC2209 modules to Serial2/3/4
2. Set `NUM_MOTORS` in firmware configuration
3. Uncomment motor pin definitions
4. Upload updated firmware
5. Enable motor options in web UI (remove `disabled` attribute)

### Browser Compatibility
- Chrome 89+ (Web Serial API)
- Edge 89+
- Opera 75+
- Auto-reconnect requires user permission (one-time)

### Known Issues
- None

### Future Enhancements
- [ ] Multi-motor UI fully enabled
- [ ] Choreographed multi-motor movements
- [ ] Configuration persistence (EEPROM)
- [ ] Homing and limit switch support
- [ ] Advanced motion profiles
