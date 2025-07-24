import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  updateVariable,
  extractVariablesFromPrompts,
  synchronizeVariables,
  Project,
  Prompt,
  Variable,
  updateCurrentVersion,
} from '@/lib/storage';
import { processTemplate } from '@/lib/variableUtils';

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

describe('ProjectContext Variable Operations Integration', () => {
  let testProject: Project;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    
    // Create a test project
    testProject = {
      uid: 'test-project-uid',
      name: 'Test Project',
      currentVersion: 1,
      versions: [
        {
          id: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          description: '',
          data: {
            prompts: [
              { id: 1, role: 'system', content: 'You are a helpful assistant.' }
            ],
            messages: [],
            variables: [],
          },
        },
      ],
    };
  });

  describe('updateVariable integration', () => {
    it('should update a variable value in the current project', () => {
      const updatedProject = updateVariable(testProject, 'testVar', 'test value');
      
      const currentVersion = updatedProject.versions.find(
        v => v.id === updatedProject.currentVersion
      );
      
      expect(currentVersion?.data.variables).toContainEqual({
        name: 'testVar',
        value: 'test value'
      });
    });

    it('should update existing variable value', () => {
      // Add initial variable
      let updatedProject = updateVariable(testProject, 'testVar', 'initial value');
      
      // Update the same variable
      updatedProject = updateVariable(updatedProject, 'testVar', 'updated value');

      const currentVersion = updatedProject.versions.find(
        v => v.id === updatedProject.currentVersion
      );
      
      expect(currentVersion?.data.variables).toHaveLength(1);
      expect(currentVersion?.data.variables).toContainEqual({
        name: 'testVar',
        value: 'updated value'
      });
    });
  });

  describe('getDetectedVariables integration', () => {
    it('should return empty array when no variables are detected', () => {
      const detectedVariables = extractVariablesFromPrompts(testProject.versions[0].data.prompts);
      expect(detectedVariables).toEqual([]);
    });

    it('should return detected variables from prompts', () => {
      const promptsWithVariables: Prompt[] = [
        { id: 1, role: 'system', content: 'Hello {{name}}, your age is {{age}}' },
        { id: 2, role: 'user', content: 'My name is {{name}}' }
      ];

      const detectedVariables = extractVariablesFromPrompts(promptsWithVariables);

      expect(detectedVariables).toContain('name');
      expect(detectedVariables).toContain('age');
      expect(detectedVariables).toHaveLength(2);
    });

    it('should handle prompts without variables', () => {
      const promptsWithoutVariables: Prompt[] = [
        { id: 1, role: 'system', content: 'Hello world' },
        { id: 2, role: 'user', content: 'No variables here' }
      ];

      const detectedVariables = extractVariablesFromPrompts(promptsWithoutVariables);
      expect(detectedVariables).toEqual([]);
    });
  });

  describe('processPromptsWithVariables integration', () => {
    it('should process prompts and replace variables with values', () => {
      const promptsWithVariables: Prompt[] = [
        { id: 1, role: 'system', content: 'Hello {{name}}, your age is {{age}}' }
      ];

      const variables: Variable[] = [
        { name: 'name', value: 'John' },
        { name: 'age', value: '25' }
      ];

      const processedPrompts = promptsWithVariables.map(prompt => ({
        ...prompt,
        content: processTemplate(prompt.content, variables)
      }));

      expect(processedPrompts).toHaveLength(1);
      expect(processedPrompts[0].content).toBe('Hello John, your age is 25');
    });

    it('should handle prompts without variables', () => {
      const promptsWithoutVariables: Prompt[] = [
        { id: 1, role: 'system', content: 'Hello world, no variables here' }
      ];

      const variables: Variable[] = [];

      const processedPrompts = promptsWithoutVariables.map(prompt => ({
        ...prompt,
        content: processTemplate(prompt.content, variables)
      }));

      expect(processedPrompts).toHaveLength(1);
      expect(processedPrompts[0].content).toBe('Hello world, no variables here');
    });

    it('should handle missing variable values', () => {
      const promptsWithVariables: Prompt[] = [
        { id: 1, role: 'system', content: 'Hello {{name}}, your age is {{age}}' }
      ];

      const variables: Variable[] = [
        { name: 'name', value: 'John' }
        // age variable is missing
      ];

      const processedPrompts = promptsWithVariables.map(prompt => ({
        ...prompt,
        content: processTemplate(prompt.content, variables)
      }));

      expect(processedPrompts[0].content).toBe('Hello John, your age is ');
    });
  });

  describe('Variable synchronization integration', () => {
    it('should synchronize variables when prompts are updated', () => {
      // Start with a project that has prompts with variables
      const projectWithVariablePrompts = updateCurrentVersion(testProject, {
        prompts: [
          { id: 1, role: 'system', content: 'Hello {{name}}' },
          { id: 2, role: 'user', content: 'My age is {{age}}' }
        ]
      });

      // Synchronize variables
      const synchronizedProject = synchronizeVariables(projectWithVariablePrompts);

      const currentVersion = synchronizedProject.versions.find(
        v => v.id === synchronizedProject.currentVersion
      );

      expect(currentVersion?.data.variables).toContainEqual({
        name: 'name',
        value: ''
      });
      expect(currentVersion?.data.variables).toContainEqual({
        name: 'age',
        value: ''
      });
    });

    it('should preserve existing variable values during synchronization', () => {
      // Start with a project that has existing variables
      let projectWithVariables = updateVariable(testProject, 'existingVar', 'existing value');
      
      // Update prompts to include new variables
      projectWithVariables = updateCurrentVersion(projectWithVariables, {
        prompts: [
          { id: 1, role: 'system', content: 'Hello {{existingVar}} and {{newVar}}' }
        ]
      });

      // Synchronize variables
      const synchronizedProject = synchronizeVariables(projectWithVariables);

      const currentVersion = synchronizedProject.versions.find(
        v => v.id === synchronizedProject.currentVersion
      );

      // Should preserve existing variable value and add new variable with empty value
      expect(currentVersion?.data.variables).toContainEqual({
        name: 'existingVar',
        value: 'existing value'
      });
      expect(currentVersion?.data.variables).toContainEqual({
        name: 'newVar',
        value: ''
      });
    });

    it('should remove variables that are no longer in prompts', () => {
      // Start with variables
      let projectWithVariables = updateVariable(testProject, 'var1', 'value1');
      projectWithVariables = updateVariable(projectWithVariables, 'var2', 'value2');

      // Update prompts to only include one variable
      projectWithVariables = updateCurrentVersion(projectWithVariables, {
        prompts: [
          { id: 1, role: 'system', content: 'Only {{var1}} remains' }
        ]
      });

      // Synchronize variables
      const synchronizedProject = synchronizeVariables(projectWithVariables);

      const currentVersion = synchronizedProject.versions.find(
        v => v.id === synchronizedProject.currentVersion
      );

      // Should only have var1
      expect(currentVersion?.data.variables).toHaveLength(1);
      expect(currentVersion?.data.variables).toContainEqual({
        name: 'var1',
        value: 'value1'
      });
    });

    it('should handle empty prompts', () => {
      // Start with variables
      let projectWithVariables = updateVariable(testProject, 'var1', 'value1');

      // Clear all prompts
      projectWithVariables = updateCurrentVersion(projectWithVariables, {
        prompts: []
      });

      // Synchronize variables
      const synchronizedProject = synchronizeVariables(projectWithVariables);

      const currentVersion = synchronizedProject.versions.find(
        v => v.id === synchronizedProject.currentVersion
      );

      // Should have no variables
      expect(currentVersion?.data.variables).toEqual([]);
    });
  });
});