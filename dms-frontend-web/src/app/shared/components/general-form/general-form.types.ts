import { ValidatorFn } from '@angular/forms';
import { Option } from '../../commonTypes';
import { Type } from '@angular/core';
import { ArendeTypOption } from '@app/pages/case-page/case-types';
import {
  ArendeInternReferens,
  DirectoryEntry,
  HandlingsInternReferens,
  NuxeoDocument,
} from '@app/shared/api/nuxeo-api.types';

export type FieldType =
  | 'input'
  | 'dropdown'
  | 'dropdown-search'
  | 'datepicker'
  | 'radio'
  | 'uploadFile'
  | 'checkbox'
  | 'component'
  | 'textarea'
  | 'richtext'
  | 'text'
  | 'static-text';

export interface BaseFieldConfig {
  type: FieldType;
  label?: string;
  displayValue?: string;
  value?: string;
  placeholder?: string;
  isDisabled?: boolean;
  options?: Option[];
  validators?: ValidatorFn[];
  inputType?: 'text' | 'number' | 'password';
  text?: string;
  subText?: string;
  validationText?: string;
  multiple?: boolean;
  maxFiles?: number;
  cssClass?: string;
  class?: Type<unknown> | null;
  isHidden?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props?: any;
}
export type DefaultValueUnion =
  | string
  | string[]
  | number
  | Option
  | Option[]
  | Date[]
  | boolean
  | DirectoryEntry
  | DirectoryEntry[]
  | NuxeoDocument
  | NuxeoDocument[]
  | null
  | undefined;

export interface FieldConfig extends BaseFieldConfig {
  defaultValue?: DefaultValueUnion;
  showContentProjection?: boolean;
  name: string;
  __type?: 'general' | 'customMetadata';
}

export interface ArendetypAutocompleteConfig extends BaseFieldConfig {
  defaultValue?: ArendeTypOption[];
  name: 'arendetyp';
  __type: 'arendetypAutocomplete';
}

export interface ContactFieldConfig extends BaseFieldConfig {
  defaultValue?: { namn: string; email: string }[];
  name: 'contact' | 'avsandare' | 'mottagare';
  __type: 'contact' | 'avsandare' | 'mottagare';
}
export interface IntContactFieldConfig extends BaseFieldConfig {
  defaultValue?: { namn: string; email: string }[];
  name: 'internContacts';
  __type: 'contactInt';
}
export interface ExtContactFieldConfig extends BaseFieldConfig {
  defaultValue?: { namn: string; email: string; telefon: string; adress?: string | null }[];
  name: 'externContacts';
  __type: 'contactExt';
}
export interface MotpartContactFieldConfig extends BaseFieldConfig {
  defaultValue?: { namn: string; email: string; telefon: string }[];
  name: 'motpartContacts';
  __type: 'contactMotpart';
}

export interface InternArendereferensFieldConfig extends BaseFieldConfig {
  defaultValue?: ArendeInternReferens[];
  name: 'internArendereferens';
  __type: 'internArendereferens';
}

export interface InternHandlingsreferensFieldConfig extends BaseFieldConfig {
  defaultValue?: HandlingsInternReferens[];
  name: 'internHandlingsreferens';
  __type: 'internHandlingsreferens';
}

export interface ExternReferensFieldConfig extends BaseFieldConfig {
  defaultValue?: {
    referens: string;
    referenskommentar: string;
  }[];
  name: 'externReferens';
  __type: 'externReferens';
}

export interface EditGroup {
  containerCssClass?: string;
  cssClass?: string;
  groupName?: string;
  groupFields: GroupField[];
  groupId: string;
  size?: 'small' | 'big' | 'full';
}

export type GroupField =
  | FieldConfig
  | ContactFieldConfig
  | InternArendereferensFieldConfig
  | InternHandlingsreferensFieldConfig
  | ExternReferensFieldConfig
  | ExtContactFieldConfig
  | MotpartContactFieldConfig
  | IntContactFieldConfig
  | ArendetypAutocompleteConfig;
