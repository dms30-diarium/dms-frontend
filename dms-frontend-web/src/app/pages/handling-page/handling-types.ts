import { Option } from '@app/shared/commonTypes';
import {
  DmsMetadataDefinitionEntry,
  DmsMetadataValueEntry,
} from '@app/shared/components/custom-metadata-field/custom-metadata-field.types';

export type OrganizationValue = string | Option[];

export interface EditHandlingResult {
  overview: OverviewDetails;
  handlingDetails: HandlingDetails;
  secret: SecretDetails;
  comment: { kommentarer: string; makuleringskommentar?: string };
  bevaras: BevarasDetails;
  actor: ActorDetails;
  avsandare: ContactsDetails;
  mottagare: ContactsDetails;
  internArendereferens: InternArendereferensDetails;
  internHandlingsreferens: InternArendereferensDetails;
  externReferens: ExternReferens;
  customMetadataValues?: DmsMetadataValueEntry[];
  customMetadataDefinitions?: DmsMetadataDefinitionEntry[];
  customMetadataDefinitionDocId?: string | null;
}

export interface OverviewDetails {
  state?: string;
  beslut?: string;
  beslutDate?: Date[];
  beslutsfattare?: string;
  handlingssteg?: string;
}

export interface HandlingDetails {
  handlingstyp: string;
  handlingsnamn: string;
  intern: string;
  handlingsriktning: string;
  inkommen_datum: Date[];
  upprattad_datum: Date[];
  makulerad_datum: Date[];
  forvaringsmedia?: string;
  fysisk_forvaringsplats?: string;
  digitalt_original?: string;
  signerad?: boolean;
}

export interface SecretDetails {
  gdpr: boolean;
  secret: string;
  secretClass: string;
  lagrumsbeskrivning?: Option[];
}

export interface BevarasDetails {
  bevaras: string;
  arkiverad_datum?: string;
  gallrad_datum?: string;
  makulerad_datum?: string;
}

export interface ActorDetails {
  avsandare: string;
  medhandlaggare?: string;
  granskare?: string;
  ansvarigOrg?: OrganizationValue;
}

export type ContactsDetails = { title: string; email: string }[];

export type ExternReferens = { referens: string; comment: string }[];

export type InternArendereferensDetails = { caseRef: string; type: string; comment: string }[];

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
  properties: {
    parent: string;
    ordering: number;
    obsolete: number;
    id: string;
    label: string;
  };
  'entity-type': string;
  computedId: string;
  absoluteLabel: string;
}
