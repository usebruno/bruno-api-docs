import { describe, it, expect } from 'vitest';
import { sampleCollectionYaml } from './sampleCollection';
import { parseYaml } from './utils/yamlUtils';

describe('dev.tsx sample collection YAML', () => {
  const collection = parseYaml(sampleCollectionYaml);

  it('should parse without errors', () => {
    expect(collection).toBeDefined();
    expect(collection.opencollection).toBe('1.0.0');
    expect(collection.info.name).toBe('Bruno Testbench');
  });
});
