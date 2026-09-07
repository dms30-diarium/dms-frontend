import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { CreateBeslutComponent } from './create-beslut.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { makeNuxeoDocument } from '@app/shared/testing/mock-factories';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';

// The component's createDocument signature declares dateFrom/dateTill as `string`, but
// the implementation indexes them as arrays (`event.dateFrom[0]`) — a pre-existing mismatch
// in the source types. We widen here once and cast at the call boundary.
type CreateBeslutEventParam = Parameters<CreateBeslutComponent['createDocument']>[0];
interface CreateBeslutTestEvent {
  name: string;
  shortName: string;
  code: string;
  sort: string;
  dateFrom: string[];
  dateTill: string[];
}

function makeEvent(overrides: Partial<CreateBeslutTestEvent> = {}): CreateBeslutEventParam {
  const event: CreateBeslutTestEvent = {
    name: '',
    shortName: '',
    code: '',
    sort: '',
    dateFrom: ['2024-01-01'],
    dateTill: ['2024-12-31'],
    ...overrides,
  };
  return event as unknown as CreateBeslutEventParam;
}

const MOCK_PAYLOAD = makeNuxeoDocument({ uid: 'payload-1', type: 'Beslut', title: '' });
const MOCK_DOC = makeNuxeoDocument({ uid: 'b-1', type: 'Beslut', title: 'B' });

describe('CreateBeslutComponent', () => {
  let component: CreateBeslutComponent;
  let fixture: ComponentFixture<CreateBeslutComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', ['getMessagesJSON', 'getEmptyWithDefaults', 'createDocument']);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getEmptyWithDefaults.and.returnValue(of(MOCK_PAYLOAD));
    apiSpy.createDocument.and.returnValue(of(MOCK_DOC));

    await TestBed.configureTestingModule({
      imports: [CreateBeslutComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    })
      .overrideTemplate(CreateBeslutComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(CreateBeslutComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('parentUid', 'parent-1');
    fixture.componentRef.setInput('path', '/domain/beslut');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('calls getEmptyWithDefaults for Beslut', () => {
      expect(apiSpy.getEmptyWithDefaults).toHaveBeenCalledWith('/domain/beslut', 'Beslut');
    });

    it('sets defaultPayload', () => {
      expect(component.defaultPayload).toEqual(MOCK_PAYLOAD);
    });
  });

  describe('signals initial state', () => {
    it('createFolderConfig has 6 fields', () => {
      expect(component.createFolderConfig().length).toBe(6);
    });

    it('includes code, shortName, name, sort, dateFrom, dateTill fields', () => {
      const names = component.createFolderConfig().map(f => f.name);
      expect(names).toContain('code');
      expect(names).toContain('shortName');
      expect(names).toContain('name');
      expect(names).toContain('sort');
      expect(names).toContain('dateFrom');
      expect(names).toContain('dateTill');
    });

    it('dateFrom and dateTill are datepicker type', () => {
      const types = component
        .createFolderConfig()
        .filter(f => f.type === 'datepicker')
        .map(f => f.name);
      expect(types).toContain('dateFrom');
      expect(types).toContain('dateTill');
    });
  });

  describe('createDocument', () => {
    it('throws when defaultPayload is null', () => {
      component.defaultPayload = null;
      expect(() =>
        component.createDocument(
          makeEvent({
            name: 'N',
            shortName: 'S',
            code: 'C',
            sort: '1',
          })
        )
      ).toThrow();
    });

    it('calls createDocument API', () => {
      apiSpy.createDocument.calls.reset();
      component.createDocument(makeEvent({ name: 'BeslutName', shortName: 'BN', code: 'B-01', sort: '1' }));
      expect(apiSpy.createDocument).toHaveBeenCalledWith(
        jasmine.objectContaining({ name: 'BeslutName' }),
        '/domain/beslut'
      );
    });

    it('sets name from event.name', () => {
      apiSpy.createDocument.calls.reset();
      component.createDocument(makeEvent({ name: 'TestBeslut', shortName: 'TB', code: 'B1', sort: '5' }));
      const payload = apiSpy.createDocument.calls.mostRecent().args[0] as NuxeoDocument;
      expect(payload.name).toBe('TestBeslut');
    });

    it('maps cv:kod from event.code', () => {
      apiSpy.createDocument.calls.reset();
      component.createDocument(makeEvent({ name: 'N', shortName: 'S', code: 'B-CODE', sort: '1' }));
      const payload = apiSpy.createDocument.calls.mostRecent().args[0] as NuxeoDocument;
      const kodKey = Object.keys(payload.properties).find(
        k => k.includes('kod') && !k.includes('kodnamn') && !k.includes('kortnamn')
      );
      expect((payload.properties as Record<string, unknown>)[kodKey!]).toBe('B-CODE');
    });

    it('emits dialogClosed on success', () => {
      let emitted: unknown;
      component.dialogClosed.subscribe(v => (emitted = v));
      component.createDocument(makeEvent({ name: 'N', shortName: 'S', code: 'C', sort: '1' }));
      expect(emitted).toBeTruthy();
    });
  });
});
