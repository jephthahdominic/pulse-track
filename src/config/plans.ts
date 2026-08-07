import type { Workspace } from '../types';

export const PLAN_PROJECT_LIMITS: Record<Workspace['plan'], number | null> = {
  Free: null,
  Pro: 20,
  Business: 100,
  Enterprise: null,
};

export function resolveProjectLimit(plan: Workspace['plan'], override?: number | null): number | null {
  if (typeof override === 'number' && override >= 0) return override;
  return PLAN_PROJECT_LIMITS[plan] ?? null;
}
