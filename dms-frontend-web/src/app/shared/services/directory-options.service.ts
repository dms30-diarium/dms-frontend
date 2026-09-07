import { inject, Injectable } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { combineLatest, map, Observable, shareReplay, startWith } from 'rxjs';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { Option } from '@app/shared/commonTypes';

interface DirectoryEntry {
  id?: string;
  displayLabel?: string;
  label?: string;
  computedId?: string;
  absoluteLabel?: string;
  children?: DirectoryEntry[];
  properties?: {
    label?: string;
    label_en?: string;
  };
}

@Injectable({ providedIn: 'root' })
export class DirectoryOptionsService {
  private readonly nuxeoApi = inject(NuxeoApiService);
  private readonly store = inject(GeneralStore);

  private readonly natureOptions$ = combineLatest([
    this.nuxeoApi
      .getDirectorySuggestions('nature', {
        dbl10n: false,
        localize: false,
        lang: 'en',
        searchTerm: '',
      })
      .pipe(map(entries => this.mapNatureEntries(entries))),
    toObservable(this.store.messagesInfo).pipe(startWith(this.store.messagesInfo())),
  ]).pipe(
    map(([options]) => this.translateNature(options)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly subjectOptions$ = this.nuxeoApi
    .getDirectorySuggestions('l10nsubjects', {
      dbl10n: true,
      localize: true,
      lang: 'en',
      searchTerm: '',
    })
    .pipe(
      map(entries => this.mapDirectoryEntries(entries)),
      shareReplay({ bufferSize: 1, refCount: true })
    );

  private readonly coverageOptions$ = this.nuxeoApi
    .getDirectorySuggestions('l10ncoverage', {
      dbl10n: true,
      localize: true,
      lang: 'en',
      searchTerm: '',
    })
    .pipe(
      map(entries => this.mapDirectoryEntries(entries)),
      shareReplay({ bufferSize: 1, refCount: true })
    );

  getNatureOptions(): Observable<Option[]> {
    return this.natureOptions$.pipe(map(options => options.map(option => ({ ...option }))));
  }

  getSubjectOptions(): Observable<Option[]> {
    return this.subjectOptions$.pipe(map(options => options.map(option => ({ ...option }))));
  }

  getCoverageOptions(): Observable<Option[]> {
    return this.coverageOptions$.pipe(map(options => options.map(option => ({ ...option }))));
  }

  private translateNature(options: Option[]): Option[] {
    const messages = this.store.messagesInfo() ?? {};
    return options
      .map(option => {
        const label = option.label;
        const translated = label ? messages[label] : undefined;
        return { ...option, label: translated ?? '' };
      })
      .filter(option => option.label);
  }

  private mapNatureEntries(entries: DirectoryEntry[]): Option[] {
    const options: Option[] = [];
    entries.forEach(entry => {
      const id = entry.computedId ?? entry.id ?? '';
      if (!id) return;
      const labelKey = entry.properties?.label ?? entry.properties?.label_en ?? entry.label ?? '';
      options.push({ id, label: labelKey });
    });
    return options;
  }

  private mapDirectoryEntries(entries: DirectoryEntry[]): Option[] {
    const options: Option[] = [];
    entries.forEach(entry => {
      if (entry.children?.length) {
        entry.children.forEach(child => {
          const id = child.computedId ?? child.id ?? '';
          if (!id) return;
          const label = child.absoluteLabel ?? child.displayLabel ?? child.label ?? '';
          options.push({ id, label });
        });
        return;
      }
      const id = entry.computedId ?? entry.id ?? '';
      if (!id) return;
      const label = entry.absoluteLabel ?? entry.displayLabel ?? entry.label ?? '';
      options.push({ id, label });
    });
    return options;
  }
}
