import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { Router } from '@angular/router';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { DigiNavigationVerticalMenu, DigiNavigationVerticalMenuItem } from '@designsystem-se/af-angular';
import { DigiNavigationVerticalMenuItemCustomEvent } from '@designsystem-se/af/dist/types/components';
import { NavPath } from '../navigation/navigation.component';

@Component({
  selector: 'nuxeo-navigation-tree',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './nav-tree.component.html',
  imports: [DigiNavigationVerticalMenu, DigiNavigationVerticalMenuItem, CommonModule],
})
export class NavigationTreeComponent {
  @ViewChild('navigationMenu', { read: ElementRef }) navigationMenu?: ElementRef<HTMLDigiNavigationVerticalMenuElement>;
  rootNode = input.required<NavPath>();
  ancestors = input<NuxeoDocument[]>([]);
  loadChildren = output<NavPath>();
  readonly router = inject(Router);
  private readonly toggleClickAreaWidth = 40;

  constructor() {
    effect(() => {
      this.ancestors();
      this.rootNode();
      queueMicrotask(() => this.syncActiveLevel());
    });
  }

  trackByUid(index: number, item: NavPath) {
    return item.uid ?? item.title ?? index;
  }

  getActiveState(node: NavPath): boolean | undefined {
    const isRoot = node.title === 'Root';
    const isAncestor = this.ancestors().some(ancestor => ancestor.uid === node.uid);

    if (isRoot || isAncestor) {
      return true;
    }

    return node.hasChildren ? false : undefined;
  }

  manageClick(event: DigiNavigationVerticalMenuItemCustomEvent<MouseEvent>, node: NavPath): void {
    const button = event.detail.target as HTMLButtonElement;
    const rect = button.getBoundingClientRect();
    const clickX = event.detail.clientX - rect.left;
    const isToggleButtonClick = clickX > rect.width - this.toggleClickAreaWidth;
    const shouldLoadChildren = node.hasChildren && !node.children.length;

    if (isToggleButtonClick) {
      if (shouldLoadChildren) {
        this.loadChildren.emit(node);
      }
      return;
    }

    if (shouldLoadChildren) {
      this.loadChildren.emit(node);
    }

    void this.router.navigate(['/doc', node.uid]);
  }

  private syncActiveLevel(): void {
    const menu = this.navigationMenu?.nativeElement;
    if (!menu) {
      return;
    }
    const activeSubnavItems = menu.querySelectorAll('digi-navigation-vertical-menu-item[af-active-subnav="true"]');
    const deepestActiveItem = activeSubnavItems.item(activeSubnavItems.length - 1);
    if (deepestActiveItem) {
      void menu.afMSetCurrentActiveLevel(deepestActiveItem);
    }
  }
}
