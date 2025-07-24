import { describe, test, expect } from 'vitest';
import {
    detectVariables,
    processTemplate,
    isValidVariableName,
    sanitizeVariableName,
    extractVariableNames,
    hasVariables
} from './variableUtils';
import { Variable } from './storage';

describe('detectVariables', () => {
    test('detects single variable', () => {
        const content = 'Hello {{name}}, how are you?';
        const result = detectVariables(content);

        expect(result.hasVariables).toBe(true);
        expect(result.variables).toHaveLength(1);
        expect(result.variables[0].name).toBe('name');
        expect(result.variables[0].positions).toEqual([{ start: 6, end: 14 }]);
    });

    test('detects multiple different variables', () => {
        const content = 'Hello {{name}}, your age is {{age}} and you live in {{city}}.';
        const result = detectVariables(content);

        expect(result.hasVariables).toBe(true);
        expect(result.variables).toHaveLength(3);

        const names = result.variables.map(v => v.name).sort();
        expect(names).toEqual(['age', 'city', 'name']);
    });

    test('detects multiple instances of same variable', () => {
        const content = 'Hello {{name}}, {{name}} is a great name!';
        const result = detectVariables(content);

        expect(result.hasVariables).toBe(true);
        expect(result.variables).toHaveLength(1);
        expect(result.variables[0].name).toBe('name');
        expect(result.variables[0].positions).toHaveLength(2);
        expect(result.variables[0].positions).toEqual([
            { start: 6, end: 14 },
            { start: 16, end: 24 }
        ]);
    });

    test('handles empty content', () => {
        const result = detectVariables('');
        expect(result.hasVariables).toBe(false);
        expect(result.variables).toHaveLength(0);
    });

    test('handles null/undefined content', () => {
        expect(detectVariables(null as unknown as string)).toEqual({ variables: [], hasVariables: false });
        expect(detectVariables(undefined as unknown as string)).toEqual({ variables: [], hasVariables: false });
    });

    test('handles content with no variables', () => {
        const content = 'This is just regular text without any variables.';
        const result = detectVariables(content);

        expect(result.hasVariables).toBe(false);
        expect(result.variables).toHaveLength(0);
    });

    test('handles malformed variable syntax', () => {
        const content = 'This has {{incomplete and }invalid} and {{valid}} syntax.';
        const result = detectVariables(content);

        expect(result.hasVariables).toBe(true);
        expect(result.variables).toHaveLength(1);
        expect(result.variables[0].name).toBe('valid');
    });

    test('ignores empty variable names', () => {
        const content = 'This has {{}} and {{   }} empty variables and {{valid}} one.';
        const result = detectVariables(content);

        expect(result.hasVariables).toBe(true);
        expect(result.variables).toHaveLength(1);
        expect(result.variables[0].name).toBe('valid');
    });

    test('handles variables with underscores and numbers', () => {
        const content = 'Variables: {{var_1}}, {{_private}}, {{user_name_2}}.';
        const result = detectVariables(content);

        expect(result.hasVariables).toBe(true);
        expect(result.variables).toHaveLength(3);

        const names = result.variables.map(v => v.name).sort();
        expect(names).toEqual(['_private', 'user_name_2', 'var_1']);
    });

    test('ignores variables with invalid characters', () => {
        const content = 'Invalid: {{var-name}}, {{var.name}}, {{var name}}, valid: {{var_name}}.';
        const result = detectVariables(content);

        expect(result.hasVariables).toBe(true);
        expect(result.variables).toHaveLength(1);
        expect(result.variables[0].name).toBe('var_name');
    });
});

describe('processTemplate', () => {
    test('replaces single variable with value', () => {
        const template = 'Hello {{name}}, how are you?';
        const variables: Variable[] = [{ name: 'name', value: 'John' }];
        const result = processTemplate(template, variables);

        expect(result).toBe('Hello John, how are you?');
    });

    test('replaces multiple variables with values', () => {
        const template = 'Hello {{name}}, your age is {{age}} and you live in {{city}}.';
        const variables: Variable[] = [
            { name: 'name', value: 'John' },
            { name: 'age', value: '30' },
            { name: 'city', value: 'New York' }
        ];
        const result = processTemplate(template, variables);

        expect(result).toBe('Hello John, your age is 30 and you live in New York.');
    });

    test('replaces multiple instances of same variable', () => {
        const template = 'Hello {{name}}, {{name}} is a great name!';
        const variables: Variable[] = [{ name: 'name', value: 'Alice' }];
        const result = processTemplate(template, variables);

        expect(result).toBe('Hello Alice, Alice is a great name!');
    });

    test('replaces missing variables with empty string', () => {
        const template = 'Hello {{name}}, your age is {{age}}.';
        const variables: Variable[] = [{ name: 'name', value: 'John' }];
        const result = processTemplate(template, variables);

        expect(result).toBe('Hello John, your age is .');
    });

    test('handles empty variable values', () => {
        const template = 'Hello {{name}}, how are you?';
        const variables: Variable[] = [{ name: 'name', value: '' }];
        const result = processTemplate(template, variables);

        expect(result).toBe('Hello , how are you?');
    });

    test('handles null/undefined variable values', () => {
        const template = 'Hello {{name}}, how are you?';
        const variables: Variable[] = [{ name: 'name', value: null as unknown as string }];
        const result = processTemplate(template, variables);

        expect(result).toBe('Hello , how are you?');
    });

    test('handles empty variables array', () => {
        const template = 'Hello {{name}}, your age is {{age}}.';
        const result = processTemplate(template, []);

        expect(result).toBe('Hello , your age is .');
    });

    test('handles null/undefined variables array', () => {
        const template = 'Hello {{name}}, how are you?';
        expect(processTemplate(template, null as unknown as Variable[])).toBe('Hello , how are you?');
        expect(processTemplate(template, undefined as unknown as Variable[])).toBe('Hello , how are you?');
    });

    test('handles empty template', () => {
        const variables: Variable[] = [{ name: 'name', value: 'John' }];
        expect(processTemplate('', variables)).toBe('');
    });

    test('handles null/undefined template', () => {
        const variables: Variable[] = [{ name: 'name', value: 'John' }];
        expect(processTemplate(null as unknown as string, variables)).toBe('');
        expect(processTemplate(undefined as unknown as string, variables)).toBe('');
    });

    test('handles template with no variables', () => {
        const template = 'This is just regular text.';
        const variables: Variable[] = [{ name: 'name', value: 'John' }];
        const result = processTemplate(template, variables);

        expect(result).toBe('This is just regular text.');
    });

    test('handles complex variable values', () => {
        const template = 'Code: {{code}}, JSON: {{json}}';
        const variables: Variable[] = [
            { name: 'code', value: 'function() { return "hello"; }' },
            { name: 'json', value: '{"key": "value", "number": 42}' }
        ];
        const result = processTemplate(template, variables);

        expect(result).toBe('Code: function() { return "hello"; }, JSON: {"key": "value", "number": 42}');
    });
});

describe('isValidVariableName', () => {
    test('validates correct variable names', () => {
        expect(isValidVariableName('name')).toBe(true);
        expect(isValidVariableName('userName')).toBe(true);
        expect(isValidVariableName('user_name')).toBe(true);
        expect(isValidVariableName('_private')).toBe(true);
        expect(isValidVariableName('var123')).toBe(true);
        expect(isValidVariableName('_var_123')).toBe(true);
    });

    test('rejects invalid variable names', () => {
        expect(isValidVariableName('123var')).toBe(false); // starts with number
        expect(isValidVariableName('var-name')).toBe(false); // contains dash
        expect(isValidVariableName('var.name')).toBe(false); // contains dot
        expect(isValidVariableName('var name')).toBe(false); // contains space
        expect(isValidVariableName('var@name')).toBe(false); // contains special char
        expect(isValidVariableName('')).toBe(false); // empty string
        expect(isValidVariableName('var!')).toBe(false); // ends with special char
    });

    test('handles null/undefined input', () => {
        expect(isValidVariableName(null as unknown as string)).toBe(false);
        expect(isValidVariableName(undefined as unknown as string)).toBe(false);
    });
});

describe('sanitizeVariableName', () => {
    test('removes invalid characters', () => {
        expect(sanitizeVariableName('var-name')).toBe('varname');
        expect(sanitizeVariableName('var.name')).toBe('varname');
        expect(sanitizeVariableName('var name')).toBe('varname');
        expect(sanitizeVariableName('var@name!')).toBe('varname');
    });

    test('adds underscore prefix if starts with number', () => {
        expect(sanitizeVariableName('123var')).toBe('_123var');
        expect(sanitizeVariableName('9name')).toBe('_9name');
    });

    test('preserves valid names', () => {
        expect(sanitizeVariableName('validName')).toBe('validName');
        expect(sanitizeVariableName('_private')).toBe('_private');
        expect(sanitizeVariableName('var_123')).toBe('var_123');
    });

    test('handles empty/null/undefined input', () => {
        expect(sanitizeVariableName('')).toBe('');
        expect(sanitizeVariableName(null as unknown as string)).toBe('');
        expect(sanitizeVariableName(undefined as unknown as string)).toBe('');
    });

    test('handles special cases', () => {
        expect(sanitizeVariableName('___')).toBe('___');
        expect(sanitizeVariableName('123')).toBe('_123');
        expect(sanitizeVariableName('!@#')).toBe('');
    });
});

describe('extractVariableNames', () => {
    test('extracts unique variable names', () => {
        const content = 'Hello {{name}}, your age is {{age}} and {{name}} again.';
        const names = extractVariableNames(content);

        expect(names).toHaveLength(2);
        expect(names).toContain('name');
        expect(names).toContain('age');
    });

    test('returns empty array for content with no variables', () => {
        const content = 'This has no variables.';
        const names = extractVariableNames(content);

        expect(names).toEqual([]);
    });

    test('handles empty content', () => {
        expect(extractVariableNames('')).toEqual([]);
    });
});

describe('hasVariables', () => {
    test('returns true when variables are present', () => {
        expect(hasVariables('Hello {{name}}')).toBe(true);
        expect(hasVariables('{{var1}} and {{var2}}')).toBe(true);
        expect(hasVariables('Text with {{variable}} in middle')).toBe(true);
    });

    test('returns false when no variables are present', () => {
        expect(hasVariables('Just regular text')).toBe(false);
        expect(hasVariables('Text with {single} braces')).toBe(false);
        expect(hasVariables('')).toBe(false);
    });

    test('handles null/undefined input', () => {
        expect(hasVariables(null as unknown as string)).toBe(false);
        expect(hasVariables(undefined as unknown as string)).toBe(false);
    });

    test('handles malformed syntax', () => {
        expect(hasVariables('{{incomplete')).toBe(false);
        expect(hasVariables('incomplete}}')).toBe(false);
        expect(hasVariables('{single}')).toBe(false);
    });
});