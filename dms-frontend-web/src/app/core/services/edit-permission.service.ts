import { Injectable } from '@angular/core';
import { NxUser } from '@app/shared/api/nuxeo-api.types';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

@Injectable({ providedIn: 'root' })
export class EditPermissionService {
  private getUserId(user: unknown): string | null {
    if (!user) return null;
    if (typeof user === 'string') return user.toLowerCase();

    const casted = user as NxUser & { username?: string };
    const username = casted?.id ?? casted?.username ?? casted?.properties?.[NUXEO_SCHEMA_FIELDS.user.username];
    return typeof username === 'string' ? username.toLowerCase() : null;
  }

  private isUserIncluded(value: unknown, username: string): boolean {
    if (!value) return false;

    if (Array.isArray(value)) {
      return value.some(entry => this.getUserId(entry) === username);
    }

    return this.getUserId(value) === username;
  }

  canEditCase(docProperties: Record<string, unknown>, username?: string | null, isAdmin = false): boolean {
    if (isAdmin) return true;
    if (!username) return false;

    const medhandlaggare = docProperties[NUXEO_SCHEMA_FIELDS.arende.medhandlaggare];
    const ansvarigChef = docProperties[NUXEO_SCHEMA_FIELDS.arende.ansvarigOrganisationsenhetschef];

    return (
      this.isUserIncluded(medhandlaggare, username.toLowerCase()) ||
      this.isUserIncluded(ansvarigChef, username.toLowerCase())
    );
  }
}
