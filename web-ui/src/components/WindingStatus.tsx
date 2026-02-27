import type { WindingState } from '../services/WindingState';

interface WindingStatusProps {
  state: WindingState;
  estimatedPosition: number;
  guideTravel: number;
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

export function WindingStatus({ state, estimatedPosition, guideTravel }: WindingStatusProps) {
  const { mode, oscillation } = state;
  const isActive = mode === 'running' || mode === 'paused';

  // Guide position as a fraction of full travel
  const travel = guideTravel || 1;
  const progressFraction = Math.min(1, estimatedPosition / travel);

  // The shuttle moves left-to-right (FWD) or right-to-left (REV)
  const shuttlePosition = oscillation.direction === 'FWD'
    ? progressFraction
    : 1 - progressFraction;

  const pausedFor = state.pauseTimestamp
    ? formatElapsed(Date.now() - state.pauseTimestamp)
    : null;

  if (!isActive && mode !== 'resetting') {
    return null;
  }

  if (mode === 'resetting') {
    return (
      <div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-orange-400/40 rounded-full animate-pulse w-full" />
        </div>
        <div className="text-orange-300/50 text-[10px] mt-1 text-center">homing...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Shuttle track */}
      <div className="relative h-4 flex items-center">
        {/* Track background */}
        <div className="absolute inset-x-0 h-2 bg-white/5 rounded-full overflow-hidden">
          {/* Swept region */}
          <div
            className={`absolute top-0 h-full rounded-full transition-all duration-100 ${
              mode === 'running' ? 'bg-purple-500/20' : 'bg-amber-500/15'
            }`}
            style={
              oscillation.direction === 'FWD'
                ? { left: 0, width: `${shuttlePosition * 100}%` }
                : { right: 0, width: `${(1 - shuttlePosition) * 100}%` }
            }
          />
        </div>
        {/* Shuttle dot */}
        <div
          className={`absolute w-4 h-4 rounded-full transition-all duration-100 shadow-md ${
            mode === 'running'
              ? 'bg-purple-400 shadow-purple-400/40'
              : 'bg-amber-400 shadow-amber-400/40'
          }`}
          style={{ left: `calc(${shuttlePosition * 100}% - 8px)` }}
        />
      </div>

      {/* Labels */}
      <div className="flex justify-between items-center mt-1.5">
        <span className={`text-[10px] ${oscillation.direction === 'REV' ? 'text-purple-300/60' : 'text-white/20'}`}>
          REV
        </span>
        <span className="text-white/30 text-[10px] font-mono">
          {mode === 'paused' && pausedFor
            ? `Leg ${oscillation.legCount + 1} \u00B7 paused ${pausedFor}`
            : `Leg ${oscillation.legCount + 1} \u00B7 ${estimatedPosition}/${guideTravel}`
          }
        </span>
        <span className={`text-[10px] ${oscillation.direction === 'FWD' ? 'text-purple-300/60' : 'text-white/20'}`}>
          FWD
        </span>
      </div>
    </div>
  );
}
