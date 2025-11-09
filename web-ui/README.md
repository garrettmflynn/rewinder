# Rewinder Web Controller

Modern web-based interface for controlling TMC2209 stepper motors via Web Serial API.

Built with **Vite**, **React**, **TypeScript**, and **Tailwind CSS**.

## Features

- 🔌 **Web Serial API** - Direct USB communication from browser
- ⚙️ **Complete Motor Control**
  - Enable/Disable motor
  - Forward/Reverse direction
  - Speed control (steps/second)
  - Move by specific steps
  - Continuous motion
  - Jog controls (+100/-100 steps)
  - Microstep configuration (1-256)
  - Current setting (100-2000mA)
  - Real-time status monitoring

- 🎛️ **Multi-Motor Ready**
  - Architecture supports up to 4 motors
  - Motor selector UI (currently motor 0 only)
  - Commands automatically routed to selected motor
  - Prepared for future multi-motor firmware

- 💬 **Real-Time Console**
  - Live serial communication log
  - Send raw commands
  - Timestamp for all messages
  - Direction indicators (→ sent, ← received)
  - JSON response parsing

- 🎨 **Modern UI**
  - Responsive design
  - Beautiful gradient background
  - Card-based layout with shadows
  - Animated connection indicator
  - Color-coded controls

## Browser Compatibility

The Web Serial API requires a Chromium-based browser:

- ✅ Google Chrome (89+)
- ✅ Microsoft Edge (89+)
- ✅ Opera (75+)
- ❌ Firefox (not supported)
- ❌ Safari (not supported)

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A compatible browser (Chrome/Edge recommended)
- Arduino with motor controller firmware

### Installation

```bash
cd web-ui
npm install
```

### Development

Run the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

Built files will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
web-ui/
├── src/
│   ├── components/
│   │   ├── ConnectionBar.tsx    # Serial connection & motor selector
│   │   ├── MotionControl.tsx    # Motor control interface
│   │   └── Console.tsx          # Serial communication console
│   ├── services/
│   │   └── SerialService.ts     # Web Serial API wrapper
│   ├── types/
│   │   ├── index.ts             # TypeScript type definitions
│   │   └── serial.d.ts          # Web Serial API types
│   ├── App.tsx                  # Main application
│   ├── main.tsx                 # Entry point
│   └── index.css                # Global styles
├── public/                      # Static assets
├── index.html                   # HTML template
├── package.json                 # Dependencies
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript configuration
└── tailwind.config.js          # Tailwind CSS configuration
```

## Usage

### Connecting to Hardware

1. Upload the motor controller firmware to your Arduino
2. Open the web interface in Chrome/Edge
3. Click the **Connect** button
4. Select your Arduino device from the serial port list
5. Grant permission to access the serial port

### Controlling Motors

#### Basic Controls

- **Enable/Disable** - Activate or deactivate motor holding torque
- **FWD/REV** - Set rotation direction
- **Speed** - Configure steps per second (1-20,000)

#### Motion Commands

- **Move** - Move a specific number of steps
  - Enter step count
  - Optionally uses current speed setting
- **Continuous** - Run motor continuously at specified speed
  - Enter desired speed
  - Click Start
  - Click Stop to halt
- **Jog** - Quick +100/-100 step movements

#### Configuration

- **Microsteps** - Set microstepping resolution (1-256)
- **Current** - Set motor current in mA (100-2000)
- **STATUS** - Request current motor state

### Using the Console

Send raw commands directly:

```
ENABLE 1
SPEED 500
MOVE 1000
M1 ENABLE 1
ALL STATUS
```

See [Protocol Documentation](../docs/PROTOCOL.md) for complete command reference.

## Multi-Motor Support

The web UI is architecturally prepared for multi-motor control:

### Current State

- Motor selector UI present (motor 0 active)
- SerialService supports motor addressing
- Commands automatically route to selected motor
- Future motors shown as disabled options

### Future Enhancement

When multi-motor firmware is deployed:

1. Enable motor options 1-3 in ConnectionBar
2. Set active motor via dropdown
3. All commands automatically prefix with motor ID
4. No other code changes required

### Developer Notes

The `SerialService` class handles motor addressing:

```typescript
// Automatically adds motor prefix if needed
serialService.setActiveMotor(1);
await serialService.send('ENABLE 1');
// Sends: "M1 ENABLE 1"

// Motor 0 uses backward-compatible format
serialService.setActiveMotor(0);
await serialService.send('ENABLE 1');
// Sends: "ENABLE 1"
```

## Customization

### Styling

Edit `src/index.css` to change the gradient background:

```css
body {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

### Adding Commands

Add new buttons in `MotionControl.tsx`:

```tsx
<button onClick={() => send('MYCMD 123')}>
  Custom Command
</button>
```

### Extending Status Display

Parse JSON status in `Console.tsx`:

```typescript
serialService.onMessage((content) => {
  try {
    const status = JSON.parse(content);
    // Handle status update
  } catch {
    // Regular message
  }
});
```

## Troubleshooting

### Can't Connect to Device

- Ensure you're using Chrome or Edge
- Check that the Arduino is connected via USB
- Verify the firmware is running (check Arduino Serial Monitor)
- Try a different USB port or cable

### Web Serial API Not Available

- Update your browser to the latest version
- Check `navigator.serial` exists in browser console
- Ensure you're using HTTPS (required except for localhost)

### Commands Not Working

- Open browser console (F12) to see errors
- Verify firmware is responding (use Arduino Serial Monitor)
- Check baud rate is 115200
- Ensure motor is enabled before motion commands

### Build Errors

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Development

### Adding a New Component

```tsx
// src/components/MyComponent.tsx
import { serialService } from '../services/SerialService';

export function MyComponent() {
  const handleAction = async () => {
    await serialService.send('MYCOMMAND');
  };

  return (
    <button onClick={handleAction}>
      Do Something
    </button>
  );
}
```

### TypeScript Types

Extend types in `src/types/index.ts`:

```typescript
export interface MotorStatus {
  motor: number;
  enabled: number;
  // Add more fields...
}
```

## Performance

- Vite provides instant HMR (Hot Module Replacement)
- Production build is optimized and tree-shaken
- Tailwind CSS purges unused styles
- Serial communication is non-blocking

## See Also

- [Protocol Documentation](../docs/PROTOCOL.md)
- [Firmware Documentation](../firmware/motor-controller/README.md)
- [Web Serial API Docs](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)

## License

MIT
