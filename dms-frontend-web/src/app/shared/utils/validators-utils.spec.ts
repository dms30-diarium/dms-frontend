import { AbstractControl } from '@angular/forms';
import {
  noWhitespaceValidator,
  noSymbolsOnlyValidator,
  minimumWordsValidator,
  firstWordUppercaseValidator,
  arendemeningValidators,
} from './validators-utils';

function fakeControl(value: string): AbstractControl {
  return { value } as AbstractControl;
}

describe('noWhitespaceValidator', () => {
  const validator = noWhitespaceValidator();

  it('returns null for valid text', () => {
    expect(validator(fakeControl('hello'))).toBeNull();
  });

  it('returns error for whitespace-only string', () => {
    expect(validator(fakeControl('   '))).toEqual({ whitespace: true });
  });

  it('returns null for empty string', () => {
    expect(validator(fakeControl(''))).toBeNull();
  });
});

describe('noSymbolsOnlyValidator', () => {
  const validator = noSymbolsOnlyValidator();

  it('returns null for text with letters', () => {
    expect(validator(fakeControl('hello!'))).toBeNull();
  });

  it('returns error for symbols-only string', () => {
    expect(validator(fakeControl('!@#$'))).toEqual({ symbolsOnly: true });
  });

  it('returns null for empty string', () => {
    expect(validator(fakeControl(''))).toBeNull();
  });
});

describe('minimumWordsValidator', () => {
  const validator = minimumWordsValidator(2);

  it('returns null for empty string', () => {
    expect(validator(fakeControl(''))).toBeNull();
  });

  it('returns error for single word', () => {
    expect(validator(fakeControl('hello'))).toEqual({ minimumWords: true });
  });

  it('returns null for two or more words', () => {
    expect(validator(fakeControl('hello world'))).toBeNull();
  });
});

describe('firstWordUppercaseValidator', () => {
  const validator = firstWordUppercaseValidator();

  it('returns null for empty string', () => {
    expect(validator(fakeControl(''))).toBeNull();
  });

  it('returns null when first word starts with uppercase', () => {
    expect(validator(fakeControl('Hello world'))).toBeNull();
  });

  it('returns error when first word starts with lowercase', () => {
    expect(validator(fakeControl('hello world'))).toEqual({ firstWordUppercase: true });
  });
});

describe('arendemeningValidators', () => {
  it('returns an array of validators', () => {
    expect(arendemeningValidators().length).toBe(3);
  });
});
