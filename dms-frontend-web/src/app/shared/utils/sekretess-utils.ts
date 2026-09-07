import { NUXEO_VOCAB_IDS } from '@app/shared/constants/nuxeo-vocabulary-ids';

export function hasStrongSecrecy(value?: string | null): boolean {
  if (!value) return false;
  return value === NUXEO_VOCAB_IDS.sekretess.svagSekretess || value === NUXEO_VOCAB_IDS.sekretess.starkSekretess;
}
