import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { SvgIconComponent } from './svg-icon.component';
import { SvgCacheService } from './svg-cache-service';

describe('SvgIconComponent', () => {
  let component: SvgIconComponent;
  let fixture: ComponentFixture<SvgIconComponent>;
  let svgCacheSpy: jasmine.SpyObj<SvgCacheService>;

  beforeEach(async () => {
    svgCacheSpy = jasmine.createSpyObj('SvgCacheService', ['getSvg']);
    svgCacheSpy.getSvg.and.returnValue(of('<svg width="10" height="10"><path/></svg>'));

    await TestBed.configureTestingModule({
      imports: [SvgIconComponent],
      providers: [{ provide: SvgCacheService, useValue: svgCacheSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(SvgIconComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('does not fetch when src is empty', () => {
    fixture.detectChanges();
    expect(svgCacheSpy.getSvg).not.toHaveBeenCalled();
    expect(component.svgContent()).toBe('');
  });

  it('fetches and sets the processed svg content when src is provided', () => {
    fixture.componentRef.setInput('src', '/assets/icon.svg');
    fixture.detectChanges();

    expect(svgCacheSpy.getSvg).toHaveBeenCalledWith('/assets/icon.svg');
    expect(component.svgContent()).toBeTruthy();
  });

  it('clears the content when the request errors', () => {
    svgCacheSpy.getSvg.and.returnValue(throwError(() => new Error('not found')));
    fixture.componentRef.setInput('src', '/assets/missing.svg');
    fixture.detectChanges();

    expect(component.svgContent()).toBe('');
  });

  it('fetches new content when src changes to a different value', () => {
    svgCacheSpy.getSvg.and.returnValues(
      of('<svg width="1" height="1"><path/></svg>'),
      of('<svg width="1" height="1"><circle/></svg>')
    );

    fixture.componentRef.setInput('src', '/assets/first.svg');
    fixture.detectChanges();
    fixture.componentRef.setInput('src', '/assets/second.svg');
    fixture.detectChanges();

    expect(svgCacheSpy.getSvg).toHaveBeenCalledWith('/assets/first.svg');
    expect(svgCacheSpy.getSvg).toHaveBeenCalledWith('/assets/second.svg');
    const content = component.svgContent() as { changingThisBreaksApplicationSecurity?: string };
    expect(content.changingThisBreaksApplicationSecurity).toContain('circle');
  });

  describe('processSvg', () => {
    it('replaces existing width/height attributes with the requested size', () => {
      const result = component.processSvg('<svg width="24" height="24" viewBox="0 0 24 24"></svg>', '2em') as {
        changingThisBreaksApplicationSecurity: string;
      };
      const html = result.changingThisBreaksApplicationSecurity;
      expect(html).toContain('width="2em"');
      expect(html).toContain('height="2em"');
      expect(html).not.toContain('width="24"');
    });

    it('adds size attributes when none were present', () => {
      const result = component.processSvg('<svg viewBox="0 0 24 24"></svg>', '1.5em') as {
        changingThisBreaksApplicationSecurity: string;
      };
      const html = result.changingThisBreaksApplicationSecurity;
      expect(html).toContain('width="1.5em"');
      expect(html).toContain('height="1.5em"');
    });
  });
});
