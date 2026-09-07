import { WritableSignal } from '@angular/core';
import { tap } from 'rxjs';
import { FieldConfig } from '../general-form/general-form.types';
import { Option } from '@app/shared/commonTypes';
import { DirectoryOptionsService } from '@app/shared/services/directory-options.service';
import { toISODateOnlyString } from '@app/shared/utils/date-utils';

export function updateFormFieldOptions(
  configSignal: WritableSignal<FieldConfig[]>,
  fieldName: string,
  options: Option[]
): void {
  configSignal.update(fields => fields.map(f => (f.name === fieldName ? { ...f, options } : f)));
}

export function buildChildPath(parentPath: string, name: string): string {
  const rawParent = parentPath === '/' ? '' : parentPath;
  if (!name) {
    return rawParent || '/';
  }
  if (rawParent.endsWith('/')) {
    return `${rawParent}${name}`;
  }
  return rawParent ? `${rawParent}/${name}` : `/${name}`;
}

export function resolveSubjectIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => {
      const itemObject = item == null ? null : Object(item);
      const candidate = itemObject ? (Reflect.get(itemObject, 'id') ?? Reflect.get(itemObject, 'value') ?? item) : '';
      return String(candidate ?? '').trim();
    })
    .filter(Boolean);
}

export function resolveExpiresDate(value: unknown): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return '';
  if (raw instanceof Date) return toISODateOnlyString(raw);
  return String(raw ?? '').trim();
}

export function initDirectoryOptions(
  directoryOptions: DirectoryOptionsService,
  onUpdate: (field: string, options: Option[]) => void
): void {
  directoryOptions
    .getNatureOptions()
    .pipe(tap(options => onUpdate('nature', options)))
    .subscribe();

  directoryOptions
    .getSubjectOptions()
    .pipe(tap(options => onUpdate('subjects', options)))
    .subscribe();

  directoryOptions
    .getCoverageOptions()
    .pipe(tap(options => onUpdate('coverage', options)))
    .subscribe();
}
