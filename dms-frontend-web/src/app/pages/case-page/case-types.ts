import { Motpart } from '@app/shared/api/nuxeo-api.types';
import { ContactOption, Option } from '@app/shared/commonTypes';
import {
  DmsMetadataDefinitionEntry,
  DmsMetadataValueEntry,
} from '@app/shared/components/custom-metadata-field/custom-metadata-field.types';

export type OrganizationValue = string | Option[];

export interface ArendeDetails {
  arendetyp: string;
  arendemening: string;
  intern: string;
  riktning: string;
  registered: Date[];
}
export interface SecretDetails {
  gdpr: boolean;
  secret: string;
  secretClass: string;
  beslutDate?: string;
  beslutTyp?: string;
  lagrum?: Option[];
}
export interface BevarasDetails {
  bevaras: string;
  arkiverat: string;
  gallrat: string;
  makulerat: string;
}
export interface ActorerDetails {
  motpart: string;
  adress: string;
  epost: string;
  phone: string;
  zip: string;
  organisationsnummer: string;
  motpartTyp: string;
  medhand: string;
  granskare: string;
  ansvarig: string;
  organization: OrganizationValue;
}
export type ContactsDetails = { title: string; email: string }[];
export type ExternReferens = { referens: string; comment: string }[];
export type InternArendereferensDetails = { caseRef: string; type: string; comment: string }[];

export interface CommentDetails {
  allmanComment: string;
  commentJK: string;
  makulering: string;
}

export interface OverviewDetails {
  arendenummer?: string;
  arendestatus?: string;
  handlaggningsstatus?: string;
  beredningsbeslut?: string;
  beslutTyp?: string;
  beslutDate?: string;
  arendesteg?: string;
}

export interface EditCaseResult {
  overview?: OverviewDetails;
  arendeDetails: ArendeDetails;
  secret: SecretDetails;
  comment: CommentDetails;
  bevaras: BevarasDetails;
  actor: ActorerDetails;
  externContacts: ContactOption[];
  motpartContacts: Motpart[];
  internArendereferens: InternArendereferensDetails;
  internHandlingsreferens: InternArendereferensDetails;
  externReferens: ExternReferens;
  ansvarig_handlaggare: string;
  beslutsfattare: string;
  granskare: string;
  medhandlaggare: string;
  customMetadataValues?: DmsMetadataValueEntry[];
  customMetadataDefinitions?: DmsMetadataDefinitionEntry[];
  customMetadataDefinitionDocId?: string | null;
  arendeTypAutosuggest?: Option[];
}

export interface InternalContact {
  email: string;
  name?: string[] | string;
  id: string;
  org: string;
  type: string;
}
export interface MotpartContact {
  type?: string;
  name?: string;
  org?: string;
  epost?: string;
  adress?: string;
  phone?: string;
  postnummer?: string;
}

export interface FilterResult {
  filterName?: string;
  checked: string[];
}

export interface SimpleDocRow {
  id: string;
  title: string;
  type: string;
  lastModified: string;
  created?: string;
  handlingsnamn?: string;
  handlingsnummer?: string;
  arendenummer?: string;
  status?: string;
  riktning?: string;
  sekretess?: string;
  sakerhetsskyddsklassificering?: string;
  ansvarigHandlaggare?: string;
  ansvarigEnhet?: string;
  medhandlaggare?: string;
  granskare?: string;
  granskningsdatum?: string;
  granskningskommentar?: string;
  receivedDate?: string;
  upprattadDatum?: string;
  deadline?: string;
  sender?: string;
  motpart?: string;
  kommentarer?: string;
  bevarasGallras?: string;
  innehallerPersonuppgifter?: string;
  arkiveradDatum?: string;
  gallradDatum?: string;
  makuleradDatum?: string;
  signerad?: string;
  createdBy?: string;
  modified?: string;
  avsandare?: string;
  inkommet?: string;
  channel?: string;
  department?: string;
  counterparty?: string;
  link: (string | number)[];
}

export interface HandlingRow extends SimpleDocRow {
  inkommen?: string;
  utgaende?: string;
  handlingType?: string;
  handlingStatus?: string;
  beslutsfattare?: string;
}
export interface Suggestions {
  riktning?: Option[];
  motpart_typ?: Option[];
  secret?: Option[];
  secretClass?: Option[];
  arendestatus?: Option[];
  handlaggningsstatus?: Option[];
  userOptions?: Option[];
  medhand?: Option[];
  ansvarig?: Option[];
  granskare?: Option[];
  organization?: Option[];
  bevaras?: Option[];
  lagrum?: Option[];
  beslutTyp?: Option[];
  beredningsbeslut?: Option[];
  arendesteg?: Option[];
  caseType?: ArendeTypOption[];
}

export interface Transitions {
  allowedTransitions: string[];
  currentStateLabel: string;
  currentState: string;
  transitions: Transition[];
}

export interface LifecycleHistoryItem {
  order: number;
  reached: boolean;
  date: string | null;
  stateLabel: string;
  principalName: string | null;
  state: string;
}

export interface LifecycleHistoryResponse {
  currentState: string;
  currentStateLabel: string;
  history: LifecycleHistoryItem[];
}

export interface Transition {
  name: string;
  destinationState: string;
  destinationStateLabel: string;
}

export interface ArendeTypOption {
  id: string;
  value: string;
  label: string;
}
export interface DeadlineDate {
  datum: number;
  typ: string;
}
export interface ChecklistItem {
  klar?: boolean;
  namn: string;
  notering: string;
}

export interface FileItem {
  filer: Filer[];
  id: string;
  title: string;
}

export interface Filer {
  id: string;
  filename: string;
  title: string;
  digestAlgorith: string;
  digest: string;
  length: number;
  mimetype: string;
}

export interface GeneralWorkflowStructure {
  children: GeneralWorkflowVocabulary[];
  displayLabel: string;
}
export interface GeneralWorkflowVocabulary {
  children: GeneralWorkflowAction[];
  displayLabel: string;
}

export interface GeneralWorkflowAction {
  parent: string;
  ordering: number;
  obsolete: number;
  id: string;
  displayLabel: string;
  label: string;
  directoryName: string;
  properties: Properties;
  'entity-type': string;
  computedId: string;
  absoluteLabel: string;
}

export interface Properties {
  parent: string;
  ordering: number;
  obsolete: number;
  id: string;
  label: string;
}

export interface CaseStatus {
  id: string;
}

export interface EditFormProps extends Record<string, unknown> {
  'arende:arendestatus'?: CaseStatus;
  'arende:anteckning'?: string | null;
  'arende:beslut'?: string;
  'arende:beslutatDatum'?: string;
  'arende:allmanKommentar'?: string;
}
