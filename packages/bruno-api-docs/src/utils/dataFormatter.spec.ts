import { describe, it, expect } from 'vitest';
import { Buffer } from 'buffer';
import { formatResponse } from './dataFormatter';

describe('formatResponse', () => {
  const createBase64Buffer = (content: string) => Buffer.from(content).toString('base64');
  const createLargeBase64Buffer = (data: unknown) => {
    const content = typeof data === 'string' ? data : JSON.stringify(data);
    return Buffer.from(content).toString('base64');
  };

  describe('invalid inputs', () => {
    it('should return empty string when there is no mode, or neither data nor buffer', () => {
      const invalidCases: [unknown, string | null, string | null][] = [
        [undefined, 'dGVzdA==', 'json'], // a non-JSON buffer with no parsed data
        [{ test: 'data' }, 'dGVzdA==', null], // no mode
        [undefined, undefined as unknown as null, undefined as unknown as null],
        [undefined, '', 'json'] // neither data nor buffer
      ];

      invalidCases.forEach(([data, buffer, mode]) => {
        const result = formatResponse(data, buffer as string, mode as string);
        expect(result).toBe('');
        expect(typeof result).toBe('string');
      });
    });
  });

  // Text responses skip the redundant base64 copy, so formatResponse must format from `data` alone.
  describe('data-only (no base64 buffer)', () => {
    it('formats object data as pretty JSON without a buffer', () => {
      const result = formatResponse({ name: 'John', age: 30 }, '', 'application/json');
      expect(result).toBe('{\n  "name": "John",\n  "age": 30\n}');
    });

    it('preserves bigint precision from a raw JSON string without a buffer', () => {
      const result = formatResponse('{ "data": 1736184243098437392 }', '', 'application/json');
      expect(result).toBe('{\n  "data": 1736184243098437392\n}');
    });

    it('formats XML from the data string without a buffer', () => {
      const result = formatResponse('<root><item>value</item></root>', '', 'application/xml');
      expect(result).toContain('root');
      expect(result).toContain('item');
    });

    it('returns plain text verbatim without a buffer', () => {
      expect(formatResponse('plain text content', '', 'text/plain')).toBe('plain text content');
    });

    it('derives a hex dump from the text body when no buffer is present', () => {
      expect(formatResponse('Hi', '', 'hex')).toBe('00000000: 48 69                                            Hi\n');
    });

    it('derives base64 from the text body when no buffer is present', () => {
      expect(formatResponse('hello world', '', 'base64')).toBe(Buffer.from('hello world').toString('base64'));
    });
  });

  describe('JSON mode', () => {
    it('should format JSON data with JSONPath filter', () => {
      const data = { users: [{ name: 'John' }, { name: 'Jane' }] };
      const dataBuffer = createBase64Buffer(JSON.stringify(data));
      const result = formatResponse(data, dataBuffer, 'application/json', '$.users[0].name');

      expect(result).toBe('[\n  "John"\n]');
      expect(typeof result).toBe('string');
    });

    it('should format normal sized JSON responses', () => {
      const data = { name: 'John', age: 30 };
      const dataBuffer = createBase64Buffer(JSON.stringify(data));
      const result = formatResponse(data, dataBuffer, 'application/json');

      expect(result).toBe('{\n  "name": "John",\n  "age": 30\n}');
      expect(typeof result).toBe('string');
    });

    it('should format normal sized JSON responses when data is already a JSON string', () => {
      const data = '{"name":"John","age":30}';
      const dataBuffer = createBase64Buffer(data);
      const result = formatResponse(data, dataBuffer, 'application/json');

      expect(result).toBe('{\n  "name": "John",\n  "age": 30\n}');
      expect(typeof result).toBe('string');
    });

    it('should preserve bigint value after JSON format', () => {
      const data = '{ "data": 1736184243098437392 }';
      const dataBuffer = createBase64Buffer(data);
      const result = formatResponse(data, dataBuffer, 'application/json');

      expect(result).toBe('{\n  "data": 1736184243098437392\n}');
      expect(typeof result).toBe('string');
    });

    it('should format large JSON responses without indentation', () => {
      const data = {
        test: 'value',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua',
        content: 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat'
      };
      const buffer = createLargeBase64Buffer(data);
      const result = formatResponse(data, buffer, 'application/json', undefined, 100);

      expect(result).toBe('{"test":"value","description":"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua","content":"Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat"}');
      expect(typeof result).toBe('string');
    });
  });

  describe('XML mode', () => {
    it('should format normal sized XML responses', () => {
      const xmlData = '<root><item>value</item></root>';
      const dataBuffer = createBase64Buffer(xmlData);
      const result = formatResponse(xmlData, dataBuffer, 'application/xml');

      expect(typeof result).toBe('string');
      expect(result).toContain('root');
      expect(result).toContain('item');
    });

    it('should handle large XML responses', () => {
      const xmlData = '<root><item>value</item><description>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore</description><content>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo</content></root>';
      const largeBuffer = createLargeBase64Buffer(xmlData);
      const result = formatResponse(xmlData, largeBuffer, 'application/xml', undefined, 100);

      expect(typeof result).toBe('string');
      expect(result).toContain('Lorem ipsum');
    });
  });

  describe('other modes', () => {
    it('should handle string data for non-JSON/XML modes', () => {
      const data = 'plain text content';
      const dataBuffer = createBase64Buffer(data);
      const result = formatResponse(data, dataBuffer, 'text/plain');

      expect(result).toBe('plain text content');
      expect(typeof result).toBe('string');
    });

    it('should handle large object data for other modes', () => {
      const data = {
        message: 'hello',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua',
        content: 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat'
      };
      const largeBuffer = createLargeBase64Buffer(data);
      const result = formatResponse(data, largeBuffer, 'text/plain', undefined, 100);

      expect(typeof result).toBe('string');
      expect(result).toContain('Lorem ipsum');
    });
  });

  describe('hex mode', () => {
    it('should render a hex dump with address, hex bytes and ASCII gutter', () => {
      const data = 'Hi';
      const dataBuffer = createBase64Buffer(data);
      const result = formatResponse(data, dataBuffer, 'hex');

      // "Hi" -> H = 0x48, i = 0x69, printable so the ASCII gutter echoes them.
      expect(result).toBe('00000000: 48 69                                            Hi\n');
      expect(typeof result).toBe('string');
    });

    it('should represent non-printable bytes as dots in the ASCII gutter', () => {
      const data = '\x00\x01\x02';
      const dataBuffer = createBase64Buffer(data);
      const result = formatResponse(data, dataBuffer, 'hex');

      expect(result).toBe('00000000: 00 01 02                                         ...\n');
      expect(typeof result).toBe('string');
    });
  });

  describe('base64 mode', () => {
    it('should return the base64 buffer string unchanged', () => {
      const data = 'hello world';
      const dataBuffer = createBase64Buffer(data);
      const result = formatResponse(data, dataBuffer, 'base64');

      expect(result).toBe(dataBuffer);
      expect(typeof result).toBe('string');
    });
  });

  describe('data type handling', () => {
    it('should handle different data types and always return string', () => {
      const testCases: [unknown, string, string][] = [
        [123, createBase64Buffer('123'), 'application/json'],
        [true, createBase64Buffer('true'), 'application/json'],
        [null, createBase64Buffer('null'), 'application/json'],
        [[], createBase64Buffer('[]'), 'application/json']
      ];

      testCases.forEach(([data, buffer, mode]) => {
        const result = formatResponse(data, buffer, mode);
        expect(typeof result).toBe('string');
      });
    });
  });
});
