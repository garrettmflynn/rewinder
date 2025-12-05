import { useState, useEffect } from 'react';
import { MotionControl } from './MotionControl';
import { connectionService } from '../services/ConnectionService';

export function AdvancedMode() {
  const [activeMotor, setActiveMotor] = useState(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const unsubStatus = connectionService.onStatusChange((status) => {
      setConnected(status);
    });

    return () => {
      unsubStatus();
    };
  }, []);

  const handleMotorChange = (motorId: number) => {
    setActiveMotor(motorId);
    connectionService.setActiveMotor(motorId);
  };

  return (
    <div>
      {/* Motor Selector */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-white/70 text-sm">Target Motor:</span>
        <select
          value={activeMotor}
          onChange={(e) => handleMotorChange(Number(e.target.value))}
          disabled={!connected}
          className="bg-white/10 text-white px-3 py-1.5 rounded-lg border border-white/20 disabled:opacity-50"
        >
          <option value={0}>Motor 0 (Spool)</option>
          <option value={1}>Motor 1 (Guide)</option>
        </select>
      </div>

      <MotionControl />
    </div>
  );
}
