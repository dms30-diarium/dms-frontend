export const FAVORITE_ADDED_MESSAGE = 'Favorit är tillagd.';
export const FAVORITE_REMOVED_MESSAGE = 'Favorit är borttagen.';
export const FAVORITE_UPDATE_ERROR_MESSAGE = 'Det gick inte att uppdatera favoriter.';

export const COLLECTION_ADDED_MESSAGE = 'Tillagd i samling.';
export const COLLECTION_ADD_NEW_ERROR_MESSAGE = 'Det gick inte att lägga till i ny samling.';
export const COLLECTION_ADD_ERROR_MESSAGE = 'Det gick inte att lägga till i samling.';
export const COLLECTION_REMOVED_MESSAGE = 'Borttagen från samling.';
export const COLLECTION_REMOVE_ERROR_MESSAGE = 'Det gick inte att ta bort från samling.';
export const COLLECTION_TRASHED_MESSAGE = 'Samlingen har tagits bort.';
export const COLLECTION_TRASH_ERROR_MESSAGE = 'Det gick inte att ta bort samlingen.';

export const PERMISSION_ADDED_MESSAGE = 'Behörigheten har lagts till.';
export const PERMISSION_ADD_ERROR_MESSAGE = 'Det gick inte att lägga till behörighet.';
export const PERMISSION_UPDATED_MESSAGE = 'Behörigheten har uppdaterats.';
export const PERMISSION_UPDATE_ERROR_MESSAGE = 'Det gick inte att uppdatera behörighet.';
export const PERMISSION_REMOVED_MESSAGE = 'Behörigheten har tagits bort.';
export const PERMISSION_REMOVE_ERROR_MESSAGE = 'Det gick inte att ta bort behörighet.';
export const PERMISSION_MISSING_FIELDS_MESSAGE = 'Fyll i användare/grupp och behörighet.';
export const PERMISSION_NOTIFICATION_SENT_MESSAGE = 'Avisering har skickats.';
export const PERMISSION_NOTIFICATION_ERROR_MESSAGE = 'Det gick inte att skicka avisering.';

export const LOCK_LOCKED_MESSAGE = 'Ärendet har låsts.';
export const LOCK_UNLOCKED_MESSAGE = 'Ärendet har låsts upp.';
export const LOCK_GENERIC_ERROR_MESSAGE = 'Det gick inte att uppdatera låststatus.';
export const buildLockUnauthorizedMessage = (owner?: string | null) =>
  owner ? `Ärendet är låst av dess ägare ${owner} och kan inte låsas upp.` : 'Ärendet är låst och kan inte låsas upp.';

export const SUBSCRIPTION_ENABLED_MESSAGE = 'Notifiering är aktiverad.';
export const SUBSCRIPTION_DISABLED_MESSAGE = 'Notifiering är avaktiverad.';
export const SUBSCRIPTION_ERROR_MESSAGE = 'Det gick inte att uppdatera notifieringar.';
export const SUBSCRIPTION_SUBSCRIBED_MESSAGE = 'Du prenumererar nu på detta ärende.';
export const SUBSCRIPTION_UNSUBSCRIBED_MESSAGE = 'Prenumerationen har nu avslutats.';

export const CSV_EXPORT_LOADING_MESSAGE = 'CSV-export laddas. Välj var filen ska sparas när nedladdningen startar.';
export const CSV_EXPORT_EXTRACT_ID_ERROR_MESSAGE = 'Det gick inte att extrahera export-ID från svar.';
export const CSV_EXPORT_START_ERROR_MESSAGE = 'Det gick inte att starta CSV-export.';
export const CSV_EXPORT_TIMEOUT_ERROR_MESSAGE = 'CSV-export tog för lång tid. Gör ett nytt försök.';
export const CSV_EXPORT_FAILED_MESSAGE = 'CSV-export misslyckades.';
export const CSV_EXPORT_ABORTED_MESSAGE = 'CSV-export avbröts.';
export const CSV_EXPORT_DOWNLOAD_LINK_ERROR_MESSAGE = 'Det gick inte att hämta nedladdningslänken.';
export const CSV_EXPORT_RESULT_ERROR_MESSAGE = 'Det gick inte att hämta resultatet för CSV-export.';
export const CSV_EXPORT_NO_COLUMNS_MESSAGE = 'Inga valda kolumner kan exporteras till CSV.';
export const DOCUMENT_SEARCH_CSV_EXPORT_COMPLETED_NO_LINK_MESSAGE =
  'CSV-export klar men ingen nedladdningslänk hittades.';
export const DOCUMENT_SEARCH_CSV_EXPORT_ERROR_MESSAGE = 'Det gick inte att exportera CSV.';

export const DOCUMENT_PREVIEW_EMPTY_NOTE_MESSAGE = 'Noteringen / Anteckningen kan inte vara tom.';
export const DOCUMENT_PREVIEW_RESTORE_SUCCESS_MESSAGE = 'Versionen har återställts.';
export const DOCUMENT_PREVIEW_RESTORE_ERROR_MESSAGE = 'Det gick inte att återställa versionen.';

export const SELECTED_FILES_NO_FILES_TO_PRINT_MESSAGE = 'Det finns inga filer att skriva ut.';
export const SELECTED_FILES_PRINT_SELECTION_REQUIRED_MESSAGE = 'Välj minst en fil att skriva ut.';
export const SELECTED_FILES_SELECTED_NOT_FOUND_MESSAGE = 'Inga valda filer kunde hittas.';
export const SELECTED_FILES_NONE_PRINTABLE_MESSAGE = 'Det finns inga filer som kan skrivas ut.';
export const SELECTED_FILES_PARTIAL_PRINTABLE_MESSAGE = 'Vissa filer kunde inte skrivas ut (t.ex. video).';
export const SELECTED_FILES_DOWNLOAD_SELECTION_REQUIRED_MESSAGE = 'Välj minst en fil att ladda ner.';
export const SELECTED_FILES_MERGE_SELECTION_REQUIRED_MESSAGE = 'Välj minst en fil att sammanfoga.';
export const SELECTED_FILES_PREPARING_PDF_MESSAGE = 'Förbereder PDF...';
export const SELECTED_FILES_MERGE_ERROR_MESSAGE = 'Fel vid sammanfogning av PDF. Gör ett nytt försök.';

export const ORGANIZATION_CREATE_SUCCESS_MESSAGE = 'Organisationsdel skapades.';
export const ORGANIZATION_CREATE_ERROR_MESSAGE = 'Det gick inte att skapa organisationsdel.';
export const ORGANIZATION_LOAD_ERROR_MESSAGE = 'Det gick inte att ladda organisationsdelar.';

export const DELETED_FILES_RESTORE_SUCCESS_MESSAGE = 'Filerna är återställda';
export const DELETED_FILES_RESTORE_ERROR_MESSAGE = 'Det gick inte att återställa filerna';
export const DELETED_FILES_DELETE_SUCCESS_MESSAGE = 'Filerna har raderats';
export const DELETED_FILES_DELETE_ERROR_MESSAGE = 'Det gick inte att radera filerna';

export const ARENDEFAS_UPDATE_SUCCESS_MESSAGE = 'Ärendefas/process uppdaterades.';
export const ARENDEFAS_UPDATE_ERROR_MESSAGE = 'Det gick inte att uppdatera ärendefas/process.';
export const BEREDNINGSBESLUT_UPDATE_SUCCESS_MESSAGE = 'Beredningsbeslut uppdaterades.';
export const BEREDNINGSBESLUT_UPDATE_ERROR_MESSAGE = 'Det gick inte att uppdatera beredningsbeslut.';
export const BESLUTSTYP_UPDATE_SUCCESS_MESSAGE = 'Beslutstyp uppdaterades.';
export const BESLUTSTYP_UPDATE_ERROR_MESSAGE = 'Det gick inte att uppdatera beslutstyp.';
export const CHECKLISTA_LOAD_ERROR_MESSAGE = 'Det gick inte att ladda checklista.';
export const CHECKLISTA_UPDATE_SUCCESS_MESSAGE = 'Checklista uppdaterades.';
export const CHECKLISTA_UPDATE_ERROR_MESSAGE = 'Det gick inte att uppdatera checklista.';
export const HANDLAGGNINGSSTATUS_UPDATE_SUCCESS_MESSAGE = 'Handläggningsstatus uppdaterades.';
export const HANDLAGGNINGSSTATUS_UPDATE_ERROR_MESSAGE = 'Det gick inte att uppdatera handläggningsstatus.';
export const HANDLINGSTYP_LOAD_ERROR_MESSAGE = 'Det gick inte att ladda handlingstyp.';
export const HANDLINGSTYP_UPDATE_SUCCESS_MESSAGE = 'Handlingstyp uppdaterades.';
export const HANDLINGSTYP_UPDATE_ERROR_MESSAGE = 'Det gick inte att uppdatera handlingstyp.';
export const KLASS_LOAD_ERROR_MESSAGE = 'Det gick inte att ladda klass.';
export const KLASS_LOAD_OPTIONS_ERROR_MESSAGE = 'Det gick inte att ladda alternativ för klass.';
export const KLASS_UPDATE_SUCCESS_MESSAGE = 'Klass uppdaterades.';
export const KLASS_UPDATE_ERROR_MESSAGE = 'Det gick inte att uppdatera klass.';
export const KLASSTYP_UPDATE_SUCCESS_MESSAGE = 'Klasstyp uppdaterades.';
export const KLASSTYP_UPDATE_ERROR_MESSAGE = 'Det gick inte att uppdatera klasstyp.';
export const LAGRUM_UPDATE_SUCCESS_MESSAGE = 'Lagrum uppdaterades.';
export const LAGRUM_UPDATE_ERROR_MESSAGE = 'Det gick inte att uppdatera lagrum.';

export const CASE_REVIEW_CONFIRM_ERROR_MESSAGE = 'Det gick inte att bekräfta granskningen';
export const CASE_REVIEW_REJECTED_MESSAGE = 'Åtgärden avvisades';
export const CASE_MISSING_MYNDIGHET_MESSAGE = 'Det gick inte att hitta myndighet för ärendet.';
export const CASE_EXPORT_ALL_HANDLINGAR_STARTED_MESSAGE =
  'Export av alla handlingar med filer på ärendet har startats.';
export const CASE_EXPORT_START_ERROR_MESSAGE = 'Det gick inte starta export av handlingar med filer.';
export const CASE_FILE_DELETED_MESSAGE = 'Filen har raderats.';
export const CASE_FILE_DELETE_ERROR_MESSAGE = 'Det gick inte att ta bort filen.';
export const CASE_ASSIGN_SUCCESS_MESSAGE = 'Uppdraget lyckades.';
export const CASE_CLOSED_MESSAGE = 'Ärendet har avslutats.';
export const CASE_CLOSE_ERROR_MESSAGE = 'Det gick inte att avsluta ärendet.';
export const CASE_SELECT_ALL_HANDLINGAR_ERROR_MESSAGE = 'Det gick inte att markera alla handlingar.';
export const CASE_LOAD_ARENDETYPER_ERROR_MESSAGE = 'Det gick inte att ladda ärendetyper.';
export const CASE_CHANGES_SAVED_MESSAGE = 'Ändringarna sparades.';
export const CASE_CHANGES_SAVED_ALT_MESSAGE = 'Ändringarna är sparade';
export const CASE_UPDATE_ERROR_MESSAGE = 'Fel vid uppdatering.';
export const CASE_PRINT_NONE_PRINTABLE_MESSAGE = 'Det finns inga filer att skriva ut.';
export const CASE_PRINT_SOME_SKIPPED_MESSAGE = 'Vissa filer kunde inte skrivas ut.';
export const CASE_DIARY_TEMPLATES_NOT_FOUND_MESSAGE = 'Ingen mall hittades för dagboksblad.';
export const CASE_DIARY_TEMPLATES_FETCH_ERROR_MESSAGE = 'Fel vid hämtning av mall för dagboksblad';
export const CASE_DIARY_RENDER_ERROR_MESSAGE = 'Fel vid rendering av dagboksblad.';

export const HANDLING_REVIEW_CONFIRM_ERROR_MESSAGE = 'Det gick inte att bekräfta granskningen';
export const HANDLING_REVIEW_REJECTED_MESSAGE = 'Åtgärden avvisades';
export const HANDLING_PRINT_UNSUPPORTED_MESSAGE = 'Den valda filen för handlingen kan inte skrivas ut.';
export const HANDLING_PRINT_LOADING_MESSAGE = 'Laddar för utskrift...';

export const UTKAST_VERSIONS_LOAD_ERROR_MESSAGE = 'Det gick inte att ladda versioner.';
export const UTKAST_COMPLETE_REVIEW_FIRST_MESSAGE = 'Du bör först slutföra arbetsflödet "Granska".';
export const UTKAST_PRINT_UNSUPPORTED_MESSAGE = 'Den valda filen kan inte skrivas ut.';
export const UTKAST_PRINT_LOADING_MESSAGE = 'Laddar för utskrift...';
export const UTKAST_REVIEW_CONFIRM_ERROR_MESSAGE = 'Det gick inte att bekräfta granskningen.';
export const UTKAST_REVIEW_REJECTED_MESSAGE = 'Utkastet avvisades';
export const UTKAST_REVIEW_APPROVED_MESSAGE = 'Utkastet har granskats klart och är ok.';
export const UTKAST_HANDLING_CREATED_MESSAGE = 'Handling är skapad från utkast.';
export const UTKAST_HANDLING_CREATE_ERROR_MESSAGE = 'Det gick inte att skapa handling från utkast.';
export const UTKAST_UPDATE_ERROR_MESSAGE = 'Det gick inte att uppdatera utkastet.';

export const CASES_LIST_SAVING_CHANGES_MESSAGE = 'Sparar ändringar...';
export const CASES_LIST_CHANGES_SAVED_MESSAGE = 'Ändringarna sparades.';
export const CASES_LIST_SAVE_ERROR_MESSAGE = 'Det gick inte att spara ändringarna.';
export const DOCUMENT_SEARCH_SELECT_ALL_RESULTS_ERROR_MESSAGE = 'Det gick inte att markera alla sökresultat.';

export const AUDIT_LOAD_LOG_ERROR_MESSAGE = 'Det gick inte att ladda audit-loggen';
export const AUDIT_LOAD_USERS_ERROR_MESSAGE = 'Det gick inte att ladda användare';
export const AUDIT_LOAD_ACTIONS_ERROR_MESSAGE = 'Det gick inte att ladda åtgärdslistan';
export const AUDIT_LOAD_CATEGORIES_ERROR_MESSAGE = 'Det gick inte att ladda kategorier';

export const DOWNLOAD_ALL_FILES_PREPARING_MESSAGE = 'Förbereder filer för nedladdning...';
export const DOWNLOAD_ALL_FILES_ERROR_MESSAGE = 'Fel vid nedladdning av filer. Gör ett nytt försök.';

export const FOLDER_SAVE_SUCCESS_MESSAGE = 'Sparad';
export const FOLDER_SAVE_ERROR_MESSAGE = 'Det gick inte att spara mappen';
export const FOLDER_FETCH_EMAILS_ERROR_MESSAGE = 'Fel vid hämtning av e-post.';
export const FOLDER_IMPORT_FILE_CREATE_ERROR_MESSAGE = 'Fel vid skapande av filer till import mapp.';
export const FOLDER_IMPORTER_LAUNCH_ERROR_MESSAGE = 'Fel vid skapande av import mapp.';

export const WORKFLOW_EDIT_SUCCESS_MESSAGE = 'Redigerad framgångsrikt';
export const WORKFLOW_EDIT_ERROR_MESSAGE = 'Det gick inte att redigera.';

export const ASSIGN_USER_LOAD_ERROR_MESSAGE = 'Det gick inte att ladda ärendet.';
export const ASSIGN_USER_SUCCESS_MESSAGE = 'Uppdraget lyckades.';
export const ASSIGN_USER_ERROR_MESSAGE = 'Uppdraget misslyckades.';

export const EMAIL_FORM_RECIPIENT_REQUIRED_MESSAGE = 'Fyll i minst en mottagare.';
export const EMAIL_FORM_SENT_MESSAGE = 'E-post skickad.';
export const EMAIL_FORM_TEMPLATE_TEXT_LOAD_ERROR_MESSAGE =
  'Det gick inte att ladda texten för den valda mallen. Gör ett nytt försök.';
export const EMAIL_FORM_TEMPLATE_LOAD_ERROR_MESSAGE = 'Det gick inte att ladda mallen. Gör ett nytt försök.';

export const REQUEST_COMPLETION_RECIPIENT_REQUIRED_MESSAGE = 'Fyll i minst en mottagare.';
export const REQUEST_COMPLETION_SENT_MESSAGE = 'E-post skickad.';
export const REQUEST_COMPLETION_TEMPLATE_TEXT_LOAD_ERROR_MESSAGE =
  'Det gick inte att ladda texten för den valda mallen. Gör ett nytt försök.';
export const REQUEST_COMPLETION_TEMPLATE_LOAD_ERROR_MESSAGE = 'Det gick inte att ladda mallen. Gör ett nytt försök.';

export const DELIVER_PUBLIC_DOCS_RECIPIENT_REQUIRED_MESSAGE = 'Fyll i minst en mottagare.';
export const DELIVER_PUBLIC_DOCS_SENT_MESSAGE = 'E-post skickad.';
export const DELIVER_PUBLIC_DOCS_TEMPLATE_TEXT_LOAD_ERROR_MESSAGE =
  'Det gick inte att ladda texten för den valda mallen. Gör ett nytt försök.';
export const DELIVER_PUBLIC_DOCS_TEMPLATE_LOAD_ERROR_MESSAGE = 'Det gick inte ladda mallen. Gör ett nytt försök.';

export const EXPEDIT_HANDLING_RECIPIENT_REQUIRED_MESSAGE = 'Fyll i minst en mottagare.';
export const EXPEDIT_HANDLING_SENT_MESSAGE = 'E-post skickad.';

export const KLASSIFICERINGSSTRUKTUR_CREATE_SUCCESS_MESSAGE = 'Klassificeringsstruktur har nu skapats.';
export const KLASSIFICERINGSSTRUKTUR_CREATE_ERROR_MESSAGE = 'Fel vid skapandet av klassificeringsstruktur.';
export const REDUCED_CREATE_CASE_SUCCESS_MESSAGE = 'Ärendet har nu skapats.';
export const REDUCED_CREATE_CASE_ERROR_MESSAGE = 'Fel vid skapandet av ärende.';

export const SELECT_CASE_UPLOAD_NONE_SELECTED_MESSAGE = 'Inga filer är valda för uppladdning';
export const SELECT_CASE_UPLOAD_SUCCESS_MESSAGE = 'Fil(er) har laddats upp framgångsrikt';
export const SELECT_CASE_UPLOAD_ERROR_MESSAGE = 'Det gick inte att ladda upp fil(er)';
export const SELECT_CASE_MYNDIGHET_CREATE_SUCCESS_MESSAGE = 'Myndighet har skapats framgångsrikt';
export const SELECT_CASE_MYNDIGHET_CREATE_ERROR_MESSAGE = 'Fel vid skapande av myndighet';

export const CREATE_FOLDER_FORM_SUCCESS_MESSAGE = 'År har nu skapats.';
export const CREATE_FOLDER_FORM_ERROR_MESSAGE = 'Fel vid skapandet av år.';
export const CREATE_NOTE_SUCCESS_MESSAGE = 'Notering/Anteckningen har skapats.';
export const CREATE_NOTE_ERROR_MESSAGE = 'Fel vid skapandet av noteringen/anteckningen.';
export const CREATE_HANDLING_FROM_MAIL_REQUIRED_FIELDS_MESSAGE =
  'Fyll i alla obligatoriska fält innan du skapar handlingen.';
export const CREATE_HANDLING_FROM_MAIL_SUCCESS_MESSAGE = 'Handling har nu skapats.';
export const CREATE_HANDLINGTYPE_FORM_SUCCESS_MESSAGE = 'Handlingstyp har nu skapats.';
export const CREATE_HANDLINGTYPE_FORM_ERROR_MESSAGE = 'Fel vid skapandet av handlingstyp.';
export const CREATE_MAILFOLDER_SUCCESS_MESSAGE = 'Mapp för e-post har nu skapats.';
export const CREATE_MAILFOLDER_ERROR_MESSAGE = 'Fel vid skapandet av mapp för e-post.';
export const CREATE_BESLUT_SUCCESS_MESSAGE = 'Beslut har nu skapats.';
export const CREATE_BESLUT_ERROR_MESSAGE = 'Fel vid skapandet av beslut.';
export const CREATE_CHECKLIST_SUCCESS_MESSAGE = 'Checklista har nu skapats.';
export const CREATE_CHECKLIST_ERROR_MESSAGE = 'Fel vid skapande av checklista.';
export const CREATE_KLASSIFIC_SUCCESS_MESSAGE = 'Klass har nu skapats.';
export const CREATE_KLASSIFIC_ERROR_MESSAGE = 'Fel vid skapandet av klass.';

export const SIDEBAR_SEARCH_SHARED_MESSAGE = 'Sökningen har delats.';
export const SIDEBAR_SEARCH_SHARE_ERROR_MESSAGE = 'Det gick inte att dela sökningen.';
export const UTKAST_REVIEW_SENT_FOR_REVIEW_MESSAGE = 'Utkast skickat för granskning.';
export const UTKAST_REVIEW_SENT_FOR_APPROVAL_MESSAGE = 'Utkast skickat för godkännande.';
export const UTKAST_REVIEW_ERROR_MESSAGE = 'Error';

export const buildPrintLoadingMessage = (fileTitle: string) => `Laddar ${fileTitle} för utskrift...`;
export const buildOrganizationUpdatedMessage = (title: string) => `${title} uppdaterades.`;
export const buildOrganizationUpdateErrorMessage = (title: string) => `Det gick inte att uppdatera ${title}.`;
export const buildLoadOptionsErrorMessage = (key: string) => `Det gick inte att ladda val for ${key}.`;
export const buildInvalidEmailMessage = (invalidEmails: string[]) =>
  `Ogiltig e-postadress: ${invalidEmails.join(', ')}`;
export const buildRequiredFieldsMessage = (missingFields: string[]) =>
  missingFields.length ? `Fyll i obligatoriska fält: ${missingFields.join(', ')}.` : 'Fyll i obligatoriska fält.';
export const buildGenericCreatedMessage = (name: string) => `${name} har nu skapats.`;
export const buildGenericCreateErrorMessage = (name: string) => `Fel vid skapandet av ${name}.`;
export const buildSelectCaseCreateSuccessMessage = (docType: string) => `${docType} skapad framgångsrikt`;
export const buildSelectCaseCreateErrorMessage = (docType: string) => `Fel vid skapande av ${docType}`;

export const EXTERNAL_SHARE_MISSING_FIELDS_MESSAGE = 'Fyll i minst e-postadress och slutdatum.';
export const EXTERNAL_SHARE_SUCCESS_MESSAGE = 'Åtkomst har delats med extern användare.';
export const EXTERNAL_SHARE_ERROR_PREFIX = 'Det gick inte att dela med extern användare';

export const SERVICE_NOTE_SAVED_MESSAGE = 'Tjänsteanteckning har sparats.';
export const SERVICE_NOTE_SAVE_ERROR_MESSAGE = 'Det gick inte att spara tjänsteanteckning.';
export const SERVICE_NOTE_LOAD_ERROR_MESSAGE = 'Det gick inte att läsa tjänsteanteckning.';

export const VOCABULARY_ENTRIES_LOAD_ERROR_MESSAGE = 'Det gick inte att läsa vokabulärposter.';
export const VOCABULARY_ENTRY_CREATE_SUCCESS_MESSAGE = 'Post skapad.';
export const VOCABULARY_ENTRY_CREATE_ERROR_MESSAGE = 'Det gick inte att skapa post.';
export const VOCABULARY_ENTRY_UPDATE_SUCCESS_MESSAGE = 'Post uppdaterad.';
export const VOCABULARY_ENTRY_UPDATE_ERROR_MESSAGE = 'Det gick inte att uppdatera post.';
export const VOCABULARY_ENTRY_DELETE_SUCCESS_MESSAGE = 'Post borttagen.';
export const VOCABULARY_ENTRY_DELETE_ERROR_MESSAGE = 'Det gick inte att ta bort post.';

export const USER_GROUP_CREATE_SUCCESS_MESSAGE = 'Grupp skapad.';
export const USER_GROUP_CREATE_ERROR_MESSAGE = 'Det gick inte att skapa grupp.';
export const USER_CREATE_SUCCESS_MESSAGE = 'Användare skapad.';
export const USER_CREATE_ERROR_MESSAGE = 'Det gick inte att skapa användare.';
export const USER_GROUP_DELETE_SUCCESS_MESSAGE = 'Grupp borttagen.';
export const USER_GROUP_DELETE_ERROR_MESSAGE = 'Det gick inte att ta bort grupp.';
export const USER_DELETE_SUCCESS_MESSAGE = 'Användare borttagen.';
export const USER_DELETE_ERROR_MESSAGE = 'Det gick inte att ta bort användare.';
export const USER_GROUP_ADD_MEMBERS_SUCCESS_MESSAGE = 'Medlemmar tillagda.';
export const USER_GROUP_ADD_MEMBERS_ERROR_MESSAGE = 'Kunde inte lägga till medlemmar.';
export const USER_GROUP_REMOVE_MEMBER_SUCCESS_MESSAGE = 'Medlem borttagen.';
export const USER_GROUP_REMOVE_MEMBER_ERROR_MESSAGE = 'Kunde inte ta bort medlem.';
export const USER_GROUP_UPDATE_SUCCESS_MESSAGE = 'Grupp uppdaterad.';
export const USER_GROUP_UPDATE_ERROR_MESSAGE = 'Kunde inte uppdatera grupp.';
export const USER_UPDATE_SUCCESS_MESSAGE = 'Användare uppdaterad.';
export const USER_UPDATE_ERROR_MESSAGE = 'Kunde inte uppdatera användare.';
export const USER_PASSWORD_UPDATE_SUCCESS_MESSAGE = 'Lösenord uppdaterat.';
export const USER_PASSWORD_UPDATE_ERROR_MESSAGE = 'Kunde inte uppdatera lösenord.';

export const TAG_ALREADY_EXISTS_MESSAGE = 'Taggen finns redan.';
export const TAG_ADDED_MESSAGE = 'Taggen har lagts till.';
export const TAG_ADD_ERROR_MESSAGE = 'Det gick inte att lägga till taggen.';
export const TAG_REMOVED_MESSAGE = 'Taggen har tagits bort.';
export const TAG_REMOVE_ERROR_MESSAGE = 'Det gick inte att ta bort taggen.';

export const FILE_CREATE_SUCCESS_MESSAGE = 'Filen har skapats.';
export const FILE_CREATE_ERROR_MESSAGE = 'Fel vid skapandet av filen.';
export const FILE_UPLOAD_REQUIRED_MESSAGE = 'Du måste välja en fil att ladda upp.';
export const FILE_UPLOAD_ERROR_MESSAGE = 'Det gick inte att ladda upp filen.';

export const PICTURE_CREATE_SUCCESS_MESSAGE = 'Bilden har skapats.';
export const PICTURE_CREATE_ERROR_MESSAGE = 'Fel vid skapandet av bilden.';
export const PICTURE_UPLOAD_REQUIRED_MESSAGE = 'Du måste välja en bild att ladda upp.';
export const PICTURE_UPLOAD_ERROR_MESSAGE = 'Det gick inte att ladda upp bilden.';

export const AUDIO_CREATE_SUCCESS_MESSAGE = 'Ljudfilen har skapats.';
export const AUDIO_CREATE_ERROR_MESSAGE = 'Fel vid skapandet av ljudfilen.';
export const AUDIO_UPLOAD_REQUIRED_MESSAGE = 'Du måste välja en ljudfil att ladda upp.';
export const AUDIO_UPLOAD_ERROR_MESSAGE = 'Det gick inte att ladda upp ljudfilen.';

export const VIDEO_CREATE_SUCCESS_MESSAGE = 'Videon har skapats.';
export const VIDEO_CREATE_ERROR_MESSAGE = 'Fel vid skapandet av videon.';
export const VIDEO_UPLOAD_REQUIRED_MESSAGE = 'Du måste välja en video att ladda upp.';
export const VIDEO_UPLOAD_ERROR_MESSAGE = 'Det gick inte att ladda upp videon.';
export const FOLDER_CREATE_SUCCESS_MESSAGE = 'Mappen har skapats.';
export const FOLDER_CREATE_ERROR_MESSAGE = 'Fel vid skapandet av mappen.';
export const WORKSPACE_CREATE_SUCCESS_MESSAGE = 'Arbetsytan har skapats.';
export const WORKSPACE_CREATE_ERROR_MESSAGE = 'Fel vid skapandet av arbetsytan.';

export const COLLECTION_CREATE_SUCCESS_MESSAGE = 'Samlingen har skapats.';
export const COLLECTION_CREATE_ERROR_MESSAGE = 'Det gick inte att skapa samling.';

export const ATTACHMENTS_UPLOAD_ERROR_MESSAGE = 'Det gick inte att ladda upp bilagor.';
export const ATTACHMENTS_LOAD_ERROR_MESSAGE = 'Det gick inte att läsa bilagor.';
export const ATTACHMENT_DELETE_ERROR_MESSAGE = 'Det gick inte att ta bort bilagan.';
export const ATTACHMENT_REPLACE_ERROR_MESSAGE = 'Det gick inte att ersätta bilagan.';

export const DOCUMENT_UPDATE_SUCCESS_MESSAGE = 'Dokumentet har uppdaterats.';
export const DOCUMENT_UPDATE_ERROR_MESSAGE = 'Det gick inte att uppdatera dokumentet.';
export const PERSONAL_SPACE_DOWNLOAD_SELECTION_REQUIRED_MESSAGE = 'Välj minst ett objekt för att ladda ner.';
export const PERSONAL_SPACE_DOWNLOAD_ERROR_MESSAGE = 'Det gick inte att ladda ner filerna.';
export const PERSONAL_SPACE_COLLECTION_SELECTION_REQUIRED_MESSAGE =
  'Välj minst ett objekt för att lägga till i samling.';
export const PERSONAL_SPACE_COPY_SELECTION_REQUIRED_MESSAGE = 'Välj minst ett objekt för att kopiera.';
export const PERSONAL_SPACE_CLIPBOARD_UNSUPPORTED_MESSAGE = 'Clipboard stöds inte av din webbläsare.';
export const PERSONAL_SPACE_CLIPBOARD_COPY_SUCCESS_MESSAGE = 'Markering kopierad till urklipp.';
export const PERSONAL_SPACE_CLIPBOARD_COPY_ERROR_MESSAGE = 'Det gick inte att kopiera till urklipp.';
export const PERSONAL_SPACE_DELETE_SELECTION_REQUIRED_MESSAGE = 'Välj minst ett objekt för att ta bort.';
export const PERSONAL_SPACE_DELETE_ERROR_MESSAGE = 'Det gick inte att ta bort markerade objekt.';
export const PERSONAL_SPACE_DELETE_SUCCESS_MESSAGE = 'Markerade objekt har tagits bort.';

export const STATISTICS_LOAD_ERROR_MESSAGE = 'Det gick inte att ladda statistik.';
export const WEEKLY_TASKS_LOAD_ERROR_MESSAGE = 'Det gick inte att ladda veckans uppgifter.';
