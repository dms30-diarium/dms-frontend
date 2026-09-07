import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ConstantProvider } from './constants';
import { GeneralStore } from '@app/core/services/general-store.service';

function makeStoreMock() {
  return jasmine.createSpyObj('GeneralStore', ['getValue'], {
    notification: { set: jasmine.createSpy('set') },
    navigationPanelContext: signal(null),
  });
}

describe('ConstantProvider', () => {
  let service: ConstantProvider;
  let storeSpy: ReturnType<typeof makeStoreMock>;

  beforeEach(() => {
    storeSpy = makeStoreMock();
    storeSpy.getValue.and.returnValue(null);

    TestBed.configureTestingModule({
      providers: [ConstantProvider, { provide: GeneralStore, useValue: storeSpy }],
    });
    service = TestBed.inject(ConstantProvider);
  });

  // ─── Admin branch ────────────────────────────────────────────────────────────

  describe('admin (isAdmin: true)', () => {
    it('returns MINA_UPPGIFTER config and null actionsHeader for my-tasks tab', () => {
      const result = service.resolveCasesTableConfig({ role: 'ADMIN', tab: 'my-tasks', isAdmin: true });
      expect(result.config.length).toBeGreaterThan(0);
      expect(result.actionsHeader).toBeNull();
    });

    it('returns e-post config and Åtgärder actionsHeader for e-post tab', () => {
      const result = service.resolveCasesTableConfig({ role: 'ADMIN', tab: 'e-post', isAdmin: true });
      expect(result.config.length).toBeGreaterThan(0);
      expect(result.actionsHeader).toBe('Åtgärder');
    });

    it('returns IMPORT_FILES config and null actionsHeader for scans tab', () => {
      const result = service.resolveCasesTableConfig({ role: 'ADMIN', tab: 'scans', isAdmin: true });
      expect(result.config.length).toBeGreaterThan(0);
      expect(result.actionsHeader).toBeNull();
    });

    it('returns MINA_AREDEN config and Åtgärder actionsHeader for my-cases tab', () => {
      const result = service.resolveCasesTableConfig({ role: 'ADMIN', tab: 'my-cases', isAdmin: true });
      expect(result.config.length).toBeGreaterThan(0);
      expect(result.actionsHeader).toBe('Åtgärder');
    });

    it('returns MINA_AREDEN config and Åtgärder actionsHeader for my-co-handled-cases tab', () => {
      const result = service.resolveCasesTableConfig({ role: 'ADMIN', tab: 'my-co-handled-cases', isAdmin: true });
      expect(result.config.length).toBeGreaterThan(0);
      expect(result.actionsHeader).toBe('Åtgärder');
    });

    it('returns UTKAST config and Åtgärder actionsHeader for my-utkasts tab', () => {
      const result = service.resolveCasesTableConfig({ role: 'ADMIN', tab: 'my-utkasts', isAdmin: true });
      expect(result.config.length).toBeGreaterThan(0);
      expect(result.actionsHeader).toBe('Åtgärder');
    });

    it('returns MONITORING config and null actionsHeader for my-monitoring tab', () => {
      const result = service.resolveCasesTableConfig({ role: 'ADMIN', tab: 'my-monitoring', isAdmin: true });
      expect(result.config.length).toBeGreaterThan(0);
      expect(result.actionsHeader).toBeNull();
    });

    it('returns REGISTRATOR config and Åtgärder actionsHeader for all-docs tab', () => {
      const result = service.resolveCasesTableConfig({ role: 'ADMIN', tab: 'all-docs', isAdmin: true });
      expect(result.config.length).toBeGreaterThan(0);
      expect(result.actionsHeader).toBe('Åtgärder');
    });

    it('returns READY_TO_CLOSE config and null actionsHeader for ready-to-close tab', () => {
      const result = service.resolveCasesTableConfig({ role: 'ADMIN', tab: 'ready-to-close', isAdmin: true });
      expect(result.config.length).toBeGreaterThan(0);
      expect(result.actionsHeader).toBeNull();
    });

    it('returns empty config and null actionsHeader for unknown tab', () => {
      const result = service.resolveCasesTableConfig({ role: 'ADMIN', tab: 'unknown-tab', isAdmin: true });
      expect(result.config).toEqual([]);
      expect(result.actionsHeader).toBeNull();
    });
  });

  // ─── REGISTRATOR role ────────────────────────────────────────────────────────

  describe('REGISTRATOR role (isAdmin: false)', () => {
    it('returns MINA_UPPGIFTER config and null actionsHeader for my-tasks tab', () => {
      const result = service.resolveCasesTableConfig({ role: 'REGISTRATOR', tab: 'my-tasks', isAdmin: false });
      expect(result.config.length).toBeGreaterThan(0);
      expect(result.actionsHeader).toBeNull();
    });

    it('returns REGISTRATOR config and Åtgärder actionsHeader for all-docs tab', () => {
      const result = service.resolveCasesTableConfig({ role: 'REGISTRATOR', tab: 'all-docs', isAdmin: false });
      expect(result.config.length).toBeGreaterThan(0);
      expect(result.actionsHeader).toBe('Åtgärder');
    });

    it('returns e-post config and null actionsHeader for e-post tab', () => {
      const result = service.resolveCasesTableConfig({ role: 'REGISTRATOR', tab: 'e-post', isAdmin: false });
      expect(result.config.length).toBeGreaterThan(0);
      expect(result.actionsHeader).toBeNull();
    });

    it('returns IMPORT_FILES config and null actionsHeader for scans tab', () => {
      const result = service.resolveCasesTableConfig({ role: 'REGISTRATOR', tab: 'scans', isAdmin: false });
      expect(result.config.length).toBeGreaterThan(0);
      expect(result.actionsHeader).toBeNull();
    });

    it('returns READY_TO_CLOSE config and null actionsHeader for ready-to-close tab', () => {
      const result = service.resolveCasesTableConfig({ role: 'REGISTRATOR', tab: 'ready-to-close', isAdmin: false });
      expect(result.config.length).toBeGreaterThan(0);
      expect(result.actionsHeader).toBeNull();
    });

    it('returns empty config and null actionsHeader for unknown tab', () => {
      const result = service.resolveCasesTableConfig({ role: 'REGISTRATOR', tab: 'unknown-tab', isAdmin: false });
      expect(result.config).toEqual([]);
      expect(result.actionsHeader).toBeNull();
    });
  });

  // ─── HANDLAGGARE role ────────────────────────────────────────────────────────

  describe('HANDLAGGARE role (isAdmin: false)', () => {
    it('returns MINA_UPPGIFTER config and null actionsHeader for my-tasks tab', () => {
      const result = service.resolveCasesTableConfig({ role: 'HANDLAGGARE', tab: 'my-tasks', isAdmin: false });
      expect(result.config.length).toBeGreaterThan(0);
      expect(result.actionsHeader).toBeNull();
    });

    it('returns MONITORING config and null actionsHeader for my-monitoring tab', () => {
      const result = service.resolveCasesTableConfig({ role: 'HANDLAGGARE', tab: 'my-monitoring', isAdmin: false });
      expect(result.config.length).toBeGreaterThan(0);
      expect(result.actionsHeader).toBeNull();
    });

    it('returns MINA_AREDEN config and Åtgärder actionsHeader for my-cases tab', () => {
      const result = service.resolveCasesTableConfig({ role: 'HANDLAGGARE', tab: 'my-cases', isAdmin: false });
      expect(result.config.length).toBeGreaterThan(0);
      expect(result.actionsHeader).toBe('Åtgärder');
    });

    it('returns MINA_AREDEN config and Åtgärder actionsHeader for my-co-handled-cases tab', () => {
      const result = service.resolveCasesTableConfig({
        role: 'HANDLAGGARE',
        tab: 'my-co-handled-cases',
        isAdmin: false,
      });
      expect(result.config.length).toBeGreaterThan(0);
      expect(result.actionsHeader).toBe('Åtgärder');
    });

    it('returns UTKAST config and Åtgärder actionsHeader for my-utkasts tab', () => {
      const result = service.resolveCasesTableConfig({ role: 'HANDLAGGARE', tab: 'my-utkasts', isAdmin: false });
      expect(result.config.length).toBeGreaterThan(0);
      expect(result.actionsHeader).toBe('Åtgärder');
    });

    it('returns empty config and null actionsHeader for unknown tab', () => {
      const result = service.resolveCasesTableConfig({ role: 'HANDLAGGARE', tab: 'unknown-tab', isAdmin: false });
      expect(result.config).toEqual([]);
      expect(result.actionsHeader).toBeNull();
    });
  });

  // ─── CHEF role ───────────────────────────────────────────────────────────────

  describe('CHEF role (isAdmin: false) — falls through to DEFAULT', () => {
    it('returns DEFAULT config and Åtgärder actionsHeader', () => {
      const result = service.resolveCasesTableConfig({ role: 'CHEF', tab: 'any-tab', isAdmin: false });
      expect(result.config.length).toBeGreaterThan(0);
      expect(result.actionsHeader).toBe('Åtgärder');
    });
  });

  // ─── ARKIVARIE role ──────────────────────────────────────────────────────────

  describe('ARKIVARIE role (isAdmin: false) — falls through to DEFAULT', () => {
    it('returns DEFAULT config and Åtgärder actionsHeader', () => {
      const result = service.resolveCasesTableConfig({ role: 'ARKIVARIE', tab: 'any-tab', isAdmin: false });
      expect(result.config.length).toBeGreaterThan(0);
      expect(result.actionsHeader).toBe('Åtgärder');
    });
  });

  // ─── null role ───────────────────────────────────────────────────────────────

  describe('null role (isAdmin: false) — falls through to DEFAULT', () => {
    it('returns DEFAULT config and Åtgärder actionsHeader', () => {
      const result = service.resolveCasesTableConfig({ role: null, tab: 'any-tab', isAdmin: false });
      expect(result.config.length).toBeGreaterThan(0);
      expect(result.actionsHeader).toBe('Åtgärder');
    });
  });

  // ─── read-only tabs return null actionsHeader ─────────────────────────────────

  describe('read-only tabs return null actionsHeader', () => {
    it('admin my-tasks returns null actionsHeader', () => {
      const result = service.resolveCasesTableConfig({ role: 'ADMIN', tab: 'my-tasks', isAdmin: true });
      expect(result.actionsHeader).toBeNull();
    });

    it('admin scans returns null actionsHeader', () => {
      const result = service.resolveCasesTableConfig({ role: 'ADMIN', tab: 'scans', isAdmin: true });
      expect(result.actionsHeader).toBeNull();
    });

    it('admin my-monitoring returns null actionsHeader', () => {
      const result = service.resolveCasesTableConfig({ role: 'ADMIN', tab: 'my-monitoring', isAdmin: true });
      expect(result.actionsHeader).toBeNull();
    });

    it('admin ready-to-close returns null actionsHeader', () => {
      const result = service.resolveCasesTableConfig({ role: 'ADMIN', tab: 'ready-to-close', isAdmin: true });
      expect(result.actionsHeader).toBeNull();
    });

    it('REGISTRATOR my-tasks returns null actionsHeader', () => {
      const result = service.resolveCasesTableConfig({ role: 'REGISTRATOR', tab: 'my-tasks', isAdmin: false });
      expect(result.actionsHeader).toBeNull();
    });

    it('REGISTRATOR e-post returns null actionsHeader', () => {
      const result = service.resolveCasesTableConfig({ role: 'REGISTRATOR', tab: 'e-post', isAdmin: false });
      expect(result.actionsHeader).toBeNull();
    });

    it('HANDLAGGARE my-monitoring returns null actionsHeader', () => {
      const result = service.resolveCasesTableConfig({ role: 'HANDLAGGARE', tab: 'my-monitoring', isAdmin: false });
      expect(result.actionsHeader).toBeNull();
    });
  });

  // ─── tableName assignment ─────────────────────────────────────────────────────

  describe('tableName is set on returned columns', () => {
    it('DEFAULT_COLS have tableName DEFAULT', () => {
      const result = service.resolveCasesTableConfig({ role: null, tab: 'any', isAdmin: false });
      expect(result.config.every(c => c.tableName === 'DEFAULT')).toBeTrue();
    });

    it('REGISTRATOR_COLS have tableName REGISTRATOR', () => {
      const result = service.resolveCasesTableConfig({ role: 'REGISTRATOR', tab: 'all-docs', isAdmin: false });
      expect(result.config.every(c => c.tableName === 'REGISTRATOR')).toBeTrue();
    });

    it('READY_TO_CLOSE_COLS have tableName READY_TO_CLOSE', () => {
      const result = service.resolveCasesTableConfig({ role: 'ADMIN', tab: 'ready-to-close', isAdmin: true });
      expect(result.config.every(c => c.tableName === 'READY_TO_CLOSE')).toBeTrue();
    });
  });
});
