import { ChangeDetectionStrategy, Component, inject, input, OnInit, output, signal } from '@angular/core';

import { ReactiveFormsModule, Validators } from '@angular/forms';
import { Option } from '../../../commonTypes';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { catchError, EMPTY, finalize, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { ArendeProperties, Motpart, NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { GeneralFormComponent } from '../../general-form/general-form.component';
import { FieldConfig } from '../../general-form/general-form.types';
import { GeneralStore } from '@app/core/services/general-store.service';
import { FormUtilsService } from '@app/shared/services/form-utils.service';
import {
  buildGenericCreateErrorMessage,
  buildGenericCreatedMessage,
} from '@app/shared/constants/notification-messages';
import { DigiLoaderSpinner } from '@designsystem-se/af-angular';
import { SimpleContactTableComponent } from '../../edit-form-components/simple-contact-table/simple-contact-table.component';
import { UploadedFile } from '../../file-upload/file-upload.component';
import { LagrumFieldService } from '@app/shared/services/lagrum-field.service';
import { toISODateOnlyString } from '@app/shared/utils/date-utils';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { NUXEO_VOCAB_IDS } from '@app/shared/constants/nuxeo-vocabulary-ids';

interface HandlingFormEvent {
  name: string;
  riktning: string;
  dateFrom: (string | Date)[];
  personuppgifter: boolean;
  handlingFormat: 'digital' | 'paper';
  fysisk_forvaringsplats?: string;
  secret: string;
  lagrum?: { id: string }[] | null;
  type: { id: string }[];
  rubrik: string;
  avsandare: { namn: string; org?: string | null; email: string; telefon?: string | null; adress?: string | null }[];
  mottagare: { namn: string; org?: string | null; email: string; telefon?: string | null; adress?: string | null }[];
  template: string;
  defaultMotpart: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-create-handling',
  standalone: true,
  imports: [ReactiveFormsModule, GeneralFormComponent, DigiLoaderSpinner],
  templateUrl: './create-handling-form.component.html',
})
export class CreateHandlingFormComponent implements OnInit {
  private readonly nuxeoApi = inject(NuxeoApiService);
  private readonly lagrumField = inject(LagrumFieldService);
  private readonly store = inject(GeneralStore);
  private readonly formUtils = inject(FormUtilsService);

  caseDirections = signal<Option[]>([]);
  typeOptions = signal<Option[]>([]);
  lagrumOptions = signal<Option[] | null>(null);
  defaultPayload = signal<NuxeoDocument | null>(null);
  fileBatchId = '';
  isLoading = signal(false);
  avsandareTableFields = signal([]);
  mottagareTableFields = signal([]);
  attachmentFiles: UploadedFile[] = [];
  uploadedFiles: Record<string, string> = {};
  arendeMotpart = signal<Motpart | null>(null);
  stateAgency = signal<string | null>(null);
  currentRiktning = signal<string>(NUXEO_VOCAB_IDS.arendeRiktning.intern);
  motpartOptions = signal<Option[]>([]);
  motpartRadioValue = signal<string | null>(null);
  avsandareSource = signal<'default' | 'custom'>('default');
  mottagareSource = signal<'default' | 'custom'>('default');
  private readonly contactFieldNames = new Set([
    'avsandareSource',
    'defaultAvsandare',
    'avsandare',
    'mottagareSource',
    'defaultMotpart',
    'mottagare',
  ]);

  parentUid = input.required<string>();
  path = input.required<string>();
  itemType = input.required<string>();

  dialogClosed = output<NuxeoDocument | null>();
  createHandlingConfig = signal<FieldConfig[]>([]);

  ngOnInit() {
    this.getHandlingType();
    this.getEmptyWithDefaults();

    forkJoin({
      riktning: this.nuxeoApi
        .getDirectorySuggestions('Riktning')
        .pipe(map(res => res.map(el => ({ label: el.displayLabel, id: el.id })))),
      sekretess: this.nuxeoApi
        .getDirectorySuggestions('Sekretess')
        .pipe(map(res => res.map(el => ({ label: el.displayLabel, id: el.id })))),
      motpart: this.nuxeoApi
        .getDirectorySuggestions('MotpartTyp')
        .pipe(map(res => res.map(el => ({ label: el.displayLabel, id: el.id })))),
      arendeDetails: this.nuxeoApi.getDocumentById<ArendeProperties>(this.parentUid()),
    }).subscribe(results => {
      this.arendeMotpart.set(results.arendeDetails?.properties[NUXEO_SCHEMA_FIELDS.arende.motpart] ?? null);

      const arendetypUid = results.arendeDetails?.properties[NUXEO_SCHEMA_FIELDS.arende.arendetyp]?.uid ?? null;

      const path = results.arendeDetails?.path;
      const parts = path.split('/').filter(Boolean);
      const firstFolder = parts[0] || null;
      this.stateAgency.set(firstFolder ?? null);
      const defaultRiktning = this.getRiktningDefaultValue(
        results.arendeDetails?.properties[NUXEO_SCHEMA_FIELDS.arende.riktning]
      );
      this.currentRiktning.set(defaultRiktning);
      this.motpartOptions.set(results.motpart);
      const caseMotpartTypeId = results.arendeDetails?.properties[NUXEO_SCHEMA_FIELDS.arende.motpart]?.typ ?? null;
      const fallbackMotpartTypeId = results.motpart[0]?.id ?? null;
      const defaultMotpartTypeId =
        caseMotpartTypeId && results.motpart.some(option => option.id === caseMotpartTypeId)
          ? caseMotpartTypeId
          : fallbackMotpartTypeId;
      this.motpartRadioValue.set(defaultMotpartTypeId);
      const shouldShowContacts = defaultRiktning !== NUXEO_VOCAB_IDS.arendeRiktning.intern;

      const baseConfig: FieldConfig[] = [
        {
          type: 'radio',
          name: 'handlingFormat',
          label: 'Format',
          defaultValue: 'digital',
          options: [
            { label: 'Digital', id: 'digital' },
            { label: 'Papper', id: 'paper' },
          ],
        },
        {
          type: 'uploadFile',
          name: 'uploadFile',
          label: 'Ladda upp fil',
          maxFiles: 1,
        },
        { type: 'input', name: 'rubrik', label: 'Filnamn på huvudfilen', validators: [Validators.required] },
        {
          type: 'dropdown-search',
          name: 'type',
          label: 'Handlingstyp',
          validators: [Validators.required],
          options: this.typeOptions(),
        },
        { type: 'textarea', name: 'name', label: 'Handlingsnamn', validators: [Validators.required] },
        {
          type: 'radio',
          name: 'riktning',
          label: 'Handlingsriktning',
          options: results.riktning,
          defaultValue: defaultRiktning,
        },
        {
          type: 'input',
          name: 'fysisk_forvaringsplats',
          label: 'Fysisk förvaringsplats',
        },
        {
          type: 'datepicker',
          name: 'dateFrom',
          label: 'Datum',
          defaultValue: [new Date()],
        },
        {
          type: 'dropdown',
          name: 'secret',
          label: 'Sekretess',
          options: results.sekretess,
          defaultValue: results.arendeDetails?.properties[NUXEO_SCHEMA_FIELDS.arende.sekretess],
        },
        ...(this.formUtils.hasStrongSecrecy(results.arendeDetails?.properties[NUXEO_SCHEMA_FIELDS.arende.sekretess])
          ? [
              this.lagrumField.buildField({
                name: 'lagrum',
                options: this.lagrumOptions() ?? undefined,
              }),
            ]
          : []),
        this.getMotpartRadioField(),
        {
          type: 'text',
          name: 'defaultAvsandare',
          label: 'Använd statlig myndighet från ärendet som avsändare:',
          defaultValue: firstFolder ?? 'Statlig myndighet hittades inte',
        },
        {
          type: 'text',
          name: 'defaultMotpart',
          label: 'Använd motpart från ärendet som mottagare:',
          defaultValue:
            results.arendeDetails?.properties[NUXEO_SCHEMA_FIELDS.arende.motpart]?.motpart ?? 'Fodralet saknar motpart',
        },
        {
          type: 'checkbox',
          name: 'personuppgifter',
          label: 'Personuppgifter',
          text: 'Innehåller personuppgifter GDPR',
          defaultValue: false,
        },
      ];

      this.createHandlingConfig.set(
        shouldShowContacts ? this.insertContactFields(baseConfig) : this.removeContactFields(baseConfig)
      );

      this.loadCaseLagrumOptions(arendetypUid);
    });
  }

  getRiktningDefaultValue(riktning: unknown) {
    if (riktning === 'in') {
      return NUXEO_VOCAB_IDS.arendeRiktning.inkommande;
    } else if (riktning === 'ut') {
      return NUXEO_VOCAB_IDS.arendeRiktning.utgaende;
    } else {
      return NUXEO_VOCAB_IDS.arendeRiktning.intern;
    }
  }

  onDropdownInputChange(event: { fieldName: string; value: unknown; formValue?: Record<string, string> }) {
    if (event.fieldName === 'type') {
      this.getHandlingType(String(event.value));
      if (event?.formValue?.['template']) {
        this.keepTempleteSelectedValue(event.formValue['template']);
      }
    }
  }

  uploadFile(files: UploadedFile[]) {
    const config = this.createHandlingConfig();

    if (files.length === 0) {
      const cleared = config
        .filter(field => field?.name !== 'attachments')
        .map(field => (field?.name === 'rubrik' || field.name === 'name' ? { ...field, defaultValue: '' } : field));

      this.createHandlingConfig.set(cleared);
      this.fileBatchId = '';
      return;
    }

    this.createHandlingConfig.set(
      config.map(field =>
        field.name === 'rubrik' || field.name === 'name'
          ? { ...field, defaultValue: this.removeExtension(files[0].name) }
          : field
      )
    );

    this.isLoading.set(true);
    this.nuxeoApi
      .initializeUpload()
      .pipe(
        tap(result => (this.fileBatchId = result.batchId)),
        switchMap(result => this.nuxeoApi.uploadFile(result.batchId, files)),
        tap(() => {
          this.isLoading.set(false);
          const currentConfig = this.createHandlingConfig();
          const hasAttachments = currentConfig.some(section => section.name === 'attachments');
          if (!hasAttachments) {
            const idx = currentConfig.findIndex(section => section.name === 'uploadFile');
            const newConfig = [
              ...currentConfig.slice(0, idx + 1),
              {
                type: 'uploadFile',
                name: 'attachments',
                label: 'Bilagor (valfritt)',
                multiple: true,
                subText: 'Du kan bifoga flera filer som bilagor. Varje bilaga kan ges en rubrik.',
              } as FieldConfig,
              ...currentConfig.slice(idx + 1),
            ];
            this.createHandlingConfig.set(newConfig);
          }
        })
      )
      .subscribe();
  }

  removeExtension(filename: string) {
    return filename.replace(/\.[^/.]+$/, '');
  }

  uploadAttachments(files: UploadedFile[]) {
    files.forEach(file => {
      if (file.id in this.uploadedFiles) {
        return;
      } else {
        let fileBatchId;
        this.nuxeoApi
          .initializeUpload()
          .pipe(
            tap(res => {
              fileBatchId = res.batchId;
              this.uploadedFiles[file.id] = fileBatchId;
            }),
            switchMap(result => this.nuxeoApi.uploadFile(result.batchId, [file]))
          )
          .subscribe();
      }
    });

    this.attachmentFiles = files;
  }

  getEmptyWithDefaults() {
    this.nuxeoApi
      .getEmptyWithDefaults(this.path(), this.itemType())
      .pipe(tap(result => this.defaultPayload.set(result)))
      .subscribe();
  }

  getHandlingType(searchTerm = '') {
    this.nuxeoApi
      .DMSDocumentSuggestion(this.parentUid(), 'Handlingstyp', 'Handling', searchTerm)
      .pipe(
        map(result => result.entries.map(entry => ({ label: entry.title, id: entry.uid, path: entry.path }))),
        tap(options => {
          this.typeOptions.set(options);
          const updated = this.createHandlingConfig().map(field =>
            field.name === 'type' ? { ...field, options } : field
          );
          this.createHandlingConfig.set(updated);
        })
      )
      .subscribe();
  }

  private syncLagrumOptions(options: Option[] | null): void {
    this.createHandlingConfig.update(config => this.lagrumField.syncOptions(config, 'lagrum', options));
  }

  private getLagrumSuggestions(klassUid: string | null): void {
    const toOptions = (result: { entries?: { title: string; uid: string }[] }) =>
      (result.entries ?? []).map(entry => ({ label: entry.title, id: entry.uid }));

    // All Lagrum documents visible to this case, so the dropdown always offers the full picklist.
    // Must go through getLagrumOptions (docType: 'Klass') - the 'Handling' query variant requires
    // selectedKlass as a bind param and 500s without it.
    this.nuxeoApi
      .getLagrumOptions(this.parentUid())
      .pipe(
        catchError(() => of([] as Option[])),
        tap(options => {
          this.lagrumOptions.set(options);
          this.syncLagrumOptions(options);
        })
      )
      .subscribe();

    if (!klassUid) return;

    // Just the case's own Klass refs, used only to determine the pre-selected default.
    this.nuxeoApi
      .DMSDocumentSuggestion(this.parentUid(), 'Lagrum', 'Handling', '', { selectedKlass: klassUid })
      .pipe(
        map(toOptions),
        catchError(() => of([] as Option[])),
        tap(defaultLagrum => {
          if (!defaultLagrum.length) return;
          // The dropdown is single-select; a Klass can have several Lagrum refs
          // configured, so only pre-select the first one.
          this.createHandlingConfig.update(config =>
            config.map(field => (field.name === 'lagrum' ? { ...field, defaultValue: [defaultLagrum[0]] } : field))
          );
        })
      )
      .subscribe();
  }

  private loadCaseLagrumOptions(klassUid: string | null): void {
    this.getLagrumSuggestions(klassUid);
  }

  private updateLagrum(isSecret: boolean): void {
    const config = this.createHandlingConfig();
    const hasLagrum = config.some(item => item.name === 'lagrum');

    if (isSecret && !hasLagrum) {
      const secretIndex = config.findIndex(item => item.name === 'secret');
      const insertAt = secretIndex >= 0 ? secretIndex + 1 : config.length;
      const lagrumField = this.lagrumField.buildField({
        name: 'lagrum',
        options: this.lagrumOptions() ?? undefined,
      });
      const next = [...config.slice(0, insertAt), lagrumField, ...config.slice(insertAt)];
      this.createHandlingConfig.set(next);
    }

    if (!isSecret && hasLagrum) {
      this.createHandlingConfig.update(config => this.lagrumField.removeField(config, 'lagrum'));
    }
  }

  keepTempleteSelectedValue(templateUid: string) {
    this.createHandlingConfig.update(config =>
      config.map(item => (item.name === 'uploadFile' ? { ...item, defaultValue: templateUid } : item))
    );
  }

  selectedOptionChanged(selectionChanged: {
    selectedValue: string;
    fieldName: string;
    formValue?: Record<string, string>;
  }): void {
    if (selectionChanged.fieldName === 'secret') {
      this.updateLagrum(this.formUtils.hasStrongSecrecy(selectionChanged.selectedValue));
      if (selectionChanged?.formValue?.['template']) {
        this.keepTempleteSelectedValue(selectionChanged.formValue['template']);
      }
      return;
    }
    if (selectionChanged.fieldName === 'riktning') {
      this.currentRiktning.set(selectionChanged.selectedValue);
      if (selectionChanged.selectedValue === NUXEO_VOCAB_IDS.arendeRiktning.intern) {
        this.createHandlingConfig.update(config => this.removeContactFields(config));
      } else {
        this.createHandlingConfig.set(this.insertContactFields(this.createHandlingConfig()));
      }
      return;
    }
    if (selectionChanged.fieldName === 'motpartRadio') {
      this.motpartRadioValue.set(selectionChanged.selectedValue);
      return;
    }
    if (selectionChanged.fieldName === 'avsandareSource') {
      this.avsandareSource.set(selectionChanged.selectedValue === 'avsandare-custom' ? 'custom' : 'default');
      this.createHandlingConfig.set(this.insertContactFields(this.createHandlingConfig()));
      return;
    }
    if (selectionChanged.fieldName === 'mottagareSource') {
      this.mottagareSource.set(selectionChanged.selectedValue === 'mottagare-custom' ? 'custom' : 'default');
      this.createHandlingConfig.set(this.insertContactFields(this.createHandlingConfig()));
      return;
    }
  }

  private insertContactFields(config: FieldConfig[]): FieldConfig[] {
    const cleaned = config.filter(item => !this.contactFieldNames.has(item.name) && item.name !== 'motpartRadio');
    const motpartField = this.getMotpartRadioField();
    const lagrumIndex = cleaned.findIndex(item => item.name === 'lagrum');
    const secretIndex = cleaned.findIndex(item => item.name === 'secret');
    const insertAt = lagrumIndex >= 0 ? lagrumIndex : secretIndex;
    const withMotpart =
      insertAt >= 0
        ? [...cleaned.slice(0, insertAt + 1), motpartField, ...cleaned.slice(insertAt + 1)]
        : [...cleaned, motpartField];

    const contactFields = this.getContactFields();
    const motpartIndex = withMotpart.findIndex(item => item.name === 'motpartRadio');
    if (motpartIndex === -1) {
      return [...withMotpart, ...contactFields];
    }
    return [...withMotpart.slice(0, motpartIndex + 1), ...contactFields, ...withMotpart.slice(motpartIndex + 1)];
  }

  private removeContactFields(config: FieldConfig[]): FieldConfig[] {
    return config.filter(item => !this.contactFieldNames.has(item.name) && item.name !== 'motpartRadio');
  }

  private getDefaultAvsandareField(): FieldConfig {
    if (this.currentRiktning() === NUXEO_VOCAB_IDS.arendeRiktning.utgaende) {
      return {
        type: 'text',
        name: 'defaultAvsandare',
        label: 'Använd statlig myndighet från ärendet som avsändare:',
        defaultValue: this.stateAgency() ?? 'Statlig myndighet hittades inte',
      };
    }
    return {
      type: 'text',
      name: 'defaultAvsandare',
      label: 'Använd motpart från ärendet som avsändare:',
      defaultValue: this.arendeMotpart()?.motpart ?? 'Fodralet saknar motpart',
    };
  }

  private getDefaultMotpartField(): FieldConfig {
    if (this.currentRiktning() === NUXEO_VOCAB_IDS.arendeRiktning.utgaende) {
      return {
        type: 'text',
        name: 'defaultMotpart',
        label: 'Använd motpart från ärendet som mottagare:',
        defaultValue: this.arendeMotpart()?.motpart ?? 'Fodralet saknar motpart',
      };
    }
    return {
      type: 'text',
      name: 'defaultMotpart',
      label: 'Använd statlig myndighet från ärendet som mottagare:',
      defaultValue: this.stateAgency() ?? 'Statlig myndighet hittades inte',
    };
  }

  private getMotpartRadioField(): FieldConfig {
    return {
      type: 'radio',
      name: 'motpartRadio',
      label: 'Typ av motpart',
      options: this.motpartOptions(),
      defaultValue: this.motpartRadioValue() ?? this.motpartOptions()[0]?.id,
      validators: [Validators.required],
    };
  }

  private getAvsandareSourceField(): FieldConfig {
    return {
      type: 'radio',
      name: 'avsandareSource',
      label: 'Avsändare',
      options: [
        {
          label:
            this.currentRiktning() === NUXEO_VOCAB_IDS.arendeRiktning.utgaende
              ? 'Använd statlig myndighet från ärendet som avsändare'
              : 'Använd motpart från ärendet som avsändare',
          id: 'avsandare-default',
        },
        { label: 'Ange avsändare', id: 'avsandare-custom' },
      ],
      defaultValue: this.avsandareSource() === 'custom' ? 'avsandare-custom' : 'avsandare-default',
      validators: [Validators.required],
    };
  }

  private getMottagareSourceField(): FieldConfig {
    return {
      type: 'radio',
      name: 'mottagareSource',
      label: 'Mottagare',
      options: [
        {
          label:
            this.currentRiktning() === NUXEO_VOCAB_IDS.arendeRiktning.utgaende
              ? 'Använd motpart från ärendet som mottagare'
              : 'Använd statlig myndighet från ärendet som mottagare',
          id: 'mottagare-default',
        },
        { label: 'Ange mottagare', id: 'mottagare-custom' },
      ],
      defaultValue: this.mottagareSource() === 'custom' ? 'mottagare-custom' : 'mottagare-default',
      validators: [Validators.required],
    };
  }

  private getContactFields(): FieldConfig[] {
    const useCustomAvsandare = this.avsandareSource() === 'custom';
    const useCustomMottagare = this.mottagareSource() === 'custom';
    const avsandareTableField: FieldConfig = {
      type: 'component',
      name: 'avsandare',
      label: 'Avsändare',
      class: SimpleContactTableComponent,
      props: { tableFields: this.avsandareTableFields, fieldName: 'avsandare' },
    };
    const mottagareTableField: FieldConfig = {
      type: 'component',
      name: 'mottagare',
      label: 'Mottagare',
      class: SimpleContactTableComponent,
      props: { tableFields: this.mottagareTableFields, fieldName: 'mottagare' },
    };
    return [
      this.getAvsandareSourceField(),
      ...(useCustomAvsandare ? [avsandareTableField] : [this.getDefaultAvsandareField()]),
      this.getMottagareSourceField(),
      ...(useCustomMottagare ? [mottagareTableField] : [this.getDefaultMotpartField()]),
    ];
  }

  createDocument(rawEvent: unknown) {
    const event = rawEvent as HandlingFormEvent;

    const payload = this.defaultPayload();
    if (!payload) throw Error('Payload is required for creating documents');

    if (event.handlingFormat !== 'paper' && !this.fileBatchId && !event.template) {
      throw Error('File or template is required for creating digital documents');
    }

    this.isLoading.set(true);
    const today = new Date().toISOString();

    const rawDirection = event.riktning ?? '';
    const normalizedDirection = rawDirection
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const selectedDate = toISODateOnlyString(event.dateFrom?.[0] ?? today);

    const utgaendeDatum = normalizedDirection === NUXEO_VOCAB_IDS.arendeRiktning.utgaende ? selectedDate : undefined;

    const avsandare = Array.isArray(event.avsandare) ? event.avsandare : [];
    const mottagare = Array.isArray(event.mottagare) ? event.mottagare : [];

    const isIntern = event.riktning === NUXEO_VOCAB_IDS.arendeRiktning.intern;
    const stateAgencyContact = { namn: this.stateAgency() };
    const motpartContact = { namn: this.arendeMotpart()?.motpart, email: this.arendeMotpart()?.epost };
    const isUtgaende = event.riktning === NUXEO_VOCAB_IDS.arendeRiktning.utgaende;
    const defaultAvsandare = [isUtgaende ? stateAgencyContact : motpartContact];
    const defaultMottagare = [isUtgaende ? motpartContact : stateAgencyContact];
    const useCustomAvsandare = this.avsandareSource() === 'custom';
    const useCustomMottagare = this.mottagareSource() === 'custom';
    const avsandarePayload =
      useCustomAvsandare && avsandare.length
        ? avsandare.map(sender => ({
            namn: sender?.namn,
            email: sender?.email,
          }))
        : defaultAvsandare;
    const mottagarePayload =
      useCustomMottagare && mottagare.length
        ? mottagare.map(recipient => ({
            namn: recipient?.namn,
            email: recipient?.email,
          }))
        : defaultMottagare;

    const fullPayload = {
      ...payload,
      name: event.name,
      properties: {
        ...payload.properties,
        [NUXEO_SCHEMA_FIELDS.dc.title]: event.name,
        [NUXEO_SCHEMA_FIELDS.handling.handlingsnamn]: event.name,
        [NUXEO_SCHEMA_FIELDS.handling.handlingsriktning]: event.riktning?.trim() ? event.riktning : null,
        [NUXEO_SCHEMA_FIELDS.handling.inkommenDatum]:
          event.riktning === NUXEO_VOCAB_IDS.arendeRiktning.inkommande ? selectedDate : undefined,
        [NUXEO_SCHEMA_FIELDS.handling.utgaendeDatum]: utgaendeDatum,
        [NUXEO_SCHEMA_FIELDS.handling.upprattadDatum]:
          event.riktning === NUXEO_VOCAB_IDS.arendeRiktning.utgaende ||
          event.riktning === NUXEO_VOCAB_IDS.arendeRiktning.intern
            ? selectedDate
            : undefined,
        [NUXEO_SCHEMA_FIELDS.handling.innehallerPersonuppgifterGdpr]: event.personuppgifter,
        [NUXEO_SCHEMA_FIELDS.handling.sekretess]: event.secret?.trim() ? event.secret : null,
        [NUXEO_SCHEMA_FIELDS.handling.lagrumsbeskrivning]: event['lagrum']?.[0]?.id,
        [NUXEO_SCHEMA_FIELDS.handling.handlingstyp]: event.type[0].id ?? null,
        [NUXEO_SCHEMA_FIELDS.handling.fysiskForvaringsplats]:
          event.handlingFormat === 'paper' && event.fysisk_forvaringsplats?.trim()
            ? event.fysisk_forvaringsplats
            : null,
        ...(isIntern
          ? {}
          : {
              [NUXEO_SCHEMA_FIELDS.handling.avsandare]: avsandarePayload,
              [NUXEO_SCHEMA_FIELDS.handling.mottagare]: mottagarePayload,
            }),
      },
    } as NuxeoDocument & { name: string };

    let created: NuxeoDocument;

    this.nuxeoApi
      .createDocument(fullPayload, this.path())
      .pipe(
        switchMap(result => {
          created = result;
          if (event.template) {
            return this.nuxeoApi.attachFile(
              null,
              event.name,
              created.uid,
              NUXEO_VOCAB_IDS.filTyp.huvudfil,
              undefined,
              event.template
            );
          } else {
            const calls = this.attachmentFiles.map(file =>
              this.nuxeoApi.attachFile(
                this.uploadedFiles[file.id],
                file.name,
                created.uid,
                NUXEO_VOCAB_IDS.filTyp.bilaga
              )
            );

            if (this.fileBatchId) {
              calls.push(this.nuxeoApi.attachFile(this.fileBatchId, event.rubrik, result.uid));
            }

            return calls.length ? forkJoin(calls) : of(null);
          }
        }),
        tap(() => {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: buildGenericCreatedMessage(this.itemType()),
          });
          this.dialogClosed.emit(created);
        }),
        catchError(err => {
          console.error('Error during creation:', err);
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: buildGenericCreateErrorMessage(this.itemType()),
          });
          this.dialogClosed.emit(null);
          return EMPTY;
        }),
        finalize(() => {
          this.isLoading.set(false);
        })
      )
      .subscribe();
  }

  onFileUpload(event: { files: UploadedFile[]; fieldName: string }) {
    if (event.fieldName === 'uploadFile') this.uploadFile(event.files);
    else if (event.fieldName === 'attachments') this.uploadAttachments(event.files);
  }
}
