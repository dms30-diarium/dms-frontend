import { Option } from '@app/shared/commonTypes';

export const normalizeOptionToken = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
};

export const isOptionLike = (value: unknown): value is Partial<Option> =>
  !!value && typeof value === 'object' && ('id' in value || 'label' in value || 'value' in value);

export const hasSelectedFlag = (value: unknown): value is { selected?: unknown } =>
  typeof value === 'object' && value !== null && 'selected' in value;

export const extractMemberIds = (
  value: unknown,
  opts?: {
    selectedOnly?: boolean;
  }
): string[] => {
  if (!value) return [];
  const items = Array.isArray(value) ? value : [value];
  const requireSelected = Boolean(opts?.selectedOnly) && items.some(item => isOptionLike(item) && 'selected' in item);

  return items
    .map(item => {
      if (typeof item === 'string') return item;
      if (!isOptionLike(item)) return null;
      if (requireSelected) {
        if (!hasSelectedFlag(item) || item.selected !== true) return null;
      }
      if (typeof item.value === 'string') return item.value;
      if (typeof item.id === 'string') return item.id;
      return null;
    })
    .filter((entry): entry is string => entry !== null);
};

export const buildOptionIndex = (options: Option[]): Map<string, Option> => {
  const optionIndex = new Map<string, Option>();

  options.forEach(option => {
    [option.id, option.value, option.label].forEach(token => {
      const key = normalizeOptionToken(token);
      if (key && !optionIndex.has(key)) {
        optionIndex.set(key, option);
      }
    });
  });

  return optionIndex;
};

export const resolveOptionFromInput = (input: unknown, optionIndex: Map<string, Option>): Option | null => {
  if (input == null) return null;
  if (typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean') {
    const token = normalizeOptionToken(input);
    if (!token) return null;
    return optionIndex.get(token) ?? { id: token, label: token, value: token };
  }
  if (!isOptionLike(input)) return null;

  const candidate = normalizeOptionToken(input.id ?? input.value ?? input.label);
  if (!candidate) return null;
  return optionIndex.get(candidate) ?? { id: candidate, label: candidate, value: candidate };
};
