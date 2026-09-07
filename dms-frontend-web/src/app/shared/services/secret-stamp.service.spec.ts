import { SecretStampService } from './secret-stamp.service';

describe('SecretStampService', () => {
  let service: SecretStampService;

  beforeEach(() => {
    service = new SecretStampService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getSecretStampText', () => {
    it('returns null for a falsy secretId', () => {
      expect(service.getSecretStampText(null)).toBeNull();
      expect(service.getSecretStampText(undefined)).toBeNull();
      expect(service.getSecretStampText('')).toBeNull();
    });

    it('returns the label for svagSekretess', () => {
      expect(service.getSecretStampText('svagSekretess')).toBe('SVAG - SEKRETESS');
    });

    it('returns the label for starkSekretess', () => {
      expect(service.getSecretStampText('starkSekretess')).toBe('STARK - SEKRETESS');
    });

    it('returns null for an unrecognized secretId', () => {
      expect(service.getSecretStampText('unknownSekretess')).toBeNull();
    });
  });
});
