import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DigiArbetsformedlingenAngularModule, DigiNavigationBreadcrumbs } from '@designsystem-se/af-angular';
import { CaseListTableComponent, TableColumn } from '@app/shared/components/case-list-table/case-list-table.component';
import { TableColOption } from '@app/shared/components/table-col-options/table-col-options.component';
import { TableItem } from '@app/shared/models/case-table';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { SearchService } from '@app/core/services/search.service';
import { NuxeoDocument, NuxeoDocuments, NuxeoGroup, NxUser, UserSuggestion } from '@app/shared/api/nuxeo-api.types';
import { Subject, forkJoin, of, catchError } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GeneralFormComponent } from '@app/shared/components/general-form/general-form.component';
import { FieldConfig } from '@app/shared/components/general-form/general-form.types';
import { Validators } from '@angular/forms';
import { Option } from '@app/shared/commonTypes';
import { extractMemberIds } from '@app/shared/utils/option-utils';
import {
  USER_GROUPS_GROUPS_TABLE_CONFIG,
  USER_GROUPS_RECENT_TABLE_CONFIG,
  USER_GROUPS_USERS_TABLE_CONFIG,
} from './user-groups-table.constants';
import { GeneralStore } from '@app/core/services/general-store.service';
import {
  USER_CREATE_ERROR_MESSAGE,
  USER_CREATE_SUCCESS_MESSAGE,
  USER_GROUP_CREATE_ERROR_MESSAGE,
  USER_GROUP_CREATE_SUCCESS_MESSAGE,
} from '@app/shared/constants/notification-messages';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

@Component({
  selector: 'nuxeo-user-groups',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DigiNavigationBreadcrumbs,
    DigiArbetsformedlingenAngularModule,
    CaseListTableComponent,
    GeneralFormComponent,
  ],
  templateUrl: './user-groups.component.html',
})
export class UserGroupsComponent {
  private readonly nuxeoApi = inject(NuxeoApiService);
  private readonly searchService = inject(SearchService);
  readonly store = inject(GeneralStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly search$ = new Subject<string>();

  readonly searchTerm = signal('');
  readonly groupsRows = signal<TableItem[]>([]);
  readonly usersRows = signal<TableItem[]>([]);
  readonly groupsTotal = signal(0);
  readonly usersTotal = signal(0);
  readonly pageSize = 50;

  readonly recentRows = signal<TableItem[]>([]);
  readonly recentTotal = signal(0);
  readonly isCreateGroupOpen = signal(false);
  readonly createGroupAction = signal<'close' | 'another'>('close');
  readonly memberOptions = signal<Option[]>([]);
  readonly createGroupFormConfig = signal<FieldConfig[]>(this.buildCreateGroupFormConfig());
  readonly isCreateUserOpen = signal(false);
  readonly createUserAction = signal<'close' | 'another'>('close');
  readonly groupOptions = signal<Option[]>([]);
  readonly createUserFormConfig = signal<FieldConfig[]>(this.buildCreateUserFormConfig());

  readonly groupsTableConfig: TableColumn[] = USER_GROUPS_GROUPS_TABLE_CONFIG;
  readonly usersTableConfig: TableColumn[] = USER_GROUPS_USERS_TABLE_CONFIG;
  readonly recentTableConfig: TableColumn[] = USER_GROUPS_RECENT_TABLE_CONFIG;

  readonly groupsDefaultColumnOptions: TableColOption[] = this.buildDefaultColumnOptions(this.groupsTableConfig);
  readonly usersDefaultColumnOptions: TableColOption[] = this.buildDefaultColumnOptions(this.usersTableConfig);
  readonly recentDefaultColumnOptions: TableColOption[] = this.buildDefaultColumnOptions(this.recentTableConfig);

  constructor() {
    this.search$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(term => this.fetchResults(term));
    this.fetchRecent();
  }

  onSearchInput(event: unknown) {
    const term = this.searchService.extractTerm(event);
    this.searchTerm.set(term);
    if (!term) {
      this.groupsRows.set([]);
      this.usersRows.set([]);
      this.groupsTotal.set(0);
      this.usersTotal.set(0);
      return;
    }
    this.search$.next(term);
  }

  refreshResults() {
    this.search$.next(this.searchTerm());
  }

  refreshRecent() {
    this.fetchRecent();
  }

  openGroupDetail(groupId: string) {
    if (!groupId) return;
    this.router.navigate(['/admin/anvandare-grupper', groupId]);
  }

  openUserDetail(userId: string) {
    if (!userId) return;
    this.router.navigate(['/admin/anvandare-grupper/users', userId]);
  }

  openRecentDetail(rowId: string) {
    const entry = this.recentRows().find(item => item['id'] === rowId);
    if (!entry) return;
    if (entry['entryType'] === 'group') {
      this.openGroupDetail(rowId);
      return;
    }
    this.openUserDetail(rowId);
  }

  openCreateGroup() {
    this.isCreateGroupOpen.set(true);
  }

  closeCreateGroup() {
    this.isCreateGroupOpen.set(false);
    this.createGroupFormConfig.set(this.buildCreateGroupFormConfig());
  }

  submitCreateGroup(action: 'close' | 'another', form?: GeneralFormComponent | null) {
    this.createGroupAction.set(action);
    form?.submit();
  }

  handleCreateGroup(formValues: Record<string, unknown>) {
    const rawGroupName = formValues['groupName'];
    const groupname = typeof rawGroupName === 'string' ? rawGroupName.trim() : '';
    if (!groupname) {
      return;
    }

    const rawGroupLabel = formValues['groupLabel'];
    const grouplabel = typeof rawGroupLabel === 'string' ? rawGroupLabel.trim() : '';

    const members = extractMemberIds(formValues['members']);
    const memberUsers: string[] = [];
    const memberGroups: string[] = [];

    members.forEach(member => {
      if (member.startsWith('group:')) {
        memberGroups.push(member);
      } else if (member.startsWith('user:')) {
        memberUsers.push(member);
      } else {
        memberUsers.push(member);
      }
    });
    const payload: Parameters<NuxeoApiService['createGroup']>[0] = {
      'entity-type': 'group',
      groupname,
      grouplabel: grouplabel || groupname,
      memberUsers,
      memberGroups,
    };
    this.nuxeoApi
      .createGroup(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: USER_GROUP_CREATE_SUCCESS_MESSAGE,
          });
          if (this.createGroupAction() === 'another') {
            this.createGroupFormConfig.set(this.buildCreateGroupFormConfig());
            this.refreshRecent();
            if (this.searchTerm()) {
              this.refreshResults();
            }
            return;
          }
          this.isCreateGroupOpen.set(false);
          this.refreshRecent();
          if (this.searchTerm()) {
            this.refreshResults();
          }
        },
        error: () => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: USER_GROUP_CREATE_ERROR_MESSAGE,
          });
        },
      });
  }

  handleCreateGroupDropdownChanged(event: { fieldName: string; value: unknown }) {
    if (event.fieldName !== 'members') {
      return;
    }
    const term = event.value ? event.value.toString() : '';
    this.nuxeoApi.getUserGroupSuggestions(term).subscribe(suggestions => {
      this.memberOptions.set(this.mapSuggestionsToOptions(suggestions));
    });
  }

  openCreateUser() {
    this.isCreateUserOpen.set(true);
  }

  closeCreateUser() {
    this.isCreateUserOpen.set(false);
    this.createUserFormConfig.set(this.buildCreateUserFormConfig());
  }

  submitCreateUser(action: 'close' | 'another', form?: GeneralFormComponent | null) {
    this.createUserAction.set(action);
    form?.submit();
  }

  handleCreateUser(formValues: Record<string, unknown>) {
    const rawUsername = formValues['username'];
    const username = typeof rawUsername === 'string' ? rawUsername.trim() : '';
    const rawEmail = formValues['email'];
    const email = typeof rawEmail === 'string' ? rawEmail.trim() : '';
    if (!username || !email) {
      return;
    }

    const rawFirstName = formValues['firstName'];
    const firstName = typeof rawFirstName === 'string' ? rawFirstName.trim() : '';
    const rawLastName = formValues['lastName'];
    const lastName = typeof rawLastName === 'string' ? rawLastName.trim() : '';
    const rawCompany = formValues['company'];
    const company = typeof rawCompany === 'string' ? rawCompany.trim() : '';
    const groups = extractMemberIds(formValues['groups']);
    const rawPassword = formValues['password'];
    const password = typeof rawPassword === 'string' ? rawPassword.trim() : '';
    const rawPasswordVerify = formValues['passwordVerify'];
    const passwordVerify = typeof rawPasswordVerify === 'string' ? rawPasswordVerify.trim() : '';

    if (!password || password !== passwordVerify) {
      return;
    }

    const payload: Parameters<NuxeoApiService['createUser']>[0] = {
      'entity-type': 'user',
      id: '',
      properties: {
        username,
        firstName,
        lastName,
        company,
        email,
        groups,
        password,
      },
    };
    this.nuxeoApi
      .createUser(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: USER_CREATE_SUCCESS_MESSAGE,
          });
          if (this.createUserAction() === 'another') {
            this.createUserFormConfig.set(this.buildCreateUserFormConfig());
            this.refreshRecent();
            if (this.searchTerm()) {
              this.refreshResults();
            }
            return;
          }
          this.isCreateUserOpen.set(false);
          this.refreshRecent();
          if (this.searchTerm()) {
            this.refreshResults();
          }
        },
        error: () => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: USER_CREATE_ERROR_MESSAGE,
          });
        },
      });
  }

  handleCreateUserDropdownChanged(event: { fieldName: string; value: unknown }) {
    if (event.fieldName !== 'groups') {
      return;
    }
    const term = event.value ? event.value.toString() : '';
    this.nuxeoApi.getUserGroupSuggestions(term, 'GROUP_TYPE').subscribe(suggestions => {
      this.groupOptions.set(this.mapSuggestionsToOptions(suggestions));
    });
  }

  private fetchResults(term: string) {
    forkJoin({
      groups: this.nuxeoApi.searchGroups(term, 0, this.pageSize),
      users: this.nuxeoApi.searchUsers(term, 0, this.pageSize),
    })
      .pipe(
        catchError(() => of({ groups: null, users: null })),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(result => {
        const groupEntries = result.groups?.entries ?? [];
        const userEntries = result.users?.entries ?? [];

        this.groupsRows.set(groupEntries.map(entry => this.mapGroupToRow(entry)));
        this.usersRows.set(userEntries.map(entry => this.mapUserToRow(entry)));
        this.groupsTotal.set(result.groups?.resultsCount ?? groupEntries.length);
        this.usersTotal.set(result.users?.resultsCount ?? userEntries.length);
      });
  }

  private fetchRecent() {
    this.nuxeoApi
      .getLatestCreatedUsersOrGroups(0, 0)
      .pipe(catchError(() => of(null)))
      .subscribe((result: NuxeoDocuments | null) => {
        const entries = result?.entries ?? [];
        this.recentRows.set(entries.map(entry => this.mapRecentEntry(entry)));
        this.recentTotal.set((result?.totalSize ?? entries.length) || entries.length);
      });
  }

  private mapRecentEntry(entry: NuxeoDocument): TableItem {
    const type = entry.type ?? '';
    if (type === 'group') {
      const props = this.asRecord(entry.properties);
      const groupLabel =
        typeof props[NUXEO_SCHEMA_FIELDS.group.grouplabel] === 'string'
          ? props[NUXEO_SCHEMA_FIELDS.group.grouplabel]
          : undefined;
      const groupName =
        typeof props[NUXEO_SCHEMA_FIELDS.group.groupname] === 'string'
          ? props[NUXEO_SCHEMA_FIELDS.group.groupname]
          : undefined;
      const name = groupLabel ?? entry.title ?? entry.uid ?? '-';
      const identifier = groupName ?? entry.uid ?? '-';
      return {
        id: identifier,
        name,
        identifier,
        email: '-',
        entryType: 'group',
        link: ['/admin/anvandare-grupper', identifier],
      };
    }

    const props = this.asRecord(entry.properties);
    const firstName =
      typeof props[NUXEO_SCHEMA_FIELDS.user.firstName] === 'string' ? props[NUXEO_SCHEMA_FIELDS.user.firstName] : '';
    const lastName =
      typeof props[NUXEO_SCHEMA_FIELDS.user.lastName] === 'string' ? props[NUXEO_SCHEMA_FIELDS.user.lastName] : '';
    const fullName = `${firstName} ${lastName}`.trim();
    const email =
      typeof props[NUXEO_SCHEMA_FIELDS.user.email] === 'string' ? props[NUXEO_SCHEMA_FIELDS.user.email] : '';
    const identifier =
      typeof props[NUXEO_SCHEMA_FIELDS.user.username] === 'string'
        ? props[NUXEO_SCHEMA_FIELDS.user.username]
        : (entry.uid ?? '-');
    return {
      id: identifier,
      name: fullName || entry.title || entry.uid || '-',
      identifier,
      email,
      entryType: 'user',
      link: ['/admin/anvandare-grupper/users', identifier],
    };
  }

  private mapGroupToRow(group: NuxeoGroup): TableItem {
    const identifier = group.id || group.groupname || '-';
    const name = group.grouplabel || group.groupname || group.id || '-';
    const memberCount = (group.memberUsers?.length ?? 0) + (group.memberGroups?.length ?? 0);
    const contains = `${memberCount} ${memberCount === 1 ? 'member' : 'members'}`;

    return {
      id: identifier,
      name,
      identifier,
      contains,
      link: ['/admin/anvandare-grupper', identifier],
    };
  }

  private mapUserToRow(user: NxUser): TableItem {
    const props = this.asRecord(user.properties);
    const firstName = typeof props['firstName'] === 'string' ? props['firstName'] : '';
    const altFirstName =
      typeof props[NUXEO_SCHEMA_FIELDS.user.firstName] === 'string' ? props[NUXEO_SCHEMA_FIELDS.user.firstName] : '';
    const lastName = typeof props['lastName'] === 'string' ? props['lastName'] : '';
    const altLastName =
      typeof props[NUXEO_SCHEMA_FIELDS.user.lastName] === 'string' ? props[NUXEO_SCHEMA_FIELDS.user.lastName] : '';
    const fullName = `${firstName} ${lastName}`.trim();
    const email =
      typeof props['email'] === 'string'
        ? props['email']
        : typeof props[NUXEO_SCHEMA_FIELDS.user.email] === 'string'
          ? props[NUXEO_SCHEMA_FIELDS.user.email]
          : '';

    return {
      id: user.id,
      name: fullName || `${altFirstName} ${altLastName}`.trim() || user.id,
      identifier: user.id,
      email,
      link: ['/admin/anvandare-grupper/users', user.id],
    };
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (typeof value !== 'object' || value === null) return {};
    return Object.entries(value).reduce<Record<string, unknown>>((acc, [key, val]) => {
      acc[key] = val;
      return acc;
    }, {});
  }

  private buildCreateGroupFormConfig(): FieldConfig[] {
    return [
      {
        type: 'input',
        name: 'groupName',
        label: 'Group Name',
        placeholder: 'Group Name',
        validators: [Validators.required],
      },
      {
        type: 'input',
        name: 'groupLabel',
        label: 'Group Label',
        placeholder: 'Group Label',
      },
      {
        type: 'dropdown-search',
        name: 'members',
        label: 'Members',
        placeholder: 'Search for users and groups',
        options: [],
        multiple: true,
        props: { optionsSignal: this.memberOptions },
      },
    ];
  }

  private buildCreateUserFormConfig(): FieldConfig[] {
    return [
      {
        type: 'input',
        name: 'username',
        label: 'Username',
        placeholder: 'Username',
        validators: [Validators.required],
      },
      {
        type: 'input',
        name: 'firstName',
        label: 'First Name',
        placeholder: 'First Name',
      },
      {
        type: 'input',
        name: 'lastName',
        label: 'Last Name',
        placeholder: 'Last Name',
      },
      {
        type: 'input',
        name: 'company',
        label: 'Company',
        placeholder: 'Company',
      },
      {
        type: 'input',
        name: 'email',
        label: 'Email',
        placeholder: 'Email',
        validators: [Validators.required],
      },
      {
        type: 'dropdown-search',
        name: 'groups',
        label: 'Groups',
        placeholder: 'Search for groups',
        options: [],
        multiple: true,
        props: { optionsSignal: this.groupOptions },
      },
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

  private buildDefaultColumnOptions(tableConfig: TableColumn[]): TableColOption[] {
    return tableConfig.map(col => ({
      id: col.key.toString(),
      label: col.label,
      visible: col.visible ?? true,
    }));
  }
}
