import { getCaseStateMeta } from './case-state-utils';
import { NUXEO_VOCAB_IDS } from '@app/shared/constants/nuxeo-vocabulary-ids';
import { Option } from '@app/shared/commonTypes';

const states: Option[] = [
  { id: 'oppet', label: 'Öppet', value: 'oppet' },
  { id: 'underHandlaggning', label: 'Under handläggning', value: 'underHandlaggning' },
  { id: 'avslutat', label: 'Avslutat', value: 'avslutat' },
];

describe('getCaseStateMeta', () => {
  it('returns default meta when currentState is null', () => {
    const result = getCaseStateMeta(states, null);
    expect(result.isClosed).toBeFalse();
    expect(result.completedSteps).toBe(0);
    expect(result.label).toBe('-');
  });

  it('returns default meta when currentState is undefined', () => {
    const result = getCaseStateMeta(states, undefined);
    expect(result.completedSteps).toBe(0);
  });

  it('returns closed meta for stangt state', () => {
    const result = getCaseStateMeta(states, NUXEO_VOCAB_IDS.arendestatus.stangt);
    expect(result.isClosed).toBeTrue();
    expect(result.completedSteps).toBe(states.length);
    expect(result.label).toBe('Stängt');
  });

  it('returns correct completedSteps for first state', () => {
    const result = getCaseStateMeta(states, 'oppet');
    expect(result.isClosed).toBeFalse();
    expect(result.completedSteps).toBe(1);
    expect(result.label).toBe('Öppet');
  });

  it('returns correct completedSteps for middle state', () => {
    const result = getCaseStateMeta(states, 'underHandlaggning');
    expect(result.completedSteps).toBe(2);
  });

  it('returns dash label for unknown state', () => {
    const result = getCaseStateMeta(states, 'unknown-state');
    expect(result.label).toBe('-');
    expect(result.completedSteps).toBe(0);
  });
});
