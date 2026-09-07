import { ContactOption } from '@app/shared/commonTypes';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { EMPTY, Observable, catchError, of, switchMap, tap } from 'rxjs';

const TEMPLATE_BODY_KEYS = [
  NUXEO_SCHEMA_FIELDS.note.note,
  NUXEO_SCHEMA_FIELDS.mail.body,
  NUXEO_SCHEMA_FIELDS.mail.template,
  NUXEO_SCHEMA_FIELDS.mail.content,
  NUXEO_SCHEMA_FIELDS.dms_mail.body,
  NUXEO_SCHEMA_FIELDS.dc.description,
];

export interface EmailTemplateLoadDeps {
  nuxeoApi: NuxeoApiService;
  caseId: string;
  store: GeneralStore;
  setMailBody: (value: string) => void;
  setSubject: (value: string) => void;
  subjectKeys: string[];
  templateTextErrorMsg: string;
  templateLoadErrorMsg: string;
}

export function parseEmails(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map(
        item =>
          (item as ContactOption)?.email || (item as ContactOption)?.name || (item as { title?: string })?.title || ''
      )
      .map(v => v.toString().trim())
      .filter(Boolean);
  }
  return raw
    .toString()
    .split(/[,;]+/)
    .map(p => p.trim())
    .filter(Boolean);
}

export function findInvalidEmails(raw: unknown): string[] {
  return parseEmails(raw).filter(email => !isValidEmail(email));
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function getEmailOptionId(raw: unknown): string {
  if (!raw) return '';
  if (Array.isArray(raw)) return getEmailOptionId(raw[0]);
  if (typeof raw === 'object') {
    const obj = raw as { id?: string; value?: string; label?: string; title?: string };
    return obj.id ?? obj.value ?? obj.label ?? obj.title ?? '';
  }
  return raw.toString();
}

export function pickFirstString(props: Record<string, unknown> | undefined, ...keys: string[]): string | undefined {
  if (!props) return undefined;
  for (const key of keys) {
    const val = props[key];
    if (typeof val === 'string' && val.trim()) return val;
  }
  return undefined;
}

export function loadEmailTemplateFromDocument(templateId: string, deps: EmailTemplateLoadDeps): Observable<unknown> {
  const { nuxeoApi, store, setMailBody, setSubject, subjectKeys, templateLoadErrorMsg } = deps;
  return nuxeoApi.getDocumentById(templateId, true).pipe(
    tap(doc => {
      const props = doc?.properties as Record<string, unknown> | undefined;
      const body = pickFirstString(props, ...TEMPLATE_BODY_KEYS) ?? '';
      const subject = pickFirstString(props, ...subjectKeys) ?? '';
      if (body) setMailBody(body);
      if (subject) setSubject(subject);
    }),
    catchError(docErr => {
      console.error('Failed to load template document', docErr);
      setMailBody('');
      setSubject('');
      store.notification.set({ show: true, variation: 'danger', text: templateLoadErrorMsg });
      return EMPTY;
    })
  );
}

export function loadEmailTemplateBody(templateId: string | null, deps: EmailTemplateLoadDeps): void {
  const { nuxeoApi, caseId, store, setMailBody, setSubject, templateTextErrorMsg } = deps;
  setMailBody('');
  setSubject('');
  if (!templateId) return;

  nuxeoApi
    .getRenderedMailTemplate(templateId, caseId)
    .pipe(
      switchMap(rendered => {
        const renderedBody = rendered?.content ?? '';
        const renderedSubject = rendered?.subject ?? '';
        if (renderedSubject) setSubject(renderedSubject);
        if (renderedBody) {
          setMailBody(renderedBody);
          return of(null);
        }
        return loadEmailTemplateFromDocument(templateId, deps);
      }),
      catchError(err => {
        console.error('Failed to render template, falling back to raw document', err);
        return loadEmailTemplateFromDocument(templateId, deps);
      })
    )
    .subscribe({
      error: err => {
        console.error('Failed to load template body', err);
        setMailBody('');
        setSubject('');
        store.notification.set({ show: true, variation: 'danger', text: templateTextErrorMsg });
      },
    });
}
