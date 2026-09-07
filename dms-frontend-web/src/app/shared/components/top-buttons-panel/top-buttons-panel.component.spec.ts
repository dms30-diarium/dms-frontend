import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { TopButtonsPanelComponent } from './top-buttons-panel.component';

describe('TopButtonsPanelComponent', () => {
  let component: TopButtonsPanelComponent;
  let fixture: ComponentFixture<TopButtonsPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopButtonsPanelComponent],
      providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting(), provideRouter([])],
    })
      .overrideTemplate(TopButtonsPanelComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(TopButtonsPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('default input values', () => {
    it('selectedFiles defaults to empty array', () => {
      expect(component.selectedFiles()).toEqual([]);
    });

    it('shouldDisplayTrashButton defaults false', () => {
      expect(component.shouldDisplayTrashButton()).toBeFalse();
    });

    it('trashButtonTitle defaults to Radera', () => {
      expect(component.trashButtonTitle()).toBe('Radera');
    });

    it('trashButtonIcon defaults to trash', () => {
      expect(component.trashButtonIcon()).toBe('trash');
    });

    it('showDownload defaults true', () => {
      expect(component.showDownload()).toBeTrue();
    });

    it('showFavorites defaults true', () => {
      expect(component.showFavorites()).toBeTrue();
    });

    it('showAssignToCollection defaults true', () => {
      expect(component.showAssignToCollection()).toBeTrue();
    });

    it('lockState defaults null', () => {
      expect(component.lockState()).toBeNull();
    });
  });

  describe('output emitters', () => {
    it('deleteSelectedItems emits', () => {
      const spy = jasmine.createSpy('delete');
      component.deleteSelectedItems.subscribe(spy);
      component.deleteSelectedItems.emit();
      expect(spy).toHaveBeenCalled();
    });

    it('downloadFiles emits', () => {
      const spy = jasmine.createSpy('download');
      component.downloadFiles.subscribe(spy);
      component.downloadFiles.emit();
      expect(spy).toHaveBeenCalled();
    });

    it('lockFiles emits', () => {
      const spy = jasmine.createSpy('lock');
      component.lockFiles.subscribe(spy);
      component.lockFiles.emit();
      expect(spy).toHaveBeenCalled();
    });

    it('shareFiles emits', () => {
      const spy = jasmine.createSpy('share');
      component.shareFiles.subscribe(spy);
      component.shareFiles.emit();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('input overrides', () => {
    it('accepts custom selectedFiles', () => {
      fixture.componentRef.setInput('selectedFiles', ['f1', 'f2']);
      fixture.detectChanges();
      expect(component.selectedFiles()).toEqual(['f1', 'f2']);
    });

    it('accepts lockState object', () => {
      fixture.componentRef.setInput('lockState', { allLocked: true, allUnlocked: false, mixed: false });
      fixture.detectChanges();
      expect(component.lockState()?.allLocked).toBeTrue();
    });
  });
});
