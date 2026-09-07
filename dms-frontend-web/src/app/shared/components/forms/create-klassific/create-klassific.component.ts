import { ChangeDetectionStrategy, Component, inject, input, OnInit, output, signal } from '@angular/core';

import { ReactiveFormsModule, Validators } from '@angular/forms';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { catchError, EMPTY, tap } from 'rxjs';
import { NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { FieldConfig } from '../../general-form/general-form.types';
import { GeneralFormComponent } from '../../general-form/general-form.component';
import { GeneralStore } from '@app/core/services/general-store.service';
import {
  BasicMetaDataTableComponent,
  MetadataDefinitionRow,
} from '../../edit-form-components/basic-metadata-table/basic-metadata-table.component';
import {
  CREATE_KLASSIFIC_ERROR_MESSAGE,
  CREATE_KLASSIFIC_SUCCESS_MESSAGE,
} from '@app/shared/constants/notification-messages';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-create-klassific',
  standalone: true,
  imports: [ReactiveFormsModule, GeneralFormComponent],
  templateUrl: './create-klassific.component.html',
})
export class CreateKlassificComponent implements OnInit {
  readonly nuxeoApi = inject(NuxeoApiService);
  defaultPayload: NuxeoDocument | null = null;
  isLoading = signal(false);
  parentUid = input.required<string>();
  path = input.required<string>();
  dialogClosed = output<NuxeoDocument | null>();
  private store = inject(GeneralStore);
  metadataDefinitionFields = signal<MetadataDefinitionRow[]>([]);

  createKlassificConfig = signal<FieldConfig[]>([
    {
      type: 'input',
      name: 'code',
      label: this.store.getValue('label.ui.schema.cv.kod') ?? 'Kod',
      validators: [Validators.required],
    },
    {
      type: 'input',
      name: 'name',
      label: this.store.getValue('label.ui.schema.cv.namn') ?? 'Namn',
      validators: [Validators.required],
    },
    {
      type: 'dropdown',
      name: 'beslutstyper',
      label: 'Beslutstyper',
      multiple: true,
      options: [],
      validators: [Validators.required],
    },
    { type: 'dropdown', name: 'klass', label: 'Klasstyp', options: [], validators: [Validators.required] },
    {
      type: 'dropdown',
      name: 'handlingstyper',
      label: 'Handlingstyper',
      options: [],
      multiple: true,
      validators: [Validators.required],
    },
    { type: 'checkbox', name: 'registrerbar', label: 'Registrerbar', defaultValue: false },
    {
      type: 'component',
      name: 'metadataDefinition',
      label: 'Metadatafält',
      class: BasicMetaDataTableComponent,
      props: { tableFields: this.metadataDefinitionFields },
    },
  ]);

  ngOnInit() {
    this.nuxeoApi
      .getEmptyWithDefaults(this.path(), 'Klass')
      .pipe(
        tap(result => {
          this.defaultPayload = result;
        })
      )
      .subscribe();

    this.nuxeoApi
      .DMSDocumentSuggestion(this.parentUid(), 'Beslut', 'Klass')
      .pipe(
        tap(result => {
          const options = result.entries.map(({ title, uid, path }) => ({ label: title, id: uid, path: path }));

          const updatedConf = this.createKlassificConfig().map(el =>
            el.label === 'Beslutstyper' ? { ...el, options } : el
          );
          this.createKlassificConfig.set(updatedConf);
        })
      )
      .subscribe();

    this.nuxeoApi
      .DMSDocumentSuggestion(this.parentUid(), 'Handlingstyp', 'Klass')
      .pipe(
        tap(result => {
          const options = result.entries.map(({ title, uid, path }) => ({ label: title, id: uid, path: path }));

          const updatedConf = this.createKlassificConfig().map(el =>
            el.label === 'Handlingstyper' ? { ...el, options } : el
          );
          this.createKlassificConfig.set(updatedConf);
        })
      )
      .subscribe();

    this.nuxeoApi
      .DMSDocumentSuggestion(this.parentUid(), 'Klasstyp', 'Klass')
      .pipe(
        tap(result => {
          const options = result.entries.map(({ title, uid, path }) => ({ label: title, id: uid, path: path }));

          const updatedConf = this.createKlassificConfig().map(el =>
            el.label === 'Klasstyp' ? { ...el, options } : el
          );
          this.createKlassificConfig.set(updatedConf);
        })
      )
      .subscribe();
  }

  createDocument(rawEvent: Record<string, unknown>) {
    const event = rawEvent as {
      name: string;
      code: string;
      klass: string | string[];
      beslutstyper: string | string[];
      handlingstyper: string | string[];
      registrerbar?: boolean;
      metadataDefinition?: MetadataDefinitionRow[];
    };
    this.isLoading.set(true);
    if (!this.defaultPayload) {
      throw Error('Payload is needed for creating documents');
    }
    const metadataDefinition = (event.metadataDefinition ?? []).map(field => ({
      nyckel: field.nyckel,
      flervardig: field.flervardig,
      aktiv: field.aktiv,
      typ: field.typ,
      ordning: field.ordning,
    }));

    const fullPayload = {
      ...this.defaultPayload,
      name: event.name,
      properties: {
        ...this.defaultPayload?.properties,
        [NUXEO_SCHEMA_FIELDS.klass.kod]: event.code,
        [NUXEO_SCHEMA_FIELDS.klass.namn]: event.name,
        [NUXEO_SCHEMA_FIELDS.dc.title]: event.code + ' ' + event.name,
        [NUXEO_SCHEMA_FIELDS.klass.beslutstyper]: this.toArray(event.beslutstyper),
        [NUXEO_SCHEMA_FIELDS.klass.klasstyp]: this.toArray(event.klass)[0],
        [NUXEO_SCHEMA_FIELDS.klass.handlingstyper]: this.toArray(event.handlingstyper),
        [NUXEO_SCHEMA_FIELDS.klass.registrerbar]: event.registrerbar ?? false,
        [NUXEO_SCHEMA_FIELDS.dmsmetadatadefinition.faltdefinition]: metadataDefinition,
      },
    };
    this.nuxeoApi
      .createDocument(fullPayload, this.path())
      .pipe(
        tap(result => {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: CREATE_KLASSIFIC_SUCCESS_MESSAGE,
          });
          this.dialogClosed.emit(result);
          this.isLoading.set(false);
        }),
        catchError(err => {
          console.error('Error during Klass creation:', err);
          this.dialogClosed.emit(null);
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: CREATE_KLASSIFIC_ERROR_MESSAGE,
          });
          this.isLoading.set(false);
          return EMPTY;
        })
      )
      .subscribe();
  }

  private toArray(value: string | string[] | null | undefined): string[] {
    if (!value) return [];
    return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
  }
}
