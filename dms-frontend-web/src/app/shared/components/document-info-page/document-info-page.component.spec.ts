import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentInfoPageComponent } from './document-info-page.component';
import { AuditEntry } from '@app/shared/api/nuxeo-api.types';

describe('DocumentInfoPageComponent', () => {
  let component: DocumentInfoPageComponent;
  let fixture: ComponentFixture<DocumentInfoPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentInfoPageComponent],
    })
      .overrideTemplate(DocumentInfoPageComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(DocumentInfoPageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('hasAuditEntries', () => {
    it('returns false when auditEntries is empty', () => {
      fixture.componentRef.setInput('auditEntries', []);
      expect(component.hasAuditEntries()).toBeFalse();
    });

    it('returns true when auditEntries has items', () => {
      const entries: AuditEntry[] = [{ eventId: 'documentCreated', eventDate: '2024-01-01T00:00:00Z' } as AuditEntry];
      fixture.componentRef.setInput('auditEntries', entries);
      expect(component.hasAuditEntries()).toBeTrue();
    });
  });

  describe('getAuditLabel', () => {
    it('returns eventId from audit entry', () => {
      const entry = { eventId: 'documentModified' } as AuditEntry;
      expect(component.getAuditLabel(entry)).toBe('documentModified');
    });

    it('returns empty string when eventId is missing', () => {
      expect(component.getAuditLabel({} as AuditEntry)).toBe('');
    });
  });

  describe('getAuditTime', () => {
    it('returns formatted date from eventDate', () => {
      const entry = { eventDate: '2024-06-15T10:00:00Z' } as AuditEntry;
      const result = component.getAuditTime(entry);
      expect(result).toContain('2024');
    });

    it('falls back to logDate when eventDate is absent', () => {
      const entry = { logDate: '2024-03-01T00:00:00Z' } as AuditEntry;
      const result = component.getAuditTime(entry);
      expect(result).toContain('2024');
    });

    it('returns empty string when no dates present', () => {
      expect(component.getAuditTime({} as AuditEntry)).toBe('');
    });
  });

  describe('input defaults', () => {
    it('defaults title to empty string', () => {
      expect(component.title()).toBe('');
    });

    it('defaults showEdit to true', () => {
      expect(component.showEdit()).toBeTrue();
    });

    it('accepts statusItems input', () => {
      const items = [{ label: 'Status', value: 'project' }];
      fixture.componentRef.setInput('statusItems', items);
      expect(component.statusItems().length).toBe(1);
    });
  });
});
