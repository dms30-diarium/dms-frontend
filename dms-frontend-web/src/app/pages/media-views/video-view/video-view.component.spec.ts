import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { VideoViewComponent } from './video-view.component';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { DirectoryOptionsService } from '@app/shared/services/directory-options.service';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { Option } from '@app/shared/commonTypes';
import { NuxeoDocument, NuxeoProperties } from '@app/shared/api/nuxeo-api.types';
import { makeNuxeoDocument } from '@app/shared/testing/mock-factories';

function makeDoc(properties: Record<string, unknown> = {}): NuxeoDocument {
  return makeNuxeoDocument({
    uid: 'vid-1',
    type: 'Video',
    title: 'Test Video',
    properties: {
      [NUXEO_SCHEMA_FIELDS.dc.title]: 'Test Video',
      [NUXEO_SCHEMA_FIELDS.dc.description]: '',
      [NUXEO_SCHEMA_FIELDS.dc.nature]: null,
      [NUXEO_SCHEMA_FIELDS.dc.subjects]: [],
      [NUXEO_SCHEMA_FIELDS.dc.coverage]: null,
      [NUXEO_SCHEMA_FIELDS.dc.expired]: null,
      [NUXEO_SCHEMA_FIELDS.dc.rights]: null,
      [NUXEO_SCHEMA_FIELDS.vid.info]: {},
      [NUXEO_SCHEMA_FIELDS.vid.transcodedVideos]: [],
      ...properties,
    } as NuxeoProperties,
  });
}

describe('VideoViewComponent', () => {
  let component: VideoViewComponent;
  let fixture: ComponentFixture<VideoViewComponent>;
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
      imports: [VideoViewComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NuxeoApiService, useValue: apiSpy },
        { provide: DirectoryOptionsService, useValue: dirOptSpy },
      ],
    })
      .overrideTemplate(VideoViewComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(VideoViewComponent);
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

    it('videoEditConfig defaults to empty array', () => {
      expect(component.videoEditConfig()).toEqual([]);
    });

    it('videoNatureOptions defaults to empty array', () => {
      expect(component.videoNatureOptions()).toEqual([]);
    });

    it('videoSubjectOptions defaults to empty array', () => {
      expect(component.videoSubjectOptions()).toEqual([]);
    });

    it('videoCoverageOptions defaults to empty array', () => {
      expect(component.videoCoverageOptions()).toEqual([]);
    });
  });

  describe('title computed', () => {
    it('returns empty string when document is null', () => {
      fixture.componentRef.setInput('document', null);
      fixture.detectChanges();
      expect(component.title()).toBe('');
    });

    it('returns dc:title from properties', () => {
      fixture.componentRef.setInput('document', makeDoc({ [NUXEO_SCHEMA_FIELDS.dc.title]: 'My Video' }));
      fixture.detectChanges();
      expect(component.title()).toBe('My Video');
    });

    it('falls back to doc.title', () => {
      const doc = makeDoc({ [NUXEO_SCHEMA_FIELDS.dc.title]: '' });
      fixture.componentRef.setInput('document', doc);
      fixture.detectChanges();
      expect(component.title()).toBe('Test Video');
    });

    it('falls back to uid when no title', () => {
      const doc = makeDoc({ [NUXEO_SCHEMA_FIELDS.dc.title]: '' });
      doc.title = '';
      fixture.componentRef.setInput('document', doc);
      fixture.detectChanges();
      expect(component.title()).toBe('vid-1');
    });
  });

  describe('getVideoFormatLabel', () => {
    it('returns empty string when no format', () => {
      fixture.componentRef.setInput('document', makeDoc());
      fixture.detectChanges();
      expect(component.getVideoFormatLabel()).toBe('');
    });

    it('returns format from vid:info', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.vid.info]: { format: 'mp4' },
        })
      );
      fixture.detectChanges();
      expect(component.getVideoFormatLabel()).toBe('MP4');
    });

    it('extracts format from mime type', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.file.content]: { 'mime-type': 'video/webm' },
        })
      );
      fixture.detectChanges();
      expect(component.getVideoFormatLabel()).toBe('WEBM');
    });
  });

  describe('getVideoDurationLabel', () => {
    it('returns empty string when no duration', () => {
      fixture.componentRef.setInput('document', makeDoc());
      fixture.detectChanges();
      expect(component.getVideoDurationLabel()).toBe('');
    });

    it('formats duration in M:SS for under 1 hour', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.vid.info]: { duration: 75 },
        })
      );
      fixture.detectChanges();
      expect(component.getVideoDurationLabel()).toBe('1:15');
    });

    it('formats duration in H:MM:SS for 1+ hours', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.vid.info]: { duration: 3661 },
        })
      );
      fixture.detectChanges();
      expect(component.getVideoDurationLabel()).toBe('1:01:01');
    });

    it('returns empty string for negative duration', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.vid.info]: { duration: -1 },
        })
      );
      fixture.detectChanges();
      expect(component.getVideoDurationLabel()).toBe('');
    });
  });

  describe('getVideoWidthLabel', () => {
    it('returns empty string when no width', () => {
      fixture.componentRef.setInput('document', makeDoc());
      fixture.detectChanges();
      expect(component.getVideoWidthLabel()).toBe('');
    });

    it('returns width string from vid:info', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.vid.info]: { width: 1920 },
        })
      );
      fixture.detectChanges();
      expect(component.getVideoWidthLabel()).toBe('1920');
    });
  });

  describe('getVideoHeightLabel', () => {
    it('returns empty string when no height', () => {
      fixture.componentRef.setInput('document', makeDoc());
      fixture.detectChanges();
      expect(component.getVideoHeightLabel()).toBe('');
    });

    it('returns height string from vid:info', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.vid.info]: { height: 1080 },
        })
      );
      fixture.detectChanges();
      expect(component.getVideoHeightLabel()).toBe('1080');
    });
  });

  describe('getVideoFrameRateLabel', () => {
    it('returns empty string when no frameRate', () => {
      fixture.componentRef.setInput('document', makeDoc());
      fixture.detectChanges();
      expect(component.getVideoFrameRateLabel()).toBe('');
    });

    it('returns frameRate from vid:info', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.vid.info]: { frameRate: '25.00' },
        })
      );
      fixture.detectChanges();
      expect(component.getVideoFrameRateLabel()).toBe('25.00');
    });
  });

  describe('getVideoSizeLabel', () => {
    it('returns empty string when no file content', () => {
      fixture.componentRef.setInput('document', makeDoc());
      fixture.detectChanges();
      expect(component.getVideoSizeLabel()).toBe('');
    });

    it('returns formatted size when length is set', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.file.content]: { length: 1024 * 1024 },
        })
      );
      fixture.detectChanges();
      const label = component.getVideoSizeLabel();
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    });

    it('returns empty string for zero length', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.file.content]: { length: 0 },
        })
      );
      fixture.detectChanges();
      expect(component.getVideoSizeLabel()).toBe('');
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

    it('builds videoEditConfig with 6 fields', () => {
      fixture.componentRef.setInput('document', makeDoc());
      fixture.detectChanges();
      component.openEditDialog();
      expect(component.videoEditConfig().length).toBe(6);
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
    });

    it('does nothing when document uid is empty', () => {
      const doc = makeDoc();
      doc.uid = '';
      fixture.componentRef.setInput('document', doc);
      fixture.detectChanges();
      component.saveEdits({ title: 'New title' });
      expect(apiSpy.editDocument).not.toHaveBeenCalled();
    });

    it('calls editDocument with properties', () => {
      component.saveEdits({ title: 'Updated', description: 'desc', nature: 'nat-1', subjects: [], expires: [] });
      expect(apiSpy.editDocument).toHaveBeenCalledWith(
        'vid-1',
        jasmine.objectContaining({
          [NUXEO_SCHEMA_FIELDS.dc.title]: 'Updated',
        })
      );
    });

    it('emits reloadDocument on success', () => {
      let reloaded = false;
      component.reloadDocument.subscribe(() => (reloaded = true));
      component.saveEdits({ title: 'Title' });
      expect(reloaded).toBeTrue();
    });

    it('closes dialog on success', () => {
      component.isEditDialogOpen.set(true);
      component.saveEdits({ title: 'Title' });
      expect(component.isEditDialogOpen()).toBeFalse();
    });

    it('converts Date in expires array to ISO string', () => {
      const date = new Date('2025-01-15');
      component.saveEdits({ title: 'T', expires: [date] });
      expect(apiSpy.editDocument).toHaveBeenCalledWith(
        'vid-1',
        jasmine.objectContaining({
          [NUXEO_SCHEMA_FIELDS.dc.expired]: date.toISOString(),
        })
      );
    });
  });

  describe('videoRenditions computed', () => {
    it('returns empty array when document is null', () => {
      fixture.componentRef.setInput('document', null);
      fixture.detectChanges();
      expect(component.videoRenditions()).toEqual([]);
    });

    it('returns empty array when vid:transcodedVideos is empty', () => {
      fixture.componentRef.setInput('document', makeDoc());
      fixture.detectChanges();
      expect(component.videoRenditions()).toEqual([]);
    });

    it('maps renditions to items', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.vid.transcodedVideos]: [
            {
              title: 'HD 720p',
              width: 1280,
              height: 720,
              content: { length: 50000000, 'mime-type': 'video/mp4', data: 'http://example.com/hd.mp4' },
            },
          ],
        })
      );
      fixture.detectChanges();
      const renditions = component.videoRenditions();
      expect(renditions.length).toBe(1);
      expect(renditions[0].title).toBe('HD 720p');
      expect(renditions[0].resolutionLabel).toBe('1280 x 720');
    });

    it('filters out renditions with no title and no detail', () => {
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.vid.transcodedVideos]: [{}],
        })
      );
      fixture.detectChanges();
      expect(component.videoRenditions().length).toBe(0);
    });
  });

  describe('videoRenditionGroups computed', () => {
    it('returns empty array when no renditions', () => {
      fixture.componentRef.setInput('document', null);
      fixture.detectChanges();
      expect(component.videoRenditionGroups()).toEqual([]);
    });

    it('groups renditions in sets of 4', () => {
      const renditions = Array.from({ length: 6 }, (_, i) => ({
        title: `Rendition ${i}`,
        width: 100,
        height: 50,
        content: { length: 1000, 'mime-type': 'video/mp4' },
      }));
      fixture.componentRef.setInput(
        'document',
        makeDoc({
          [NUXEO_SCHEMA_FIELDS.vid.transcodedVideos]: renditions,
        })
      );
      fixture.detectChanges();
      const groups = component.videoRenditionGroups();
      expect(groups.length).toBe(2);
      expect(groups[0].length).toBe(4);
      expect(groups[1].length).toBe(2);
    });
  });

  describe('directoryOptions loading', () => {
    it('calls all 3 directory option methods on create', () => {
      expect(dirOptSpy.getNatureOptions).toHaveBeenCalled();
      expect(dirOptSpy.getSubjectOptions).toHaveBeenCalled();
      expect(dirOptSpy.getCoverageOptions).toHaveBeenCalled();
    });

    it('populates videoNatureOptions', () => {
      const opts: Option[] = [{ id: 'n1', label: 'Natur' }];
      dirOptSpy.getNatureOptions.and.returnValue(of(opts));
      dirOptSpy.getSubjectOptions.and.returnValue(of([]));
      dirOptSpy.getCoverageOptions.and.returnValue(of([]));
      const f = TestBed.createComponent(VideoViewComponent);
      f.detectChanges();
      expect(f.componentInstance.videoNatureOptions()).toEqual(opts);
    });
  });
});
