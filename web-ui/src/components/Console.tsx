import { useState, useEffect, useRef } from 'react';
import { connectionService } from '../services/ConnectionService';
import type { SerialMessage } from '../types';

interface GroupedMessage {
  command: SerialMessage;
  response?: SerialMessage;
}

// Parse command to extract the command type and motor
function parseCommand(content: string): { cmd: string; motor: number } | null {
  const trimmed = content.trim();

  // Check for motor prefix (M0, M1, etc.)
  const motorMatch = trimmed.match(/^M(\d+)\s+(\w+)/);
  if (motorMatch) {
    return { motor: parseInt(motorMatch[1]), cmd: motorMatch[2] };
  }

  // No motor prefix, assume motor 0
  const cmdMatch = trimmed.match(/^(\w+)/);
  if (cmdMatch) {
    return { motor: 0, cmd: cmdMatch[1] };
  }

  return null;
}

// Parse response to extract ack type and motor
function parseResponse(content: string): { ack: string; motor: number } | null {
  try {
    const json = JSON.parse(content);
    if (json.ack !== undefined && json.motor !== undefined) {
      return { ack: json.ack, motor: json.motor };
    }
  } catch {
    // Not JSON or doesn't have expected fields
  }
  return null;
}

export function Console() {
  const [messages, setMessages] = useState<SerialMessage[]>([]);
  const [rawCommand, setRawCommand] = useState('');
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubMessage = connectionService.onMessage((content) => {
      setMessages((prev) => [
        ...prev,
        { direction: 'received', content, timestamp: new Date() },
      ]);
    });

    const unsubSent = connectionService.onSent((content) => {
      setMessages((prev) => [
        ...prev,
        { direction: 'sent', content, timestamp: new Date() },
      ]);
    });

    return () => {
      unsubMessage();
      unsubSent();
    };
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages]);

  // Group commands with their responses
  const groupedMessages = (): (GroupedMessage | SerialMessage)[] => {
    const result: (GroupedMessage | SerialMessage)[] = [];
    const pendingCommands: Map<string, GroupedMessage> = new Map();

    for (const msg of messages) {
      if (msg.direction === 'sent') {
        const parsed = parseCommand(msg.content);
        if (parsed) {
          const key = `${parsed.cmd}-${parsed.motor}`;
          const group: GroupedMessage = { command: msg };
          pendingCommands.set(key, group);
          result.push(group);
        } else {
          result.push(msg);
        }
      } else {
        // Check if this is an ack response
        const parsed = parseResponse(msg.content);
        if (parsed) {
          const key = `${parsed.ack}-${parsed.motor}`;
          const pending = pendingCommands.get(key);
          if (pending && !pending.response) {
            pending.response = msg;
            pendingCommands.delete(key);
            continue; // Don't add separately, it's grouped
          }
        }
        // Not matched or not an ack, add as standalone
        result.push(msg);
      }
    }

    return result;
  };

  const handleSend = async () => {
    if (!rawCommand.trim()) return;

    try {
      await connectionService.send(rawCommand);
      setRawCommand('');
    } catch (error) {
      console.error('Send error:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const handleClear = () => {
    setMessages([]);
  };

  const isGrouped = (item: GroupedMessage | SerialMessage): item is GroupedMessage => {
    return 'command' in item;
  };

  const formatContent = (content: string) => {
    // Try to format JSON nicely
    try {
      const json = JSON.parse(content);
      if (json.ack) {
        return `✓ ${json.ack}` + (json.motor !== undefined ? ` (M${json.motor})` : '');
      }
      if (json.info) {
        return `ℹ ${json.info}`;
      }
      if (json.error) {
        return `✗ ${json.error}`;
      }
      return content;
    } catch {
      return content;
    }
  };

  const grouped = groupedMessages();

  return (
    <div className="h-full flex flex-col bg-gray-900 font-mono text-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
        <span className="text-gray-400 text-xs">Serial Console</span>
        <button
          onClick={handleClear}
          className="text-gray-500 hover:text-gray-300 text-xs"
        >
          Clear
        </button>
      </div>

      {/* Messages */}
      <div
        ref={logRef}
        className="flex-1 overflow-auto p-3 min-h-0"
      >
        {messages.length === 0 ? (
          <div className="text-gray-600 text-xs">No messages yet...</div>
        ) : (
          grouped.map((item, idx) => {
            if (isGrouped(item)) {
              // Grouped command + response
              return (
                <div key={idx} className="mb-2 border-l-2 border-gray-700 pl-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 text-xs">
                      {item.command.timestamp.toLocaleTimeString()}
                    </span>
                    <span className="text-cyan-400 text-xs break-all">
                      {item.command.content}
                    </span>
                  </div>
                  {item.response ? (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-gray-700 text-xs">└─</span>
                      <span className="text-green-400 text-xs break-all">
                        {formatContent(item.response.content)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-gray-700 text-xs">└─</span>
                      <span className="text-yellow-500 text-xs">pending...</span>
                    </div>
                  )}
                </div>
              );
            } else {
              // Standalone message
              const msg = item;
              return (
                <div
                  key={idx}
                  className={`mb-2 pl-2 border-l-2 ${
                    msg.direction === 'sent'
                      ? 'border-cyan-800'
                      : 'border-green-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 text-xs">
                      {msg.timestamp.toLocaleTimeString()}
                    </span>
                    <span className={`text-xs break-all ${
                      msg.direction === 'sent' ? 'text-cyan-400' : 'text-green-400'
                    }`}>
                      {msg.direction === 'received' ? formatContent(msg.content) : msg.content}
                    </span>
                  </div>
                </div>
              );
            }
          })
        )}
      </div>

      {/* Input */}
      <div className="flex border-t border-gray-700">
        <span className="text-green-500 px-3 py-2">$</span>
        <input
          type="text"
          value={rawCommand}
          onChange={(e) => setRawCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter command..."
          className="flex-1 bg-transparent text-gray-100 py-2 pr-3 outline-none placeholder-gray-600"
        />
      </div>
    </div>
  );
}
