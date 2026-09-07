import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ArendeRefOption, RefsButtonWithDialogComponent } from './refs-button-with-dialog.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { DigiFormSelectFilterCustomEvent } from '@designsystem-se/af/dist/types/components';
import { Direction } from '@app/shared/api/nuxeo-api.types';
import { makeNuxeoDocument, makeSearchResult } from '@app/shared/testing/mock-factories';

describe('RefsButtonWithDialogComponent', () => {
  let component: RefsButtonWithDialogComponent;
  let fixture: ComponentFixture<RefsButtonWithDialogComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getMessagesJSON',
      'getDirectorySuggestions',
      'DMSDocumentSuggestion',
    ]);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.getDirectorySuggestions.and.returnValue(of([{ id: 'd1', label: 'Direction 1' } as Direction]));
    apiSpy.DMSDocumentSuggestion.and.returnValue(
      of(
        makeSearchResult({
          entries: [makeNuxeoDocument({ uid: 'u1', title: 'Case 1', path: '/case-1', type: 'Arende' })],
        })
      )
    );

    await TestBed.configureTestingModule({
      imports: [RefsButtonWithDialogComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    })
      .overrideTemplate(RefsButtonWithDialogComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(RefsButtonWithDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('refType', 'Arende');
    fixture.componentRef.setInput('parentRef', 'parent-1');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('calls getDirectorySuggestions for Referenstyp', () => {
      expect(apiSpy.getDirectorySuggestions).toHaveBeenCalledWith('Referenstyp');
    });

    it('sets typeOptions from result', () => {
      expect(component.typeOptions().length).toBe(1);
    });

    it('calls DMSDocumentSuggestion with parentRef and refType', () => {
      expect(apiSpy.DMSDocumentSuggestion).toHaveBeenCalledWith('parent-1', 'Arende', 'Handling', undefined);
    });

    it('sets caseOptions from result', () => {
      expect(component.caseOptions().length).toBe(1);
      expect(component.caseOptions()[0].label).toBe('Case 1');
    });
  });

  describe('updateRefs', () => {
    it('calls getSuggestions with search term from event', () => {
      apiSpy.DMSDocumentSuggestion.calls.reset();
      component.updateRefs({ detail: 'search-term' } as DigiFormSelectFilterCustomEvent<string>);
      expect(apiSpy.DMSDocumentSuggestion).toHaveBeenCalledWith('parent-1', 'Arende', 'Handling', 'search-term');
    });
  });

  describe('setContact', () => {
    it('emits addContact with form values and resolved ids', () => {
      const emitted: Partial<ArendeRefOption>[] = [];
      component.addContact.subscribe(value => emitted.push(value));
      component.form.get('type')!.setValue([{ id: 'type-1' }]);
      component.form.get('caseRef')!.setValue([{ id: 'case-1' }]);
      component.form.get('comment')!.setValue('a comment');
      component.setContact();
      expect(emitted[0].type).toBe('type-1');
      expect(emitted[0].caseRef).toBe('case-1');
      expect(emitted[0].comment).toBe('a comment');
    });
  });

  describe('getSuggestions', () => {
    it('updates caseOptions with mapped entries', () => {
      apiSpy.DMSDocumentSuggestion.and.returnValue(
        of(
          makeSearchResult({
            entries: [makeNuxeoDocument({ uid: 'u2', title: 'Case 2', path: '/case-2', type: 'Arende' })],
          })
        )
      );
      component.getSuggestions('term');
      expect(component.caseOptions()[0].id).toBe('u2');
    });
  });
});
