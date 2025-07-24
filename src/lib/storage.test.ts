import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  Project,
  Version as _Version,
  VersionData as _VersionData,
  Prompt,
  Variable,
  extractVariablesFromPrompts,
  mergeVariables,
  updateVariables,
  updateVariable,
  synchronizeVariables,
  createNewVersion as _createNewVersion,
  updateCurrentVersion as _updateCurrentVersion
} from './storage';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Variable Management Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractVariablesFromPrompts', () => {
    it('should extract unique variable names from prompts', () => {
      const prompts: Prompt[] = [
        { id: 1, role: 'system', content: 'Hello {{name}}, welcome to {{app}}!' },
        { id: 2, role: 'user', content: 'My name is {{name}} and I like {{hobby}}' },
        { id: 3, role: 'assistant', content: 'Nice to meet you {{name}}!' }
      ];

      const result = extractVariablesFromPrompts(prompts);
      expect(result).toEqual(['app', 'hobby', 'name']);
    });

    it('should return empty array for empty prompts', () => {
      expect(extractVariablesFromPrompts([])).toEqual([]);
      expect(extractVariablesFromPrompts(null as unknown as Prompt[])).toEqual([]);
      expect(extractVariablesFromPrompts(undefined as unknown as Prompt[])).toEqual([]);
    });

    it('should handle prompts without variables', () => {
      const prompts: Prompt[] = [
        { id: 1, role: 'system', content: 'Hello world!' },
        { id: 2, role: 'user', content: 'No variables here' }
      ];

      const result = extractVariablesFromPrompts(prompts);
      expect(result).toEqual([]);
    });

    it('should ignore malformed variable syntax', () => {
      const prompts: Prompt[] = [
        { id: 1, role: 'system', content: 'Valid {{name}} and invalid {name} and {{}}' },
        { id: 2, role: 'user', content: 'Also invalid {{ name }} with spaces' }
      ];

      const result = extractVariablesFromPrompts(prompts);
      expect(result).toEqual(['name']);
    });

    it('should handle prompts with null or undefined content', () => {
      const prompts: Prompt[] = [
        { id: 1, role: 'system', content: 'Valid {{name}}' },
        { id: 2, role: 'user', content: null as unknown as string },
        { id: 3, role: 'assistant', content: undefined as unknown as string },
        { id: 4, role: 'user', content: 'Another {{variable}}' }
      ];

      const result = extractVariablesFromPrompts(prompts);
      expect(result).toEqual(['name', 'variable']);
    });

    it('should sort variable names alphabetically', () => {
      const prompts: Prompt[] = [
        { id: 1, role: 'system', content: '{{zebra}} {{apple}} {{banana}}' }
      ];

      const result = extractVariablesFromPrompts(prompts);
      expect(result).toEqual(['apple', 'banana', 'zebra']);
    });
  });

  describe('mergeVariables', () => {
    it('should merge detected names with existing variables', () => {
      const detectedNames = ['name', 'age', 'city'];
      const existingVariables: Variable[] = [
        { name: 'name', value: 'John' },
        { name: 'hobby', value: 'reading' }
      ];

      const result = mergeVariables(detectedNames, existingVariables);
      expect(result).toEqual([
        { name: 'age', value: '' },
        { name: 'city', value: '' },
        { name: 'name', value: 'John' }
      ]);
    });

    it('should handle empty detected names', () => {
      const existingVariables: Variable[] = [
        { name: 'name', value: 'John' }
      ];

      const result = mergeVariables([], existingVariables);
      expect(result).toEqual([]);
    });

    it('should handle empty existing variables', () => {
      const detectedNames = ['name', 'age'];

      const result = mergeVariables(detectedNames, []);
      expect(result).toEqual([
        { name: 'age', value: '' },
        { name: 'name', value: '' }
      ]);
    });

    it('should handle null/undefined inputs', () => {
      expect(mergeVariables(null as unknown as string[], null as unknown as Variable[])).toEqual([]);
      expect(mergeVariables(undefined as unknown as string[], undefined as unknown as Variable[])).toEqual([]);
      expect(mergeVariables(['name'], null as unknown as Variable[])).toEqual([{ name: 'name', value: '' }]);
      expect(mergeVariables(null as unknown as string[], [{ name: 'name', value: 'John' }])).toEqual([]);
    });

    it('should filter out invalid variable names', () => {
      const detectedNames = ['valid_name', '', null as unknown as string, undefined as unknown as string, 'another_valid'];
      const existingVariables: Variable[] = [
        { name: 'valid_name', value: 'test' },
        { name: null as unknown as string, value: 'invalid' },
        { name: '', value: 'empty' }
      ];

      const result = mergeVariables(detectedNames, existingVariables);
      expect(result).toEqual([
        { name: 'another_valid', value: '' },
        { name: 'valid_name', value: 'test' }
      ]);
    });

    it('should sort results alphabetically', () => {
      const detectedNames = ['zebra', 'apple', 'banana'];
      const existingVariables: Variable[] = [];

      const result = mergeVariables(detectedNames, existingVariables);
      expect(result).toEqual([
        { name: 'apple', value: '' },
        { name: 'banana', value: '' },
        { name: 'zebra', value: '' }
      ]);
    });

    it('should handle duplicate names in detected array', () => {
      const detectedNames = ['name', 'name', 'age', 'name'];
      const existingVariables: Variable[] = [];

      const result = mergeVariables(detectedNames, existingVariables);
      expect(result).toEqual([
        { name: 'age', value: '' },
        { name: 'name', value: '' }
      ]);
    });
  });

  describe('updateVariables', () => {
    let mockProject: Project;

    beforeEach(() => {
      const now = new Date().toISOString();
      mockProject = {
        uid: 'test-project',
        name: 'Test Project',
        currentVersion: 1,
        versions: [{
          id: 1,
          createdAt: now,
          updatedAt: now,
          description: 'Initial version',
          data: {
            prompts: [],
            messages: [],
            variables: [
              { name: 'existing', value: 'old value' }
            ]
          }
        }]
      };
    });

    it('should update variables in current version', () => {
      const newVariables: Variable[] = [
        { name: 'name', value: 'John' },
        { name: 'age', value: '25' }
      ];

      const result = updateVariables(mockProject, newVariables);
      
      expect(result.versions[0].data.variables).toEqual(newVariables);
      // Check that the updatedAt timestamp is a valid ISO string (indicating it was updated)
      expect(result.versions[0].updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should handle empty variables array', () => {
      const result = updateVariables(mockProject, []);
      
      expect(result.versions[0].data.variables).toEqual([]);
    });

    it('should handle null/undefined variables', () => {
      const result = updateVariables(mockProject, null as unknown as Variable[]);
      
      expect(result.versions[0].data.variables).toEqual([]);
    });

    it('should filter out invalid variables', () => {
      const variables: Variable[] = [
        { name: 'valid', value: 'test' },
        { name: '', value: 'invalid empty name' },
        { name: null as unknown as string, value: 'invalid null name' },
        { name: 'valid2', value: null as unknown as string },
        { name: 'valid3', value: undefined as unknown as string }
      ];

      const result = updateVariables(mockProject, variables);
      
      expect(result.versions[0].data.variables).toEqual([
        { name: 'valid', value: 'test' }
      ]);
    });

    it('should throw error for null project', () => {
      expect(() => updateVariables(null as unknown as Project, [])).toThrow('Project is required');
    });
  });

  describe('updateVariable', () => {
    let mockProject: Project;

    beforeEach(() => {
      const now = new Date().toISOString();
      mockProject = {
        uid: 'test-project',
        name: 'Test Project',
        currentVersion: 1,
        versions: [{
          id: 1,
          createdAt: now,
          updatedAt: now,
          description: 'Initial version',
          data: {
            prompts: [],
            messages: [],
            variables: [
              { name: 'existing', value: 'old value' }
            ]
          }
        }]
      };
    });

    it('should update existing variable value', () => {
      const result = updateVariable(mockProject, 'existing', 'new value');
      
      expect(result.versions[0].data.variables).toEqual([
        { name: 'existing', value: 'new value' }
      ]);
    });

    it('should add new variable if it does not exist', () => {
      const result = updateVariable(mockProject, 'new_var', 'new value');
      
      expect(result.versions[0].data.variables).toEqual([
        { name: 'existing', value: 'old value' },
        { name: 'new_var', value: 'new value' }
      ]);
    });

    it('should handle empty string value', () => {
      const result = updateVariable(mockProject, 'existing', '');
      
      expect(result.versions[0].data.variables).toEqual([
        { name: 'existing', value: '' }
      ]);
    });

    it('should convert non-string values to empty string', () => {
      const result = updateVariable(mockProject, 'existing', null as unknown as string);
      
      expect(result.versions[0].data.variables).toEqual([
        { name: 'existing', value: '' }
      ]);
    });

    it('should throw error for null project', () => {
      expect(() => updateVariable(null as unknown as Project, 'name', 'value')).toThrow('Project is required');
    });

    it('should throw error for invalid variable name', () => {
      expect(() => updateVariable(mockProject, '', 'value')).toThrow('Variable name is required and must be a string');
      expect(() => updateVariable(mockProject, null as unknown as string, 'value')).toThrow('Variable name is required and must be a string');
    });

    it('should throw error if current version not found', () => {
      const invalidProject = { ...mockProject, currentVersion: 999 };
      expect(() => updateVariable(invalidProject, 'name', 'value')).toThrow('Current version not found');
    });
  });

  describe('synchronizeVariables', () => {
    let mockProject: Project;

    beforeEach(() => {
      const now = new Date().toISOString();
      mockProject = {
        uid: 'test-project',
        name: 'Test Project',
        currentVersion: 1,
        versions: [{
          id: 1,
          createdAt: now,
          updatedAt: now,
          description: 'Initial version',
          data: {
            prompts: [
              { id: 1, role: 'system', content: 'Hello {{name}}!' },
              { id: 2, role: 'user', content: 'I am {{age}} years old and live in {{city}}' }
            ],
            messages: [],
            variables: [
              { name: 'name', value: 'John' },
              { name: 'old_var', value: 'should be removed' }
            ]
          }
        }]
      };
    });

    it('should synchronize variables based on prompts', () => {
      const result = synchronizeVariables(mockProject);
      
      expect(result.versions[0].data.variables).toEqual([
        { name: 'age', value: '' },
        { name: 'city', value: '' },
        { name: 'name', value: 'John' }
      ]);
    });

    it('should handle project with no prompts', () => {
      mockProject.versions[0].data.prompts = [];
      
      const result = synchronizeVariables(mockProject);
      
      expect(result.versions[0].data.variables).toEqual([]);
    });

    it('should handle project with no existing variables', () => {
      mockProject.versions[0].data.variables = [];
      
      const result = synchronizeVariables(mockProject);
      
      expect(result.versions[0].data.variables).toEqual([
        { name: 'age', value: '' },
        { name: 'city', value: '' },
        { name: 'name', value: '' }
      ]);
    });

    it('should throw error for null project', () => {
      expect(() => synchronizeVariables(null as unknown as Project)).toThrow('Project is required');
    });

    it('should throw error if current version not found', () => {
      const invalidProject = { ...mockProject, currentVersion: 999 };
      expect(() => synchronizeVariables(invalidProject)).toThrow('Current version not found');
    });
  });
});