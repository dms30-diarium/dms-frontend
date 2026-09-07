import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShareLinksDialogComponent, ShareLinkItem } from './share-links-dialog.component';

describe('ShareLinksDialogComponent', () => {
  let component: ShareLinksDialogComponent;
  let fixture: ComponentFixture<ShareLinksDialogComponent>;
  let writeTextSpy: jasmine.Spy;
  let originalClipboard: PropertyDescriptor | undefined;

  const links: ShareLinkItem[] = [
    { uid: 'doc-1', title: 'Doc 1', link: 'https://example.com/doc-1' },
    { uid: 'doc-2', title: 'Doc 2', link: 'https://example.com/doc-2' },
  ];

  beforeEach(async () => {
    originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    writeTextSpy = jasmine.createSpy('writeText').and.returnValue(Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextSpy },
      configurable: true,
    });

    await TestBed.configureTestingModule({
      imports: [ShareLinksDialogComponent],
    })
      .overrideTemplate(ShareLinksDialogComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(ShareLinksDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('links', links);
    fixture.detectChanges();
  });

  afterEach(() => {
    if (originalClipboard) {
      Object.defineProperty(navigator, 'clipboard', originalClipboard);
    }
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('has sensible signal defaults', () => {
    expect(component.copiedId()).toBeNull();
    expect(component.allCopied()).toBeFalse();
  });

  describe('copyOne', () => {
    it('copies the link and tracks the copied id', () => {
      component.copyOne('doc-1', links[0].link);

      expect(writeTextSpy).toHaveBeenCalledWith(links[0].link);
      expect(component.copiedId()).toBe('doc-1');
      expect(component.allCopied()).toBeFalse();
    });

    it('clears the allCopied flag', () => {
      component.allCopied.set(true);
      component.copyOne('doc-2', links[1].link);
      expect(component.allCopied()).toBeFalse();
    });
  });

  describe('copyAll', () => {
    it('copies all links joined by newlines and sets allCopied', () => {
      component.copyAll();

      expect(writeTextSpy).toHaveBeenCalledWith('https://example.com/doc-1\nhttps://example.com/doc-2');
      expect(component.allCopied()).toBeTrue();
      expect(component.copiedId()).toBeNull();
    });

    it('clears any previously copied single id', () => {
      component.copiedId.set('doc-1');
      component.copyAll();
      expect(component.copiedId()).toBeNull();
    });
  });
});
