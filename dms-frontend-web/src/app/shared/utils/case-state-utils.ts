import { Option } from '@app/shared/commonTypes';
import { NUXEO_VOCAB_IDS } from '@app/shared/constants/nuxeo-vocabulary-ids';

export interface CaseStateMeta {
  isClosed: boolean;
  completedSteps: number;
  label: string;
}

export function getCaseStateMeta(states: Option[], currentState: string | null | undefined): CaseStateMeta {
  const state = currentState ?? '';

  if (!state) {
    return { isClosed: false, completedSteps: 0, label: '-' };
  }

  if (state === NUXEO_VOCAB_IDS.arendestatus.stangt) {
    return { isClosed: true, completedSteps: states.length, label: 'Stängt' };
  }

  const idx = states.findIndex(entry => entry.id === state);
  const label = states.find(entry => entry.id === state)?.label ?? '-';

  return { isClosed: false, completedSteps: idx + 1, label };
}
