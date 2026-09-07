import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  EventEmitter,
  inject,
  Output,
  signal,
} from '@angular/core';
import { DigiIconPlus } from '@designsystem-se/af-angular';
import { GeneralStore } from '@app/core/services/general-store.service';
import { Router, NavigationEnd } from '@angular/router';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { filter, map, of, switchMap, merge } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-add-button',
  imports: [DigiIconPlus],
  templateUrl: './add-button.component.html',
})
export class AddButtonComponent {
  private readonly router = inject(Router);
  private readonly nuxeoApi = inject(NuxeoApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly store = inject(GeneralStore);
  private readonly isInsideDiarium = signal(false);

  protected readonly isVisible = computed(() => {
    if (this.store.navigationPanelContext() !== 'browse') {
      return true;
    }
    return this.isInsideDiarium();
  });

  constructor() {
    merge(
      of(this.router.url),
      this.router.events.pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        map(event => event.urlAfterRedirects)
      )
    )
      .pipe(
        map(url => this.extractDocumentId(url)),
        switchMap(id => {
          if (!id) return of(false);
          return this.nuxeoApi.getAncestorsById(id).pipe(
            map(nodes => {
              const diariamIndex = nodes.findIndex(
                node => node.type === 'Diarium' || node.type === 'Ar' || /diarium/i.test(node.title ?? '')
              );

              return diariamIndex !== -1 && nodes.length > diariamIndex + 1;
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(isInDiarium => this.isInsideDiarium.set(isInDiarium));
  }

  @Output() addButtonClick = new EventEmitter<void>();

  onAddButtonClick(): void {
    this.addButtonClick.emit();
  }

  private extractDocumentId(url: string): string | null {
    const clean = url.split('?')[0]?.split('#')[0] ?? '';
    const segments = clean.split('/').filter(Boolean);
    if (segments.length < 2) return null;
    if (segments[0] === 'doc' || segments[0] === 'folder') {
      return segments[1] ?? null;
    }
    return null;
  }
}
