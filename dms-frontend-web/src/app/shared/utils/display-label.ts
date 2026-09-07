import { DirectoryEntry, NuxeoDocument, NxUser } from '@app/shared/api/nuxeo-api.types';
import { getInitials } from './initials';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

export type DisplayValue = NuxeoDocument | DirectoryEntry | NxUser | string | null | undefined;
export type DisplayValues = DisplayValue[] | null | undefined;

export function getUserFullName(user?: NxUser): string {
  if (!user) return '';
  if (!user?.properties) return user?.id;
  return `${user?.properties?.firstName} ${user?.properties?.lastName}`.trim();
}

export function getUserDisplayName(user: NxUser | undefined): string {
  if (!user) return '';
  const firstName = user.properties?.firstName ?? user.properties?.[NUXEO_SCHEMA_FIELDS.user.firstName] ?? '';
  const lastName = user.properties?.lastName ?? user.properties?.[NUXEO_SCHEMA_FIELDS.user.lastName] ?? '';
  return [firstName, lastName].filter(Boolean).join(' ') || user.id;
}

export function getUserInitials(user: NxUser | undefined): string {
  return getInitials(getUserDisplayName(user));
}
