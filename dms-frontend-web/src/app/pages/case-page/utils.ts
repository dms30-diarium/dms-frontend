import {
  AdvancedSearchProperties,
  ArendeExtendedProperties,
  HandlingExtendedProperties,
  HandlingProperties,
  Motpart,
  NuxeoDocument,
  NxUser,
} from '@app/shared/api/nuxeo-api.types';
import { CaseReferenceComponent } from '@app/shared/components/edit-form-components/case-reference.component/case-reference.component';
import { ContactTableComponent } from '@app/shared/components/edit-form-components/contact-table/contact-table.component';
import { ExternReferensComponent } from '@app/shared/components/edit-form-components/extern-referens/extern-referens.component';
import { CustomMetadataEditComponent } from '@app/shared/components/edit-form-components/custom-metadata-edit/custom-metadata-edit.component';
import { EditGroup } from '@app/shared/components/general-form/general-form.types';
import { formatDateOrMissing } from '@app/shared/utils/date-utils';
import { ArendetypAutocompleteComponent } from '@app/shared/components/edit-form-components/arendetyp-autocomplete/arendetyp-autocomplete.component';
import { ArendeTypOption, EditCaseResult, Suggestions } from './case-types';
import { arendemeningValidators, MINIMUM_WORDS_VALIDATION_TEXT } from '@app/shared/utils/validators-utils';
import { MotpartEditTableComponent } from '@app/shared/components/edit-form-components/motpart-edit-table/motpart-edit-table.component';
import { buildLagrumFieldConfig } from '@app/shared/services/lagrum-field.service';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { NUXEO_VOCAB_IDS } from '@app/shared/constants/nuxeo-vocabulary-ids';
import { hasStrongSecrecy } from '@app/shared/utils/sekretess-utils';
import { Option } from '@app/shared/commonTypes';
import { GeneralStore } from '@app/core/services/general-store.service';

const SEKRETESS_LABELS: Record<string, string> = {
  [NUXEO_VOCAB_IDS.sekretess.svagSekretess]: 'Svag sekretess',
  [NUXEO_VOCAB_IDS.sekretess.starkSekretess]: 'Stark sekretess',
  [NUXEO_VOCAB_IDS.sekretess.ingenSekretess]: 'Ingen sekretess',
  [NUXEO_VOCAB_IDS.sekretess.ejKlassad]: 'Ej klassad',
};

function getSekretessLabel(sekretessId?: string | null): string {
  if (!sekretessId) return '';
  return SEKRETESS_LABELS[sekretessId] ?? sekretessId;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function displayValue(value: unknown, fallback = ''): string {
  if (value == null) return fallback;
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    const items = value.map(item => displayValue(item)).filter(Boolean);
    return items.length ? items.join(', ') : fallback;
  }
  if (!isRecord(value)) return fallback;

  if (value['entity-type'] === 'directoryEntry') {
    const props = isRecord(value['properties']) ? value['properties'] : undefined;
    const label = typeof props?.['label'] === 'string' ? props['label'].trim() : '';
    const id = typeof value['id'] === 'string' ? value['id'].trim() : '';
    return label || id || fallback;
  }

  if (value['entity-type'] === 'user') {
    const props = isRecord(value['properties']) ? value['properties'] : undefined;
    const firstName = typeof props?.['firstName'] === 'string' ? props['firstName'].trim() : '';
    const lastName = typeof props?.['lastName'] === 'string' ? props['lastName'].trim() : '';
    const username = typeof props?.['username'] === 'string' ? props['username'].trim() : '';
    return [firstName, lastName].filter(Boolean).join(' ') || username || fallback;
  }

  const title = typeof value['title'] === 'string' ? value['title'].trim() : '';
  const label = typeof value['label'] === 'string' ? value['label'].trim() : '';
  const id = typeof value['id'] === 'string' ? value['id'].trim() : '';
  return title || label || id || fallback;
}

function displaySecret(value: unknown): string {
  const raw = displayValue(value);
  return raw ? getSekretessLabel(raw) : '';
}

function displayDate(value: unknown): string {
  return typeof value === 'string' || value instanceof Date ? formatDateOrMissing(value) : formatDateOrMissing(null);
}

function contactNames(value: unknown): string {
  if (!Array.isArray(value)) return '';
  return value
    .map(entry => (isRecord(entry) && typeof entry['namn'] === 'string' ? entry['namn'] : ''))
    .filter(Boolean)
    .join(', ');
}

function asDateArray(value: unknown): Date[] | null {
  if (!value) return null;
  const parsedDate = new Date(String(value));
  return Number.isNaN(parsedDate.getTime()) ? null : [parsedDate];
}

function asExtContacts(value: unknown): { namn: string; email: string; telefon: string; adress: string }[] {
  const arr: unknown[] = Array.isArray(value) ? (value as unknown[]) : [];
  return arr.map(item => {
    const obj = (item ?? {}) as Record<string, unknown>;
    return {
      namn: typeof obj['namn'] === 'string' ? obj['namn'] : '',
      email: typeof obj['epost'] === 'string' ? obj['epost'] : '',
      telefon: typeof obj['telefon'] === 'string' ? obj['telefon'] : '',
      adress: typeof obj['adress'] === 'string' ? obj['adress'] : '',
    };
  });
}

function asExternRefs(value: unknown): { referens: string; referenskommentar: string }[] {
  const arr: unknown[] = Array.isArray(value) ? value : [];
  return arr.map(item => {
    const obj = (item ?? {}) as Record<string, unknown>;
    return {
      referens: typeof obj['referens'] === 'string' ? obj['referens'] : '',
      referenskommentar: typeof obj['referenskommentar'] === 'string' ? obj['referenskommentar'] : '',
    };
  });
}

export function buildEditConfig(
  doc: NuxeoDocument<ArendeExtendedProperties>,
  suggestions: Suggestions,
  caseType?: ArendeTypOption,
  canEditArendeDetails = true,
  currentCaseState?: Option,
  store?: GeneralStore
): EditGroup[] {
  const props = doc.properties;

  const sekretessId = props[NUXEO_SCHEMA_FIELDS.arende.sekretess]?.id;
  const lagrumDefaults = props[NUXEO_SCHEMA_FIELDS.arende.lagrumsbeskrivning]?.map(item => ({
    id: item.uid,
    label: item.title ?? '',
  }));
  const shouldShowLagrum = hasStrongSecrecy(sekretessId);
  const beslutatDatum = doc.properties[NUXEO_SCHEMA_FIELDS.arende.beslutatDatum];

  const caseTypeFallbackFromDoc = props?.[NUXEO_SCHEMA_FIELDS.arende.arendetyp]
    ? {
        label: props[NUXEO_SCHEMA_FIELDS.arende.arendetyp]?.title ?? '',
        value: props[NUXEO_SCHEMA_FIELDS.arende.arendetyp]?.uid ?? '',
        id: props[NUXEO_SCHEMA_FIELDS.arende.arendetyp]?.uid ?? '',
      }
    : undefined;
  const caseTypeUid =
    caseType ??
    suggestions?.['caseType']?.find(el => el.value === props?.[NUXEO_SCHEMA_FIELDS.arende.arendetyp]?.uid) ??
    caseTypeFallbackFromDoc;
  const arendeDetailsDisabled = !canEditArendeDetails;
  const riktningId = props[NUXEO_SCHEMA_FIELDS.arende.riktning]?.id;

  return [
    {
      groupId: 'overview',
      size: 'full',
      cssClass: 'grid-cols-7',
      groupFields: [
        {
          type: 'static-text',
          name: 'arendenummer',
          label: store?.getValue('label.ui.schema.arende.arendenummer') ?? 'Ärendenummer',
          defaultValue: props[NUXEO_SCHEMA_FIELDS.arende.arendenummer],
        },
        {
          type: 'static-text',
          name: 'arendestatus',
          label: store?.getValue('label.ui.schema.arende.arendestatus') ?? 'Ärendestatus',
          defaultValue: props[NUXEO_SCHEMA_FIELDS.arende.arendestatus]?.properties?.label,
        },
        {
          type: 'dropdown',
          name: 'arendesteg',
          label: 'Ärendesteg:',
          defaultValue: currentCaseState?.id,
          options: suggestions['arendesteg'],
        },
        {
          type: 'dropdown',
          name: 'handlaggningsstatus',
          label: store?.getValue('label.ui.schema.arende.handlaggningsstatus') ?? 'Handläggningsstatus',
          defaultValue: props[NUXEO_SCHEMA_FIELDS.arende.handlaggningsstatus]?.id,
          options: suggestions['handlaggningsstatus'],
        },
        {
          type: 'dropdown',
          name: 'beredningsbeslut',
          label: store?.getValue('label.document.type.Beredningsbeslut') ?? 'Beredningsbeslut',
          defaultValue: props[NUXEO_SCHEMA_FIELDS.arende.beredningsbeslut]?.uid ?? '',
          options: suggestions['beredningsbeslut'],
        },
        {
          type: 'dropdown',
          name: 'beslutTyp',
          label: store?.getValue('label.document.type.Beslut') ?? 'Beslut',
          defaultValue: props[NUXEO_SCHEMA_FIELDS.arende.beslutstyp],
          options: suggestions['beslutTyp'],
        },
        {
          type: 'datepicker',
          name: 'beslutDate',
          label: 'Beslutat datum',
          defaultValue: beslutatDatum ? [new Date(beslutatDatum)] : null,
        },
      ],
    },
    {
      groupName: 'Ärendedetaljer',
      groupId: 'arendeDetails',
      groupFields: [
        {
          type: 'component',
          name: 'arendetyp',
          label: 'Ärendetyp',
          isDisabled: arendeDetailsDisabled,
          displayValue: caseTypeUid?.label,
          class: ArendetypAutocompleteComponent,
          defaultValue: caseTypeUid ? [caseTypeUid] : undefined,
          options: suggestions['caseType'],
          __type: 'arendetypAutocomplete',
        },
        {
          type: 'textarea',
          name: 'arendemening',
          label: 'Ärendemening',
          isDisabled: arendeDetailsDisabled,
          displayValue: props[NUXEO_SCHEMA_FIELDS.arende.arendemening],
          validators: arendemeningValidators(),
          validationText: MINIMUM_WORDS_VALIDATION_TEXT,
          defaultValue: props[NUXEO_SCHEMA_FIELDS.arende.arendemening],
        },
        {
          type: 'textarea',
          name: 'intern',
          label: 'Intern Ärendemening',
          isDisabled: arendeDetailsDisabled,
          displayValue: props[NUXEO_SCHEMA_FIELDS.arende.internArendemening],
          validators: arendemeningValidators(),
          validationText: MINIMUM_WORDS_VALIDATION_TEXT,
          defaultValue: props[NUXEO_SCHEMA_FIELDS.arende.internArendemening],
        },
        {
          type: 'dropdown',
          name: 'riktning',
          label: 'Riktning',
          isDisabled: arendeDetailsDisabled,
          displayValue: suggestions['riktning']?.find(option => option.id === riktningId)?.label ?? riktningId,
          defaultValue: riktningId,
          options: suggestions['riktning'],
        },
        {
          type: 'datepicker',
          name: 'registered',
          label: 'Registrerad / Öppnad',
          isDisabled: arendeDetailsDisabled,
          displayValue: formatDateOrMissing(props[NUXEO_SCHEMA_FIELDS.arende.arendetRegistreratDatum]),
          defaultValue: asDateArray(props[NUXEO_SCHEMA_FIELDS.arende.arendetRegistreratDatum]),
        },
      ],
    },

    {
      groupName: 'Informationsssäkerhet och Sekretess',
      groupId: 'secret',
      groupFields: [
        {
          type: 'dropdown',
          name: 'secret',
          label: 'Sekretess',
          defaultValue: props[NUXEO_SCHEMA_FIELDS.arende.sekretess]?.id,
          options: suggestions['secret'],
        },
        {
          ...buildLagrumFieldConfig({
            name: 'lagrum',
            options: suggestions['lagrum'],
            defaultValue: lagrumDefaults,
          }),
          isHidden: !shouldShowLagrum,
        },
        {
          type: 'dropdown',
          name: 'secretClass',
          label: 'Säkerhetsskyddsklassificering',
          defaultValue: props[NUXEO_SCHEMA_FIELDS.arende.sakerhetsskyddsklassificering]?.id,
          options: suggestions['secretClass'],
        },
        {
          type: 'checkbox',
          name: 'gdpr',
          label: 'Innehåller personuppgifter GDPR',
          defaultValue: !!props[NUXEO_SCHEMA_FIELDS.arende.innehallerPersonuppgifterGdpr],
        },
      ],
    },

    {
      groupName: 'Bevarande och gallring',
      groupId: 'bevaras',
      groupFields: [
        {
          type: 'dropdown',
          name: 'bevaras',
          label: 'Bevaras / Gallras',
          options: suggestions['bevaras'],
          defaultValue: props[NUXEO_SCHEMA_FIELDS.arende.bevarasGallras]?.id,
        },
        {
          type: 'datepicker',
          name: 'arkiverat',
          label: 'Ärendet arkiverat datum',
          defaultValue: asDateArray(props[NUXEO_SCHEMA_FIELDS.arende.arendetArkiveratDatum]),
        },
        {
          type: 'datepicker',
          name: 'gallrat',
          label: 'Ärendet gallrat datum',
          defaultValue: asDateArray(props[NUXEO_SCHEMA_FIELDS.arende.arendetGallratDatum]),
        },
        {
          type: 'datepicker',
          name: 'makulerat',
          label: 'Ärendet makulerat datum',
          defaultValue: asDateArray(props[NUXEO_SCHEMA_FIELDS.arende.arendetMakuleratDatum]),
        },
      ],
    },

    {
      groupName: 'Allmän kommentar',
      groupId: 'comment',
      groupFields: [
        {
          type: 'textarea',
          name: 'allmanComment',
          label: 'Allmän kommentar',
          defaultValue: props[NUXEO_SCHEMA_FIELDS.arende.allmanKommentar],
        },
        {
          type: 'textarea',
          name: 'commentJK',
          label: 'JK-Kommentar',
          defaultValue: props[NUXEO_SCHEMA_FIELDS.arende.jkKommentar],
        },
        {
          type: 'textarea',
          name: 'makulering',
          label: 'Makulering',
        },
      ],
    },

    {
      groupName: 'Interna/Externa aktörer',
      groupId: 'actor',
      cssClass: 'grid-cols-[repeat(auto-fit,_minmax(30%,_1fr))]',
      size: 'full',
      groupFields: [
        {
          type: 'dropdown-search',
          name: 'organization',
          label: 'Ansvarig organisatorisk enhet',
          options: suggestions['organization'],
          defaultValue: props[NUXEO_SCHEMA_FIELDS.arende.ansvarigOrganisatoriskEnhet]?.uid,
        },
        {
          type: 'component',
          cssClass: 'col-span-full',
          name: 'internContacts',
          class: ContactTableComponent,
          __type: 'contactInt',
        },
        {
          type: 'component',
          cssClass: 'col-span-full',
          name: 'externContacts',
          class: ContactTableComponent,
          defaultValue: asExtContacts(props[NUXEO_SCHEMA_FIELDS.arende.kontakter]),
          __type: 'contactExt',
        },
        {
          type: 'component',
          cssClass: 'col-span-full',
          name: 'motpartContacts',
          label: 'Motpart kontakter (Externa)',
          class: MotpartEditTableComponent,
          __type: 'contactMotpart',
        },
      ],
    },

    {
      groupName: 'Ärendereferens',
      groupId: 'arendeRef',
      size: 'full',
      groupFields: [
        {
          type: 'component',
          name: 'internArendereferens',
          label: 'Intern Ärenderef',
          class: CaseReferenceComponent,
          defaultValue: props[NUXEO_SCHEMA_FIELDS.arende.internArendereferens],
          __type: 'internArendereferens',
        },
        {
          type: 'component',
          name: 'internHandlingsreferens',
          label: 'Intern Handlingsref',
          class: CaseReferenceComponent,
          defaultValue: props[NUXEO_SCHEMA_FIELDS.arende.internHandlingsreferens],
          __type: 'internHandlingsreferens',
        },
        {
          type: 'component',
          name: 'externReferens',
          label: 'Extern referens',
          class: ExternReferensComponent,
          defaultValue: asExternRefs(props[NUXEO_SCHEMA_FIELDS.arende.externReferens]),
          __type: 'externReferens',
        },
      ],
    },

    {
      groupName: 'Extra metadatafält',
      groupId: 'customMetadata',
      size: 'full',
      groupFields: [
        {
          type: 'component',
          name: 'customMetadata',
          label: 'Extra metadatafält',
          class: CustomMetadataEditComponent,
          __type: 'customMetadata',
        },
      ],
    },
  ];
}

export function getHandlingTableItems(
  doc: NuxeoDocument<HandlingProperties | HandlingExtendedProperties | AdvancedSearchProperties>
) {
  const p = doc.properties;
  const senderContacts = asExtContacts(p[NUXEO_SCHEMA_FIELDS.handling.avsandare]);
  const recipientContacts = asExtContacts(p[NUXEO_SCHEMA_FIELDS.handling.mottagare]);
  const inkommenDatum = p[NUXEO_SCHEMA_FIELDS.handling.inkommenDatum];

  const handlingStatus = displayValue(p[NUXEO_SCHEMA_FIELDS.handling.handlingsstatus]);
  const lifecycleState = doc.state ?? '';
  const status = handlingStatus || lifecycleState;

  return {
    id: doc.uid,
    title: doc.title ?? '—',
    type: doc.type ?? '',
    lastModified: formatDateOrMissing(doc.lastModified),

    handlingsnamn: displayValue(p[NUXEO_SCHEMA_FIELDS.handling.handlingsnamn]),
    handlingsnummer: displayValue(p[NUXEO_SCHEMA_FIELDS.handling.handlingsnummer]),
    arendenummer: displayValue(p[NUXEO_SCHEMA_FIELDS.handling.arendenummer]),

    status,
    handlingStatus,
    riktning: displayValue(p[NUXEO_SCHEMA_FIELDS.handling.handlingsriktning]),
    sekretess: displaySecret(p[NUXEO_SCHEMA_FIELDS.handling.sekretess]),
    sakerhetsskyddsklassificering: displayValue(p[NUXEO_SCHEMA_FIELDS.handling.sakerhetsskyddsklassificering]),
    beslutsfattare: displayValue(p[NUXEO_SCHEMA_FIELDS.handling.beslutsfattare]),
    ansvarigHandlaggare: displayValue(p[NUXEO_SCHEMA_FIELDS.handling.ansvarigHandlaggare]),
    ansvarigEnhet: displayValue(p[NUXEO_SCHEMA_FIELDS.handling.ansvarigOrganisatoriskEnhet]),
    medhandlaggare: displayValue(p[NUXEO_SCHEMA_FIELDS.handling.medhandlaggare]),
    granskare: displayValue(p[NUXEO_SCHEMA_FIELDS.handling.granskare]),

    granskningsdatum: displayDate(p[NUXEO_SCHEMA_FIELDS.handling.granskningsdatum]),
    granskningskommentar: displayValue(p[NUXEO_SCHEMA_FIELDS.handling.granskningskommentar]),

    inkommen: displayDate(p[NUXEO_SCHEMA_FIELDS.handling.inkommenDatum]),
    receivedDate: displayDate(p[NUXEO_SCHEMA_FIELDS.handling.inkommenDatum]),
    utgaende: displayDate(p[NUXEO_SCHEMA_FIELDS.handling.utgaendeDatum]),
    deadline: displayDate(p[NUXEO_SCHEMA_FIELDS.handling.utgaendeDatum]),
    upprattadDatum: displayDate(p[NUXEO_SCHEMA_FIELDS.handling.upprattadDatum]),
    arkiveradDatum: displayDate(p[NUXEO_SCHEMA_FIELDS.handling.arkiveradDatum]),
    gallradDatum: displayDate(p[NUXEO_SCHEMA_FIELDS.handling.gallradDatum]),
    makuleradDatum: displayDate(p[NUXEO_SCHEMA_FIELDS.handling.makuleradDatum]),

    sender: senderContacts
      .map(entry => entry.namn || entry.email || '')
      .filter(Boolean)
      .join(', '),
    motpart: recipientContacts
      .map(entry => entry.namn || entry.email || '')
      .filter(Boolean)
      .join(', '),
    kommentarer: displayValue(p[NUXEO_SCHEMA_FIELDS.handling.kommentarer]),

    bevarasGallras: displayValue(p[NUXEO_SCHEMA_FIELDS.handling.bevarasGallras]),
    innehallerPersonuppgifter:
      typeof p[NUXEO_SCHEMA_FIELDS.handling.innehallerPersonuppgifterGdpr] === 'boolean'
        ? p[NUXEO_SCHEMA_FIELDS.handling.innehallerPersonuppgifterGdpr]
          ? 'Ja'
          : 'Nej'
        : '',

    signerad: p[NUXEO_SCHEMA_FIELDS.handling.signerad] ? 'Ja' : 'Nej',
    createdBy: displayValue(p[NUXEO_SCHEMA_FIELDS.dc.creator]),
    created: displayDate(p[NUXEO_SCHEMA_FIELDS.dc.created]),
    modified: displayDate(p[NUXEO_SCHEMA_FIELDS.dc.modified]),

    link: ['/doc', doc.uid],
    inkommet: (() => {
      return typeof inkommenDatum === 'string' || inkommenDatum instanceof Date
        ? new Date(inkommenDatum).toLocaleDateString('sv-SE')
        : '-';
    })(),
    avsandare: contactNames(doc?.properties[NUXEO_SCHEMA_FIELDS.handling.avsandare]),
  };
}

export function getUtkastTableItems(doc: NuxeoDocument<AdvancedSearchProperties>) {
  const p = doc.properties;
  const status = doc.state ?? '';
  const inkommenDatum = p[NUXEO_SCHEMA_FIELDS.handling.inkommenDatum];

  return {
    id: doc.uid,
    title: doc.title ?? '',
    type: doc.type ?? '',
    lastModified: formatDateOrMissing(doc.lastModified),
    status,
    riktning: displayValue(p[NUXEO_SCHEMA_FIELDS.handling.handlingsriktning]),
    created: displayDate(p[NUXEO_SCHEMA_FIELDS.dc.created]),
    link: ['/doc', doc.uid],
    inkommet:
      typeof inkommenDatum === 'string' || inkommenDatum instanceof Date
        ? new Date(inkommenDatum).toLocaleDateString('sv-SE')
        : '-',
    avsandare: contactNames(doc?.properties[NUXEO_SCHEMA_FIELDS.handling.avsandare]),
  };
}
export function getUtkastExtendedTableItems(doc: NuxeoDocument<HandlingExtendedProperties>) {
  const p = doc.properties;
  const status = doc.state ?? '';
  const inkommenDatum = p[NUXEO_SCHEMA_FIELDS.handling.inkommenDatum];

  return {
    id: doc.uid,
    title: doc.title ?? '',
    type: doc.type ?? '',
    lastModified: formatDateOrMissing(doc.lastModified),
    status,
    riktning: p[NUXEO_SCHEMA_FIELDS.handling.handlingsriktning]?.properties?.label ?? '',
    created: formatDateOrMissing(p[NUXEO_SCHEMA_FIELDS.dc.created]),
    link: ['/doc', doc.uid],
    inkommet: inkommenDatum ? new Date(inkommenDatum).toLocaleDateString('sv-SE') : '-',
    avsandare: doc?.properties[NUXEO_SCHEMA_FIELDS.handling.avsandare]?.map(el => el.namn).join(', '),
  };
}

function compareSortValues(a: unknown, b: unknown, sortOrder: 'asc' | 'desc'): number {
  const first = a == null ? '' : String(a);
  const second = b == null ? '' : String(b);
  if (first === second) return 0;
  if (first < second) return sortOrder === 'asc' ? -1 : 1;
  return sortOrder === 'asc' ? 1 : -1;
}

export function sortRows<T extends Record<string, unknown>>(rows: T[], sortBy: string, sortOrder: 'asc' | 'desc'): T[] {
  if (!sortBy) return rows;
  const sorted = [...rows];
  sorted.sort((a, b) => compareSortValues(a[sortBy], b[sortBy], sortOrder));
  return sorted;
}

export function getFormProperties(formResult: EditCaseResult, registeredDate: Date) {
  const medhandlaggareValues = Array.isArray(formResult?.medhandlaggare)
    ? formResult.medhandlaggare
    : formResult?.medhandlaggare
      ? [formResult.medhandlaggare]
      : [];

  const props = {
    [NUXEO_SCHEMA_FIELDS.dc.title]: formResult?.arendeDetails?.arendemening,
    [NUXEO_SCHEMA_FIELDS.arende.arendemening]: formResult?.arendeDetails?.arendemening,
    [NUXEO_SCHEMA_FIELDS.arende.arendetRegistreratDatum]: registeredDate ? registeredDate.toISOString() : undefined,
    [NUXEO_SCHEMA_FIELDS.arende.arendetyp]: formResult?.arendeTypAutosuggest?.[0]?.id,
    [NUXEO_SCHEMA_FIELDS.arende.handlaggningsstatus]: formResult?.overview?.handlaggningsstatus,
    [NUXEO_SCHEMA_FIELDS.arende.beredningsbeslut]: formResult?.overview?.beredningsbeslut,
    [NUXEO_SCHEMA_FIELDS.arende.internArendemening]: formResult?.arendeDetails?.intern,
    [NUXEO_SCHEMA_FIELDS.arende.riktning]: formResult?.arendeDetails?.riktning,
    [NUXEO_SCHEMA_FIELDS.arende.beslutatDatum]: formResult?.overview?.beslutDate?.[0],
    [NUXEO_SCHEMA_FIELDS.arende.beslutstyp]: formResult?.overview?.beslutTyp,
    [NUXEO_SCHEMA_FIELDS.arende.internArendereferens]:
      formResult?.internArendereferens?.map(reference => ({
        referenstyp: reference?.type,
        referenskommentar: reference?.comment,
        arende: reference?.caseRef,
      })) ?? [],

    [NUXEO_SCHEMA_FIELDS.arende.internHandlingsreferens]:
      formResult?.internHandlingsreferens?.map(reference => ({
        referenstyp: reference?.type,
        referenskommentar: reference?.comment,
        handling: reference?.caseRef,
      })) ?? [],

    [NUXEO_SCHEMA_FIELDS.arende.externReferens]:
      formResult?.externReferens?.map(reference => ({
        referens: reference?.referens,
        referenskommentar: reference?.comment,
      })) ?? [],

    [NUXEO_SCHEMA_FIELDS.arende.sakerhetsskyddsklassificering]: formResult?.secret?.secretClass,
    [NUXEO_SCHEMA_FIELDS.arende.sekretess]: formResult?.secret?.secret,
    [NUXEO_SCHEMA_FIELDS.arende.innehallerPersonuppgifterGdpr]: formResult?.secret?.gdpr,
    [NUXEO_SCHEMA_FIELDS.arende.lagrumsbeskrivning]: formResult?.secret?.lagrum?.map(item => item.id) ?? [],
    [NUXEO_SCHEMA_FIELDS.arende.allmanKommentar]: formResult?.comment?.allmanComment,
    [NUXEO_SCHEMA_FIELDS.arende.jkKommentar]: formResult?.comment?.commentJK,
    [NUXEO_SCHEMA_FIELDS.arende.bevarasGallras]: formResult?.bevaras?.bevaras,
    [NUXEO_SCHEMA_FIELDS.arende.arendetArkiveratDatum]: formResult?.bevaras?.arkiverat?.[0],
    [NUXEO_SCHEMA_FIELDS.arende.arendetGallratDatum]: formResult?.bevaras?.gallrat?.[0],
    [NUXEO_SCHEMA_FIELDS.arende.arendetMakuleratDatum]: formResult?.bevaras?.makulerat?.[0],

    [NUXEO_SCHEMA_FIELDS.arende.ansvarigHandlaggare]: formResult?.ansvarig_handlaggare,
    [NUXEO_SCHEMA_FIELDS.arende.motpart]: {
      motpart: formResult.motpartContacts[0]?.motpart,
      adress: formResult.motpartContacts[0]?.adress,
      epost: formResult.motpartContacts[0]?.epost,
      telefon: formResult.motpartContacts[0]?.telefon,
      postnummer: formResult.motpartContacts[0]?.postnummer,
      typ: formResult.motpartContacts[0]?.typ,
      organisationsnummer: formResult.motpartContacts[0]?.organisationsnummer,
    },
    [NUXEO_SCHEMA_FIELDS.arende.ansvarigBeslutsfattare]: formResult?.beslutsfattare,

    [NUXEO_SCHEMA_FIELDS.arende.granskare]: Array.isArray(formResult?.granskare)
      ? formResult?.granskare
      : [formResult?.granskare],
    [NUXEO_SCHEMA_FIELDS.arende.medhandlaggare]: medhandlaggareValues,

    [NUXEO_SCHEMA_FIELDS.arende.kontakter]:
      formResult?.externContacts?.map(contact => ({
        namn: contact?.name,
        epost: contact?.email,
        telefon: contact?.phone,
        adress: contact?.adress,
      })) ?? [],
  };
  const filteredProps = Object.fromEntries(
    Object.entries(props).filter(([, value]) => value !== '' && value !== undefined)
  );
  return filteredProps;
}

export function getDisplayedNames(props?: NxUser) {
  if (!props) return '';
  return props?.properties?.firstName + ' ' + props?.properties?.lastName;
}

export function getMotpartContacts(props: ArendeExtendedProperties): Motpart[] {
  const motpartItems = props?.[NUXEO_SCHEMA_FIELDS.arende.motpart];
  return [
    {
      typ: motpartItems?.typ?.properties?.id,
      motpart: motpartItems?.motpart,
      organisationsnummer: motpartItems?.organisationsnummer,
      epost: motpartItems?.epost,
      adress: motpartItems?.adress,
      telefon: motpartItems?.telefon,
      postnummer: motpartItems?.postnummer,
    },
  ];
}

export function getInternalContacts(props: ArendeExtendedProperties) {
  const medh = props?.[NUXEO_SCHEMA_FIELDS.arende.medhandlaggare];
  const gransk = props?.[NUXEO_SCHEMA_FIELDS.arende.granskare];
  return [
    {
      type: 'Ansvarig handlaggare',
      name: props?.[NUXEO_SCHEMA_FIELDS.arende.ansvarigHandlaggare]?.id,
      displayLabel: getDisplayedNames(props?.[NUXEO_SCHEMA_FIELDS.arende.ansvarigHandlaggare]),
      id: crypto.randomUUID(),
      email: props?.[NUXEO_SCHEMA_FIELDS.arende.ansvarigHandlaggare]?.['properties']?.['email'] ?? '',
      org: props?.[NUXEO_SCHEMA_FIELDS.arende.ansvarigHandlaggare]?.['properties']?.['company'] ?? '',
    },
    {
      type: 'Medhandlaggare',
      displayLabel: medh?.map(el => getDisplayedNames(el)).join(', ') ?? '',
      name: medh?.map(el => el?.id),
      id: crypto.randomUUID(),
      email:
        medh
          ?.map(el => el?.properties?.email)
          .filter(Boolean)
          .join(', ') ?? '',
      org:
        medh
          ?.map(el => el?.properties?.company)
          .filter(Boolean)
          .join(', ') ?? '',
    },
    {
      type: 'Beslutsfattare',
      displayLabel: getDisplayedNames(props?.[NUXEO_SCHEMA_FIELDS.arende.ansvarigBeslutsfattare]),
      name: props?.[NUXEO_SCHEMA_FIELDS.arende.ansvarigBeslutsfattare]?.id,
      email: props?.[NUXEO_SCHEMA_FIELDS.arende.ansvarigBeslutsfattare]?.properties?.email ?? '',
      org: props?.[NUXEO_SCHEMA_FIELDS.arende.ansvarigBeslutsfattare]?.properties?.company ?? '',
      id: crypto.randomUUID(),
    },
    {
      type: 'Granskare av arendet',
      displayLabel: gransk?.map(el => getDisplayedNames(el)).join(', ') ?? '',
      name: gransk?.map(el => el?.id),
      email:
        gransk
          ?.map(el => el?.['properties']?.['email'])
          .filter(Boolean)
          .join(', ') ?? '',
      org:
        gransk
          ?.map(el => el?.['properties']?.['company'])
          .filter(Boolean)
          .join(', ') ?? '',
      id: crypto.randomUUID(),
    },
  ];
}
