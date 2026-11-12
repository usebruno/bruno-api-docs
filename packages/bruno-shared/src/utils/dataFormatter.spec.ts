import { describe, it, expect } from 'vitest';
import { Buffer } from 'buffer';
import { formatResponse, prettifyJsonString, prettifyXmlString } from './dataFormatter';

describe('prettifyJsonString', () => {
  const roundTrips = (input: string) => prettifyJsonString(prettifyJsonString(input)) === prettifyJsonString(input);

  describe('making the body readable', () => {
    it('spreads a body written on one line over several readable lines', () => {
      expect(prettifyJsonString('{"email":"user@example.com","password":"pw"}')).toBe(
        '{\n  "email": "user@example.com",\n  "password": "pw"\n}'
      );
    });

    it('indents nested sections so the structure is easy to follow', () => {
      expect(prettifyJsonString('{"a":{"b":[1,{"c":2}]}}')).toBe(
        '{\n  "a": {\n    "b": [\n      1,\n      {\n        "c": 2\n      }\n    ]\n  }\n}'
      );
    });

    it('formats a body that is a list rather than a set of fields', () => {
      expect(prettifyJsonString('[1,2]')).toBe('[\n  1,\n  2\n]');
    });

    it('leaves a body that is already tidy exactly as it is', () => {
      const formatted = '{\n  "a": 1\n}';
      expect(prettifyJsonString(formatted)).toBe(formatted);
    });

    it('gives the same result when the user clicks Prettify twice', () => {
      expect(roundTrips('{"a":{"b":[1,2]},"c":"{{v}}"}')).toBe(true);
    });
  });

  describe('keeping bruno variables such as {{baseUrl}} intact', () => {
    it('keeps a variable written inside quotes exactly as typed', () => {
      expect(prettifyJsonString('{"email":"{{userEmail}}"}')).toBe('{\n  "email": "{{userEmail}}"\n}');
    });

    it('keeps a variable used as a plain value instead of mangling it', () => {
      expect(prettifyJsonString('{"limit":{{count}},"ok":true}')).toContain('{{count}}');
      expect(prettifyJsonString('{"limit":{{count}},"ok":true}')).toContain('"ok": true');
    });

    it('keeps a variable that is used as a field name', () => {
      expect(prettifyJsonString('{"{{key}}":1}')).toBe('{\n  "{{key}}": 1\n}');
    });

    it('puts every variable back in the right place when there are several', () => {
      const out = prettifyJsonString('{"a":"{{one}}","b":"{{two}}","c":"{{three}}"}');
      expect(out).toBe('{\n  "a": "{{one}}",\n  "b": "{{two}}",\n  "c": "{{three}}"\n}');
    });

    it('keeps two variables that sit right next to each other', () => {
      expect(prettifyJsonString('{"a":"{{x}}{{y}}"}')).toBe('{\n  "a": "{{x}}{{y}}"\n}');
    });

    it('keeps a variable that is followed immediately by numbers', () => {
      expect(prettifyJsonString('{"a":"{{x}}5"}')).toBe('{\n  "a": "{{x}}5"\n}');
    });

    it('keeps an empty pair of braces the user has not filled in yet', () => {
      expect(prettifyJsonString('{"a":"{{}}"}')).toBe('{\n  "a": "{{}}"\n}');
    });

    it('leaves the body alone even if it happens to contain the text used internally while formatting', () => {
      const out = prettifyJsonString('{"note":"__bruno_var_0__","id":"{{id}}"}');
      expect(out).toBe('{\n  "note": "__bruno_var_0__",\n  "id": "{{id}}"\n}');
    });

    it('leaves the body alone when that internal text is repeated so the copies overlap', () => {
      const out = prettifyJsonString('{"note":"__bruno_var__bruno_var___","id":"{{id}}"}');
      expect(out).toBe('{\n  "note": "__bruno_var__bruno_var___",\n  "id": "{{id}}"\n}');
    });

    it('keeps escape sequences escaped, so the result is still valid json', () => {
      const out = prettifyJsonString('{"a":"\\u0001","b":"line\\nbreak","c":"tab\\there"}');
      expect(out).toContain('\\u0001');
      expect(() => JSON.parse(out)).not.toThrow();
    });

    it('leaves the body alone when it contains a long run of the internal text', () => {
      const note = `__bruno_var${'_'.repeat(40)}`;
      const out = prettifyJsonString(`{"note":"${note}","id":"{{id}}"}`);
      expect(out).toBe(`{\n  "note": "${note}",\n  "id": "{{id}}"\n}`);
    });
  });

  describe('a big body pasted as one long line', () => {
    const singleLineBody = (pairs: number) => {
      const parts = [];
      for (let index = 0; index < pairs; index++) {
        parts.push(`"key${index}":{"a":${index},"b":"value ${index}"}`);
      }
      return `{${parts.join(',')}}`;
    };

    it('formats half a megabyte on one line without locking up', () => {
      const body = singleLineBody(20000);
      expect(body.length).toBeGreaterThan(500_000);

      const startedAt = performance.now();
      const out = prettifyJsonString(body);
      const elapsed = performance.now() - startedAt;

      expect(out.split('\n').length).toBeGreaterThan(20000);
      expect(out).toContain('"key0": {');
      expect(out).toContain('"key19999": {');
      expect(elapsed).toBeLessThan(2000);
    });

    it('keeps every variable in a big one-line body', () => {
      const parts = [];
      for (let index = 0; index < 5000; index++) parts.push(`"k${index}":"{{var${index}}}"`);

      const out = prettifyJsonString(`{${parts.join(',')}}`);

      expect(out.match(/\{\{var\d+\}\}/g)).toHaveLength(5000);
      expect(out).toContain('{{var4999}}');
    });
  });

  describe('never changing what the body actually says', () => {
    it('keeps special characters such as line breaks and quotes exactly as written', () => {
      const escapes = String.raw`{"nl":"a\nb","tab":"a\tb","quote":"say \"hi\"","backslash":"C:\\dir","solidus":"a\/b"}`;
      const out = prettifyJsonString(escapes);
      ['a\\nb', 'a\\tb', 'say \\"hi\\"', 'C:\\\\dir', 'a\\/b'].forEach((fragment) => {
        expect(out).toContain(fragment);
      });
    });

    it('keeps hidden control characters in code form so the body stays valid JSON', () => {
      const out = prettifyJsonString(String.raw`{"a":"x\u0001y"}`);
      expect(out).toContain(String.raw`\u0001`);
      expect(() => JSON.parse(out)).not.toThrow();
    });

    it('leaves accented characters in code form rather than converting them', () => {
      expect(prettifyJsonString(String.raw`{"a":"caf\u00e9"}`)).toContain(String.raw`\u00e9`);
    });

    it('keeps very long ID numbers exactly, with no rounding', () => {
      expect(prettifyJsonString('{"id":12345678901234567890}')).toContain('12345678901234567890');
    });

    it('keeps numbers written the way the user typed them', () => {
      const out = prettifyJsonString('{"a":1.0,"b":1e3,"c":1E-7,"d":-0.5}');
      ['1.0', '1e3', '1E-7', '-0.5'].forEach((literal) => expect(out).toContain(literal));
    });

    it('keeps both fields when the same field name appears twice', () => {
      expect(prettifyJsonString('{"a":1,"a":2}')).toBe('{\n  "a": 1,\n  "a": 2\n}');
    });

    it('keeps a note the user wrote on its own line', () => {
      expect(prettifyJsonString('{\n// note\n"a":1}')).toBe('{\n  // note\n  "a": 1\n}');
    });

    it('keeps a note the user wrote in the middle of a line', () => {
      expect(prettifyJsonString('{"a":1 /* c */}')).toContain('/* c */');
    });
  });

  describe('bodies it cannot tidy up', () => {
    it('leaves ordinary text alone instead of scrambling it', () => {
      expect(prettifyJsonString('not json at all')).toBe('not json at all');
    });

    it('never loses any content when the body is unfinished', () => {
      const out = prettifyJsonString('{"a":1');
      expect(out.replace(/\s/g, '')).toBe('{"a":1');
    });

    it('never loses any content when there is a stray comma', () => {
      const out = prettifyJsonString('{"a":1,}');
      expect(out.replace(/\s/g, '')).toBe('{"a":1,}');
    });

    it('does nothing when the body is empty', () => {
      expect(prettifyJsonString('')).toBe('');
      expect(prettifyJsonString('   ')).toBe('   ');
    });
  });
});

describe('prettifyXmlString', () => {
  describe('making the body readable', () => {
    it('spreads XML written on one line over several readable lines', () => {
      expect(prettifyXmlString('<user><email>a@b.c</email></user>')).toBe(
        '<user>\n    <email>a@b.c</email>\n</user>'
      );
    });

    it('keeps the opening XML declaration on its own line', () => {
      expect(prettifyXmlString('<?xml version="1.0"?><a><b>1</b></a>')).toBe(
        '<?xml version="1.0"?>\n<a>\n    <b>1</b>\n</a>'
      );
    });

    it('leaves XML that is already tidy exactly as it is', () => {
      const formatted = '<a>\n    <b>1</b>\n</a>';
      expect(prettifyXmlString(formatted)).toBe(formatted);
    });

    it('gives the same result when the user clicks Prettify twice', () => {
      const once = prettifyXmlString('<a><b>1</b><c x="2"/></a>');
      expect(prettifyXmlString(once)).toBe(once);
    });
  });

  describe('never changing what the body actually says', () => {
    it('keeps variables used both inside tags and in tag settings', () => {
      expect(prettifyXmlString('<user id="{{id}}"><email>{{userEmail}}</email></user>')).toBe(
        '<user id="{{id}}">\n    <email>{{userEmail}}</email>\n</user>'
      );
    });

    it('keeps a block of raw text exactly as written', () => {
      expect(prettifyXmlString('<a><![CDATA[raw <not> xml]]></a>')).toContain('<![CDATA[raw <not> xml]]>');
    });

    it('keeps notes the user wrote in the XML', () => {
      expect(prettifyXmlString('<a><!-- note --><b>1</b></a>')).toContain('<!-- note -->');
    });

    it('keeps escaped characters such as the less than sign in code form', () => {
      expect(prettifyXmlString('<a>&lt;&amp;&gt;</a>')).toContain('&lt;&amp;&gt;');
    });

    it('keeps tag name prefixes such as the ones SOAP uses', () => {
      expect(prettifyXmlString('<ns:a xmlns:ns="u"><ns:b>1</ns:b></ns:a>')).toBe(
        '<ns:a xmlns:ns="u">\n    <ns:b>1</ns:b>\n</ns:a>'
      );
    });
  });

  describe('bodies it cannot tidy up', () => {
    it('leaves broken XML alone instead of inventing the missing closing tags', () => {
      expect(prettifyXmlString('<broken><a></broken>')).toBe('<broken><a></broken>');
    });

    it('leaves XML alone when a tag was never closed', () => {
      expect(prettifyXmlString('<a><b>')).toBe('<a><b>');
    });

    it('leaves ordinary text alone instead of scrambling it', () => {
      expect(prettifyXmlString('hello world')).toBe('hello world');
    });

    it('leaves XML alone when it has more than one top level tag', () => {
      expect(prettifyXmlString('<a/><b/>')).toBe('<a/><b/>');
    });

    it('does nothing when the body is empty', () => {
      expect(prettifyXmlString('')).toBe('');
      expect(prettifyXmlString('   ')).toBe('   ');
    });
  });
});

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
        const result = formatResponse(data as Parameters<typeof formatResponse>[0], buffer as string, mode as string);
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
      const result = formatResponse(data, dataBuffer, 'application/json', undefined, '$.users[0].name');

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
      const result = formatResponse(data, buffer, 'application/json', undefined, undefined, 100);

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
      const result = formatResponse(xmlData, largeBuffer, 'application/xml', undefined, undefined, 100);

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
      const result = formatResponse(data, largeBuffer, 'text/plain', undefined, undefined, 100);

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
        const result = formatResponse(data as Parameters<typeof formatResponse>[0], buffer, mode);
        expect(typeof result).toBe('string');
      });
    });
  });
});
