import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { DigiNavigationBreadcrumbs, DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';

import { GeneralStore } from '@app/core/services/general-store.service';
import { NuxeoApiService } from '@app/shared/api/nuxeo-api.service';
import { STATISTICS_LOAD_ERROR_MESSAGE } from '@app/shared/constants/notification-messages';
import { AgChartInstance, type AgChartOptions } from 'ag-charts-community';
type AgChartsType = Awaited<typeof import('ag-charts-community')>;
import { catchError, EMPTY, map, tap } from 'rxjs';
import { StatisticItem, Statistics } from '@app/shared/api/nuxeo-api.types';
import { Suggestions } from '../case-page/case-types';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ImageButtonComponent } from '@app/shared/components/image-button/image-button.component';
import { TabsComponent } from '@app/shared/components/tabs/tabs.component';
import { Option } from '@app/shared/commonTypes';
import { DigiFormSelectFilterCustomEvent } from '@designsystem-se/af/dist/types/components';

@Component({
  selector: 'nuxeo-statistics',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DigiNavigationBreadcrumbs,
    DigiArbetsformedlingenAngularModule,
    ReactiveFormsModule,
    ImageButtonComponent,
    TabsComponent,
  ],
  templateUrl: './statistics.component.html',
})
export class StatisticsComponent implements AfterViewInit, OnInit {
  @ViewChild('orgsOpen', { static: false }) orgsOpen!: ElementRef;
  @ViewChild('typesOpen', { static: false }) typesOpen!: ElementRef;
  @ViewChild('orgsClosed', { static: false }) orgsClosed!: ElementRef;
  @ViewChild('typesClosed', { static: false }) typesClosed!: ElementRef;
  @ViewChild('caseTypeFilter', { read: ElementRef }) caseTypeFilter?: ElementRef<HTMLDigiFormSelectFilterElement>;
  @ViewChild('orgFilter', { read: ElementRef }) orgFilter?: ElementRef<HTMLDigiFormSelectFilterElement>;
  nuxeoApi = inject(NuxeoApiService);
  private store = inject(GeneralStore);
  data = signal<Statistics | null>(null);
  ansvOrgOptionsOpen = signal<AgChartOptions | null>(null);
  arendetypOptionsOpen = signal<AgChartOptions | null>(null);
  ansvOrgOptionsClosed = signal<AgChartOptions | null>(null);
  arendetypOptionsClosed = signal<AgChartOptions | null>(null);
  chartsOrgOptionsOpen: AgChartInstance | null = null;
  chartsTypOptionsOpen: AgChartInstance | null = null;
  chartsOrgOptionsClosed: AgChartInstance | null = null;
  chartsTypOptionsClosed: AgChartInstance | null = null;
  totalOpen = signal<number | null>(null);
  totalClosed = signal<number | null>(null);
  suggestions = signal<Suggestions>({});
  yearOptions = [
    { id: 2024, label: 2024 },
    { id: 2025, label: 2025 },
  ];
  monthOptions = [
    { id: '01', label: 'Januari' },
    { id: '02', label: 'Februari' },
    { id: '03', label: 'Mars' },
    { id: '04', label: 'April' },
    { id: '05', label: 'Maj' },
    { id: '06', label: 'Juni' },
    { id: '07', label: 'Juli' },
    { id: '08', label: 'Augusti' },
    { id: '09', label: 'September' },
    { id: '10', label: 'Oktober' },
    { id: '11', label: 'November' },
    { id: '12', label: 'December' },
  ];

  tabs = [
    { id: 'arende', title: 'Ärende' },
    { id: 'handling', title: 'Handling' },
    { id: 'utkast', title: 'Utkast' },
  ];
  activeTabId = signal<string>('arende');
  agCharts!: AgChartsType;

  constructor() {
    effect(() => {
      if (this.activeTabId() === 'arende' && this.agCharts) {
        this.getStatistics(undefined, true);
      }
    });
  }

  ngOnInit(): void {
    this.getDocumentSuggestions('Klass', 'caseType');
    this.getDocumentSuggestions('Organisationsdel', 'organization');
  }

  async ngAfterViewInit() {
    await this.lazyLoadCharts();
    this.getStatistics(undefined, true);
  }

  onDocTypeTabChanged(tabId: string) {
    this.activeTabId.set(tabId);
  }

  getStatistics(payload?: Record<string, unknown> | undefined, shouldCreate?: boolean) {
    this.nuxeoApi
      .getStatistics(payload)
      .pipe(
        tap(data => {
          this.data.set(data);
          if (shouldCreate) {
            this.setOpenCasesData(data);
            this.setClosedCasesData(data);
          } else {
            this.updateOpenCasesData(data);
            this.updateClosedCasesData(data);
          }
        })
      )
      .subscribe();
  }

  async lazyLoadCharts() {
    this.agCharts = await import('ag-charts-community');
    const {
      ModuleRegistry,
      BarSeriesModule,
      PieSeriesModule,
      LegendModule,
      CategoryAxisModule,
      NumberAxisModule,
      LocaleModule,
    } = this.agCharts;

    ModuleRegistry.registerModules([
      BarSeriesModule,
      PieSeriesModule,
      LegendModule,
      CategoryAxisModule,
      NumberAxisModule,
      LocaleModule,
    ]);
  }

  filtersForm = new FormGroup({
    caseType: new FormControl<Option[] | null>(null),
    org: new FormControl<Option[] | null>(null),
    month: new FormControl(null),
    year: new FormControl(null),
  });

  restoreFilters() {
    this.filtersForm.reset({
      caseType: [],
      org: [],
      month: null,
      year: null,
    });
    this.resetSelectFilter(this.caseTypeFilter);
    this.resetSelectFilter(this.orgFilter);
    this.getStatistics();
  }

  getDocumentSuggestions(targetType: string, name: keyof Suggestions, searchTerm = ''): void {
    this.nuxeoApi
      .DMSDocumentSuggestion('', targetType, '', searchTerm)
      .pipe(
        map(result => result.entries.map(el => ({ label: el.title, id: el.uid, value: el.uid, path: el.path }))),
        tap(options => {
          this.suggestions.update(result => {
            result[name] = options;
            return result;
          });
        }),
        catchError(() => {
          this.store.notification.set({ show: true, variation: 'danger', text: STATISTICS_LOAD_ERROR_MESSAGE });
          return EMPTY;
        })
      )
      .subscribe();
  }

  onDocumentQuery(event: DigiFormSelectFilterCustomEvent<string>, targetType: string, name: keyof Suggestions): void {
    this.getDocumentSuggestions(targetType, name, event.detail ?? '');
  }

  onDocumentSelect(event: CustomEvent, controlName: 'caseType' | 'org'): void {
    const selected = event.detail;
    this.filtersForm.get(controlName)?.setValue(selected);
    this.changeSelectedOptions();
  }

  changeSelectedOptions() {
    const payload = {
      klass: this.getSelectedValue(this.filtersForm?.get('caseType')?.value) ?? undefined,
      organisationsdel: this.getSelectedValue(this.filtersForm?.get('org')?.value) ?? undefined,
      month: this.filtersForm?.get('month')?.value ?? undefined,
      year: this.filtersForm?.get('year')?.value ?? undefined,
    };
    this.getStatistics(payload);
  }

  private getSelectedValue(value: Option[] | null | undefined): string | null {
    const first = value?.[0];
    if (!first) return null;
    return first.value?.toString() ?? first.id;
  }

  private resetSelectFilter(ref?: ElementRef<HTMLDigiFormSelectFilterElement>): void {
    void ref?.nativeElement.afMReset();
  }

  mapData(data: StatisticItem[]) {
    return (
      data?.map(el => ({
        category: el.key,
        value: el.doc_count,
      })) ?? []
    );
  }

  updateOpenCasesData(data: Statistics) {
    const orgData = this.mapData(data?.arenden?.['ansvarig_organisatorisk_enhet']);
    const typeData = this.mapData(data?.arenden?.['arendetyp']);
    this.totalOpen.set(data?.arenden?.totalt);

    this.chartsOrgOptionsOpen?.update({
      series: [
        {
          type: 'pie',
          angleKey: 'value',
          calloutLabelKey: 'category',
          sectorLabelKey: 'value',
          data: orgData,
        },
      ],
    });
    this.chartsTypOptionsOpen?.update({
      series: [
        {
          type: 'pie',
          angleKey: 'value',
          calloutLabelKey: 'category',
          sectorLabelKey: 'value',
          data: typeData,
        },
      ],
    });
  }
  updateClosedCasesData(data: Statistics) {
    const orgData = this.mapData(data?.stangda_arenden?.['ansvarig_organisatorisk_enhet']);
    const typeData = this.mapData(data?.stangda_arenden?.['arendetyp']);
    this.totalOpen.set(data?.stangda_arenden?.totalt);

    this.chartsOrgOptionsClosed?.update({
      series: [
        {
          type: 'bar',
          direction: 'horizontal',
          xKey: 'category',
          yKey: 'value',
          yName: 'Antal dokument',
          cornerRadius: 6,
          strokeWidth: 1,
          data: orgData,
        },
      ],
    });
    this.chartsTypOptionsClosed?.update({
      series: [
        {
          type: 'bar',
          direction: 'horizontal',
          xKey: 'category',
          yKey: 'value',
          yName: 'Antal dokument',
          cornerRadius: 6,
          strokeWidth: 1,
          data: typeData,
        },
      ],
    });
  }

  private createPieChart(container: HTMLElement, title: string, source: { key: string; doc_count: number }[]) {
    return this.agCharts.AgCharts.create({
      container,
      autoSize: true,
      locale: {
        localeText: {
          overlayNoData: 'Ingen data att visa upp',
        },
      },
      overlays: {
        loading: {
          text: 'Laddar...',
        },
        noData: {
          text: 'Ingen data att visa upp',
        },
        noVisibleSeries: {
          text: 'Inga synliga serier att visa',
        },
        unsupportedBrowser: {
          text: 'Webbläsaren stöds inte för diagram',
        },
      },
      title: {
        text: title,
      },
      data: source?.map(el => ({
        category: el.key,
        value: el.doc_count,
      })),
      series: [
        {
          type: 'pie',
          angleKey: 'value',
          calloutLabelKey: 'category',
          sectorLabelKey: 'value',
        },
      ],
    });
  }

  setOpenCasesData(data: Statistics) {
    const open = data?.arenden;

    this.totalOpen.set(open?.totalt);

    this.chartsOrgOptionsOpen = this.createPieChart(
      this.orgsOpen.nativeElement,
      'Ansvarig organisatorisk enhet',
      open?.['ansvarig_organisatorisk_enhet']
    );

    this.chartsTypOptionsOpen = this.createPieChart(this.typesOpen.nativeElement, 'Ärendetyp', open?.['arendetyp']);
  }

  private createHorizontalBarChart(
    container: HTMLElement,
    title: string,
    source: { key: string; doc_count: number }[],
    subtitleLabel: string,
    footnoteText?: string
  ) {
    return this.agCharts.AgCharts.create({
      container,
      title: { text: title },
      locale: {
        localeText: {
          overlayNoData: 'Ingen data att visa upp',
        },
      },
      overlays: {
        loading: {
          text: 'Laddar...',
        },
        noData: {
          text: 'Ingen data att visa upp',
        },
        noVisibleSeries: {
          text: 'Inga synliga serier att visa',
        },
        unsupportedBrowser: {
          text: 'Webbläsaren stöds inte för diagram',
        },
      },
      data: source?.map(el => ({
        category: el.key,
        value: el.doc_count,
      })),
      subtitle: {
        text: `${subtitleLabel}: ${source?.length ?? 0}`,
      },
      footnote: footnoteText ? { text: footnoteText, fontStyle: 'italic' } : undefined,
      series: [
        {
          type: 'bar',
          direction: 'horizontal',
          xKey: 'category',
          yKey: 'value',
          yName: 'Antal dokument',
          cornerRadius: 6,
          strokeWidth: 1,
        },
      ],
      axes: {
        y: {
          type: 'category',
          position: 'left',
        },
        x: {
          type: 'number',
          position: 'bottom',
          title: {
            enabled: true,
            text: 'Antal dokument',
          },
        },
      },
    });
  }

  setClosedCasesData(data: Statistics) {
    const closed = data?.['stangda_arenden'];

    this.totalClosed.set(closed?.totalt);

    this.chartsOrgOptionsClosed = this.createHorizontalBarChart(
      this.orgsClosed.nativeElement,
      'Ansvarig organisatorisk enhet',
      closed?.['ansvarig_organisatorisk_enhet'],
      'Total organisatorisk enhet'
    );

    this.chartsTypOptionsClosed = this.createHorizontalBarChart(
      this.typesClosed.nativeElement,
      'Ärendetyp',
      closed?.['arendetyp'],
      'Total organisatorisk enhet',
      '2026'
    );
  }
}
