import { Validators } from '@angular/forms';
import { HandlingExtendedProperties, NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { Option } from '@app/shared/commonTypes';
import { BasicContactTableComponent } from '@app/shared/components/edit-form-components/basic-contact-table/basic-contact-table.component';
import { CaseReferenceComponent } from '@app/shared/components/edit-form-components/case-reference.component/case-reference.component';
import { CustomMetadataEditComponent } from '@app/shared/components/edit-form-components/custom-metadata-edit/custom-metadata-edit.component';
import { ExternReferensComponent } from '@app/shared/components/edit-form-components/extern-referens/extern-referens.component';
import { EditGroup } from '@app/shared/components/general-form/general-form.types';
import { noWhitespaceValidator } from '@app/shared/utils/validators-utils';
import { buildLagrumFieldConfig } from '@app/shared/services/lagrum-field.service';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { hasStrongSecrecy } from '@app/shared/utils/sekretess-utils';

export function buildEditConfig(
  doc: NuxeoDocument<HandlingExtendedProperties>,
  suggestions: Record<string, Option[]>,
  currentHandlingState?: Option
): EditGroup[] {
  const props = doc.properties;
  const beslutatDatum = doc.properties[NUXEO_SCHEMA_FIELDS.handling.beslutatDatum];
  const inkommenDatum = doc.properties[NUXEO_SCHEMA_FIELDS.handling.inkommenDatum];
  const upprattadDatum = doc.properties[NUXEO_SCHEMA_FIELDS.handling.upprattadDatum];
  const makuleradDatum = doc.properties[NUXEO_SCHEMA_FIELDS.handling.makuleradDatum];
  const arkiveradDatum = doc.properties[NUXEO_SCHEMA_FIELDS.handling.arkiveradDatum];
  const gallradDatum = doc.properties[NUXEO_SCHEMA_FIELDS.handling.gallradDatum];
  const internArendereferens = doc.properties[NUXEO_SCHEMA_FIELDS.handling.internArendereferens];
  const makuleringskommentar = props[NUXEO_SCHEMA_FIELDS.handling.makuleringskommentar];
  const sekretessId = props[NUXEO_SCHEMA_FIELDS.handling.sekretess]?.id;
  const lagrumDoc = props[NUXEO_SCHEMA_FIELDS.handling.lagrumsbeskrivning];
  const lagrumDefault = lagrumDoc ? { id: lagrumDoc.uid, label: lagrumDoc.title ?? '' } : undefined;
  const shouldShowLagrum = hasStrongSecrecy(sekretessId);
  return [
    {
      groupId: 'overview',
      cssClass: 'grid-cols-6',
      size: 'full',
      groupFields: [
        {
          type: 'static-text',
          name: 'handlingsnummer',
          label: 'Handlingsnummer:',
          defaultValue: String(props[NUXEO_SCHEMA_FIELDS.handling.handlingsnummer] ?? ''),
        },

        {
          type: 'static-text' as const,
          name: 'state',
          label: 'Handlingsstatus:',
          defaultValue: currentHandlingState?.label ?? currentHandlingState?.id,
        },
        {
          type: 'dropdown',
          name: 'handlingssteg',
          label: 'Nästa handlingsstatus:',
          defaultValue: currentHandlingState?.id,
          options: suggestions['handlingssteg'],
        },
        {
          type: 'datepicker',
          name: 'beslutDate',
          label: 'Beslutat datum',
          defaultValue: beslutatDatum ? [new Date(beslutatDatum)] : null,
        },
        {
          type: 'dropdown',
          name: 'beslutsfattare',
          label: 'Beslutsfattare',
          defaultValue: props[NUXEO_SCHEMA_FIELDS.handling.beslutsfattare]?.id,
          options: suggestions['beslutsfattare'],
        },
      ],
    },
    {
      groupName: 'Handling detaljer',
      groupId: 'handlingDetails',
      containerCssClass: 'lg:col-start-1 lg:row-start-2 lg:row-span-2',
      groupFields: [
        {
          type: 'dropdown-search',
          name: 'handlingstyp',
          label: 'Handlingstyp',
          defaultValue: props[NUXEO_SCHEMA_FIELDS.handling.handlingstyp]?.uid,
          options: suggestions['handlingType'],
        },
        {
          type: 'textarea',
          name: 'handlingsnamn',
          label: 'Handlingsnamn',
          validators: [Validators.required, noWhitespaceValidator()],
          defaultValue: props[NUXEO_SCHEMA_FIELDS.handling.handlingsnamn],
        },
        {
          type: 'dropdown',
          name: 'handlingsriktning',
          label: 'Handlingsriktning',
          defaultValue: props[NUXEO_SCHEMA_FIELDS.handling.handlingsriktning]?.id,
          options: suggestions['riktning'],
        },
        {
          type: 'datepicker',
          name: 'inkommen_datum',
          label: 'Inkommen datum',
          defaultValue: inkommenDatum ? [new Date(inkommenDatum)] : null,
        },
        {
          type: 'datepicker',
          name: 'upprattad_datum',
          label: 'Upprättad datum',
          defaultValue: upprattadDatum ? [new Date(upprattadDatum)] : null,
        },
        {
          type: 'dropdown',
          name: 'forvaringsmedia',
          label: 'Förvaringsmedia',
          defaultValue: props[NUXEO_SCHEMA_FIELDS.handling.forvaringsmedia]?.id,
          options: suggestions['forvaringsmedia'],
        },
        {
          type: 'input',
          name: 'fysisk_forvaringsplats',
          label: 'Fysisk förvaringsplats',
          defaultValue: props[NUXEO_SCHEMA_FIELDS.handling.fysiskForvaringsplats],
        },
        {
          type: 'input',
          name: 'digitalt_original',
          label: 'Digitalt Original',
          defaultValue: props[NUXEO_SCHEMA_FIELDS.handling.digitaltOriginal],
        },
        {
          type: 'checkbox',
          name: 'signerad',
          label: 'Signerad',
          defaultValue: !!doc.properties[NUXEO_SCHEMA_FIELDS.handling.signerad],
        },
      ],
    },
    {
      groupName: 'Informationssäkerhet och sekretess',
      groupId: 'secret',
      containerCssClass: 'lg:col-start-2 lg:row-start-2',
      groupFields: [
        {
          type: 'dropdown',
          name: 'secret',
          label: 'Sekretess',
          defaultValue: props[NUXEO_SCHEMA_FIELDS.handling.sekretess]?.id,
          options: suggestions['secret'],
        },
        {
          ...buildLagrumFieldConfig({
            name: 'lagrumsbeskrivning',
            options: suggestions['lagrum'],
            defaultValue: lagrumDefault ? [lagrumDefault] : undefined,
          }),
          isHidden: !shouldShowLagrum,
        },
        {
          type: 'dropdown',
          name: 'secretClass',
          label: 'Säkerhetsskyddsklassificering',
          defaultValue: props[NUXEO_SCHEMA_FIELDS.handling.sakerhetsskyddsklassificering]?.id,
          options: suggestions['secretClass'],
        },
        {
          type: 'checkbox',
          name: 'gdpr',
          label: 'Innehåller personuppgifter GDPR',
          defaultValue: !!doc.properties[NUXEO_SCHEMA_FIELDS.handling.innehallerPersonuppgifterGdpr],
        },
      ],
    },
    {
      groupName: 'Bevarande och gallring',
      groupId: 'bevaras',
      containerCssClass: 'lg:col-start-2 lg:row-start-3',
      groupFields: [
        {
          type: 'dropdown',
          name: 'bevaras',
          label: 'Bevaras / Gallras',
          defaultValue: props[NUXEO_SCHEMA_FIELDS.handling.bevarasGallras]?.id,
          options: suggestions['bevaras'],
        },
        {
          type: 'datepicker',
          name: 'arkiverad_datum',
          label: 'Arkiverat datum',
          defaultValue: arkiveradDatum ? [new Date(arkiveradDatum)] : null,
        },
        {
          type: 'datepicker',
          name: 'gallrad_datum',
          label: 'Gallrat datum',
          defaultValue: gallradDatum ? [new Date(gallradDatum)] : null,
        },
        {
          type: 'datepicker',
          name: 'makulerad_datum',
          label: 'Makulerat datum',
          defaultValue: makuleradDatum ? [new Date(makuleradDatum)] : null,
        },
      ],
    },
    {
      groupName: 'Kommentar & Referenser',
      groupId: 'comment',
      cssClass: 'grid-cols-2',
      containerCssClass: 'lg:col-start-3 lg:row-start-2 lg:row-span-2',
      groupFields: [
        {
          type: 'textarea',
          name: 'kommentarer',
          label: 'Allmän kommentar',
          cssClass: 'col-span-full',
          defaultValue: props[NUXEO_SCHEMA_FIELDS.handling.kommentarer],
        },
        {
          type: 'textarea',
          name: 'makuleringskommentar',
          label: 'Makuleringskommentar',
          cssClass: 'col-span-full',
          defaultValue: typeof makuleringskommentar === 'string' ? makuleringskommentar : undefined,
        },
        {
          type: 'component',
          name: 'internArendereferens',
          label: 'Intern Arendereferens',
          cssClass: 'col-span-full',
          class: CaseReferenceComponent,
          defaultValue: internArendereferens ?? [],
          __type: 'internArendereferens',
        },
        {
          type: 'component',
          name: 'internHandlingsreferens',
          label: 'Intern Handlingsreferens',
          cssClass: 'col-span-full',
          class: CaseReferenceComponent,
          defaultValue: doc.properties[NUXEO_SCHEMA_FIELDS.handling.internHandlingsreferens] ?? [],
          __type: 'internHandlingsreferens',
        },
        {
          type: 'component',
          name: 'externReferens',
          label: 'Extern referens',
          cssClass: 'col-span-full',
          class: ExternReferensComponent,
          defaultValue: doc.properties[NUXEO_SCHEMA_FIELDS.handling.externReferens] as
            | { referens: string; referenskommentar: string }[]
            | undefined,
          __type: 'externReferens',
        },
      ],
    },
    {
      groupName: 'Interna/Externa aktörer',
      groupId: 'actor',
      cssClass: 'grid-cols-2',
      size: 'full',
      groupFields: [
        {
          type: 'dropdown',
          name: 'granskare',
          label: 'Granskare',
          defaultValue: props[NUXEO_SCHEMA_FIELDS.handling.granskare]?.id,
          options: suggestions['granskare'],
        },
        {
          type: 'dropdown-search',
          name: 'ansvarigOrg',
          label: 'Ansvarig organisatorisk enhet',
          defaultValue: props[NUXEO_SCHEMA_FIELDS.handling.ansvarigOrganisatoriskEnhet]?.uid,
          options: suggestions['ansvarigOrg'],
        },
        {
          type: 'component',
          name: 'avsandare',
          label: 'Avsändare',
          cssClass: 'col-span-full',
          class: BasicContactTableComponent,
          defaultValue: (doc.properties[NUXEO_SCHEMA_FIELDS.handling.avsandare] ?? []).map(contact => ({
            namn: contact?.namn ?? '',
            email: contact?.epost ?? '',
          })),
          __type: 'avsandare',
        },
        {
          type: 'component',
          name: 'mottagare',
          label: 'Mottagare',
          cssClass: 'col-span-full',
          class: BasicContactTableComponent,
          defaultValue: (doc.properties[NUXEO_SCHEMA_FIELDS.handling.mottagare] ?? []).map(contact => ({
            namn: contact?.namn ?? '',
            email: contact?.epost ?? '',
          })),
          __type: 'mottagare',
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
