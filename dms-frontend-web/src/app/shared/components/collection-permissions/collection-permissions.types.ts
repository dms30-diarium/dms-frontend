import { FormControl } from '@angular/forms';

import { Option } from '@app/shared/commonTypes';

export interface PermissionFormControls {
  principal: FormControl<Option | null>;
  permission: FormControl<string>;
  timeFrame: FormControl<'permanent' | 'date'>;
  begin: FormControl<Date | null>;
  end: FormControl<Date | null>;
  notify: FormControl<boolean>;
  comment: FormControl<string>;
}

export interface ExternalPermissionFormControls {
  email: FormControl<string>;
  permission: FormControl<string>;
  begin: FormControl<Date | null>;
  end: FormControl<Date | null>;
  notify: FormControl<boolean>;
  comment: FormControl<string>;
}

export type PermissionScope = 'local' | 'inherited' | 'external';
export type PrincipalType = 'user' | 'group' | 'external';

export interface CollectionPermissionEntry {
  key: string;
  aclName: string;
  id: string;
  principalRef: string;
  principalId: string;
  principalType: PrincipalType;
  creatorId: string;
  creatorLabel: string;
  permission: string;
  begin: string | null;
  end: string | null;
  comment?: string;
  notify?: boolean;
  displayLabel: string;
  scope: PermissionScope;
}

export interface ParsedCollectionPermissions {
  local: CollectionPermissionEntry[];
  inherited: CollectionPermissionEntry[];
  external: CollectionPermissionEntry[];
  index: Record<string, CollectionPermissionEntry>;
  inheritanceBlocked: boolean;
}
