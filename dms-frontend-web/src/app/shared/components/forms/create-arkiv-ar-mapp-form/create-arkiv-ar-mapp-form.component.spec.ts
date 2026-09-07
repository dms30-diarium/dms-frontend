import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { CreateArkivArMappFormComponent } from './create-arkiv-ar-mapp-form.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { makeNuxeoDocument } from '@app/shared/testing/mock-factories';

function makePayload(ar?: string): NuxeoDocument {
  return makeNuxeoDocument({
    type: 'ArkivArMapp',
    title: '',
    repository: 'default',
    properties: { 'arkivar:ar': ar ?? '2024' },
  });
}

describe('CreateArkivArMappFormComponent', () => {
  let component: CreateArkivArMappFormComponent;
  let fixture: ComponentFixture<CreateArkivArMappFormComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', ['getMessagesJSON', 'getEmptyWithDefaults', 'createDocument']);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getEmptyWithDefaults.and.returnValue(of(makePayload('2024')));
    apiSpy.createDocument.and.returnValue(
      of(makeNuxeoDocument({ uid: 'm-1', type: 'ArkivArMapp', title: 'M', properties: {} }))
    );

    await TestBed.configureTestingModule({
      imports: [CreateArkivArMappFormComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    })
      .overrideTemplate(CreateArkivArMappFormComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(CreateArkivArMappFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('path', '/domain/arkiv-ar');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('calls getEmptyWithDefaults for ArkivArMapp', () => {
      expect(apiSpy.getEmptyWithDefaults).toHaveBeenCalledWith('/domain/arkiv-ar', 'ArkivArMapp');
    });

    it('sets defaultPayload', () => {
      expect(component.defaultPayload).toEqual(makePayload('2024'));
    });

    it('sets ar field defaultValue from document properties', () => {
      const arField = component.formConfig().find(f => f.name === 'ar');
      expect(arField?.defaultValue).toBe('2024');
    });
  });

  describe('signals initial state', () => {
    it('isLoading defaults to false', () => {
      expect(component.isLoading()).toBeFalse();
    });

    it('formConfig has 3 fields', () => {
      expect(component.formConfig().length).toBe(3);
    });

    it('includes title, description, ar fields', () => {
      const names = component.formConfig().map(f => f.name);
      expect(names).toContain('title');
      expect(names).toContain('description');
      expect(names).toContain('ar');
    });
  });

  describe('createDocument', () => {
    it('calls createDocument API', () => {
      apiSpy.createDocument.calls.reset();
      component.createDocument({ title: 'My Archive', ar: '2025' });
      expect(apiSpy.createDocument).toHaveBeenCalledWith(
        jasmine.objectContaining({ name: 'My Archive' }),
        '/domain/arkiv-ar'
      );
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

    it('maps ar field to arkivarmapp:ar property', () => {
      apiSpy.createDocument.calls.reset();
      component.createDocument({ title: 'T', ar: '2026' });
      const payload = apiSpy.createDocument.calls.mostRecent().args[0];
      const properties = payload.properties as Record<string, unknown>;
      const arKey = Object.keys(properties).find(k => k.includes(':ar'));
      expect(properties[arKey!]).toBe('2026');
    });
  });
});
