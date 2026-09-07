import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { CreateReducedCaseFormComponent, ArendeFormEvent } from './reduced-create-case-form.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { FormUtilsService } from '@app/shared/services/form-utils.service';
import { LagrumFieldService } from '@app/shared/services/lagrum-field.service';
import { AssignUserModalComponent } from '../../assign-user-modal/assign-user-modal.component';
import { FormControl, FormGroup } from '@angular/forms';
import { NUXEO_VOCAB_IDS } from '@app/shared/constants/nuxeo-vocabulary-ids';
import { FieldConfig } from '@app/shared/components/general-form/general-form.types';
import { makeNuxeoDocument, makeDirection } from '@app/shared/testing/mock-factories';
import { SearchResult } from '@app/shared/api/nuxeo-api.types';

const MOCK_RIKTNING = [
  makeDirection({ id: 'inkommande', displayLabel: 'Inkommande' }),
  makeDirection({ id: 'utgaende', displayLabel: 'Utgående' }),
  makeDirection({ id: 'intern', displayLabel: 'Intern' }),
];

const MOCK_MOTPART = [
  makeDirection({ id: 'foretagMyndighet', displayLabel: 'Företag/Myndighet' }),
  makeDirection({ id: 'privatPerson', displayLabel: 'Privatperson' }),
];

const MOCK_SEKRETESS = [makeDirection({ id: 'sec-1', displayLabel: 'Sekretess 1' })];
const MOCK_LAGRUM = [{ id: 'lag-1', label: 'Lagrum 1' }];
const MOCK_SECRET_CLASS = [makeDirection({ id: 'sk-1', displayLabel: 'Säk 1' })];

describe('CreateReducedCaseFormComponent', () => {
  let component: CreateReducedCaseFormComponent;
  let fixture: ComponentFixture<CreateReducedCaseFormComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let formUtilsSpy: jasmine.SpyObj<FormUtilsService>;
  let lagrumSpy: jasmine.SpyObj<LagrumFieldService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'getDirectorySuggestions',
      'getLagrumOptions',
      'DMSDocumentSuggestion',
      'getEmptyWithDefaults',
      'getDocumentById',
      'createDocument',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    const directorySuggestionsFake = (type: string) => {
      if (type === 'ArendeRiktning') return of(MOCK_RIKTNING);
      if (type === 'Sekretess') return of(MOCK_SEKRETESS);
      if (type === 'MotpartTyp') return of(MOCK_MOTPART);
      if (type === 'Sakerhetsskyddsklassificering') return of(MOCK_SECRET_CLASS);
      return of([]);
    };
    apiSpy.getDirectorySuggestions.and.callFake(
      directorySuggestionsFake as unknown as NuxeoApiService['getDirectorySuggestions']
    );
    apiSpy.getLagrumOptions.and.returnValue(of(MOCK_LAGRUM));
    apiSpy.DMSDocumentSuggestion.and.returnValue(
      of({ entries: [{ title: 'Lagrum 1', uid: 'lag-1' }] } as unknown as SearchResult)
    );
    apiSpy.getEmptyWithDefaults.and.returnValue(of(makeNuxeoDocument({ uid: 'empty-1', type: 'Arende' })));
    apiSpy.getDocumentById.and.returnValue(of(makeNuxeoDocument()));
    apiSpy.createDocument.and.returnValue(of(makeNuxeoDocument({ uid: 'new-case-1', type: 'Arende' })));

    formUtilsSpy = jasmine.createSpyObj('FormUtilsService', ['hasStrongSecrecy']);
    formUtilsSpy.hasStrongSecrecy.and.returnValue(false);

    lagrumSpy = jasmine.createSpyObj('LagrumFieldService', ['buildField', 'syncOptions', 'removeField', 'insertAfter']);
    lagrumSpy.buildField.and.returnValue({ type: 'dropdown', name: 'lagrum', options: [] });
    lagrumSpy.removeField.and.callFake((config: FieldConfig[], name: string) => config.filter(f => f.name !== name));
    lagrumSpy.insertAfter.and.callFake((config: FieldConfig[], afterFieldName: string, field: FieldConfig) => {
      const index = config.findIndex(item => item.name === afterFieldName);
      if (index === -1) return [...config, field];
      return [...config.slice(0, index + 1), field, ...config.slice(index + 1)];
    });

    await TestBed.configureTestingModule({
      imports: [CreateReducedCaseFormComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: FormUtilsService, useValue: formUtilsSpy },
        { provide: LagrumFieldService, useValue: lagrumSpy },
      ],
    })
      .overrideTemplate(CreateReducedCaseFormComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(CreateReducedCaseFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('parentUid', 'parent-uid-1');
    fixture.componentRef.setInput('path', '/default/path');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('calls getDirectorySuggestions for all 4 vocabularies', () => {
      expect(apiSpy.getDirectorySuggestions).toHaveBeenCalledWith('ArendeRiktning');
      expect(apiSpy.getDirectorySuggestions).toHaveBeenCalledWith('Sekretess');
      expect(apiSpy.getDirectorySuggestions).toHaveBeenCalledWith('MotpartTyp');
      expect(apiSpy.getDirectorySuggestions).toHaveBeenCalledWith('Sakerhetsskyddsklassificering');
    });

    it('does not fetch lagrum options on init (they are klass-scoped, fetched on Ärendetyp selection)', () => {
      expect(apiSpy.getLagrumOptions).not.toHaveBeenCalled();
      expect(apiSpy.DMSDocumentSuggestion).not.toHaveBeenCalled();
    });

    it('calls getEmptyWithDefaults with path and Arende type', () => {
      expect(apiSpy.getEmptyWithDefaults).toHaveBeenCalledWith('/default/path', 'Arende');
    });

    it('sets arendeConfig after forkJoin', () => {
      expect(component.arendeConfig().length).toBeGreaterThan(0);
    });

    it('sets motpartOptions', () => {
      expect(component.motpartOptions()).not.toBeNull();
      expect(component.motpartOptions()!.length).toBe(2);
    });
  });

  describe('signals initial state', () => {
    it('isLoading defaults to false', () => {
      expect(component.isLoading()).toBeFalse();
    });

    it('showAlert defaults to false', () => {
      expect(component.showAlert()).toBeFalse();
    });

    it('hasInternRiktning defaults to false', () => {
      expect(component.hasInternRiktning()).toBeFalse();
    });

    it('firstColumnSize defaults to 4', () => {
      expect(component.firstColumnSize()).toBe(4);
    });

    it('arendeTypeValue defaults to empty array', () => {
      expect(component.arendeTypeValue()).toEqual([]);
    });
  });

  describe('selectedOptionChanged', () => {
    describe('secret field', () => {
      it('calls formUtils.hasStrongSecrecy with selected value', () => {
        component.selectedOptionChanged({ selectedValue: 'sec-1', fieldName: 'secret' });
        expect(formUtilsSpy.hasStrongSecrecy).toHaveBeenCalledWith('sec-1');
      });

      it('adds lagrum field when secrecy is strong', () => {
        formUtilsSpy.hasStrongSecrecy.and.returnValue(true);
        component.selectedOptionChanged({ selectedValue: 'high-sec', fieldName: 'secret' });
        expect(lagrumSpy.buildField).toHaveBeenCalled();
      });

      it('removes lagrum field when secrecy is not strong', () => {
        // first add lagrum
        formUtilsSpy.hasStrongSecrecy.and.returnValue(true);
        component.selectedOptionChanged({ selectedValue: 'high-sec', fieldName: 'secret' });
        // then remove
        formUtilsSpy.hasStrongSecrecy.and.returnValue(false);
        component.selectedOptionChanged({ selectedValue: 'low-sec', fieldName: 'secret' });
        expect(lagrumSpy.removeField).toHaveBeenCalled();
      });
    });

    describe('riktning field', () => {
      it('calls updateConfigAccordingToRiktning', () => {
        const spy = spyOn(component, 'updateConfigAccordingToRiktning').and.callThrough();
        component.selectedOptionChanged({ selectedValue: 'inkommande', fieldName: 'riktning' });
        expect(spy).toHaveBeenCalledWith('inkommande');
      });

      it('does not change arendeConfig for unhandled fieldName', () => {
        const configBefore = component.arendeConfig().length;
        component.selectedOptionChanged({ selectedValue: 'x', fieldName: 'someOther' });
        expect(component.arendeConfig().length).toBe(configBefore);
      });
    });

    describe('arendeTyp field — klass-scoped lagrum', () => {
      function makeKlassDoc(lagrumUid?: string) {
        return makeNuxeoDocument({
          uid: 'type-uid-1',
          type: 'Klass',
          properties: lagrumUid ? { 'klass:lagrum': [{ uid: lagrumUid }] } : {},
        });
      }

      it('fetches lagrum via DMSDocumentSuggestion scoped to the selected Ärendetyp', () => {
        apiSpy.getDocumentById.and.returnValue(of(makeKlassDoc('lag-1')));

        component.selectedOptionChanged({ selectedValue: 'type-uid-1', fieldName: 'arendeTyp' });

        expect(apiSpy.DMSDocumentSuggestion).toHaveBeenCalledWith('parent-uid-1', 'Lagrum', 'Arende', '', {
          selectedKlass: 'type-uid-1',
        });
      });

      it('populates lagrumOptions from the suggestion entries', () => {
        apiSpy.getDocumentById.and.returnValue(of(makeKlassDoc('lag-1')));

        component.selectedOptionChanged({ selectedValue: 'type-uid-1', fieldName: 'arendeTyp' });

        expect(component.lagrumOptions()).toEqual([{ label: 'Lagrum 1', id: 'lag-1' }]);
      });

      it('still fetches the unscoped picklist when the klass has no klass:lagrum, but skips the scoped default lookup', () => {
        apiSpy.getDocumentById.and.returnValue(of(makeKlassDoc()));

        component.selectedOptionChanged({ selectedValue: 'type-uid-1', fieldName: 'arendeTyp' });

        expect(apiSpy.getLagrumOptions).toHaveBeenCalledWith('parent-uid-1');
        expect(apiSpy.DMSDocumentSuggestion).not.toHaveBeenCalled();
        expect(component.lagrumOptions()).toEqual([{ label: 'Lagrum 1', id: 'lag-1' }]);
      });

      it('uses the scoped call only for the default pre-selection, and the unscoped call for the full dropdown', () => {
        formUtilsSpy.hasStrongSecrecy.and.returnValue(true);
        apiSpy.getDocumentById.and.returnValue(
          of(
            makeNuxeoDocument({
              uid: 'type-uid-1',
              type: 'Klass',
              properties: { 'klass:sekretess': { id: 'svag-1' }, 'klass:lagrum': [{ uid: 'lag-1' }] },
            })
          )
        );
        apiSpy.getLagrumOptions.and.returnValue(
          of([
            { label: 'Lagrum 1', id: 'lag-1' },
            { label: 'Lagrum 2', id: 'lag-2' },
          ])
        );

        component.selectedOptionChanged({ selectedValue: 'type-uid-1', fieldName: 'arendeTyp' });

        expect(component.lagrumOptions()).toEqual([
          { label: 'Lagrum 1', id: 'lag-1' },
          { label: 'Lagrum 2', id: 'lag-2' },
        ]);
        expect(component.arendeConfig().find(f => f.name === 'lagrum')?.defaultValue).toEqual([
          { label: 'Lagrum 1', id: 'lag-1' },
        ]);
      });

      it('pre-selects only the first Lagrum when the klass has more than one configured ref', () => {
        // Regression: passing the full multi-entry array as defaultValue to a
        // single-select dropdown left it showing no selection at all.
        formUtilsSpy.hasStrongSecrecy.and.returnValue(true);
        apiSpy.getDocumentById.and.returnValue(
          of(
            makeNuxeoDocument({
              uid: 'type-uid-1',
              type: 'Klass',
              properties: {
                'klass:sekretess': { id: 'svag-1' },
                'klass:lagrum': [{ uid: 'lag-1' }, { uid: 'lag-2' }],
              },
            })
          )
        );
        apiSpy.DMSDocumentSuggestion.and.returnValue(
          of({
            entries: [
              { title: 'Lagrum 1', uid: 'lag-1' },
              { title: 'Lagrum 2', uid: 'lag-2' },
            ],
          } as unknown as SearchResult)
        );

        component.selectedOptionChanged({ selectedValue: 'type-uid-1', fieldName: 'arendeTyp' });

        expect(component.arendeConfig().find(f => f.name === 'lagrum')?.defaultValue).toEqual([
          { label: 'Lagrum 1', id: 'lag-1' },
        ]);
      });

      it('resets the secret field defaultValue (not just skips it) when switching to a klass with no default sekretess', () => {
        formUtilsSpy.hasStrongSecrecy.and.callFake((value?: string | null) => value === 'svag-1');

        apiSpy.getDocumentById.and.returnValue(
          of(
            makeNuxeoDocument({
              uid: 'type-uid-1',
              type: 'Klass',
              properties: { 'klass:sekretess': { id: 'svag-1' } },
            })
          )
        );
        component.selectedOptionChanged({ selectedValue: 'type-uid-1', fieldName: 'arendeTyp' });

        expect(component.arendeConfig().find(f => f.name === 'secret')?.defaultValue).toBe('svag-1');
        expect(component.arendeConfig().some(f => f.name === 'lagrum')).toBe(true);

        apiSpy.getDocumentById.and.returnValue(
          of(makeNuxeoDocument({ uid: 'type-uid-2', type: 'Klass', properties: {} }))
        );
        component.selectedOptionChanged({ selectedValue: 'type-uid-2', fieldName: 'arendeTyp' });

        expect(component.arendeConfig().find(f => f.name === 'secret')?.defaultValue).toBeNull();
        expect(component.arendeConfig().some(f => f.name === 'lagrum')).toBe(false);
      });
    });

    describe('arendeTyp field', () => {
      it('calls getDocumentById with selected value', () => {
        component.selectedOptionChanged({ selectedValue: 'type-uid-1', fieldName: 'arendeTyp' });
        expect(apiSpy.getDocumentById).toHaveBeenCalledWith('type-uid-1', true);
      });
    });
  });

  describe('selectedRadioChanged', () => {
    it('sets searchButtonTest to Sök hos Bolagsverket for foretagMyndighet', () => {
      component.selectedRadioChanged({
        selectedValue: NUXEO_VOCAB_IDS.motpartTyp.foretagMyndighet,
        fieldName: 'motpartRadio',
      });
      expect(component.searchButtonTest()).toBe('Sök hos Bolagsverket');
    });

    it('sets searchButtonTest to Sök mot Navet for privatPerson', () => {
      component.selectedRadioChanged({
        selectedValue: NUXEO_VOCAB_IDS.motpartTyp.privatPerson,
        fieldName: 'motpartRadio',
      });
      expect(component.searchButtonTest()).toBe('Sök mot Navet');
    });

    it('calls updateConfigAccordingToMotpart with motpart value', () => {
      const spy = spyOn(component, 'updateConfigAccordingToMotpart').and.callThrough();
      component.selectedRadioChanged({ selectedValue: 'foretagMyndighet', fieldName: 'motpartRadio' });
      expect(spy).toHaveBeenCalledWith('foretagMyndighet');
    });

    it('ignores non-motpartRadio fieldNames', () => {
      const configBefore = component.arendeConfig().length;
      component.selectedRadioChanged({ selectedValue: 'x', fieldName: 'riktning' });
      expect(component.arendeConfig().length).toBe(configBefore);
    });
  });

  describe('updateConfigAccordingToRiktning', () => {
    it('sets hasInternRiktning to false for inkommande', () => {
      component.updateConfigAccordingToRiktning('inkommande');
      expect(component.hasInternRiktning()).toBeFalse();
    });

    it('sets firstColumnSize to 4 for ut', () => {
      component.updateConfigAccordingToRiktning('ut');
      expect(component.firstColumnSize()).toBe(4);
    });

    it('sets hasInternRiktning to true for intern', () => {
      component.updateConfigAccordingToRiktning(NUXEO_VOCAB_IDS.arendeRiktning.intern);
      expect(component.hasInternRiktning()).toBeTrue();
    });

    it('sets firstColumnSize to 5 for intern', () => {
      component.updateConfigAccordingToRiktning(NUXEO_VOCAB_IDS.arendeRiktning.intern);
      expect(component.firstColumnSize()).toBe(5);
    });

    it('adds motpart fields when switching from intern to in', () => {
      component.updateConfigAccordingToRiktning(NUXEO_VOCAB_IDS.arendeRiktning.intern);
      component.updateConfigAccordingToRiktning('in');
      const names = component.arendeConfig().map(f => f.name);
      expect(names).toContain('motpart');
    });
  });

  describe('updateConfigAccordingToMotpart', () => {
    it('updates motpartComponent props with new motpartTyp', () => {
      component.updateConfigAccordingToMotpart('privatPerson');
      const motpartComp = component.arendeConfig().find(f => f.name === 'motpartComponent');
      expect(motpartComp?.props?.['motpartTyp']).toBe('privatPerson');
    });
  });

  describe('onFormChange', () => {
    it('hides intern field when useArendemeningText is true', () => {
      component.onFormChange({ useArendemeningText: true });
      const intern = component.arendeConfig().find(f => f.name === 'intern');
      expect(intern?.isHidden).toBeTrue();
    });

    it('shows arendemeningExtra when useArendemeningText is true', () => {
      component.onFormChange({ useArendemeningText: true });
      const extra = component.arendeConfig().find(f => f.name === 'arendemeningExtra');
      expect(extra?.isHidden).toBeFalse();
    });

    it('hides arendemeningExtra when useArendemeningText is false', () => {
      component.onFormChange({ useArendemeningText: false });
      const extra = component.arendeConfig().find(f => f.name === 'arendemeningExtra');
      expect(extra?.isHidden).toBeTrue();
    });
  });

  describe('updateLagrum', () => {
    it('adds lagrum field when isSecret is true and no lagrum exists', () => {
      const initialHasLagrum = component.arendeConfig().some(f => f.name === 'lagrum');
      expect(initialHasLagrum).toBeFalse();
      component.updateLagrum(true);
      expect(lagrumSpy.buildField).toHaveBeenCalled();
    });

    it('removes lagrum field when isSecret is false and lagrum exists', () => {
      component.updateLagrum(true);
      component.updateLagrum(false);
      expect(lagrumSpy.removeField).toHaveBeenCalled();
    });

    it('does not add lagrum if already exists', () => {
      component.updateLagrum(true);
      lagrumSpy.buildField.calls.reset();
      component.updateLagrum(true);
      expect(lagrumSpy.buildField).not.toHaveBeenCalled();
    });
  });

  describe('createDocument', () => {
    let mockAssignComponent: { assignCaseFormGroup: FormGroup; medhandlaggareArray: { controls: unknown[] } };

    beforeEach(() => {
      mockAssignComponent = {
        assignCaseFormGroup: new FormGroup({
          organization: new FormControl('Test Org'),
          coworker: new FormControl('Test User'),
        }),
        medhandlaggareArray: { controls: [] },
      };
      (component as unknown as { assignComponent: AssignUserModalComponent }).assignComponent =
        mockAssignComponent as unknown as AssignUserModalComponent;
      component.defaultPayload = makeNuxeoDocument({ uid: 'empty-1', type: 'Arende' });
    });

    it('returns early when event is null', () => {
      component.createDocument(null);
      expect(apiSpy.createDocument).not.toHaveBeenCalled();
    });

    it('marks assignComponent as touched if form invalid and returns', () => {
      mockAssignComponent.assignCaseFormGroup.get('organization')?.setErrors({ required: true });
      const spy = spyOn(mockAssignComponent.assignCaseFormGroup, 'markAllAsTouched');
      component.createDocument({});
      expect(spy).toHaveBeenCalled();
      expect(apiSpy.createDocument).not.toHaveBeenCalled();
    });

    it('calls createDocument API with full payload', () => {
      const event: ArendeFormEvent = {
        riktning: 'inkommande',
        arendemening: 'arende-1',
        personuppgifter: false,
      };
      component.createDocument(event);
      expect(apiSpy.createDocument).toHaveBeenCalled();
    });

    it('emits dialogClosed on success', () => {
      let emitted: unknown;
      component.dialogClosed.subscribe(v => (emitted = v));
      const event: ArendeFormEvent = {
        riktning: 'inkommande',
        arendemening: 'arende-1',
      };
      component.createDocument(event);
      expect(emitted).toBeTruthy();
    });
  });
});
