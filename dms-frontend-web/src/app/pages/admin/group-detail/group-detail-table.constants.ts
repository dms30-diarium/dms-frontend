import { TableColumn } from '@app/shared/components/case-list-table/case-list-table.component';

export const GROUP_DETAIL_USERS_TABLE_CONFIG: TableColumn[] = [
  {
    id: 'name',
    label: 'Name',
    key: 'name',
    visible: true,
    tableName: 'GROUP_USERS',
    searchField: 'name',
    asLink: true,
  },
  { id: 'identifier', label: 'Identifier', key: 'identifier', visible: true, tableName: 'GROUP_USERS' },
  { id: 'email', label: 'Email', key: 'email', visible: true, tableName: 'GROUP_USERS' },
];

export const GROUP_DETAIL_NESTED_GROUPS_TABLE_CONFIG: TableColumn[] = [
  { id: 'name', label: 'Name', key: 'name', visible: true, tableName: 'NESTED_GROUPS', searchField: 'name' },
  { id: 'identifier', label: 'Identifier', key: 'identifier', visible: true, tableName: 'NESTED_GROUPS' },
];

export const GROUP_DETAIL_PERMISSIONS_TABLE_CONFIG: TableColumn[] = [
  { id: 'on', label: 'On', key: 'on', visible: true, tableName: 'GROUP_PERMISSIONS' },
  { id: 'right', label: 'Right', key: 'right', visible: true, tableName: 'GROUP_PERMISSIONS' },
  { id: 'timeFrame', label: 'Time Frame', key: 'timeFrame', visible: true, tableName: 'GROUP_PERMISSIONS' },
  { id: 'grantedBy', label: 'Granted by', key: 'grantedBy', visible: true, tableName: 'GROUP_PERMISSIONS' },
];
