import { BUTTON_PRESETS, createButton } from './button-presets';

describe('BUTTON_PRESETS', () => {
  it('contains addToCollection preset', () => {
    expect(BUTTON_PRESETS.addToCollection.text).toBeTruthy();
    expect(BUTTON_PRESETS.addToCollection.icon).toBeTruthy();
  });

  it('contains edit preset with pencil icon', () => {
    expect(BUTTON_PRESETS.edit.icon).toBe('Pencil');
  });

  it('contains lock and unlock presets', () => {
    expect(BUTTON_PRESETS.lock.text).toBeTruthy();
    expect(BUTTON_PRESETS.unlock.text).toBeTruthy();
  });

  it('contains favorite and favoriteActive presets', () => {
    expect(BUTTON_PRESETS.favorite.icon).toBe('Star');
    expect(BUTTON_PRESETS.favoriteActive.icon).toBe('StarFull');
  });

  it('contains all required keys', () => {
    const keys: (keyof typeof BUTTON_PRESETS)[] = [
      'addToCollection',
      'assignHandler',
      'bookmark',
      'edit',
      'favorite',
      'lock',
      'unlock',
      'notify',
      'share',
      'sendEmail',
    ];
    keys.forEach(key => {
      expect(BUTTON_PRESETS[key]).toBeTruthy(`Expected preset '${key}' to exist`);
    });
  });
});

describe('createButton', () => {
  it('returns button with text and icon from preset', () => {
    const handler = jasmine.createSpy('handler');
    const button = createButton('edit', handler);
    expect(button.text).toBe(BUTTON_PRESETS.edit.text);
    expect(button.icon).toBe(BUTTON_PRESETS.edit.icon);
  });

  it('attaches click handler to button', () => {
    const handler = jasmine.createSpy('click');
    const button = createButton('lock', handler);
    expect(button.click).toBe(handler);
  });

  it('creates downloadAllFiles button correctly', () => {
    const btn = createButton('downloadAllFiles', jasmine.createSpy('downloadAllFiles'));
    expect(btn.icon).toBe('Download');
  });

  it('creates share button correctly', () => {
    const btn = createButton('share', jasmine.createSpy('share'));
    expect(btn.icon).toBe('Share2');
  });

  it('creates expeditHandling button correctly', () => {
    const btn = createButton('expeditHandling', jasmine.createSpy('expeditHandling'));
    expect(btn.icon).toBe('Send');
  });
});
