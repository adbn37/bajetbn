import type { CustomSpaceModule } from '../../types/models';

export interface CustomSpaceModuleOption {
  value: CustomSpaceModule;
  label: string;
  detail: string;
}

export const CUSTOM_SPACE_MODULE_OPTIONS: CustomSpaceModuleOption[] = [
  { value: 'budgets', label: 'Budgets', detail: 'Plan spending limits for this Space.' },
  { value: 'goals', label: 'Goals', detail: 'Track savings goals and targets.' },
  { value: 'bills', label: 'Bills & instalments', detail: 'Track due dates and recurring commitments.' },
  { value: 'reports', label: 'Reports', detail: 'See Space-specific money summaries.' },
  { value: 'calendar', label: 'Calendar', detail: 'See important financial dates and deadlines.' },
  { value: 'group_fund', label: 'Group Fund', detail: 'Collect contributions into one shared fund.' },
];

export const DEFAULT_CUSTOM_SPACE_MODULES: CustomSpaceModule[] =
  CUSTOM_SPACE_MODULE_OPTIONS.map((item) => item.value);

export function normalizeCustomSpaceModules(
  value?: CustomSpaceModule[] | null,
): CustomSpaceModule[] {
  if (!value) return [...DEFAULT_CUSTOM_SPACE_MODULES];

  const selected = new Set(value);

  return DEFAULT_CUSTOM_SPACE_MODULES.filter((module) => selected.has(module));
}
