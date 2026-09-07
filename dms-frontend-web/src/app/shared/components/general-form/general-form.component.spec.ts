import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Validators } from '@angular/forms';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { GeneralFormComponent } from './general-form.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { FieldConfig } from './general-form.types';
import { makeNuxeoDocument, makeSearchResult } from '@app/shared/testing/mock-factories';
import { UploadedFile } from '@app/shared/components/file-upload/file-upload.component';
import { TemplateSourceProperties } from '@app/shared/api/nuxeo-api.types';

function makeUploadedFile(name: string, id = 'f1'): UploadedFile {
  return Object.assign(new File(['content'], name), { id });
}

function makeField(overrides: Partial<FieldConfig> = {}): FieldConfig {
  return {
    name: 'field1',
    type: 'input',
    label: 'Field 1',
    defaultValue: '',
    ...overrides,
  } as FieldConfig;
}

describe('GeneralFormComponent', () => {
  let component: GeneralFormComponent;
  let fixture: ComponentFixture<GeneralFormComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', ['getMessagesJSON', 'filterTemplatesByType']);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.filterTemplatesByType.and.returnValue(of(makeSearchResult({ entries: [] })));

    await TestBed.configureTestingModule({
      imports: [GeneralFormComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    })
      .overrideTemplate(GeneralFormComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(GeneralFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('config', []);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('does not call filterTemplatesByType when shouldShowTemplate is false', () => {
      expect(apiSpy.filterTemplatesByType).not.toHaveBeenCalled();
    });

    it('does not call filterTemplatesByType when shouldShowTemplate is true but templateSourceId is missing', () => {
      fixture.componentRef.setInput('shouldShowTemplate', true);
      component.ngOnInit();
      expect(apiSpy.filterTemplatesByType).not.toHaveBeenCalled();
    });

    it('calls filterTemplatesByType with templateSourceId when shouldShowTemplate is true', () => {
      fixture.componentRef.setInput('shouldShowTemplate', true);
      fixture.componentRef.setInput('templateSourceId', 'parent-1');
      component.ngOnInit();
      expect(apiSpy.filterTemplatesByType).toHaveBeenCalledWith('parent-1');
    });

    it('creates form from config', () => {
      fixture.componentRef.setInput('config', [makeField({ name: 'title', defaultValue: 'Hello' })]);
      fixture.detectChanges();
      component.ngOnInit();
      expect(component.form.get('title')?.value).toBe('Hello');
    });
  });

  describe('createFormFromConfig', () => {
    it('creates form controls for each field', () => {
      const config: FieldConfig[] = [
        makeField({ name: 'name', defaultValue: 'Alice' }),
        makeField({ name: 'email', defaultValue: 'alice@test.com' }),
      ];
      const form = component.createFormFromConfig(config);
      expect(form.get('name')?.value).toBe('Alice');
      expect(form.get('email')?.value).toBe('alice@test.com');
    });

    it('uses null when defaultValue is undefined', () => {
      const config: FieldConfig[] = [makeField({ name: 'field1', defaultValue: undefined })];
      const form = component.createFormFromConfig(config);
      expect(form.get('field1')?.value).toBeNull();
    });

    it('adds template control when shouldShowTemplate is true', () => {
      fixture.componentRef.setInput('shouldShowTemplate', true);
      const config: FieldConfig[] = [makeField({ name: 'uploadFile', defaultValue: 'template-uid' })];
      const form = component.createFormFromConfig(config);
      expect(form.get('template')?.value).toBe('template-uid');
    });

    it('applies validators from field', () => {
      const config: FieldConfig[] = [makeField({ name: 'required_field', validators: [Validators.required] })];
      const form = component.createFormFromConfig(config);
      expect(form.get('required_field')?.hasValidator(Validators.required)).toBeTrue();
    });
  });

  describe('getSelectFilterOptions', () => {
    it('returns field options when no optionsSignal', () => {
      const field = makeField({ options: [{ id: 'opt1', label: 'Option 1' }] });
      expect(component.getSelectFilterOptions(field)).toEqual([{ id: 'opt1', label: 'Option 1' }]);
    });

    it('calls optionsSignal when present', () => {
      const options = [{ id: 'sig-opt', label: 'Signal Option' }];
      const field = makeField({
        props: { optionsSignal: () => options },
      });
      expect(component.getSelectFilterOptions(field)).toEqual(options);
    });
  });

  describe('getSelectFilterValue', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('config', [
        makeField({ name: 'mySelect', options: [{ id: 'opt1', label: 'Opt 1' }] }),
      ]);
      fixture.detectChanges();
      component.ngOnInit();
    });

    it('returns empty array when field is null', () => {
      const field = makeField({ name: 'mySelect', options: [] });
      expect(component.getSelectFilterValue(field)).toEqual([]);
    });

    it('returns matched option for string value', () => {
      component.form.get('mySelect')?.setValue('opt1');
      const field = makeField({ name: 'mySelect', options: [{ id: 'opt1', label: 'Opt 1' }] });
      const result = component.getSelectFilterValue(field);
      expect(result).toEqual([{ id: 'opt1', label: 'Opt 1' }]);
    });

    it('returns synthetic option when not found', () => {
      component.form.get('mySelect')?.setValue('unknown');
      const field = makeField({ name: 'mySelect', options: [] });
      const result = component.getSelectFilterValue(field);
      expect(result).toEqual([{ id: 'unknown', label: 'unknown' }]);
    });
  });

  describe('isRequired', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('config', [
        makeField({ name: 'handlingFormat', defaultValue: 'digital' }),
        makeField({ name: 'rubrik', validators: [Validators.required] }),
        makeField({ name: 'fysisk_forvaringsplats' }),
        makeField({ name: 'forvaringsmedia' }),
      ]);
      fixture.detectChanges();
      component.ngOnInit();
    });

    it('returns true for required field', () => {
      const field = makeField({ name: 'rubrik', validators: [Validators.required] });
      component.form.get('handlingFormat')?.setValue('digital');
      expect(component.isRequired(field)).toBeTrue();
    });

    it('returns false for rubrik when handlingFormat is paper', () => {
      component.form.get('handlingFormat')?.setValue('paper');
      const field = makeField({ name: 'rubrik', validators: [Validators.required] });
      expect(component.isRequired(field)).toBeFalse();
    });

    it('returns true for fysisk_forvaringsplats when handlingFormat is paper', () => {
      component.form.get('handlingFormat')?.setValue('paper');
      const field = makeField({ name: 'fysisk_forvaringsplats' });
      expect(component.isRequired(field)).toBeTrue();
    });

    it('returns false for non-required field', () => {
      const field = makeField({ name: 'optional', validators: [] });
      expect(component.isRequired(field)).toBeFalse();
    });
  });

  describe('submit', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('config', [makeField({ name: 'name', defaultValue: 'Alice' })]);
      fixture.detectChanges();
      component.ngOnInit();
    });

    it('emits formResult when form is valid', () => {
      const emitted: unknown[] = [];
      component.formResult.subscribe(r => emitted.push(r));
      component.submit();
      expect(emitted.length).toBe(1);
      expect((emitted[0] as Record<string, unknown>)['name']).toBe('Alice');
    });

    it('emits formNotValid when form is invalid', () => {
      fixture.componentRef.setInput('config', [
        makeField({ name: 'required_field', validators: [Validators.required], defaultValue: null }),
      ]);
      fixture.detectChanges();
      component.ngOnInit();

      const emitted: unknown[] = [];
      component.formNotValid.subscribe(() => emitted.push(true));
      component.submit();
      expect(emitted.length).toBe(1);
    });

    it('sets isSubmitted to true', () => {
      component.submit();
      expect(component.isSubmitted).toBeTrue();
    });

    it('includes component field values from tableFields', () => {
      const tableFieldsSignal = () => [{ id: 'contact-1' }];
      fixture.componentRef.setInput('config', [
        makeField({ name: 'contacts', type: 'component', props: { tableFields: tableFieldsSignal } }),
      ]);
      fixture.detectChanges();
      component.ngOnInit();
      const emitted: unknown[] = [];
      component.formResult.subscribe(r => emitted.push(r));
      component.submit();
      expect((emitted[0] as Record<string, unknown>)?.['contacts']).toEqual([{ id: 'contact-1' }]);
    });
  });

  describe('changeSelectedOptions', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('config', [
        makeField({
          name: 'myDropdown',
          options: [{ id: 'opt1', label: 'Option 1' }],
        }),
      ]);
      fixture.detectChanges();
      component.ngOnInit();
    });

    it('emits selectedOptionChanged', () => {
      const emitted: unknown[] = [];
      component.selectedOptionChanged.subscribe(e => emitted.push(e));
      component.form.get('myDropdown')?.setValue('opt1');
      component.changeSelectedOptions('opt1', 'myDropdown');
      expect(emitted.length).toBe(1);
    });

    it('does nothing for secretKlass fieldName', () => {
      const emitted: unknown[] = [];
      component.selectedOptionChanged.subscribe(e => emitted.push(e));
      component.changeSelectedOptions('val', 'secretKlass');
      expect(emitted.length).toBe(0);
    });

    it('sets selectedOptionsMap from matched option', () => {
      component.form.get('myDropdown')?.setValue('opt1');
      component.changeSelectedOptions('opt1', 'myDropdown');
      expect(component.selectedOptionsMap['myDropdown']).toBe('Option 1');
    });
  });

  describe('changeRadioOption', () => {
    it('emits selectedRadioChanged', () => {
      const emitted: unknown[] = [];
      component.selectedRadioChanged.subscribe(e => emitted.push(e));
      component.changeRadioOption('riktning', 'inkommande');
      expect(emitted).toContain(jasmine.objectContaining({ fieldName: 'riktning', selectedValue: 'inkommande' }));
    });
  });

  describe('uploadFile', () => {
    it('emits uploadFileOutput', () => {
      const emitted: unknown[] = [];
      component.uploadFileOutput.subscribe(e => emitted.push(e));
      const files = [makeUploadedFile('test.pdf')];
      component.uploadFile(files, 'uploadFile');
      expect(emitted).toContain(jasmine.objectContaining({ files, fieldName: 'uploadFile' }));
    });
  });

  describe('columnsItems signal', () => {
    it('creates single column by default', () => {
      fixture.componentRef.setInput('config', [makeField({ name: 'f1' }), makeField({ name: 'f2' })]);
      fixture.componentRef.setInput('columns', 1);
      fixture.detectChanges();
      expect(component.columnsItems().length).toBeGreaterThanOrEqual(1);
    });

    it('splits into multiple columns when columns > 1', () => {
      fixture.componentRef.setInput('config', [
        makeField({ name: 'f1' }),
        makeField({ name: 'f2' }),
        makeField({ name: 'f3' }),
        makeField({ name: 'f4' }),
      ]);
      fixture.componentRef.setInput('columns', 2);
      fixture.detectChanges();
      expect(component.columnsItems().length).toBe(2);
    });

    it('applies firstColumnSize', () => {
      fixture.componentRef.setInput('config', [
        makeField({ name: 'f1' }),
        makeField({ name: 'f2' }),
        makeField({ name: 'f3' }),
      ]);
      fixture.componentRef.setInput('columns', 2);
      fixture.componentRef.setInput('firstColumnSize', 1);
      fixture.detectChanges();
      const colItems = component.columnsItems();
      expect(colItems[0].fields.length).toBe(1);
    });
  });

  describe('getEditorConfig', () => {
    it('returns config with placeholder from field', () => {
      const field = makeField({ placeholder: 'Enter text here', type: 'richtext' });
      const config = component.getEditorConfig(field);
      expect(config.placeholder).toBe('Enter text here');
    });

    it('returns non-editable config when field is readonly', () => {
      const field = makeField({ props: { readonly: true } });
      const config = component.getEditorConfig(field);
      expect(config.editable).toBeFalse();
      expect(config.showToolbar).toBeFalse();
    });

    it('returns editable config by default', () => {
      const config = component.getEditorConfig(makeField());
      expect(config.editable).toBeTrue();
    });
  });

  describe('templates signal', () => {
    it('defaults to empty array', () => {
      expect(component.templates()).toEqual([]);
    });

    it('populates from filterTemplatesByType response', () => {
      fixture.componentRef.setInput('shouldShowTemplate', true);
      fixture.componentRef.setInput('templateSourceId', 'parent-1');
      apiSpy.filterTemplatesByType.and.returnValue(
        of(
          makeSearchResult({
            entries: [
              makeNuxeoDocument<TemplateSourceProperties>({
                uid: 't1',
                title: 'Template 1',
              }),
            ],
          })
        )
      );
      component.getTemplates();
      expect(component.templates().length).toBe(1);
    });

    it('stays empty when filterTemplatesByType errors', () => {
      fixture.componentRef.setInput('shouldShowTemplate', true);
      fixture.componentRef.setInput('templateSourceId', 'parent-1');
      apiSpy.filterTemplatesByType.and.returnValue(throwError(() => new Error('400')));
      component.getTemplates();
      expect(component.templates()).toEqual([]);
    });
  });

  describe('setupHandlingFormatListeners', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('config', [
        makeField({ name: 'handlingFormat', defaultValue: 'digital' }),
        makeField({ name: 'rubrik', validators: [Validators.required] }),
        makeField({ name: 'fysisk_forvaringsplats' }),
        makeField({ name: 'forvaringsmedia' }),
      ]);
      fixture.detectChanges();
      component.ngOnInit();
    });

    it('clears rubrik validator when handlingFormat changes to paper', () => {
      component.form.get('handlingFormat')?.setValue('paper');
      const hasRequired = component.form.get('rubrik')?.hasValidator(Validators.required);
      expect(hasRequired).toBeFalse();
    });

    it('requires rubrik when handlingFormat changes back to digital', () => {
      component.form.get('handlingFormat')?.setValue('paper');
      component.form.get('handlingFormat')?.setValue('digital');
      const hasRequired = component.form.get('rubrik')?.hasValidator(Validators.required);
      expect(hasRequired).toBeTrue();
    });

    it('requires fysisk_forvaringsplats when paper format', () => {
      component.form.get('handlingFormat')?.setValue('paper');
      const hasRequired = component.form.get('fysisk_forvaringsplats')?.hasValidator(Validators.required);
      expect(hasRequired).toBeTrue();
    });
  });
});
