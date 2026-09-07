import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DigiArbetsformedlingenAngularModule, DigiNavigationBreadcrumbs } from '@designsystem-se/af-angular';
import { catchError, forkJoin, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CaseListTableComponent, TableColumn } from '@app/shared/components/case-list-table/case-list-table.component';
import { TableColOption } from '@app/shared/components/table-col-options/table-col-options.component';
import { TableItem } from '@app/shared/models/case-table';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NxUser, UserSuggestion } from '@app/shared/api/nuxeo-api.types';
import { extractMemberIds } from '@app/shared/utils/option-utils';
import { GeneralStore } from '@app/core/services/general-store.service';
import { Router } from '@angular/router';
import {
  USER_DELETE_ERROR_MESSAGE,
  USER_DELETE_SUCCESS_MESSAGE,
  USER_UPDATE_ERROR_MESSAGE,
  USER_UPDATE_SUCCESS_MESSAGE,
  USER_PASSWORD_UPDATE_ERROR_MESSAGE,
  USER_PASSWORD_UPDATE_SUCCESS_MESSAGE,
  USER_GROUP_ADD_MEMBERS_ERROR_MESSAGE,
  USER_GROUP_ADD_MEMBERS_SUCCESS_MESSAGE,
  USER_GROUP_REMOVE_MEMBER_ERROR_MESSAGE,
  USER_GROUP_REMOVE_MEMBER_SUCCESS_MESSAGE,
} from '@app/shared/constants/notification-messages';
import { USER_DETAIL_GROUPS_TABLE_CONFIG, USER_DETAIL_PERMISSIONS_TABLE_CONFIG } from './user-detail-table.constants';
import { GeneralFormComponent } from '@app/shared/components/general-form/general-form.component';
import { FieldConfig } from '@app/shared/components/general-form/general-form.types';
import { Option } from '@app/shared/commonTypes';
import { Validators } from '@angular/forms';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

@Component({
  selector: 'nuxeo-user-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterModule,
    DigiNavigationBreadcrumbs,
    DigiArbetsformedlingenAngularModule,
    CaseListTableComponent,
    GeneralFormComponent,
  ],
  templateUrl: './user-detail.component.html',
})
export class UserDetailComponent {
  private readonly nuxeoApi = inject(NuxeoApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  readonly store = inject(GeneralStore);

  readonly isDeleteDialogOpen = signal(false);
  readonly isEditUserOpen = signal(false);
  readonly isChangePasswordOpen = signal(false);
  readonly isAddToGroupOpen = signal(false);
  readonly isRemoveGroupOpen = signal(false);
  readonly pendingRemoveGroupId = signal<string | null>(null);
  readonly groupOptions = signal<Option[]>([]);
  readonly addToGroupFormConfig = signal<FieldConfig[]>(this.buildAddToGroupFormConfig());
  readonly changePasswordFormConfig = signal<FieldConfig[]>(this.buildChangePasswordFormConfig());
  readonly editUserFormConfig = signal<FieldConfig[]>(this.buildEditUserFormConfig(null));
  readonly userId = signal('');
  readonly user = signal<NxUser | null>(null);
  readonly groupsRows = signal<TableItem[]>([]);
  readonly groupsTotal = signal(0);
  readonly permissionsRows = signal<TableItem[]>([]);
  readonly permissionsTotal = signal(0);
  readonly adminPermissionsRows = signal<TableItem[]>([]);
  readonly adminPermissionsTotal = signal(0);
  readonly pageSize = 50;

  readonly displayName = computed(() => {
    const user = this.user();
    const props = user?.properties ?? {};
    const firstName = props.firstName || props[NUXEO_SCHEMA_FIELDS.user.firstName] || '';
    const lastName = props.lastName || props[NUXEO_SCHEMA_FIELDS.user.lastName] || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || user?.id || this.userId() || 'User';
  });

  readonly email = computed(() => {
    const user = this.user();
    const props = user?.properties ?? {};
    return props.email || props[NUXEO_SCHEMA_FIELDS.user.email] || '—';
  });

  readonly company = computed(() => {
    const user = this.user();
    const props = user?.properties ?? {};
    return props.company || props[NUXEO_SCHEMA_FIELDS.user.company] || '—';
  });

  readonly groupsTableConfig: TableColumn[] = USER_DETAIL_GROUPS_TABLE_CONFIG;
  readonly permissionsTableConfig: TableColumn[] = USER_DETAIL_PERMISSIONS_TABLE_CONFIG;

  readonly groupsDefaultColumnOptions: TableColOption[] = this.buildDefaultColumnOptions(this.groupsTableConfig);
  readonly permissionsDefaultColumnOptions: TableColOption[] = this.buildDefaultColumnOptions(
    this.permissionsTableConfig
  );

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const userId = params.get('userId')?.trim() ?? '';
      if (!userId) {
        return;
      }
      this.userId.set(userId);
      this.loadUser(userId);
    });
  }

  private buildDefaultColumnOptions(tableConfig: TableColumn[]): TableColOption[] {
    return tableConfig.map(col => ({
      id: col.key.toString(),
      label: col.label,
      visible: col.visible ?? true,
    }));
  }

  deleteUser() {
    const userId = this.userId();
    if (!userId) return;

    this.nuxeoApi
      .deleteUser(userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: USER_DELETE_SUCCESS_MESSAGE,
          });
          this.router.navigate(['/admin/anvandare-grupper']);
        },
        error: () => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: USER_DELETE_ERROR_MESSAGE,
          });
        },
      });
  }

  openAddToGroup() {
    const groups = this.groupsRows().map(row => ({
      id: row['identifier'],
      label: row['name'],
      value: row['identifier'],
      selected: true,
    }));

    this.groupOptions.set(groups);
    this.addToGroupFormConfig.set(this.buildAddToGroupFormConfig(groups));
    this.isAddToGroupOpen.set(true);
    this.loadGroupOptions('');
  }

  closeAddToGroup() {
    this.isAddToGroupOpen.set(false);
    this.addToGroupFormConfig.set(this.buildAddToGroupFormConfig());
  }

  submitAddToGroup(form: GeneralFormComponent) {
    form.submit();
  }

  handleAddToGroup(formValues: Record<string, unknown>) {
    const selectedGroups = extractMemberIds(formValues['groups']);
    if (!selectedGroups.length) return;

    forkJoin(selectedGroups.map(groupId => this.nuxeoApi.addUserToGroup(this.userId(), groupId.replace(/^group:/, ''))))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: USER_GROUP_ADD_MEMBERS_SUCCESS_MESSAGE,
          });
          this.closeAddToGroup();
          this.loadUser(this.userId());
        },
        error: () => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: USER_GROUP_ADD_MEMBERS_ERROR_MESSAGE,
          });
        },
      });
  }

  handleAddToGroupDropdownChanged(event: { fieldName: string; value: unknown }) {
    if (event.fieldName !== 'groups') return;

    const term = event.value ? event.value.toString() : '';
    this.loadGroupOptions(term);
  }

  openRemoveGroup(groupId: string, event: Event) {
    event.stopPropagation();
    if (!groupId) return;
    this.pendingRemoveGroupId.set(groupId);
    this.isRemoveGroupOpen.set(true);
  }

  closeRemoveGroup() {
    this.isRemoveGroupOpen.set(false);
    this.pendingRemoveGroupId.set(null);
  }

  confirmRemoveGroup() {
    const groupId = this.pendingRemoveGroupId();
    if (!groupId) return;

    this.nuxeoApi
      .removeUserFromGroup(this.userId(), groupId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: USER_GROUP_REMOVE_MEMBER_SUCCESS_MESSAGE,
          });
          this.closeRemoveGroup();
          this.loadUser(this.userId());
        },
        error: () => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: USER_GROUP_REMOVE_MEMBER_ERROR_MESSAGE,
          });
        },
      });
  }

  openChangePassword() {
    this.changePasswordFormConfig.set(this.buildChangePasswordFormConfig());
    this.isChangePasswordOpen.set(true);
  }

  closeChangePassword() {
    this.isChangePasswordOpen.set(false);
  }

  submitChangePassword(form?: GeneralFormComponent | null) {
    form?.submit();
  }

  handleChangePassword(formValues: Record<string, unknown>) {
    const user = this.user();
    if (!user) return;

    const rawPassword = formValues['password'];
    const password = typeof rawPassword === 'string' ? rawPassword : '';
    const rawPasswordVerify = formValues['passwordVerify'];
    const passwordVerify = typeof rawPasswordVerify === 'string' ? rawPasswordVerify : '';
    if (!password || password !== passwordVerify) return;

    const payload: NxUser = {
      'entity-type': 'user',
      id: user.id,
      properties: {
        ...(user.properties ?? {}),
        password,
      },
    };

    this.nuxeoApi
      .updateUser(user.id, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: USER_PASSWORD_UPDATE_SUCCESS_MESSAGE,
          });
          this.isChangePasswordOpen.set(false);
        },
        error: () => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: USER_PASSWORD_UPDATE_ERROR_MESSAGE,
          });
        },
      });
  }

  openEditUser() {
    const user = this.user();
    this.editUserFormConfig.set(this.buildEditUserFormConfig(user));
    this.isEditUserOpen.set(true);
  }

  closeEditUser() {
    this.isEditUserOpen.set(false);
  }

  submitEditUser(form?: GeneralFormComponent | null) {
    form?.submit();
  }

  handleEditUser(formValues: Record<string, unknown>) {
    const user = this.user();
    if (!user) return;

    const props = user.properties ?? {};
    const username = (props.username ?? user.id ?? '').toString().trim();
    const rawEmail = formValues['email'];
    const email = typeof rawEmail === 'string' ? rawEmail : '';
    if (!username || !email) return;

    const rawFirstName = formValues['firstName'];
    const firstName = typeof rawFirstName === 'string' ? rawFirstName : '';
    const rawLastName = formValues['lastName'];
    const lastName = typeof rawLastName === 'string' ? rawLastName : '';
    const rawCompany = formValues['company'];
    const company = typeof rawCompany === 'string' ? rawCompany : '';

    const payload: NxUser = {
      'entity-type': 'user',
      id: user.id,
      properties: {
        ...(props ?? {}),
        username,
        firstName,
        lastName,
        company,
        email,
      },
    };

    this.nuxeoApi
      .updateUser(user.id, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: updated => {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: USER_UPDATE_SUCCESS_MESSAGE,
          });
          this.user.set(updated ?? payload);
          this.isEditUserOpen.set(false);
        },
        error: () => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: USER_UPDATE_ERROR_MESSAGE,
          });
        },
      });
  }

  private loadUser(userId: string) {
    this.nuxeoApi
      .getUser(userId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of(null))
      )
      .subscribe(user => {
        if (!user) {
          this.user.set(null);
          this.groupsRows.set([]);
          this.groupsTotal.set(0);
          return;
        }

        this.user.set(user);
        const props = user.properties ?? {};
        const extendedGroups = Array.isArray(user.extendedGroups) ? user.extendedGroups : [];
        const groups = props.groups || props[NUXEO_SCHEMA_FIELDS.user.groups] || [];
        const rows = extendedGroups.length
          ? extendedGroups.map(group => {
              const id = group.name ?? group.label ?? '';
              return {
                id,
                name: group.label ?? group.name ?? '',
                identifier: group.name ?? group.label ?? '',
                link: id ? ['/admin/anvandare-grupper', id] : undefined,
              };
            })
          : Array.isArray(groups)
            ? groups.map(groupId => ({
                id: groupId,
                name: groupId,
                identifier: groupId,
                link: groupId ? ['/admin/anvandare-grupper', groupId] : undefined,
              }))
            : [];
        this.groupsRows.set(rows);
        this.groupsTotal.set(rows.length);

        const onPath = `/default-domain/UserWorkspaces/${this.userId()}`;
        this.permissionsRows.set([
          {
            id: this.userId(),
            on: `${this.displayName()}\n${onPath}`,
            right: 'Everything',
            timeFrame: 'Permanent',
            grantedBy: '—',
          },
        ]);
        this.permissionsTotal.set(1);

        const isAdminGroup = rows.some(row => row.identifier === 'administrators' || row.name === 'administrators');
        this.adminPermissionsRows.set([]);
        this.adminPermissionsTotal.set(isAdminGroup ? 0 : 0);
      });
  }

  private buildAddToGroupFormConfig(defaultGroups: Option[] = []): FieldConfig[] {
    return [
      {
        type: 'dropdown-search',
        name: 'groups',
        label: this.store.getValue('userManagement.groups'),
        placeholder: this.store.getValue('userManagement.search.groups'),
        defaultValue: defaultGroups,
        options: defaultGroups,
        multiple: true,
        props: { optionsSignal: this.groupOptions },
      },
    ];
  }

  private mapSuggestionsToOptions(suggestions: UserSuggestion[]): Option[] {
    return suggestions
      .map(suggestion => {
        const id = suggestion.id || suggestion.prefixed_id || '';
        const label = suggestion.displayLabel || suggestion.id || '';
        return {
          id,
          label,
          value: id,
        };
      })
      .filter(option => option.id.length);
  }

  private loadGroupOptions(term: string) {
    const selectedGroups = this.getSelectedGroupOptions();

    this.nuxeoApi.getUserGroupSuggestions(term, 'GROUP_TYPE').subscribe(suggestions => {
      const optionsMap = new Map<string, Option>();

      selectedGroups.forEach(option => optionsMap.set(option.id, option));
      this.mapSuggestionsToOptions(suggestions).forEach(option => optionsMap.set(option.id, option));

      this.groupOptions.set(Array.from(optionsMap.values()));
    });
  }

  private getSelectedGroupOptions(): Option[] {
    return this.groupsRows().map(row => ({
      id: row['identifier'],
      label: row['name'],
      value: row['identifier'],
      selected: true,
    }));
  }

  private buildEditUserFormConfig(user: NxUser | null): FieldConfig[] {
    const props = user?.properties ?? {};
    const companyValue = props[NUXEO_SCHEMA_FIELDS.user.company];
    const emailValue = props[NUXEO_SCHEMA_FIELDS.user.email];
    return [
      {
        type: 'input',
        name: 'firstName',
        label: 'First Name',
        placeholder: 'First Name',
        defaultValue: props.firstName ?? props[NUXEO_SCHEMA_FIELDS.user.firstName] ?? '',
      },
      {
        type: 'input',
        name: 'lastName',
        label: 'Last Name',
        placeholder: 'Last Name',
        defaultValue: props.lastName ?? props[NUXEO_SCHEMA_FIELDS.user.lastName] ?? '',
      },
      {
        type: 'input',
        name: 'company',
        label: 'Company',
        placeholder: 'Company',
        defaultValue:
          typeof props.company === 'string' ? props.company : typeof companyValue === 'string' ? companyValue : '',
      },
      {
        type: 'input',
        name: 'email',
        label: 'Email',
        placeholder: 'Email',
        defaultValue: typeof props.email === 'string' ? props.email : typeof emailValue === 'string' ? emailValue : '',
        validators: [Validators.required],
      },
    ];
  }

  private buildChangePasswordFormConfig(): FieldConfig[] {
    return [
      {
        type: 'input',
        name: 'password',
        label: 'Password',
        placeholder: 'Password',
        inputType: 'password',
        validators: [Validators.required],
      },
      {
        type: 'input',
        name: 'passwordVerify',
        label: 'Password (verify)',
        placeholder: 'Password (verify)',
        inputType: 'password',
        validators: [Validators.required],
      },
    ];
  }
}
