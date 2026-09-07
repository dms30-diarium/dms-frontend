import { NuxeoDocument } from 'app/shared/api/nuxeo-api.types';

export interface Case {
  id: string;
  title: string;
  created: string;
  status: string;
  type: string;
  counterparty?: string;
  department?: string;
  documents?: NuxeoDocument[];
}
