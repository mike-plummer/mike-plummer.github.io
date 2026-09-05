import { MEMORY_CAPACITY } from '../config';
import type { MemoryEntry } from '../types';

export function createMemory(key: string, value: string, inContext = true): MemoryEntry {
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

export function deleteMemory(memories: MemoryEntry[], id: string): MemoryEntry[] {
  return memories.filter((m) => m.id !== id);
}

export function toggleMemoryContext(memories: MemoryEntry[], id: string, inContext: boolean): MemoryEntry[] {
  return memories.map((m) => (m.id === id ? { ...m, inContext } : m));
}

export function getMemoryByKey(memories: MemoryEntry[], key: string): MemoryEntry | undefined {
  return memories.find((m) => m.key === key);
}
