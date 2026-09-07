import { ChangeDetectionStrategy, Component, inject, input, OnInit, output, signal } from '@angular/core';

import { ReactiveFormsModule, Validators } from '@angular/forms';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { catchError, EMPTY, map, tap } from 'rxjs';
import { Direction, NuxeoDocument } from '@app/shared/api/nuxeo-api.types';
import { GeneralFormComponent } from '../../general-form/general-form.component';
import { FieldConfig } from '../../general-form/general-form.types';
import { GeneralStore } from '@app/core/services/general-store.service';
import { Option } from '@app/shared/commonTypes';
import {
  CREATE_HANDLINGTYPE_FORM_ERROR_MESSAGE,
  CREATE_HANDLINGTYPE_FORM_SUCCESS_MESSAGE,
} from '@app/shared/constants/notification-messages';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import {
  BasicMetaDataTableComponent,
  MetadataDefinitionRow,
} from '../../edit-form-components/basic-metadata-table/basic-metadata-table.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nuxeo-create-handlingtype',
  standalone: true,
  imports: [ReactiveFormsModule, GeneralFormComponent],
  templateUrl: './create-handlingtype-form.component.html',
})
export class CreateHandlingComponent implements OnInit {
  readonly nuxeoApi = inject(NuxeoApiService);
  defaultPayload: NuxeoDocument | null = null;
  isLoading = signal(false);
  parentUid = input.required<string>();
  path = input.required<string>();
  dialogClosed = output<NuxeoDocument | null>();
  private store = inject(GeneralStore);
  metadataDefinitionFields = signal<MetadataDefinitionRow[]>([]);

  createHandlingstypConfig = signal<FieldConfig[]>([
    { type: 'textarea', name: 'handlingsnamn', label: 'Handlingsnamn', validators: [Validators.required] },
    { type: 'textarea', name: 'description', label: this.store.getValue('label.description') ?? 'Beskrivning' },
    { type: 'textarea', name: 'comment', label: 'Kommentar' },
    { type: 'checkbox', name: 'diarieforing', label: 'Diarieföring', defaultValue: false },
    {
      type: 'dropdown',
      name: 'arkiveringsregel',
      label: 'Arkiveringsregel',
      options: [],
      validators: [Validators.required],
    },
    { type: 'checkbox', name: 'automatiskGallring', label: 'Automatisk Gallring', defaultValue: false },
    { type: 'input', name: 'gallringstid', label: 'Gallringstid' },
    { type: 'input', name: 'arkiveringstid', label: 'Arkiveringstid' },
    { type: 'textarea', name: 'bevarandekommentar', label: 'Bevarandekommentar' },
    { type: 'textarea', name: 'gallringskommentar', label: 'Gallringskommentar' },
    {
      type: 'dropdown',
      name: 'gallringsbeslut',
      label: 'Gallringsbeslut',
      options: [],
    },
    { type: 'dropdown', name: 'sekretess', label: 'Sekretess', options: [], validators: [Validators.required] },
    {
      type: 'dropdown',
      name: 'sakerhetsskyddsklassificering',
      label: 'Säkerhetsskyddsklassificering',
      options: [],
      validators: [Validators.required],
    },
    {
      type: 'component',
      name: 'metadataDefinition',
      label: 'Fältdefinition',
      class: BasicMetaDataTableComponent,
      props: { tableFields: this.metadataDefinitionFields },
    },
  ]);

  ngOnInit() {
    this.nuxeoApi
      .getEmptyWithDefaults(this.path(), 'Handlingstyp')
      .pipe(
        tap(result => {
          this.defaultPayload = result;
        })
      )
      .subscribe();

    this.loadDirectoryOptions('Arkiveringsregel', 'arkiveringsregel');
    this.loadGallringsbeslutOptions();
    this.loadDirectoryOptions('Sekretess', 'sekretess');
    this.loadDirectoryOptions('Sakerhetsskyddsklassificering', 'sakerhetsskyddsklassificering');
  }

  createDocument(event: {
    handlingsnamn?: string;
    description?: string;
    comment?: string;
    diarieforing?: boolean;
    arkiveringsregel?: string;
    automatiskGallring?: boolean;
    gallringstid?: string;
    arkiveringstid?: string;
    bevarandekommentar?: string;
    gallringskommentar?: string;
    gallringsbeslut?: string;
    sekretess?: string;
    sakerhetsskyddsklassificering?: string;
    metadataDefinition?: MetadataDefinitionRow[];
  }) {
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
      name: event.handlingsnamn,
      title: event.handlingsnamn,
      parentRef: this.parentUid(),
      properties: {
        ...this.defaultPayload?.properties,
        [NUXEO_SCHEMA_FIELDS.dc.title]: event.handlingsnamn,
        [NUXEO_SCHEMA_FIELDS.dc.description]: event.description,
        [NUXEO_SCHEMA_FIELDS.handlingstyp.handlingsnamn]: event.handlingsnamn,
        [NUXEO_SCHEMA_FIELDS.handlingstyp.kommentar]: event.comment,
        [NUXEO_SCHEMA_FIELDS.handlingstyp.diarieforing]: event.diarieforing ?? false,
        [NUXEO_SCHEMA_FIELDS.handlingstyp.arkiveringsregel]: event.arkiveringsregel,
        [NUXEO_SCHEMA_FIELDS.handlingstyp.automatiskGallring]: event.automatiskGallring ?? false,
        [NUXEO_SCHEMA_FIELDS.handlingstyp.gallringstid]: event.gallringstid,
        [NUXEO_SCHEMA_FIELDS.handlingstyp.arkivieringstid]: event.arkiveringstid,
        [NUXEO_SCHEMA_FIELDS.handlingstyp.bevarandekommentar]: event.bevarandekommentar,
        [NUXEO_SCHEMA_FIELDS.handlingstyp.gallringskommentar]: event.gallringskommentar,
        [NUXEO_SCHEMA_FIELDS.handlingstyp.gallringsbeslut]: event.gallringsbeslut || null,
        [NUXEO_SCHEMA_FIELDS.handlingstyp.sekretess]: event.sekretess,
        [NUXEO_SCHEMA_FIELDS.handlingstyp.sakerhetsskyddsklassificering]: event.sakerhetsskyddsklassificering,
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
            text: CREATE_HANDLINGTYPE_FORM_SUCCESS_MESSAGE,
          });
          this.dialogClosed.emit(result);
          this.isLoading.set(false);
        }),
        catchError(err => {
          console.error('Error during Handlingstyp creation:', err);
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: CREATE_HANDLINGTYPE_FORM_ERROR_MESSAGE,
          });
          this.dialogClosed.emit(null);
          this.isLoading.set(false);
          return EMPTY;
        })
      )
      .subscribe();
  }

  private loadDirectoryOptions(directoryName: string, fieldName: string) {
    this.nuxeoApi
      .getDirectorySuggestions(directoryName)
      .pipe(
        map(entries => this.mapDirectoryOptions(entries)),
        tap(options => {
          this.createHandlingstypConfig.update(config =>
            config.map(field => (field.name === fieldName ? { ...field, options } : field))
          );
        })
      )
      .subscribe();
  }

  private loadGallringsbeslutOptions() {
    this.nuxeoApi
      .requestPageProviderOptions('default')
      .pipe(
        map(result => result.entries.map(entry => ({ id: entry.uid, label: entry.title }))),
        tap(options => {
          this.createHandlingstypConfig.update(config =>
            config.map(field => (field.name === 'gallringsbeslut' ? { ...field, options } : field))
          );
        })
      )
      .subscribe();
  }

  private mapDirectoryOptions(entries: Direction[]): Option[] {
    return entries
      .flatMap(entry => {
        if (entry.children?.length) {
          return entry.children.map(child => ({ id: child.computedId, label: child.absoluteLabel }));
        }
        const id = entry.computedId ?? entry.id;
        const label = entry.absoluteLabel ?? entry.displayLabel ?? entry.label ?? entry.id;
        return id ? [{ id, label }] : [];
      })
      .filter(option => !!option.id && !!option.label);
  }
}
