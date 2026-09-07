import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Validators } from '@angular/forms';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { EditFormComponent } from './edit-form.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { EditGroup, GroupField } from '../general-form/general-form.types';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { NUXEO_VOCAB_IDS } from '@app/shared/constants/nuxeo-vocabulary-ids';
import { ArendeExtendedProperties, HandlingExtendedProperties } from '@app/shared/api/nuxeo-api.types';
import { makeNuxeoDocument } from '@app/shared/testing/mock-factories';

// Loose shape used to author test fixtures; the component only reads `name`/`__type`/etc.
// at runtime and doesn't enforce the GroupField literal-name unions, so we widen here and
// cast once at the makeConfig boundary instead of repeating broad casts through every test.
type TestGroupField = Record<string, unknown> & { name: string };
type TestEditGroup = Omit<EditGroup, 'groupFields'> & { groupFields: TestGroupField[] };

function makeDoc(type = 'Arende', extra: Record<string, unknown> = {}) {
  return makeNuxeoDocument<ArendeExtendedProperties | HandlingExtendedProperties>({
    uid: 'doc-1',
    type,
    title: 'Test',
    parentRef: 'parent-ref',
    state: 'project',
    properties: {
      [NUXEO_SCHEMA_FIELDS.arende.arendetyp]: null,
      [NUXEO_SCHEMA_FIELDS.dmsmetadatadefinition.faltdefinition]: [],
      [NUXEO_SCHEMA_FIELDS.dmsmetadataanpassad.falt]: [],
      ...extra,
    } as unknown as ArendeExtendedProperties | HandlingExtendedProperties,
  });
}

function makeConfig(overrides: Partial<TestEditGroup>[] = []): EditGroup[] {
  const groups: TestEditGroup[] = overrides.length
    ? overrides.map(o => ({
        groupId: o.groupId ?? 'group1',
        groupFields: o.groupFields ?? [],
        ...o,
      }))
    : [
        {
          groupId: 'group1',
          groupFields: [{ name: 'title', type: 'text', label: 'Title', defaultValue: 'Hello' }],
        },
      ];
  return groups as unknown as EditGroup[];
}

function makeField(overrides: Record<string, unknown> & { name: string }): GroupField {
  return overrides as unknown as GroupField;
}

describe('EditFormComponent', () => {
  let component: EditFormComponent;
  let fixture: ComponentFixture<EditFormComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', ['getMessagesJSON', 'getDocumentById']);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getDocumentById.and.returnValue(of(makeNuxeoDocument({ uid: 'klass-1' })));

    await TestBed.configureTestingModule({
      imports: [EditFormComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    })
      .overrideTemplate(EditFormComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(EditFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('doc', makeDoc());
    fixture.componentRef.setInput('config', makeConfig());
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Lagrumsbeskrivning must be shown for BOTH Svag and Stark sekretess on a Handling,
  // mirroring the Ärende behaviour.
  describe('lagrum visibility on a Handling', () => {
    function setupHandling(initialSecret: string | null = null) {
      fixture = TestBed.createComponent(EditFormComponent);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('doc', makeDoc('Handling'));
      fixture.componentRef.setInput(
        'config',
        makeConfig([
          {
            groupId: 'secret',
            groupFields: [
              { name: 'secret', type: 'dropdown', label: 'Sekretess', defaultValue: initialSecret },
              { name: 'lagrumsbeskrivning', type: 'dropdown-search', label: 'Lagrumsbeskrivning' },
            ],
          },
        ])
      );
      fixture.detectChanges();
    }

    function lagrumIsHidden(): boolean | undefined {
      const groups = component.newConfig() ?? component.config();
      return groups.find(group => group.groupId === 'secret')?.groupFields.find(f => f.name === 'lagrumsbeskrivning')
        ?.isHidden;
    }

    function setSecret(value: string) {
      component.form.get('secret.secret')!.setValue(value);
    }

    it('shows lagrumsbeskrivning when secret changes to Svag sekretess', () => {
      setupHandling();
      setSecret(NUXEO_VOCAB_IDS.sekretess.svagSekretess);
      expect(lagrumIsHidden()).toBeFalse();
    });

    it('shows lagrumsbeskrivning when secret changes to Stark sekretess', () => {
      setupHandling();
      setSecret(NUXEO_VOCAB_IDS.sekretess.starkSekretess);
      expect(lagrumIsHidden()).toBeFalse();
    });

    it('hides lagrumsbeskrivning when secret changes to Ingen sekretess', () => {
      setupHandling(NUXEO_VOCAB_IDS.sekretess.starkSekretess);
      setSecret(NUXEO_VOCAB_IDS.sekretess.ingenSekretess);
      expect(lagrumIsHidden()).toBeTrue();
    });

    it('clears the lagrumsbeskrivning value when secret changes to Ingen sekretess', () => {
      // Regression: hiding the field previously only cleared its validators, leaving
      // the stale selection in the form so it was still submitted on save.
      setupHandling(NUXEO_VOCAB_IDS.sekretess.starkSekretess);
      component.form.get('secret.lagrumsbeskrivning')!.setValue([{ id: 'lag-1', label: 'Lag 1' }]);
      setSecret(NUXEO_VOCAB_IDS.sekretess.ingenSekretess);
      expect(component.form.get('secret.lagrumsbeskrivning')!.value).toBeNull();
    });

    it('requires lagrumsbeskrivning when secret is Svag sekretess', () => {
      setupHandling();
      setSecret(NUXEO_VOCAB_IDS.sekretess.svagSekretess);
      const lagrumCtrl = component.form.get('secret.lagrumsbeskrivning')!;
      expect(lagrumCtrl.hasValidator(Validators.required)).toBeTrue();
    });

    it('keeps lagrumsbeskrivning visible after the handlingsriktning changes', () => {
      // Regression: setNewConfigAccordingToRiktning() rebuilds newConfig from the pristine
      // config() input, which must not discard the secret-driven lagrum visibility.
      fixture = TestBed.createComponent(EditFormComponent);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('doc', makeDoc('Handling'));
      fixture.componentRef.setInput(
        'config',
        makeConfig([
          {
            groupId: 'handlingDetails',
            groupFields: [{ name: 'handlingsriktning', type: 'dropdown', label: 'Riktning', defaultValue: null }],
          },
          {
            groupId: 'secret',
            groupFields: [
              { name: 'secret', type: 'dropdown', label: 'Sekretess', defaultValue: null },
              { name: 'lagrumsbeskrivning', type: 'dropdown-search', label: 'Lagrumsbeskrivning', isHidden: true },
            ],
          },
        ])
      );
      fixture.detectChanges();

      setSecret(NUXEO_VOCAB_IDS.sekretess.starkSekretess);
      expect(lagrumIsHidden()).withContext('shown after choosing Stark sekretess').toBeFalse();

      component.form.get('handlingDetails.handlingsriktning')!.setValue(NUXEO_VOCAB_IDS.arendeRiktning.intern);
      expect(lagrumIsHidden()).withContext('still shown after changing riktning').toBeFalse();
    });
  });

  describe('createFormFromEditConfig', () => {
    it('builds FormGroup with nested groups', () => {
      const config = makeConfig([
        {
          groupId: 'details',
          groupFields: [
            { name: 'name', type: 'text', label: 'Name', defaultValue: 'Alice' },
            { name: 'age', type: 'text', label: 'Age', defaultValue: '30' },
          ],
        },
      ]);
      const result = component.createFormFromEditConfig(config);
      expect(result.get('details.name')?.value).toBe('Alice');
      expect(result.get('details.age')?.value).toBe('30');
    });

    it('uses empty string when no defaultValue', () => {
      const config = makeConfig([
        {
          groupId: 'g1',
          groupFields: [{ name: 'field1', type: 'text', label: 'F1' }],
        },
      ]);
      const result = component.createFormFromEditConfig(config);
      expect(result.get('g1.field1')?.value).toBe('');
    });

    it('sets validators from field', () => {
      const config = makeConfig([
        {
          groupId: 'g1',
          groupFields: [
            {
              name: 'required_field',
              type: 'text',
              label: 'Required',
              validators: [Validators.required],
            },
          ],
        },
      ]);
      const result = component.createFormFromEditConfig(config);
      const ctrl = result.get('g1.required_field');
      expect(ctrl?.hasValidator(Validators.required)).toBeTrue();
    });

    it('populates internContacts from contactInt field', () => {
      fixture.componentRef.setInput('internalContactsData', [
        { id: 'alice-1', name: 'Alice', email: 'alice@test.com', org: 'OrgA', type: 'handlaggare' },
      ]);
      const config = makeConfig([
        {
          groupId: 'g1',
          groupFields: [{ name: 'contact', type: 'component', label: 'C', __type: 'contactInt' }],
        },
      ]);
      component.createFormFromEditConfig(config);
      expect(component.internContacts().length).toBe(1);
    });

    it('populates motpartContacts from contactMotpart field', () => {
      fixture.componentRef.setInput('motpartContactsData', [{ motpart: 'mp-1' }]);
      const config = makeConfig([
        {
          groupId: 'g1',
          groupFields: [{ name: 'motpart', type: 'component', label: 'M', __type: 'contactMotpart' }],
        },
      ]);
      component.createFormFromEditConfig(config);
      expect(component.motpartContacts().length).toBe(1);
    });

    it('populates arendetyp from arendetypAutocomplete field', () => {
      const config = makeConfig([
        {
          groupId: 'g1',
          groupFields: [
            {
              name: 'arendetyp',
              type: 'component',
              label: 'Ärendetyp',
              __type: 'arendetypAutocomplete',
              defaultValue: [{ id: 'arende-1', value: 'arende-1', label: 'Typ 1' }],
            },
          ],
        },
      ]);
      component.createFormFromEditConfig(config);
      expect(component.arendetyp().length).toBe(1);
    });

    it('populates internArendereferens from defaultValue', () => {
      const config = makeConfig([
        {
          groupId: 'g1',
          groupFields: [
            {
              name: 'refs',
              type: 'component',
              label: 'Refs',
              __type: 'internArendereferens',
              defaultValue: [{ arende: { uid: 'a1' }, referenstyp: { id: 'typ1' }, referenskommentar: 'note' }],
            },
          ],
        },
      ]);
      component.createFormFromEditConfig(config);
      expect(component.internArendereferens().length).toBe(1);
    });

    it('populates externReferens from defaultValue', () => {
      const config = makeConfig([
        {
          groupId: 'g1',
          groupFields: [
            {
              name: 'refs',
              type: 'component',
              label: 'Refs',
              __type: 'externReferens',
              defaultValue: [{ referens: 'https://example.com', referenskommentar: 'link' }],
            },
          ],
        },
      ]);
      component.createFormFromEditConfig(config);
      expect(component.externReferens().length).toBe(1);
    });

    it('populates externContacts from contactExt field', () => {
      const config = makeConfig([
        {
          groupId: 'g1',
          groupFields: [
            {
              name: 'extContact',
              type: 'component',
              label: 'Ext',
              __type: 'contactExt',
              defaultValue: [{ namn: 'Bob', email: 'bob@test.com', telefon: '123', adress: 'Addr 1' }],
            },
          ],
        },
      ]);
      component.createFormFromEditConfig(config);
      expect(component.externContacts().length).toBe(1);
    });

    it('populates avsandare from defaultValue', () => {
      const config = makeConfig([
        {
          groupId: 'g1',
          groupFields: [
            {
              name: 'avsandare',
              type: 'component',
              label: 'Avsändare',
              __type: 'avsandare',
              defaultValue: [
                { namn: 'Alice', email: 'alice@test.com', telefon: '555', adress: 'Addr', organisation: 'Org' },
              ],
            },
          ],
        },
      ]);
      component.createFormFromEditConfig(config);
      expect(component.avsandare().length).toBe(1);
    });

    it('populates mottagare from defaultValue', () => {
      const config = makeConfig([
        {
          groupId: 'g1',
          groupFields: [
            {
              name: 'mottagare',
              type: 'component',
              label: 'Mottagare',
              __type: 'mottagare',
              defaultValue: [
                { namn: 'Carl', email: 'carl@test.com', telefon: '999', adress: 'Addr 2', foretag: 'Foretag' },
              ],
            },
          ],
        },
      ]);
      component.createFormFromEditConfig(config);
      expect(component.mottagare().length).toBe(1);
    });

    it('populates internHandlingsreferens from defaultValue', () => {
      const config = makeConfig([
        {
          groupId: 'g1',
          groupFields: [
            {
              name: 'href',
              type: 'component',
              label: 'H Refs',
              __type: 'internHandlingsreferens',
              defaultValue: [{ handling: { uid: 'h1' }, referenstyp: { id: 'typh' }, referenskommentar: 'hn' }],
            },
          ],
        },
      ]);
      component.createFormFromEditConfig(config);
      expect(component.internHandlingsreferens().length).toBe(1);
    });
  });

  describe('getSelectFilterOptions', () => {
    it('returns options from field', () => {
      const field = makeField({ name: 'f', options: [{ id: 'opt1', label: 'Option 1' }] });
      expect(component.getSelectFilterOptions(field)).toEqual([{ id: 'opt1', label: 'Option 1' }]);
    });

    it('calls optionsSignal when present', () => {
      const options = [{ id: 'opt2', label: 'Option 2' }];
      const field = makeField({ name: 'f', props: { optionsSignal: () => options } });
      expect(component.getSelectFilterOptions(field)).toEqual(options);
    });
  });

  describe('getSelectFilterValue', () => {
    beforeEach(() => {
      const config = makeConfig([
        {
          groupId: 'g1',
          groupFields: [{ name: 'myField', type: 'dropdown', label: 'My Field', defaultValue: '' }],
        },
      ]);
      fixture.componentRef.setInput('config', config);
      fixture.detectChanges();
      component.ngOnInit();
    });

    it('returns empty array when field is empty', () => {
      const field = makeField({ name: 'myField', options: [{ id: 'opt1', label: 'Opt 1' }] });
      const result = component.getSelectFilterValue('g1', field);
      expect(result).toEqual([]);
    });

    it('returns matched option for string value', () => {
      component.form.get('g1.myField')?.setValue('opt1');
      const field = makeField({ name: 'myField', options: [{ id: 'opt1', label: 'Opt 1' }] });
      const result = component.getSelectFilterValue('g1', field);
      expect(result).toEqual([{ id: 'opt1', label: 'Opt 1' }]);
    });

    it('returns synthetic option when id not found in options', () => {
      component.form.get('g1.myField')?.setValue('unknown-id');
      const field = makeField({ name: 'myField', options: [{ id: 'opt1', label: 'Opt 1' }] });
      const result = component.getSelectFilterValue('g1', field);
      expect(result).toEqual([{ id: 'unknown-id', label: 'unknown-id' }]);
    });

    it('handles object value with id property', () => {
      component.form.get('g1.myField')?.setValue({ id: 'opt1', label: 'Existing' });
      const field = makeField({ name: 'myField', options: [{ id: 'opt1', label: 'Opt 1' }] });
      const result = component.getSelectFilterValue('g1', field);
      expect(result).toEqual([{ id: 'opt1', label: 'Opt 1' }]);
    });
  });

  describe('onSelectFilter', () => {
    beforeEach(() => {
      const config = makeConfig([
        {
          groupId: 'g1',
          groupFields: [{ name: 'mySelect', type: 'dropdown', label: 'Select', defaultValue: '' }],
        },
      ]);
      fixture.componentRef.setInput('config', config);
      fixture.detectChanges();
      component.ngOnInit();
    });

    it('sets array value when detail is array', () => {
      const field = makeField({ name: 'mySelect' });
      component.onSelectFilter(['a', 'b'], 'g1', field);
      expect(component.form.get('g1.mySelect')?.value).toEqual(['a', 'b']);
    });

    it('sets empty array when detail is not array', () => {
      const field = makeField({ name: 'mySelect' });
      component.onSelectFilter('single', 'g1', field);
      expect(component.form.get('g1.mySelect')?.value).toEqual([]);
    });

    it('does nothing when control not found', () => {
      const field = makeField({ name: 'nonexistent' });
      expect(() => component.onSelectFilter(['x'], 'g1', field)).not.toThrow();
    });
  });

  describe('shouldRenderComponent', () => {
    it('returns true for internArendereferens', () => {
      expect(component.shouldRenderComponent(makeField({ name: 'f', __type: 'internArendereferens' }))).toBeTrue();
    });

    it('returns true for externReferens', () => {
      expect(component.shouldRenderComponent(makeField({ name: 'f', __type: 'externReferens' }))).toBeTrue();
    });

    it('returns true for internHandlingsreferens', () => {
      expect(component.shouldRenderComponent(makeField({ name: 'f', __type: 'internHandlingsreferens' }))).toBeTrue();
    });

    it('returns true for contactInt', () => {
      expect(component.shouldRenderComponent(makeField({ name: 'f', __type: 'contactInt' }))).toBeTrue();
    });

    it('returns true for contactExt', () => {
      expect(component.shouldRenderComponent(makeField({ name: 'f', __type: 'contactExt' }))).toBeTrue();
    });

    it('returns true for contactMotpart', () => {
      expect(component.shouldRenderComponent(makeField({ name: 'f', __type: 'contactMotpart' }))).toBeTrue();
    });

    it('returns true for mottagare', () => {
      expect(component.shouldRenderComponent(makeField({ name: 'f', __type: 'mottagare' }))).toBeTrue();
    });

    it('returns true for avsandare', () => {
      expect(component.shouldRenderComponent(makeField({ name: 'f', __type: 'avsandare' }))).toBeTrue();
    });

    it('returns true for arendetypAutocomplete', () => {
      expect(component.shouldRenderComponent(makeField({ name: 'f', __type: 'arendetypAutocomplete' }))).toBeTrue();
    });

    it('returns true for customMetadata', () => {
      expect(component.shouldRenderComponent(makeField({ name: 'f', __type: 'customMetadata' }))).toBeTrue();
    });

    it('returns false for unknown type', () => {
      expect(component.shouldRenderComponent(makeField({ name: 'f', __type: 'general' }))).toBeFalse();
    });
  });

  describe('getGroupClasses', () => {
    it('returns col-span-2 for big size', () => {
      const classes = component.getGroupClasses({ groupId: 'g', groupFields: [], size: 'big' });
      expect(classes).toContain('col-span-2');
    });

    it('returns col-span-full for full size', () => {
      const classes = component.getGroupClasses({ groupId: 'g', groupFields: [], size: 'full' });
      expect(classes).toContain('col-span-full');
    });

    it('returns col-span-1 for default size', () => {
      const classes = component.getGroupClasses({ groupId: 'g', groupFields: [], size: 'small' });
      expect(classes).toContain('col-span-1');
    });

    it('includes containerCssClass when set', () => {
      const classes = component.getGroupClasses({
        groupId: 'g',
        groupFields: [],
        size: 'small',
        containerCssClass: 'my-class',
      });
      expect(classes).toContain('my-class');
    });

    it('filters out null/undefined classes', () => {
      const classes = component.getGroupClasses({ groupId: 'g', groupFields: [], size: 'small' });
      expect(classes.every(c => !!c)).toBeTrue();
    });
  });

  describe('getValidationStatus', () => {
    beforeEach(() => {
      const config = makeConfig([
        {
          groupId: 'g1',
          groupFields: [
            {
              name: 'req_field',
              type: 'text',
              label: 'Required',
              defaultValue: '',
              validators: [Validators.required],
            },
          ],
        },
      ]);
      fixture.componentRef.setInput('config', config);
      fixture.detectChanges();
      component.ngOnInit();
    });

    it('returns error when field is invalid', () => {
      component.form.get('g1.req_field')?.markAsTouched();
      expect(component.getValidationStatus('g1', 'req_field')).toBe('error');
    });

    it('returns neutral when field is valid', () => {
      component.form.get('g1.req_field')?.setValue('some value');
      expect(component.getValidationStatus('g1', 'req_field')).toBe('neutral');
    });
  });

  describe('isFieldRequired', () => {
    beforeEach(() => {
      const config = makeConfig([
        {
          groupId: 'g1',
          groupFields: [
            { name: 'req_field', type: 'text', label: 'Required', validators: [Validators.required] },
            { name: 'opt_field', type: 'text', label: 'Optional' },
          ],
        },
      ]);
      fixture.componentRef.setInput('config', config);
      fixture.detectChanges();
      component.ngOnInit();
    });

    it('returns true for required field', () => {
      const field = makeField({ name: 'req_field', validators: [Validators.required] });
      expect(component.isFieldRequired('g1', field)).toBeTrue();
    });

    it('returns false for optional field', () => {
      const field = makeField({ name: 'opt_field', validators: [] });
      expect(component.isFieldRequired('g1', field)).toBeFalse();
    });

    it('returns false when groupId is empty', () => {
      const field = makeField({ name: 'req_field' });
      expect(component.isFieldRequired('', field)).toBeFalse();
    });

    it('returns false when field name is empty', () => {
      expect(component.isFieldRequired('g1', makeField({ name: '' }))).toBeFalse();
    });
  });

  describe('getProps', () => {
    it('includes parentRef and fieldName', () => {
      const field = makeField({ name: 'myField' });
      const props = component.getProps(field);
      expect(props['parentRef']).toBe('parent-ref');
      expect(props['fieldName']).toBe('myField');
    });

    it('includes refType Arende for internArendereferens', () => {
      const field = makeField({ name: 'myField', __type: 'internArendereferens' });
      const props = component.getProps(field);
      expect(props['refType']).toBe('Arende');
    });

    it('includes refType Handling for internHandlingsreferens', () => {
      const field = makeField({ name: 'myField', __type: 'internHandlingsreferens' });
      const props = component.getProps(field);
      expect(props['refType']).toBe('Handling');
    });

    it('includes type external for contactExt', () => {
      const field = makeField({ name: 'myField', __type: 'contactExt' });
      const props = component.getProps(field);
      expect(props['type']).toBe('external');
    });

    it('includes type internal for contactInt', () => {
      const field = makeField({ name: 'myField', __type: 'contactInt' });
      const props = component.getProps(field);
      expect(props['type']).toBe('internal');
    });

    it('includes doc for contactMotpart', () => {
      const field = makeField({ name: 'myField', __type: 'contactMotpart' });
      const props = component.getProps(field);
      expect(props['doc']).toBeTruthy();
    });

    it('includes docType for arendetypAutocomplete', () => {
      const field = makeField({ name: 'myField', __type: 'arendetypAutocomplete' });
      const props = component.getProps(field);
      expect(props['docType']).toBe('Arende');
    });

    it('includes metadata props for customMetadata', () => {
      const field = makeField({ name: 'myField', __type: 'customMetadata' });
      const props = component.getProps(field);
      expect(props['valuesSignal']).toBeTruthy();
      expect(props['definitionsSignal']).toBeTruthy();
    });
  });

  describe('uploadFile', () => {
    it('emits files via uploadFileOutput', () => {
      const emitted: File[][] = [];
      component.uploadFileOutput.subscribe(f => emitted.push(f));
      const files = [new File(['content'], 'test.pdf')];
      component.uploadFile(files);
      expect(emitted[0]).toEqual(files);
    });
  });

  describe('submit — Arende doc', () => {
    beforeEach(() => {
      const config = makeConfig([
        {
          groupId: 'overview',
          groupFields: [
            { name: 'arendestatus', type: 'text', label: 'Status', defaultValue: 'oppet' },
            { name: 'arendesteg', type: 'text', label: 'Steg', defaultValue: '' },
            { name: 'beslutTyp', type: 'text', label: 'BeslutTyp', defaultValue: '' },
            { name: 'beslutDate', type: 'text', label: 'BeslutDate', defaultValue: '' },
          ],
        },
        {
          groupId: 'comment',
          groupFields: [{ name: 'makulering', type: 'text', label: 'Makulering', defaultValue: '' }],
        },
      ]);
      fixture.componentRef.setInput('doc', makeDoc('Arende'));
      fixture.componentRef.setInput('config', config);
      fixture.detectChanges();
      component.ngOnInit();
    });

    it('emits formResultCase when form is valid', () => {
      const emitted: unknown[] = [];
      component.formResultCase.subscribe(r => emitted.push(r));
      component.submit();
      expect(emitted.length).toBe(1);
    });

    it('marks form touched and shows notification when invalid', () => {
      const config = makeConfig([
        {
          groupId: 'overview',
          groupFields: [
            { name: 'arendestatus', type: 'text', label: 'Status', defaultValue: NUXEO_VOCAB_IDS.arendestatus.stangt },
            { name: 'arendesteg', type: 'text', label: 'Steg', defaultValue: '' },
            {
              name: 'beslutTyp',
              type: 'text',
              label: 'BeslutTyp',
              defaultValue: '',
              validators: [Validators.required],
            },
            {
              name: 'beslutDate',
              type: 'text',
              label: 'BeslutDate',
              defaultValue: '',
              validators: [Validators.required],
            },
          ],
        },
        {
          groupId: 'comment',
          groupFields: [{ name: 'makulering', type: 'text', label: 'Makulering', defaultValue: '' }],
        },
      ]);
      fixture.componentRef.setInput('config', config);
      component.ngOnInit();

      const emitted: unknown[] = [];
      component.formResultCase.subscribe(r => emitted.push(r));
      component.submit();
      expect(emitted.length).toBe(0);
      expect(component.form.touched).toBeTrue();
    });
  });

  describe('submit — Handling doc', () => {
    beforeEach(() => {
      const config = makeConfig([
        {
          groupId: 'handlingDetails',
          groupFields: [
            { name: 'title', type: 'text', label: 'Title', defaultValue: 'My Handling' },
            {
              name: 'handlingsriktning',
              type: 'text',
              label: 'Riktning',
              defaultValue: 'utgaende',
            },
          ],
        },
      ]);
      fixture.componentRef.setInput(
        'doc',
        makeDoc('Handling', {
          [NUXEO_SCHEMA_FIELDS.handling.handlingstyp]: null,
          [NUXEO_SCHEMA_FIELDS.dmsmetadataanpassad.falt]: [],
        })
      );
      fixture.componentRef.setInput('config', config);
      fixture.detectChanges();
      component.ngOnInit();
    });

    it('emits formResultHandling when form is valid', () => {
      const emitted: unknown[] = [];
      component.formResultHandling.subscribe(r => emitted.push(r));
      component.submit();
      expect(emitted.length).toBe(1);
    });
  });

  describe('setNewConfigAccordingToRiktning — Handling doc', () => {
    beforeEach(() => {
      const config = makeConfig([
        {
          groupId: 'handlingDetails',
          groupFields: [
            { name: 'handlingsriktning', type: 'text', label: 'Riktning', defaultValue: '' },
            { name: 'inkommen_datum', type: 'datepicker', label: 'Inkommen' },
            { name: 'upprattad_datum', type: 'datepicker', label: 'Upprättad' },
          ],
        },
      ]);
      fixture.componentRef.setInput(
        'doc',
        makeDoc('Handling', {
          [NUXEO_SCHEMA_FIELDS.handling.handlingstyp]: null,
          [NUXEO_SCHEMA_FIELDS.dmsmetadataanpassad.falt]: [],
        })
      );
      fixture.componentRef.setInput('config', config);
      fixture.detectChanges();
      component.ngOnInit();
    });

    it('hides inkommen_datum when riktning is not inkommande', () => {
      component.handlingsriktning.set(NUXEO_VOCAB_IDS.arendeRiktning.utgaende);
      component.setNewConfigAccordingToRiktning();
      const details = component.newConfig()?.find(g => g.groupId === 'handlingDetails');
      const inkField = details?.groupFields.find(f => f.name === 'inkommen_datum');
      expect(inkField?.isHidden).toBeTrue();
    });

    it('shows inkommen_datum when riktning is inkommande', () => {
      component.handlingsriktning.set(NUXEO_VOCAB_IDS.arendeRiktning.inkommande);
      component.setNewConfigAccordingToRiktning();
      const details = component.newConfig()?.find(g => g.groupId === 'handlingDetails');
      const inkField = details?.groupFields.find(f => f.name === 'inkommen_datum');
      expect(inkField?.isHidden).toBeFalse();
    });

    it('hides upprattad_datum when riktning is inkommande', () => {
      component.handlingsriktning.set(NUXEO_VOCAB_IDS.arendeRiktning.inkommande);
      component.setNewConfigAccordingToRiktning();
      const details = component.newConfig()?.find(g => g.groupId === 'handlingDetails');
      const uppField = details?.groupFields.find(f => f.name === 'upprattad_datum');
      expect(uppField?.isHidden).toBeTrue();
    });
  });

  describe('newConfig signal', () => {
    it('defaults to null', () => {
      expect(component.newConfig()).toBeNull();
    });
  });

  describe('customMetadataValues signal', () => {
    it('defaults to empty array', () => {
      expect(component.customMetadataValues()).toEqual([]);
    });
  });

  describe('customMetadataDefinitions signal', () => {
    it('defaults to empty array', () => {
      expect(component.customMetadataDefinitions()).toEqual([]);
    });
  });

  describe('customMetadataDefinitionDocId signal', () => {
    it('defaults to null when no arendetyp uid on doc', () => {
      expect(component.customMetadataDefinitionDocId()).toBeNull();
    });
  });

  describe('caseTypeChanged output', () => {
    it('emits when arendetyp changes to a new value', () => {
      const emitted: (string | null)[] = [];
      component.caseTypeChanged.subscribe(v => emitted.push(v));
      component.arendetyp.set([{ id: 'type-1', value: 'type-1', label: 'Type 1' }]);
      fixture.detectChanges();
      expect(emitted).toContain('type-1');
    });
  });

  describe('dialogClose output', () => {
    it('can subscribe without error', () => {
      let called = false;
      component.dialogClose.subscribe(() => (called = true));
      component.dialogClose.emit();
      expect(called).toBeTrue();
    });
  });
});
