import { TableColumn } from '@app/shared/components/case-list-table/case-list-table.component';

export const USER_GROUPS_GROUPS_TABLE_CONFIG: TableColumn[] = [
  { id: 'name', label: 'Name', key: 'name', visible: true, tableName: 'GROUPS', asLink: true },
  { id: 'identifier', label: 'Identifier', key: 'identifier', visible: true, tableName: 'GROUPS' },
  { id: 'contains', label: 'Contains', key: 'contains', visible: true, tableName: 'GROUPS' },
];

export const USER_GROUPS_USERS_TABLE_CONFIG: TableColumn[] = [
  { id: 'name', label: 'Name', key: 'name', visible: true, tableName: 'USERS', asLink: true },
  { id: 'identifier', label: 'Identifier', key: 'identifier', visible: true, tableName: 'USERS' },
  { id: 'email', label: 'Email', key: 'email', visible: true, tableName: 'USERS' },
];

export const USER_GROUPS_RECENT_TABLE_CONFIG: TableColumn[] = [
  { id: 'name', label: 'Name', key: 'name', visible: true, tableName: 'RECENT_USERS_GROUPS', asLink: true },
  { id: 'identifier', label: 'Identifier', key: 'identifier', visible: true, tableName: 'RECENT_USERS_GROUPS' },
  { id: 'email', label: 'Email', key: 'email', visible: true, tableName: 'RECENT_USERS_GROUPS' },
];
