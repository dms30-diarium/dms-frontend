import { FormControl } from '@angular/forms';

export interface DropdownOption {
  value: string;
  label: string;
}

export interface DropdownField {
  title?: string;
  controller: FormControl;
  options: { value: string; label: string }[];
  placeholder: string;
  isRequired?: boolean;
}
