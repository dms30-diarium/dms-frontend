import { Injectable } from '@angular/core';
import { hasStrongSecrecy } from '@app/shared/utils/sekretess-utils';

@Injectable({ providedIn: 'root' })
export class FormUtilsService {
  hasStrongSecrecy(value?: string | null): boolean {
    return hasStrongSecrecy(value);
  }
}
