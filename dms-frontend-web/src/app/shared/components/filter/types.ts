export interface FilterOption {
  id: string;
  label: string;
}

export interface FilterGroup {
  name: string;
  filterType: 'checkbox' | 'radio';
  options: FilterOption[];
}
