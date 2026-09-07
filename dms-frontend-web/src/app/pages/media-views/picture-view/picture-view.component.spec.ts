import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { PictureViewComponent } from './picture-view.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { DirectoryOptionsService } from '@app/shared/services/directory-options.service';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { Option } from '@app/shared/commonTypes';
import { NuxeoDocument, NuxeoProperties } from '@app/shared/api/nuxeo-api.types';
import { makeNuxeoDocument } from '@app/shared/testing/mock-factories';

function makeDoc(properties: Record<string, unknown> = {}): NuxeoDocument {
  return makeNuxeoDocument({
    uid: 'pic-1',
    type: 'Picture',
    title: 'Test Picture',
    properties: {
      [NUXEO_SCHEMA_FIELDS.dc.title]: 'Test Picture',
      [NUXEO_SCHEMA_FIELDS.dc.description]: '',
      [NUXEO_SCHEMA_FIELDS.dc.nature]: null,
      [NUXEO_SCHEMA_FIELDS.dc.subjects]: [],
      [NUXEO_SCHEMA_FIELDS.dc.coverage]: null,
      [NUXEO_SCHEMA_FIELDS.dc.expired]: null,
      [NUXEO_SCHEMA_FIELDS.dc.rights]: null,
      [NUXEO_SCHEMA_FIELDS.dc.source]: null,
      [NUXEO_SCHEMA_FIELDS.picture.info]: {},
      [NUXEO_SCHEMA_FIELDS.picture.views]: [],
      [NUXEO_SCHEMA_FIELDS.picture.source]: null,
      [NUXEO_SCHEMA_FIELDS.imd.bitDepth]: null,
      [NUXEO_SCHEMA_FIELDS.imd.colorSpace]: null,
      [NUXEO_SCHEMA_FIELDS.imd.copyright]: null,
      [NUXEO_SCHEMA_FIELDS.imd.dateTimeOriginal]: null,
      [NUXEO_SCHEMA_FIELDS.imd.pixelXdimension]: null,
      [NUXEO_SCHEMA_FIELDS.imd.pixelYdimension]: null,
      ...properties,
    } as NuxeoProperties,
  });
}

describe('PictureViewComponent', () => {
  let component: PictureViewComponent;
  let fixture: ComponentFixture<PictureViewComponent>;
  let apiSpy: jasmine.SpyObj<NuxeoApiService>;
  let dirOptSpy: jasmine.SpyObj<DirectoryOptionsService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('NuxeoApiService', ['getMessagesJSON', 'editDocument']);
    apiSpy.getMessagesJSON.and.returnValue(of({}));
    apiSpy.editDocument.and.returnValue(of(makeDoc()));

    dirOptSpy = jasmine.createSpyObj('DirectoryOptionsService', [
      'getNatureOptions',
      'getSubjectOptions',
      'getCoverageOptions',
    ]);
    dirOptSpy.getNatureOptions.and.returnValue(of([]));
    dirOptSpy.getSubjectOptions.and.returnValue(of([]));
    dirOptSpy.getCoverageOptions.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [PictureViewComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: DirectoryOptionsService, useValue: dirOptSpy },
      ],
    })
      .overrideTemplate(PictureViewComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(PictureViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('signals initial state', () => {
    it('isEditDialogOpen defaults to false', () => {
      expect(component.isEditDialogOpen()).toBeFalse();
    });

    it('isSavingEdit defaults to false', () => {
      expect(component.isSavingEdit()).toBeFalse();
    });

    it('pictureEditConfig defaults to empty array', () => {
      expect(component.pictureEditConfig()).toEqual([]);
    });

    it('pictureNatureOptions defaults to empty array', () => {
      expect(component.pictureNatureOptions()).toEqual([]);
    });

    it('pictureSubjectOptions defaults to empty array', () => {
      expect(component.pictureSubjectOptions()).toEqual([]);
    });

    it('pictureCoverageOptions defaults to empty array', () => {
      expect(component.pictureCoverageOptions()).toEqual([]);
    });
  });

  describe('title computed', () => {
    it('returns empty string when document is null', () => {
      fixture.componentRef.setInput('document', null);
      fixture.detectChanges();
      expect(component.title()).toBe('');
    });

    it('returns dc:title from properties', () => {
      fixture.componentRef.setInput('document', makeDoc({ [NUXEO_SCHEMA_FIELDS.dc.title]: 'My Picture' }));
      fixture.detectChanges();
      expect(component.title()).toBe('My Picture');
    });

    it('falls back to doc.title', () => {
      const doc = makeDoc({ [NUXEO_SCHEMA_FIELDS.dc.title]: '' });
      fixture.componentRef.setInput('document', doc);
      fixture.detectChanges();
      expect(component.title()).toBe('Test Picture');
    });

    it('falls back to uid when no title', () => {
      const doc = makeDoc({ [NUXEO_SCHEMA_FIELDS.dc.title]: '' });
      doc.title = '';
      fixture.componentRef.setInput('document', doc);
      fixture.detectChanges();
      expect(component.title()).toBe('pic-1');
    });
  });

  describe('getDimensionsLabel', () => {
    it('returns em dash when no picture info', () => {
      fixture.componentRef.setInput('document', makeDoc());
      fixture.detectChanges();
      expect(component.getDimensionsLabel()).toBe('—');
    });

    it('returns WxH when picture:info has width and height', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.picture.info]: { width: 1920, height: 1080 },
        })
      );
      fixture.detectChanges();
      expect(component.getDimensionsLabel()).toBe('1920 x 1080');
    });

    it('uses imd fallback for width and height', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.imd.pixelXdimension]: '800',
          [NUXEO_SCHEMA_FIELDS.imd.pixelYdimension]: '600',
        })
      );
      fixture.detectChanges();
      expect(component.getDimensionsLabel()).toBe('800 x 600');
    });
  });

  describe('getFormatLabel', () => {
    it('returns em dash when no info or file', () => {
      fixture.componentRef.setInput('document', makeDoc());
      fixture.detectChanges();
      expect(component.getFormatLabel()).toBe('—');
    });

    it('returns format from picture:info', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.picture.info]: { format: 'JPEG' },
        })
      );
      fixture.detectChanges();
      expect(component.getFormatLabel()).toBe('JPEG');
    });

    it('extracts format from mime type', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.file.content]: { 'mime-type': 'image/png' },
        })
      );
      fixture.detectChanges();
      expect(component.getFormatLabel()).toBe('PNG');
    });
  });

  describe('getColorProfileLabel', () => {
    it('returns em dash when no color space', () => {
      fixture.componentRef.setInput('document', makeDoc());
      fixture.detectChanges();
      expect(component.getColorProfileLabel()).toBe('—');
    });

    it('returns colorSpace from picture:info', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.picture.info]: { colorSpace: 'sRGB' },
        })
      );
      fixture.detectChanges();
      expect(component.getColorProfileLabel()).toBe('sRGB');
    });

    it('falls back to imd:color_space', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.imd.colorSpace]: 'AdobeRGB',
        })
      );
      fixture.detectChanges();
      expect(component.getColorProfileLabel()).toBe('AdobeRGB');
    });
  });

  describe('getBitDepthLabel', () => {
    it('returns em dash when no depth', () => {
      fixture.componentRef.setInput('document', makeDoc());
      fixture.detectChanges();
      expect(component.getBitDepthLabel()).toBe('—');
    });

    it('returns depth from picture:info', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.picture.info]: { depth: 8 },
        })
      );
      fixture.detectChanges();
      expect(component.getBitDepthLabel()).toBe('8');
    });

    it('falls back to imd:bit_depth', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.imd.bitDepth]: 16,
        })
      );
      fixture.detectChanges();
      expect(component.getBitDepthLabel()).toBe('16');
    });
  });

  describe('getWeightLabel', () => {
    it('returns em dash when no file content', () => {
      fixture.componentRef.setInput('document', makeDoc());
      fixture.detectChanges();
      expect(component.getWeightLabel()).toBe('—');
    });

    it('returns formatted size when content length is set', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.file.content]: { length: 1024 * 1024 },
        })
      );
      fixture.detectChanges();
      const label = component.getWeightLabel();
      expect(typeof label).toBe('string');
      expect(label).not.toBe('—');
    });
  });

  describe('getExifDateLabel', () => {
    it('returns em dash when no date', () => {
      fixture.componentRef.setInput('document', makeDoc());
      fixture.detectChanges();
      expect(component.getExifDateLabel()).toBe('—');
    });

    it('returns formatted date when set', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.imd.dateTimeOriginal]: '2024-06-15',
        })
      );
      fixture.detectChanges();
      const label = component.getExifDateLabel();
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    });
  });

  describe('getExifValue', () => {
    it('returns em dash for unknown key', () => {
      fixture.componentRef.setInput('document', makeDoc());
      fixture.detectChanges();
      expect(component.getExifValue('unknown:key')).toBe('—');
    });

    it('returns string value for known key', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          'exif:model': 'Canon EOS R5',
        })
      );
      fixture.detectChanges();
      expect(component.getExifValue('exif:model')).toBe('Canon EOS R5');
    });

    it('returns string of number value', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          'exif:isoSpeed': 100,
        })
      );
      fixture.detectChanges();
      expect(component.getExifValue('exif:isoSpeed')).toBe('100');
    });
  });

  describe('getIptcCopyright', () => {
    it('returns em dash when no copyright or rights', () => {
      fixture.componentRef.setInput('document', makeDoc());
      fixture.detectChanges();
      expect(component.getIptcCopyright()).toBe('—');
    });

    it('returns copyright from imd:copyright', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.imd.copyright]: '© 2024 Photographer',
        })
      );
      fixture.detectChanges();
      expect(component.getIptcCopyright()).toBe('© 2024 Photographer');
    });

    it('falls back to dc:rights', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.dc.rights]: 'All rights reserved',
        })
      );
      fixture.detectChanges();
      expect(component.getIptcCopyright()).toBe('All rights reserved');
    });
  });

  describe('getIptcRights', () => {
    it('returns em dash when no rights', () => {
      fixture.componentRef.setInput('document', makeDoc());
      fixture.detectChanges();
      expect(component.getIptcRights()).toBe('—');
    });

    it('returns dc:rights value', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.dc.rights]: 'CC BY 4.0',
        })
      );
      fixture.detectChanges();
      expect(component.getIptcRights()).toBe('CC BY 4.0');
    });
  });

  describe('getIptcSource', () => {
    it('returns em dash when no source', () => {
      fixture.componentRef.setInput('document', makeDoc());
      fixture.detectChanges();
      expect(component.getIptcSource()).toBe('—');
    });

    it('returns picture:source value', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.picture.source]: 'AFP',
        })
      );
      fixture.detectChanges();
      expect(component.getIptcSource()).toBe('AFP');
    });

    it('falls back to dc:source', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.dc.source]: 'Reuters',
        })
      );
      fixture.detectChanges();
      expect(component.getIptcSource()).toBe('Reuters');
    });
  });

  describe('getIptcDescription', () => {
    it('returns em dash when no description', () => {
      fixture.componentRef.setInput('document', makeDoc());
      fixture.detectChanges();
      expect(component.getIptcDescription()).toBe('—');
    });

    it('returns dc:description value', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.dc.description]: 'A beautiful sunset',
        })
      );
      fixture.detectChanges();
      expect(component.getIptcDescription()).toBe('A beautiful sunset');
    });
  });

  describe('openEditDialog', () => {
    it('does nothing when document is null', () => {
      fixture.componentRef.setInput('document', null);
      fixture.detectChanges();
      component.openEditDialog();
      expect(component.isEditDialogOpen()).toBeFalse();
    });

    it('sets isEditDialogOpen to true when document exists', () => {
      fixture.componentRef.setInput('document', makeDoc());
      fixture.detectChanges();
      component.openEditDialog();
      expect(component.isEditDialogOpen()).toBeTrue();
    });

    it('builds pictureEditConfig', () => {
      fixture.componentRef.setInput('document', makeDoc());
      fixture.detectChanges();
      component.openEditDialog();
      expect(component.pictureEditConfig().length).toBeGreaterThan(0);
    });
  });

  describe('closeEditDialog', () => {
    it('sets isEditDialogOpen to false', () => {
      component.isEditDialogOpen.set(true);
      component.closeEditDialog();
      expect(component.isEditDialogOpen()).toBeFalse();
    });
  });

  describe('saveEdits', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('document', makeDoc());
      fixture.detectChanges();
      component.isEditDialogOpen.set(true);
    });

    it('does nothing when document uid is empty', () => {
      const doc = makeDoc();
      doc.uid = '';
      fixture.componentRef.setInput('document', doc);
      fixture.detectChanges();
      component.saveEdits({ title: 'New title' });
      expect(apiSpy.editDocument).not.toHaveBeenCalled();
    });

    it('calls editDocument with property changes', () => {
      component.saveEdits({
        title: 'Updated Title',
        description: 'New description',
        nature: 'nat-1',
        subjects: [{ id: 'sub-1', label: 'Subject 1' }],
        coverage: 'cov-1',
        expires: [new Date('2025-12-31')],
      });
      expect(apiSpy.editDocument).toHaveBeenCalledWith(
        'pic-1',
        jasmine.objectContaining({
          [NUXEO_SCHEMA_FIELDS.dc.title]: 'Updated Title',
        })
      );
    });

    it('closes dialog on success', () => {
      component.saveEdits({ title: 'Title' });
      expect(component.isEditDialogOpen()).toBeFalse();
    });

    it('emits reloadDocument on success', () => {
      let reloaded = false;
      component.reloadDocument.subscribe(() => (reloaded = true));
      component.saveEdits({ title: 'Title' });
      expect(reloaded).toBeTrue();
    });
  });

  describe('pictureViews computed', () => {
    it('returns empty array when document is null', () => {
      fixture.componentRef.setInput('document', null);
      fixture.detectChanges();
      expect(component.pictureViews()).toEqual([]);
    });

    it('returns empty array when picture:views is empty', () => {
      fixture.componentRef.setInput('document', makeDoc({ [NUXEO_SCHEMA_FIELDS.picture.views]: [] }));
      fixture.detectChanges();
      expect(component.pictureViews()).toEqual([]);
    });

    it('maps picture views to items', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.picture.views]: [
            {
              description: 'Thumbnail',
              width: 100,
              height: 75,
              content: { length: 5000, 'mime-type': 'image/jpeg', data: 'http://example.com/thumb.jpg' },
            },
          ],
        })
      );
      fixture.detectChanges();
      const views = component.pictureViews();
      expect(views.length).toBe(1);
      expect(views[0].title).toBe('Thumbnail');
      expect(views[0].widthLabel).toBe('100');
      expect(views[0].heightLabel).toBe('75');
    });
  });

  describe('pictureViewGroups computed', () => {
    it('returns empty array when no views', () => {
      fixture.componentRef.setInput('document', null);
      fixture.detectChanges();
      expect(component.pictureViewGroups()).toEqual([]);
    });

    it('groups views in sets of 4', () => {
      const views = Array.from({ length: 5 }, (_, i) => ({
        description: `View ${i}`,
        width: 100,
        height: 75,
        content: { length: 1000, 'mime-type': 'image/jpeg' },
      }));
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.picture.views]: views,
        })
      );
      fixture.detectChanges();
      const groups = component.pictureViewGroups();
      expect(groups.length).toBe(2);
      expect(groups[0].length).toBe(4);
      expect(groups[1].length).toBe(1);
    });
  });

  describe('directoryOptions loading', () => {
    it('calls all 3 directory option methods on create', () => {
      expect(dirOptSpy.getNatureOptions).toHaveBeenCalled();
      expect(dirOptSpy.getSubjectOptions).toHaveBeenCalled();
      expect(dirOptSpy.getCoverageOptions).toHaveBeenCalled();
    });

    it('populates pictureNatureOptions from getNatureOptions response', () => {
      const options: Option[] = [{ id: 'nat-1', label: 'Natur' }];
      dirOptSpy.getNatureOptions.and.returnValue(of(options));
      dirOptSpy.getSubjectOptions.and.returnValue(of([]));
      dirOptSpy.getCoverageOptions.and.returnValue(of([]));
      const f = TestBed.createComponent(PictureViewComponent);
      f.detectChanges();
      expect(f.componentInstance.pictureNatureOptions()).toEqual(options);
    });
  });
});
