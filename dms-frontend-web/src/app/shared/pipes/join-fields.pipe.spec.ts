import { JoinFieldsPipe } from './join-fields.pipe';

describe('JoinFieldsPipe', () => {
  let pipe: JoinFieldsPipe;

  beforeEach(() => {
    pipe = new JoinFieldsPipe();
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('returns an empty string when value is not an array', () => {
    expect(pipe.transform('not-an-array', ['name'])).toBe('');
    expect(pipe.transform(undefined, ['name'])).toBe('');
    expect(pipe.transform(null, ['name'])).toBe('');
  });

  it('returns an empty string when no fields are provided', () => {
    expect(pipe.transform([{ name: 'Alice' }], [])).toBe('');
    expect(pipe.transform([{ name: 'Alice' }])).toBe('');
  });

  it('joins the requested fields per item with the item separator', () => {
    const value = [{ first: 'Alice', last: 'Smith' }];
    expect(pipe.transform(value, ['first', 'last'])).toBe('Alice, Smith');
  });

  it('joins multiple items with the list separator', () => {
    const value = [
      { first: 'Alice', last: 'Smith' },
      { first: 'Bob', last: 'Jones' },
    ];
    expect(pipe.transform(value, ['first', 'last'])).toBe('Alice, Smith | Bob, Jones');
  });

  it('supports custom item and list separators', () => {
    const value = [
      { first: 'Alice', last: 'Smith' },
      { first: 'Bob', last: 'Jones' },
    ];
    expect(pipe.transform(value, ['first', 'last'], ' ', '; ')).toBe('Alice Smith; Bob Jones');
  });

  it('skips null, undefined, and empty-string field values', () => {
    const value = [{ first: 'Alice', middle: '', last: null }];
    expect(pipe.transform(value, ['first', 'middle', 'last'])).toBe('Alice');
  });

  it('omits items that resolve to an empty string entirely', () => {
    const value = [
      { first: '', last: null },
      { first: 'Bob', last: 'Jones' },
    ];
    expect(pipe.transform(value, ['first', 'last'])).toBe('Bob, Jones');
  });
});
