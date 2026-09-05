import type { MorpState, SystemId } from '../types';

export function unlockSystem(state: MorpState, system: SystemId): MorpState {
  if (state.unlockedSystems.includes(system)) {
    return state;
  }
  return {
    ...state,
    unlockedSystems: [...state.unlockedSystems, system]
  };
}
