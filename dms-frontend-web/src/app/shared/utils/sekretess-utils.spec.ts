import { hasStrongSecrecy } from './sekretess-utils';
import { NUXEO_VOCAB_IDS } from '@app/shared/constants/nuxeo-vocabulary-ids';

describe('hasStrongSecrecy', () => {
  it('returns true for svagSekretess', () => {
    expect(hasStrongSecrecy(NUXEO_VOCAB_IDS.sekretess.svagSekretess)).toBeTrue();
  });

  it('returns true for starkSekretess', () => {
    expect(hasStrongSecrecy(NUXEO_VOCAB_IDS.sekretess.starkSekretess)).toBeTrue();
  });

  it('returns false for ingenSekretess', () => {
    expect(hasStrongSecrecy(NUXEO_VOCAB_IDS.sekretess.ingenSekretess)).toBeFalse();
  });

  it('returns false for an unrelated value', () => {
    expect(hasStrongSecrecy('something-else')).toBeFalse();
  });

  it('returns false for null/undefined/empty values', () => {
    expect(hasStrongSecrecy(null)).toBeFalse();
    expect(hasStrongSecrecy(undefined)).toBeFalse();
    expect(hasStrongSecrecy('')).toBeFalse();
  });
});
