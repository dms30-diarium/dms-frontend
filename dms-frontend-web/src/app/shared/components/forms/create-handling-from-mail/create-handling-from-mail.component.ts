import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  OnInit,
  output,
  signal,
  ViewChild,
  WritableSignal,
} from '@angular/core';

import { ReactiveFormsModule, Validators } from '@angular/forms';
import { ContactOption, Option } from '../../../commonTypes';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { catchError, EMPTY, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { ArendeProperties, Motpart, NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { GeneralFormComponent } from '../../general-form/general-form.component';
import { FieldConfig } from '../../general-form/general-form.types';
import { DigiLoaderSpinner, DigiButton, DigiFormRadiogroup, DigiFormRadiobutton } from '@designsystem-se/af-angular';
import { Router } from '@angular/router';
import { GeneralStore } from '@app/core/services/general-store.service';
import { FormUtilsService } from '@app/shared/services/form-utils.service';
import { AssignUserModalComponent } from '../../assign-user-modal/assign-user-modal.component';
import { SimpleContactTableComponent } from '../../edit-form-components/simple-contact-table/simple-contact-table.component';
import { ArendetypAutocompleteComponent } from '../../edit-form-components/arendetyp-autocomplete/arendetyp-autocomplete.component';
import { ArendeTypOption } from '@app/pages/case-page/case-types';
import { MotpartForm, MotpartInfoComponent } from '../forms-components/motpart-info/motpart-info.component';
import { TooltipDirective } from '@app/shared/directives/tooltip.directive';
import { LagrumFieldService } from '@app/shared/services/lagrum-field.service';
import { DigiIconHome } from '@designsystem-se/af-angular';
import {
  arendemeningValidators,
  MINIMUM_WORDS_VALIDATION_TEXT,
  noWhitespaceValidator,
} from '@app/shared/utils/validators-utils';
import { CreateHandlingFromMailFormComponent } from '../create-handling-from-mail-form/create-handling-from-mail-form.component';
import {
  CREATE_HANDLING_FROM_MAIL_REQUIRED_FIELDS_MESSAGE,
  CREATE_HANDLING_FROM_MAIL_SUCCESS_MESSAGE,
} from '@app/shared/constants/notification-messages';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { NUXEO_VOCAB_IDS } from '@app/shared/constants/nuxeo-vocabulary-ids';

export interface FormResult {
  [key: string]: unknown;
  existingArende?: string | null;
  arendeParent?: string | null;
  arendeRiktning?: string | null;
  arendemening?: string | null;
  arendeMotpart?: string | null;
  arendeMotpartRadio?: string | null;
  arendetyp?: string | null;
  arendeLagrum?: string | null;
  arendeExternReferens?: string | null;
  arendeSecretKlass?: string | null;
  attachment?: { id: string; label: string }[] | null;
  dateFrom?: Date[];
  handlingFormat?: 'digital' | 'paper' | null;
  type?: { id: string }[] | null;
  name?: string | null;
  fysisk_forvaringsplats?: string | null;
  intern?: string | null;
  motpartRadio?: string | null;
  personuppgifter?: boolean;
  riktning?: string | null;
  avsandareSource?: string | null;
  mottagareSource?: string | null;
  avsandare?: { namn?: string | null; email?: string | null }[] | null;
  mottagare?: { namn?: string | null; email?: string | null }[] | null;
  secret?: string | null;
  lagrum?: string | null;
  mainFile?: string | null;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-create-handling-from-mail',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    GeneralFormComponent,
    AssignUserModalComponent,
    TooltipDirective,
    DigiLoaderSpinner,
    DigiButton,
    DigiIconHome,
    DigiFormRadiogroup,
    DigiFormRadiobutton,
    CreateHandlingFromMailFormComponent,
  ],
  templateUrl: './create-handling-from-mail.component.html',
})
export class CreateHandlingFromMail implements OnInit {
  @ViewChild(AssignUserModalComponent) assignComponent?: AssignUserModalComponent;
  formResult = signal<FormResult | null>(null);
  readonly router = inject(Router);
  readonly nuxeoApi = inject(NuxeoApiService);
  lagrumOptions = signal<Option[] | null>(null);
  arendeLagrumOptions = signal<Option[] | null>(null);
  arendeLagrumDefaultId = signal<string | null>(null);
  arendeSecretDefaultId = signal<string | null>(null);
  selectedArendetypId = signal<string | null>(null);
  existingArendeOptions = signal<Option[]>([]);
  arendeTypeValue = signal<ArendeTypOption[]>([]);
  arendeParentOptions = signal<Option[]>([]);
  motpartFormResult = signal<MotpartForm | null>(null);
  caseMotpartOptions = signal<Option[] | null>(null);
  caseMotpartRadioValue = signal<string | null>(null);
  hasInternRiktning = signal<boolean>(false);
  caseSearchButtonText = signal('Sök hos Bolagsverket');
  avsandareTableFields = signal<ContactOption[]>([]);
  mottagareTableFields = signal<ContactOption[]>([]);
  currentRiktning = signal<string>(NUXEO_VOCAB_IDS.arendeRiktning.inkommande);
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
  document = input<NuxeoDocument>();
  private store = inject(GeneralStore);
  private readonly formUtils = inject(FormUtilsService);
  private readonly lagrumField = inject(LagrumFieldService);
  isLoading = signal(false);
  isHandlingSubmitted = signal(false);
  isExistingCase = signal<'existing' | 'new'>('existing');
  private readonly lagrumOptionCache = new Set<string>();
  private readonly caseParentRefOverride = signal<string>('');
  caseParentRef = computed(() => this.caseParentRefOverride() || this.document()?.parentRef || this.parentId() || '');
  private lastResolvedParentStartId: string | null = null;

  attachments = input<Option[]>();
  parentId = input<string>();
  dialogClosed = output<NuxeoDocument | null>();

  existingArendeConfig = signal<FieldConfig[]>([
    {
      type: 'dropdown-search',
      name: 'existingArende',
      label: 'Ärende',
      validators: [Validators.required],
      options: [],
      props: { optionsSignal: this.existingArendeOptions },
    },
  ]);
  createArendeConfig = signal<FieldConfig[]>([]);

  createHandlingConfig = signal<FieldConfig[]>([]);

  createFileConfig = signal<FieldConfig[]>([]);

  constructor() {
    effect(() => {
      const arendeTypeEntry = this.arendeTypeValue()?.[0];
      const arendeTypeId = arendeTypeEntry?.value ?? arendeTypeEntry?.id;
      if (arendeTypeId) {
        this.handleArendeTypeSelected(arendeTypeId);
      }
    });
    effect(() => {
      const doc = this.document();
      const startId = doc?.uid ?? doc?.parentRef ?? this.parentId() ?? null;
      if (!startId || this.lastResolvedParentStartId === startId) {
        return;
      }
      this.lastResolvedParentStartId = startId;
      this.resolveCaseParentRef(startId);
    });
  }

  ngOnInit() {
    this.getOptions('SELECT * FROM Arende', this.existingArendeConfig, 'existingArende', this.existingArendeOptions);
    this.loadArendeParentOptions('');
    this.initArendeConfig();
    this.initHandlingConfig();
    this.loadAllLagrumOptions()
      .pipe(tap(options => this.setLagrumOptionsForMode(options, this.isExistingCase())))
      .subscribe();
    this.createFileConfig.set([
      { type: 'dropdown', name: 'mainFile', label: 'Huvudfil (Fil) ', options: this.attachments() },
      { type: 'dropdown-search', name: 'attachment', label: 'Bilaga', options: this.attachments(), multiple: true },
    ]);
  }

  private initHandlingConfig(): void {
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
    }).subscribe(results => {
      this.motpartOptions.set(results.motpart);
      this.motpartRadioValue.set(results.motpart[0]?.id ?? null);

      const baseConfig: FieldConfig[] = [
        { type: 'dropdown-search', name: 'type', label: 'Handlingstyp', validators: [Validators.required] },
        {
          type: 'textarea',
          name: 'name',
          label: 'Handlingsnamn',
          validators: [Validators.required, noWhitespaceValidator()],
        },
        { type: 'datepicker', name: 'dateFrom', label: 'Datum', defaultValue: [new Date()] },
        {
          type: 'dropdown',
          name: 'secret',
          label: 'Sekretess',
          options: results.sekretess,
          defaultValue: this.arendeSecretDefaultId() ?? undefined,
        },
        this.getMotpartRadioField(),
        this.getDefaultAvsandareField(),
        this.getDefaultMotpartField(),
        {
          type: 'checkbox',
          name: 'personuppgifter',
          label: 'Personuppgifter',
          text: 'Innehåller personuppgifter GDPR',
          defaultValue: false,
        },
      ];

      this.createHandlingConfig.set(this.insertContactFields(baseConfig));
      this.getOptions('SELECT * FROM Handlingstyp', this.createHandlingConfig, 'type');
    });
  }

  private initArendeConfig(): void {
    forkJoin({
      riktning: this.nuxeoApi
        .getDirectorySuggestions('ArendeRiktning')
        .pipe(map(res => res.map(el => ({ label: el.displayLabel, id: el.id })))),
      sekretess: this.nuxeoApi
        .getDirectorySuggestions('Sekretess')
        .pipe(map(res => res.map(el => ({ label: el.displayLabel, id: el.id })))),
      motpart: this.nuxeoApi
        .getDirectorySuggestions('MotpartTyp')
        .pipe(map(res => res.map(el => ({ label: el.displayLabel, id: el.id })))),
      secretClass: this.nuxeoApi
        .getDirectorySuggestions('Sakerhetsskyddsklassificering')
        .pipe(map(res => res.map(el => ({ label: el.displayLabel, id: el.id })))),
    }).subscribe(results => {
      this.caseMotpartOptions.set(results.motpart);
      this.caseMotpartRadioValue.set(results.motpart[1]?.id ?? results.motpart[0]?.id ?? null);

      const baseConfig: FieldConfig[] = [
        {
          type: 'dropdown-search',
          name: 'arendeParent',
          label: 'Skapa i',
          validators: [Validators.required],
          options: [],
          props: { optionsSignal: this.arendeParentOptions },
        },
        {
          type: 'radio',
          name: 'arendeRiktning',
          label: 'Riktning',
          options: results.riktning,
          defaultValue: results.riktning[0]?.id,
          validators: [Validators.required],
        },
        {
          type: 'radio',
          name: 'arendeMotpartRadio',
          label: 'Typ av motpart',
          options: results.motpart,
          defaultValue: this.caseMotpartRadioValue() ?? undefined,
          validators: [Validators.required],
        },
        {
          type: 'input',
          name: 'arendeMotpart',
          showContentProjection: true,
          label: 'Motpartens namn',
          validators: [Validators.required],
        },
        {
          type: 'component',
          name: 'arendeMotpartComponent',
          class: MotpartInfoComponent,
          props: {
            formChange: (event: MotpartForm) => this.motpartFormChange(event),
            motpartTyp: this.caseMotpartRadioValue() ?? NUXEO_VOCAB_IDS.motpartTyp.foretagMyndighet,
          },
        },
        {
          type: 'input',
          name: 'arendeExternReferens',
          label: 'Extern referens',
        },
        this.buildArendeTypField(''),
        {
          type: 'textarea',
          name: 'arendemening',
          label: 'Ärendemening',
          validators: arendemeningValidators(),
          validationText: MINIMUM_WORDS_VALIDATION_TEXT,
          defaultValue: '',
        },
        {
          type: 'textarea',
          name: 'intern',
          label: 'Intern ärendemening',
          validators: arendemeningValidators(),
          validationText: MINIMUM_WORDS_VALIDATION_TEXT,
          defaultValue: '',
        },
        {
          type: 'checkbox',
          name: 'personuppgifter',
          label: 'Personuppgifter',
          text: 'Innehåller personuppgifter GDPR',
          defaultValue: false,
        },
        { type: 'dropdown', name: 'secret', label: 'Sekretess', options: results.sekretess },
        {
          type: 'dropdown',
          name: 'arendeSecretKlass',
          label: 'Säkerhetsskyddsklassificering',
          options: results.secretClass,
        },
      ];

      this.createArendeConfig.set(baseConfig);
      const defaultDirection = results.riktning[0]?.id ?? '';
      if (defaultDirection) {
        this.updateCaseConfigAccordingToRiktning(defaultDirection);
      }
      const defaultMotpartType = this.caseMotpartRadioValue();
      if (defaultMotpartType) {
        this.handleCaseMotpartRadioChange(defaultMotpartType);
      }
    });
  }

  setCaseMode(mode: 'existing' | 'new') {
    if (this.isExistingCase() === mode) return;

    this.isExistingCase.set(mode);
    this.formResult.set(null);
    this.selectedArendetypId.set(null);
    this.arendeLagrumDefaultId.set(null);
    this.arendeSecretDefaultId.set(null);
    this.lagrumOptions.set(null);
    this.syncLagrumOptions(null);
    this.arendeLagrumOptions.set(null);
    this.syncArendeLagrumOptions(null);
    this.lagrumOptionCache.clear();
    this.arendeTypeValue.set([]);
    this.motpartFormResult.set(null);
    this.applyArendeParentSelection(null);
    this.loadAllLagrumOptions()
      .pipe(tap(options => this.setLagrumOptionsForMode(options, mode)))
      .subscribe();
  }

  private motpartFormChange(event: MotpartForm) {
    this.motpartFormResult.set(event);
  }

  private handleCaseMotpartRadioChange(selectedValue: string) {
    this.caseMotpartRadioValue.set(selectedValue);
    this.updateCaseConfigAccordingToMotpart(selectedValue);

    if (selectedValue === NUXEO_VOCAB_IDS.motpartTyp.foretagMyndighet) {
      this.caseSearchButtonText.set('Sök hos Bolagsverket');
      this.createArendeConfig.update(config =>
        config.map(el => (el.name === 'personuppgifter' ? { ...el, defaultValue: false } : el))
      );
    } else {
      this.caseSearchButtonText.set('Sök mot Navet');
      this.createArendeConfig.update(config =>
        config.map(el => (el.name === 'personuppgifter' ? { ...el, defaultValue: true } : el))
      );
    }
  }

  private updateCaseConfigAccordingToMotpart(value: string) {
    this.createArendeConfig.update(config =>
      config.map(el =>
        el.name === 'arendeMotpartComponent' ? { ...el, props: { ...el.props, motpartTyp: value } } : el
      )
    );
  }

  private updateCaseConfigAccordingToRiktning(value: string) {
    const hasMotpart = this.createArendeConfig().some(item => item.name === 'arendeMotpart');
    if (value === 'ut' || value === 'in') {
      this.hasInternRiktning.set(false);
      if (!hasMotpart) {
        this.createArendeConfig.update(config => {
          const insertAfterIndex = config.findIndex(field => field.name === 'arendeRiktning');
          const insertAt = insertAfterIndex >= 0 ? insertAfterIndex + 1 : 1;
          const base = config.filter(
            field =>
              field.name !== 'arendeMotpartRadio' &&
              field.name !== 'arendeMotpart' &&
              field.name !== 'arendeMotpartComponent' &&
              field.name !== 'arendeExternReferens'
          );
          const additions: FieldConfig[] = [
            {
              type: 'radio',
              name: 'arendeMotpartRadio',
              label: 'Typ av motpart',
              options: this.caseMotpartOptions() ?? [],
              defaultValue: this.caseMotpartRadioValue() ?? undefined,
              validators: [Validators.required],
            },
            {
              type: 'input',
              name: 'arendeMotpart',
              showContentProjection: true,
              label: 'Motpartens namn',
              validators: [Validators.required],
            },
            {
              type: 'component',
              name: 'arendeMotpartComponent',
              class: MotpartInfoComponent,
              props: {
                motpartTyp: this.caseMotpartRadioValue() ?? NUXEO_VOCAB_IDS.motpartTyp.foretagMyndighet,
                formChange: (event: MotpartForm) => this.motpartFormChange(event),
              },
            },
            {
              type: 'input',
              name: 'arendeExternReferens',
              label: 'Extern referens',
            },
          ];
          const next = [...base.slice(0, insertAt), ...additions, ...base.slice(insertAt)];
          return this.ensureArendeTypAfterExternReferens(next);
        });
      }
      return;
    }

    if (value === 'intern') {
      this.hasInternRiktning.set(true);
      if (hasMotpart) {
        this.createArendeConfig.update(config =>
          config
            .filter(
              el =>
                el.name !== 'arendeMotpartComponent' &&
                el.name !== 'arendeMotpartRadio' &&
                el.name !== 'arendeMotpart' &&
                el.name !== 'arendeExternReferens'
            )
            .map(el => (el.name === 'personuppgifter' ? { ...el, defaultValue: false } : el))
        );
      }
    }
  }

  private ensureArendeTypAfterExternReferens(config: FieldConfig[]): FieldConfig[] {
    const arendeTypIndex = config.findIndex(field => field.name === 'arendeTyp');
    if (arendeTypIndex === -1) {
      return config;
    }
    const arendeTypField = config[arendeTypIndex];
    const without = [...config.slice(0, arendeTypIndex), ...config.slice(arendeTypIndex + 1)];
    const externIndex = without.findIndex(field => field.name === 'arendeExternReferens');
    if (externIndex === -1) {
      return [...without, arendeTypField];
    }
    return [...without.slice(0, externIndex + 1), arendeTypField, ...without.slice(externIndex + 1)];
  }

  private getRiktningDefaultValue(riktning: unknown): string {
    if (riktning === 'in') {
      return NUXEO_VOCAB_IDS.arendeRiktning.inkommande;
    }
    if (riktning === 'ut') {
      return NUXEO_VOCAB_IDS.arendeRiktning.utgaende;
    }
    return NUXEO_VOCAB_IDS.arendeRiktning.intern;
  }

  private applyHandlingRiktningDefault(defaultRiktning: string | null) {
    void defaultRiktning;
    this.currentRiktning.set(NUXEO_VOCAB_IDS.arendeRiktning.inkommande);
    this.createHandlingConfig.set(this.insertContactFields(this.createHandlingConfig()));
  }

  private getMailSender(): string | null {
    const raw = this.document()?.properties?.[NUXEO_SCHEMA_FIELDS.mail.sender];
    return typeof raw === 'string' ? raw : null;
  }

  private getMailRecipients(): string[] {
    const raw = this.document()?.properties?.[NUXEO_SCHEMA_FIELDS.mail.recipients];
    if (!Array.isArray(raw)) return [];
    return raw.filter((entry): entry is string => typeof entry === 'string');
  }

  private getDefaultMailSenderDisplay(): string {
    return this.getMailSender() ?? 'Avsändare saknas';
  }

  private getDefaultMailRecipientsDisplay(): string {
    const recipients = this.getMailRecipients();
    return recipients.length ? recipients.join(', ') : 'Mottagare saknas';
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

  private getDefaultAvsandareField(): FieldConfig {
    return {
      type: 'text',
      name: 'defaultAvsandare',
      label: 'Använd avsändare från e-postmeddelandet som avsändare:',
      defaultValue: this.getDefaultMailSenderDisplay(),
    };
  }

  private getDefaultMotpartField(): FieldConfig {
    return {
      type: 'text',
      name: 'defaultMotpart',
      label: 'Använd mottagare från e-postmeddelandet som mottagare:',
      defaultValue: this.getDefaultMailRecipientsDisplay(),
    };
  }

  private getAvsandareSourceField(): FieldConfig {
    return {
      type: 'radio',
      name: 'avsandareSource',
      label: 'Avsändare',
      options: [
        { label: 'Använd avsändare från e-postmeddelandet', id: 'avsandare-default' },
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
        { label: 'Använd mottagare från e-postmeddelandet', id: 'mottagare-default' },
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

  getOptions(
    query: string,
    config: WritableSignal<FieldConfig[]>,
    fieldName: string,
    optionsSignal?: { set: (options: Option[]) => void }
  ) {
    this.nuxeoApi
      .getCaseOptions(query)
      .pipe(
        map(result => result.entries.map(entry => ({ label: entry.title, id: entry.uid, path: entry.path }))),
        tap(options => {
          if (optionsSignal) {
            optionsSignal.set(options);
            return;
          }
          const updatedConf = config().map(field => (field.name === fieldName ? { ...field, options } : field));
          config.set(updatedConf);
        })
      )
      .subscribe();
  }

  onExistingCaseQueryChanged(event: { fieldName: string; value: unknown }) {
    if (event.fieldName !== 'existingArende') {
      return;
    }
    const term = typeof event.value === 'string' ? event.value : '';
    this.nuxeoApi
      .getCaseOptions('SELECT * FROM Arende', term)
      .pipe(
        map(result => result.entries.map(entry => ({ label: entry.title, id: entry.uid, path: entry.path }))),
        tap(options => {
          this.existingArendeOptions.set(options);
        })
      )
      .subscribe();
  }

  onHandlingTypeQueryChanged(event: { fieldName: string; value: unknown }) {
    if (event.fieldName !== 'type') {
      return;
    }
    const term = typeof event.value === 'string' ? event.value : '';
    this.nuxeoApi
      .getCaseOptions('SELECT * FROM Handlingstyp', term)
      .pipe(
        map(result => result.entries.map(entry => ({ label: entry.title, id: entry.uid, path: entry.path }))),
        tap(options => {
          this.createHandlingConfig.update(config =>
            config.map(field => (field.name === 'type' ? { ...field, options } : field))
          );
        })
      )
      .subscribe();
  }

  onArendeParentQueryChanged(event: { fieldName: string; value: unknown }) {
    if (event.fieldName !== 'arendeParent') {
      return;
    }
    const term = typeof event.value === 'string' ? event.value : '';
    this.loadArendeParentOptions(term);
  }

  selectedOptionChanged(selectionChanged: { selectedValue: string; fieldName: string }) {
    if (selectionChanged.fieldName === 'existingArende') {
      this.formResult.set({ ...this.formResult(), existingArende: selectionChanged.selectedValue });
      this.loadLagrumFromCase(selectionChanged.selectedValue);
      return;
    }
    if (selectionChanged.fieldName === 'secret') {
      this.updateLagrum(this.formUtils.hasStrongSecrecy(selectionChanged.selectedValue));
      if (this.isExistingCase() === 'new') {
        this.updateArendeLagrum(this.formUtils.hasStrongSecrecy(selectionChanged.selectedValue));
        this.applyHandlingSecretDefault(selectionChanged.selectedValue);
      }
      return;
    }
    if (selectionChanged.fieldName === 'arendeLagrum') {
      this.applyLagrumDefault(selectionChanged.selectedValue);
      return;
    }
    if (selectionChanged.fieldName === 'arendeRiktning') {
      this.updateCaseConfigAccordingToRiktning(selectionChanged.selectedValue);
      this.applyHandlingRiktningDefault(this.getRiktningDefaultValue(selectionChanged.selectedValue));
      return;
    }
    if (selectionChanged.fieldName === 'arendeMotpartRadio') {
      this.handleCaseMotpartRadioChange(selectionChanged.selectedValue);
      return;
    }
    if (selectionChanged.fieldName === 'arendeParent') {
      const parentId = selectionChanged.selectedValue || null;
      this.formResult.set({ ...this.formResult(), arendeParent: parentId });
      this.applyArendeParentSelection(parentId);
      return;
    }
    if (selectionChanged.fieldName === 'riktning') {
      this.currentRiktning.set(selectionChanged.selectedValue);
      const next =
        selectionChanged.selectedValue === NUXEO_VOCAB_IDS.arendeRiktning.intern
          ? this.removeContactFields(this.createHandlingConfig())
          : this.insertContactFields(this.createHandlingConfig());
      this.createHandlingConfig.set(next);
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

  private handleArendeTypeSelected(arendeTypeId: string) {
    if (!arendeTypeId || this.selectedArendetypId() === arendeTypeId) {
      return;
    }
    this.formResult.set({ ...this.formResult(), arendetyp: arendeTypeId });
    this.selectedArendetypId.set(arendeTypeId);
    this.nuxeoApi
      .getDocumentById(arendeTypeId, true)
      .pipe(
        tap(doc => {
          const defaultArendemening = doc?.properties?.[NUXEO_SCHEMA_FIELDS.klass.arendemening]?.[0];
          const defaultRriktning = doc?.properties?.[NUXEO_SCHEMA_FIELDS.klass.riktning];
          const defaultRiktningId =
            typeof defaultRriktning === 'string' ? defaultRriktning : (defaultRriktning?.id ?? '');
          this.applyHandlingRiktningDefault(this.getRiktningDefaultValue(defaultRiktningId));
          this.updateCaseConfigAccordingToRiktning(defaultRiktningId);
          const defaultSecret = doc?.properties?.[NUXEO_SCHEMA_FIELDS.klass.sekretess];
          const defaultSecretId = typeof defaultSecret === 'string' ? defaultSecret : (defaultSecret?.id ?? '');
          this.arendeSecretDefaultId.set(defaultSecretId || null);
          this.applyHandlingSecretDefault(defaultSecretId || null);
          const defaultSecretKlass = doc?.properties?.[NUXEO_SCHEMA_FIELDS.klass.sakerhetsskyddsklassificering];
          const defaultSecretKlassId =
            typeof defaultSecretKlass === 'string' ? defaultSecretKlass : (defaultSecretKlass?.id ?? '');
          const lagrumItems = doc?.properties?.[NUXEO_SCHEMA_FIELDS.klass.lagrum];
          const lagrumArray = Array.isArray(lagrumItems) ? lagrumItems : [];
          const defaultLagrumId = this.readRecordId(lagrumArray[0], 'uid');
          this.arendeLagrumDefaultId.set(defaultLagrumId);
          this.applyLagrumDefault(defaultLagrumId);
          const updatedConf = this.createArendeConfig().map(el => {
            if (el.name === 'arendemening' || el.name === 'intern') {
              return { ...el, defaultValue: defaultArendemening ?? '' };
            } else if (el.name === 'arendeRiktning') {
              const riktningOpts = this.createArendeConfig().find(el => el.name === 'arendeRiktning')?.options;
              const defaultRiktningOpt = riktningOpts?.find(opt => opt.id === defaultRiktningId);
              return { ...el, defaultValue: defaultRiktningOpt?.id ?? '' };
            } else if (el.name === 'secret') {
              return { ...el, defaultValue: defaultSecretId || null };
            } else if (el.name === 'arendeSecretKlass') {
              return { ...el, defaultValue: defaultSecretKlassId || null };
            } else if (el.name === 'arendeLagrum') {
              return { ...el, defaultValue: defaultLagrumId || null };
            } else {
              return el;
            }
          });
          this.createArendeConfig.set(updatedConf);

          const riktningOpts = this.createArendeConfig().find(el => el.name === 'arendeRiktning')?.options;
          const defaultRiktningOpt = riktningOpts?.find(opt => opt.id === defaultRiktningId);
          this.formResult.set({
            ...this.formResult(),
            arendeRiktning: defaultRiktningOpt?.id ?? this.formResult()?.arendeRiktning ?? null,
            arendemening: defaultArendemening ?? this.formResult()?.arendemening ?? null,
            intern: defaultArendemening ?? this.formResult()?.intern ?? null,
            secret: defaultSecretId || null,
            arendeSecretKlass: defaultSecretKlassId || null,
          });

          this.updateArendeLagrum(this.formUtils.hasStrongSecrecy(defaultSecretId));
          this.loadLagrumFromArendetyp(arendeTypeId);
        })
      )
      .subscribe();
  }

  private buildArendeTypField(parentRef: string): FieldConfig {
    return {
      type: 'component',
      name: 'arendeTyp',
      label: 'Ärendetyp',
      class: ArendetypAutocompleteComponent,
      props: {
        docType: 'Arende',
        parentRef,
        tableFields: this.arendeTypeValue,
        required: true,
        isSubmited: false,
      },
    };
  }

  private applyArendeParentSelection(parentId: string | null) {
    const parentRef = parentId ?? '';
    this.caseParentRefOverride.set(parentRef);
    this.arendeTypeValue.set([]);
    this.selectedArendetypId.set(null);
    this.formResult.set({ ...this.formResult(), arendetyp: null });
    this.createArendeConfig.update(config => {
      const hasArendeTyp = config.some(field => field.name === 'arendeTyp');
      const updated = hasArendeTyp
        ? config.map(field =>
            field.name === 'arendeTyp' ? { ...field, props: { ...field.props, parentRef, isSubmited: false } } : field
          )
        : [...config, this.buildArendeTypField(parentRef)];
      return this.ensureArendeTypAfterExternReferens(updated);
    });
  }

  private collectMissingFields(): string[] {
    const missing = new Set<string>();
    const result = this.formResult();

    if (this.isExistingCase() === 'new') {
      const selectedParent = this.toTrimmedOrNull(this.formResult()?.arendeParent);
      if (!selectedParent) {
        missing.add('Skapa i');
      }

      const arendeTypeEntry = this.arendeTypeValue()?.[0];
      const arendeTypeId = this.selectedArendetypId() ?? arendeTypeEntry?.value ?? arendeTypeEntry?.id;
      if (!arendeTypeId) {
        missing.add('Ärendetyp');
      }

      this.getMissingFromConfig(this.createArendeConfig(), result).forEach(item => missing.add(item));
      this.getMissingAssignFields().forEach(item => missing.add(item));
    }

    this.getMissingFromConfig(this.createHandlingConfig(), result).forEach(item => missing.add(item));

    return Array.from(missing);
  }

  private getMissingAssignFields(): string[] {
    const assignForm = this.assignComponent?.assignCaseFormGroup;
    if (!assignForm || assignForm.valid) {
      return [];
    }
    const labels: Record<string, string> = {
      organization: 'Ansvarig organisatorisk enhet',
      coworker: 'Ansvarig handläggare',
    };
    return Object.keys(assignForm.controls)
      .filter(name => assignForm.get(name)?.invalid)
      .map(name => labels[name] ?? name);
  }

  private getMissingFromConfig(config: FieldConfig[], result: FormResult | null): string[] {
    const missing: string[] = [];
    const record = result ?? {};
    config.forEach(field => {
      if (field.isHidden) return;
      if (!field.validators?.some(validator => validator === Validators.required)) return;
      if (field.name === 'arendeTyp') return;
      const value = record[field.name] !== undefined ? record[field.name] : field.defaultValue;
      if (this.isEmptyValue(value)) {
        missing.push(field.label || field.name);
      }
    });
    return missing;
  }

  private isEmptyValue(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    if (Array.isArray(value)) return value.length === 0;
    if (value instanceof Date) return false;
    if (typeof value === 'string') return value.trim().length === 0;
    return false;
  }

  private loadArendeParentOptions(term: string) {
    this.nuxeoApi
      .getCaseOptions('SELECT * FROM Ar WHERE ecm:isTrashed = 0 ORDER BY ar:ar DESC', term)
      .pipe(
        map(result =>
          result.entries.map(entry => {
            const props = entry.properties as Record<string, unknown> | undefined;
            const yearValue = props?.[NUXEO_SCHEMA_FIELDS.ar.ar];
            const label =
              yearValue !== null && yearValue !== undefined && String(yearValue).length
                ? String(yearValue)
                : entry.title || entry.name || entry.path || entry.uid;
            return { label, id: entry.uid, path: entry.path };
          })
        ),
        tap(options => this.arendeParentOptions.set(options))
      )
      .subscribe();
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private readRecordId(value: unknown, key: 'id' | 'uid'): string | null {
    if (typeof value === 'string') return value;
    if (!this.isRecord(value)) return null;
    const raw = value[key];
    return typeof raw === 'string' ? raw : null;
  }

  private getLagrumId(value: unknown): string | null {
    const first = Array.isArray(value) ? value[0] : value;
    if (this.isRecord(first)) {
      const id = first['id'];
      return typeof id === 'string' ? this.toTrimmedOrNull(id) : null;
    }
    if (typeof first === 'string') {
      return this.toTrimmedOrNull(first);
    }
    return null;
  }

  private toTrimmedOrNull(value: string | null | undefined): string | null {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    return trimmed.length ? trimmed : null;
  }

  private syncLagrumOptions(options: Option[] | null): void {
    this.createHandlingConfig.update(config => this.lagrumField.syncOptions(config, 'lagrum', options));
  }

  private updateLagrum(isSecret: boolean): void {
    const config = this.createHandlingConfig();
    const hasLagrum = config.some(item => item.name === 'lagrum');

    if (isSecret && !hasLagrum) {
      const lagrumDefault =
        this.getLagrumId(this.formResult()?.lagrum) ??
        this.getLagrumId(this.formResult()?.arendeLagrum) ??
        this.arendeLagrumDefaultId() ??
        undefined;
      const lagrumField = this.lagrumField.buildField({
        name: 'lagrum',
        options: this.lagrumOptions() ?? undefined,
        defaultValue: lagrumDefault,
      });
      const next = this.lagrumField.insertAfter(config, 'secret', lagrumField);
      this.createHandlingConfig.set(next);
    }

    if (!isSecret && hasLagrum) {
      this.createHandlingConfig.update(config => this.lagrumField.removeField(config, 'lagrum'));
    }
  }

  private applyHandlingSecretDefault(secretId: string | null) {
    if (!secretId) return;
    this.formResult.set({ ...this.formResult(), secret: secretId });
    this.createHandlingConfig.update(config =>
      config.map(field => (field.name === 'secret' ? { ...field, defaultValue: secretId } : field))
    );
    this.updateLagrum(this.formUtils.hasStrongSecrecy(secretId));
  }

  private syncArendeLagrumOptions(options: Option[] | null): void {
    this.createArendeConfig.update(config => this.lagrumField.syncOptions(config, 'arendeLagrum', options));
  }

  private updateArendeLagrum(isSecret: boolean): void {
    const config = this.createArendeConfig();
    const hasLagrum = config.some(item => item.name === 'arendeLagrum');

    if (isSecret && !hasLagrum) {
      const lagrumDefault =
        this.toTrimmedOrNull(this.formResult()?.arendeLagrum) ?? this.arendeLagrumDefaultId() ?? undefined;
      const lagrumField = this.lagrumField.buildField({
        name: 'arendeLagrum',
        options: this.arendeLagrumOptions() ?? undefined,
        defaultValue: lagrumDefault,
      });
      const next = this.lagrumField.insertAfter(config, 'secret', lagrumField);
      this.createArendeConfig.set(next);
    }

    if (!isSecret && hasLagrum) {
      this.createArendeConfig.update(config => this.lagrumField.removeField(config, 'arendeLagrum'));
    }
  }

  private applyLagrumDefault(defaultId: string | null) {
    const resolvedDefault = defaultId ?? this.toTrimmedOrNull(this.formResult()?.arendeLagrum) ?? null;
    if (!resolvedDefault) return;

    if (this.isExistingCase() === 'new' && !this.toTrimmedOrNull(this.formResult()?.arendeLagrum)) {
      this.formResult.set({ ...this.formResult(), arendeLagrum: resolvedDefault });
      this.createArendeConfig.update(config =>
        config.map(field => (field.name === 'arendeLagrum' ? { ...field, defaultValue: resolvedDefault } : field))
      );
    }

    if (!this.toTrimmedOrNull(this.formResult()?.lagrum)) {
      this.formResult.set({ ...this.formResult(), lagrum: resolvedDefault });
      this.createHandlingConfig.update(config =>
        config.map(field => (field.name === 'lagrum' ? { ...field, defaultValue: resolvedDefault } : field))
      );
    }

    this.ensureLagrumOption(resolvedDefault);
  }

  private setLagrumOptionsForMode(options: Option[] | null, mode: 'existing' | 'new') {
    if (mode === 'existing') {
      this.lagrumOptions.set(options);
      this.syncLagrumOptions(options);
      return;
    }

    this.arendeLagrumOptions.set(options);
    this.syncArendeLagrumOptions(options);
    this.lagrumOptions.set(options);
    this.syncLagrumOptions(options);
  }

  private loadLagrumFromArendetyp(_klassId: string | null | undefined) {
    if (this.isExistingCase() !== 'new') return;

    // Dropdown always offers every Lagrum document, not just the selected Klass's own refs.
    // The pre-selected default (arendeLagrumDefaultId) is already derived separately from the
    // Klass document's own klass:lagrum field in handleArendeTypeSelected.
    // Must go through getLagrumOptions (docType: 'Klass') - the 'Arende' query variant requires
    // selectedKlass as a bind param and 500s without it.
    this.nuxeoApi
      .getLagrumOptions(this.caseParentRef())
      .pipe(
        catchError(() => of([] as Option[])),
        tap(options => {
          this.setLagrumOptionsForMode(options, 'new');
          const defaultId = this.arendeLagrumDefaultId();
          if (defaultId) {
            this.applyLagrumDefault(defaultId);
          }
        })
      )
      .subscribe();
  }

  private loadAllLagrumOptions() {
    return this.nuxeoApi.getLagrumOptions(this.document()?.uid);
  }

  private ensureLagrumOption(defaultId: string) {
    if (this.lagrumOptionCache.has(defaultId)) {
      return;
    }

    const arendeOptions = this.arendeLagrumOptions();
    const handlingOptions = this.lagrumOptions();
    const hasInArende = arendeOptions?.some(option => option.id === defaultId) ?? false;
    const hasInHandling = handlingOptions?.some(option => option.id === defaultId) ?? false;

    if (hasInArende && hasInHandling) {
      this.lagrumOptionCache.add(defaultId);
      return;
    }

    this.nuxeoApi
      .getDocumentById(defaultId, true)
      .pipe(
        map(doc => ({ label: doc.title, id: doc.uid })),
        tap(option => {
          if (!hasInArende) {
            const next = [...(arendeOptions ?? []), option];
            this.arendeLagrumOptions.set(next);
            this.syncArendeLagrumOptions(next);
          }
          if (!hasInHandling) {
            const next = [...(handlingOptions ?? []), option];
            this.lagrumOptions.set(next);
            this.syncLagrumOptions(next);
          }
          this.lagrumOptionCache.add(defaultId);
        }),
        catchError(() => {
          this.lagrumOptionCache.add(defaultId);
          return of(null);
        })
      )
      .subscribe();
  }

  private getAttachmentLabel(id?: string | null): string | null {
    if (!id) return null;
    const option = this.attachments()?.find(attachment => attachment.id === id);
    return option?.label ?? null;
  }

  private resolveCaseParentRef(startId: string): void {
    this.nuxeoApi
      .getAncestorsById(startId)
      .pipe(
        map(docs => docs.find(doc => doc.type === 'Ar') ?? docs.find(doc => doc.type === 'Diarium') ?? null),
        tap(match => {
          if (match?.uid) {
            this.caseParentRefOverride.set(match.uid);
          }
        }),
        catchError(() => {
          this.caseParentRefOverride.set('');
          return of(null);
        })
      )
      .subscribe();
  }

  private loadLagrumFromCase(caseId?: string | null): void {
    if (this.isExistingCase() !== 'existing') return;
    if (!caseId) {
      this.setLagrumOptionsForMode(null, 'existing');
      return;
    }

    this.nuxeoApi
      .getDocumentById<ArendeProperties>(caseId, true)
      .pipe(
        switchMap(doc => {
          const sekretessRaw = doc?.properties?.[NUXEO_SCHEMA_FIELDS.arende.sekretess];
          const sekretessId = this.readRecordId(sekretessRaw, 'id');
          this.applyHandlingSecretDefault(sekretessId);

          const riktningRaw = doc?.properties?.[NUXEO_SCHEMA_FIELDS.arende.riktning];
          const riktningId = this.readRecordId(riktningRaw, 'id');
          this.applyHandlingRiktningDefault(this.getRiktningDefaultValue(riktningId));

          const caseTypeRaw = doc?.properties?.[NUXEO_SCHEMA_FIELDS.arende.arendetyp];
          const caseTypeId = this.readRecordId(caseTypeRaw, 'uid');

          return forkJoin({
            // Dropdown always offers every Lagrum document, not just this case's Klass-configured refs.
            // Must go through getLagrumOptions (docType: 'Klass') - the 'Handling' query variant
            // requires selectedKlass as a bind param and 500s without it.
            options: this.nuxeoApi.getLagrumOptions(this.caseParentRef()).pipe(catchError(() => of([] as Option[]))),
            // Pre-selected default is still derived from the case's own Klass refs.
            defaultId: caseTypeId
              ? this.nuxeoApi.getDocumentById(caseTypeId, true).pipe(
                  map(klassDoc => {
                    const items = klassDoc?.properties?.[NUXEO_SCHEMA_FIELDS.klass.lagrum];
                    const list = Array.isArray(items) ? items : [];
                    return this.readRecordId(list[0], 'uid');
                  }),
                  catchError(() => of(null))
                )
              : of(null),
          });
        }),
        tap(({ options, defaultId }) => {
          this.setLagrumOptionsForMode(options, 'existing');
          if (defaultId) {
            this.arendeLagrumDefaultId.set(defaultId);
            this.applyLagrumDefault(defaultId);
          }
        }),
        catchError(() => {
          this.setLagrumOptionsForMode(null, 'existing');
          return of({ options: [] as Option[], defaultId: null });
        })
      )
      .subscribe();
  }

  changeForm(event: Partial<FormResult>) {
    if ('mainFile' in event && this.formResult()?.mainFile !== event.mainFile) {
      const filteredAttachments = this.attachments()?.filter(option => option.id !== event.mainFile);
      this.createFileConfig.update(data => {
        const attachmentsConfig = data.find(field => field.name === 'attachment')!;
        const newAttachmentsConf = { ...attachmentsConfig, options: filteredAttachments };
        return data.map(field => (field.name === newAttachmentsConf.name ? newAttachmentsConf : field));
      });
    }
    let existingArende = this.formResult()?.existingArende ?? null;
    if ('existingArende' in event && typeof event.existingArende === 'string') {
      existingArende = event.existingArende;
    }
    this.formResult.set({ ...this.formResult(), ...event, existingArende });
  }

  createHandling() {
    this.isHandlingSubmitted.set(true);
    const missingFields = this.collectMissingFields();
    console.warn('[createHandling] Missing required fields:', missingFields.length ? missingFields.join(', ') : 'none');

    const existingArendeId = this.formResult()?.existingArende;
    const assignForm = this.assignComponent?.assignCaseFormGroup;
    const organizationId = assignForm?.get('organization')?.value ?? null;
    const coworkerId = assignForm?.get('coworker')?.value ?? null;
    const medhandlaggare =
      this.assignComponent?.medhandlaggareArray.controls
        .map(control => control.value)
        .filter((value): value is string => !!value) ?? [];

    if (this.isExistingCase() === 'new' && assignForm && !assignForm.valid) {
      assignForm.markAllAsTouched();
      console.warn('[createHandling] Missing required assignment fields (organization/handler/medhandläggare).');
      return;
    }
    if (this.isExistingCase() === 'new') {
      this.createArendeConfig.update(config =>
        config.map(el => (el.name === 'arendeTyp' ? { ...el, props: { ...el.props, isSubmited: true } } : el))
      );
      const selectedParent = this.toTrimmedOrNull(this.formResult()?.arendeParent);
      if (!selectedParent) {
        console.warn('[createHandling] Missing required "Skapa i" (parent folder) for new case.');
        return;
      }
      const arendeTypeEntry = this.arendeTypeValue()?.[0];
      const arendeTypeId = this.selectedArendetypId() ?? arendeTypeEntry?.value ?? arendeTypeEntry?.id;
      if (!arendeTypeId) {
        console.warn('[createHandling] Missing required Ärendetyp for new case.');
        return;
      }
    }
    if (missingFields.length) {
      this.store.notification.set({
        show: true,
        variation: 'danger',
        text: CREATE_HANDLING_FROM_MAIL_REQUIRED_FIELDS_MESSAGE,
      });
      return;
    }
    const secretValue = this.toTrimmedOrNull(this.formResult()?.secret) ?? this.arendeSecretDefaultId();
    const caseParentId = this.toTrimmedOrNull(this.formResult()?.arendeParent) ?? (this.caseParentRef() || null);
    const motpartResult: Motpart = {
      motpart: this.toTrimmedOrNull(this.formResult()?.arendeMotpart) ?? null,
      typ: this.formResult()?.arendeMotpartRadio ?? null,
      postnummer: this.motpartFormResult()?.zip ?? null,
      epost: this.motpartFormResult()?.epost ?? null,
      adress: this.motpartFormResult()?.address ?? null,
      telefon: this.motpartFormResult()?.phone ?? null,
      organisationsnummer: this.motpartFormResult()?.organisationsnummer ?? null,
    };
    const externReferens = this.toTrimmedOrNull(this.formResult()?.arendeExternReferens);
    const rawType = this.formResult()?.type;
    const handlingTypeId = Array.isArray(rawType)
      ? (rawType?.[0]?.id ?? null)
      : rawType && typeof rawType === 'object' && 'id' in rawType
        ? ((rawType as { id?: string }).id ?? null)
        : typeof rawType === 'string'
          ? rawType
          : null;
    const handlingName = this.toTrimmedOrNull(this.formResult()?.name) ?? null;
    const selectedDate = this.formResult()?.dateFrom?.[0];
    const handlingDirection = NUXEO_VOCAB_IDS.arendeRiktning.inkommande;
    const incomingDate = selectedDate;
    const avsandare = Array.isArray(this.formResult()?.avsandare) ? (this.formResult()?.avsandare ?? []) : [];
    const mottagare = Array.isArray(this.formResult()?.mottagare) ? (this.formResult()?.mottagare ?? []) : [];
    const useCustomAvsandare = this.avsandareSource() === 'custom';
    const useCustomMottagare = this.mottagareSource() === 'custom';
    const defaultAvsandare = this.getMailSender() ? [{ namn: this.getMailSender() }] : [];
    const defaultMottagare = this.getMailRecipients().map(recipient => ({ namn: recipient }));
    const normalizeContacts = (
      items: {
        namn?: string | null;
        email?: string | null;
        telefon?: string | null;
        phone?: string | null;
        adress?: string | null;
      }[]
    ) =>
      items
        .map(item => {
          const rawName = this.toTrimmedOrNull(item?.namn);
          const rawEmail = this.toTrimmedOrNull(item?.email);
          const emailMatch = rawName?.match(/<([^>]+)>/);
          const parsedEmail = rawEmail ?? (emailMatch ? emailMatch[1]?.trim() : null);
          const parsedName = rawName ? rawName.replace(/<[^>]+>/, '').trim() : null;
          return {
            namn: parsedName || undefined,
            epost: parsedEmail || undefined,
            telefon: this.toTrimmedOrNull(item?.telefon ?? item?.phone) ?? undefined,
            adress: this.toTrimmedOrNull(item?.adress) ?? undefined,
          };
        })
        .filter(entry => Object.values(entry).some(value => !!value));
    const avsandarePayload = normalizeContacts(useCustomAvsandare && avsandare.length ? avsandare : defaultAvsandare);
    const mottagarePayload = normalizeContacts(useCustomMottagare && mottagare.length ? mottagare : defaultMottagare);
    const mainFileTitle = this.getAttachmentLabel(this.formResult()?.mainFile);
    const handlingPayload: Record<string, unknown> = {};
    if (handlingName) {
      handlingPayload[NUXEO_SCHEMA_FIELDS.handling.handlingsnamn] = handlingName;
      handlingPayload[NUXEO_SCHEMA_FIELDS.dc.title] = handlingName;
    }
    handlingPayload[NUXEO_SCHEMA_FIELDS.handling.handlingsriktning] = handlingDirection;
    if (handlingTypeId) handlingPayload[NUXEO_SCHEMA_FIELDS.handling.handlingstyp] = handlingTypeId;
    if (incomingDate) handlingPayload[NUXEO_SCHEMA_FIELDS.handling.inkommenDatum] = incomingDate;
    if (secretValue) handlingPayload[NUXEO_SCHEMA_FIELDS.handling.sekretess] = secretValue;
    const lagrumValue = this.getLagrumId(this.formResult()?.lagrum);
    if (lagrumValue) handlingPayload[NUXEO_SCHEMA_FIELDS.handling.lagrumsbeskrivning] = lagrumValue;
    if (typeof this.formResult()?.personuppgifter === 'boolean') {
      handlingPayload[NUXEO_SCHEMA_FIELDS.handling.innehallerPersonuppgifterGdpr] = this.formResult()?.personuppgifter
        ? 'true'
        : 'false';
    }
    if (avsandarePayload.length) handlingPayload[NUXEO_SCHEMA_FIELDS.handling.avsandare] = avsandarePayload;
    if (mottagarePayload.length) handlingPayload[NUXEO_SCHEMA_FIELDS.handling.mottagare] = mottagarePayload;
    const newCasePayload: Record<string, unknown> = {};
    if (caseParentId) newCasePayload['parentId'] = caseParentId;
    newCasePayload[NUXEO_SCHEMA_FIELDS.arende.motpart] = motpartResult;
    const arendeRiktning = this.toTrimmedOrNull(this.formResult()?.arendeRiktning);
    if (arendeRiktning) newCasePayload[NUXEO_SCHEMA_FIELDS.arende.riktning] = arendeRiktning;
    const arendetypId = this.selectedArendetypId() ?? this.toTrimmedOrNull(this.formResult()?.arendetyp);
    if (arendetypId) newCasePayload[NUXEO_SCHEMA_FIELDS.arende.arendetyp] = arendetypId;
    const arendemening = this.toTrimmedOrNull(this.formResult()?.arendemening);
    if (arendemening) newCasePayload[NUXEO_SCHEMA_FIELDS.arende.arendemening] = arendemening;
    const internMening = this.toTrimmedOrNull(this.formResult()?.intern);
    if (internMening) newCasePayload[NUXEO_SCHEMA_FIELDS.arende.internArendemening] = internMening;
    if (typeof this.formResult()?.personuppgifter === 'boolean') {
      newCasePayload[NUXEO_SCHEMA_FIELDS.arende.innehallerPersonuppgifterGdpr] = this.formResult()?.personuppgifter;
    }
    if (secretValue) newCasePayload[NUXEO_SCHEMA_FIELDS.arende.sekretess] = secretValue;
    const secretKlass = this.toTrimmedOrNull(this.formResult()?.arendeSecretKlass);
    if (secretKlass) newCasePayload[NUXEO_SCHEMA_FIELDS.arende.sakerhetsskyddsklassificering] = secretKlass;
    if (organizationId) newCasePayload[NUXEO_SCHEMA_FIELDS.arende.ansvarigOrganisatoriskEnhet] = organizationId;
    if (coworkerId) newCasePayload[NUXEO_SCHEMA_FIELDS.arende.ansvarigHandlaggare] = coworkerId;
    if (medhandlaggare.length) newCasePayload[NUXEO_SCHEMA_FIELDS.arende.medhandlaggare] = medhandlaggare;
    const arendeLagrumValue = this.getLagrumId(this.formResult()?.arendeLagrum);
    const arendeLagrumValues = arendeLagrumValue ? [arendeLagrumValue] : [];
    if (arendeLagrumValues.length) {
      newCasePayload[NUXEO_SCHEMA_FIELDS.arende.lagrumsbeskrivning] = arendeLagrumValues;
    }
    if (externReferens) {
      newCasePayload[NUXEO_SCHEMA_FIELDS.arende.externReferens] = [{ referens: externReferens }];
    }
    const filerItems: {
      type: string;
      title: string | null;
      attachment: string | null | undefined;
      variants: never[];
    }[] = [
      {
        type: NUXEO_VOCAB_IDS.filTyp.huvudfil,
        title: mainFileTitle,
        attachment: this.formResult()?.mainFile,
        variants: [],
      },
    ];
    const payload = {
      context: {},
      input: this.parentId(),
      params: {
        arende: typeof existingArendeId === 'string' && existingArendeId.trim() ? existingArendeId : newCasePayload,
        filer: filerItems,
        handling: handlingPayload,
      },
    };
    if (this.formResult()?.attachment) {
      this.formResult()?.attachment?.forEach(el => {
        payload.params.filer.push({
          type: NUXEO_VOCAB_IDS.filTyp.bilaga,
          title: el.label,
          attachment: el.id,
          variants: [],
        });
      });
    }

    this.nuxeoApi
      .createHandling(payload)
      .pipe(
        tap(result => {
          this.router.navigate(['/doc/', result.uid]);
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: CREATE_HANDLING_FROM_MAIL_SUCCESS_MESSAGE,
          });
          this.dialogClosed.emit(null);
        }),
        catchError(err => {
          const message =
            err?.error?.violations?.[0]?.message ??
            err?.error?.message ??
            err?.message ??
            'Det gick inte att skapa handlingen.';
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: message,
          });

          return EMPTY;
        })
      )
      .subscribe();
  }
}
