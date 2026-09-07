import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { NUXEO_VOCAB_IDS } from '@app/shared/constants/nuxeo-vocabulary-ids';

export interface CaseTransitionOptions {
  decision?: string;
  decisionDate?: string;
  comment?: string;
  reason?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CaseLifecycleService {
  private readonly apiService = inject(NuxeoApiService);

  transitionToReadyToClose(
    caseId: string,
    currentState: string | null | undefined,
    options?: CaseTransitionOptions
  ): Observable<void> {
    const optionsWithDate: CaseTransitionOptions = {
      ...options,
      decisionDate: options?.decisionDate,
    };
    return this.apiService.advanceCaseLifecycle(caseId, currentState, NUXEO_VOCAB_IDS.arendestatus.beslutat).pipe(
      switchMap(() => this.updateCaseProperties(caseId, optionsWithDate)),
      switchMap(() => this.apiService.markCaseReadyToClose(caseId)),
      switchMap(() =>
        this.apiService.editDocument(caseId, {
          [NUXEO_SCHEMA_FIELDS.arende.arendetAvslutatDatum]: new Date().toISOString(),
        })
      ),
      map(() => void 0)
    );
  }

  transitionToClosed(
    caseId: string,
    currentState: string | null | undefined,
    options?: CaseTransitionOptions
  ): Observable<void> {
    return this.apiService.advanceCaseLifecycle(caseId, currentState, NUXEO_VOCAB_IDS.arendestatus.beslutat).pipe(
      switchMap(() => this.updateCaseProperties(caseId, options)),
      switchMap(() => this.apiService.markCaseReadyToClose(caseId)),
      switchMap(() => this.apiService.closeCase(caseId)),
      map(() => void 0)
    );
  }

  private updateCaseProperties(caseId: string, options?: CaseTransitionOptions): Observable<void> {
    if (!options || (!options.decision && !options.comment && !options.reason && !options.decisionDate)) {
      return new Observable(observer => {
        observer.next();
        observer.complete();
      });
    }

    const props: Record<string, unknown> = {};

    if (options.decision) {
      props[NUXEO_SCHEMA_FIELDS.arende.beslutstyp] = options.decision;
    }

    if (options.decisionDate) {
      props[NUXEO_SCHEMA_FIELDS.arende.beslutatDatum] = options.decisionDate;
    }

    if (options.comment) {
      props[NUXEO_SCHEMA_FIELDS.arende.allmanKommentar] = options.comment;
    }

    if (options.reason) {
      props[NUXEO_SCHEMA_FIELDS.arende.anteckning] = options.reason;
    }

    return this.apiService.editDocument(caseId, props).pipe(
      switchMap(
        () =>
          new Observable<void>(observer => {
            observer.next();
            observer.complete();
          })
      )
    );
  }
}
