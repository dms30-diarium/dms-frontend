import { TestBed } from '@angular/core/testing';
import { EditPermissionService } from './edit-permission.service';

describe('EditPermissionService', () => {
  let service: EditPermissionService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [EditPermissionService] });
    service = TestBed.inject(EditPermissionService);
  });

  describe('canEditCase', () => {
    const MEDHANDLAGGARE_KEY = 'arende:medhandlaggare';
    const ANSVARIG_KEY = 'arende:ansvarigOrganisationsenhetschef';

    it('returns true for admin regardless of other conditions', () => {
      expect(service.canEditCase({}, 'user', true)).toBeTrue();
    });

    it('returns false when username is null', () => {
      const props = { [MEDHANDLAGGARE_KEY]: 'user' };
      expect(service.canEditCase(props, null)).toBeFalse();
    });

    it('returns false when username is undefined', () => {
      expect(service.canEditCase({}, undefined)).toBeFalse();
    });

    it('returns true when user is medhandlaggare by string', () => {
      const props = { [MEDHANDLAGGARE_KEY]: 'alice' };
      expect(service.canEditCase(props, 'alice')).toBeTrue();
    });

    it('is case-insensitive for username match', () => {
      const props = { [MEDHANDLAGGARE_KEY]: 'Alice' };
      expect(service.canEditCase(props, 'ALICE')).toBeTrue();
    });

    it('returns true when user is in medhandlaggare array', () => {
      const props = { [MEDHANDLAGGARE_KEY]: ['bob', 'alice'] };
      expect(service.canEditCase(props, 'alice')).toBeTrue();
    });

    it('returns false when user is not in medhandlaggare array', () => {
      const props = { [MEDHANDLAGGARE_KEY]: ['bob', 'charlie'] };
      expect(service.canEditCase(props, 'alice')).toBeFalse();
    });

    it('returns true when user matches ansvarigChef string', () => {
      const props = { [ANSVARIG_KEY]: 'manager' };
      expect(service.canEditCase(props, 'manager')).toBeTrue();
    });

    it('returns true when user is in ansvarig array as object with id', () => {
      const userObj = { id: 'alice', username: 'alice' };
      const props = { [ANSVARIG_KEY]: [userObj] };
      expect(service.canEditCase(props, 'alice')).toBeTrue();
    });

    it('returns false when properties are empty', () => {
      expect(service.canEditCase({}, 'alice')).toBeFalse();
    });
  });
});
