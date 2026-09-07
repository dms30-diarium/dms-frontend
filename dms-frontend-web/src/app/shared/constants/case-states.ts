import { Option } from '@app/shared/commonTypes';
import { NUXEO_VOCAB_IDS } from './nuxeo-vocabulary-ids';

const arendestatus = NUXEO_VOCAB_IDS.arendestatus;

export const CASE_STATES: Option[] = [
  { id: arendestatus.registrerat, label: 'Registrerat', value: arendestatus.registrerat },
  { id: arendestatus.underFordelning, label: 'Under fördelning', value: arendestatus.underFordelning },
  { id: arendestatus.underHandlaggning, label: 'Under handläggning', value: arendestatus.underHandlaggning },
  { id: arendestatus.beslutat, label: 'Beslutat', value: arendestatus.beslutat },
  {
    id: arendestatus.avslutatAvHandlaggare,
    label: 'Avslutat av handläggare',
    value: arendestatus.avslutatAvHandlaggare,
  },
];
