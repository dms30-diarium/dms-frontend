import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';

import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { UserSuggestion } from '@app/shared/api/nuxeo-api.types';
import { CaseListTableComponent, TableColumn } from '@app/shared/components/case-list-table/case-list-table.component';
import { TableColOption } from '@app/shared/components/table-col-options/table-col-options.component';
import { Option } from '@app/shared/commonTypes';
import { GeneralStore } from '@app/core/services/general-store.service';
import { TooltipDirective } from '@app/shared/directives/tooltip.directive';
import {
  CollectionPermissionEntry,
  ExternalPermissionFormControls,
  PermissionFormControls,
} from '@app/shared/components/collection-permissions/collection-permissions.types';
import { CollectionPermissionsService } from '@app/shared/components/collection-permissions/collection-permissions.service';
import { PermissionDialogComponent } from '@app/shared/components/collection-permissions/dialogs/permission-dialog.component';
import { ExternalAddDialogComponent } from '@app/shared/components/collection-permissions/dialogs/external-add-dialog.component';
import { ExternalEditDialogComponent } from '@app/shared/components/collection-permissions/dialogs/external-edit-dialog.component';
import { DeletePermissionDialogComponent } from '@app/shared/components/collection-permissions/dialogs/delete-permission-dialog.component';
import { PermissionSectionComponent } from '@app/shared/components/collection-permissions/permission-section/permission-section.component';
import {
  EXTERNAL_SHARE_ERROR_PREFIX,
  EXTERNAL_SHARE_MISSING_FIELDS_MESSAGE,
  EXTERNAL_SHARE_SUCCESS_MESSAGE,
  PERMISSION_ADDED_MESSAGE,
  PERMISSION_ADD_ERROR_MESSAGE,
  PERMISSION_NOTIFICATION_ERROR_MESSAGE,
  PERMISSION_NOTIFICATION_SENT_MESSAGE,
  PERMISSION_MISSING_FIELDS_MESSAGE,
  PERMISSION_REMOVED_MESSAGE,
  PERMISSION_REMOVE_ERROR_MESSAGE,
  PERMISSION_UPDATED_MESSAGE,
  PERMISSION_UPDATE_ERROR_MESSAGE,
} from '@app/shared/constants/notification-messages';

type TimeFrameValue = 'permanent' | 'date';

interface PermissionBaseColumn {
  label: string;
  key: string;
  visible: boolean;
  class?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-collection-permissions',
  standalone: true,
  imports: [
    DigiArbetsformedlingenAngularModule,
    ReactiveFormsModule,
    CaseListTableComponent,
    TooltipDirective,
    PermissionDialogComponent,
    ExternalAddDialogComponent,
    ExternalEditDialogComponent,
    DeletePermissionDialogComponent,
    PermissionSectionComponent,
  ],
  templateUrl: './collection-permissions.component.html',
})
export class CollectionPermissionsComponent {
  private readonly apiService = inject(NuxeoApiService);
  private readonly store = inject(GeneralStore);
  private readonly destroyRef = inject(DestroyRef);
  readonly permissionsService = inject(CollectionPermissionsService);

  documentId = input.required<string>();

  loading = signal(false);
  localPermissions = signal<CollectionPermissionEntry[]>([]);
  inheritedPermissions = signal<CollectionPermissionEntry[]>([]);
  externalPermissions = signal<CollectionPermissionEntry[]>([]);
  permissionIndex = signal<Record<string, CollectionPermissionEntry>>({});
  inheritanceBlocked = signal(false);

  principalOptions = signal<Option[]>([]);

  permissionDialogMode = signal<'add' | 'edit' | null>(null);
  externalDialogMode = signal<'add' | 'edit' | null>(null);
  editingPermissionKey = signal<string | null>(null);
  editingExternalKey = signal<string | null>(null);
  deleteDialogEntry = signal<CollectionPermissionEntry | null>(null);

  permissionForm: FormGroup<PermissionFormControls> = new FormGroup<PermissionFormControls>({
    principal: new FormControl<Option | null>(null, Validators.required),
    permission: new FormControl<string>('Read', { nonNullable: true, validators: [Validators.required] }),
    timeFrame: new FormControl<TimeFrameValue>('permanent', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    begin: new FormControl<Date | null>(null),
    end: new FormControl<Date | null>(null),
    notify: new FormControl<boolean>(true, { nonNullable: true }),
    comment: new FormControl<string>('', { nonNullable: true }),
  });

  externalForm: FormGroup<ExternalPermissionFormControls> = new FormGroup<ExternalPermissionFormControls>({
    email: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    permission: new FormControl<string>('Read', { nonNullable: true, validators: [Validators.required] }),
    begin: new FormControl<Date | null>(null),
    end: new FormControl<Date | null>(null, Validators.required),
    notify: new FormControl<boolean>(true, { nonNullable: true }),
    comment: new FormControl<string>('', { nonNullable: true }),
  });

  readonly permissionsTableBaseConfig: PermissionBaseColumn[] = [
    { label: 'User / Group', key: 'principal', visible: true, class: 'min-w-[30%]' },
    { label: 'Right', key: 'right', visible: true, class: 'min-w-[20%]' },
    { label: 'Time Frame', key: 'timeFrame', visible: true, class: 'min-w-[20%]' },
    { label: 'Granted by', key: 'grantedBy', visible: true, class: 'min-w-[20%]' },
  ];

  readonly localPermissionsTableConfig: TableColumn[] =
    this.buildPermissionsTableConfig('COLLECTION_PERMISSIONS_LOCAL');

  readonly inheritedPermissionsTableConfig: TableColumn[] = this.buildPermissionsTableConfig(
    'COLLECTION_PERMISSIONS_INHERITED'
  );

  readonly externalPermissionsTableConfig: TableColumn[] = this.buildPermissionsTableConfig(
    'COLLECTION_PERMISSIONS_EXTERNAL'
  );

  readonly localPermissionsDefaultColumnOptions: TableColOption[] = this.buildDefaultColumnOptions();
  readonly inheritedPermissionsDefaultColumnOptions: TableColOption[] = this.buildDefaultColumnOptions();
  readonly externalPermissionsDefaultColumnOptions: TableColOption[] = this.buildDefaultColumnOptions();

  readonly permissionOptions: Option[] = [
    { id: 'Read', label: 'Read', value: 'Read' },
    { id: 'ReadCanCollect', label: 'readCanCollect', value: 'ReadCanCollect' },
    { id: 'ReadWrite', label: 'Edit', value: 'ReadWrite' },
    { id: 'Everything', label: 'Manage everything', value: 'Everything' },
  ];

  localRows = computed(() =>
    this.permissionsService.mapPermissionsToRows(this.localPermissions(), this.permissionOptions)
  );
  inheritedRows = computed(() =>
    this.permissionsService.mapPermissionsToRows(this.inheritedPermissions(), this.permissionOptions)
  );
  externalRows = computed(() =>
    this.permissionsService.mapPermissionsToRows(this.externalPermissions(), this.permissionOptions)
  );

  constructor() {
    effect(() => {
      const id = this.documentId();
      if (!id) {
        this.resetPermissions();
        return;
      }
      this.loadPermissions(id);
    });
  }

  openAddPermission(): void {
    this.permissionDialogMode.set('add');
    this.editingPermissionKey.set(null);
    this.permissionForm.controls.principal.enable();
    this.permissionForm.controls.principal.setValue(null);
    this.permissionForm.controls.permission.setValue('Read');
    this.permissionForm.controls.timeFrame.setValue('permanent');
    this.permissionForm.controls.begin.setValue(null);
    this.permissionForm.controls.end.setValue(null);
    this.permissionForm.controls.notify.setValue(true);
    this.permissionForm.controls.comment.setValue('');
  }

  openEditPermissionFromRow(row: Record<string, unknown>): void {
    const key = String(row['id'] ?? '');
    if (!key) return;
    const entry = this.permissionIndex()[key];
    if (!entry) return;

    this.permissionDialogMode.set('edit');
    this.editingPermissionKey.set(key);

    const displayLabel = this.permissionsService.resolvePrincipalLabel(entry);
    const existingOptions = this.principalOptions();
    const hasOption = existingOptions.some(option => option.id === entry.principalRef);
    if (!hasOption && entry.principalRef) {
      this.principalOptions.set([
        ...existingOptions,
        { id: entry.principalRef, label: displayLabel, value: entry.principalId || entry.principalRef },
      ]);
    }
    this.permissionForm.controls.principal.setValue({
      id: entry.principalRef,
      label: displayLabel,
      value: entry.principalId || entry.principalRef,
    });
    this.permissionForm.controls.principal.disable();
    this.permissionForm.controls.permission.setValue(entry.permission);
    const hasDates = !!entry.begin || !!entry.end;
    this.permissionForm.controls.timeFrame.setValue(hasDates ? 'date' : 'permanent');
    this.permissionForm.controls.begin.setValue(entry.begin ? new Date(entry.begin) : null);
    this.permissionForm.controls.end.setValue(entry.end ? new Date(entry.end) : null);
    this.permissionForm.controls.notify.setValue(true);
    this.permissionForm.controls.comment.setValue('');
  }

  closePermissionDialog(): void {
    this.permissionDialogMode.set(null);
    this.editingPermissionKey.set(null);
    this.permissionForm.controls.principal.enable();
  }

  openExternalDialog(): void {
    this.externalDialogMode.set('add');
    this.editingExternalKey.set(null);
    this.setExternalEmailRequired(true);
    this.externalForm.controls.email.setValue('');
    this.externalForm.controls.permission.setValue('Read');
    this.externalForm.controls.begin.setValue(null);
    this.externalForm.controls.end.setValue(null);
    this.externalForm.controls.notify.setValue(true);
    this.externalForm.controls.comment.setValue('');
  }

  closeExternalDialog(): void {
    this.externalDialogMode.set(null);
    this.editingExternalKey.set(null);
    this.setExternalEmailRequired(true);
  }

  openEditExternalPermissionFromRow(row: Record<string, unknown>): void {
    const key = String(row['id'] ?? '');
    if (!key) return;
    const entry = this.permissionIndex()[key];
    if (!entry) return;

    this.externalDialogMode.set('edit');
    this.editingExternalKey.set(key);
    this.setExternalEmailRequired(false);
    this.externalForm.controls.email.setValue(entry.displayLabel ?? '');
    this.externalForm.controls.permission.setValue(entry.permission ?? 'Read');
    this.externalForm.controls.begin.setValue(entry.begin ? new Date(entry.begin) : null);
    this.externalForm.controls.end.setValue(entry.end ? new Date(entry.end) : null);
    this.externalForm.controls.notify.setValue(entry.notify ?? true);
    this.externalForm.controls.comment.setValue(entry.comment ?? '');
  }

  openRemovePermissionFromRow(row: Record<string, unknown>): void {
    const key = String(row['id'] ?? '');
    if (!key) return;
    const entry = this.permissionIndex()[key];
    if (!entry || !entry.id || !entry.aclName) return;
    this.deleteDialogEntry.set(entry);
  }

  closeDeleteDialog(): void {
    this.deleteDialogEntry.set(null);
  }

  sendPermissionNotificationFromRow(row: Record<string, unknown>): void {
    const key = String(row['id'] ?? '');
    if (!key) return;
    const entry = this.permissionIndex()[key];
    if (!entry || !entry.id) return;

    const documentId = this.documentId();
    if (!documentId) return;

    this.apiService
      .sendPermissionNotificationEmail(documentId, { id: entry.id })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: PERMISSION_NOTIFICATION_SENT_MESSAGE,
          });
        },
        error: () => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: PERMISSION_NOTIFICATION_ERROR_MESSAGE,
          });
        },
      });
  }

  confirmDeletePermission(): void {
    const entry = this.deleteDialogEntry();
    const documentId = this.documentId();
    if (!entry || !documentId) return;

    this.apiService
      .removeDocumentPermissionAutomation(documentId, {
        id: entry.id,
        acl: entry.aclName,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: PERMISSION_REMOVED_MESSAGE,
          });
          this.closeDeleteDialog();
          this.loadPermissions(documentId);
        },
        error: () => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: PERMISSION_REMOVE_ERROR_MESSAGE,
          });
        },
      });
  }

  togglePermissionInheritance(): void {
    const documentId = this.documentId();
    if (!documentId) return;

    if (this.inheritanceBlocked()) {
      this.unblockPermissionInheritance(documentId);
      return;
    }

    this.blockPermissionInheritance(documentId);
  }

  private blockPermissionInheritance(documentId: string): void {
    this.apiService
      .blockPermissionInheritance(documentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loadPermissions(documentId);
        },
      });
  }

  private unblockPermissionInheritance(documentId: string): void {
    this.apiService
      .unblockPermissionInheritance(documentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loadPermissions(documentId);
        },
      });
  }

  submitPermission(): void {
    if (this.permissionForm.invalid) {
      this.store.notification.set({
        show: true,
        variation: 'danger',
        text: PERMISSION_MISSING_FIELDS_MESSAGE,
      });
      return;
    }

    const documentId = this.documentId();
    const principal = this.permissionForm.controls.principal.value;
    const permission = this.permissionForm.controls.permission.value;
    const timeFrame = this.permissionForm.controls.timeFrame.value;
    const principalRef = principal?.id ?? '';
    const principalId = principal?.value ?? principalRef;
    if (!documentId || !principal || !principalId || !permission) {
      return;
    }

    const begin = timeFrame === 'date' ? this.formatDateForApi(this.permissionForm.controls.begin.value, false) : null;
    const end = timeFrame === 'date' ? this.formatDateForApi(this.permissionForm.controls.end.value, true) : null;
    const notify = this.permissionForm.controls.notify.value;
    const comment = this.permissionForm.controls.comment.value;

    if (this.permissionDialogMode() === 'edit') {
      this.submitEditPermission({
        permission,
        begin,
        end,
        notify,
        comment,
      });
      return;
    }

    this.apiService
      .addDocumentPermission(documentId, {
        users: [principalId],
        permission,
        begin,
        end,
        notify,
        comment,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: PERMISSION_ADDED_MESSAGE,
          });
          this.closePermissionDialog();
          this.loadPermissions(documentId);
        },
        error: () => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: PERMISSION_ADD_ERROR_MESSAGE,
          });
        },
      });
  }

  submitEditPermission(params: {
    permission: string;
    begin: string | null;
    end: string | null;
    notify: boolean;
    comment: string;
  }): void {
    const documentId = this.documentId();
    const editingKey = this.editingPermissionKey();
    if (!documentId || !editingKey) return;

    const entry = this.permissionIndex()[editingKey];
    if (!entry || !entry.id || !entry.principalId) return;

    this.apiService
      .replaceDocumentPermission(documentId, {
        username: entry.principalId,
        permission: params.permission,
        begin: params.begin,
        end: params.end,
        notify: params.notify,
        comment: params.comment,
        id: entry.id,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: PERMISSION_UPDATED_MESSAGE,
          });
          this.closePermissionDialog();
          this.loadPermissions(documentId);
        },
        error: () => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: PERMISSION_UPDATE_ERROR_MESSAGE,
          });
        },
      });
  }

  submitExternalPermission(): void {
    if (this.externalDialogMode() === 'edit') {
      this.submitExternalEditPermission();
      return;
    }
    if (this.externalForm.invalid) {
      this.store.notification.set({
        show: true,
        variation: 'danger',
        text: EXTERNAL_SHARE_MISSING_FIELDS_MESSAGE,
      });
      return;
    }

    const documentId = this.documentId();
    const email = this.externalForm.controls.email.value;
    const permission = this.externalForm.controls.permission.value;
    const begin = this.formatDateForApi(this.externalForm.controls.begin.value, false);
    const end = this.formatDateForApi(this.externalForm.controls.end.value, true);
    const notify = this.externalForm.controls.notify.value;
    const comment = this.externalForm.controls.comment.value;

    if (!documentId || !email || !permission || !end) {
      this.store.notification.set({
        show: true,
        variation: 'danger',
        text: EXTERNAL_SHARE_MISSING_FIELDS_MESSAGE,
      });
      return;
    }

    this.apiService
      .shareDocumentWithExternalUser(documentId, {
        email,
        permission,
        begin,
        end,
        notify,
        comment,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: EXTERNAL_SHARE_SUCCESS_MESSAGE,
          });
          this.closeExternalDialog();
          this.loadPermissions(documentId);
        },
        error: error => {
          const message = error?.message
            ? `${EXTERNAL_SHARE_ERROR_PREFIX}: ${error.message}`
            : EXTERNAL_SHARE_ERROR_PREFIX;
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: message,
          });
        },
      });
  }

  private submitExternalEditPermission(): void {
    const documentId = this.documentId();
    const editingKey = this.editingExternalKey();
    if (!documentId || !editingKey) return;

    const entry = this.permissionIndex()[editingKey];
    if (!entry || !entry.id || !entry.principalId) return;

    const permission = this.externalForm.controls.permission.value;
    const begin = this.formatDateForApi(this.externalForm.controls.begin.value, false);
    const end = this.formatDateForApi(this.externalForm.controls.end.value, true);
    const notify = this.externalForm.controls.notify.value;
    const comment = this.externalForm.controls.comment.value;

    if (!permission || !end) {
      this.store.notification.set({
        show: true,
        variation: 'danger',
        text: EXTERNAL_SHARE_MISSING_FIELDS_MESSAGE,
      });
      return;
    }

    this.apiService
      .replaceDocumentPermission(documentId, {
        username: entry.principalId,
        permission,
        begin,
        end,
        notify,
        comment,
        id: entry.id,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: PERMISSION_UPDATED_MESSAGE,
          });
          this.closeExternalDialog();
          this.loadPermissions(documentId);
        },
        error: () => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: PERMISSION_UPDATE_ERROR_MESSAGE,
          });
        },
      });
  }

  onPrincipalQueryChanged(event: CustomEvent<string>): void {
    const term = `${event.detail ?? ''}`.trim();
    this.apiService
      .getUserGroupSuggestions(term, 'USER_GROUP_TYPE')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(suggestions => {
        this.principalOptions.set(this.mapSuggestionsToOptions(suggestions));
      });
  }

  onPrincipalSelected(event: CustomEvent<Option[]>): void {
    const selected = event.detail[0] ?? null;
    this.permissionForm.controls.principal.setValue(selected);
  }

  private loadPermissions(documentId: string): void {
    this.loading.set(true);
    this.apiService
      .getDocumentWithAcls(documentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: doc => {
          const aclEntries = doc.contextParameters?.acls ?? [];
          const parsed = this.permissionsService.parseAclEntries(aclEntries);
          this.localPermissions.set(parsed.local);
          this.inheritedPermissions.set(parsed.inherited);
          this.externalPermissions.set(parsed.external);
          this.permissionIndex.set(parsed.index);
          this.inheritanceBlocked.set(parsed.inheritanceBlocked);
          this.loading.set(false);
        },
        error: () => {
          this.resetPermissions();
          this.loading.set(false);
        },
      });
  }

  private resetPermissions(): void {
    this.localPermissions.set([]);
    this.inheritedPermissions.set([]);
    this.externalPermissions.set([]);
    this.permissionIndex.set({});
    this.inheritanceBlocked.set(false);
  }

  private mapSuggestionsToOptions(suggestions: UserSuggestion[]): Option[] {
    const options: Option[] = [];
    suggestions.forEach(suggestion => {
      const rawId = suggestion.id ?? '';
      const prefixedId = suggestion.prefixed_id ?? rawId;
      const value = rawId || prefixedId;
      if (!prefixedId) return;
      options.push({
        id: prefixedId,
        label: suggestion.displayLabel ?? '',
        value,
      });
    });
    return options;
  }

  private buildPermissionsTableConfig(tableName: string): TableColumn[] {
    return this.permissionsTableBaseConfig.map(column => ({
      ...column,
      tableName,
    }));
  }

  private buildDefaultColumnOptions(): TableColOption[] {
    return this.permissionsTableBaseConfig.map(column => ({
      id: column.key.toString(),
      label: column.label,
      visible: true,
    }));
  }

  private setExternalEmailRequired(isRequired: boolean): void {
    const emailControl = this.externalForm.controls.email;
    if (isRequired) {
      emailControl.setValidators([Validators.required]);
    } else {
      emailControl.clearValidators();
    }
    emailControl.updateValueAndValidity();
  }

  private formatDateForApi(value: Date | string | null | undefined, endOfDay: boolean): string | null {
    if (!value) return null;
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return null;
    if (endOfDay) {
      date.setHours(23, 59, 59, 999);
    } else {
      date.setHours(0, 0, 0, 0);
    }

    const offsetMinutes = -date.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const absMinutes = Math.abs(offsetMinutes);
    const pad = (valueToPad: number) => String(Math.floor(valueToPad)).padStart(2, '0');
    const hours = pad(absMinutes / 60);
    const minutes = pad(absMinutes % 60);
    const year = String(date.getFullYear());
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hour = pad(date.getHours());
    const minute = pad(date.getMinutes());
    const second = pad(date.getSeconds());

    return `${year}-${month}-${day}T${hour}:${minute}:${second}${sign}${hours}:${minutes}`;
  }
}
