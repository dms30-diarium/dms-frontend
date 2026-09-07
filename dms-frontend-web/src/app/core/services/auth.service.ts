import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AppRole, GROUP_TO_ROLE } from '@app/shared/models/roles';
import { firstValueFrom } from 'rxjs';
import { NxUser } from '@app/shared/api/nuxeo-api.types';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

const ACTIVE_ROLE_STORAGE_KEY = 'activeRole';
const ADMIN_VIEW_STORAGE_KEY = 'adminViewEnabled';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  private meSig = signal<NxUser | null>(null);
  isAdminSig = signal(false);
  private loadedSig = signal(false);
  private errorSig = signal<unknown | null>(null);
  private loadPromise: Promise<void> | null = null;

  user = computed<NxUser | undefined>(() => this.meSig() ?? undefined);
  loaded = computed(() => this.loadedSig());
  loadError = computed(() => this.errorSig());
  isAdmin = computed(() => this.isAdminSig());
  adminViewEnabled = computed(() => this.isAdminSig() && this.adminViewEnabledSig());
  username = computed(() => this.meSig()?.id ?? null);

  fullName = computed(() => {
    const props = this.meSig()?.properties;
    const first = props?.[NUXEO_SCHEMA_FIELDS.user.firstName] ?? props?.firstName ?? '';
    const last = props?.[NUXEO_SCHEMA_FIELDS.user.lastName] ?? props?.lastName ?? '';
    return [first, last].filter(Boolean).join(' ') || this.meSig()?.id || '';
  });

  roles = computed<AppRole[]>(() => {
    const props = this.meSig()?.properties ?? {};
    let rawGroups: string[] = [];
    const prefixedGroups = props[NUXEO_SCHEMA_FIELDS.user.groups];

    if (Array.isArray(props.groups)) {
      rawGroups = props.groups;
    } else if (Array.isArray(prefixedGroups)) {
      rawGroups = prefixedGroups;
    }

    const mappedRoles = rawGroups.map(groupName => GROUP_TO_ROLE[groupName]).filter(Boolean);

    if (mappedRoles.length === 0) {
      return ['ADMIN'];
    }

    return Array.from(new Set(mappedRoles));
  });

  private activeRoleSig = signal<AppRole | null>(null);
  activeRole = computed(() => this.activeRoleSig() ?? this.roles()[0] ?? null);
  private adminViewEnabledSig = signal(this.loadAdminViewEnabled());

  async loadMe(options: { force?: boolean } = {}) {
    if (!options.force) {
      if (this.loadedSig() && this.meSig() !== null) {
        return;
      }
      if (this.loadPromise) {
        return this.loadPromise;
      }
    }

    this.loadPromise = (async () => {
      this.loadedSig.set(false);
      this.errorSig.set(null);

      try {
        const me = await firstValueFrom(this.http.get<NxUser>('/nuxeo/api/v1/me', { withCredentials: true }));
        this.meSig.set(me ?? null);
        this.restoreActiveRole();

        // isAdmin works for NxUser
        this.isAdminSig.set('isAdministrator' in me ? (me.isAdministrator ?? false) : false);
      } catch (err) {
        this.errorSig.set(err);
        this.meSig.set(null);
        this.isAdminSig.set(false);
      } finally {
        this.loadedSig.set(true);
        this.loadPromise = null;
      }
    })();

    return this.loadPromise;
  }

  setActiveRole(role: AppRole) {
    if (!this.roles().includes(role)) return;
    this.activeRoleSig.set(role);
    localStorage.setItem(ACTIVE_ROLE_STORAGE_KEY, role);
  }

  hasRole(role: AppRole) {
    return this.roles().includes(role);
  }

  setAdminViewEnabled(enabled: boolean): void {
    this.adminViewEnabledSig.set(enabled);
    localStorage.setItem(ADMIN_VIEW_STORAGE_KEY, enabled.toString());
  }

  private loadAdminViewEnabled(): boolean {
    return localStorage.getItem(ADMIN_VIEW_STORAGE_KEY) !== 'false';
  }

  private restoreActiveRole(): void {
    const storedRole = localStorage.getItem(ACTIVE_ROLE_STORAGE_KEY);
    const roles = this.roles();

    for (const role of roles) {
      if (role === storedRole) {
        this.activeRoleSig.set(role);
        return;
      }
    }

    this.activeRoleSig.set(roles[0]);
  }
}
