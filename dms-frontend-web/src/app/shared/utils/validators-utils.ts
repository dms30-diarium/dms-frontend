import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const MINIMUM_WORDS_VALIDATION_TEXT = 'Skriv minst 2 ord. Första ordet ska börja med stor bokstav.';

export function noWhitespaceValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value);
    const isWhitespace = value.length > 0 && value.trim().length === 0;
    return isWhitespace ? { whitespace: true } : null;
  };
}

export function noSymbolsOnlyValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value.trim();
    if (value.length === 0) return null;

    return /[\p{L}]/u.test(value) ? null : { symbolsOnly: true };
  };
}

export function minimumWordsValidator(minWords: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value.trim();
    if (value.length === 0) return null;

    return getWordsWithLetters(value).length >= minWords ? null : { minimumWords: true };
  };
}

function getWordsWithLetters(value: string): string[] {
  return value
    .split(/\s+/)
    .map((word: string) => word.replace(/[^\p{L}]/gu, ''))
    .filter((word: string) => word.length > 0);
}

export function firstWordUppercaseValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value.trim();
    if (value.length === 0) return null;

    const words = getWordsWithLetters(value);
    if (words.length < 1) return null;

    const firstWord = words[0];
    const firstLetter = firstWord.slice(0, 1);
    const isValid = firstLetter === firstLetter.toUpperCase();

    return isValid ? null : { firstWordUppercase: true };
  };
}

export function arendemeningValidators(): ValidatorFn[] {
  return [noWhitespaceValidator(), minimumWordsValidator(2), firstWordUppercaseValidator()];
}
