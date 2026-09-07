import { TableColumn } from '@app/shared/components/case-list-table/case-list-table.component';

export const USER_DETAIL_GROUPS_TABLE_CONFIG: TableColumn[] = [
  {
    id: 'name',
    label: 'Name',
    key: 'name',
    visible: true,
    tableName: 'USER_GROUPS',
    searchField: 'name',
    asLink: true,
  },
  { id: 'identifier', label: 'Identifier', key: 'identifier', visible: true, tableName: 'USER_GROUPS' },
];

export const USER_DETAIL_PERMISSIONS_TABLE_CONFIG: TableColumn[] = [
  {
    id: 'on',
    label: 'On',
    key: 'on',
    visible: true,
    tableName: 'USER_PERMISSIONS',
    class: 'whitespace-pre-line',
  },
  { id: 'right', label: 'Right', key: 'right', visible: true, tableName: 'USER_PERMISSIONS' },
  { id: 'timeFrame', label: 'Time Frame', key: 'timeFrame', visible: true, tableName: 'USER_PERMISSIONS' },
  { id: 'grantedBy', label: 'Granted by', key: 'grantedBy', visible: true, tableName: 'USER_PERMISSIONS' },
];
