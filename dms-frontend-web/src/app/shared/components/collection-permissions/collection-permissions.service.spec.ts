import { TestBed } from '@angular/core/testing';
import { CollectionPermissionsService } from './collection-permissions.service';
import { NuxeoAcl } from '@app/shared/api/nuxeo-api.types';
import { Option } from '@app/shared/commonTypes';

function makeAcl(name: string, aces: unknown[] = []): NuxeoAcl {
  return { name, aces } as unknown as NuxeoAcl;
}

function makeAce(overrides: Record<string, unknown> = {}) {
  return {
    grant: true,
    granted: true,
    username: {
      'entity-type': 'user',
      id: 'user1',
      properties: { firstName: 'Anna', lastName: 'Svensson', email: 'anna@test.com' },
    },
    creator: { id: 'admin', properties: { firstName: 'Admin', lastName: 'User' } },
    permission: 'Read',
    id: 'ace-1',
    ...overrides,
  };
}

describe('CollectionPermissionsService', () => {
  let service: CollectionPermissionsService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [CollectionPermissionsService] });
    service = TestBed.inject(CollectionPermissionsService);
  });

  describe('parseAclEntries', () => {
    it('returns empty result for empty input', () => {
      const result = service.parseAclEntries([]);
      expect(result.local).toEqual([]);
      expect(result.inherited).toEqual([]);
      expect(result.external).toEqual([]);
    });

    it('parses local user entry', () => {
      const acl = makeAcl('local', [makeAce()]);
      const result = service.parseAclEntries([acl]);
      expect(result.local.length).toBe(1);
      expect(result.local[0].principalType).toBe('user');
      expect(result.local[0].displayLabel).toContain('Anna');
    });

    it('filters out denied entries (grant=false)', () => {
      const acl = makeAcl('local', [makeAce({ grant: false })]);
      const result = service.parseAclEntries([acl]);
      expect(result.local.length).toBe(0);
    });

    it('classifies inherited entries', () => {
      const acl = makeAcl('inherited', [makeAce({ id: 'inh-1' })]);
      const result = service.parseAclEntries([acl]);
      expect(result.inherited.length).toBe(1);
    });

    it('classifies external entries by email', () => {
      const ace = makeAce({ email: 'ext@external.com', externalUser: true });
      const acl = makeAcl('local', [ace]);
      const result = service.parseAclEntries([acl]);
      expect(result.external.length).toBe(1);
      expect(result.external[0].principalType).toBe('external');
    });

    it('handles string principal', () => {
      const ace = { ...makeAce(), username: 'simple-user' };
      const acl = makeAcl('local', [ace]);
      const result = service.parseAclEntries([acl]);
      expect(result.local.length).toBe(1);
      expect(result.local[0].displayLabel).toBe('simple-user');
    });

    it('handles group principal', () => {
      const ace = makeAce({
        username: { 'entity-type': 'group', id: 'group-1', properties: { grouplabel: 'My Group' } },
      });
      const acl = makeAcl('local', [ace]);
      const result = service.parseAclEntries([acl]);
      expect(result.local[0].principalType).toBe('group');
      expect(result.local[0].displayLabel).toBe('My Group');
    });

    it('marks inheritanceBlocked when no inherited ACL', () => {
      const acl = makeAcl('local', [makeAce()]);
      const result = service.parseAclEntries([acl]);
      expect(result.inheritanceBlocked).toBeTrue();
    });

    it('marks inheritanceBlocked as false when inherited ACL exists', () => {
      const acl = makeAcl('inherited', []);
      const result = service.parseAclEntries([acl]);
      expect(result.inheritanceBlocked).toBeFalse();
    });

    it('uses ace array when aces is absent', () => {
      const acl = { name: 'local', ace: [makeAce()] } as unknown as NuxeoAcl;
      const result = service.parseAclEntries([acl]);
      expect(result.local.length).toBe(1);
    });
  });

  describe('resolvePermissionLabel', () => {
    const permOptions: Option[] = [
      { id: 'read', label: 'Läsa' },
      { id: 'write', label: 'Skriva' },
    ];

    it('returns matching label case-insensitively', () => {
      expect(service.resolvePermissionLabel('Read', permOptions)).toBe('Läsa');
    });

    it('returns empty string when no match', () => {
      expect(service.resolvePermissionLabel('Delete', permOptions)).toBe('');
    });
  });

  describe('buildTimeFrameLabel', () => {
    it('returns "Permanent" when no begin or end', () => {
      const entry = { begin: null, end: null } as never;
      expect(service.buildTimeFrameLabel(entry)).toBe('Permanent');
    });

    it('formats date range when both set', () => {
      const entry = { begin: '2024-01-01', end: '2024-12-31' } as never;
      const result = service.buildTimeFrameLabel(entry);
      expect(result).toContain('-');
    });
  });

  describe('mapPermissionsToRows', () => {
    it('maps entries to table rows', () => {
      const entries = [
        {
          key: 'k1',
          displayLabel: 'User A',
          permission: 'read',
          begin: null,
          end: null,
          creatorLabel: 'Admin',
        },
      ] as never;
      const permOptions: Option[] = [{ id: 'read', label: 'Read' }];
      const rows = service.mapPermissionsToRows(entries, permOptions);
      expect(rows.length).toBe(1);
      expect(rows[0]['principal']).toBe('User A');
      expect(rows[0]['right']).toBe('Read');
      expect(rows[0]['timeFrame']).toBe('Permanent');
    });
  });
});
