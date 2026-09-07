import { Injectable } from '@angular/core';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

import { NuxeoAcl } from '@app/shared/api/nuxeo-api.types';
import { Option } from '@app/shared/commonTypes';
import { formatDateOrMissing } from '@app/shared/utils/date-utils';
import {
  CollectionPermissionEntry,
  ParsedCollectionPermissions,
  PermissionScope,
} from '@app/shared/components/collection-permissions/collection-permissions.types';

@Injectable({ providedIn: 'root' })
export class CollectionPermissionsService {
  parseAclEntries(aclEntries: NuxeoAcl[]): ParsedCollectionPermissions {
    const local: CollectionPermissionEntry[] = [];
    const inherited: CollectionPermissionEntry[] = [];
    const external: CollectionPermissionEntry[] = [];
    const index: Record<string, CollectionPermissionEntry> = {};

    aclEntries.forEach(acl => {
      const entries = acl.aces ?? acl.ace ?? [];
      entries.forEach(ace => {
        if (ace.grant === false || ace.granted === false) {
          return;
        }

        const aclName = acl.name ?? 'local';

        const principalValue = ace.username;
        const principalEntityType = String(principalValue['entity-type'] ?? '');
        const isPrincipalString = !principalEntityType;
        const principalType: 'user' | 'group' = principalEntityType.toLowerCase() === 'group' ? 'group' : 'user';
        const principalId = String(principalValue.id ?? '');
        const principalRef = `${principalType}:${principalId}`;
        const principalProperties: Record<string, unknown> = principalValue.properties ?? {};

        let principalLabel = '';
        if (isPrincipalString) {
          principalLabel = String(principalValue ?? '');
        } else if (principalType === 'group') {
          principalLabel = String(principalProperties['grouplabel'] ?? principalProperties['groupname'] ?? '');
        } else {
          principalLabel =
            [
              String(principalProperties['firstName'] ?? principalProperties[NUXEO_SCHEMA_FIELDS.user.firstName] ?? ''),
              String(principalProperties['lastName'] ?? principalProperties[NUXEO_SCHEMA_FIELDS.user.lastName] ?? ''),
            ]
              .filter(Boolean)
              .join(' ')
              .trim() || String(principalProperties['email'] ?? '');
        }

        const creatorValue = ace.creator;
        const creatorId = String(
          creatorValue?.id ?? creatorValue?.properties?.[NUXEO_SCHEMA_FIELDS.user.username] ?? ''
        );
        const creatorProperties: Record<string, unknown> = creatorValue?.properties ?? {};
        const creatorLabel =
          [
            String(creatorProperties['firstName'] ?? creatorProperties[NUXEO_SCHEMA_FIELDS.user.firstName] ?? ''),
            String(creatorProperties['lastName'] ?? creatorProperties[NUXEO_SCHEMA_FIELDS.user.lastName] ?? ''),
          ]
            .filter(Boolean)
            .join(' ')
            .trim() || String(creatorProperties['email'] ?? '');

        const isExternal =
          ace.externalUser ||
          Boolean(ace.email) ||
          String(principalId).startsWith('transient/') ||
          String(principalId).includes('@');

        const externalLabel = String(ace.email ?? '') || String(principalProperties['email'] ?? '');

        const scope: PermissionScope = isExternal
          ? 'external'
          : String(aclName).toLowerCase().includes('inherited')
            ? 'inherited'
            : 'local';

        const entry: CollectionPermissionEntry = {
          key: '',
          aclName,
          id: ace.id ?? '',
          principalRef,
          principalId,
          principalType: isExternal ? 'external' : principalType,
          creatorId,
          creatorLabel,
          permission: ace.permission ?? '',
          begin: ace.begin ?? null,
          end: ace.end ?? null,
          comment: ace.comment ?? '',
          notify: ace.notify ?? false,
          displayLabel: isExternal ? externalLabel || principalLabel : principalLabel,
          scope,
        };

        entry.key =
          entry.id ||
          [
            entry.aclName,
            entry.principalType,
            entry.principalId,
            entry.permission,
            entry.begin ?? '',
            entry.end ?? '',
          ].join('|');
        index[entry.key] = entry;

        if (entry.scope === 'external') {
          external.push(entry);
        } else if (entry.scope === 'inherited') {
          inherited.push(entry);
        } else {
          local.push(entry);
        }
      });
    });

    const inheritanceBlocked = !aclEntries.some(acl =>
      String(acl.name ?? '')
        .toLowerCase()
        .includes('inherited')
    );

    return { local, inherited, external, index, inheritanceBlocked };
  }

  mapPermissionsToRows(entries: CollectionPermissionEntry[], permissionOptions: Option[]): Record<string, string>[] {
    return entries.map(entry => ({
      id: entry.key,
      principal: this.resolvePrincipalLabel(entry),
      right: this.resolvePermissionLabel(entry.permission ?? '', permissionOptions),
      timeFrame: this.buildTimeFrameLabel(entry),
      grantedBy: this.resolveGrantedByLabel(entry),
    }));
  }

  resolvePrincipalLabel(entry: CollectionPermissionEntry): string {
    return entry.displayLabel;
  }

  resolveGrantedByLabel(entry: CollectionPermissionEntry): string {
    return entry.creatorLabel;
  }

  buildTimeFrameLabel(entry: CollectionPermissionEntry): string {
    if (!entry.begin && !entry.end) {
      return 'Permanent';
    }
    const fromLabel = formatDateOrMissing(entry.begin);
    const toLabel = formatDateOrMissing(entry.end);
    return `${fromLabel} - ${toLabel}`.trim();
  }

  resolvePermissionLabel(permission: string, permissionOptions: Option[]): string {
    const normalized = permission.toLowerCase();
    const match = permissionOptions.find(option => option.id.toLowerCase() === normalized);
    return match?.label ?? '';
  }
}
