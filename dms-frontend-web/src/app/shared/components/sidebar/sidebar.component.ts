import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { NavigationComponent } from '../navigation/navigation.component';
import { SidebarSearchComponent } from '../sidebar-search/sidebar-search.component';
import { NxUser } from '@app/shared/api/nuxeo-api.types';
import { HistoryService } from '@app/core/services/history-service.service';
import { UserModalComponent } from '../user-modal/user-modal.component';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GeneralStore } from '@app/core/services/general-store.service';
import { AuthService } from '@app/core/services/auth.service';
import { SvgIconComponent } from '../svg-icon/svg-icon.component';
import { UiModeService } from '@app/core/services/ui-mode.service';
import { ThemeService } from '@app/core/services/theme.service';

interface SidebarMenuItem {
  label: string;
  icon?: string;
  path?: string;
  key?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    DigiArbetsformedlingenAngularModule,
    NavigationComponent,
    SidebarSearchComponent,
    UserModalComponent,
    SvgIconComponent,
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly activeMenuKeyStorage = 'sidebar.activeMenuKey';
  private readonly navigationOpenStorage = 'sidebar.isNavigationOpen';
  private readonly searchOpenStorage = 'sidebar.isSearchOpen';
  isOpen = input<boolean>(true);
  user = input<NxUser | undefined>();
  isLogOutDialogOpened = signal(false);
  isNavigationOpen = signal(false);
  isSearchOpen = signal(false);
  isAdminPanelOpen = signal(false);
  navigationPanelContext = signal<'browse' | 'info' | null>(null);
  isInBladdra = computed(() => this.isNavigationOpen() && this.navigationPanelContext() === 'browse');
  isInInformationsforvaltning = computed(() => this.isNavigationOpen() && this.navigationPanelContext() === 'info');
  searchPanelWidth = signal<number>(350);
  resizing = signal<boolean>(false);
  activeMenuKey = signal<string | null>(null);
  isAdminRouteActive = signal(false);
  toggleSidebar = output<void>();
  historyService = inject(HistoryService);
  openPage = signal<string | null>(null);
  readonly store = inject(GeneralStore);
  readonly auth = inject(AuthService);
  readonly uiModeService = inject(UiModeService);
  private readonly themeService = inject(ThemeService);
  readonly defaultIconColor = computed(() => (this.themeService.currentTheme() === 'dark' ? 'white' : 'black'));
  private readonly detailPrefixes = ['/doc', '/case', '/folder'];
  private readonly rolePrefixes = ['/registrar', '/chef', '/handler'];
  private readonly adminPrefix = '/admin';
  adminMenu: SidebarMenuItem[] = [
    { label: 'Audit logg', path: '/admin/audit-logg' },
    { label: 'Vokabulär', path: '/admin/vokabular' },
    { label: 'Användare & Grupper', path: '/admin/anvandare-grupper' },
    { label: 'Systemanalys' },
  ];
  private navOpenContext: { path: string; menuKey: string | null } | null = null;

  private readonly baseMenu: SidebarMenuItem[] = [
    { label: 'Start', icon: 'Home', path: '/' },
    { label: 'Avancerad sök', icon: 'Search', path: '/search' },
    { label: 'Bläddra', key: 'browse' },
    { label: 'Nyligen visade', icon: 'History', path: '/recent' },
    { label: 'Favoriter', icon: 'Star', path: '/favorites' },
    { label: 'Samlíngar', icon: 'Samligar', path: '/collections' },
    { label: 'Personlig yta', icon: 'User', path: '/personal' },
    { label: 'Rapporter', icon: 'Scale', path: '/reports' },
    { label: 'Statistik', icon: 'BarChart2', path: '/statistics' },
    { label: 'Rensat', icon: 'Trash', path: '/deletedFiles' },
  ];
  private readonly archivistMenu: SidebarMenuItem[] = [
    { label: 'Arkivera', icon: 'Arkivera', path: '/arkivera' },
    { label: 'Gallring', icon: 'Gallring', path: '/gallring' },
  ];
  private readonly infoMenuItem: SidebarMenuItem = {
    label: 'Informationsförvaltning',
    icon: 'Informationsforvaltning',
    path: '/informationsforvaltning',
  };
  menuItems = computed<SidebarMenuItem[]>(() => {
    const hiddenSimplifiedHandlerKeys = new Set(['browse', '/collections', '/reports', '/statistics']);
    const isSimplifiedHandler = this.auth.activeRole() === 'HANDLAGGARE' && this.uiModeService.isSimplified();
    const items = isSimplifiedHandler
      ? this.baseMenu.filter(item => !hiddenSimplifiedHandlerKeys.has(item.key ?? item.path ?? ''))
      : [...this.baseMenu];

    if (this.auth.activeRole() !== 'HANDLAGGARE') {
      items.push(this.infoMenuItem);
    }
    if (this.auth.activeRole() === 'ARKIVARIE') {
      items.push(...this.archivistMenu);
    }
    return items;
  });

  constructor() {
    this.restoreActiveMenuKey();
    this.restorePanelState();
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(event => {
        this.updateActiveMenuFromUrl(event.urlAfterRedirects);
      });
    this.updateActiveMenuFromUrl(this.router.url);

    effect(() => {
      this.openPage.set(this.store.openPage());
    });

    effect(() => {
      sessionStorage.setItem(this.navigationOpenStorage, this.isNavigationOpen() ? '1' : '0');
    });
    effect(() => {
      sessionStorage.setItem(this.searchOpenStorage, this.isSearchOpen() ? '1' : '0');
    });
    effect(() => {
      this.store.navigationPanelContext.set(this.navigationPanelContext());
    });
  }

  showNavPanel() {
    const nextState = !this.isNavigationOpen() || this.navigationPanelContext() === 'info';
    if (nextState) {
      const rawPath = this.router.url.split('?')[0]?.split('#')[0] ?? '';
      const path = this.stripRolePrefix(rawPath) || '/';
      this.navOpenContext = {
        path,
        menuKey: this.activeMenuKey(),
      };
      this.setActiveMenuKey('browse');
      this.navigationPanelContext.set('browse');
    } else {
      this.restoreMenuKeyAfterNavClose();
      this.navigationPanelContext.set(null);
    }
    this.isNavigationOpen.set(nextState);
    this.isSearchOpen.set(false);
    this.isAdminPanelOpen.set(false);
  }

  showInfoPanel() {
    if (this.isInInformationsforvaltning()) {
      this.closeNavigationPanel();
      return;
    }
    const rawPath = this.router.url.split('?')[0]?.split('#')[0] ?? '';
    const path = this.stripRolePrefix(rawPath) || '/';
    this.navOpenContext = {
      path,
      menuKey: this.activeMenuKey(),
    };
    this.setActiveMenuKey(this.infoMenuItem.path ?? 'browse');
    this.isNavigationOpen.set(true);
    this.navigationPanelContext.set('info');
    this.isSearchOpen.set(false);
    this.isAdminPanelOpen.set(false);
  }

  toggleAdminPanel() {
    const nextState = !this.isAdminPanelOpen();
    this.isAdminPanelOpen.set(nextState);
    if (nextState) {
      if (this.isNavigationOpen()) {
        this.isNavigationOpen.set(false);
        this.navigationPanelContext.set(null);
        this.restoreMenuKeyAfterNavClose();
      }
      if (this.isSearchOpen()) {
        this.isSearchOpen.set(false);
      }
    }
  }

  closeNavigationPanel() {
    this.isNavigationOpen.set(false);
    this.navigationPanelContext.set(null);
    this.isSearchOpen.set(false);
    this.isAdminPanelOpen.set(false);
    this.restoreMenuKeyAfterNavClose();
  }

  closeSearchPanel() {
    this.isSearchOpen.set(false);
    this.isNavigationOpen.set(false);
    this.navigationPanelContext.set(null);
    this.isAdminPanelOpen.set(false);
  }

  clickOnOtherTab(item: SidebarMenuItem, event?: MouseEvent) {
    if (this.isInfoMenuItem(item)) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      this.showInfoPanel();
      return;
    }
    if (item.icon === 'Search') {
      const nextState = !this.isSearchOpen();
      if (!nextState) {
        if (event) {
          event.preventDefault();
          event.stopPropagation();
        }
        this.isSearchOpen.set(false);
        this.isNavigationOpen.set(false);
        this.navigationPanelContext.set(null);
        this.isAdminPanelOpen.set(false);
        return;
      }
      if (item.path) {
        this.setActiveMenuKey(item.path);
      }
      this.isSearchOpen.set(true);
      this.isNavigationOpen.set(false);
      this.navigationPanelContext.set(null);
      this.isAdminPanelOpen.set(false);
      return;
    }

    if (item.path) {
      this.setActiveMenuKey(item.path);
    }
    this.isNavigationOpen.set(false);
    this.navigationPanelContext.set(null);
    this.isSearchOpen.set(false);
    this.isAdminPanelOpen.set(false);
  }

  openAdminItem(item: SidebarMenuItem) {
    if (!item.path) {
      return;
    }
    this.router.navigateByUrl(item.path);
    this.isAdminPanelOpen.set(false);
  }

  isMenuItemActive(item: SidebarMenuItem, routeActive: boolean): boolean {
    if (this.isAdminPanelOpen()) {
      return false;
    }

    if (this.isInInformationsforvaltning()) {
      return this.isInfoMenuItem(item);
    }
    const forcedKey = this.isNavigationOpen() ? 'browse' : this.isSearchOpen() ? '/search' : null;
    if (forcedKey) {
      if (item.key === 'browse') {
        return forcedKey === 'browse';
      }
      return item.path === forcedKey;
    }

    if (item.key === 'browse') {
      return this.activeMenuKey() === 'browse';
    }
    if (routeActive) {
      return true;
    }
    return !!item.path && this.activeMenuKey() === item.path;
  }

  isMenuItemHighlighted(item: SidebarMenuItem, isActive: boolean): boolean {
    if (this.isAdminPanelOpen()) {
      return false;
    }
    if (!isActive) {
      return false;
    }
    if (item.key === 'browse') {
      return true;
    }
    return !this.isNavigationOpen() || this.isInInformationsforvaltning();
  }

  logOut() {
    this.historyService.clearHistory();
    window.location.href = '/nuxeo/logout';
  }

  startResize(event: PointerEvent) {
    event.preventDefault();
    this.resizing.set(true);

    const onMove = (e: PointerEvent) => {
      if (!this.resizing) return;

      this.searchPanelWidth.set(e.clientX - 70);
    };

    const onUp = () => {
      this.resizing.set(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  private updateActiveMenuFromUrl(url: string) {
    const rawPath = url.split('?')[0]?.split('#')[0] ?? '';
    const path = this.stripRolePrefix(rawPath) || '/';
    this.isAdminRouteActive.set(this.isAdminRoute(path));
    if (this.isAdminRouteActive()) {
      this.setActiveMenuKey(null);
      return;
    }
    const menuKey = this.getMenuKeyForPath(path);
    if (menuKey) {
      this.setActiveMenuKey(menuKey);
      return;
    }
    if (this.isDetailRoute(path)) {
      return;
    }
  }

  private isDetailRoute(path: string): boolean {
    return this.detailPrefixes.some(prefix => path === prefix || path.startsWith(`${prefix}/`));
  }

  private isAdminRoute(path: string): boolean {
    return path === this.adminPrefix || path.startsWith(`${this.adminPrefix}/`);
  }

  private getMenuKeyForPath(path: string): string | null {
    const match = this.menuItems().find(item => {
      if (!item.path) return false;
      if (item.path === '/') return path === '/';
      return path === item.path || path.startsWith(`${item.path}/`);
    });
    return match?.path ?? null;
  }

  private isInfoMenuItem(item: SidebarMenuItem): boolean {
    return item.icon === 'Informationsforvaltning' || item.path === this.infoMenuItem.path;
  }

  private stripRolePrefix(path: string): string {
    for (const prefix of this.rolePrefixes) {
      if (path === prefix) {
        return '/';
      }
      if (path.startsWith(`${prefix}/`)) {
        return path.slice(prefix.length) || '/';
      }
    }
    return path;
  }

  private setActiveMenuKey(key: string | null) {
    this.activeMenuKey.set(key);
    if (!key) {
      sessionStorage.removeItem(this.activeMenuKeyStorage);
      return;
    }
    sessionStorage.setItem(this.activeMenuKeyStorage, key);
  }

  private restoreMenuKeyAfterNavClose() {
    if (!this.navOpenContext) {
      return;
    }
    const rawPath = this.router.url.split('?')[0]?.split('#')[0] ?? '';
    const currentPath = this.stripRolePrefix(rawPath) || '/';
    if (currentPath === this.navOpenContext.path) {
      this.setActiveMenuKey(this.navOpenContext.menuKey);
    }
    this.navOpenContext = null;
  }

  private restoreActiveMenuKey() {
    const stored = sessionStorage.getItem(this.activeMenuKeyStorage);
    if (stored) {
      this.activeMenuKey.set(stored);
    }
  }

  private restorePanelState() {
    const storedNavigation = sessionStorage.getItem(this.navigationOpenStorage);
    const storedSearch = sessionStorage.getItem(this.searchOpenStorage);

    if (storedNavigation !== null) {
      this.isNavigationOpen.set(storedNavigation === '1');
    }

    if (storedSearch !== null) {
      this.isSearchOpen.set(storedSearch === '1');
    }

    if (this.isNavigationOpen()) {
      this.navigationPanelContext.set(this.activeMenuKey() === this.infoMenuItem.path ? 'info' : 'browse');
    }

    if (this.isNavigationOpen() && this.isSearchOpen()) {
      this.isSearchOpen.set(false);
    }
  }
}
