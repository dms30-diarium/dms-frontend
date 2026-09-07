export const NUXEO_VOCAB_IDS = {
  sekretess: {
    ingenSekretess: 'ingenSekretess',
    svagSekretess: 'svagSekretess',
    starkSekretess: 'starkSekretess',
    ejKlassad: 'ejKlassad',
  },
  sakerhetsskyddsklassificering: {
    ejKlassat: 'ejKlassat',
    ejKlassad: 'ejKlassad',
    kvalificeratHemligt: 'kvalificeratHemligt',
  },
  arendesteg: {
    makulerat: 'to_makulerat',
  },
  handlingssteg: {
    makulerad: 'to_makulerad',
  },
  arendestatus: {
    oppet: 'oppet',
    registrerat: 'registrerat',
    underFordelning: 'underFordelning',
    underHandlaggning: 'underHandlaggning',
    beslutat: 'beslutat',
    expedierat: 'expedierat',
    avslutat: 'avslutat',
    avslutatAvHandlaggare: 'avslutatAvHandlaggare',
    stangt: 'stangt',
    gallrat: 'gallrat',
    avstallt: 'avstallt',
    arkiverat: 'arkiverat',
    makulerat: 'makulerat',
    makulerad: 'makulerad',
  },
  handlingLifecycle: {
    utkast: 'utkast',
    diarieford: 'diarieford',
    gallrad: 'gallrad',
    avstalld: 'avstalld',
    arkiverad: 'arkiverad',
    makulerad: 'makulerad',
  },
  handlaggningsstatus: {
    invantarKomplettering: 'invantarKomplettering',
    handlaggningEjPaborjad: 'handlaggningEjPaborjad',
    handlaggningPagar: 'handläggningPagar',
    handlaggningAvslutad: 'handlaggningAvslutad',
  },
  motpartTyp: {
    foretagMyndighet: 'foretagMyndighet',
    privatPerson: 'privatPerson',
  },
  arendeRiktning: {
    inkommande: 'inkommande',
    utgaende: 'utgaende',
    intern: 'intern',
  },
  arbetsflode: {
    skickaForGranskning: 'SkickaForGranskning',
    allmanArbetsflode: 'AllmantArbetsflode',
  },
  arbetsflodeAtgard: {
    avvisa: 'avvisa',
    upprata: 'upprata',
  },
  filTyp: {
    huvudfil: 'huvudfil',
    bilaga: 'bilaga',
  },
} as const;
