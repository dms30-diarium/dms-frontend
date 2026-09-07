import { paginateEntries, updateCurrentPage, PageSignal } from './pagination-utils';

describe('paginateEntries', () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  it('returns all entries when pageSize is 0', () => {
    expect(paginateEntries(items, 0, 0)).toEqual(items);
  });

  it('returns first page', () => {
    expect(paginateEntries(items, 0, 3)).toEqual([1, 2, 3]);
  });

  it('returns second page', () => {
    expect(paginateEntries(items, 1, 3)).toEqual([4, 5, 6]);
  });

  it('returns partial last page', () => {
    expect(paginateEntries(items, 3, 3)).toEqual([10]);
  });

  it('returns empty array when page is beyond range', () => {
    expect(paginateEntries(items, 100, 3)).toEqual([]);
  });

  it('clamps negative page to 0', () => {
    expect(paginateEntries(items, -1, 3)).toEqual([1, 2, 3]);
  });
});

describe('updateCurrentPage', () => {
  function makeSignal(initial: number): PageSignal {
    let value = initial;
    const fn = () => value;
    fn.set = (v: number) => {
      value = v;
    };
    return fn as PageSignal;
  }

  it('does not change page when already valid', () => {
    const sig = makeSignal(0);
    updateCurrentPage(sig, 10, 5);
    expect(sig()).toBe(0);
  });

  it('clamps page to max when total shrinks', () => {
    const sig = makeSignal(5);
    updateCurrentPage(sig, 10, 5); // max page = 1
    expect(sig()).toBe(1);
  });

  it('sets page to 0 when pageSize is 0', () => {
    const sig = makeSignal(3);
    updateCurrentPage(sig, 10, 0);
    expect(sig()).toBe(0);
  });
});
