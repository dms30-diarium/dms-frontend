import { FormUtilsService } from './form-utils.service';
import { NUXEO_VOCAB_IDS } from '@app/shared/constants/nuxeo-vocabulary-ids';

describe('FormUtilsService', () => {
  let service: FormUtilsService;

  beforeEach(() => {
    service = new FormUtilsService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('hasStrongSecrecy', () => {
    it('returns true for svagSekretess', () => {
      expect(service.hasStrongSecrecy(NUXEO_VOCAB_IDS.sekretess.svagSekretess)).toBeTrue();
    });

    it('returns true for starkSekretess', () => {
      expect(service.hasStrongSecrecy(NUXEO_VOCAB_IDS.sekretess.starkSekretess)).toBeTrue();
    });

    it('returns false for ingenSekretess', () => {
      expect(service.hasStrongSecrecy(NUXEO_VOCAB_IDS.sekretess.ingenSekretess)).toBeFalse();
    });

    it('returns false for an unrelated value', () => {
      expect(service.hasStrongSecrecy('something-else')).toBeFalse();
    });

    it('returns false for null/undefined/empty values', () => {
      expect(service.hasStrongSecrecy(null)).toBeFalse();
      expect(service.hasStrongSecrecy(undefined)).toBeFalse();
      expect(service.hasStrongSecrecy('')).toBeFalse();
    });
  });
});
