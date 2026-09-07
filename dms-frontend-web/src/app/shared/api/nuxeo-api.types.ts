// ─────────────────────────────────────────────
// 🧩 Shared Nuxeo API Type Definitions
// ─────────────────────────────────────────────

import { NuxeoNotification } from '@app/core/services/notification-service.service';
import { ChecklistItem } from '@app/pages/case-page/case-types';
import {
  DmsMetadataDefinitionEntry,
  DmsMetadataValueEntry,
} from '../components/custom-metadata-field/custom-metadata-field.types';

export interface Subtype {
  type: string;
  facets: string[];
}

export interface Schema {
  name: string;
  prefix: string;
}
export interface RunningWorkflow {
  id: string;
  state: string;
  name: string;
  workflowModelName: string;
  initiator?: string;
  variables?: { anvandare: { id: string }[] };
}

export interface ContextParameters {
  thumbnail?: { url: string };
  preview?: { url: string };
  permissions?: string[];
  subtypes?: Subtype[];
  hasFolderishChild?: boolean;
  breadcrumb?: BreadcrumbDocuments;
  runningWorkflows?: WorkflowInfo[];
  audit?: AuditEntry[];
  pendingTasks?: WorkflowInfo[];
  acls?: NuxeoAcl[];
}

export interface NuxeoAcePrincipal {
  'entity-type'?: string;
  id?: string;
  groupname?: string;
  grouplabel?: string;
  properties?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface NuxeoAce {
  id?: string;
  username: NuxeoAcePrincipal;
  permission?: string;
  creator?: NuxeoAcePrincipal | null;
  begin?: string | null;
  end?: string | null;
  status?: string;
  grant?: boolean;
  granted?: boolean;
  externalUser?: boolean;
  email?: string;
  comment?: string | null;
  notify?: boolean;
}

export interface NuxeoAcl {
  name?: string;
  ace?: NuxeoAce[];
  aces?: NuxeoAce[];
}

export interface NuxeoAcls {
  'entity-type': 'acls';
  acl?: NuxeoAcl[];
  acls?: NuxeoAcl[];
}

export interface AuditEntry {
  'entity-type': 'logEntry';
  id: number;
  category?: string;
  principalName?: string;
  comment?: string | null;
  docLifeCycle?: string;
  docPath?: string;
  docType?: string;
  docUUID?: string;
  eventId?: string;
  repositoryId?: string;
  eventDate?: string;
  logDate?: string;
  extended?: Record<string, unknown>;
}

export interface AuditLogEntries {
  'entity-type': 'logEntries';
  isPaginable: boolean;
  resultsCount: number;
  pageSize: number;
  maxPageSize: number;
  resultsCountLimit: number;
  currentPageSize: number;
  currentPageIndex: number;
  currentPageOffset: number;
  numberOfPages: number;
  isPreviousPageAvailable: boolean;
  isNextPageAvailable: boolean;
  isLastPageAvailable: boolean;
  isSortable: boolean;
  hasError: boolean;
  errorMessage?: string | null;
  pageIndex?: number;
  pageCount?: number;
  entries: AuditEntry[];
}

// ─────────────────────────────────────────────
// 🧩 Directory Entries & Users
// ─────────────────────────────────────────────

export interface DirectoryProperties {
  id?: string;
  label?: string;
  label_en?: string;
  label_fr?: string;
  ordering?: number;
  obsolete?: number;
  parent?: DirectoryEntry | null;
  [key: string]: unknown;
}

export interface DirectoryEntry {
  'entity-type': 'directoryEntry';
  directoryName?: string;
  id?: string;
  properties?: DirectoryProperties;
}

export interface Directory {
  'entity-type': 'directory';
  name: string;
  schema: string;
  idField: string;
  readOnly: boolean;
  parent: string | null;
}

export interface DirectoriesResponse {
  'entity-type': 'directories';
  entries: Directory[];
}

export interface DirectoryEntriesResponse {
  'entity-type': 'directoryEntries';
  entries?: DirectoryEntry[];
  resultsCount?: number;
  pageSize?: number;
  currentPageSize?: number;
  currentPageIndex?: number;
  numberOfPages?: number;
  isPreviousPageAvailable?: boolean;
  isNextPageAvailable?: boolean;
  isLastPageAvailable?: boolean;
  isSortable?: boolean;
  hasError?: boolean;
  errorMessage?: string | null;
}

export interface GroupProperties {
  tenantId?: string | null;
  description?: string;
  grouplabel?: string | null;
  groupname?: string;
  [key: string]: unknown;
}

export interface NuxeoGroup {
  'entity-type': 'group';
  groupname?: string;
  grouplabel?: string;
  id?: string;
  properties?: GroupProperties;
  memberUsers?: string[];
  memberGroups?: string[];
}

export interface GroupSearchResponse {
  'entity-type': 'groups';
  entries?: NuxeoGroup[];
  resultsCount?: number;
  pageSize?: number;
  maxPageSize?: number;
  currentPageSize?: number;
  currentPageIndex?: number;
  numberOfPages?: number;
  isPreviousPageAvailable?: boolean;
  isNextPageAvailable?: boolean;
  isLastPageAvailable?: boolean;
  isSortable?: boolean;
  hasError?: boolean;
  errorMessage?: string | null;
  pageIndex?: number;
  pageCount?: number;
}

export interface UserSearchResponse {
  'entity-type': 'users';
  entries?: NxUser[];
  resultsCount?: number;
  pageSize?: number;
  maxPageSize?: number;
  currentPageSize?: number;
  currentPageIndex?: number;
  numberOfPages?: number;
  isPreviousPageAvailable?: boolean;
  isNextPageAvailable?: boolean;
  isLastPageAvailable?: boolean;
  isSortable?: boolean;
  hasError?: boolean;
  errorMessage?: string | null;
  pageIndex?: number;
  pageCount?: number;
}

export interface NxUserMediaBlob {
  data?: string;
  'download-url'?: string;
}

export interface NxUserProperties {
  username?: string;
  firstName?: string;
  'user:firstName'?: string;
  lastName?: string;
  'user:lastName'?: string;
  email?: string;
  company?: string;
  tenantId?: string | null;
  groups?: string[];
  'user:groups'?: string[];
  'user:avatar'?: NxUserMediaBlob;
  'company:logo'?: NxUserMediaBlob;
  [key: string]: unknown;
}

export interface NxUser {
  'entity-type': 'user';
  id: string;
  isAdministrator?: boolean;
  isAnonymous?: boolean;
  isPartial?: boolean;
  properties?: NxUserProperties;
  extendedGroups?: { name: string; label?: string; url?: string }[];
}

// ─────────────────────────────────────────────
// 🧩 Organization Suggestions
// ─────────────────────────────────────────────

export interface OrgUnitUserProperties {
  firstName?: string;
  firstname?: string;
  lastName?: string;
  lastname?: string;
  username?: string;
  displayLabel?: string;
  [key: string]: unknown;
}

export interface OrgUnitUserLike {
  id?: string;
  uid?: string;
  userId?: string;
  displayLabel?: string;
  label?: string;
  title?: string;
  properties?: OrgUnitUserProperties;
  [key: string]: unknown;
}

export interface OrganizationParticipant {
  id: string;
  label: string;
}

export interface OrganizationSuggestion {
  id: string;
  label: string;
  participants: OrganizationParticipant[];
}

// ─────────────────────────────────────────────
// 🧩 Related Document References
// ─────────────────────────────────────────────

export interface NxDocRef {
  'entity-type': 'document';
  repository?: string;
  uid: string;
  path?: string;
  title?: string;
  type?: string;
  state?: string;
  lastModified?: string;
  parentRef?: string;
  facets?: string[];
  schemas?: Schema[];
  [key: string]: unknown;
}

export interface BreadcrumbDocuments {
  'entity-type': 'documents';
  entries: NxDocRef[];
}

// ─────────────────────────────────────────────
// 🧩 Common Reusable Value Objects
// ─────────────────────────────────────────────

export interface ContactEntry {
  namn?: string;
  epost?: string;
  telefon?: string;
  adress?: string | null;
  organisation?: string | null;
  foretag?: string | null;
}

export interface ArendeInternReferens {
  arende: NuxeoDocument;
  referenstyp: DirectoryEntry;
  referenskommentar: string;
}

export interface HandlingsInternReferens {
  handling: NuxeoDocument;
  referenstyp: DirectoryEntry;
  referenskommentar: string;
}

export interface ArendeExternReferens {
  referens?: string;
  referenskommentar?: string;
}

export interface HandlingExternReferens {
  referens?: string;
  referenskommentar?: string;
}

// ─────────────────────────────────────────────
// 🧩 Ärende (Case) Schema
// ─────────────────────────────────────────────

export interface Motpart<T = string> {
  postnummer?: string | null;
  telefon?: string | null;
  epost?: string | null;
  adress?: string | null;
  typ?: T | null;
  motpart?: string | null;
  organisationsnummer?: string | null;
}

export interface ArendeProperties {
  'arbetsfloden:arbetsfloden'?: LoggedActions[];
  'arende:riktning'?: DirectoryEntry;
  'arende:arendetyp'?: NxDocRef;

  'arende:arendemening'?: string;
  'arende:internArendemening'?: string;
  'arende:arendenummer'?: string;
  'arende:arendestatus'?: DirectoryEntry;
  'arende:handlaggningsstatus'?: DirectoryEntry;
  'arende:behorighetsstatus'?: DirectoryEntry;
  'arende:anteckning'?: string;

  'arende:ansvarigHandlaggare'?: NxUser | null;
  'arende:ansvarigBeslutsfattare'?: NxUser | null;
  'arende:ansvarigOrganisatoriskEnhet'?: NxDocRef | null;
  'arende:ansvarigOrganisationsenhetschef'?: NxUser | null;

  'arende:sekretess'?: string;
  'arende:sakerhetsskyddsklassificering'?: DirectoryEntry;
  'arende:bevarasGallras'?: DirectoryEntry;
  'arende:gallringsforeskrift'?: NuxeoDocument | null;

  'arende:arendetRegistreratDatum'?: string;
  'arende:arendetAvslutatDatum'?: string | null;
  'arende:arendetArkiveratDatum'?: string | null;
  'arende:arendetGallratDatum'?: string | null;
  'arende:arendetMakuleratDatum'?: string | null;

  'arende:beslut'?: string | null;
  'arende:beslutExpedieratDatum'?: string | null;
  'arende:beslutatDatum'?: string | null;
  'arende:handlaggningPaborjadDatum'?: string | null;
  'arende:handlaggningAvslutadDatum'?: string | null;

  'arende:allmanKommentar'?: string | null;
  'arende:jkKommentar'?: string | null;

  'arende:lagrumsbeskrivning'?: NuxeoDocument[];
  'arende:beredningsbeslut'?: BeredningsBeslut;
  'checklista:checklistesteg'?: ChecklistItem[];

  'arende:kontakter'?: ContactEntry[];
  'arende:externReferens'?: ArendeExternReferens[];
  'arende:internArendereferens'?: { referenstyp: string; arende: string; referenskommentar: string }[];
  'arende:internHandlingsreferens'?: {
    handling: string;
    referenstyp: string;
    referenskommentar: string;
  }[];

  'arende:granskare'?: NxUser[];
  'arende:medhandlaggare'?: NxUser[];

  'arende:innehallerPersonuppgifterGdpr'?: boolean | null;
  'arende:motpart'?: Motpart | null;
  'arende:mottagare'?: string | null;

  'case:channel'?: string;
  'case:department'?: string;
  'case:counterparty'?: string;

  'dc:title'?: string;
  'dc:created'?: string | Date;
  'dc:modified'?: string | Date;
  'dc:creator'?: NxUser;
  'dc:lastContributor'?: NxUser | string;
  'dc:contributors'?: NxUser[];
  'dc:description'?: string | null;
  'dc:coverage'?: DirectoryEntry | null;
  'dc:language'?: string | null;
  'dc:rights'?: string | null;
  'dc:source'?: string | null;
  'dc:publisher'?: string | null;
  'dc:subjects'?: DirectoryEntry[] | null;
  'arende:adress'?: string | null;
  'arende:besoksadress'?: string | null;
  'dc:valid'?: string | null;

  'nxtag:tags'?: unknown[];
  'collectionMember:collectionIds'?: string[];
}

export type ArendePayloadProperties = Omit<
  ArendeProperties,
  | 'arende:riktning'
  | 'arende:arendetyp'
  | 'arende:arendestatus'
  | 'arende:handlaggningsstatus'
  | 'arende:behorighetsstatus'
  | 'arende:ansvarigHandlaggare'
  | 'arende:ansvarigBeslutsfattare'
  | 'arende:ansvarigOrganisatoriskEnhet'
  | 'arende:ansvarigOrganisationsenhetschef'
  | 'arende:sekretess'
  | 'arende:sakerhetsskyddsklassificering'
  | 'arende:bevarasGallras'
  | 'arende:granskare'
  | 'arende:medhandlaggare'
  | 'arende:lagrumsbeskrivning'
  | 'arende:arendemening'
  | 'arende:internArendemening'
> & {
  'arende:arendemening'?: string | null;
  'arende:internArendemening'?: string | null;
  'arende:riktning'?: DirectoryEntry | string;
  'arende:arendetyp'?: NxDocRef | string;
  'arende:arendestatus'?: DirectoryEntry | string;
  'arende:handlaggningsstatus'?: DirectoryEntry | string;
  'arende:behorighetsstatus'?: DirectoryEntry | string;
  'arende:ansvarigHandlaggare'?: NxUser | string | null;
  'arende:ansvarigBeslutsfattare'?: NxUser | string | null;
  'arende:ansvarigOrganisatoriskEnhet'?: NxDocRef | string | null;
  'arende:ansvarigOrganisationsenhetschef'?: NxUser | string | null;
  'arende:sekretess'?: DirectoryEntry | string;
  'arende:sakerhetsskyddsklassificering'?: DirectoryEntry | string;
  'arende:bevarasGallras'?: DirectoryEntry | string;
  'arende:granskare'?: (NxUser | string)[];
  'arende:medhandlaggare'?: (NxUser | string)[];
  'arende:lagrumsbeskrivning'?: string[];
};

export interface ArendeExtendedProperties extends Record<string, unknown> {
  'arbetsfloden:arbetsfloden'?: LoggedActions[];
  'arende:arendestatus'?: DirectoryEntry;
  'arende:behorighetsstatus'?: DirectoryEntry;
  'arende:handlaggningsstatus'?: DirectoryEntry;
  'arende:riktning'?: DirectoryEntry;
  'arende:sakerhetsskyddsklassificering'?: DirectoryEntry;
  'arende:lagrumsbeskrivning'?: NuxeoDocument[];
  'arende:beredningsbeslut'?: BeredningsBeslut;
  'arende:sekretess'?: DirectoryEntry;
  'arende:bevarasGallras'?: DirectoryEntry;
  'arende:gallringsforeskrift'?: NuxeoDocument;
  'arende:ansvarigHandlaggare'?: NxUser;
  'arende:medhandlaggare'?: NxUser[];
  'arende:granskare'?: NxUser[];
  'arende:ansvarigBeslutsfattare'?: NxUser;
  'arende:arendetyp'?: NuxeoDocument;
  'arende:ansvarigOrganisatoriskEnhet'?: NuxeoDocument;
  'arende:ansvarigOrganisationsenhetschef'?: NxUser;
  'arende:internArendereferens'?: ArendeInternReferens[];
  'arende:internHandlingsreferens'?: HandlingsInternReferens[];
  'checklista:checklistesteg'?: ChecklistItem[];
  'arende:externReferens'?: ArendeExternReferens[];
  'arende:kontakter'?: ContactEntry[];
  'dc:creator'?: NxUser;
  'dc:lastContributor'?: NxUser;
  'arende:beslutstyp'?: NuxeoDocument;
  'arende:beslut'?: string | null;

  //string
  'dc:created'?: string | Date | null;
  'dc:modified'?: string | Date | null;
  'arende:beslutatDatum'?: string | Date | null;
  'arende:beslutExpedieratDatum'?: string | Date | null;
  'arende:handlaggningPaborjadDatum'?: string | Date | null;
  'arende:handlaggningAvslutadDatum'?: string | Date | null;
  'arende:arendetRegistreratDatum'?: string | Date | null;
  'arende:arendetAvslutatDatum'?: string | Date | null;
  'arende:stangtDatum'?: string | Date | null;
  'arende:arendetArkiveratDatum'?: string | Date | null;
  'arende:arendetGallratDatum'?: string | Date | null;
  'arende:arendetMakuleratDatum'?: string | Date | null;
  'arende:arendenummer'?: string;
  'arende:arendemening'?: string;
  'arende:internArendemening'?: string;
  'arende:allmanKommentar'?: string;
  'arende:jkKommentar'?: string;
  'arende:motpart'?: Motpart<{ id?: string; properties: { label: string; id: string } }>;
  'arende:anteckning'?: string;
  'dc:valid'?: string;
}

// ─────────────────────────────────────────────
// 🧩 Handling (Document) Schema
// ─────────────────────────────────────────────

export interface HandlingProperties {
  'handling:avsandare'?: ContactEntry[];
  'handling:mottagare'?: ContactEntry[];
  'handling:handlingsnamn'?: string;
  'handling:handlingstyp'?: string;
  'handling:inkommenDatum'?: string | Date | null;
  'handling:upprattadDatum'?: string | Date | null;
  'handling:utgaendeDatum'?: string | Date | null;

  'handling:ansvarigHandlaggare'?: string;
  'handling:lopnummer'?: string;
  'handling:handlingsnummer'?: string;
  'handling:handlingsriktning'?: string;
  'handling:handlingsstatus'?: string;

  'handling:inkanalVia'?: string;
  'handling:utkanalVia'?: string;
  'handling:forvaringsmedia'?: string;
  'handling:fysiskForvaringsplats'?: string;
  'handling:digitaltOriginal'?: string;
  'handling:signerad'?: boolean;

  'handling:sakerhetsskyddsklassificering'?: string;
  'handling:sekretess'?: string;
  'handling:lagrumsbeskrivning'?: string;
  'handling:innehallerPersonuppgifterGdpr'?: boolean;

  'handling:granskare'?: string;
  'handling:granskningsdatum'?: string | Date | null;
  'handling:granskningskommentar'?: string;
  'handling:godkannandeDatum'?: string;
  'handling:beslutatDatum'?: string;
  'handling:beslutsfattare'?: string;
  'handling:beslut'?: string;

  'handling:bevarasGallras'?: string;
  'handling:arkiveradDatum'?: string | Date | null;
  'handling:gallradDatum'?: string | Date | null;
  'handling:makuleradDatum'?: string | Date | null;
  'handling:bevarande'?: string;

  'handling:externKopiaMottagare'?: string;
  'handling:internKopiaMottagare'?: string;
  'handling:kommentarer'?: string;

  'handling:externReferens'?: HandlingExternReferens[];

  'handling:internArendereferens'?: { referenstyp: string; arende: string; referenskommentar: string }[];
  'handling:internHandlingsreferens'?: {
    handling: string;
    referenstyp: string;
    referenskommentar: string;
  }[];

  'handling:medhandlaggare'?: string | null;
  'handling:ansvarigOrganisatoriskEnhet'?: string | null;
  'handling:arendenummer'?: string | null;
  'dc:creator'?: string | null;
  'dc:modified'?: string | null;
  'dc:created'?: string | null;
  'fil:mallegenskaper'?: { varde: string; nyckel: string }[];
  'fil:mallenId'?: string;
}

export interface HandlingstypProperties extends NuxeoProperties {
  'dmsmetadatadefinition:faltdefinition'?: DmsMetadataDefinitionEntry[] | null;
}

export interface HandlingExtendedProperties extends Record<string, unknown> {
  'handling:handlingsstatus'?: DirectoryEntry;
  'handling:handlingstyp': NuxeoDocument<HandlingstypProperties>;
  'handling:handlingsriktning'?: DirectoryEntry;
  'handling:forvaringsmedia'?: DirectoryEntry;
  'handling:sakerhetsskyddsklassificering'?: DirectoryEntry;
  'handling:lagrumsbeskrivning'?: NuxeoDocument;
  'handling:sekretess'?: DirectoryEntry;
  'handling:granskare'?: NxUser;
  'handling:bevarasGallras'?: DirectoryEntry;
  'handling:avsandare'?: { adress: string; epost: string; namn: string; telefon: string }[];
  'handling:mottagare'?: { adress: string; epost: string; namn: string; telefon: string }[];
  'handling:beslut'?: DirectoryEntry;
  'handling:beslutsfattare'?: NxUser;
  'handling:beslutatDatum'?: string;
  'handling:ansvarigHandlaggare'?: NxUser;
  'dc:creator'?: NxUser;
  'dc:lastContributor'?: NxUser;
  'dc:contributors'?: NxUser[];
  'handling:ansvarigOrganisatoriskEnhet'?: NuxeoDocument;
  'handling:internArendereferens'?: ArendeInternReferens[];
  'handling:internHandlingsreferens'?: HandlingsInternReferens[];
  'arbetsfloden:arbetsfloden'?: LoggedActions[];

  //string
  'handling:inkommenDatum'?: string | Date | null;
  'handling:upprattadDatum'?: string | Date | null;
  'handling:utgaendeDatum'?: string | Date | null;
  'handling:granskningsdatum'?: string | Date | null;
  'handling:arkiveradDatum'?: string | Date | null;
  'handling:gallradDatum'?: string | Date | null;
  'handling:makuleradDatum'?: string | Date | null;
  'handling:medhandlaggare'?: string | null;
  'handling:handlingsnamn': string;
  'handling:fysiskForvaringsplats': string;
  'handling:digitaltOriginal': string;
  'handling:kommentarer': string;
  'dmsmetadataanpassad:falt'?: DmsMetadataValueEntry[] | null;
  'dc:created'?: string | Date;
  'dc:modified'?: string | Date;
  lockOwner?: string;
}

export type AdvancedSearchProperties = ArendeExtendedProperties | HandlingExtendedProperties;
export type AdvancedSearchDocument = NuxeoDocument<AdvancedSearchProperties>;

export interface LoggedActions {
  slutdatum: null;
  arbetsflodesid: string;
  arbetsflodesnamn: string;
  status: string;
  startdatum: Date;
  anvandare: NxUser[];
  initiativtagare: NxUser;
  uppgifter?: { aktorer: NxUser[]; kommentar: string | null; namn: string; atgardDatum?: Date }[];
}

export interface Actions {
  datum: Date;
  atgard: string;
  anvandare: NxUser;
}

// ─────────────────────────────────────────────
// 🧩 Case Metadata (Generic)
// ─────────────────────────────────────────────

export interface CaseProperties {
  'case:counterparty'?: string;
  'case:department'?: string;
  'case:topic'?: string;
  'dc:title'?: string;
  'dc:created'?: string;
}

export interface ArendetypProperties {
  'klass:arendemening'?: string[];
  'klass:registrerbar'?: boolean;
  'klass:lagrum'?: NuxeoDocument[];
  'klass:paJkListan'?: boolean;
  'klass:kod'?: string;
  'klass:bevarasGallras'?: string | null;
  'klass:ansvarigOrganisationsenhet'?: string | null;
  'klass:gallringsforeskrift'?: string | null;
  'klass:riktning'?: DirectoryEntry;
  'klass:checklista'?: string;
  'klass:beslutstyper'?: string[];
  'klass:handlingstyper'?: string[];
  'klass:beredningsbeslutstyper'?: string[];
  'klass:klasstyp'?: string;
  'klass:sekretess'?: DirectoryEntry;
  'klass:sakerhetsskyddsklassificering'?: DirectoryEntry;
  'klass:fordelningsprincip'?: string | null;
  'dmsmetadatadefinition:faltdefinition'?: DmsMetadataDefinitionEntry[] | null;
  'dmsmetadataanpassad:falt'?: DmsMetadataValueEntry[] | null;
  'klass:namn'?: string;
}

export interface OrganisationsdelProperties extends Record<string, unknown> {
  'organisationsdel:kortnamn'?: string;
  'organisationsdel:ansvarig'?: string;
  'organisationsdel:anvandare'?: string[];
  'organisationsdel:namn'?: string;
  'organisationsdel:kod'?: string;
  'dc:description'?: string | null;
  'dc:created'?: string;
  'dc:title'?: string;
}

// ─────────────────────────────────────────────
// 🧩 Combined Nuxeo Properties Type
// ─────────────────────────────────────────────

export type NuxeoExtendedProperties = ArendeExtendedProperties & HandlingExtendedProperties;

export type NuxeoProperties = ArendeProperties &
  HandlingProperties &
  MailMessageProperties &
  ArendetypProperties &
  OrganisationsdelProperties &
  CaseProperties & {
    'file:content'?: NxBlobLike;
    'files:files'?: FilesEntry[];
    'export:exportZip'?: NxBlobLike;
    'arkiv:exportZip'?: NxBlobLike;
    'arkiv:nxqlQuery'?: string | null;
    'arkiv:myndighet'?: NxDocRef | string | null;
    'arkiv:status'?: string | null;
    'arkiv:arendeUids'?: string[] | null;
    'arkiv:exportprofilId'?: string | null;
    'arkiv:exportvag'?: string | null;
    'fil:vattenstampel'?: NxBlobLike;
    'fil:typ'?: DirectoryEntry | 'huvudfil' | 'bilaga' | null;
    'notif:notifications'?: NuxeoNotification[];
    'dmsmetadatadefinition:faltdefinition'?: DmsMetadataDefinitionEntry[] | null;
    'dmsmetadatadefinition:definition'?: DmsMetadataDefinitionEntry[] | null;
    'dmsmetadataanpassad:falt'?: DmsMetadataValueEntry[] | null;
    'dmsmetadataanpassad:metadata'?: DmsMetadataValueEntry[] | null;
    'dc:format'?: string | null;
    'dc:nature'?: DirectoryEntry | null;
    'dc:subjects'?: DirectoryEntry[] | null;
    'dc:coverage'?: DirectoryEntry | null;
    'dc:expired'?: string | null;
    'note:mime_type'?: string | null;
    'uid:uid'?: string | null;
    'uid:minor_version'?: string | number | null;
    'uid:major_version'?: string | number | null;
    'note:note'?: string | null;
    'import:extraheradeData'?: { arendenummer?: { varde?: string; plats?: string } } | null;
    'import:arDataExtraherad'?: string | boolean | null;
    'mail:cc_recipients'?: string[] | null;
    'mail:text'?: string | null;
    'mail:messageId'?: string | null;
    'import:datumNarDataExtraherades'?: string | null;
    'dc:lastContributor'?: NxUser;
    'myndighet:organisationsnummer'?: string | null;
    'diarium:arendelopnummerlangd'?: number | null;
    'diarium:handlingslopnummerlangd'?: number | null;
    'diarium:suffix'?: string | null;
    'diarium:prefix'?: string | null;
    'utkastmall:egenskaper'?: TemplateField[];
    'epostmall:amne'?: string | null;
  } & Record<string, unknown>;

export type DocumentDirectoryProperties = Omit<NuxeoProperties, 'dc:nature' | 'dc:coverage' | 'dc:subjects'> & {
  'dc:nature': DirectoryEntry;
  'dc:coverage': DirectoryEntry;
  'dc:subjects': DirectoryEntry[];
};

// ─────────────────────────────────────────────
// 🧩 Nuxeo Document
// ─────────────────────────────────────────────

export interface NuxeoDocument<P = NuxeoProperties> {
  'entity-type': 'document';
  repository: string;
  uid: string;
  path: string;
  type: string;
  name: string;
  title: string;
  state?: string;
  parentRef?: string;
  isCheckedOut: boolean;
  isRecord: boolean;
  retainUntil?: string | null;
  hasLegalHold?: boolean;
  isUnderRetentionOrLegalHold?: boolean;
  isVersion?: boolean;
  isProxy?: boolean;
  isTrashed: boolean;
  changeToken?: string;
  facets: string[];
  schemas: Schema[];
  lockOwner?: string;
  lockCreated?: string;
  lastModified: string;
  properties: P;
  contextParameters?: ContextParameters;
  isLatestVersion?: boolean;
}

export type NuxeoFileDocument = NuxeoDocument<NuxeoProperties & { 'file:content': NxBlobLike }>;

export interface BeredningsBeslut extends NuxeoDocument {
  id?: string;
}

// ─────────────────────────────────────────────
// 🧩 Search / Listing Results
// ─────────────────────────────────────────────

export interface SearchResult<E = NuxeoDocument> {
  'entity-type': string;
  isPaginable: boolean;
  resultsCount: number;
  totalSize: number;
  pageSize: number;
  pageIndex: number;
  pageCount: number;
  entries: E[];
  aggregations?: Aggregations;
}

export interface TemplateSourceProperties extends NuxeoProperties {
  'thumb:thumbnail': NxBlobLike;
  'file:content': NxBlobLike;
  'tmpl:forcedTypes': string[];
  'tmpl:applicableTypes': string[];
  'tmpl:templateData': string;
  'tmpl:templateName': string;
  'tmpl:templateType': string;
}

export interface StatisticItem {
  doc_count: number;
  key: string;
}
export interface Statistics {
  arenden: {
    ansvarig_organisatorisk_enhet: StatisticItem[];
    arendetyp: StatisticItem[];
    totalt: number;
  };
  stangda_arenden: {
    ansvarig_organisatorisk_enhet: StatisticItem[];
    arendetyp: StatisticItem[];
    totalt: number;
  };
  genomsnittlig_arendetid: number;
  genomsnittlig_handlaggningstid: number;
  totalt_inkomna_handlingar: number;
  totalt_upprattade_handlingar: number;
}
export interface SavedSearchResult {
  entries: {
    'entity-type': string;
    id: string;
    params: SavedSearchParams;
  }[];
}

export interface TemplateField {
  varde: string;
  nyckel: string;
}

export interface SavedSearchParams {
  searchName: string;
  system_fulltext?: string;
  system_primaryType_agg?: string[];
  dublincore_created_agg?: string[];
  ecm_currentLifeCycleState_agg?: string[];
  arende_arendestatus_agg?: string[];
  arende_arendetyp_agg?: string[];
  arende_handlaggningsstatus_agg?: string[];
  arende_riktning_agg?: string[];
  arende_sakerhetsskyddsklassificering_agg?: string[];
  arende_sekretess_agg?: string[];
  arende_innehaller_personuppgifter_gdpr_agg?: string[];
  handling_handlingsstatus_agg?: string[];
  handling_handlingstyp_agg?: string[];
  handling_handlingsriktning_agg?: string[];
  handling_inkanal_via_agg?: string[];
  handling_signerad_agg?: string[];
  handling_sakerhetsskyddsklassificering_agg?: string[];
  handling_sekretess_agg?: string[];
  handling_bevaras_gallras_agg?: string[];
  handling_forvaringsmedia_agg?: string[];
  arende_arendepart?: string;
  arende_arendenummer?: string;
  arende_arendemening?: string;
  arende_extern_referens_referens?: string[];
  arende_ansvarig_organisatorisk_enhet?: string[];
  arende_ansvarig_handlaggare?: string[];
  handling_ansvarig_organisatorisk_enhet?: string[] | string;
  klass_ansvarig_organisationsenhet?: string[] | string;
  dublincore_created_min?: string;
  dublincore_created_max?: string;
  dublincore_modified_min?: string;
  dublincore_modified_max?: string;
  arende_arendet_registrerat_datum_min?: string;
  arende_arendet_registrerat_datum_max?: string;
  arende_beslutat_datum_min?: string;
  arende_beslutat_datum_max?: string;
  arende_arendet_avslutat_datum_min?: string;
  arende_arendet_avslutat_datum_max?: string;
  arende_arendet_arkiverat_datum_min?: string;
  arende_arendet_arkiverat_datum_max?: string;
  arende_arendet_gallrat_datum_min?: string;
  arende_arendet_gallrat_datum_max?: string;
  arende_arendet_makulerat_datum_min?: string;
  arende_arendet_makulerat_datum_max?: string;
  arende_beslutstyp?: string[];
  arende_lagrumsbeskrivning?: string[];
  handling_handlingsnummer?: string;
  handling_handlingsnamn?: string;
  handling_avsandare_namn?: string;
  handling_mottagare_namn?: string;
  handling_extern_referens_referens?: string[];
  handling_inkommen_datum_min?: string;
  handling_inkommen_datum_max?: string;
  handling_upprattad_datum_min?: string;
  handling_upprattad_datum_max?: string;
  handling_beslutat_datum_min?: string;
  handling_beslutat_datum_max?: string;
  handling_expedierad_datum_min?: string;
  handling_expedierad_datum_max?: string;
  handling_fysisk_forvaringsplats?: string;
  handling_lagrumsbeskrivning?: string[];
}

export interface CaseSearchResult {
  'entity-type': string;
  entries: NuxeoDocument[];
  totalSize: number;
  pageSize: number;
  pageIndex: number;
  pageCount: number;
}

export interface NuxeoDocuments {
  'entity-type': 'documents';
  entries: NuxeoDocument[];
  numberOfPages?: number;
  currentPageIndex: number;
  pageSize: number;
  maxResults: number;
  totalSize: number;
}

// ─────────────────────────────────────────────
// 🧩 Bulk actions
// ─────────────────────────────────────────────

export interface BulkRunActionParams {
  action: string;
  parameters: string;
  providerName: string;
  currentPageIndex: number;
  offset: number;
  pageSize: number;
  namedParameters?: Record<string, unknown>;
  queryParams?: unknown[];
}

export interface BulkRunActionResponse {
  'entity-type'?: string;
  id?: string;
  taskId?: string;
  value?: BulkStatus;
}

export interface BulkStatusResponse {
  'entity-type': 'bulkStatus';
  value: BulkStatus;
}

export interface BulkStatus {
  'entity-type'?: 'bulkStatus';
  commandId: string;
  state: string;
  processed: number;
  skipCount: number;
  error: boolean;
  errorCount: number;
  total: number;
  action: string;
  username: string;
  submitted: string;
  scrollStart: string | null;
  scrollEnd: string | null;
  processingStart: string | null;
  processingEnd: string | null;
  completed: string | null;
  processingMillis: number;
}

// ─────────────────────────────────────────────
// 🧩 Aggregations (for filters/facets)
// ─────────────────────────────────────────────

export interface Aggregations {
  ecm_currentLifeCycleState_agg: Agg;
  dublincore_created_agg: Agg;
  handling_handlingstyp_agg: Agg;
  arende_arendestatus_agg: Agg;
  handling_handlingsstatus_agg: Agg;
  arende_arendetyp_agg: Agg;
  system_primaryType_agg: Agg;
  arende_handlaggningsstatus_agg: Agg;
  arende_riktning_agg: Agg;
  arende_sakerhetsskyddsklassificering_agg: Agg;
  arende_sekretess_agg: Agg;
  arende_innehaller_personuppgifter_gdpr_agg: Agg;
  handling_handlingsriktning_agg: Agg;
  handling_inkanal_via_agg: Agg;
  handling_signerad_agg: Agg;
  handling_sakerhetsskyddsklassificering_agg: Agg;
  handling_sekretess_agg: Agg;
  handling_bevaras_gallras_agg: Agg;
  handling_forvaringsmedia_agg: Agg;
  handling_fysisk_forvaringsplats_agg: Agg;
}

export type AggregationKey = keyof Aggregations;

export interface Agg {
  'entity-type': string;
  id: string;
  field: string;
  properties: AggProperties;
  ranges: string[];
  selection: string[];
  type: string;
  buckets: AggBucket[];
  extendedBuckets: AggBucket[];
}

export interface AggBucket {
  key: string;
  docCount: number;
  fetchedKey?: Record<string, unknown> | string | undefined;
}

export interface AggProperties {
  size: string;
  order: string;
}

// ─────────────────────────────────────────────
// 🧩 Directory.SuggestEntries & User suggestion
// ─────────────────────────────────────────────

export interface Direction {
  id: string;
  displayLabel: string;
  label?: string;
  directoryName?: string;
  properties?: DirectoryProperties;
  'entity-type'?: string;
  ordering?: number;
  obsolete?: number;
  computedId?: string;
  absoluteLabel?: string;
  children?: { absoluteLabel: string; computedId: string }[];
}

export interface UserSuggestion {
  id: string;
  displayLabel: string;
  firstName?: string;
  lastName?: string;
  tenantId?: string | null;
  groups?: unknown[];
  company?: string;
  email?: string;
  username?: string;
  'entity-type': string;
  type?: string;
  prefixed_id?: string;
  displayIcon?: boolean;
}

// ─────────────────────────────────────────────
// 🧩 Files / Blob Schema
// ─────────────────────────────────────────────

export interface NxBlobLike {
  name?: string;
  'mime-type'?: string;
  encoding?: string | null;
  digestAlgorithm?: string;
  length?: string | number;
  digest?: string;
  data?: string;
  blobUrl?: string;
  'upload-batch'?: string;
  'upload-fileId'?: string;
}

export interface FilesEntry {
  file?: NxBlobLike;
}

// ─────────────────────────────────────────────
// 🧩 Mail Message Schema
// ─────────────────────────────────────────────

export interface MailMessageProperties {
  'mail:message_id'?: string;
  'mail:messageId'?: string;
  'mail:sender'?: string;
  'mail:recipients'?: string[];
  'mail:subject'?: string;
  'mail:sending_date'?: string | Date;
  'mail:copy'?: string[];
  'mail:message'?: string;
  'mail:transport'?: string;
  'mail:message_type'?: string;
  'mail:attachment_names'?: string[];
  'mail:attachments'?: unknown[];
  'dms_mail:extraheradeData'?: {
    arendenummer?: { varde?: string };
    diarienummer?: { varde?: string };
    [key: string]: unknown;
  };

  // Common metadata
  'dc:title'?: string;
  'dc:creator'?: NxUser | string;
  'dc:created'?: string;
  'dc:modified'?: string;
  'dc:lastContributor'?: NxUser | string;
}

export interface WorkflowItem {
  id: string;
  state: string;
}

export interface Variables {
  deadline: Date;
  paminnelse: Date;
  forfalloDatum?: Date;
  paminnelseDatum?: Date;
  beskrivning?: string;
  valdAtgard?: { properties: { label: string } };
  anvandare?: NxUser[];
  handlaggare?: NxUser;
  registrator?: NxUser;
}

export interface WorkflowInfo {
  'entity-type': string;
  id: string;
  name: string;
  title: string;
  workflowInstanceId: string;
  workflowModelName: string;
  workflowInitiator: string;
  initiator?: string;
  workflowTitle: string;
  workflowLifeCycleState: string;
  graphResource: string;
  state: string;
  directive: null;
  created: Date;
  dueDate: Date;
  nodeName: string;
  targetDocumentIds: { uid: string; title: string }[];
  actors: NxUser[];
  delegatedActors: { id: string }[];
  comments: string[];
  variables: Variables;
  taskInfo: TaskInfo;
}

export type MessagesJson = Record<string, string>;

export interface TaskInfo {
  taskActions: {
    label: string;
    name: string;
    url: string;
  }[];
}
