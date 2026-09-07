import { TestBed } from '@angular/core/testing';
import { LagrumFieldService, buildLagrumFieldConfig } from './lagrum-field.service';
import { FieldConfig } from '../components/general-form/general-form.types';
import { Option } from '@app/shared/commonTypes';

function makeField(name: string): FieldConfig {
  return { type: 'input', name, label: name } as FieldConfig;
}

describe('buildLagrumFieldConfig', () => {
  it('builds basic config with required validator', () => {
    const config = buildLagrumFieldConfig({ name: 'lagrum' });
    expect(config.name).toBe('lagrum');
    expect(config.type).toBe('dropdown-search');
    expect(config.validators).toBeDefined();
    expect(config.validators!.length).toBeGreaterThan(0);
  });

  it('omits validators when required is false', () => {
    const config = buildLagrumFieldConfig({ name: 'lagrum', required: false });
    expect(config.validators).toBeUndefined();
  });

  it('sets options when provided', () => {
    const options: Option[] = [{ label: 'Opt A', id: 'a' }];
    const config = buildLagrumFieldConfig({ name: 'lagrum', options });
    expect(config.options).toBe(options);
  });

  it('uses undefined options when null provided', () => {
    const config = buildLagrumFieldConfig({ name: 'lagrum', options: null });
    expect(config.options).toBeUndefined();
  });

  it('sets defaultValue when provided', () => {
    const config = buildLagrumFieldConfig({ name: 'lagrum', defaultValue: 'lag-1' });
    expect(config.defaultValue).toBe('lag-1');
  });
});

describe('LagrumFieldService', () => {
  let service: LagrumFieldService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [LagrumFieldService] });
    service = TestBed.inject(LagrumFieldService);
  });

  describe('buildField', () => {
    it('delegates to buildLagrumFieldConfig', () => {
      const result = service.buildField({ name: 'lagrum' });
      expect(result.name).toBe('lagrum');
      expect(result.type).toBe('dropdown-search');
    });
  });

  describe('syncOptions', () => {
    it('updates options for matching field', () => {
      const config = [makeField('lagrum'), makeField('other')];
      const options: Option[] = [{ label: 'A', id: 'a' }];
      const result = service.syncOptions(config as FieldConfig[], 'lagrum', options);
      expect(result[0].options).toBe(options);
      expect(result[1].options).toBeUndefined();
    });

    it('does not mutate original config', () => {
      const config = [makeField('lagrum')];
      const copy = [...config];
      service.syncOptions(config as FieldConfig[], 'lagrum', []);
      expect(config).toEqual(copy);
    });

    it('sets undefined when options is null', () => {
      const config = [makeField('lagrum')];
      const result = service.syncOptions(config as FieldConfig[], 'lagrum', null);
      expect(result[0].options).toBeUndefined();
    });
  });

  describe('insertAfter', () => {
    it('inserts field after named field', () => {
      const config = [makeField('a'), makeField('b')];
      const newField = makeField('c');
      const result = service.insertAfter(config as FieldConfig[], 'a', newField as FieldConfig);
      expect(result[0].name).toBe('a');
      expect(result[1].name).toBe('c');
      expect(result[2].name).toBe('b');
    });

    it('appends at end when named field not found', () => {
      const config = [makeField('a'), makeField('b')];
      const newField = makeField('c');
      const result = service.insertAfter(config as FieldConfig[], 'notexist', newField as FieldConfig);
      expect(result[result.length - 1].name).toBe('c');
    });
  });

  describe('removeField', () => {
    it('removes field with matching name', () => {
      const config = [makeField('lagrum'), makeField('other')];
      const result = service.removeField(config as FieldConfig[], 'lagrum');
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('other');
    });

    it('returns same config when field not found', () => {
      const config = [makeField('a'), makeField('b')];
      const result = service.removeField(config as FieldConfig[], 'lagrum');
      expect(result.length).toBe(2);
    });
  });
});
