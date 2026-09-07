import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, OnInit, output, signal } from '@angular/core';
import { NxUser } from '@app/shared/api/nuxeo-api.types';
import {
  DigiFormInputSearch,
  DigiButton,
  DigiIconFileDocument,
  DigiDialog,
  DigiHeaderNotification,
  DigiIconBell,
  DigiIconSettings,
  DigiFormSelect,
  DigiFormRadiobutton,
  DigiFormRadiogroup,
} from '@designsystem-se/af-angular';
import { HistoryService } from '@app/core/services/history-service.service';
import { SearchService } from '@app/core/services/search.service';
import { BaseButton, GeneralStore } from '@app/core/services/general-store.service';
import { ActionButton, ButtonMenuComponent } from '../button-menu.component/button-menu.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
import { UserModalComponent } from '../user-modal/user-modal.component';
import { NavbarRemindersComponent } from '../navbar-reminders/navbar-reminders.component';
import { AuthService } from '@app/core/services/auth.service';
import { UiMode, UiModeService } from '@app/core/services/ui-mode.service';
import { AppTheme, CustomColors, ThemeService } from '@app/core/services/theme.service';
import { getUserDisplayName, getUserInitials } from '@app/shared/utils/display-label';
import { AppRole } from '@app/shared/models/roles';

export interface GeneralSearchResult {
  id: string;
  label: string;
  thumbnailUrl: string;
  type: string;
  url: string;
  highlights?: { segments: string[] }[];
  thumbnailError?: boolean;
}

@Component({
  selector: 'nuxeo-navbar',
  standalone: true,
  templateUrl: './navbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    DigiFormInputSearch,
    DigiButton,
    ButtonMenuComponent,
    DigiIconFileDocument,
    DigiDialog,
    UserModalComponent,
    DigiHeaderNotification,
    DigiIconBell,
    DigiIconSettings,
    NavbarRemindersComponent,
    DigiFormSelect,
    DigiFormRadiobutton,
    DigiFormRadiogroup,
  ],
})
export class NavbarComponent implements OnInit {
  toggleSidebar = output<void>();
  user = input<NxUser | undefined>();
  isLogOutDialogOpened = signal(false);
  isUiModeDialogOpened = signal(false);
  historyService = inject(HistoryService);
  private nuxeoApi = inject(NuxeoApiService);
  private searchService = inject(SearchService);
  readonly auth = inject(AuthService);
  readonly uiModeService = inject(UiModeService);
  readonly themeService = inject(ThemeService);
  pendingTheme = signal<AppTheme>('default');
  pendingCustomColors = signal<CustomColors>({ ...this.themeService.customColors() });
  pendingHideStartImages = signal(false);
  pendingHideWeekCalendar = signal(false);
  readonly store = inject(GeneralStore);
  baseButtons = signal<BaseButton[]>([]);
  openPage = signal<string | null>(null);
  isSearchResultsOpen = signal<boolean>(false);
  searchResults = signal<GeneralSearchResult[] | null>(null);
  pendingActiveRole = signal<AppRole | null>(null);
  pendingAdminViewEnabled = signal(true);
  logo = '/nuxeo/app/assets/logo.png';
  readonly customColorFields: { key: keyof CustomColors; label: string }[] = [
    { key: 'primary', label: 'Sidfält' },
    { key: 'grayPrimary', label: 'Bakgrund' },
    { key: 'headerPrimary', label: 'Sidhuvud' },
    { key: 'tableHeader', label: 'Tabellrubrik' },
    { key: 'arendeButton', label: 'Åtgärdsknapp' },
  ];
  readonly router = inject(Router);
  readonly baseUrl = '/nuxeo/';
  private search$ = new Subject<string>();

  ngOnInit() {
    this.search$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(searchLine => this.nuxeoApi.getGeneralSearchResults(searchLine))
      )
      .subscribe(data => {
        this.searchResults.set(data);
      });
  }

  constructor() {
    effect(() => {
      this.baseButtons.set(this.store.baseButtons());

      this.openPage.set(this.store.openPage());
    });
  }

  isStartPage(): boolean {
    return this.openPage() === 'start';
  }

  canChooseUiMode(): boolean {
    return this.auth.activeRole() === 'HANDLAGGARE';
  }

  canChooseRole(): boolean {
    return this.auth.roles().length > 1;
  }

  canOpenSettings(): boolean {
    return true;
  }

  openUiModeDialog(): void {
    if (!this.canOpenSettings()) return;
    this.pendingActiveRole.set(this.auth.activeRole());
    this.pendingAdminViewEnabled.set(this.auth.adminViewEnabled());
    this.pendingTheme.set(this.themeService.currentTheme());
    this.pendingCustomColors.set({ ...this.themeService.customColors() });
    this.pendingHideStartImages.set(this.themeService.hideStartPageImages());
    this.pendingHideWeekCalendar.set(this.themeService.hideWeekCalendar());
    this.isUiModeDialogOpened.set(true);
  }

  closeSettingsDialog(): void {
    this.pendingActiveRole.set(this.auth.activeRole());
    this.pendingAdminViewEnabled.set(this.auth.adminViewEnabled());
    this.pendingTheme.set(this.themeService.currentTheme());
    this.pendingCustomColors.set({ ...this.themeService.customColors() });
    this.pendingHideStartImages.set(this.themeService.hideStartPageImages());
    this.pendingHideWeekCalendar.set(this.themeService.hideWeekCalendar());
    this.isUiModeDialogOpened.set(false);
  }

  confirmSettingsDialog(): void {
    const pendingRole = this.pendingActiveRole();
    if (pendingRole && this.auth.roles().includes(pendingRole)) {
      this.auth.setActiveRole(pendingRole);
    }
    if (this.auth.isAdmin()) {
      this.auth.setAdminViewEnabled(this.pendingAdminViewEnabled());
    }
    this.themeService.setTheme(this.pendingTheme());
    if (this.pendingTheme() === 'custom') {
      this.themeService.setCustomColors(this.pendingCustomColors());
    }
    this.themeService.setHideStartPageImages(this.pendingHideStartImages());
    this.themeService.setHideWeekCalendar(this.pendingHideWeekCalendar());
    this.isUiModeDialogOpened.set(false);
  }

  setPendingTheme(theme: AppTheme): void {
    this.pendingTheme.set(theme);
  }

  onThemeSelectChange(value: string): void {
    const themes: AppTheme[] = ['default', 'blue', 'dark', 'kawaii', 'custom'];
    const theme = themes.find(t => t === value);
    if (theme) this.setPendingTheme(theme);
  }

  onCustomColorChange(key: keyof CustomColors, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.pendingCustomColors.update(colors => ({ ...colors, [key]: value }));
  }

  setUiMode(mode: UiMode): void {
    this.uiModeService.setMode(mode);
  }

  setPendingActiveRole(role: string): void {
    switch (role) {
      case 'REGISTRATOR':
        this.pendingActiveRole.set('REGISTRATOR');
        break;
      case 'CHEF':
        this.pendingActiveRole.set('CHEF');
        break;
      case 'HANDLAGGARE':
        this.pendingActiveRole.set('HANDLAGGARE');
        break;
      case 'ADMIN':
        this.pendingActiveRole.set('ADMIN');
        break;
      case 'ARKIVARIE':
        this.pendingActiveRole.set('ARKIVARIE');
        break;
    }
  }

  togglePendingAdminView(): void {
    this.pendingAdminViewEnabled.update(enabled => !enabled);
  }

  openDocument(uid: string): void {
    this.router.navigate(['/doc/', uid]);
  }

  onThumbnailError(item: GeneralSearchResult): void {
    item.thumbnailError = true;
  }
  onToggleSidebar() {
    this.toggleSidebar.emit();
  }
  onSeachEvent(value: unknown) {
    const searchLine = this.searchService.extractTerm(value);
    this.search$.next(searchLine);
  }

  handleMenuClick(button: ActionButton) {
    button.click();
  }

  get userInitials(): string {
    return getUserInitials(this.user());
  }

  get userDisplayName(): string {
    return getUserDisplayName(this.user());
  }

  logOut() {
    this.historyService.clearHistory();
    window.location.href = '/nuxeo/logout';
  }
}
