import { useState, useRef, useEffect, useCallback } from 'react';
import { connectionService } from '../services/ConnectionService';
import { createWindingState, type WindingState, type SystemMode } from '../services/WindingState';

const RESET_SPEED = 400;
const STATUS_TIMEOUT = 500;
const POSITION_UPDATE_INTERVAL = 100;

interface MotorStatusResponse {
  motor: number;
  stepsRemaining: number;
  moving: number;
  [key: string]: unknown;
}

export interface WindingActions {
  start: () => void;
  pause: () => Promise<void>;
  resume: () => void;
  resumeAnyway: () => void;
  stop: () => void;
  reset: () => void;
  stopReset: () => void;
  dismissLimitWarning: () => void;
}

export interface UseWindingStateResult {
  state: WindingState;
  actions: WindingActions;
  estimatedPosition: number;
  spoolSteps: number;
  showLimitWarning: boolean;
  isPauseInProgress: boolean;
}

export function useWindingState(
  spoolSpeed: number,
  guideSpeed: number,
  guideTravel: number,
): UseWindingStateResult {
  const [state, setState] = useState<WindingState>(createWindingState);
  const [estimatedPosition, setEstimatedPosition] = useState(0);
  const [spoolSteps, setSpoolSteps] = useState(0);
  const [showLimitWarning, setShowLimitWarning] = useState(false);
  const [isPauseInProgress, setIsPauseInProgress] = useState(false);

  // Refs for values needed in callbacks/timers
  const stateRef = useRef(state);
  const spoolSpeedRef = useRef(spoolSpeed);
  const guideSpeedRef = useRef(guideSpeed);
  const guideTravelRef = useRef(guideTravel);
  const oscillationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const positionTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const legStartTime = useRef<number>(0);
  const legDirection = useRef<'FWD' | 'REV'>('FWD');
  const legStepsTotal = useRef(0);
  const legSpeedAtStart = useRef(guideSpeed); // speed baked into the current MOVE command
  const legStepsOffset = useRef(0); // steps already completed before this segment (for resume)
  const spoolTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const spoolStepsRef = useRef(0); // accumulated spool steps (persists across pause/resume)

  // Keep refs in sync
  stateRef.current = state;
  spoolSpeedRef.current = spoolSpeed;
  guideSpeedRef.current = guideSpeed;
  guideTravelRef.current = guideTravel;

  const updateState = useCallback((updates: Partial<WindingState> | ((prev: WindingState) => Partial<WindingState>)) => {
    setState(prev => {
      const partial = typeof updates === 'function' ? updates(prev) : updates;
      return { ...prev, ...partial };
    });
  }, []);

  const updateMode = useCallback((mode: SystemMode) => {
    updateState({ mode });
  }, [updateState]);

  const sendToMotor = useCallback(async (motorId: number, command: string) => {
    try {
      await connectionService.send(command, motorId);
    } catch (error) {
      console.error('Send error:', error);
    }
  }, []);

  /** Query STATUS for a motor. Returns stepsRemaining or 0 on timeout. */
  const queryMotorStatus = useCallback((motorId: number): Promise<MotorStatusResponse | null> => {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        unsub();
        resolve(null);
      }, STATUS_TIMEOUT);

      const unsub = connectionService.onMessage((message) => {
        try {
          const data = JSON.parse(message);
          if (typeof data.stepsRemaining === 'number' && data.motor === motorId) {
            clearTimeout(timeout);
            unsub();
            resolve(data as MotorStatusResponse);
          }
        } catch {
          // Not JSON
        }
      });

      sendToMotor(motorId, 'STATUS');
    });
  }, [sendToMotor]);

  // --- Position estimation ---
  const startPositionEstimation = useCallback(() => {
    if (positionTimer.current) clearInterval(positionTimer.current);
    positionTimer.current = setInterval(() => {
      const elapsed = Date.now() - legStartTime.current;
      // Use the speed from leg start — that's what the firmware is actually running at
      const totalTime = (legStepsTotal.current / legSpeedAtStart.current) * 1000;
      if (totalTime > 0) {
        const progress = Math.min(1, elapsed / totalTime);
        const stepsCompleted = Math.round(progress * legStepsTotal.current);
        setEstimatedPosition(legStepsOffset.current + stepsCompleted);
      }
    }, POSITION_UPDATE_INTERVAL);
  }, []);

  const stopPositionEstimation = useCallback(() => {
    if (positionTimer.current) {
      clearInterval(positionTimer.current);
      positionTimer.current = null;
    }
  }, []);

  // --- Spool step counting ---
  const startSpoolCounting = useCallback(() => {
    if (spoolTimer.current) clearInterval(spoolTimer.current);
    spoolTimer.current = setInterval(() => {
      const increment = Math.round(spoolSpeedRef.current * (POSITION_UPDATE_INTERVAL / 1000));
      spoolStepsRef.current += increment;
      setSpoolSteps(spoolStepsRef.current);
    }, POSITION_UPDATE_INTERVAL);
  }, []);

  const stopSpoolCounting = useCallback(() => {
    if (spoolTimer.current) {
      clearInterval(spoolTimer.current);
      spoolTimer.current = null;
    }
  }, []);

  // --- Oscillation loop ---
  const startOscillationLeg = useCallback((direction: 'FWD' | 'REV', steps: number, legCount: number) => {
    const speed = guideSpeedRef.current;
    const travel = steps > 0 ? steps : guideTravelRef.current;

    legDirection.current = direction;
    legStepsTotal.current = travel;
    legSpeedAtStart.current = speed;
    legStepsOffset.current = 0;
    legStartTime.current = Date.now();

    setState(prev => ({
      ...prev,
      oscillation: {
        direction,
        stepsTotal: travel,
        stepsRemaining: travel,
        legCount,
      },
    }));

    setEstimatedPosition(0);

    sendToMotor(1, `SPEED ${speed}`);
    sendToMotor(1, `DIR ${direction}`);
    sendToMotor(1, `MOVE ${travel} ${speed}`);

    startPositionEstimation();

    const moveTime = (travel / speed) * 1000 + 100;
    oscillationTimer.current = setTimeout(() => {
      if (stateRef.current.mode !== 'running') return;
      const nextDir = direction === 'FWD' ? 'REV' : 'FWD';
      startOscillationLeg(nextDir, guideTravelRef.current, legCount + 1);
    }, moveTime);
  }, [sendToMotor, startPositionEstimation]);

  const startOscillationLoop = useCallback((startDirection: 'FWD' | 'REV' = 'FWD', initialLegCount = 0) => {
    startOscillationLeg(startDirection, guideTravelRef.current, initialLegCount);
  }, [startOscillationLeg]);

  const clearOscillation = useCallback(() => {
    if (oscillationTimer.current) {
      clearTimeout(oscillationTimer.current);
      oscillationTimer.current = null;
    }
    stopPositionEstimation();
  }, [stopPositionEstimation]);

  // --- Actions ---

  const start = useCallback(() => {
    if (!connectionService.isConnected()) return;

    updateMode('running');

    sendToMotor(0, 'ENABLE 1');
    sendToMotor(1, 'ENABLE 1');
    sendToMotor(0, 'DIR REV');
    sendToMotor(0, `CONT ${spoolSpeedRef.current}`);

    startSpoolCounting();
    startOscillationLoop('FWD', 0);
  }, [updateMode, sendToMotor, startOscillationLoop, startSpoolCounting]);

  const pause = useCallback(async () => {
    if (stateRef.current.mode !== 'running') return;

    setIsPauseInProgress(true);

    // 1. Stop scheduling new oscillation legs and spool counting
    clearOscillation();
    stopSpoolCounting();

    // 2. Query STATUS for Motor 1 while still moving
    const status = await queryMotorStatus(1);
    const stepsRemaining = status?.stepsRemaining ?? 0;

    // 3. Now send STOP to both motors
    await sendToMotor(0, 'STOP');
    await sendToMotor(1, 'STOP');

    // 4. Capture state
    setState(prev => ({
      ...prev,
      mode: 'paused' as SystemMode,
      oscillation: {
        ...prev.oscillation,
        stepsRemaining,
      },
      limitSwitch: {
        ...prev.limitSwitch,
        pressedAtPause: prev.limitSwitch.pressed,
        changedWhilePaused: false,
      },
      pauseTimestamp: Date.now(),
    }));

    setShowLimitWarning(false);
    setIsPauseInProgress(false);
  }, [clearOscillation, stopSpoolCounting, queryMotorStatus, sendToMotor]);

  const doResume = useCallback(() => {
    if (stateRef.current.mode !== 'paused') return;

    const { oscillation } = stateRef.current;
    updateMode('running');

    // Re-enable motors
    sendToMotor(0, 'ENABLE 1');
    sendToMotor(1, 'ENABLE 1');

    // Restart spool
    sendToMotor(0, 'DIR REV');
    sendToMotor(0, `CONT ${spoolSpeedRef.current}`);
    startSpoolCounting();

    // Cap remaining steps to current travel setting
    const remaining = Math.min(oscillation.stepsRemaining, guideTravelRef.current);

    if (remaining > 0) {
      // Complete partial leg, then continue oscillation loop
      const speed = guideSpeedRef.current;
      const fullTravel = guideTravelRef.current;
      legDirection.current = oscillation.direction;
      legStepsTotal.current = remaining;
      legSpeedAtStart.current = speed;
      legStepsOffset.current = fullTravel - remaining; // pick up from where we paused
      legStartTime.current = Date.now();
      setEstimatedPosition(fullTravel - remaining);

      sendToMotor(1, `SPEED ${speed}`);
      sendToMotor(1, `DIR ${oscillation.direction}`);
      sendToMotor(1, `MOVE ${remaining} ${speed}`);

      startPositionEstimation();

      const moveTime = (remaining / speed) * 1000 + 100;
      oscillationTimer.current = setTimeout(() => {
        if (stateRef.current.mode !== 'running') return;
        const nextDir = oscillation.direction === 'FWD' ? 'REV' : 'FWD';
        startOscillationLeg(nextDir, guideTravelRef.current, oscillation.legCount + 1);
      }, moveTime);
    } else {
      // Start fresh from next direction
      const nextDir = oscillation.direction === 'FWD' ? 'REV' : 'FWD';
      startOscillationLoop(nextDir, oscillation.legCount);
    }

    setState(prev => ({ ...prev, pauseTimestamp: null }));
    setShowLimitWarning(false);
  }, [updateMode, sendToMotor, startPositionEstimation, startOscillationLeg, startOscillationLoop, startSpoolCounting]);

  const resume = useCallback(() => {
    if (stateRef.current.limitSwitch.changedWhilePaused) {
      setShowLimitWarning(true);
      return;
    }
    doResume();
  }, [doResume]);

  const resumeAnyway = useCallback(() => {
    setShowLimitWarning(false);
    doResume();
  }, [doResume]);

  const stop = useCallback(() => {
    clearOscillation();
    stopSpoolCounting();
    updateState({
      ...createWindingState(),
      limitSwitch: {
        pressed: stateRef.current.limitSwitch.pressed,
        pressedAtPause: false,
        changedWhilePaused: false,
      },
    });
    setEstimatedPosition(0);
    spoolStepsRef.current = 0;
    setSpoolSteps(0);
    setShowLimitWarning(false);
    setIsPauseInProgress(false);

    sendToMotor(0, 'STOP');
    sendToMotor(1, 'STOP');
  }, [clearOscillation, stopSpoolCounting, updateState, sendToMotor]);

  const reset = useCallback(() => {
    if (!connectionService.isConnected()) return;
    if (stateRef.current.mode === 'running') return;

    // If paused, stop first
    if (stateRef.current.mode === 'paused') {
      clearOscillation();
      sendToMotor(0, 'STOP');
    }

    updateMode('resetting');
    sendToMotor(1, 'ENABLE 1');
    sendToMotor(1, 'DIR REV');
    sendToMotor(1, `CONT ${RESET_SPEED}`);
  }, [updateMode, sendToMotor, clearOscillation]);

  const stopReset = useCallback(() => {
    sendToMotor(1, 'STOP');
    updateMode('idle');
  }, [sendToMotor, updateMode]);

  const dismissLimitWarning = useCallback(() => {
    setShowLimitWarning(false);
  }, []);

  // --- Message listener ---
  useEffect(() => {
    const unsubMessage = connectionService.onMessage((message) => {
      try {
        const data = JSON.parse(message);

        // HOME event
        if (data.event === 'HOME' && data.motor === 1) {
          const currentMode = stateRef.current.mode;
          if (currentMode === 'resetting') {
            // Homing complete — go back to paused if we were paused before, else idle
            updateMode(stateRef.current.pauseTimestamp ? 'paused' : 'idle');
          } else if (currentMode === 'running') {
            // Unexpected limit switch hit during winding — auto-pause
            clearOscillation();
            sendToMotor(0, 'STOP');
            setState(prev => ({
              ...prev,
              mode: 'paused' as SystemMode,
              limitSwitch: { ...prev.limitSwitch, pressed: true, changedWhilePaused: true },
              pauseTimestamp: Date.now(),
            }));
            setShowLimitWarning(true);
          }
        }

        // Limit switch state update
        if (typeof data.limitSwitch === 'boolean') {
          setState(prev => {
            const newState = { ...prev, limitSwitch: { ...prev.limitSwitch, pressed: data.limitSwitch } };
            // Track changes while paused
            if (prev.mode === 'paused' && data.limitSwitch !== prev.limitSwitch.pressedAtPause) {
              newState.limitSwitch.changedWhilePaused = true;
            }
            return newState;
          });
        }
      } catch {
        // Not JSON
      }
    });

    const unsubStatus = connectionService.onStatusChange((connected) => {
      if (!connected && stateRef.current.mode !== 'idle') {
        clearOscillation();
        stopSpoolCounting();
        setState(prev => ({
          ...createWindingState(),
          limitSwitch: { ...prev.limitSwitch, pressed: false, pressedAtPause: false, changedWhilePaused: false },
        }));
        setEstimatedPosition(0);
        spoolStepsRef.current = 0;
        setSpoolSteps(0);
        setShowLimitWarning(false);
        setIsPauseInProgress(false);
      }
    });

    return () => {
      unsubMessage();
      unsubStatus();
      clearOscillation();
      stopSpoolCounting();
    };
  }, [updateMode, clearOscillation, stopSpoolCounting, sendToMotor]);

  // Update spool speed live while running
  useEffect(() => {
    if (state.mode === 'running') {
      sendToMotor(0, `CONT ${spoolSpeed}`);
    }
  }, [spoolSpeed, state.mode, sendToMotor]);

  return {
    state,
    actions: { start, pause, resume, resumeAnyway, stop, reset, stopReset, dismissLimitWarning },
    estimatedPosition,
    spoolSteps,
    showLimitWarning,
    isPauseInProgress,
  };
}
