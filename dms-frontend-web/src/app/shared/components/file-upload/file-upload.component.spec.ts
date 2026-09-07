import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FileUploadComponent, UploadedFile } from './file-upload.component';

function makeUploadedFile(name: string, id: string): UploadedFile {
  return Object.assign(new File(['content'], name), { id });
}

describe('FileUploadComponent', () => {
  let component: FileUploadComponent;
  let fixture: ComponentFixture<FileUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileUploadComponent],
    })
      .overrideTemplate(FileUploadComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(FileUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('files defaults to an empty array', () => {
    expect(component.files()).toEqual([]);
  });

  describe('addFiles', () => {
    it('adds a file and emits the updated list', () => {
      const spy = jasmine.createSpy('filesChange');
      component.filesChange.subscribe(spy);
      const file = makeUploadedFile('doc1.pdf', 'id-1');

      component.addFiles(file);

      expect(component.files()).toEqual([file]);
      expect(spy).toHaveBeenCalledWith([file]);
    });
  });

  describe('clearFiles', () => {
    it('removes a file by name and emits the updated list', () => {
      const fileA = makeUploadedFile('a.pdf', 'id-a');
      const fileB = makeUploadedFile('b.pdf', 'id-b');
      component.addFiles(fileA);
      component.addFiles(fileB);

      const spy = jasmine.createSpy('filesChange');
      component.filesChange.subscribe(spy);
      component.clearFiles(fileA);

      expect(component.files()).toEqual([fileB]);
      expect(spy).toHaveBeenCalledWith([fileB]);
    });
  });
});
