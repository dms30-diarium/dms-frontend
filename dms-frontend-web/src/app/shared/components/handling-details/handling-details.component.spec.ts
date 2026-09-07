import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HandlingDetailsComponent } from './handling-details.component';
import { makeNuxeoDocument } from '@app/shared/testing/mock-factories';
import { HandlingExtendedProperties } from '@app/shared/api/nuxeo-api.types';

describe('HandlingDetailsComponent', () => {
  let component: HandlingDetailsComponent;
  let fixture: ComponentFixture<HandlingDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HandlingDetailsComponent],
      providers: [provideRouter([])],
    })
      .overrideTemplate(HandlingDetailsComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(HandlingDetailsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('doc', makeNuxeoDocument<HandlingExtendedProperties>({ uid: 'h-1' }));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('exposes the document properties', () => {
    expect(component.properties()).toEqual(component.doc().properties);
  });

  describe('getDate', () => {
    it('formats a date value', () => {
      expect(typeof component.getDate('2026-06-15T00:00:00Z')).toBe('string');
    });

    it('handles null gracefully', () => {
      expect(typeof component.getDate(null)).toBe('string');
    });
  });
});
