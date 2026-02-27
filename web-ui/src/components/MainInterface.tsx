import { useState, useEffect } from 'react';
import { connectionService } from '../services/ConnectionService';
import { useWindingState } from '../hooks/useWindingState';
import { WindingStatus } from './WindingStatus';

const STORAGE_KEY = 'rewinder-settings';

interface Settings {
  spoolSpeed: number;
  guideSpeed: number;
  guideTravel: number;
}

const defaultSettings: Settings = {
  spoolSpeed: 700,
  guideSpeed: 300,
  guideTravel: 7500,
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

function formatSteps(steps: number): string {
  if (steps >= 1_000_000) return `${(steps / 1_000_000).toFixed(1)}M`;
  if (steps >= 1_000) return `${(steps / 1_000).toFixed(1)}k`;
  return `${steps}`;
}

export function MainInterface() {
  const initialSettings = loadSettings();

  const [connected, setConnected] = useState(false);
  const [spoolSpeed, setSpoolSpeed] = useState(initialSettings.spoolSpeed);
  const [guideSpeed, setGuideSpeed] = useState(initialSettings.guideSpeed);
  const [guideTravel, setGuideTravel] = useState(initialSettings.guideTravel);

  const { state, actions, estimatedPosition, spoolSteps, showLimitWarning, isPauseInProgress } =
    useWindingState(spoolSpeed, guideSpeed, guideTravel);

  const { mode } = state;
  const isRunning = mode === 'running';
  const isPaused = mode === 'paused';
  const isResetting = mode === 'resetting';
  const isIdle = mode === 'idle';

  useEffect(() => {
    const unsub = connectionService.onStatusChange((status) => {
      setConnected(status);
    });
    return unsub;
  }, []);

  const updateSpoolSpeed = (newSpeed: number) => {
    setSpoolSpeed(newSpeed);
    saveSettings({ spoolSpeed: newSpeed, guideSpeed, guideTravel });
  };

  const updateGuideSpeed = (newSpeed: number) => {
    setGuideSpeed(newSpeed);
    saveSettings({ spoolSpeed, guideSpeed: newSpeed, guideTravel });
  };

  const updateGuideTravel = (newTravel: number) => {
    setGuideTravel(newTravel);
    saveSettings({ spoolSpeed, guideSpeed, guideTravel: newTravel });
  };

  // --- Emulator controls ---
  const isEmulated = (connectionService as any).isEmulated;
  const triggerLimitSwitch = () => {
    if (isEmulated) {
      const emulator = (connectionService as any).emulator;
      emulator.triggerLimitSwitch(!state.limitSwitch.pressed);
    }
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

      {/* Controls panel */}
      {connected && (
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-4 shadow-xl space-y-3">
          {/* Limit Switch Warning Banner */}
          {showLimitWarning && (
            <div className="bg-amber-500/15 border border-amber-500/40 rounded-xl p-3">
              <p className="text-amber-200 text-sm font-medium mb-2">
                Limit switch state changed while paused. Guide motor position may be unknown.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => { actions.dismissLimitWarning(); actions.reset(); }}
                  className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold transition-all"
                >
                  Re-Home First
                </button>
                <button
                  onClick={actions.resumeAnyway}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/80 rounded-lg text-xs font-semibold transition-all"
                >
                  Resume Anyway
                </button>
              </div>
            </div>
          )}

          {/* Buttons + status */}
          <div className="flex items-center gap-3">
            {/* Idle state: Start + Reset */}
            {isIdle && (
              <>
                <button
                  onClick={actions.start}
                  className="px-6 py-2.5 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg bg-green-500 hover:bg-green-600 text-white"
                >
                  Start
                </button>
                <button
                  onClick={actions.reset}
                  className="px-6 py-2.5 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg bg-orange-500 hover:bg-orange-600 text-white"
                >
                  Reset Guide
                </button>
              </>
            )}

            {/* Running state: Pause + Stop */}
            {isRunning && (
              <>
                <button
                  onClick={actions.pause}
                  disabled={isPauseInProgress}
                  className="px-6 py-2.5 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed bg-amber-500 hover:bg-amber-600 text-white"
                >
                  {isPauseInProgress ? 'Pausing...' : 'Pause'}
                </button>
                <button
                  onClick={actions.stop}
                  className="px-6 py-2.5 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg bg-red-500 hover:bg-red-600 text-white"
                >
                  Stop
                </button>
              </>
            )}

            {/* Paused state: Resume + Stop + Reset */}
            {isPaused && !showLimitWarning && (
              <>
                <button
                  onClick={actions.resume}
                  className="px-6 py-2.5 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg bg-green-500 hover:bg-green-600 text-white"
                >
                  Resume
                </button>
                <button
                  onClick={actions.stop}
                  className="px-6 py-2.5 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg bg-red-500 hover:bg-red-600 text-white"
                >
                  Stop
                </button>
                <button
                  onClick={actions.reset}
                  className="px-6 py-2.5 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg bg-orange-500 hover:bg-orange-600 text-white"
                >
                  Reset Guide
                </button>
              </>
            )}

            {/* Resetting state: Stop Reset */}
            {isResetting && (
              <button
                onClick={actions.stopReset}
                className="px-6 py-2.5 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg bg-yellow-500 hover:bg-yellow-600 text-white"
              >
                Stop Reset
              </button>
            )}

            {/* Emulator: Limit Switch Toggle */}
            {isEmulated && (
              <button
                onClick={triggerLimitSwitch}
                className={`ml-1 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                  state.limitSwitch.pressed
                    ? 'bg-green-500/20 border-green-500/50 text-green-300 hover:bg-green-500/30'
                    : 'bg-white/5 border-white/20 text-white/50 hover:bg-white/10'
                }`}
                title="Simulate limit switch toggle"
              >
                {state.limitSwitch.pressed ? 'Release Limit' : 'Press Limit'}
              </button>
            )}

            {/* Status text */}
            <span className="text-white/50 text-sm ml-auto">
              {isResetting
                ? 'Homing guide...'
                : isRunning
                ? 'Winding...'
                : isPaused
                ? 'Paused'
                : 'Ready'}
            </span>
          </div>
        </div>
      )}

      {/* Motor Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Spool Speed Control */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-semibold text-white">Spool</h3>
            {(isRunning || isPaused) && (
              <span className="text-white/40 font-mono text-sm">
                {formatSteps(spoolSteps)} steps
              </span>
            )}
          </div>
          <p className="text-white/60 text-sm mb-4">Motor 0 - Main winding spool</p>

          {/* Spool activity indicator */}
          {(isRunning || isPaused) && (
            <div className="mb-4">
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${
                  isRunning
                    ? 'bg-blue-400/60 animate-pulse w-full'
                    : 'bg-amber-400/40 w-full'
                }`} />
              </div>
              <div className="flex justify-between mt-1">
                <span className={`text-[10px] ${isRunning ? 'text-blue-300/50' : 'text-amber-300/40'}`}>
                  REV {spoolSpeed}/s
                </span>
                <span className="text-white/20 text-[10px]">continuous</span>
              </div>
            </div>
          )}

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
              max="10000"
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-center font-mono disabled:opacity-50"
            />
          </div>
        </div>

        {/* Guide Control */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-semibold text-white">Guide</h3>
            {/* Limit switch indicator */}
            <div className="flex items-center gap-1.5">
              {state.limitSwitch.changedWhilePaused && isPaused ? (
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
              ) : (
                <div className={`w-2.5 h-2.5 rounded-full transition-all ${
                  state.limitSwitch.pressed
                    ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]'
                    : 'bg-white/15'
                }`} />
              )}
              <span className="text-white/40 text-xs">
                {state.limitSwitch.pressed ? 'Home' : 'Limit'}
              </span>
            </div>
          </div>
          <p className="text-white/60 text-sm mb-4">Motor 1 - Fiber guide (oscillating)</p>

          {/* Guide shuttle visualization */}
          <WindingStatus
            state={state}
            estimatedPosition={estimatedPosition}
            guideTravel={guideTravel}
          />

          <div className="space-y-5 mt-4">
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
                max="10000"
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
