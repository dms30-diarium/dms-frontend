import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { CardsDisplayComponent } from './cards-display.component';
import { CasesService } from '@app/core/services/cases.service';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { makeNuxeoDocument } from '@app/shared/testing/mock-factories';
import { NUXEO_SCHEMA_FIELDS } from '@app/shared/constants/nuxeo-schema-fields';
import { HandlingExtendedProperties } from '@app/shared/api/nuxeo-api.types';

describe('CardsDisplayComponent', () => {
  let component: CardsDisplayComponent;
  let fixture: ComponentFixture<CardsDisplayComponent>;
  let casesSpy: jasmine.SpyObj<CasesService>;

  beforeEach(async () => {
    casesSpy = jasmine.createSpyObj('CasesService', ['getStatusColor', 'getStatusVariation', 'getStatusLabel']);
    casesSpy.getStatusColor.and.returnValue('approved');
    casesSpy.getStatusVariation.and.returnValue('primary');
    casesSpy.getStatusLabel.and.returnValue('Klar');
    const apiSpy = jasmine.createSpyObj('NuxeoApiService', ['getMessagesJSON']);
    apiSpy.getMessagesJSON.and.returnValue(of({}));

    await TestBed.configureTestingModule({
      imports: [CardsDisplayComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: CasesService, useValue: casesSpy },
        { provide: NuxeoApiService, useValue: apiSpy },
      ],
    })
      .overrideTemplate(CardsDisplayComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(CardsDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('getDate', () => {
    it('formats a valid date', () => {
      expect(component.getDate('2026-06-15T00:00:00Z')).not.toBe('');
    });

    it('returns a missing placeholder for null', () => {
      expect(typeof component.getDate(null)).toBe('string');
    });
  });

  describe('getDirectoryValue', () => {
    it('returns the string value directly', () => {
      expect(component.getDirectoryValue('oppet')).toBe('oppet');
    });

    it('returns the id of a directory entry object', () => {
      expect(component.getDirectoryValue({ 'entity-type': 'directoryEntry', id: 'stark' })).toBe('stark');
    });

    it('returns an empty string for null/undefined', () => {
      expect(component.getDirectoryValue(null)).toBe('');
      expect(component.getDirectoryValue(undefined)).toBe('');
    });
  });

  describe('status helpers', () => {
    it('delegates getStatusColor to CasesService with a fallback', () => {
      component.getStatusColor('oppet');
      expect(casesSpy.getStatusColor).toHaveBeenCalledWith('oppet', { fallback: 'missing' });
    });

    it('falls back to an empty string status when null', () => {
      component.getStatusColor(null);
      expect(casesSpy.getStatusColor).toHaveBeenCalledWith('', { fallback: 'missing' });
    });

    it('delegates getStatusVariation to CasesService', () => {
      component.getStatusVariation('oppet');
      expect(casesSpy.getStatusVariation).toHaveBeenCalledWith('oppet');
    });

    it('delegates getStatusLabel to CasesService and returns the label', () => {
      expect(component.getStatusLabel('oppet')).toBe('Klar');
      expect(casesSpy.getStatusLabel).toHaveBeenCalledWith('oppet');
    });

    it('returns an empty string when the service returns a falsy label', () => {
      casesSpy.getStatusLabel.and.returnValue('');
      expect(component.getStatusLabel('unknown')).toBe('');
    });
  });

  describe('cardsWithDisplayValues', () => {
    it('enriches each card with secretStampText and handlingsriktning', () => {
      const card = makeNuxeoDocument<HandlingExtendedProperties>({
        uid: 'h-1',
        properties: {
          [NUXEO_SCHEMA_FIELDS.handling.sekretess]: 'starkSekretess',
          [NUXEO_SCHEMA_FIELDS.handling.handlingsriktning]: { 'entity-type': 'directoryEntry', id: 'inkommande' },
        } as never,
      });
      fixture.componentRef.setInput('cards', [card]);

      const result = component.cardsWithDisplayValues();
      expect(result[0]['secretStampText']).toBe('STARK - SEKRETESS');
      expect(result[0]['handlingsriktning']).toBe('inkommande');
    });
  });

  describe('openEditDialog', () => {
    it('does not throw when invoked', () => {
      expect(() => component.openEditDialog()).not.toThrow();
    });
  });
});
