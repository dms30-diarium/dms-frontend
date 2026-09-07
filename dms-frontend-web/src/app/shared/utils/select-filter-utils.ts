export interface SelectFilterOption {
  id: string;
  label: string;
}

export interface SelectFilterBuildOptions {
  allowCreate?: boolean;
  createdOptionId?: string;
}

export const buildSelectFilterOptions = (
  queryValue: string,
  sourceOptions: SelectFilterOption[],
  options: SelectFilterBuildOptions = {}
): { options: SelectFilterOption[]; createdOption?: SelectFilterOption } => {
  const trimmedQuery = queryValue.trim();
  const lowerQuery = trimmedQuery.toLowerCase();

  const baseOptions = lowerQuery.length
    ? sourceOptions.filter(option => option.label.toLowerCase().includes(lowerQuery))
    : [...sourceOptions];

  if (!options.allowCreate || !trimmedQuery.length) {
    return { options: baseOptions };
  }

  const alreadyExists = sourceOptions.some(option => option.label.toLowerCase() === lowerQuery);
  if (alreadyExists) {
    return { options: baseOptions };
  }

  const createdOption: SelectFilterOption = {
    id: options.createdOptionId ?? trimmedQuery,
    label: trimmedQuery,
  };

  return { options: [...baseOptions, createdOption], createdOption };
};
