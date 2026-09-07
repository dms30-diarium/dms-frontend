import { Component, effect, inject, input, OnInit, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DefaultValueUnion, FieldConfig } from './general-form.types';
import { FileUploadComponent, UploadedFile } from '../file-upload/file-upload.component';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { OptionLike } from '@app/shared/commonTypes';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { AngularEditorConfig, AngularEditorModule } from '@kolkov/angular-editor';
import { catchError, map, of, Subscription } from 'rxjs';

@Component({
  selector: 'nuxeo-general-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FileUploadComponent,
    DigiArbetsformedlingenAngularModule,
    AngularEditorModule,
  ],
  templateUrl: './general-form.component.html',
})
export class GeneralFormComponent implements OnInit {
  private readonly nuxeoApi = inject(NuxeoApiService);
  config = input<FieldConfig[]>([]);
  subLabel = input<string>('');
  columns = input<number>(1);
  firstColumnSize = input<number>(0);
  shouldShowButtons = input<boolean>(true);
  showFieldsInTwoCols = input<boolean>(false);
  formResult = output<Record<string, string>>();
  formNotValid = output();
  changeForm = output<Record<string, string>>();
  dialogClose = output();
  uploadFileOutput = output<{ files: UploadedFile[]; fieldName: string }>();
  fields: FieldConfig[] = [];
  form: FormGroup = new FormGroup({});
  selectedOptionsMap: Record<string, string> = {};
  selectedOptionChanged = output<{ selectedValue: string; fieldName: string; formValue?: Record<string, string> }>();
  selectedRadioChanged = output<{ selectedValue: string; fieldName: string }>();
  dropdownChanged = output<{
    fieldName: string;
    value: string | null | unknown;
    formValue?: Record<string, string>;
  }>();
  isLoading = input<boolean>(false);
  shouldShowTemplate = input<boolean>(false);
  templateSourceId = input<string | null>(null);
  isSubmittedInput = input<boolean>(false);
  isSubmitted = false;
  isUpload = signal('upload');
  templates = signal<NuxeoDocument[]>([]);
  columnsItems = signal<{ id: string; fields: FieldConfig[] }[]>([]);
  private valueChangesSub?: Subscription;

  defaultsMap: Record<string, DefaultValueUnion> = {};

  editorConfig: AngularEditorConfig = {
    editable: true,
    spellcheck: true,
    height: 'auto',
    minHeight: '180px',
    maxHeight: 'auto',
    width: 'auto',
    minWidth: '0',
    placeholder: '',
    translate: 'yes',
    enableToolbar: true,
    showToolbar: true,
    defaultParagraphSeparator: 'p',
    defaultFontName: '',
    defaultFontSize: '',
    toolbarPosition: 'top',
    sanitize: true,
    fonts: [
      { class: 'arial', name: 'Arial' },
      { class: 'times-new-roman', name: 'Times New Roman' },
      { class: 'calibri', name: 'Calibri' },
      { class: 'comic-sans-ms', name: 'Comic Sans MS' },
    ],
    customClasses: [
      { name: 'quote', class: 'quote' },
      { name: 'redText', class: 'redText' },
      { name: 'titleText', class: 'titleText', tag: 'h1' },
    ],
    toolbarHiddenButtons: [['insertImage', 'insertVideo', 'toggleEditorMode']],
  };

  getEditorConfig(field?: FieldConfig): AngularEditorConfig {
    const placeholder = field?.placeholder ?? '';
    const baseConfig: AngularEditorConfig = { ...this.editorConfig, placeholder };

    if (field?.props?.readonly) {
      return {
        ...baseConfig,
        editable: false,
        showToolbar: false,
      };
    }

    return baseConfig;
  }

  constructor() {
    effect(() => {
      const fields = this.config();
      if (fields?.length) {
        this.pruneDefaultsMap(fields);
        this.form = this.createFormFromConfig(fields);

        this.valueChangesSub?.unsubscribe();
        this.valueChangesSub = this.form.valueChanges.subscribe(data => {
          this.changeForm.emit(data);
        });

        this.setupHandlingFormatListeners();
      }
    });

    effect(() => {
      const cols = this.columns();
      const config = this.config();
      const firstColumnSize = this.firstColumnSize();

      const result: { id: string; fields: FieldConfig[] }[] = [];

      let remaining = config;
      let remainingCols = cols;

      if (firstColumnSize && firstColumnSize > 0) {
        result.push({ id: 'col-0', fields: config.slice(0, firstColumnSize) });
        remaining = config.slice(firstColumnSize);
        remainingCols = cols - 1;
      }

      if (remainingCols > 0) {
        const size = Math.ceil(remaining.length / remainingCols);

        for (let i = 0; i < remainingCols; i++) {
          const start = i * size;
          const end = start + size;
          result.push({ id: `col-${i + 1}`, fields: remaining.slice(start, end) });
        }
      }

      if (cols <= 1 && result.length === 0) {
        result.push({ id: 'col-0', fields: config });
      }
      this.columnsItems.set(result);
    });
  }

  private pruneDefaultsMap(fields: FieldConfig[]): void {
    const allowed = new Set(fields.map(field => field.name));
    Object.keys(this.defaultsMap).forEach(name => {
      if (!allowed.has(name)) {
        delete this.defaultsMap[name];
      }
    });
  }

  ngOnInit(): void {
    this.form = this.createFormFromConfig(this.config());
    this.setupHandlingFormatListeners();
    this.getTemplates();

    this.valueChangesSub = this.form.valueChanges.subscribe(data => {
      this.changeForm.emit(data);
    });
  }

  getTemplates() {
    const documentId = this.templateSourceId();
    if (!this.shouldShowTemplate() || !documentId) return;

    this.nuxeoApi
      .filterTemplatesByType(documentId)
      .pipe(
        map(result => result.entries),
        catchError(() => of([] as NuxeoDocument[]))
      )
      .subscribe(templates => this.templates.set(templates));
  }

  createFormFromConfig(config: FieldConfig[]): FormGroup {
    const group: Record<string, FormControl> = {};

    config.forEach(field => {
      const formField = this.form?.controls?.[field.name]?.value;
      let defaultValue = formField;
      if (this.defaultsMap[field.name] !== field.defaultValue) {
        this.defaultsMap[field.name] = field.defaultValue;
        defaultValue = field.defaultValue;
      }
      group[field.name] = new FormControl(defaultValue ?? null, field.validators || []);
    });

    if (this.shouldShowTemplate()) {
      const uploadFile = config.find(el => el.name === 'uploadFile');
      group['template'] = new FormControl(uploadFile?.defaultValue ? uploadFile.defaultValue : null);
    }

    return new FormGroup(group);
  }

  private setupHandlingFormatListeners() {
    const handlingFormatControl = this.form.get('handlingFormat');
    const rubrikControl = this.form.get('rubrik');
    const fysiskForvaringsplatsControl = this.form.get('fysisk_forvaringsplats');
    const forvaringsmediaControl = this.form.get('forvaringsmedia');

    if (!handlingFormatControl) {
      return;
    }

    const applyRubrikValidators = (format: string | null | undefined) => {
      if (!rubrikControl) return;
      if (format === 'paper') {
        rubrikControl.clearValidators();
      } else {
        rubrikControl.setValidators([Validators.required]);
      }
      rubrikControl.updateValueAndValidity({ emitEvent: false });
    };

    const applyFysiskForvaringsplatsValidators = (format: string | null | undefined) => {
      if (!fysiskForvaringsplatsControl) return;
      if (format === 'paper') {
        fysiskForvaringsplatsControl.setValidators([Validators.required]);
      } else {
        fysiskForvaringsplatsControl.clearValidators();
      }
      fysiskForvaringsplatsControl.updateValueAndValidity({ emitEvent: false });
    };

    const applyForvaringsmediaValidators = (format: string | null | undefined) => {
      if (!forvaringsmediaControl) return;
      if (format === 'paper') {
        forvaringsmediaControl.setValidators([Validators.required]);
      } else {
        forvaringsmediaControl.clearValidators();
      }
      forvaringsmediaControl.updateValueAndValidity({ emitEvent: false });
    };

    if (rubrikControl) {
      applyRubrikValidators(handlingFormatControl.value);
    }
    applyFysiskForvaringsplatsValidators(handlingFormatControl.value);
    applyForvaringsmediaValidators(handlingFormatControl.value);

    handlingFormatControl.valueChanges.subscribe(value => {
      if (rubrikControl) {
        applyRubrikValidators(value);
      }
      applyFysiskForvaringsplatsValidators(value);
      applyForvaringsmediaValidators(value);
    });
  }

  uploadFile(file: UploadedFile[], fieldName: string) {
    this.uploadFileOutput.emit({ files: file, fieldName });
  }

  changeRadioOption(fieldName: string, selectedValue: string) {
    this.selectedRadioChanged.emit({ selectedValue, fieldName });
  }

  changeSelectedOptions(selected: string, fieldName: string) {
    if (fieldName === 'secretKlass') {
      return;
    }
    const control = this.config().find(el => el.name === fieldName);
    const rawValue = this.form.get(fieldName)?.value;
    const selectedValue = Array.isArray(rawValue)
      ? (rawValue[0]?.id ?? rawValue[0] ?? selected)
      : typeof rawValue === 'object' && rawValue !== null && 'id' in rawValue
        ? (rawValue.id ?? selected)
        : (rawValue ?? selected);

    this.selectedOptionChanged.emit({ selectedValue: selectedValue, fieldName: fieldName, formValue: this.form.value });
    if (!control?.options) {
      this.selectedOptionsMap[fieldName] = '';
      return;
    }

    const matchedOption = control.options.find(el => el.id === selectedValue);

    this.selectedOptionsMap[fieldName] = matchedOption?.label ?? '';
  }

  submit() {
    this.isSubmitted = true;

    if (this.form && this.form.valid) {
      const componentFields = this.config().filter(el => el.type === 'component');
      const componentValues: Record<string, unknown> = {};

      componentFields.forEach(el => {
        const fieldName = el?.name;
        if (fieldName) {
          if (typeof el.props?.tableFields === 'function') {
            componentValues[fieldName] = el.props.tableFields();
          }
        }
      });
      const result = { ...this.form.value, ...componentValues };

      this.formResult.emit(result);
    } else {
      this.formNotValid.emit();
    }
  }

  getSelectFilterOptions(field: FieldConfig) {
    const optionsSignal = field.props?.optionsSignal as (() => unknown) | undefined;
    if (optionsSignal) {
      const signalOptions = optionsSignal() as FieldConfig['options'];
      return signalOptions;
    }
    return field.options;
  }

  getSelectFilterValue(field: FieldConfig) {
    const rawValue = this.form.get(field.name)?.value;
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

  isRequired(field: FieldConfig): boolean {
    if (field.name === 'rubrik' && this.form.get('handlingFormat')?.value === 'paper') {
      return false;
    }
    if (
      (field.name === 'fysisk_forvaringsplats' || field.name === 'forvaringsmedia') &&
      this.form.get('handlingFormat')?.value === 'paper'
    ) {
      return true;
    }
    return !!field?.validators?.some(validator => validator === Validators.required);
  }
}
