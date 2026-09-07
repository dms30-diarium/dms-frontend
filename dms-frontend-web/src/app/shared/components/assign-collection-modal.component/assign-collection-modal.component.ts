import { Component, input, output, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DigiArbetsformedlingenAngularModule, DigiButton } from '@designsystem-se/af-angular';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { GeneralStore } from '@app/core/services/general-store.service';
import {
  COLLECTION_ADDED_MESSAGE,
  COLLECTION_ADD_ERROR_MESSAGE,
  COLLECTION_ADD_NEW_ERROR_MESSAGE,
  COLLECTION_CREATE_ERROR_MESSAGE,
} from '@app/shared/constants/notification-messages';
import { DigiFormSelectFilterCustomEvent } from '@designsystem-se/af/dist/types/components';
import { buildSelectFilterOptions } from '@app/shared/utils/select-filter-utils';

interface CollectionOption {
  id: string;
  label: string;
}

type CollectionControlValue = CollectionOption[] | string | null;

@Component({
  selector: 'nuxeo-assign-collection-modal',
  imports: [DigiArbetsformedlingenAngularModule, DigiButton, ReactiveFormsModule],
  templateUrl: './assign-collection-modal.component.html',
})
export class AssignCollectionModalComponent implements OnInit {
  private apiService = inject(NuxeoApiService);
  private store = inject(GeneralStore);

  assignCollectionFormGroup = new FormGroup({
    collectionName: new FormControl<CollectionControlValue>(null, Validators.required),
    comment: new FormControl(''),
  });

  items = input.required<string[]>();
  closeDialog = output();

  collectionsOptions: CollectionOption[] = [];
  private collectionsOptionsSource: CollectionOption[] = [];

  ngOnInit() {
    this.apiService.getCollections().subscribe(cols => {
      this.collectionsOptionsSource = cols.map(c => ({ id: c.uid, label: c.title }));
      this.collectionsOptions = [...this.collectionsOptionsSource];
    });
  }

  onQueryChanged(event: DigiFormSelectFilterCustomEvent<string>) {
    const queryValue = (event.detail || '').trim();
    const result = buildSelectFilterOptions(queryValue, this.collectionsOptionsSource, {
      allowCreate: true,
      createdOptionId: '__new__',
    });

    this.collectionsOptions = result.options;
    if (result.createdOption) {
      this.assignCollectionFormGroup.get('collectionName')!.setValue([result.createdOption]);
    }
  }

  isNewCollection(): boolean {
    const value = this.assignCollectionFormGroup.value.collectionName;

    if (Array.isArray(value) && value.length > 0) {
      return value[0].id === '__new__';
    }

    return false;
  }

  onAssignCollection() {
    if (this.assignCollectionFormGroup.invalid) return;

    const rawValue = this.assignCollectionFormGroup.value.collectionName;
    let name: string | null = null;

    if (Array.isArray(rawValue) && rawValue.length > 0) {
      const first = rawValue[0];

      if (first.id === '__new__') {
        name = first.label;
      } else {
        name = first.label ?? first.id ?? null;
      }
    } else if (typeof rawValue === 'string') {
      name = rawValue;
    }

    if (!name) {
      return;
    }

    const comment = this.assignCollectionFormGroup.value.comment || '';

    if (this.isNewCollection()) {
      // create and add
      this.apiService.createCollection(name, comment).subscribe({
        next: () => {
          this.apiService.addToCollectionByName(name, this.items(), comment).subscribe({
            next: () => {
              this.store.notification.set({
                show: true,
                variation: 'success',
                text: COLLECTION_ADDED_MESSAGE,
              });
              this.closeDialog.emit();
            },
            error: err => {
              console.error('Failed to add to new collection', err);
              this.store.notification.set({
                show: true,
                variation: 'danger',
                text: COLLECTION_ADD_NEW_ERROR_MESSAGE,
              });
            },
          });
        },
        error: err => {
          console.error('Failed to create collection', err);
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: COLLECTION_CREATE_ERROR_MESSAGE,
          });
        },
      });
    } else {
      // add to existing
      this.apiService.addToCollectionByName(name, this.items(), comment).subscribe({
        next: () => {
          this.store.notification.set({
            show: true,
            variation: 'success',
            text: COLLECTION_ADDED_MESSAGE,
          });
          this.closeDialog.emit();
        },
        error: err => {
          console.error('Failed to add to collection', err);
          this.store.notification.set({
            show: true,
            variation: 'danger',
            text: COLLECTION_ADD_ERROR_MESSAGE,
          });
        },
      });
    }
  }

  onClose() {
    this.closeDialog.emit();
  }
}
