import { TableColumn } from '@app/shared/components/case-list-table/case-list-table.component';

export const VOCABULARY_TABLE_CONFIG: TableColumn[] = [
  {
    id: 'id',
    label: 'ID',
    key: 'id',
    visible: true,
    tableName: 'VOCABULARIES',
  },
  {
    id: 'label',
    label: 'Label',
    key: 'label',
    visible: true,
    tableName: 'VOCABULARIES',
  },
  {
    id: 'obsolete',
    label: 'Obsolete',
    key: 'obsolete',
    visible: true,
    tableName: 'VOCABULARIES',
  },
  {
    id: 'ordering',
    label: 'Ordering',
    key: 'ordering',
    visible: true,
    tableName: 'VOCABULARIES',
  },
];
