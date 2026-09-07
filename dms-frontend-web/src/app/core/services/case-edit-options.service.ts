import { inject, Injectable } from '@angular/core';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { Option } from '@app/shared/commonTypes';
import { map, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CaseEditOptionsService {
  private readonly nuxeoApi = inject(NuxeoApiService);

  getDirectorySuggestions(directoryName: string): Observable<Option[]> {
    return this.nuxeoApi
      .getDirectorySuggestions(directoryName)
      .pipe(map(result => result.map(entry => ({ label: entry.displayLabel, id: entry.id }))));
  }

  getUserSuggestions(): Observable<Option[]> {
    return this.nuxeoApi
      .getUserSuggestions()
      .pipe(map(result => result.map(entry => ({ label: entry.displayLabel, id: entry.id }))));
  }

  getDocumentSuggestions(parentRef: string, docType: string, searchTerm = ''): Observable<Option[]> {
    return this.nuxeoApi
      .DMSDocumentSuggestion(parentRef, docType, docType, searchTerm)
      .pipe(map(response => response?.entries?.map(entry => ({ label: entry.title, id: entry.uid })) ?? []));
  }

  getLagrumSuggestions(parentRef?: string): Observable<Option[]> {
    return this.nuxeoApi.getLagrumOptions(parentRef);
  }

  getBevarasSuggestions(): Observable<Option[]> {
    return this.nuxeoApi.getDirectorySuggestions('BevarasGallras').pipe(
      map(result =>
        result.flatMap(entry => {
          if (entry.children?.length) {
            return entry.children.map(child => ({
              label: child.absoluteLabel ?? '',
              id: child.computedId,
            }));
          }

          return [
            {
              label: entry.label ?? '',
              id: entry.id,
            },
          ];
        })
      )
    );
  }
}
