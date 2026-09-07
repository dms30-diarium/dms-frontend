import { FormTypes } from '@app/pages/document-search/document-search-types';
import { toISODateOnlyString } from '@app/shared/utils/date-utils';

const isQueryParamScalar = (value: unknown): value is string | number | boolean =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';

function toIsoDateString(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : toISODateOnlyString(value);
  }
  if (typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : toISODateOnlyString(parsed);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? undefined : toISODateOnlyString(parsed);
  }
  if (typeof value === 'object') {
    const casted = value as { toISOString?: () => string };
    if (typeof casted.toISOString === 'function') {
      try {
        return toISODateOnlyString(casted.toISOString());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

const toRawString = (input: unknown): string | undefined => (typeof input === 'string' ? input : undefined);

function toRawScalar(input: unknown): string | number | boolean | undefined {
  if (input == null) return undefined;
  if (Array.isArray(input)) {
    const [first] = input;
    return toRawScalar(first);
  }
  if (isQueryParamScalar(input)) return input;
  return toIsoDateString(input);
}

const toRawArray = (input: unknown): readonly (string | number | boolean)[] | undefined => {
  if (input == null) return [];
  if (!Array.isArray(input)) return undefined;
  return input.every(isQueryParamScalar) ? input : undefined;
};

const shouldIncludeAgg = (value: readonly (string | number | boolean)[] | undefined): boolean => Array.isArray(value);

type QueryParamValue = string | number | boolean | readonly (string | number | boolean)[];

export type AdvancedSearchQueryParams = Record<string, QueryParamValue>;

export const buildAdvancedSearchQueryParams = (
  form?: FormTypes,
  page?: number,
  sortBy?: string,
  sortOrder?: 'asc' | 'desc'
): AdvancedSearchQueryParams => {
  const docOptions = Array.isArray(form?.docOptions)
    ? form?.docOptions
    : typeof form?.docOptions === 'string'
      ? [form.docOptions]
      : [];
  const allowArendeFilters = docOptions.length === 0 || docOptions.includes('Arende');
  const includeArendeAggs = allowArendeFilters;
  const includeHandlingAggs =
    docOptions.length === 0 || docOptions.includes('Handling') || docOptions.includes('Utkast');
  const isUtkastOnly = docOptions.length === 1 && docOptions[0] === 'Utkast';
  const searchLineValue = toRawString(form?.searchLine);
  const motpartValue = toRawString(form?.motpart);
  const skapaOptions = toRawArray(form?.skapaOptions);
  const arendeStatus = toRawArray(form?.arendeStatus);
  const arendeTyp = toRawArray(form?.arendeTyp);
  const arendeHandlaggningsstatus = toRawArray(form?.arende_handlaggningsstatus);
  const arendeRiktning = toRawArray(form?.arende_riktning);
  const arendeSakerhet = toRawArray(form?.arende_sakerhetsskyddsklassificering);
  const arendeSekretess = toRawArray(form?.arende_sekretess);
  const arendePersonuppgifter = toRawArray(form?.arende_innehaller_personuppgifter_gdpr);
  const handlingsStatus = toRawArray(form?.handlingsStatus);
  const handlingsTyp = toRawArray(form?.handlingsTyp);
  const handlingRiktning = toRawArray(form?.handling_handlingsriktning);
  const handlingInkanalVia = toRawArray(form?.handling_inkanal_via);
  const handlingSignerad = toRawArray(form?.handling_signerad);
  const handlingSakerhet = toRawArray(form?.handling_sakerhetsskyddsklassificering);
  const handlingSekretess = toRawArray(form?.handling_sekretess);
  const handlingBevarasGallras = toRawArray(form?.handling_bevaras_gallras);
  const handlingForvaringsmedia = toRawArray(form?.handling_forvaringsmedia);
  const arendeNumberValue = toRawString(form?.arende_arendenummer);
  const arendeMeningValue = toRawString(form?.arende_arendemening);
  const arendeExternRefs = toRawArray(form?.arende_extern_referens_referens);
  const arendeAnsvarigEnhet = toRawArray(form?.arende_ansvarig_organisatorisk_enhet);
  const arendeAnsvarigHandlaggare = toRawArray(form?.arende_ansvarig_handlaggare);
  const arendeRegistreratMin = toRawScalar(form?.arende_arendet_registrerat_datum_min);
  const arendeRegistreratMax = toRawScalar(form?.arende_arendet_registrerat_datum_max);
  const arendeBeslutatMin = toRawScalar(form?.arende_beslutat_datum_min);
  const arendeBeslutatMax = toRawScalar(form?.arende_beslutat_datum_max);
  const arendeAvslutatMin = toRawScalar(form?.arende_arendet_avslutat_datum_min);
  const arendeAvslutatMax = toRawScalar(form?.arende_arendet_avslutat_datum_max);
  const arendeArkiveratMin = toRawScalar(form?.arende_arendet_arkiverat_datum_min);
  const arendeArkiveratMax = toRawScalar(form?.arende_arendet_arkiverat_datum_max);
  const arendeGallratMin = toRawScalar(form?.arende_arendet_gallrat_datum_min);
  const arendeGallratMax = toRawScalar(form?.arende_arendet_gallrat_datum_max);
  const arendeMakuleratMin = toRawScalar(form?.arende_arendet_makulerat_datum_min);
  const arendeMakuleratMax = toRawScalar(form?.arende_arendet_makulerat_datum_max);
  const arendeBeslutstyp = toRawArray(form?.arende_beslutstyp);
  const arendeLagrumsbeskrivning = toRawArray(form?.arende_lagrumsbeskrivning);
  const handlingNumberValue = toRawString(form?.handling_handlingsnummer);
  const handlingNameValue = toRawString(form?.handling_handlingsnamn);
  const handlingAvsandareValue = toRawString(form?.handling_avsandare_namn);
  const handlingMottagareValue = toRawString(form?.handling_mottagare_namn);
  const handlingExternRefs = toRawArray(form?.handling_extern_referens_referens);
  const handlingInkommenMin = toRawScalar(form?.handling_inkommen_datum_min);
  const handlingInkommenMax = toRawScalar(form?.handling_inkommen_datum_max);
  const handlingUpprattadMin = toRawScalar(form?.handling_upprattad_datum_min);
  const handlingUpprattadMax = toRawScalar(form?.handling_upprattad_datum_max);
  const handlingBeslutatMin = toRawScalar(form?.handling_beslutat_datum_min);
  const handlingBeslutatMax = toRawScalar(form?.handling_beslutat_datum_max);
  const handlingExpedieradMin = toRawScalar(form?.handling_expedierad_datum_min);
  const handlingExpedieradMax = toRawScalar(form?.handling_expedierad_datum_max);
  const handlingForvaringsplatsValue = toRawString(form?.handling_fysisk_forvaringsplats);
  const handlingLagrumsbeskrivning = toRawArray(form?.handling_lagrumsbeskrivning);

  return {
    offset: 0,
    currentPageIndex: page ?? 0,
    pageSize: 25,
    additionalClause: '',
    ...(sortBy && { sortBy }),
    ...(sortBy && sortOrder && { sortOrder: sortOrder.toUpperCase() }),
    ...(docOptions.length && { system_primaryType_agg: JSON.stringify(docOptions) }),
    ...(includeArendeAggs &&
      shouldIncludeAgg(arendeStatus) && {
        arende_arendestatus_agg: JSON.stringify(arendeStatus),
      }),
    ...(includeArendeAggs &&
      shouldIncludeAgg(arendeTyp) && {
        arende_arendetyp_agg: JSON.stringify(arendeTyp),
      }),
    ...(includeArendeAggs &&
      shouldIncludeAgg(arendeHandlaggningsstatus) && {
        arende_handlaggningsstatus_agg: JSON.stringify(arendeHandlaggningsstatus),
      }),
    ...(includeArendeAggs &&
      shouldIncludeAgg(arendeRiktning) && {
        arende_riktning_agg: JSON.stringify(arendeRiktning),
      }),
    ...(includeArendeAggs &&
      shouldIncludeAgg(arendeSakerhet) && {
        arende_sakerhetsskyddsklassificering_agg: JSON.stringify(arendeSakerhet),
      }),
    ...(includeArendeAggs &&
      shouldIncludeAgg(arendeSekretess) && {
        arende_sekretess_agg: JSON.stringify(arendeSekretess),
      }),
    ...(includeArendeAggs &&
      shouldIncludeAgg(arendePersonuppgifter) && {
        arende_innehaller_personuppgifter_gdpr_agg: JSON.stringify(arendePersonuppgifter),
      }),
    ...(shouldIncludeAgg(skapaOptions) && { dublincore_created_agg: JSON.stringify(skapaOptions) }),
    ...(includeHandlingAggs &&
      !isUtkastOnly &&
      shouldIncludeAgg(handlingsStatus) && {
        handling_handlingsstatus_agg: JSON.stringify(handlingsStatus),
      }),
    ...(isUtkastOnly &&
      shouldIncludeAgg(handlingsStatus) && {
        ecm_currentLifeCycleState_agg: JSON.stringify(handlingsStatus),
      }),
    ...(includeHandlingAggs &&
      shouldIncludeAgg(handlingsTyp) && {
        handling_handlingstyp_agg: JSON.stringify(handlingsTyp),
      }),
    ...(includeHandlingAggs &&
      shouldIncludeAgg(handlingRiktning) && {
        handling_handlingsriktning_agg: JSON.stringify(handlingRiktning),
      }),
    ...(includeHandlingAggs &&
      shouldIncludeAgg(handlingInkanalVia) && {
        handling_inkanal_via_agg: JSON.stringify(handlingInkanalVia),
      }),
    ...(includeHandlingAggs &&
      shouldIncludeAgg(handlingSignerad) && {
        handling_signerad_agg: JSON.stringify(handlingSignerad),
      }),
    ...(includeHandlingAggs &&
      shouldIncludeAgg(handlingSakerhet) && {
        handling_sakerhetsskyddsklassificering_agg: JSON.stringify(handlingSakerhet),
      }),
    ...(includeHandlingAggs &&
      shouldIncludeAgg(handlingSekretess) && {
        handling_sekretess_agg: JSON.stringify(handlingSekretess),
      }),
    ...(includeHandlingAggs &&
      shouldIncludeAgg(handlingBevarasGallras) && {
        handling_bevaras_gallras_agg: JSON.stringify(handlingBevarasGallras),
      }),
    ...(includeHandlingAggs &&
      shouldIncludeAgg(handlingForvaringsmedia) && {
        handling_forvaringsmedia_agg: JSON.stringify(handlingForvaringsmedia),
      }),
    ...(searchLineValue && { system_fulltext: JSON.stringify(searchLineValue) }),
    ...(motpartValue && { arende_motpart_motpart: motpartValue }),
    ...(arendeNumberValue && { arende_arendenummer: arendeNumberValue }),
    ...(arendeMeningValue && { arende_arendemening: arendeMeningValue }),
    ...(arendeExternRefs &&
      arendeExternRefs.length && {
        arende_extern_referens_referens: JSON.stringify(arendeExternRefs),
      }),
    ...(arendeAnsvarigEnhet &&
      arendeAnsvarigEnhet.length && {
        arende_ansvarig_organisatorisk_enhet: JSON.stringify(arendeAnsvarigEnhet),
      }),
    ...(arendeAnsvarigHandlaggare &&
      arendeAnsvarigHandlaggare.length && {
        arende_ansvarig_handlaggare: JSON.stringify(arendeAnsvarigHandlaggare),
      }),
    ...(arendeRegistreratMin && { arende_arendet_registrerat_datum_min: arendeRegistreratMin }),
    ...(arendeRegistreratMax && { arende_arendet_registrerat_datum_max: arendeRegistreratMax }),
    ...(arendeBeslutatMin && { arende_beslutat_datum_min: arendeBeslutatMin }),
    ...(arendeBeslutatMax && { arende_beslutat_datum_max: arendeBeslutatMax }),
    ...(arendeAvslutatMin && { arende_arendet_avslutat_datum_min: arendeAvslutatMin }),
    ...(arendeAvslutatMax && { arende_arendet_avslutat_datum_max: arendeAvslutatMax }),
    ...(arendeArkiveratMin && { arende_arendet_arkiverat_datum_min: arendeArkiveratMin }),
    ...(arendeArkiveratMax && { arende_arendet_arkiverat_datum_max: arendeArkiveratMax }),
    ...(arendeGallratMin && { arende_arendet_gallrat_datum_min: arendeGallratMin }),
    ...(arendeGallratMax && { arende_arendet_gallrat_datum_max: arendeGallratMax }),
    ...(arendeMakuleratMin && { arende_arendet_makulerat_datum_min: arendeMakuleratMin }),
    ...(arendeMakuleratMax && { arende_arendet_makulerat_datum_max: arendeMakuleratMax }),
    ...(arendeBeslutstyp &&
      arendeBeslutstyp.length && {
        arende_beslutstyp: JSON.stringify(arendeBeslutstyp),
      }),
    ...(arendeLagrumsbeskrivning &&
      arendeLagrumsbeskrivning.length && {
        arende_lagrumsbeskrivning: JSON.stringify(arendeLagrumsbeskrivning),
      }),
    ...(handlingNumberValue && { handling_handlingsnummer: handlingNumberValue }),
    ...(handlingNameValue && { handling_handlingsnamn: handlingNameValue }),
    ...(handlingAvsandareValue && { handling_avsandare_namn: handlingAvsandareValue }),
    ...(handlingMottagareValue && { handling_mottagare_namn: handlingMottagareValue }),
    ...(handlingExternRefs &&
      handlingExternRefs.length && {
        handling_extern_referens_referens: JSON.stringify(handlingExternRefs),
      }),
    ...(handlingInkommenMin && { handling_inkommen_datum_min: handlingInkommenMin }),
    ...(handlingInkommenMax && { handling_inkommen_datum_max: handlingInkommenMax }),
    ...(handlingUpprattadMin && { handling_upprattad_datum_min: handlingUpprattadMin }),
    ...(handlingUpprattadMax && { handling_upprattad_datum_max: handlingUpprattadMax }),
    ...(handlingBeslutatMin && { handling_beslutat_datum_min: handlingBeslutatMin }),
    ...(handlingBeslutatMax && { handling_beslutat_datum_max: handlingBeslutatMax }),
    ...(handlingExpedieradMin && { handling_expedierad_datum_min: handlingExpedieradMin }),
    ...(handlingExpedieradMax && { handling_expedierad_datum_max: handlingExpedieradMax }),
    ...(handlingForvaringsplatsValue && { handling_fysisk_forvaringsplats: handlingForvaringsplatsValue }),
    ...(handlingLagrumsbeskrivning &&
      handlingLagrumsbeskrivning.length && {
        handling_lagrumsbeskrivning: JSON.stringify(handlingLagrumsbeskrivning),
      }),
  };
};
