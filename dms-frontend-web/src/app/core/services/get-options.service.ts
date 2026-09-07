import { inject, Injectable } from '@angular/core';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { Option } from '@app/shared/commonTypes';
import { map, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class GetOptionsService {
  private readonly nuxeoApi = inject(NuxeoApiService);

  suggestEntries(directoryName: string): Observable<Option[]> {
    return this.nuxeoApi.getDirectorySuggestions(directoryName).pipe(
      map(data =>
        data.map(el => ({
          id: el.id,
          label: el.label ?? '',
        }))
      )
    );
  }

  directoryEntriesOptions(directoryName: string): Observable<Option[]> {
    return this.nuxeoApi.getDirectoryEntries(directoryName, 0).pipe(
      map(response =>
        (response.entries ?? []).map(entry => ({
          id: entry.id ?? '',
          label: entry.properties?.label ?? '',
        }))
      )
    );
  }
}
