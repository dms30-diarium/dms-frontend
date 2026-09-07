import { NuxeoProperties, NxUser } from '@app/shared/api/nuxeo-api.types';
import { Option } from '@app/shared/commonTypes';
import { DmsMetadataDefinitionEntry } from '@app/shared/components/custom-metadata-field/custom-metadata-field.types';
import { MetadataDefinitionRow } from '@app/shared/components/edit-form-components/basic-metadata-table/basic-metadata-table.component';

export type DocRef = {
  id?: string | null;
  uid?: string | null;
  title?: string | null;
  properties?: {
    id?: string | null;
    label?: string | null;
  } | null;
} | null;

export type KlassProperties = Omit<
  NuxeoProperties,
  | 'klass:lagrum'
  | 'klass:gallringsforeskrift'
  | 'klass:handlingstyper'
  | 'klass:beslutstyper'
  | 'klass:beredningsbeslutstyper'
  | 'klass:klasstyp'
  | 'klass:ansvarigOrganisationsenhet'
  | 'klass:checklista'
  | 'klass:sekretess'
  | 'klass:sakerhetsskyddsklassificering'
  | 'klass:riktning'
  | 'klass:bevarasGallras'
  | 'klass:fordelningsprincip'
  | 'dc:title'
  | 'dc:description'
  | 'dc:creator'
  | 'dc:contributors'
  | 'klass:kod'
  | 'klass:namn'
  | 'klass:arendemening'
  | 'klass:registrerbar'
  | 'klass:paJkListan'
  | 'dmsmetadatadefinition:faltdefinition'
> & {
  'dc:title'?: string | null;
  'dc:description'?: string | null;
  'dc:creator'?: NxUser;
  'dc:contributors'?: NxUser[];
  'klass:kod'?: string | null;
  'klass:namn'?: string | null;
  'klass:arendemening'?: string | null;
  'klass:registrerbar'?: boolean | null;
  'klass:paJkListan'?: boolean | null;
  'dmsmetadatadefinition:faltdefinition'?: DmsMetadataDefinitionEntry[] | null;
  'klass:lagrum'?: DocRef[] | null;
  'klass:gallringsforeskrift'?: DocRef | null;
  'klass:handlingstyper'?: DocRef[] | null;
  'klass:beslutstyper'?: DocRef[] | null;
  'klass:beredningsbeslutstyper'?: DocRef[] | null;
  'klass:klasstyp'?: DocRef | null;
  'klass:ansvarigOrganisationsenhet'?: DocRef | null;
  'klass:checklista'?: DocRef | null;
  'klass:sekretess'?: DocRef | null;
  'klass:sakerhetsskyddsklassificering'?: DocRef | null;
  'klass:riktning'?: DocRef | null;
  'klass:bevarasGallras'?: DocRef | null;
  'klass:fordelningsprincip'?: DocRef | null;
};

export interface KlassEditEvent {
  name?: string | null;
  title?: string | null;
  description?: string | null;
  code?: string | null;
  klass?: { id: string }[];
  beslutstyper?: Option[] | null;
  beredningsbeslutstyper?: Option[] | null;
  handlingstyper?: Option[] | null;
  ansvarigOrg?: unknown;
  paJkListan?: boolean | null;
  fordelningsprincip?: unknown;
  checklista?: unknown;
  secretClass?: unknown;
  secret?: unknown;
  lagrum?: Option[] | null;
  riktning?: unknown;
  bevaras?: unknown;
  gallringsforeskrift?: string | null;
  registrerbar?: boolean | null;
  metadataDefinition?: MetadataDefinitionRow[] | null;
  arendemening?: string | null;
}
