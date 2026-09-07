import { TableColumn } from '@app/shared/components/case-list-table/case-list-table.component';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

export const WORKSPACE_TABLE_NAME = 'PERSONAL_WORKSPACE_FOLDERS';
export const COLLECTIONS_TABLE_NAME = 'PERSONAL_COLLECTIONS';

export const workspaceTableConfig: TableColumn[] = [
  {
    label: 'Titel',
    key: 'title',
    sortField: NUXEO_SCHEMA_FIELDS.dc.title,
    class: 'w-[50%]',
    visible: true,
    asLink: true,
  },
  { label: 'Typ', key: 'type', class: 'w-[25%]', visible: true },
  { label: 'Ändrad', key: 'modified', class: 'w-[25%]', visible: true },
].map(col => ({ ...col, tableName: WORKSPACE_TABLE_NAME }));

export const collectionsTableConfig: TableColumn[] = [
  {
    label: 'Titel',
    key: 'title',
    sortField: NUXEO_SCHEMA_FIELDS.dc.title,
    class: 'w-[18%]',
    asLink: true,
    visible: true,
  },
  { label: 'Type', key: 'type', class: 'w-[10%]', visible: false },
  {
    label: 'Datum för ändring',
    key: 'modified',
    sortField: NUXEO_SCHEMA_FIELDS.dc.modified,
    class: 'w-[12%]',
    visible: true,
  },
  { label: 'Senast uppdaterad av', key: 'lastContributor', class: 'w-[16%]', visible: true },
  { label: 'State', key: 'state', class: 'w-[10%]', visible: false },
  { label: 'Version', key: 'version', class: 'w-[10%]', visible: true },
  {
    label: 'Registreringsdatum',
    key: 'created',
    sortField: NUXEO_SCHEMA_FIELDS.dc.created,
    class: 'w-[12%]',
    visible: false,
  },
  { label: 'Author', key: 'author', class: 'w-[14%]', visible: false },
  { label: 'Natur', key: 'nature', class: 'w-[12%]', visible: false },
  { label: 'Rapportering', key: 'coverage', class: 'w-[12%]', visible: false },
  { label: 'Ämnen', key: 'subjects', class: 'w-[14%]', visible: false },
  { label: 'Flaggor', key: 'flags', class: 'w-[8%]', visible: false },
].map(col => ({ ...col, tableName: COLLECTIONS_TABLE_NAME }));
