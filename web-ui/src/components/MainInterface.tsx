import { useState, useEffect, useRef } from 'react';
import { serialService } from '../services/SerialService';

const STORAGE_KEY = 'rewinder-settings';

interface Settings {
  spoolSpeed: number;
  guideSpeed: number;
  guideTravel: number;
}

const defaultSettings: Settings = {
  spoolSpeed: 500,
  guideSpeed: 300,
  guideTravel: 1000,
};

function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return defaultSettings;
}

function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

export function MainInterface() {
  const initialSettings = loadSettings();

  const [isRunning, setIsRunning] = useState(false);
  const [connected, setConnected] = useState(false);
  const [spoolSpeed, setSpoolSpeed] = useState(initialSettings.spoolSpeed);
  const [guideSpeed, setGuideSpeed] = useState(initialSettings.guideSpeed);
  const [guideTravel, setGuideTravel] = useState(initialSettings.guideTravel);

  const oscillationRef = useRef<NodeJS.Timeout | null>(null);
  const directionRef = useRef<'FWD' | 'REV'>('FWD');
  const isRunningRef = useRef(false);

  useEffect(() => {
    const unsubStatus = serialService.onStatusChange((status) => {
      setConnected(status);
      if (!status) {
        stopAll();
      }
    });

    return () => {
      unsubStatus();
      if (oscillationRef.current) {
        clearTimeout(oscillationRef.current);
      }
    };
  }, []);

  const sendToMotor = async (motorId: number, command: string) => {
    try {
      await serialService.send(command, motorId);
    } catch (error) {
      console.error('Send error:', error);
    }
  };

  const startOscillation = (speed: number, travel: number) => {
    const oscillate = async () => {
      if (!isRunningRef.current) return;

      // Set direction and move
      await sendToMotor(1, `DIR ${directionRef.current}`);
      await sendToMotor(1, `MOVE ${travel} ${speed}`);

      // Toggle direction for next cycle
      directionRef.current = directionRef.current === 'FWD' ? 'REV' : 'FWD';

      // Calculate time for move to complete (with buffer)
      const moveTime = (travel / speed) * 1000 + 100;

      oscillationRef.current = setTimeout(() => {
        oscillate();
      }, moveTime);
    };

    oscillate();
  };

  const handleStart = async () => {
    if (!connected) return;

    isRunningRef.current = true;
    setIsRunning(true);

    // Enable both motors
    await sendToMotor(0, 'ENABLE 1');
    await sendToMotor(1, 'ENABLE 1');

    // Start spool motor (Motor 0) - continuous rotation
    await sendToMotor(0, `CONT ${spoolSpeed}`);

    // Start guide oscillation (Motor 1)
    directionRef.current = 'FWD';
    startOscillation(guideSpeed, guideTravel);
  };

  const stopAll = () => {
    isRunningRef.current = false;
    if (oscillationRef.current) {
      clearTimeout(oscillationRef.current);
      oscillationRef.current = null;
    }
    setIsRunning(false);
  };

  const handleStop = async () => {
    stopAll();

    // Stop both motors
    await sendToMotor(0, 'STOP');
    await sendToMotor(1, 'STOP');
  };

  const handleToggle = () => {
    if (isRunning) {
      handleStop();
    } else {
      handleStart();
    }
  };

  const updateSpoolSpeed = async (newSpeed: number) => {
    setSpoolSpeed(newSpeed);
    saveSettings({ spoolSpeed: newSpeed, guideSpeed, guideTravel });
    if (isRunning) {
      await sendToMotor(0, `CONT ${newSpeed}`);
    }
  };

  const updateGuideSpeed = (newSpeed: number) => {
    setGuideSpeed(newSpeed);
    saveSettings({ spoolSpeed, guideSpeed: newSpeed, guideTravel });
    // Speed will be applied on next oscillation cycle
  };

  const updateGuideTravel = (newTravel: number) => {
    setGuideTravel(newTravel);
    saveSettings({ spoolSpeed, guideSpeed, guideTravel: newTravel });
    // Travel will be applied on next oscillation cycle
  };

  return (
    <div className="space-y-6">
      {/* Connection Warning */}
      {!connected && (
        <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-4 text-center">
          <p className="text-yellow-200 font-medium">
            Not connected. Please connect using the button above.
          </p>
        </div>
      )}

      {/* Start/Stop Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleToggle}
          disabled={!connected}
          className={`px-6 py-2.5 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
            isRunning
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          {isRunning ? 'Stop' : 'Start'}
        </button>
        <span className="text-white/70 text-sm">
          {!connected
            ? 'Connect to device first'
            : isRunning
            ? 'Winding in progress...'
            : 'Ready to wind'}
        </span>
      </div>

      {/* Speed Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Spool Speed Control */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
          <h3 className="text-xl font-semibold text-white mb-2">Spool Speed</h3>
          <p className="text-white/60 text-sm mb-4">Motor 0 - Main winding spool</p>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-white/80 text-sm">Speed (steps/s)</span>
              <span className="text-white font-mono text-lg">{spoolSpeed}</span>
            </div>

            <input
              type="range"
              min="100"
              max="2000"
              step="50"
              value={spoolSpeed}
              onChange={(e) => updateSpoolSpeed(Number(e.target.value))}
              disabled={!connected}
              className="w-full h-3 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50"
            />

            <div className="flex justify-between text-white/50 text-xs">
              <span>Slow</span>
              <span>Fast</span>
            </div>

            <input
              type="number"
              value={spoolSpeed}
              onChange={(e) => updateSpoolSpeed(Number(e.target.value))}
              disabled={!connected}
              min="100"
              max="5000"
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-center font-mono disabled:opacity-50"
            />
          </div>
        </div>

        {/* Guide Control */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
          <h3 className="text-xl font-semibold text-white mb-2">Guide Control</h3>
          <p className="text-white/60 text-sm mb-4">Motor 1 - Fiber guide (oscillating)</p>

          <div className="space-y-5">
            {/* Guide Speed */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white/80 text-sm">Speed (steps/s)</span>
                <span className="text-white font-mono">{guideSpeed}</span>
              </div>

              <input
                type="range"
                min="50"
                max="1000"
                step="25"
                value={guideSpeed}
                onChange={(e) => updateGuideSpeed(Number(e.target.value))}
                disabled={!connected}
                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-500 disabled:opacity-50"
              />
            </div>

            {/* Guide Travel Distance */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white/80 text-sm">Travel (steps)</span>
                <span className="text-white font-mono">{guideTravel}</span>
              </div>

              <input
                type="range"
                min="100"
                max="5000"
                step="100"
                value={guideTravel}
                onChange={(e) => updateGuideTravel(Number(e.target.value))}
                disabled={!connected}
                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-500 disabled:opacity-50"
              />

              <div className="flex justify-between text-white/50 text-xs">
                <span>Short</span>
                <span>Long</span>
              </div>
            </div>

            {/* Numeric inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-white/50 text-xs block mb-1">Speed</label>
                <input
                  type="number"
                  value={guideSpeed}
                  onChange={(e) => updateGuideSpeed(Number(e.target.value))}
                  disabled={!connected}
                  min="50"
                  max="2000"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-center font-mono text-sm disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-white/50 text-xs block mb-1">Travel</label>
                <input
                  type="number"
                  value={guideTravel}
                  onChange={(e) => updateGuideTravel(Number(e.target.value))}
                  disabled={!connected}
                  min="100"
                  max="10000"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-center font-mono text-sm disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
