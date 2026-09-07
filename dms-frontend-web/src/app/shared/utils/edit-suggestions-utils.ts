import { WritableSignal } from '@angular/core';
import { map, Observable, tap } from 'rxjs';

import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { Option } from '@app/shared/commonTypes';

export type EditSuggestionRequestType = 'suggestEntries' | 'docSuggestion' | 'userSuggestion';

export interface EditSuggestionParams {
  name: string;
  requestType: EditSuggestionRequestType;
  suggestions: WritableSignal<Record<string, Option[]>>;
  apiService: NuxeoApiService;
  parentRef?: string;
  label?: string;
  targetType?: string;
  docType?: string;
  searchTerm?: string;
}

export function loadEditSuggestions({
  name,
  requestType,
  suggestions,
  apiService,
  parentRef = '',
  label,
  targetType,
  docType,
  searchTerm = '',
}: EditSuggestionParams): void {
  let endpointObservable: Observable<{ displayLabel: string; id: string }[]> | null = null;

  switch (requestType) {
    case 'suggestEntries': {
      if (label) {
        endpointObservable = apiService
          .getDirectorySuggestions(label)
          .pipe(map(result => result.map(entry => ({ displayLabel: entry.displayLabel, id: entry.id }))));
      }
      break;
    }
    case 'userSuggestion': {
      endpointObservable = apiService
        .getUserSuggestions()
        .pipe(map(result => result.map(entry => ({ displayLabel: entry.displayLabel, id: entry.id }))));
      break;
    }
    case 'docSuggestion': {
      if (targetType && docType) {
        endpointObservable = apiService.DMSDocumentSuggestion(parentRef, targetType, docType, searchTerm).pipe(
          map(doc =>
            doc.entries.map(entry => {
              const label = entry.title || entry.name || '';
              const id = entry.uid;
              return { displayLabel: label, id };
            })
          )
        );
      }
      break;
    }
  }

  if (!endpointObservable) return;

  endpointObservable
    .pipe(
      map(result => result.map(entry => ({ label: entry.displayLabel, id: entry.id }))),
      tap(options => {
        suggestions.update(previous => ({ ...previous, [name]: options }));
      })
    )
    .subscribe();
}
