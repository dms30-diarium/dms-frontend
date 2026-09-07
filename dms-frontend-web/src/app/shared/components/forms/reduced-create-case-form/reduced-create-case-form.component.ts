import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  OnInit,
  output,
  signal,
  ViewChild,
} from '@angular/core';

import { ReactiveFormsModule, Validators } from '@angular/forms';
import { Option } from '../../../commonTypes';
import { HttpClient } from '@angular/common/http';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { catchError, EMPTY, forkJoin, map, of, switchMap, tap } from 'rxjs';
import {
  ArendePayloadProperties,
  ArendetypProperties,
  Motpart,
  NuxeoDocument,
  NuxeoProperties,
} from '@app/shared/api/nuxeo-api.types';
import { GeneralFormComponent } from '../../general-form/general-form.component';
import { FieldConfig } from '../../general-form/general-form.types';
import { GeneralStore } from '@app/core/services/general-store.service';
import { FormUtilsService } from '@app/shared/services/form-utils.service';
import { LagrumFieldService } from '@app/shared/services/lagrum-field.service';
import { DigiLoaderSpinner, DigiButton, DigiIconHome } from '@designsystem-se/af-angular';
import { AssignUserModalComponent } from '../../assign-user-modal/assign-user-modal.component';
import { ArendetypAutocompleteComponent } from '../../edit-form-components/arendetyp-autocomplete/arendetyp-autocomplete.component';
import { ArendeTypOption } from '@app/pages/case-page/case-types';
import { MotpartForm, MotpartInfoComponent } from '../forms-components/motpart-info/motpart-info.component';
import { TooltipDirective } from '@app/shared/directives/tooltip.directive';
import { arendemeningValidators, MINIMUM_WORDS_VALIDATION_TEXT } from '@app/shared/utils/validators-utils';
import {
  REDUCED_CREATE_CASE_ERROR_MESSAGE,
  REDUCED_CREATE_CASE_SUCCESS_MESSAGE,
} from '@app/shared/constants/notification-messages';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { NUXEO_VOCAB_IDS } from '@app/shared/constants/nuxeo-vocabulary-ids';

export interface ArendeFormEvent {
  riktning?: string;
  arendemening?: string;
  intern?: string;
  arendemeningExtra?: string;
  internExtra?: string;
  useArendemeningText?: boolean;
  secret?: string;
  lagrum?: { id: string }[] | null;
  secretKlass?: string;
  externReferens?: string;
  motpart?: string;
  motpartRadio?: string;
  personuppgifter?: boolean;
}

@Component({
  selector: 'nuxeo-reduced-create-case-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    GeneralFormComponent,
    DigiLoaderSpinner,
    AssignUserModalComponent,
    DigiButton,
    DigiIconHome,
    TooltipDirective,
  ],
  templateUrl: './reduced-create-case-form.component.html',
})
export class CreateReducedCaseFormComponent implements OnInit {
  @ViewChild(AssignUserModalComponent) assignComponent!: AssignUserModalComponent;
  private readonly http = inject(HttpClient);
  private readonly nuxeoApi = inject(NuxeoApiService);
  private readonly store = inject(GeneralStore);
  private readonly formUtils = inject(FormUtilsService);
  private readonly lagrumField = inject(LagrumFieldService);
  private readonly arendemeningTextValidators = arendemeningValidators();

  caseDirections = signal<Option[]>([]);
  typeOptions = signal<Option[]>([]);
  defaultPayload: NuxeoDocument | null = null;
  isLoading = signal(false);
  arendeTypeValue = signal<ArendeTypOption[]>([]);
  showAlert = signal(false);
  searchButtonTest = signal('Sök hos Bolagsverket');
  lagrumOptions = signal<Option[] | null>(null);
  motpartOptions = signal<Option[] | null>(null);

  parentUid = input.required<string>();
  path = input.required<string>();
  dialogClosed = output<NuxeoDocument | null>();
  motpartFormResult = signal<MotpartForm | null>(null);

  arendeConfig = signal<FieldConfig[]>([]);
  hasInternRiktning = signal<boolean>(false);
  firstColumnSize = signal<number>(4);

  constructor() {
    effect(() => {
      const options = this.lagrumOptions();
      if (!options?.length) return;
      this.arendeConfig.update(config =>
        config.map(field => (field.name === 'lagrum' ? { ...field, options } : field))
      );
    });

    effect(() => {
      const arendetyp = this.arendeTypeValue()?.[0]?.value;
      if (arendetyp) {
        this.selectedOptionChanged({ selectedValue: this.arendeTypeValue()?.[0]?.value, fieldName: 'arendeTyp' });
      } else {
        this.arendeConfig.update(config =>
          config.map(el => {
            if (el.name === 'arendemening' || el.name === 'intern') {
              return { ...el, defaultValue: undefined, options: [], props: { ...el.props, key: undefined } };
            }
            if (el.name === 'arendemeningExtra' || el.name === 'internExtra') {
              return { ...el, defaultValue: '' };
            }
            return el;
          })
        );
      }
    });
  }

  ngOnInit(): void {
    this.getEmptyWithDefaults();

    forkJoin({
      riktning: this.nuxeoApi
        .getDirectorySuggestions('ArendeRiktning')
        .pipe(map(res => res.map(el => ({ label: el.displayLabel, id: el.id })))),
      sekretess: this.nuxeoApi
        .getDirectorySuggestions('Sekretess')
        .pipe(map(res => res.map(el => ({ label: el.displayLabel, id: el.id })))),
      motpart: this.nuxeoApi.getDirectorySuggestions('MotpartTyp').pipe(
        map(res =>
          res?.map(el => ({
            label: el.displayLabel === 'Private Person' ? 'Privatperson' : el.displayLabel,
            id: el.id,
          }))
        )
      ),
      secretClass: this.nuxeoApi
        .getDirectorySuggestions('Sakerhetsskyddsklassificering')
        .pipe(map(res => res.map(el => ({ label: el.displayLabel, id: el.id })))),
    }).subscribe(results => {
      this.motpartOptions.set(results.motpart);
      this.arendeConfig.set([
        {
          type: 'radio',
          name: 'riktning',
          label: 'Riktning',
          options: results.riktning,
          defaultValue: results.riktning[0]?.id,
          validators: [Validators.required],
        },
        {
          type: 'radio',
          name: 'motpartRadio',
          label: 'Typ av motpart',
          options: results.motpart,
          defaultValue: results.motpart[1]?.id,
          validators: [Validators.required],
        },
        {
          type: 'input',
          name: 'motpart',
          showContentProjection: true,
          label: 'Motpartens namn',
          validators: [Validators.required],
        },
        {
          type: 'component',
          name: 'motpartComponent',
          class: MotpartInfoComponent,
          props: {
            formChange: (event: MotpartForm) => this.motpartFormChange(event),
          },
        },
        {
          type: 'input',
          name: 'externReferens',
          label: 'Extern referens',
        },
        {
          type: 'component',
          name: 'arendeTyp',
          label: 'Ärendetyp',
          class: ArendetypAutocompleteComponent,
          props: {
            docType: 'Arende',
            parentRef: this.parentUid(),
            tableFields: this.arendeTypeValue,
            required: true,
            isSubmited: false,
          },
        },

        { type: 'dropdown', name: 'arendemening', label: 'Ärendemening', validators: [Validators.required] },
        { type: 'checkbox', name: 'useArendemeningText', label: '', text: 'Använd fritext', defaultValue: false },
        {
          type: 'textarea',
          name: 'arendemeningExtra',
          label: '',
          isHidden: true,
          validationText: MINIMUM_WORDS_VALIDATION_TEXT,
          defaultValue: '',
        },
        { type: 'dropdown', name: 'intern', label: 'Intern ärendemening' },
        {
          type: 'textarea',
          name: 'internExtra',
          label: 'Intern ärendemening',
          isHidden: true,
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
        {
          type: 'dropdown',
          name: 'secret',
          label: 'Sekretess',
          options: results.sekretess,
          validators: [Validators.required],
        },
        { type: 'dropdown', name: 'secretKlass', label: 'Säkerhetsskyddsklassificering', options: results.secretClass },
      ]);
    });
  }

  selectedRadioChanged(selectionChanged: { selectedValue: string; fieldName: string }) {
    if (selectionChanged.fieldName === 'motpartRadio') {
      this.updateConfigAccordingToMotpart(selectionChanged.selectedValue);

      if (selectionChanged.selectedValue === NUXEO_VOCAB_IDS.motpartTyp.foretagMyndighet) {
        this.searchButtonTest.set('Sök hos Bolagsverket');
        this.arendeConfig.update(config =>
          config.map(el => (el.name === 'personuppgifter' ? { ...el, defaultValue: false } : el))
        );
      } else {
        this.searchButtonTest.set('Sök mot Navet');
        this.arendeConfig.update(config =>
          config.map(el => (el.name === 'personuppgifter' ? { ...el, defaultValue: true } : el))
        );
      }

      return;
    }
  }

  onFormChange(formValue: Record<string, string | boolean>): void {
    this.arendeConfig.update(config =>
      config.map(el => {
        if (el.name === 'intern') {
          return {
            ...el,
            isHidden: !!formValue['useArendemeningText'],
          };
        }
        if (el.name === 'arendemeningExtra') {
          return {
            ...el,
            isHidden: !formValue['useArendemeningText'],
            validators: formValue['useArendemeningText'] ? this.arendemeningTextValidators : undefined,
          };
        }
        if (el.name === 'internExtra') {
          return {
            ...el,
            defaultValue: formValue['arendemeningExtra'],
            isHidden: !formValue['useArendemeningText'],
            validators: formValue['useArendemeningText'] ? this.arendemeningTextValidators : undefined,
          };
        }
        return el;
      })
    );
  }

  updateConfigAccordingToMotpart(value: string) {
    this.arendeConfig.update(config =>
      config.map(el => (el.name === 'motpartComponent' ? { ...el, props: { ...el.props, motpartTyp: value } } : el))
    );
  }

  private getEmptyWithDefaults(): void {
    this.nuxeoApi
      .getEmptyWithDefaults(this.path(), 'Arende')
      .pipe(tap((result: NuxeoDocument) => (this.defaultPayload = result)))
      .subscribe();
  }

  private motpartFormChange(event: MotpartForm) {
    this.motpartFormResult.set(event);
  }

  updateLagrum(isSecret: boolean) {
    const hasLagrum = this.arendeConfig().some(item => item.name === 'lagrum');
    if (isSecret && !hasLagrum) {
      const lagrumField = this.lagrumField.buildField({ name: 'lagrum', options: this.lagrumOptions() });
      this.arendeConfig.update(config => this.lagrumField.insertAfter(config, 'secret', lagrumField));
    }

    if (!isSecret && hasLagrum) {
      this.arendeConfig.update(config => this.lagrumField.removeField(config, 'lagrum'));
    }
  }

  updateConfigAccordingToRiktning(value: string) {
    const hasMotpart = this.arendeConfig().some(item => item.name === 'motpart');
    if (value === 'ut' || value === 'in') {
      this.hasInternRiktning.set(false);
      this.firstColumnSize.set(4);
      if (!hasMotpart) {
        this.arendeConfig.update(config => [
          ...config.slice(0, 1),
          {
            type: 'radio',
            name: 'motpartRadio',
            label: 'Typ av motpart',
            options: this.motpartOptions() ?? [],
            defaultValue: this.motpartOptions()?.[1]?.id, //?
            validators: [Validators.required],
          },
          {
            type: 'input',
            name: 'motpart',
            showContentProjection: true,
            label: 'Motpartens namn',
            validators: [Validators.required],
          },
          {
            type: 'component',
            name: 'motpartComponent',
            class: MotpartInfoComponent,
            props: {
              motpartTyp: NUXEO_VOCAB_IDS.motpartTyp.foretagMyndighet,
            },
          },
          {
            type: 'input',
            name: 'externReferens',
            label: 'Extern referens',
          },

          ...config.slice(1),
        ]);
      }
    } else if (value === NUXEO_VOCAB_IDS.arendeRiktning.intern) {
      this.hasInternRiktning.set(true);
      this.firstColumnSize.set(5);
      if (hasMotpart) {
        this.arendeConfig.update(config =>
          config
            .filter(
              el =>
                el.name !== 'motpartComponent' &&
                el.name !== 'motpartRadio' &&
                el.name !== 'motpart' &&
                el.name !== 'externReferens'
            )
            .map(el => (el.name === 'personuppgifter' ? { ...el, defaultValue: false } : el))
        );
      }
    }
  }

  selectedOptionChanged(selectionChanged: {
    selectedValue: string;
    fieldName: string;
    formValue?: Record<string, unknown>;
  }): void {
    if (selectionChanged.fieldName === 'secret') {
      const isSecret = this.formUtils.hasStrongSecrecy(selectionChanged.selectedValue);

      this.updateLagrum(isSecret);
      return;
    }
    if (selectionChanged.fieldName === 'riktning') {
      this.updateConfigAccordingToRiktning(selectionChanged.selectedValue);
      return;
    }
    if (selectionChanged.fieldName === 'arendemening' || selectionChanged.fieldName === 'intern') {
      const isArendemening = selectionChanged.fieldName === 'arendemening';
      const extraFieldName = isArendemening ? 'arendemeningExtra' : 'internExtra';
      const fieldConfig = this.arendeConfig().find(field => field.name === selectionChanged.fieldName)!;
      const label = fieldConfig.options?.find(option => option.id === selectionChanged.selectedValue)?.label ?? '';

      this.arendeConfig.update(config =>
        config.map(el =>
          this.syncArendemeningSelectionToIntern(
            el,
            extraFieldName,
            isArendemening,
            selectionChanged.selectedValue,
            label
          )
        )
      );
      return;
    }
    if (selectionChanged.fieldName !== 'arendeTyp') {
      return;
    }

    this.nuxeoApi
      .getDocumentById<ArendetypProperties>(selectionChanged.selectedValue, true)
      .pipe(
        switchMap(doc => {
          if (!doc?.properties) {
            return of({ doc, lagrumOptions: [] as Option[], defaultLagrum: [] as Option[] });
          }
          const lagrumRefs = doc.properties[NUXEO_SCHEMA_FIELDS.klass.lagrum] ?? [];
          const toOptions = (result: { entries?: { title: string; uid: string }[] }) =>
            (result.entries ?? []).map(entry => ({ label: entry.title, id: entry.uid }));

          return forkJoin({
            // All Lagrum documents visible to this case, so the dropdown always offers the full picklist.
            // Must go through getLagrumOptions (docType: 'Klass') - the 'Arende'/'Handling' query variant
            // requires selectedKlass as a bind param and 500s without it.
            lagrumOptions: this.nuxeoApi.getLagrumOptions(this.parentUid()).pipe(catchError(() => of([] as Option[]))),
            // Just this Klass's own configured refs, used only to determine the pre-selected default.
            defaultLagrum: lagrumRefs.length
              ? this.nuxeoApi
                  .DMSDocumentSuggestion(this.parentUid(), 'Lagrum', 'Arende', '', {
                    selectedKlass: selectionChanged.selectedValue,
                  })
                  .pipe(
                    map(toOptions),
                    catchError(() => of([] as Option[]))
                  )
              : of([] as Option[]),
          }).pipe(map(({ lagrumOptions, defaultLagrum }) => ({ doc, lagrumOptions, defaultLagrum })));
        }),
        tap(({ doc, lagrumOptions, defaultLagrum }) => {
          if (!doc?.properties) return;

          this.lagrumOptions.set(lagrumOptions);

          const props = doc.properties;
          const defaultSecretId = props[NUXEO_SCHEMA_FIELDS.klass.sekretess]?.id ?? null;
          const defaultSecretKlassId = props[NUXEO_SCHEMA_FIELDS.klass.sakerhetsskyddsklassificering]?.id ?? null;
          const arendemeningOpts = props[NUXEO_SCHEMA_FIELDS.klass.arendemening]?.map((el: string) => ({
            id: el,
            label: el,
          }));

          this.updateLagrum(this.formUtils.hasStrongSecrecy(defaultSecretId));

          const updatedConf = this.arendeConfig().map(el => {
            if (el.name === 'arendemening' || el.name === 'intern') {
              return {
                ...el,
                defaultValue: arendemeningOpts?.[0]?.id,
                options: arendemeningOpts?.length ? arendemeningOpts : [],
                props: { ...el.props, key: `${el.name}-${selectionChanged.selectedValue}` },
              };
            }
            if (el.name === 'arendemeningExtra' || el.name === 'internExtra') {
              return { ...el, defaultValue: arendemeningOpts?.[0]?.label ?? '' };
            }
            if (el.name === 'secret') {
              return { ...el, defaultValue: defaultSecretId ?? null };
            }
            if (el.name === 'secretKlass') {
              return { ...el, defaultValue: defaultSecretKlassId ?? null };
            }
            if (el.name === 'lagrum' && defaultLagrum?.length) {
              // The dropdown is single-select; a Klass can have several Lagrum refs
              // configured, so only pre-select the first one.
              return { ...el, defaultValue: [defaultLagrum[0]] };
            }
            return el;
          });
          this.arendeConfig.set(updatedConf);
        })
      )
      .subscribe();
  }

  private syncArendemeningSelectionToIntern(
    field: FieldConfig,
    extraFieldName: string,
    isArendemening: boolean,
    selectedValue: string,
    label: string
  ): FieldConfig {
    if (field.name === extraFieldName) return { ...field, defaultValue: label };
    if (isArendemening && field.name === 'intern') return { ...field, defaultValue: selectedValue };
    return field;
  }

  createDocument(rawEvent: ArendeFormEvent | null): void {
    this.arendeConfig.update(config =>
      config.map(el => (el.name === 'arendeTyp' ? { ...el, props: { ...el.props, isSubmited: true } } : el))
    );

    if (!this.assignComponent.assignCaseFormGroup.valid) {
      this.assignComponent.assignCaseFormGroup.markAllAsTouched();
      return;
    }
    if (!rawEvent) {
      return;
    }

    const event = rawEvent;
    this.isLoading.set(true);

    if (!this.defaultPayload) {
      throw new Error('Payload is needed for creating documents');
    }

    const assignFormResult = this.assignComponent.assignCaseFormGroup;

    const organizationLabel = assignFormResult.get('organization')?.value;
    const coworkerLabel = assignFormResult.get('coworker')?.value;
    const medhandlaggare = this.assignComponent.medhandlaggareArray.controls
      .map(control => control.value)
      .filter((value): value is string => !!value);

    const motpartResult: Motpart = {
      motpart: event['motpart'] ?? null,
      typ: event['motpartRadio'] ? event['motpartRadio'] : null,
      postnummer: this.motpartFormResult()?.zip ?? null,
      epost: this.motpartFormResult()?.epost ?? null,
      adress: this.motpartFormResult()?.address ?? null,
      telefon: this.motpartFormResult()?.phone ?? null,
      organisationsnummer: this.motpartFormResult()?.organisationsnummer ?? null,
    };

    const fullPayload: Partial<NuxeoDocument<ArendePayloadProperties>> = {
      ...this.defaultPayload,
      name: this.defaultPayload.type,
      properties: {
        ...this.defaultPayload.properties,
        [NUXEO_SCHEMA_FIELDS.arende.motpart]: motpartResult ?? null,
        [NUXEO_SCHEMA_FIELDS.arende.riktning]: event['riktning'],
        [NUXEO_SCHEMA_FIELDS.arende.arendetyp]: this.arendeTypeValue()?.[0]?.value,
        [NUXEO_SCHEMA_FIELDS.arende.arendemening]: event['useArendemeningText']
          ? event['arendemeningExtra']
            ? event['arendemeningExtra'].trim()
            : null
          : (event['arendemening'] ?? null),
        [NUXEO_SCHEMA_FIELDS.arende.internArendemening]: event['useArendemeningText']
          ? event['internExtra']
            ? event['internExtra'].trim()
            : null
          : (event['intern'] ?? null),
        [NUXEO_SCHEMA_FIELDS.arende.innehallerPersonuppgifterGdpr]: event['personuppgifter'],
        [NUXEO_SCHEMA_FIELDS.arende.sekretess]: event['secret'],
        [NUXEO_SCHEMA_FIELDS.arende.sakerhetsskyddsklassificering]: event['secretKlass'],
        [NUXEO_SCHEMA_FIELDS.arende.ansvarigOrganisatoriskEnhet]: organizationLabel,
        [NUXEO_SCHEMA_FIELDS.arende.ansvarigHandlaggare]: coworkerLabel || null,
        [NUXEO_SCHEMA_FIELDS.arende.medhandlaggare]: medhandlaggare,
        [NUXEO_SCHEMA_FIELDS.arende.lagrumsbeskrivning]: event['lagrum']?.[0]?.id ? [event['lagrum']?.[0]?.id] : [],
        'arende:handlaggningsstatus': 'handlaggningEjPaborjad', // remove on 0.2.2 version
        'arende:behorighetsstatus': 'registrerat', // remove on 0.2.2 version
        [NUXEO_SCHEMA_FIELDS.arende.externReferens]: event['externReferens']
          ? [{ referens: event['externReferens'] }]
          : undefined,
      },
    };

    let createdCase: NuxeoDocument;
    this.nuxeoApi
      .createDocument<ArendePayloadProperties, NuxeoProperties>(fullPayload, this.path())
      .pipe(
        tap(result => {
          createdCase = result;
          this.dialogClosed.emit(createdCase);
          this.store.lastCreatedCase.set(createdCase);
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: REDUCED_CREATE_CASE_SUCCESS_MESSAGE,
          });
          this.isLoading.set(false);
        }),
        catchError(err => {
          console.error('Error during Case creation:', err);
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: REDUCED_CREATE_CASE_ERROR_MESSAGE,
          });
          this.dialogClosed.emit(null);
          this.isLoading.set(false);
          return EMPTY;
        })
      )
      .subscribe();
  }
}
