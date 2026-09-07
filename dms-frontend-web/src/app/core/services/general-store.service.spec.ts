import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { GeneralStore } from './general-store.service';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { of } from 'rxjs';

describe('GeneralStore', () => {
  let store: GeneralStore;
  let nuxeoApiSpy: jasmine.SpyObj<NuxeoApiService>;

  beforeEach(() => {
    nuxeoApiSpy = jasmine.createSpyObj('NuxeoApiService', ['getMessagesJSON']);
    nuxeoApiSpy.getMessagesJSON.and.returnValue(of({}));

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [GeneralStore, { provide: NuxeoApiService, useValue: nuxeoApiSpy }],
    });
    store = TestBed.inject(GeneralStore);
  });

  it('should have notification hidden by default', () => {
    expect(store.notification().show).toBeFalse();
  });

  it('should set and read notification signal', () => {
    store.notification.set({ show: true, variation: 'success', text: 'Saved' });
    expect(store.notification().show).toBeTrue();
    expect(store.notification().text).toBe('Saved');
  });

  it('should set and read navigationPanelContext', () => {
    expect(store.navigationPanelContext()).toBeNull();
    store.navigationPanelContext.set('info');
    expect(store.navigationPanelContext()).toBe('info');
  });

  it('should set and read openPage signal', () => {
    store.openPage.set('case-page');
    expect(store.openPage()).toBe('case-page');
  });

  describe('getLabelByType', () => {
    it('returns docType when messagesInfo is null', () => {
      store.messagesInfo.set(null);
      expect(store.getLabelByType('Arende')).toBe('Arende');
    });

    it('returns translated label when key exists', () => {
      store.messagesInfo.set({ 'label.document.type.arende': 'Ärende' });
      expect(store.getLabelByType('Arende')).toBe('Ärende');
    });

    it('returns docType as fallback when key missing', () => {
      store.messagesInfo.set({});
      expect(store.getLabelByType('Unknown')).toBe('Unknown');
    });
  });

  describe('getValue', () => {
    it('returns undefined when messagesInfo is null', () => {
      store.messagesInfo.set(null);
      expect(store.getValue('some.key')).toBeUndefined();
    });

    it('returns value for existing key', () => {
      store.messagesInfo.set({ 'my.key': 'my value' });
      expect(store.getValue('my.key')).toBe('my value');
    });
  });

  describe('getStatus', () => {
    it('returns status as fallback when key missing', () => {
      store.messagesInfo.set({});
      expect(store.getStatus('oppet')).toBe('oppet');
    });

    it('returns translated status when key exists', () => {
      store.messagesInfo.set({ 'label.ui.state.oppet': 'Öppet' });
      expect(store.getStatus('oppet')).toBe('Öppet');
    });
  });
});
