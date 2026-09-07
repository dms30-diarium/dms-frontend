import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ReferencesDetailsComponent } from './references-details.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { DocumentValueService } from '@app/core/services/document-value-service.service';
import { ArendeRefOption } from '../edit-form-components/case-reference.component/case-reference.component';
import { TableColumn } from '../case-list-table/case-list-table.component';
import { makeNuxeoDocument, makeSearchResult } from '@app/shared/testing/mock-factories';
import { NuxeoProperties } from '@app/shared/api/nuxeo-api.types';

const COLUMNS: TableColumn[] = [
  { key: 'caseRef', label: 'Ref', visible: true, tableName: 'refs' },
  { key: 'status', label: 'Status', visible: false, tableName: 'refs' },
];

function makeRef(overrides: Partial<ArendeRefOption> = {}): ArendeRefOption {
  return {
    id: 'ref-1',
    caseRef: 'doc-ref-1',
    type: 'arende',
    comment: 'comment',
    displayType: 'Ärende',
    caseTitle: 'Title',
    caseNumber: 'A2024-001',
    status: 'active',
    date: '2024-01-01',
    responsibleOfficer: 'officer',
    handlingNumber: null,
    riktning: 'inkommande',
    link: ['/doc', 'doc-ref-1'],
    ...overrides,
  };
}

function makeArendeDoc(properties: Record<string, unknown>) {
  return makeNuxeoDocument({
    uid: 'doc-ref-1',
    path: '/arenden/doc-ref-1',
    type: 'Arende',
    properties: properties as unknown as NuxeoProperties,
  });
}

const ARENDE_PROPERTIES = {
  'arende:arendetyp': { id: 'type-1' },
  'arende:arendestatus': 'active',
  'arende:handlaggningsstatus': 'paborjad',
  'arende:behorighetsstatus': 'registrerat',
  'arende:riktning': 'inkommande',
  'arende:sekretess': null,
  'arende:sakerhetsskyddsklassificering': null,
  'arende:bevaras_gallras': null,
  'arende:ansvarig_organisatorisk_enhet': 'Org A',
  'arende:innehaller_personuppgifter_gdpr': false,
  'arende:ansvarig_handlaggare': 'officer',
  'arende:ansvarig_organisationsenhetschef': null,
  'arende:ansvarig_beslutsfattare': null,
  'arende:medhandlaggare': [],
  'arende:granskare': [],
  'arende:arendenummer': 'A2024-001',
  'arende:arendemening': 'Test arende',
  'arende:intern_arendemening': null,
  'arende:jk_kommentar': null,
  'arende:allman_kommentar': null,
  'arende:motpart': { motpart: 'Partner AB' },
  'arende:arendet_registrerat_datum': '2024-01-01',
  'arende:arendet_arkiverat_datum': null,
  'arende:arendet_gallrat_datum': null,
  'arende:arendet_makulerat_datum': null,
  'arende:handlaggning_paborjad': null,
  'arende:handlaggning_avslutad': null,
  'arende:beslutat_datum': null,
  'arende:beslut_expedierats_datum': null,
  'dc:created': '2024-01-01',
  'dc:modified': '2024-06-01',
  'dc:last_contributor': 'user1',
  'arende:lagrum': [],
  'arende:lagrumsbeskrivning': [],
};

describe('ReferencesDetailsComponent', () => {
  let component: ReferencesDetailsComponent;
  let fixture: ComponentFixture<ReferencesDetailsComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let docValueSpy: jasmine.SpyObj<DocumentValueService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', ['getMessagesJSON', 'getSeveralDocsByUids']);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getSeveralDocsByUids.and.returnValue(of(makeSearchResult({ entries: [] })));

    docValueSpy = jasmine.createSpyObj('DocumentValueService', ['getDate']);
    docValueSpy.getDate.and.callFake((v: unknown) => (v ? String(v) : ''));

    await TestBed.configureTestingModule({
      imports: [ReferencesDetailsComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: DocumentValueService, useValue: docValueSpy },
      ],
    })
      .overrideTemplate(ReferencesDetailsComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(ReferencesDetailsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('parentRef', 'parent-1');
    fixture.componentRef.setInput('references', []);
    fixture.componentRef.setInput('refType', 'Arende');
    fixture.componentRef.setInput('columnsConfig', COLUMNS);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('signals initial state', () => {
    it('newReferences defaults to empty array', () => {
      expect(component.newReferences()).toEqual([]);
    });

    it('sourceRows returns references() when newReferences is empty', () => {
      const ref = makeRef();
      fixture.componentRef.setInput('references', [ref]);
      fixture.detectChanges();
      expect(component.sourceRows().length).toBe(1);
    });
  });

  describe('ngOnInit with empty references', () => {
    it('does not call getSeveralDocsByUids for empty refs', () => {
      expect(apiSpy.getSeveralDocsByUids).not.toHaveBeenCalled();
    });
  });

  describe('ngOnInit with references', () => {
    beforeEach(() => {
      apiSpy.getSeveralDocsByUids.and.returnValue(
        of(makeSearchResult({ entries: [makeArendeDoc(ARENDE_PROPERTIES)] }))
      );
      fixture.componentRef.setInput('references', [makeRef()]);
      fixture.detectChanges();
      component.ngOnInit();
    });

    it('calls getSeveralDocsByUids with caseRef ids', () => {
      expect(apiSpy.getSeveralDocsByUids).toHaveBeenCalledWith(['doc-ref-1']);
    });

    it('populates newReferences after API call', () => {
      expect(component.newReferences().length).toBe(1);
    });

    it('sets sourceRows from newReferences when populated', () => {
      expect(component.sourceRows().length).toBe(1);
    });
  });

  describe('with Handling refType', () => {
    it('maps handling properties correctly', () => {
      const handlingDoc = makeNuxeoDocument({
        uid: 'doc-ref-1',
        path: '/handlingar/doc-ref-1',
        type: 'Handling',
        properties: {
          'handling:handlingsstatus': 'upprattad',
          'handling:bevaras_gallras': null,
          'handling:sekretess': null,
          'handling:sakerhetsskyddsklassificering': null,
          'handling:signerad': false,
          'handling:innehaller_personuppgifter_gdpr': false,
          'handling:avsandare': [{ namn: 'Avsändare AB' }],
          'handling:handlingsnummer': 'H2024-001',
          'handling:handlingsnamn': 'Test Handling',
          'handling:handlingsriktning': 'inkommande',
          'handling:ansvarig_handlaggare': 'officer',
          'handling:ansvarig_organisatorisk_enhet': 'Org B',
          'handling:beslutsfattare': null,
          'handling:medhandlaggare': [],
          'handling:granskare': [],
          'handling:granskningsdatum': null,
          'handling:granskningskommentar': null,
          'handling:upprattad_datum': null,
          'handling:arkiverad_datum': null,
          'handling:gallrad_datum': null,
          'handling:makulerad_datum': null,
          'dc:creator': 'user1',
          'dc:modified': '2024-06-01',
          'handling:inkommen_datum': '2024-01-15',
        } as unknown as NuxeoProperties,
      });

      apiSpy.getSeveralDocsByUids.and.returnValue(of(makeSearchResult({ entries: [handlingDoc] })));
      fixture.componentRef.setInput('refType', 'Handling');
      fixture.componentRef.setInput('references', [makeRef()]);
      fixture.detectChanges();
      component.ngOnInit();

      const row = component.newReferences()[0];
      expect(row['handlingNumber']).toBe('H2024-001');
      expect(row['counterparty']).toBe('Avsändare AB');
    });
  });

  describe('removeContact', () => {
    it('emits updateReferences without the removed ref', () => {
      const ref1 = makeRef({ id: 'ref-1', caseRef: 'doc-1' });
      const ref2 = makeRef({ id: 'ref-2', caseRef: 'doc-2' });
      fixture.componentRef.setInput('references', [ref1, ref2]);
      fixture.detectChanges();

      let emitted: ArendeRefOption[] | undefined;
      component.updateReferences.subscribe(v => (emitted = v));
      component.removeContact(ref1);
      expect(emitted?.length).toBe(1);
      expect(emitted?.[0].caseRef).toBe('doc-2');
    });

    it('does not remove ref when caseRef differs', () => {
      const ref = makeRef({ caseRef: 'doc-1' });
      fixture.componentRef.setInput('references', [ref]);
      fixture.detectChanges();

      let emitted: ArendeRefOption[] | undefined;
      component.updateReferences.subscribe(v => (emitted = v));
      component.removeContact({ ...ref, caseRef: 'other' });
      expect(emitted?.length).toBe(1);
    });
  });

  describe('addContact', () => {
    it('emits updateReferences with new ref appended', () => {
      const existing = makeRef({ caseRef: 'doc-1' });
      fixture.componentRef.setInput('references', [existing]);
      fixture.detectChanges();

      const newRef = makeRef({ id: 'ref-new', caseRef: 'doc-new' });
      let emitted: ArendeRefOption[] | undefined;
      component.updateReferences.subscribe(v => (emitted = v));
      component.addContact(newRef);
      expect(emitted?.length).toBe(2);
      expect(emitted?.[1].caseRef).toBe('doc-new');
    });
  });

  describe('getDefaultColumnOptions', () => {
    it('maps columnsConfig to TableColOptions', () => {
      const opts = component.getDefaultColumnOptions();
      expect(opts.length).toBe(2);
      expect(opts[0].id).toBe('caseRef');
      expect(opts[0].label).toBe('Ref');
      expect(opts[0].visible).toBeTrue();
    });

    it('uses visible=true as default when column has no visible property', () => {
      fixture.componentRef.setInput('columnsConfig', [
        { key: 'test', label: 'Test', tableName: 'refs' } as TableColumn,
      ]);
      fixture.detectChanges();
      const opts = component.getDefaultColumnOptions();
      expect(opts[0].visible).toBeTrue();
    });
  });
});
