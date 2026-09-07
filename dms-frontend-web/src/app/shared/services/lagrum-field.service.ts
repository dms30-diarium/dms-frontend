import { Injectable } from '@angular/core';
import { Validators } from '@angular/forms';
import { Option } from '@app/shared/commonTypes';
import { FieldConfig } from '@app/shared/components/general-form/general-form.types';

export type LagrumFieldName = 'lagrum' | 'lagrumsbeskrivning' | 'arendeLagrum';

export function buildLagrumFieldConfig(params: {
  name: LagrumFieldName;
  options?: Option[] | null;
  defaultValue?: string | Option[] | null;
  required?: boolean;
}): FieldConfig {
  return {
    type: 'dropdown-search',
    name: params.name,
    label: 'Lagrumsbeskrivning',
    options: params.options ?? undefined,
    defaultValue: params.defaultValue ?? undefined,
    validators: params.required === false ? undefined : [Validators.required],
  };
}

@Injectable({
  providedIn: 'root',
})
export class LagrumFieldService {
  buildField(params: {
    name: LagrumFieldName;
    options?: Option[] | null;
    defaultValue?: string | Option[] | null;
    required?: boolean;
  }): FieldConfig {
    return buildLagrumFieldConfig(params);
  }

  syncOptions(config: FieldConfig[], fieldName: LagrumFieldName, options?: Option[] | null): FieldConfig[] {
    return config.map(field => (field.name === fieldName ? { ...field, options: options ?? undefined } : field));
  }

  insertAfter(config: FieldConfig[], afterFieldName: string, field: FieldConfig): FieldConfig[] {
    const index = config.findIndex(item => item.name === afterFieldName);
    if (index === -1) {
      return [...config, field];
    }
    return [...config.slice(0, index + 1), field, ...config.slice(index + 1)];
  }

  removeField(config: FieldConfig[], fieldName: LagrumFieldName): FieldConfig[] {
    return config.filter(item => item.name !== fieldName);
  }
}
