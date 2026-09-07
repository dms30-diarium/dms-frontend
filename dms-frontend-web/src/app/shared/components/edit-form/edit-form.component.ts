import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  OnInit,
  output,
  signal,
  untracked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { EditGroup, GroupField } from '../general-form/general-form.types';
import { ArendeTypOption, EditCaseResult, InternalContact } from '@app/pages/case-page/case-types';
import { ContactOption, OptionLike } from '@app/shared/commonTypes';
import { ArendeRefOption } from '../edit-form-components/case-reference.component/case-reference.component';
import { ExternalRefOption } from '../edit-form-components/extern-referens/extern-referens.component';
import { EditHandlingResult } from '@app/pages/handling-page/handling-types';
import { buildRequiredFieldsMessage } from '@app/shared/constants/notification-messages';
import {
  ArendeExtendedProperties,
  HandlingExtendedProperties,
  Motpart,
  NuxeoDocument,
} from '@app/shared/api/nuxeo-api.types';
import {
  DmsMetadataDefinitionEntry,
  DmsMetadataValueEntry,
} from '@app/shared/components/custom-metadata-field/custom-metadata-field.types';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { FormUtilsService } from '@app/shared/services/form-utils.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { NUXEO_VOCAB_IDS } from '@app/shared/constants/nuxeo-vocabulary-ids';

@Component({
  selector: 'nuxeo-edit-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, DigiArbetsformedlingenAngularModule],
  templateUrl: './edit-form.component.html',
})
export class EditFormComponent implements OnInit {
  config = input<EditGroup[]>([]);
  gridCssClass = input<string>('grid grid-cols-2 gap-4 lg:grid-cols-4');
  newConfig = signal<EditGroup[] | null>(null);
  subLabel = input<string>('');
  internalContactsData = input<InternalContact[]>([]);
  motpartContactsData = input<Motpart[]>([]);
  doc = input.required<NuxeoDocument<ArendeExtendedProperties | HandlingExtendedProperties>>();
  canSeeCustomMetadataValues = input<boolean>(false);
  formResultCase = output<EditCaseResult>();
  formResultHandling = output<EditHandlingResult>();
  updateDropdownValues = output<{ fieldName: string; value: string }>();
  dialogClose = output();
  uploadFileOutput = output<File[]>();
  caseTypeChanged = output<string | null>();
  form: FormGroup = new FormGroup({});

  private readonly api = inject(NuxeoApiService);
  private readonly formUtils = inject(FormUtilsService);

  handlingsriktning = signal<string>('');
  avsandare = signal<ContactOption[]>([]);
  mottagare = signal<ContactOption[]>([]);
  internArendereferens = signal<ArendeRefOption[]>([]);
  internHandlingsreferens = signal<ArendeRefOption[]>([]);
  externReferens = signal<ExternalRefOption[]>([]);
  externContacts = signal<ContactOption[]>([]);
  internContacts = signal<ContactOption[]>([]);
  motpartContacts = signal<ContactOption[]>([]);
  arendetyp = signal<ArendeTypOption[]>([]);
  customMetadataValues = signal<DmsMetadataValueEntry[]>([]);
  customMetadataDefinitions = signal<DmsMetadataDefinitionEntry[]>([]);
  customMetadataDefinitionDocId = signal<string | null>(null);

  private initialCaseTypeId?: string;
  private initialCustomMetadataValues: DmsMetadataValueEntry[] = [];
  private initialCustomMetadataDefinitions: DmsMetadataDefinitionEntry[] = [];
  private metadataCache = new Map<
    string,
    { definitions: DmsMetadataDefinitionEntry[]; values: DmsMetadataValueEntry[]; klassDoc?: NuxeoDocument }
  >();
  private currentCaseTypeId: string | null = null;
  private lastEmittedCaseTypeId: string | null = null;
  private readonly store = inject(GeneralStore);

  constructor() {
    effect(() => {
      const selected = this.arendetyp();
      const selectedId = selected?.[0]?.value ?? selected?.[0]?.id ?? null;
      if (this.lastEmittedCaseTypeId === selectedId) {
        return;
      }
      this.lastEmittedCaseTypeId = selectedId;
      this.caseTypeChanged.emit(selectedId);
      this.applyCaseTypeChange(selectedId);
    });

    effect(() => {
      const config = this.newConfig() ?? this.config();
      config.forEach(group => {
        group.groupFields.forEach(field => {
          if (field.type !== 'dropdown-search') return;
          const options = this.getSelectFilterOptions(field);
          if (!options?.length) return;
          const control = untracked(() => this.form.get(`${group.groupId}.${field.name}`));
          if (!control) return;
          const rawValue = untracked(() => control.value);
          if (Array.isArray(rawValue)) return;
          const optionId = this.readOptionId(rawValue);
          if (!optionId) return;
          const found = options.find(o => o.id === optionId);
          if (found) {
            untracked(() => control.setValue([found], { emitEvent: false }));
          }
        });
      });
    });
  }

  ngOnInit(): void {
    this.form = this.createFormFromEditConfig(this.config());
    this.captureInitialCustomMetadata();
    this.listenToCaseTypeChanges();
    this.listenToHandlingTypeChanges();
    this.setupLagrumVisibility();
    if (this.doc().type === 'Arende') {
      this.setupArendeStatusValidation();
    }
    if (this.doc().type === 'Handling') {
      this.handlingsriktning.set(this.form.value?.handlingDetails?.handlingsriktning);
      this.setNewConfigAccordingToRiktning();
      this.form.get('handlingDetails.handlingsriktning')?.valueChanges.subscribe(value => {
        this.handlingsriktning.set(value);
        this.setNewConfigAccordingToRiktning();
      });
      this.setupHandlingMakuleratValidation();
    }
  }

  setNewConfigAccordingToRiktning() {
    const freshConfig = this.config();
    const currentConfig = this.newConfig();

    const newConf = freshConfig.map(group => {
      if (group.groupId !== 'handlingDetails') {
        // Groups other than handlingDetails can carry runtime state - notably the lagrum
        // visibility driven by the sekretess control - so keep the current version instead
        // of resetting them to the pristine config input.
        return currentConfig?.find(current => current.groupId === group.groupId) ?? group;
      }

      return {
        ...group,
        groupFields: group.groupFields.map(field => {
          if (field.name === 'inkommen_datum') {
            return {
              ...field,
              isHidden: this.handlingsriktning() !== NUXEO_VOCAB_IDS.arendeRiktning.inkommande,
            };
          } else if (field.name === 'upprattad_datum') {
            return {
              ...field,
              isHidden: this.handlingsriktning() === NUXEO_VOCAB_IDS.arendeRiktning.inkommande,
            };
          }
          return field;
        }),
      };
    });

    this.newConfig.set(newConf);
  }

  private setupHandlingMakuleratValidation(): void {
    const handlingsstegCtrl = this.form.get('overview.handlingssteg');
    const makuleringskommentarCtrl = this.form.get('comment.makuleringskommentar');
    if (!handlingsstegCtrl || !makuleringskommentarCtrl) return;

    this.toggleControlRequired(
      makuleringskommentarCtrl,
      handlingsstegCtrl.value === NUXEO_VOCAB_IDS.handlingssteg.makulerad
    );
    handlingsstegCtrl.valueChanges.subscribe(value => {
      this.toggleControlRequired(makuleringskommentarCtrl, value === NUXEO_VOCAB_IDS.handlingssteg.makulerad);
    });
  }

  getSelectFilterOptions(field: GroupField) {
    const optionsSignal = field.props?.optionsSignal as (() => unknown) | undefined;
    if (optionsSignal) {
      const signalOptions = optionsSignal() as GroupField['options'];
      return signalOptions;
    }
    return field.options;
  }

  getSelectFilterValue(groupId: string, field: GroupField) {
    const rawValue = this.form.get(`${groupId}.${field.name}`)?.value;
    const options = this.getSelectFilterOptions(field) ?? [];

    const values = (Array.isArray(rawValue) ? rawValue : [rawValue]).filter(v => v != null && v !== '');

    const result = [];

    for (const value of values) {
      const optionId = this.readOptionId(value);
      if (!optionId) continue;

      const found = options.find(option => option.id === optionId);
      if (found) {
        result.push(found);
      } else {
        result.push({ id: optionId, label: optionId });
      }
    }

    return result;
  }

  private isOptionLike(value: unknown): value is OptionLike {
    return typeof value === 'object' && value !== null;
  }

  private readOptionId(value: unknown): string | null {
    if (typeof value === 'string') {
      return value.trim() || null;
    }
    if (!this.isOptionLike(value)) {
      return null;
    }
    const idObj = value as Record<string, unknown>;
    return String(idObj['id'] ?? idObj['uid'] ?? '').trim() || null;
  }

  onSelectFilter(detail: unknown, groupId: string, field: GroupField) {
    const control = this.form.get(`${groupId}.${field.name}`);
    if (!control) return;
    control.setValue(Array.isArray(detail) ? detail : []);
  }

  getProps(field: GroupField) {
    const props: Record<string, unknown> = {
      parentRef: this.doc().parentRef,
      fieldName: field.name,
    };
    const candidateTableFields = this[field.name as keyof this];
    if (candidateTableFields) {
      props['tableFields'] = candidateTableFields;
    }
    if (field.__type === 'internArendereferens') {
      props['refType'] = 'Arende';
    }
    if (field.__type === 'internHandlingsreferens') {
      props['refType'] = 'Handling';
    }
    if (field.__type === 'contactExt') {
      props['type'] = 'external';
    }
    if (field.__type === 'contactMotpart') {
      props['doc'] = this.doc();
    }
    if (field.__type === 'arendetypAutocomplete') {
      props['docType'] = this.doc().type;
    }
    if (field.__type === 'contactInt') {
      props['type'] = 'internal';
    }
    if (field.__type === 'customMetadata') {
      props['doc'] = this.doc();
      props['valuesSignal'] = this.customMetadataValues;
      props['definitionsSignal'] = this.customMetadataDefinitions;
      props['definitionDocIdSignal'] = this.customMetadataDefinitionDocId;
      props['canSeeValues'] = this.canSeeCustomMetadataValues();
    }
    return props;
  }

  shouldRenderComponent(field: GroupField): boolean {
    const type = field.__type;
    return (
      type === 'internArendereferens' ||
      type === 'externReferens' ||
      type === 'internHandlingsreferens' ||
      type === 'contactInt' ||
      type === 'contactExt' ||
      type === 'contactMotpart' ||
      type === 'mottagare' ||
      type === 'avsandare' ||
      type === 'arendetypAutocomplete' ||
      type === 'customMetadata'
    );
  }

  createFormFromEditConfig(config: EditGroup[]): FormGroup {
    const group: Record<string, FormGroup> = {};

    config.forEach(editGroup => {
      const innerGroup: Record<string, FormControl> = {};

      editGroup.groupFields.forEach(field => {
        if (field.__type === 'contactInt') {
          this.internContacts.set(this.internalContactsData());
        }
        if (field.__type === 'contactExt' && Array.isArray(field.defaultValue)) {
          this.externContacts.set(
            field.defaultValue.map(el => ({
              name: el.namn,
              email: el.email,
              phone: el.telefon,
              adress: el.adress,
              id: crypto.randomUUID(),
            }))
          );
        }
        if (field.__type === 'contactMotpart') {
          this.motpartContacts.set(this.motpartContactsData());
        }
        if (field.__type === 'avsandare' && Array.isArray(field.defaultValue)) {
          this.avsandare.set(
            field.defaultValue.map(rawContact => {
              const contact = rawContact as {
                namn?: string;
                email?: string;
                telefon?: string;
                adress?: string;
                organisation?: string;
                foretag?: string;
              };
              return {
                namn: contact.namn ?? '',
                email: contact.email ?? '',
                telefon: contact.telefon ?? '',
                adress: contact.adress ?? '',
                org: contact.organisation ?? contact.foretag ?? null,
                id: crypto.randomUUID(),
              };
            })
          );
        }
        if (field.__type === 'mottagare' && Array.isArray(field.defaultValue)) {
          this.mottagare.set(
            field.defaultValue.map(rawContact => {
              const contact = rawContact as {
                namn?: string;
                email?: string;
                telefon?: string;
                adress?: string;
                organisation?: string;
                foretag?: string;
              };
              return {
                namn: contact.namn ?? '',
                email: contact.email ?? '',
                telefon: contact.telefon ?? '',
                adress: contact.adress ?? '',
                org: contact.organisation ?? contact.foretag ?? null,
                id: crypto.randomUUID(),
              };
            })
          );
        }
        if (field.__type === 'internArendereferens' && Array.isArray(field.defaultValue)) {
          this.internArendereferens.set(
            field.defaultValue.map(el => ({
              caseRef: el.arende?.uid,
              type: el.referenstyp?.id,
              comment: el.referenskommentar,
              id: crypto.randomUUID(),
            }))
          );
        }
        if (field.__type === 'internHandlingsreferens' && Array.isArray(field.defaultValue)) {
          this.internHandlingsreferens.set(
            field.defaultValue.map(el => ({
              caseRef: el.handling?.uid,
              type: el.referenstyp?.id,
              comment: el.referenskommentar,
              id: crypto.randomUUID(),
            }))
          );
        }
        if (field.__type === 'externReferens' && Array.isArray(field.defaultValue)) {
          this.externReferens.set(
            field.defaultValue.map(el => ({
              referens: el.referens,
              comment: el.referenskommentar,
            }))
          );
        }
        if (field.__type === 'arendetypAutocomplete' && Array.isArray(field.defaultValue)) {
          this.arendetyp.set(field.defaultValue);
        }

        innerGroup[field.name] = new FormControl(field.defaultValue ?? '', field.validators || []);
      });

      group[editGroup.groupId] = new FormGroup(innerGroup);
    });

    return new FormGroup(group);
  }

  private listenToCaseTypeChanges(): void {
    const caseTypeControl = this.form.get('arendeDetails.arendetyp');
    if (!caseTypeControl) return;

    const currentValue = caseTypeControl.value;
    if (typeof currentValue === 'string') {
      this.applyCaseTypeChange(currentValue);
    }

    caseTypeControl.valueChanges.subscribe(selectedCaseTypeId => {
      this.applyCaseTypeChange(typeof selectedCaseTypeId === 'string' ? selectedCaseTypeId : null);
    });
  }

  private listenToHandlingTypeChanges(): void {
    const handlingTypeControl = this.form.get('handlingDetails.handlingstyp');
    if (!handlingTypeControl) return;

    handlingTypeControl.valueChanges.subscribe(selectedHandlingType => {
      this.applyMetadataDefinitionChange(selectedHandlingType[0].id);
    });
  }

  private setupLagrumVisibility(): void {
    const docType = this.doc().type;
    const isCase = docType === 'Arende';
    const isUtkast = docType === 'Utkast';

    const secretCtrl = isUtkast ? this.form.get('handlingDetails.secret') : this.form.get('secret.secret');
    const lagrumGroupId = isUtkast ? 'handlingDetails' : 'secret';
    const lagrumFieldName = isCase ? 'lagrum' : 'lagrumsbeskrivning';
    const lagrumCtrl = this.form.get(`${lagrumGroupId}.${lagrumFieldName}`);
    if (!secretCtrl || !lagrumCtrl) return;

    this.applyLagrumVisibility(lagrumCtrl, lagrumGroupId, lagrumFieldName, secretCtrl.value);
    secretCtrl.valueChanges.subscribe(value =>
      this.applyLagrumVisibility(lagrumCtrl, lagrumGroupId, lagrumFieldName, value)
    );
  }

  private applyLagrumVisibility(
    lagrumCtrl: AbstractControl,
    lagrumGroupId: string,
    lagrumFieldName: string,
    secretValue: string | null | undefined
  ): void {
    const show = this.formUtils.hasStrongSecrecy(secretValue);
    const baseConfig = this.newConfig() ?? this.config();
    const updated = baseConfig.map(group => {
      if (group.groupId !== lagrumGroupId) return group;
      return {
        ...group,
        groupFields: group.groupFields.map(field =>
          field.name === lagrumFieldName ? { ...field, isHidden: !show } : field
        ),
      };
    });
    this.newConfig.set(updated);

    if (show) {
      lagrumCtrl.setValidators([Validators.required]);
    } else {
      lagrumCtrl.clearValidators();
      lagrumCtrl.reset(null, { emitEvent: false });
    }
    lagrumCtrl.updateValueAndValidity({ emitEvent: false });
  }

  private setupArendeStatusValidation(): void {
    const statusCtrl = this.form.get('overview.arendestatus');
    const arendestegCtrl = this.form.get('overview.arendesteg');
    const makuleringCtrl = this.form.get('comment.makulering');
    const beslutTypCtrl = this.form.get('overview.beslutTyp');
    const beslutDateCtrl = this.form.get('overview.beslutDate');
    if (!statusCtrl || !makuleringCtrl || !beslutTypCtrl || !beslutDateCtrl) return;

    this.applyArendeStatusRules(statusCtrl.value, makuleringCtrl, beslutTypCtrl, beslutDateCtrl, arendestegCtrl?.value);
    arendestegCtrl?.valueChanges.subscribe(value =>
      this.applyArendeStatusRules(value, makuleringCtrl, beslutTypCtrl, beslutDateCtrl, arendestegCtrl?.value)
    );
  }

  private applyArendeStatusRules(
    statusValue: string,
    makuleringCtrl: AbstractControl,
    beslutTypCtrl: AbstractControl,
    beslutDateCtrl: AbstractControl,
    arendestegCtrl: string
  ): void {
    const status = statusValue.trim().toLowerCase();

    const needsMakulering = arendestegCtrl === NUXEO_VOCAB_IDS.arendesteg.makulerat; //
    const needsDecision = status === NUXEO_VOCAB_IDS.arendestatus.stangt;

    this.toggleControlRequired(makuleringCtrl, needsMakulering);
    this.toggleControlRequired(beslutTypCtrl, needsDecision);
    this.toggleControlRequired(beslutDateCtrl, needsDecision);
  }

  private toggleControlRequired(ctrl: AbstractControl, required: boolean): void {
    if (required) {
      ctrl.addValidators(Validators.required);
    } else {
      ctrl.removeValidators(Validators.required);
    }
    ctrl.updateValueAndValidity({ emitEvent: false });
  }

  private applyCaseTypeChange(selectedCaseTypeId: string | null): void {
    this.applyMetadataDefinitionChange(selectedCaseTypeId);
  }

  private applyMetadataDefinitionChange(selectedCaseTypeId: string | null): void {
    if (this.currentCaseTypeId) {
      this.metadataCache.set(this.currentCaseTypeId, {
        definitions: [...this.customMetadataDefinitions()],
        values: [...this.customMetadataValues()],
      });
    }

    if (!selectedCaseTypeId) {
      this.customMetadataDefinitionDocId.set(null);
      this.customMetadataDefinitions.set([]);
      this.customMetadataValues.set([]);
      return;
    }

    this.currentCaseTypeId = selectedCaseTypeId;

    const cached = this.metadataCache.get(selectedCaseTypeId);
    if (cached) {
      this.customMetadataDefinitionDocId.set(selectedCaseTypeId);
      this.customMetadataDefinitions.set([...cached.definitions]);
      this.customMetadataValues.set([...cached.values]);

      if (!cached.klassDoc && !cached.definitions.length) {
        this.fetchMetadataDefinitions(selectedCaseTypeId, true);
      }
      return;
    }

    this.fetchMetadataDefinitions(selectedCaseTypeId, false);
  }

  private fetchMetadataDefinitions(selectedCaseTypeId: string, preserveValues: boolean): void {
    this.api.getDocumentById(selectedCaseTypeId, true).subscribe({
      next: klassDoc => {
        const defs = klassDoc.properties?.[NUXEO_SCHEMA_FIELDS.dmsmetadatadefinition.faltdefinition] ?? [];
        this.customMetadataDefinitionDocId.set(klassDoc.uid);
        this.customMetadataDefinitions.set(defs);
        const values = preserveValues ? this.customMetadataValues() : [];
        this.customMetadataValues.set(values);
        this.metadataCache.set(selectedCaseTypeId, { definitions: [...defs], values: [...values], klassDoc });
      },
      error: () => {
        this.customMetadataDefinitionDocId.set(null);
        this.customMetadataDefinitions.set([]);
        if (!preserveValues) {
          this.customMetadataValues.set([]);
        }
      },
    });
  }

  private isArendeProperties(
    props: ArendeExtendedProperties | HandlingExtendedProperties
  ): props is ArendeExtendedProperties {
    return NUXEO_SCHEMA_FIELDS.arende.arendetyp in props;
  }

  private captureInitialCustomMetadata(): void {
    const properties = this.doc().properties;

    if (this.isArendeProperties(properties)) {
      this.initialCaseTypeId = properties[NUXEO_SCHEMA_FIELDS.arende.arendetyp]?.uid;
      this.initialCustomMetadataDefinitions =
        (properties[NUXEO_SCHEMA_FIELDS.dmsmetadatadefinition.faltdefinition] as
          | DmsMetadataDefinitionEntry[]
          | undefined) ?? [];
    } else {
      const handlingType = properties[NUXEO_SCHEMA_FIELDS.handling.handlingstyp];
      this.initialCaseTypeId = handlingType?.uid;
      this.initialCustomMetadataDefinitions = [];
    }

    const initialValuesFromExpectedKey = properties[NUXEO_SCHEMA_FIELDS.dmsmetadataanpassad.falt] as
      | DmsMetadataValueEntry[]
      | undefined;
    this.initialCustomMetadataValues = initialValuesFromExpectedKey ?? [];

    this.customMetadataDefinitionDocId.set(this.initialCaseTypeId ?? null);
    this.customMetadataDefinitions.set([...this.initialCustomMetadataDefinitions]);
    this.customMetadataValues.set([...this.initialCustomMetadataValues]);
    if (this.initialCaseTypeId) {
      this.metadataCache.set(this.initialCaseTypeId, {
        definitions: [...this.initialCustomMetadataDefinitions],
        values: [...this.initialCustomMetadataValues],
      });
      this.currentCaseTypeId = this.initialCaseTypeId;
      if (!this.initialCustomMetadataDefinitions.length) {
        this.fetchMetadataDefinitions(this.initialCaseTypeId, true);
      }
    }
  }

  uploadFile(file: File[]) {
    this.uploadFileOutput.emit(file);
  }

  submit() {
    if (!this.form || !this.form.valid) {
      this.form.markAllAsTouched();
      this.form.updateValueAndValidity();

      if (this.doc().type === 'Arende') {
        const statusControl = this.form.get('overview.arendestatus');
        const status = statusControl?.value.trim().toLowerCase();
        const missing: string[] = [];

        if (status === NUXEO_VOCAB_IDS.arendestatus.makulerat && this.form.get('comment.makulering')?.invalid) {
          missing.push('Makulering');
        }
        if (status === NUXEO_VOCAB_IDS.arendestatus.stangt) {
          if (this.form.get('overview.beslutTyp')?.invalid) missing.push('Beslut typ');
          if (this.form.get('overview.beslutDate')?.invalid) missing.push('Beslutat datum');
        }

        const text = buildRequiredFieldsMessage(missing);
        this.store.notification.set({ show: true, variation: 'danger', text });
      }
      return;
    }

    if (this.doc().type === 'Arende') {
      const formResult: EditCaseResult = {
        ...this.form.value,
        arendeTypAutosuggest: this.arendetyp(),
        externContacts: this.externContacts(),
        motpartContacts: this.motpartContacts(),
        internArendereferens: this.internArendereferens(),
        internHandlingsreferens: this.internHandlingsreferens(),
        externReferens: this.externReferens(),
        ansvarig_handlaggare: this.internContacts()?.[0]?.name,
        medhandlaggare: this.internContacts()?.[1]?.name,
        beslutsfattare: this.internContacts()?.[2]?.name,
        granskare: this.internContacts()?.[3]?.name,
        customMetadataValues: this.customMetadataValues(),
        customMetadataDefinitions: this.customMetadataDefinitions(),
        customMetadataDefinitionDocId: this.customMetadataDefinitionDocId(),
      };
      this.formResultCase.emit(formResult);
    }

    if (this.doc().type === 'Handling' || this.doc().type === 'Utkast') {
      const formResultHandling: EditHandlingResult = {
        ...this.form.value,
        avsandare: this.avsandare(),
        mottagare: this.mottagare(),
        internArendereferens: this.internArendereferens(),
        internHandlingsreferens: this.internHandlingsreferens(),
        externReferens: this.externReferens(),
        customMetadataValues: this.customMetadataValues(),
        customMetadataDefinitions: this.customMetadataDefinitions(),
        customMetadataDefinitionDocId: this.customMetadataDefinitionDocId(),
      };

      this.formResultHandling.emit(formResultHandling);
    }
  }

  getValidationStatus(fieldGroup?: string, field?: string) {
    const pathToField = fieldGroup + '.' + field;
    const validStatus = this.form.get(pathToField)?.invalid ? 'error' : 'neutral';
    return validStatus;
  }

  isFieldRequired(fieldGroupId: string, field: GroupField): boolean {
    if (!fieldGroupId || !field?.name) return false;
    const control = this.form.get(`${fieldGroupId}.${field.name}`);
    if (control?.hasValidator?.(Validators.required)) return true;
    return !!field?.validators?.some(validator => validator === Validators.required);
  }

  getGroupClasses(fieldGroup: EditGroup): string[] {
    return [
      fieldGroup.size === 'big' ? 'col-span-2' : fieldGroup.size === 'full' ? 'col-span-full' : 'col-span-1',
      fieldGroup.containerCssClass,
    ].filter((className): className is string => !!className);
  }
}
