/**
 * Intercepts console.log / warn / error and stores the last N messages
 * so they can be displayed in an on-screen debug panel.
 *
 * Call `installDebugLog()` once at app startup (in _layout.tsx).
 * Use `useDebugLog()` inside any component to read the captured messages.
 */

import { useState, useEffect } from 'react';

export interface LogEntry {
  id: number;
  level: 'log' | 'warn' | 'error';
  message: string;
  timestamp: string;
}

const MAX_ENTRIES = 80;
let _entries: LogEntry[] = [];
let _counter = 0;
let _listeners: Array<(entries: LogEntry[]) => void> = [];

function notify() {
  const snapshot = [..._entries];
  _listeners.forEach((fn) => fn(snapshot));
}

function push(level: LogEntry['level'], args: unknown[]) {
  const message = args
    .map((a) => {
      if (typeof a === 'string') return a;
      try {
        return JSON.stringify(a);
      } catch {
        return String(a);
      }
    })
    .join(' ');

  const now = new Date();
  const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now
    .getMinutes()
    .toString()
    .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

  _entries = [
    ..._entries.slice(-(MAX_ENTRIES - 1)),
    { id: _counter++, level, message, timestamp },
  ];
  notify();
}

let _installed = false;
const _origLog = console.log.bind(console);
const _origWarn = console.warn.bind(console);
const _origError = console.error.bind(console);

export function installDebugLog() {
  if (_installed) return;
  _installed = true;

  console.log = (...args: unknown[]) => {
    _origLog(...args);
    push('log', args);
  };
  console.warn = (...args: unknown[]) => {
    _origWarn(...args);
    push('warn', args);
  };
  console.error = (...args: unknown[]) => {
    _origError(...args);
    push('error', args);
  };
}

export function useDebugLog(): { entries: LogEntry[]; clear: () => void } {
  const [entries, setEntries] = useState<LogEntry[]>([..._entries]);

  useEffect(() => {
    const listener = (snapshot: LogEntry[]) => setEntries(snapshot);
    _listeners.push(listener);
    return () => {
      _listeners = _listeners.filter((fn) => fn !== listener);
    };
  }, []);

  function clear() {
    _entries = [];
    notify();
  }

  return { entries, clear };
}
