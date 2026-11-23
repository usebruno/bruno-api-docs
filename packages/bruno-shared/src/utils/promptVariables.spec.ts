import { describe, it, expect } from 'vitest';
import {
  buildPromptVariableMap,
  extractPromptVariables,
  extractPromptVariablesFromString,
  isPromptVariableToken,
  promptVariableName,
  toPromptVariableKey
} from './promptVariables';

describe('recognising a prompt token', () => {
  it('accepts a plain name', () => {
    expect(isPromptVariableToken('?OTP')).toBe(true);
    expect(promptVariableName('?OTP')).toBe('OTP');
  });

  it('accepts a name with spaces inside it', () => {
    expect(isPromptVariableToken('?Test user id')).toBe(true);
    expect(promptVariableName('?Test user id')).toBe('Test user id');
  });

  it('accepts a single character name', () => {
    expect(isPromptVariableToken('?x')).toBe(true);
  });

  it('rejects a name padded with spaces, so it reads as an ordinary variable instead', () => {
    expect(isPromptVariableToken('? OTP')).toBe(false);
    expect(isPromptVariableToken('?OTP ')).toBe(false);
    expect(promptVariableName('?OTP ')).toBeNull();
  });

  it('rejects an ordinary variable and an empty token', () => {
    expect(isPromptVariableToken('baseUrl')).toBe(false);
    expect(isPromptVariableToken('?')).toBe(false);
    expect(isPromptVariableToken('')).toBe(false);
  });

  it('rejects a name containing braces', () => {
    expect(isPromptVariableToken('?{OTP}')).toBe(false);
  });
});

describe('finding prompts in a string', () => {
  it('finds every prompt in the order it appears', () => {
    expect(extractPromptVariablesFromString('{{?User}}/{{?Repo}}')).toEqual(['User', 'Repo']);
  });

  it('ignores ordinary variables and dynamic tokens', () => {
    expect(extractPromptVariablesFromString('{{baseUrl}}/{{$randomUUID}}')).toEqual([]);
  });

  it('finds a prompt sitting next to an ordinary variable', () => {
    expect(extractPromptVariablesFromString('{{baseUrl}}/otp/{{?OTP}}')).toEqual(['OTP']);
  });

  it('scans each string independently, so a second call finds the same prompts', () => {
    const url = '{{?OTP}}';
    expect(extractPromptVariablesFromString(url)).toEqual(['OTP']);
    expect(extractPromptVariablesFromString(url)).toEqual(['OTP']);
  });

  it('survives a value that is not a string', () => {
    expect(extractPromptVariablesFromString(undefined as unknown as string)).toEqual([]);
  });
});

describe('finding prompts across a request', () => {
  it('walks nested objects and arrays', () => {
    const request = {
      url: '{{?Host}}/users',
      headers: [{ name: 'X-Token', value: '{{?Token}}' }],
      body: { data: '{"id":"{{?User id}}"}' }
    };

    expect(extractPromptVariables(request)).toEqual(['Host', 'Token', 'User id']);
  });

  it('lists a prompt once however many times it is used', () => {
    const request = { url: '{{?OTP}}', headers: [{ name: 'X-OTP', value: '{{?OTP}}' }] };

    expect(extractPromptVariables(request)).toEqual(['OTP']);
  });

  it('treats names differing only in case as two different prompts', () => {
    expect(extractPromptVariables(['{{?otp}}', '{{?OTP}}'])).toEqual(['otp', 'OTP']);
  });

  it('returns nothing for a request with no prompts', () => {
    expect(extractPromptVariables({ url: '{{baseUrl}}/users' })).toEqual([]);
  });

  it('copes with null and undefined values inside the request', () => {
    expect(extractPromptVariables({ url: null, body: undefined, headers: [] })).toEqual([]);
  });

  it('does not loop forever on a request that refers back to itself', () => {
    const request: Record<string, unknown> = { url: '{{?Host}}' };
    request.self = request;

    expect(extractPromptVariables(request)).toEqual(['Host']);
  });
});

describe('turning answers into interpolation values', () => {
  it('keys each answer by its token text so it cannot clash with a real variable', () => {
    expect(toPromptVariableKey('OTP')).toBe('?OTP');
    expect(buildPromptVariableMap(['OTP'], { OTP: '123456' })).toEqual({ '?OTP': '123456' });
  });

  it('includes a prompt the reader left blank, so the token resolves to nothing rather than being sent as text', () => {
    expect(buildPromptVariableMap(['OTP'], {})).toEqual({ '?OTP': '' });
  });

  it('ignores answers for prompts this request does not use', () => {
    expect(buildPromptVariableMap(['OTP'], { OTP: '1', Unused: '2' })).toEqual({ '?OTP': '1' });
  });
});

describe('matching the desktop extractor exactly', () => {
  it('lists a prompt used twice in one string only once', () => {
    expect(extractPromptVariablesFromString('{{?OTP}}/{{?OTP}}')).toEqual(['OTP']);
  });

  it('degrades to what it collected rather than failing the send', () => {
    const hostile = {
      good: '{{?Wanted}}',
      get bad() {
        throw new Error('cannot read this');
      }
    };

    expect(extractPromptVariables(hostile)).toEqual(['Wanted']);
  });
});
