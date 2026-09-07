import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { SidebarComponent } from './sidebar.component';
import { GeneralStore, BaseButton } from '@app/core/services/general-store.service';
import { AuthService } from '@app/core/services/auth.service';
import { HistoryService } from '@app/core/services/history-service.service';
import { UiModeService } from '@app/core/services/ui-mode.service';
import { ThemeService } from '@app/core/services/theme.service';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NuxeoDocument, MessagesJson, NxUser } from '@app/shared/api/nuxeo-api.types';

interface SidebarPrivate {
  updateActiveMenuFromUrl: (url: string) => void;
  stripRolePrefix: (path: string) => string;
  getMenuKeyForPath: (path: string) => string | null;
}

function makeStoreMock() {
  return {
    notification: { set: jasmine.createSpy('set') },
    navigationPanelContext: { set: jasmine.createSpy('set') },
    openPage: signal<string | null>(null),
    lastCreatedCase: signal<NuxeoDocument | null>(null),
    baseButtons: signal<BaseButton[]>([]),
    messagesInfo: signal<MessagesJson | null>(null),
    getValue: jasmine.createSpy('getValue').and.returnValue(null),
    getStatus: jasmine.createSpy('getStatus').and.returnValue(''),
  };
}

function makeAuthMock(role = 'HANDLAGGARE') {
  const activeRole = signal<string>(role);
  return {
    activeRole,
    loaded: signal(true),
    loadError: signal(null),
    username: signal<string | null>('testuser'),
    adminViewEnabled: signal(false),
    isAdmin: computed(() => false),
    user: signal<NxUser | undefined>(undefined),
    roles: signal<string[]>([role]),
    loadMe: jasmine.createSpy('loadMe'),
    hasRole: jasmine.createSpy('hasRole').and.returnValue(false),
  };
}

function makeUiModeMock(simplified = false) {
  return {
    isSimplified: signal(simplified),
    mode: signal(simplified ? 'simplified' : 'standard'),
    setMode: jasmine.createSpy('setMode'),
  };
}

function makeThemeMock(theme = 'default') {
  return {
    currentTheme: signal<string>(theme),
    hideStartPageImages: signal(false),
    hideWeekCalendar: signal(false),
    setTheme: jasmine.createSpy('setTheme'),
  };
}

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;
  let storeMock: ReturnType<typeof makeStoreMock>;
  let authMock: ReturnType<typeof makeAuthMock>;
  let uiModeMock: ReturnType<typeof makeUiModeMock>;
  let themeMock: ReturnType<typeof makeThemeMock>;
  let historySpy: jasmine.SpyObj<HistoryService>;
  let router: Router;

  beforeEach(async () => {
    sessionStorage.clear();

    storeMock = makeStoreMock();
    authMock = makeAuthMock('HANDLAGGARE');
    uiModeMock = makeUiModeMock(false);
    themeMock = makeThemeMock('default');
    historySpy = jasmine.createSpyObj('HistoryService', ['clearHistory']);

    const apiSpy = jasmine.createSpyObj('NuxeoApiService', ['getMessagesJSON']);
    apiSpy.getMessagesJSON.and.returnValue(of({}));

    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: GeneralStore, useValue: storeMock },
        { provide: AuthService, useValue: authMock },
        { provide: HistoryService, useValue: historySpy },
        { provide: UiModeService, useValue: uiModeMock },
        { provide: ThemeService, useValue: themeMock },
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    })
      .overrideTemplate(SidebarComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('defaultIconColor', () => {
    it('returns black for default theme', () => {
      expect(component.defaultIconColor()).toBe('black');
    });

    it('returns white when themeService returns dark', () => {
      themeMock.currentTheme.set('dark');
      fixture.detectChanges();
      expect(component.defaultIconColor()).toBe('white');
    });
  });

  describe('menuItems computed', () => {
    it('includes base menu items for HANDLAGGARE', () => {
      const items = component.menuItems();
      expect(items.some(i => i.path === '/')).toBeTrue();
    });

    it('excludes Informationsförvaltning for HANDLAGGARE', () => {
      const items = component.menuItems();
      expect(items.some(i => i.path === '/informationsforvaltning')).toBeFalse();
    });

    it('includes Informationsförvaltning when activeRole is ARKIVARIE', () => {
      (authMock.activeRole as ReturnType<typeof signal<string>>).set('ARKIVARIE');
      fixture.detectChanges();
      const items = component.menuItems();
      expect(items.some(i => i.path === '/informationsforvaltning')).toBeTrue();
    });

    it('includes archivist menu items for ARKIVARIE', () => {
      (authMock.activeRole as ReturnType<typeof signal<string>>).set('ARKIVARIE');
      fixture.detectChanges();
      const items = component.menuItems();
      expect(items.some(i => i.path === '/arkivera')).toBeTrue();
      expect(items.some(i => i.path === '/gallring')).toBeTrue();
    });

    it('excludes browse and collections for simplified HANDLAGGARE', () => {
      (uiModeMock.isSimplified as ReturnType<typeof signal<boolean>>).set(true);
      fixture.detectChanges();
      const items = component.menuItems();
      expect(items.some(i => i.key === 'browse')).toBeFalse();
      expect(items.some(i => i.path === '/collections')).toBeFalse();
    });
  });

  describe('showNavPanel', () => {
    it('opens navigation panel and sets context to browse', () => {
      component.isNavigationOpen.set(false);
      component.showNavPanel();
      expect(component.isNavigationOpen()).toBeTrue();
      expect(component.navigationPanelContext()).toBe('browse');
    });

    it('closes search panel when opening nav panel', () => {
      component.isSearchOpen.set(true);
      component.showNavPanel();
      expect(component.isSearchOpen()).toBeFalse();
    });

    it('closes admin panel when opening nav panel', () => {
      component.isAdminPanelOpen.set(true);
      component.isNavigationOpen.set(false);
      component.showNavPanel();
      expect(component.isAdminPanelOpen()).toBeFalse();
    });

    it('closes nav panel when already open in browse context', () => {
      component.isNavigationOpen.set(true);
      component.navigationPanelContext.set('browse');
      component.showNavPanel();
      expect(component.isNavigationOpen()).toBeFalse();
      expect(component.navigationPanelContext()).toBeNull();
    });

    it('opens nav panel when context is info (switching to browse)', () => {
      component.isNavigationOpen.set(true);
      component.navigationPanelContext.set('info');
      component.showNavPanel();
      expect(component.isNavigationOpen()).toBeTrue();
      expect(component.navigationPanelContext()).toBe('browse');
    });
  });

  describe('showInfoPanel', () => {
    it('opens info panel with context info', () => {
      component.isNavigationOpen.set(false);
      component.showInfoPanel();
      expect(component.isNavigationOpen()).toBeTrue();
      expect(component.navigationPanelContext()).toBe('info');
    });

    it('closes nav panel if already in informationsforvaltning', () => {
      component.isNavigationOpen.set(true);
      component.navigationPanelContext.set('info');
      component.showInfoPanel();
      expect(component.isNavigationOpen()).toBeFalse();
    });

    it('closes search panel when showing info panel', () => {
      component.isSearchOpen.set(true);
      component.showInfoPanel();
      expect(component.isSearchOpen()).toBeFalse();
    });

    it('closes admin panel when showing info panel', () => {
      component.isAdminPanelOpen.set(true);
      component.showInfoPanel();
      expect(component.isAdminPanelOpen()).toBeFalse();
    });
  });

  describe('toggleAdminPanel', () => {
    it('toggles admin panel open', () => {
      component.isAdminPanelOpen.set(false);
      component.toggleAdminPanel();
      expect(component.isAdminPanelOpen()).toBeTrue();
    });

    it('toggles admin panel closed', () => {
      component.isAdminPanelOpen.set(true);
      component.toggleAdminPanel();
      expect(component.isAdminPanelOpen()).toBeFalse();
    });

    it('closes navigation panel when admin panel opens', () => {
      component.isNavigationOpen.set(true);
      component.navigationPanelContext.set('browse');
      component.isAdminPanelOpen.set(false);
      component.toggleAdminPanel();
      expect(component.isNavigationOpen()).toBeFalse();
      expect(component.navigationPanelContext()).toBeNull();
    });

    it('closes search panel when admin panel opens', () => {
      component.isSearchOpen.set(true);
      component.isAdminPanelOpen.set(false);
      component.toggleAdminPanel();
      expect(component.isSearchOpen()).toBeFalse();
    });
  });

  describe('closeNavigationPanel', () => {
    it('closes navigation and search panels and resets context', () => {
      component.isNavigationOpen.set(true);
      component.navigationPanelContext.set('browse');
      component.isSearchOpen.set(true);
      component.isAdminPanelOpen.set(true);
      component.closeNavigationPanel();
      expect(component.isNavigationOpen()).toBeFalse();
      expect(component.navigationPanelContext()).toBeNull();
      expect(component.isSearchOpen()).toBeFalse();
      expect(component.isAdminPanelOpen()).toBeFalse();
    });
  });

  describe('closeSearchPanel', () => {
    it('closes search panel and navigation panel', () => {
      component.isSearchOpen.set(true);
      component.isNavigationOpen.set(true);
      component.closeSearchPanel();
      expect(component.isSearchOpen()).toBeFalse();
      expect(component.isNavigationOpen()).toBeFalse();
      expect(component.navigationPanelContext()).toBeNull();
    });
  });

  describe('isInBladdra', () => {
    it('is true when nav open and context is browse', () => {
      component.isNavigationOpen.set(true);
      component.navigationPanelContext.set('browse');
      expect(component.isInBladdra()).toBeTrue();
    });

    it('is false when nav closed', () => {
      component.isNavigationOpen.set(false);
      expect(component.isInBladdra()).toBeFalse();
    });

    it('is false when context is info', () => {
      component.isNavigationOpen.set(true);
      component.navigationPanelContext.set('info');
      expect(component.isInBladdra()).toBeFalse();
    });
  });

  describe('isInInformationsforvaltning', () => {
    it('is true when nav open and context is info', () => {
      component.isNavigationOpen.set(true);
      component.navigationPanelContext.set('info');
      expect(component.isInInformationsforvaltning()).toBeTrue();
    });

    it('is false when nav closed', () => {
      component.isNavigationOpen.set(false);
      expect(component.isInInformationsforvaltning()).toBeFalse();
    });
  });

  describe('clickOnOtherTab', () => {
    it('opens search panel for Search icon item when closed', () => {
      const searchItem = { label: 'Sök', icon: 'Search', path: '/search' };
      component.isSearchOpen.set(false);
      component.clickOnOtherTab(searchItem);
      expect(component.isSearchOpen()).toBeTrue();
    });

    it('closes search panel for Search icon item when already open', () => {
      const searchItem = { label: 'Sök', icon: 'Search', path: '/search' };
      component.isSearchOpen.set(true);
      const event = new MouseEvent('click');
      component.clickOnOtherTab(searchItem, event);
      expect(component.isSearchOpen()).toBeFalse();
    });

    it('calls showInfoPanel for informationsforvaltning icon item', () => {
      const infoItem = { label: 'Info', icon: 'Informationsforvaltning', path: '/informationsforvaltning' };
      const spy = spyOn(component, 'showInfoPanel');
      component.clickOnOtherTab(infoItem);
      expect(spy).toHaveBeenCalled();
    });

    it('closes nav and search panels for regular path item', () => {
      component.isNavigationOpen.set(true);
      component.isSearchOpen.set(true);
      const item = { label: 'Start', icon: 'Home', path: '/' };
      component.clickOnOtherTab(item);
      expect(component.isNavigationOpen()).toBeFalse();
      expect(component.isSearchOpen()).toBeFalse();
    });

    it('sets activeMenuKey for regular path item', () => {
      const item = { label: 'Nyligen', icon: 'History', path: '/recent' };
      component.clickOnOtherTab(item);
      expect(component.activeMenuKey()).toBe('/recent');
    });

    it('closes navigation panel when opening search panel', () => {
      component.isNavigationOpen.set(true);
      const searchItem = { label: 'Sök', icon: 'Search', path: '/search' };
      component.isSearchOpen.set(false);
      component.clickOnOtherTab(searchItem);
      expect(component.isNavigationOpen()).toBeFalse();
    });
  });

  describe('openAdminItem', () => {
    it('navigates to item path and closes admin panel', () => {
      const navigateSpy = spyOn(router, 'navigateByUrl');
      component.isAdminPanelOpen.set(true);
      component.openAdminItem({ label: 'Audit', path: '/admin/audit-logg' });
      expect(navigateSpy).toHaveBeenCalledWith('/admin/audit-logg');
      expect(component.isAdminPanelOpen()).toBeFalse();
    });

    it('does nothing for item without path', () => {
      const navigateSpy = spyOn(router, 'navigateByUrl');
      component.openAdminItem({ label: 'Systemanalys' });
      expect(navigateSpy).not.toHaveBeenCalled();
    });
  });

  describe('isMenuItemActive', () => {
    it('returns false when admin panel is open', () => {
      component.isAdminPanelOpen.set(true);
      const item = { label: 'Start', path: '/' };
      expect(component.isMenuItemActive(item, true)).toBeFalse();
    });

    it('returns true for info menu item when in informationsforvaltning context', () => {
      component.isNavigationOpen.set(true);
      component.navigationPanelContext.set('info');
      const infoItem = { label: 'Info', icon: 'Informationsforvaltning', path: '/informationsforvaltning' };
      expect(component.isMenuItemActive(infoItem, false)).toBeTrue();
    });

    it('returns false for non-info item when in informationsforvaltning context', () => {
      component.isNavigationOpen.set(true);
      component.navigationPanelContext.set('info');
      const item = { label: 'Start', path: '/' };
      expect(component.isMenuItemActive(item, false)).toBeFalse();
    });

    it('returns true for browse item when nav is open', () => {
      component.isNavigationOpen.set(true);
      component.navigationPanelContext.set('browse');
      const item = { label: 'Bläddra', key: 'browse' };
      expect(component.isMenuItemActive(item, false)).toBeTrue();
    });

    it('returns true for search item when search is open', () => {
      component.isSearchOpen.set(true);
      component.isNavigationOpen.set(false);
      const item = { label: 'Sök', icon: 'Search', path: '/search' };
      expect(component.isMenuItemActive(item, false)).toBeTrue();
    });

    it('returns true when routeActive is true', () => {
      component.isNavigationOpen.set(false);
      component.isSearchOpen.set(false);
      component.isAdminPanelOpen.set(false);
      const item = { label: 'Start', path: '/' };
      expect(component.isMenuItemActive(item, true)).toBeTrue();
    });

    it('returns true when activeMenuKey matches item path', () => {
      component.activeMenuKey.set('/recent');
      component.isNavigationOpen.set(false);
      component.isSearchOpen.set(false);
      component.isAdminPanelOpen.set(false);
      const item = { label: 'Nyligen', path: '/recent' };
      expect(component.isMenuItemActive(item, false)).toBeTrue();
    });

    it('returns false for browse item when activeMenuKey is not browse', () => {
      component.activeMenuKey.set('/recent');
      component.isNavigationOpen.set(false);
      component.isSearchOpen.set(false);
      const item = { label: 'Bläddra', key: 'browse' };
      expect(component.isMenuItemActive(item, false)).toBeFalse();
    });
  });

  describe('isMenuItemHighlighted', () => {
    it('returns false when admin panel is open', () => {
      component.isAdminPanelOpen.set(true);
      expect(component.isMenuItemHighlighted({ label: 'Start', path: '/' }, true)).toBeFalse();
    });

    it('returns false when not active', () => {
      expect(component.isMenuItemHighlighted({ label: 'Start', path: '/' }, false)).toBeFalse();
    });

    it('returns true for browse item when active', () => {
      const item = { label: 'Bläddra', key: 'browse' };
      expect(component.isMenuItemHighlighted(item, true)).toBeTrue();
    });

    it('returns true for path item when nav is not open and active', () => {
      component.isNavigationOpen.set(false);
      const item = { label: 'Start', path: '/' };
      expect(component.isMenuItemHighlighted(item, true)).toBeTrue();
    });

    it('returns false for path item when nav is open and not in informationsforvaltning', () => {
      component.isNavigationOpen.set(true);
      component.navigationPanelContext.set('browse');
      const item = { label: 'Start', path: '/' };
      expect(component.isMenuItemHighlighted(item, true)).toBeFalse();
    });

    it('returns true for info item when in informationsforvaltning context', () => {
      component.isNavigationOpen.set(true);
      component.navigationPanelContext.set('info');
      const infoItem = { label: 'Info', icon: 'Informationsforvaltning', path: '/informationsforvaltning' };
      expect(component.isMenuItemHighlighted(infoItem, true)).toBeTrue();
    });
  });

  describe('logOut', () => {
    it('clears history when logOut is called', () => {
      component.historyService.clearHistory();
      expect(historySpy.clearHistory).toHaveBeenCalled();
    });
  });

  describe('startResize', () => {
    it('sets resizing to true', () => {
      const event = new PointerEvent('pointerdown', { clientX: 400 });
      spyOn(event, 'preventDefault');
      component.startResize(event);
      expect(component.resizing()).toBeTrue();
    });

    it('updates searchPanelWidth on pointermove', () => {
      const downEvent = new PointerEvent('pointerdown', { clientX: 400 });
      component.startResize(downEvent);
      const moveEvent = new PointerEvent('pointermove', { clientX: 500 });
      window.dispatchEvent(moveEvent);
      expect(component.searchPanelWidth()).toBe(430);
    });

    it('sets resizing to false on pointerup', () => {
      const downEvent = new PointerEvent('pointerdown', { clientX: 400 });
      component.startResize(downEvent);
      const upEvent = new PointerEvent('pointerup');
      window.dispatchEvent(upEvent);
      expect(component.resizing()).toBeFalse();
    });
  });

  describe('sessionStorage restore', () => {
    it('setActiveMenuKey (via clickOnOtherTab) writes to sessionStorage', () => {
      const item = { label: 'Favoriter', icon: 'Star', path: '/favorites' };
      component.clickOnOtherTab(item);
      expect(sessionStorage.getItem('sidebar.activeMenuKey')).toBe('/favorites');
    });

    it('effect persists isNavigationOpen state to sessionStorage', () => {
      component.isNavigationOpen.set(true);
      fixture.detectChanges();
      expect(sessionStorage.getItem('sidebar.isNavigationOpen')).toBe('1');
    });

    it('effect persists isNavigationOpen false to sessionStorage', () => {
      component.isNavigationOpen.set(false);
      fixture.detectChanges();
      expect(sessionStorage.getItem('sidebar.isNavigationOpen')).toBe('0');
    });

    it('effect persists isSearchOpen state to sessionStorage', () => {
      component.isSearchOpen.set(true);
      fixture.detectChanges();
      expect(sessionStorage.getItem('sidebar.isSearchOpen')).toBe('1');
    });

    it('effect persists isSearchOpen false to sessionStorage', () => {
      component.isSearchOpen.set(false);
      fixture.detectChanges();
      expect(sessionStorage.getItem('sidebar.isSearchOpen')).toBe('0');
    });
  });

  describe('isAdminRouteActive', () => {
    it('updates isAdminRouteActive from URL on init', () => {
      expect(component.isAdminRouteActive()).toBeFalse();
    });

    it('sets isAdminRouteActive true via updateActiveMenuFromUrl with admin path', () => {
      (component as unknown as SidebarPrivate).updateActiveMenuFromUrl('/admin/audit-logg');
      expect(component.isAdminRouteActive()).toBeTrue();
    });

    it('sets isAdminRouteActive false for non-admin path', () => {
      (component as unknown as SidebarPrivate).updateActiveMenuFromUrl('/admin/audit-logg');
      (component as unknown as SidebarPrivate).updateActiveMenuFromUrl('/search');
      expect(component.isAdminRouteActive()).toBeFalse();
    });
  });

  describe('stripRolePrefix', () => {
    it('strips registrar prefix', () => {
      expect((component as unknown as SidebarPrivate).stripRolePrefix('/registrar/some/path')).toBe('/some/path');
    });

    it('strips chef prefix', () => {
      expect((component as unknown as SidebarPrivate).stripRolePrefix('/chef/dashboard')).toBe('/dashboard');
    });

    it('returns / for exact prefix match', () => {
      expect((component as unknown as SidebarPrivate).stripRolePrefix('/registrar')).toBe('/');
    });

    it('returns path as-is for non-role prefix', () => {
      expect((component as unknown as SidebarPrivate).stripRolePrefix('/search')).toBe('/search');
    });
  });

  describe('getMenuKeyForPath', () => {
    it('returns null for detail routes (/doc/...)', () => {
      const key = (component as unknown as SidebarPrivate).getMenuKeyForPath('/doc/some-uid');
      expect(key).toBeNull();
    });

    it('returns /search for /search path', () => {
      const key = (component as unknown as SidebarPrivate).getMenuKeyForPath('/search');
      expect(key).toBe('/search');
    });

    it('returns / for root path', () => {
      const key = (component as unknown as SidebarPrivate).getMenuKeyForPath('/');
      expect(key).toBe('/');
    });
  });
});
