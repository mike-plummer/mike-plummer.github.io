import { MEMORY_CAPACITY } from '../config';
import type { MemoryEntry } from '../types';

function createMemory(key: string, value: string, inContext = true): MemoryEntry {
  return {
    id: `mem-${Date.now()}-${key}`,
    key,
    value,
    inContext
  };
}

export function addMemory(memories: MemoryEntry[], key: string, value: string): MemoryEntry[] {
  if (memories.length >= MEMORY_CAPACITY) {
    return memories;
  }
  const existing = memories.find((m) => m.key === key);
  if (existing) {
    return memories.map((m) => (m.key === key ? { ...m, value } : m));
  }
  return [...memories, createMemory(key, value)];
}
