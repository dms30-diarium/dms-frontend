import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DigiNavigationBreadcrumbs } from '@designsystem-se/af-angular';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NuxeoDocument, NxDocRef } from '@app/shared/api/nuxeo-api.types';
import { getPathByDocType } from '@app/shared/utils';
import { catchError, map, of } from 'rxjs';
import { truncateForBreadcrumb } from '@app/shared/utils/text-utils';

interface Breadcrumb {
  label: string;
  link?: string;
}

interface BreadcrumbResult {
  title: string;
  crumbs: Breadcrumb[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-navigation-bread',
  standalone: true,
  imports: [DigiNavigationBreadcrumbs, RouterLink],
  templateUrl: './navigation-bread.component.html',
})
export class NavigationBreadComponent {
  docId = input.required<string>();
  fullPath = input<boolean>(false);
  currentLabel = input<string>('');
  private api = inject(NuxeoApiService);

  breadcrumbs = signal<Breadcrumb[]>([]);
  currentPageTitle = signal<string>('');
  displayedBreadcrumbs = computed(() => {
    const breadcrumbs = this.breadcrumbs();
    const currentLabel = this.currentLabel();
    if (!currentLabel) return breadcrumbs;
    return [...breadcrumbs, { label: currentLabel }];
  });
  displayedCurrentPageTitle = computed(() => {
    const currentLabel = this.currentLabel();
    if (currentLabel) return currentLabel;
    return this.currentPageTitle();
  });

  readonly truncateBreadcrumb = (value: unknown) => truncateForBreadcrumb(value);

  private defaultResult: BreadcrumbResult = {
    title: '',
    crumbs: [{ label: 'Start', link: '/' }],
  };

  private lastBreadcrumbKey: string | null = null;

  constructor() {
    effect(
      onCleanup => {
        const currentIdRaw = this.docId();
        const showFullPath = this.fullPath();
        if (!currentIdRaw) return;
        const currentDocumentId = currentIdRaw.trim();
        if (currentDocumentId.length === 0) return;
        const breadcrumbKey = `${currentDocumentId}:${showFullPath}`;
        if (breadcrumbKey === this.lastBreadcrumbKey) return;
        this.lastBreadcrumbKey = breadcrumbKey;

        const subscription = this.api
          .getDocumentById(currentDocumentId, true, { enrichers: ['breadcrumb'] })
          .pipe(
            map((document: NuxeoDocument) => this.buildBreadcrumbs(document, showFullPath)),
            catchError(() => of(this.defaultResult))
          )
          .subscribe((result: BreadcrumbResult) => {
            untracked(() => {
              this.currentPageTitle.set(result.title || '');
              this.breadcrumbs.set(result.crumbs);
            });
          });

        onCleanup(() => subscription.unsubscribe());
      },
      { allowSignalWrites: true }
    );
  }

  private buildBreadcrumbs(document: NuxeoDocument, showFullPath = false): BreadcrumbResult {
    const startCrumb: Breadcrumb = { label: 'Start', link: '/' };
    const breadcrumbEntries = document.contextParameters?.breadcrumb?.entries ?? [];
    const orderedEntries = breadcrumbEntries.length ? breadcrumbEntries : [this.toDocRef(document)];
    const collected: Breadcrumb[] = [];
    const skipSegments = showFullPath ? 0 : 2;
    let skippedSegments = 0;

    for (const entry of orderedEntries) {
      if (!entry?.uid) continue;
      const isCurrent = entry.uid === document.uid;
      if (entry.path === '/') continue;
      if (!isCurrent && skippedSegments < skipSegments) {
        skippedSegments += 1;
        continue;
      }

      const pathPart = getPathByDocType(entry.type ?? '');
      collected.push({ label: entry.title ?? '', link: pathPart + entry.uid });
    }

    return {
      title: document.title || orderedEntries[orderedEntries.length - 1]?.title || '',
      crumbs: [startCrumb, ...collected],
    };
  }

  private toDocRef(document: NuxeoDocument): NxDocRef {
    return {
      'entity-type': 'document',
      repository: document.repository,
      uid: document.uid,
      path: document.path,
      title: document.title,
      type: document.type,
      state: document.state,
      parentRef: document.parentRef,
    };
  }
}
