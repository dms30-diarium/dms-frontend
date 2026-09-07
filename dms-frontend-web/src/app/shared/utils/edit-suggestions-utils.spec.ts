import { signal } from '@angular/core';
import { of } from 'rxjs';
import { loadEditSuggestions, EditSuggestionParams } from './edit-suggestions-utils';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { Option } from '@app/shared/commonTypes';
import {
  makeDirection,
  makeUserSuggestion,
  makeSearchResult,
  makeNuxeoDocument,
} from '@app/shared/testing/mock-factories';

describe('loadEditSuggestions', () => {
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let suggestions: ReturnType<typeof signal<Record<string, Option[]>>>;

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', [
      'getDirectorySuggestions',
      'getUserSuggestions',
      'DMSDocumentSuggestion',
    ]);
    suggestions = signal<Record<string, Option[]>>({});
  });

  function baseParams(overrides: Partial<EditSuggestionParams> = {}): EditSuggestionParams {
    return {
      name: 'field1',
      requestType: 'suggestEntries',
      suggestions,
      apiService: apiSpy,
      ...overrides,
    };
  }

  describe('suggestEntries request type', () => {
    it('calls getDirectorySuggestions when label provided', () => {
      apiSpy.getDirectorySuggestions.and.returnValue(of([makeDirection({ id: 'd1', displayLabel: 'D1' })]));
      loadEditSuggestions(baseParams({ label: 'SomeLabel' }));
      expect(apiSpy.getDirectorySuggestions).toHaveBeenCalledWith('SomeLabel');
    });

    it('sets suggestions for the field name', () => {
      apiSpy.getDirectorySuggestions.and.returnValue(of([makeDirection({ id: 'd1', displayLabel: 'D1' })]));
      loadEditSuggestions(baseParams({ label: 'SomeLabel' }));
      expect(suggestions()['field1']).toEqual([{ id: 'd1', label: 'D1' }]);
    });

    it('does nothing when no label provided', () => {
      loadEditSuggestions(baseParams());
      expect(apiSpy.getDirectorySuggestions).not.toHaveBeenCalled();
      expect(suggestions()).toEqual({});
    });
  });

  describe('userSuggestion request type', () => {
    it('calls getUserSuggestions', () => {
      apiSpy.getUserSuggestions.and.returnValue(of([makeUserSuggestion({ id: 'u1', displayLabel: 'Alice' })]));
      loadEditSuggestions(baseParams({ requestType: 'userSuggestion', name: 'users' }));
      expect(apiSpy.getUserSuggestions).toHaveBeenCalled();
      expect(suggestions()['users']).toEqual([{ id: 'u1', label: 'Alice' }]);
    });
  });

  describe('docSuggestion request type', () => {
    it('calls DMSDocumentSuggestion when targetType and docType provided', () => {
      apiSpy.DMSDocumentSuggestion.and.returnValue(
        of(makeSearchResult({ entries: [makeNuxeoDocument({ uid: 'doc1', title: 'Doc Title' })] }))
      );
      loadEditSuggestions(
        baseParams({
          requestType: 'docSuggestion',
          name: 'docs',
          targetType: 'Arende',
          docType: 'Handling',
          parentRef: 'parent-1',
          searchTerm: 'term',
        })
      );
      expect(apiSpy.DMSDocumentSuggestion).toHaveBeenCalledWith('parent-1', 'Arende', 'Handling', 'term');
      expect(suggestions()['docs']).toEqual([{ id: 'doc1', label: 'Doc Title' }]);
    });

    it('falls back to entry.name when title missing', () => {
      apiSpy.DMSDocumentSuggestion.and.returnValue(
        of(makeSearchResult({ entries: [makeNuxeoDocument({ uid: 'doc2', title: '', name: 'fallback-name' })] }))
      );
      loadEditSuggestions(
        baseParams({
          requestType: 'docSuggestion',
          name: 'docs',
          targetType: 'Arende',
          docType: 'Handling',
        })
      );
      expect(suggestions()['docs']).toEqual([{ id: 'doc2', label: 'fallback-name' }]);
    });

    it('does nothing when targetType missing', () => {
      loadEditSuggestions(baseParams({ requestType: 'docSuggestion', name: 'docs', docType: 'Handling' }));
      expect(apiSpy.DMSDocumentSuggestion).not.toHaveBeenCalled();
    });

    it('does nothing when docType missing', () => {
      loadEditSuggestions(baseParams({ requestType: 'docSuggestion', name: 'docs', targetType: 'Arende' }));
      expect(apiSpy.DMSDocumentSuggestion).not.toHaveBeenCalled();
    });
  });

  describe('preserves other suggestion entries', () => {
    it('merges new field without removing existing ones', () => {
      suggestions.set({ other: [{ id: 'x', label: 'X' }] });
      apiSpy.getUserSuggestions.and.returnValue(of([makeUserSuggestion({ id: 'u1', displayLabel: 'Alice' })]));
      loadEditSuggestions(baseParams({ requestType: 'userSuggestion', name: 'users' }));
      expect(suggestions()['other']).toEqual([{ id: 'x', label: 'X' }]);
      expect(suggestions()['users']).toEqual([{ id: 'u1', label: 'Alice' }]);
    });
  });
});
