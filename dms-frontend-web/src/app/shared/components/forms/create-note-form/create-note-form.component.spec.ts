import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { CreateNoteFormComponent } from './create-note-form.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { DirectoryOptionsService } from '@app/shared/services/directory-options.service';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { makeNuxeoDocument } from '@app/shared/testing/mock-factories';

const MOCK_PAYLOAD = makeNuxeoDocument({ type: 'Note', title: '', properties: {}, repository: 'default' });
const MOCK_DOC = makeNuxeoDocument({ uid: 'n-1', type: 'Note', title: 'T', properties: {} });

describe('CreateNoteFormComponent', () => {
  let component: CreateNoteFormComponent;
  let fixture: ComponentFixture<CreateNoteFormComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let dirSpy: jasmine.SpyObj<DirectoryOptionsService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', ['getMessagesJSON', 'getEmptyWithDefaults', 'createDocument']);
    dirSpy = jasmine.createSpyObj('DirectoryOptionsService', [
      'getNatureOptions',
      'getSubjectOptions',
      'getCoverageOptions',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getEmptyWithDefaults.and.returnValue(of(MOCK_PAYLOAD));
    apiSpy.createDocument.and.returnValue(of(MOCK_DOC));
    dirSpy.getNatureOptions.and.returnValue(of([]));
    dirSpy.getSubjectOptions.and.returnValue(of([]));
    dirSpy.getCoverageOptions.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [CreateNoteFormComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: DirectoryOptionsService, useValue: dirSpy },
      ],
    })
      .overrideTemplate(CreateNoteFormComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(CreateNoteFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('path', '/domain/notes');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('calls getEmptyWithDefaults for Note', () => {
      expect(apiSpy.getEmptyWithDefaults).toHaveBeenCalledWith('/domain/notes', 'Note');
    });

    it('sets defaultPayload', () => {
      expect(component.defaultPayload()).toEqual(MOCK_PAYLOAD);
    });

    it('calls getNatureOptions', () => {
      expect(dirSpy.getNatureOptions).toHaveBeenCalled();
    });

    it('calls getCoverageOptions', () => {
      expect(dirSpy.getCoverageOptions).toHaveBeenCalled();
    });
  });

  describe('signals initial state', () => {
    it('isLoading defaults to false', () => {
      expect(component.isLoading()).toBeFalse();
    });

    it('createNoteConfig has 8 fields', () => {
      expect(component.createNoteConfig().length).toBe(8);
    });

    it('format field defaults to text/html', () => {
      const fmt = component.createNoteConfig().find(f => f.name === 'format');
      expect(fmt?.defaultValue).toBe('text/html');
    });

    it('format field has 4 options', () => {
      const fmt = component.createNoteConfig().find(f => f.name === 'format');
      expect(fmt?.options?.length).toBe(4);
    });
  });

  describe('createDocument', () => {
    it('throws when defaultPayload is null', () => {
      component.defaultPayload.set(null);
      expect(() => component.createDocument({ title: 'T' })).toThrow();
    });

    it('calls createDocument API', () => {
      apiSpy.createDocument.calls.reset();
      component.createDocument({ title: 'My Note', format: 'text/html' });
      expect(apiSpy.createDocument).toHaveBeenCalledWith(
        jasmine.objectContaining({ name: 'My Note', type: 'Note' }),
        '/domain/notes'
      );
    });

    it('uses "note" as fallback name when title is null', () => {
      apiSpy.createDocument.calls.reset();
      component.createDocument({ title: null });
      const payload = apiSpy.createDocument.calls.mostRecent().args[0];
      expect(payload.name).toBe('note');
    });

    it('emits dialogClosed on success', () => {
      let emitted: NuxeoDocument | null | undefined;
      component.dialogClosed.subscribe(v => (emitted = v));
      component.createDocument({ title: 'T' });
      expect(emitted).toBeTruthy();
    });

    it('sets isLoading to false after success', () => {
      component.createDocument({ title: 'T' });
      expect(component.isLoading()).toBeFalse();
    });

    it('includes format in note:mime-type property', () => {
      apiSpy.createDocument.calls.reset();
      component.createDocument({ title: 'T', format: 'text/plain' });
      const payload = apiSpy.createDocument.calls.mostRecent().args[0];
      const properties = payload.properties as Record<string, unknown>;
      const mimeKey = Object.keys(properties).find(k => k.includes('mime'));
      expect(properties[mimeKey!]).toBe('text/plain');
    });
  });
});
