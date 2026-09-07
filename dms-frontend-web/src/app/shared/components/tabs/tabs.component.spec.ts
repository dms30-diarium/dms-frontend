import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TabsComponent, Tab } from './tabs.component';

describe('TabsComponent', () => {
  let component: TabsComponent;
  let fixture: ComponentFixture<TabsComponent>;

  const sampleTabs: Tab[] = [
    { id: 'tab1', title: 'Tab 1' },
    { id: 'tab2', title: 'Tab 2' },
    { id: 'tab3', title: 'Tab 3' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabsComponent],
    })
      .overrideTemplate(TabsComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(TabsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('isActive', () => {
    it('returns true when tabId matches activeTabId input', () => {
      fixture.componentRef.setInput('activeTabId', 'tab2');
      expect(component.isActive('tab2')).toBeTrue();
    });

    it('returns false when tabId does not match', () => {
      fixture.componentRef.setInput('activeTabId', 'tab1');
      expect(component.isActive('tab2')).toBeFalse();
    });
  });

  describe('tabsJson', () => {
    it('serializes tabs to JSON string', () => {
      fixture.componentRef.setInput('tabs', sampleTabs);
      const json = component.tabsJson();
      const parsed = JSON.parse(json);
      expect(parsed.length).toBe(3);
      expect(parsed[0].id).toBe('tab1');
    });

    it('returns empty array JSON for no tabs', () => {
      fixture.componentRef.setInput('tabs', []);
      expect(component.tabsJson()).toBe('[]');
    });
  });

  describe('onTabClick', () => {
    it('emits tabChanged when a different tab is clicked', () => {
      fixture.componentRef.setInput('activeTabId', 'tab1');
      const emittedValues: string[] = [];
      component.tabChanged.subscribe((id: string) => emittedValues.push(id));

      component.onTabClick({ detail: { id: 'tab2', title: 'Tab 2' } } as never);

      expect(emittedValues).toEqual(['tab2']);
    });

    it('does not emit when clicking already active tab', () => {
      fixture.componentRef.setInput('activeTabId', 'tab1');
      const emittedValues: string[] = [];
      component.tabChanged.subscribe((id: string) => emittedValues.push(id));

      component.onTabClick({ detail: { id: 'tab1', title: 'Tab 1' } } as never);

      expect(emittedValues).toEqual([]);
    });
  });
});
