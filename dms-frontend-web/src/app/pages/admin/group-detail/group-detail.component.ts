import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DigiArbetsformedlingenAngularModule, DigiNavigationBreadcrumbs } from '@designsystem-se/af-angular';
import { catchError, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CaseListTableComponent, TableColumn } from '@app/shared/components/case-list-table/case-list-table.component';
import { TableColOption } from '@app/shared/components/table-col-options/table-col-options.component';
import { TableItem } from '@app/shared/models/case-table';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NuxeoGroup, NxUser, UserSuggestion } from '@app/shared/api/nuxeo-api.types';
import { GeneralStore } from '@app/core/services/general-store.service';
import { extractMemberIds } from '@app/shared/utils/option-utils';
import {
  USER_GROUP_DELETE_ERROR_MESSAGE,
  USER_GROUP_DELETE_SUCCESS_MESSAGE,
  USER_GROUP_REMOVE_MEMBER_ERROR_MESSAGE,
  USER_GROUP_REMOVE_MEMBER_SUCCESS_MESSAGE,
  USER_GROUP_ADD_MEMBERS_ERROR_MESSAGE,
  USER_GROUP_ADD_MEMBERS_SUCCESS_MESSAGE,
  USER_GROUP_UPDATE_ERROR_MESSAGE,
  USER_GROUP_UPDATE_SUCCESS_MESSAGE,
} from '@app/shared/constants/notification-messages';
import {
  GROUP_DETAIL_NESTED_GROUPS_TABLE_CONFIG,
  GROUP_DETAIL_PERMISSIONS_TABLE_CONFIG,
  GROUP_DETAIL_USERS_TABLE_CONFIG,
} from './group-detail-table.constants';
import { GeneralFormComponent } from '@app/shared/components/general-form/general-form.component';
import { FieldConfig } from '@app/shared/components/general-form/general-form.types';
import { Option } from '@app/shared/commonTypes';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

@Component({
  selector: 'nuxeo-group-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterModule,
    DigiNavigationBreadcrumbs,
    DigiArbetsformedlingenAngularModule,
    CaseListTableComponent,
    GeneralFormComponent,
  ],
  templateUrl: './group-detail.component.html',
})
export class GroupDetailComponent {
  private readonly nuxeoApi = inject(NuxeoApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  readonly store = inject(GeneralStore);

  readonly isDeleteDialogOpen = signal(false);
  readonly isAddMembersOpen = signal(false);
  readonly isRemoveMemberOpen = signal(false);
  readonly isEditGroupOpen = signal(false);
  readonly editGroupFormConfig = signal<FieldConfig[]>(this.buildEditGroupFormConfig(''));
  readonly pendingRemoveMemberId = signal<string | null>(null);
  readonly memberOptions = signal<Option[]>([]);
  readonly addMembersFormConfig = signal<FieldConfig[]>(this.buildAddMembersFormConfig());
  readonly groupId = signal('');
  readonly group = signal<NuxeoGroup | null>(null);
  readonly usersRows = signal<TableItem[]>([]);
  readonly usersTotal = signal(0);
  readonly nestedGroupsRows = signal<TableItem[]>([]);
  readonly nestedGroupsTotal = signal(0);
  readonly permissionsRows = signal<TableItem[]>([]);
  readonly permissionsTotal = signal(0);
  readonly pageSize = 50;

  readonly groupLabel = computed(() => {
    const group = this.group();
    return (
      group?.grouplabel || group?.properties?.grouplabel || group?.groupname || group?.id || this.groupId() || 'Group'
    );
  });

  readonly groupIdentifier = computed(() => {
    const group = this.group();
    return group?.groupname || group?.id || this.groupId() || '—';
  });

  readonly memberSummary = computed(() => {
    const group = this.group();
    const userCount = group?.memberUsers?.length ?? this.usersRows().length;
    const groupCount = group?.memberGroups?.length ?? this.nestedGroupsRows().length;
    return `${userCount} member${userCount === 1 ? '' : 's'} + ${groupCount} nested group${
      groupCount === 1 ? '' : 's'
    }`;
  });

  readonly usersTableConfig: TableColumn[] = GROUP_DETAIL_USERS_TABLE_CONFIG;
  readonly nestedGroupsTableConfig: TableColumn[] = GROUP_DETAIL_NESTED_GROUPS_TABLE_CONFIG;
  readonly permissionsTableConfig: TableColumn[] = GROUP_DETAIL_PERMISSIONS_TABLE_CONFIG;

  readonly usersDefaultColumnOptions: TableColOption[] = this.buildDefaultColumnOptions(this.usersTableConfig);
  readonly nestedGroupsDefaultColumnOptions: TableColOption[] = this.buildDefaultColumnOptions(
    this.nestedGroupsTableConfig
  );
  readonly permissionsDefaultColumnOptions: TableColOption[] = this.buildDefaultColumnOptions(
    this.permissionsTableConfig
  );

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const groupId = params.get('groupId')?.trim() ?? '';
      if (!groupId) {
        return;
      }
      this.groupId.set(groupId);
      this.loadGroup(groupId);
    });
  }

  openAddMembers() {
    const members = this.usersRows()
      .map(row => row['identifier'])
      .filter((id): id is string => typeof id === 'string' && id.length > 0);
    const defaults = members.map(id => ({ id, label: id, value: id, selected: true }));

    this.memberOptions.set(defaults);
    this.addMembersFormConfig.set(this.buildAddMembersFormConfig(defaults));
    this.isAddMembersOpen.set(true);
  }

  openEditGroup() {
    const group = this.group();
    const label = group?.grouplabel ?? group?.properties?.grouplabel ?? group?.groupname ?? this.groupId();
    this.editGroupFormConfig.set(this.buildEditGroupFormConfig(label ?? ''));
    this.isEditGroupOpen.set(true);
  }

  closeEditGroup() {
    this.isEditGroupOpen.set(false);
  }

  submitEditGroup(form?: GeneralFormComponent | null) {
    form?.submit();
  }

  handleEditGroup(formValues: Record<string, unknown>) {
    const group = this.group();
    if (!group) return;

    const rawLabel = formValues['grouplabel'];
    const grouplabel = typeof rawLabel === 'string' ? rawLabel.trim() : '';
    if (!grouplabel) return;

    const payload: NuxeoGroup = {
      'entity-type': 'group',
      groupname: group.groupname ?? group.id ?? this.groupId(),
      grouplabel,
      id: group.id ?? this.groupId(),
      properties: {
        ...(group.properties ?? {}),
        grouplabel,
      },
      memberUsers: group.memberUsers ?? [],
      memberGroups: group.memberGroups ?? [],
    };

    this.nuxeoApi.updateGroup(this.groupId(), payload).subscribe({
      next: updated => {
        this.store.notification.set({
          show: true,
          variation: 'success',
          text: USER_GROUP_UPDATE_SUCCESS_MESSAGE,
        });
        this.group.set(updated ?? payload);
        this.isEditGroupOpen.set(false);
      },
      error: () => {
        this.store.notification.set({
          show: true,
          variation: 'danger',
          text: USER_GROUP_UPDATE_ERROR_MESSAGE,
        });
      },
    });
  }

  closeAddMembers() {
    this.isAddMembersOpen.set(false);
    this.addMembersFormConfig.set(this.buildAddMembersFormConfig());
  }

  submitAddMembers(form?: GeneralFormComponent | null) {
    form?.submit();
  }

  handleAddMembers(formValues: Record<string, unknown>) {
    const group = this.group();
    if (!group) return;

    const selected = extractMemberIds(formValues['members'], { selectedOnly: true });
    if (!selected.length) {
      return;
    }

    const memberUsers = selected;
    const payload: NuxeoGroup = {
      'entity-type': 'group',
      groupname: group.groupname ?? group.id ?? this.groupId(),
      grouplabel: group.grouplabel ?? group.properties?.grouplabel ?? group.groupname ?? this.groupId(),
      id: group.id ?? this.groupId(),
      properties: group.properties,
      memberUsers,
      memberGroups: group.memberGroups ?? [],
    };
    this.nuxeoApi.updateGroup(this.groupId(), payload).subscribe({
      next: updated => {
        const mergedGroup: NuxeoGroup = {
          ...(updated ?? payload),
          memberUsers,
          memberGroups: payload.memberGroups,
        };
        this.store.notification.set({
          show: true,
          variation: 'success',
          text: USER_GROUP_ADD_MEMBERS_SUCCESS_MESSAGE,
        });
        this.group.set(mergedGroup);
        this.loadMembers(this.groupId(), mergedGroup);
        this.isAddMembersOpen.set(false);
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

  handleAddMembersDropdownChanged(event: { fieldName: string; value: unknown }) {
    if (event.fieldName !== 'members') {
      return;
    }
    const term = event.value ? event.value.toString() : '';
    this.nuxeoApi.getUserGroupSuggestions(term, 'USER_TYPE').subscribe(suggestions => {
      this.memberOptions.set(this.mapSuggestionsToOptions(suggestions));
    });
  }

  openRemoveMember(memberId: string, event?: Event) {
    event?.stopPropagation();
    if (!memberId) return;
    this.pendingRemoveMemberId.set(memberId);
    this.isRemoveMemberOpen.set(true);
  }

  closeRemoveMember() {
    this.isRemoveMemberOpen.set(false);
    this.pendingRemoveMemberId.set(null);
  }

  confirmRemoveMember() {
    const group = this.group();
    const memberId = this.pendingRemoveMemberId();
    if (!group || !memberId) return;

    const tableUsers = this.usersRows()
      .map(row => row['identifier'])
      .filter((id): id is string => typeof id === 'string' && id.length > 0);
    const currentUsers = (group.memberUsers ?? []).length ? (group.memberUsers ?? []) : tableUsers;
    const memberUsers = currentUsers.filter(userId => userId !== memberId);
    const payload: NuxeoGroup = {
      'entity-type': 'group',
      groupname: group.groupname ?? group.id ?? this.groupId(),
      grouplabel: group.grouplabel ?? group.properties?.grouplabel ?? group.groupname ?? this.groupId(),
      id: group.id ?? this.groupId(),
      properties: group.properties,
      memberUsers,
      memberGroups: group.memberGroups ?? [],
    };
    this.nuxeoApi.updateGroup(this.groupId(), payload).subscribe({
      next: updated => {
        const mergedGroup: NuxeoGroup = {
          ...(updated ?? payload),
          memberUsers,
          memberGroups: payload.memberGroups,
        };
        this.store.notification.set({
          show: true,
          variation: 'success',
          text: USER_GROUP_REMOVE_MEMBER_SUCCESS_MESSAGE,
        });
        this.group.set(mergedGroup);
        this.loadMembers(this.groupId(), mergedGroup);
        this.closeRemoveMember();
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

  onUsersSearch(event: { field: string; value: string | string[] }) {
    if (event.field !== 'name') return;
    const groupId = this.groupId();
    if (!groupId) return;
    const query = Array.isArray(event.value) ? event.value.join(' ').trim() : (event.value ?? '');

    this.nuxeoApi
      .getGroupUsers(groupId, query, 0)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of(null))
      )
      .subscribe(result => {
        const entries = result?.entries ?? [];
        const rows = entries.map(entry => this.mapUserToRow(entry));
        this.usersRows.set(rows);
        this.usersTotal.set(result?.resultsCount ?? rows.length);
      });
  }

  openUserDetail(userId: string) {
    if (!userId) return;
    this.router.navigate(['/admin/anvandare-grupper/users', userId]);
  }

  deleteGroup() {
    const groupId = this.groupId();
    if (!groupId) return;

    this.nuxeoApi
      .deleteGroup(groupId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: USER_GROUP_DELETE_SUCCESS_MESSAGE,
          });
          this.router.navigate(['/admin/anvandare-grupper']);
        },
        error: () => {
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: USER_GROUP_DELETE_ERROR_MESSAGE,
          });
        },
      });
  }

  private loadGroup(groupId: string) {
    this.nuxeoApi
      .getGroup(groupId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of(null))
      )
      .subscribe(group => {
        if (!group) {
          this.group.set(null);
          this.usersRows.set([]);
          this.usersTotal.set(0);
          this.nestedGroupsRows.set([]);
          this.nestedGroupsTotal.set(0);
          return;
        }

        this.group.set(group);
        this.loadMembers(groupId, group);
      });
  }

  private loadMembers(groupId: string, group: NuxeoGroup) {
    const memberGroups = group.memberGroups ?? [];

    this.nestedGroupsRows.set(
      memberGroups.map(memberGroup => ({
        id: memberGroup,
        name: memberGroup,
        identifier: memberGroup,
      }))
    );
    this.nestedGroupsTotal.set(memberGroups.length);

    this.nuxeoApi
      .getGroupUsers(groupId, '', 0)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of(null))
      )
      .subscribe(result => {
        const entries = result?.entries ?? [];
        const rows = entries.map(entry => this.mapUserToRow(entry));
        this.usersRows.set(rows);
        this.usersTotal.set(result?.resultsCount ?? rows.length);
      });
  }

  private buildAddMembersFormConfig(defaultMembers: Option[] = []): FieldConfig[] {
    return [
      {
        type: 'dropdown-search',
        name: 'members',
        label: 'Members',
        placeholder: 'Search for users',
        defaultValue: defaultMembers,
        options: [],
        multiple: true,
        props: { optionsSignal: this.memberOptions },
      },
    ];
  }

  private buildEditGroupFormConfig(label: string): FieldConfig[] {
    return [
      {
        type: 'input',
        name: 'grouplabel',
        label: 'Group Label',
        placeholder: 'Group Label',
        defaultValue: label,
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

  private mapUserToRow(user: NxUser): TableItem {
    const props = user.properties ?? {};
    const firstName = props.firstName || props[NUXEO_SCHEMA_FIELDS.user.firstName] || '';
    const lastName = props.lastName || props[NUXEO_SCHEMA_FIELDS.user.lastName] || '';
    const fullName = `${firstName} ${lastName}`.trim();
    const email = props.email || props[NUXEO_SCHEMA_FIELDS.user.email] || '-';

    return {
      id: user.id,
      name: fullName || user.id,
      identifier: user.id,
      email,
      link: ['/admin/anvandare-grupper/users', user.id],
    };
  }
}
