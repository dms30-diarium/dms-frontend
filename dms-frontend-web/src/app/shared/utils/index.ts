export function getPathByDocType(type: string) {
  if (
    type === 'Arende' ||
    type === 'Handling' ||
    type === 'Utkast' ||
    type === 'Fil' ||
    type === 'File' ||
    type === 'MailMessage' ||
    type === 'Importorfil' ||
    type === 'Note' ||
    type === 'Klass' ||
    type === 'Klasstyp' ||
    type === 'Beslut' ||
    type === 'Beslutstyp' ||
    type === 'Checklista' ||
    type === 'Arendefas' ||
    type === 'Handlingstyp' ||
    type === 'Beredningsbeslut' ||
    type === 'Lagrum' ||
    type === 'Handlaggningsstatus' ||
    type === 'Utkastmall' ||
    type === 'EPostmall' ||
    type === 'TemplateSource' ||
    type === 'WebTemplateSource' ||
    type === 'Arkiv' ||
    type === 'Picture' ||
    type === 'Audio' ||
    type === 'Video'
  ) {
    return '/doc/';
  }
  return '/folder/';
}
