import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DigiButton } from '@designsystem-se/af-angular';
import { NavigationBreadComponent } from '@app/shared/components/navigation-bread/navigation-bread.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-back-to-personal-button',
  standalone: true,
  imports: [DigiButton, NavigationBreadComponent],
  template: `
    @if (isPersonalContext()) {
      <digi-button (afOnClick)="onBackClick()" [attr.af-variation]="'secondary'" [attr.af-full-width]="false">
        Tillbaka
      </digi-button>
    } @else if (navigationParentId()) {
      <nuxeo-navigation-bread [docId]="navigationParentId()" [currentLabel]="currentTitle()" />
    }
  `,
})
export class BackToPersonalButtonComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  path = input<string | null | undefined>(null);
  parentId = input<string | null | undefined>(null);
  currentTitle = input<string>('');
  private readonly personalWorkspacePath = '/default-domain/UserWorkspaces/';
  readonly navigationParentId = computed(() => {
    const parentId = this.parentId();
    return parentId ? parentId : '';
  });

  private isPersonalPath(path: string | null | undefined): boolean {
    return !!path && path.startsWith(this.personalWorkspacePath);
  }

  private getParentPath(path: string): string {
    const parts = path.split('/').filter(Boolean);
    parts.pop();
    return parts.length > 3 ? `/${parts.join('/')}` : '';
  }

  private readonly fallbackPath = computed(() => this.route.snapshot.queryParamMap.get('path'));

  readonly isPersonalContext = computed(() => {
    const explicit = this.path();
    if (this.isPersonalPath(explicit)) return true;
    return this.isPersonalPath(this.fallbackPath());
  });

  resolvedPath = computed(() => {
    const explicit = this.path();
    if (explicit && this.isPersonalPath(explicit)) {
      return this.getParentPath(explicit);
    }

    const fallback = this.fallbackPath();
    if (fallback && this.isPersonalPath(fallback)) {
      return this.getParentPath(fallback);
    }

    return '';
  });

  onBackClick(): void {
    if (this.isPersonalContext()) {
      this.router.navigate(['/personal'], {
        queryParams: this.resolvedPath() ? { path: this.resolvedPath() } : null,
      });
      return;
    }

    const parentId = this.parentId();
    if (parentId) {
      this.router.navigate(['/doc', parentId]);
      return;
    }

    this.router.navigate(['']);
  }
}
