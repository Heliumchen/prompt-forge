import { Variable } from './storage';

export interface DetectedVariable {
  name: string;
  positions: Array<{ start: number; end: number }>;
}

export interface VariableDetectionResult {
  variables: DetectedVariable[];
  hasVariables: boolean;
}

/**
 * Regex pattern to match {{variable}} syntax
 * Captures variable names that contain alphanumeric characters and underscores
 */
const VARIABLE_PATTERN = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;

/**
 * Detects variables in the given content using {{variable}} syntax
 * @param content - The text content to scan for variables
 * @returns VariableDetectionResult containing detected variables and their positions
 */
export function detectVariables(content: string): VariableDetectionResult {
  if (!content || typeof content !== 'string') {
    return { variables: [], hasVariables: false };
  }

  const variableMap = new Map<string, DetectedVariable>();
  let match;

  // Reset regex lastIndex to ensure consistent behavior
  VARIABLE_PATTERN.lastIndex = 0;

  while ((match = VARIABLE_PATTERN.exec(content)) !== null) {
    const variableName = match[1];
    const start = match.index;
    const end = match.index + match[0].length;

    if (variableMap.has(variableName)) {
      // Add position to existing variable
      variableMap.get(variableName)!.positions.push({ start, end });
    } else {
      // Create new variable entry
      variableMap.set(variableName, {
        name: variableName,
        positions: [{ start, end }]
      });
    }
  }

  const variables = Array.from(variableMap.values());
  return {
    variables,
    hasVariables: variables.length > 0
  };
}

/**
 * Processes a template by replacing {{variable}} placeholders with their values
 * @param template - The template string containing variable placeholders
 * @param variables - Array of Variable objects with names and values
 * @returns Processed template with variables replaced by their values
 */
export function processTemplate(template: string, variables: Variable[]): string {
  if (!template || typeof template !== 'string') {
    return template || '';
  }

  if (!variables || variables.length === 0) {
    // Replace all variables with empty strings if no variables provided
    return template.replace(VARIABLE_PATTERN, '');
  }

  // Create a map for quick variable lookup
  const variableMap = new Map<string, string>();
  variables.forEach(variable => {
    if (variable && typeof variable.name === 'string') {
      variableMap.set(variable.name, variable.value || '');
    }
  });

  // Replace variables with their values
  return template.replace(VARIABLE_PATTERN, (match, variableName) => {
    return variableMap.get(variableName) || '';
  });
}

/**
 * Validates a variable name according to the allowed pattern
 * Variable names must start with a letter or underscore, followed by letters, numbers, or underscores
 * @param name - The variable name to validate
 * @returns true if the variable name is valid, false otherwise
 */
export function isValidVariableName(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }

  // Check if name matches the allowed pattern
  const namePattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  return namePattern.test(name);
}

/**
 * Sanitizes a variable name by removing invalid characters
 * @param name - The variable name to sanitize
 * @returns Sanitized variable name that follows the valid pattern
 */
export function sanitizeVariableName(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }

  // Remove all characters that are not alphanumeric or underscore
  let sanitized = name.replace(/[^a-zA-Z0-9_]/g, '');

  // Ensure it starts with a letter or underscore
  if (sanitized && !/^[a-zA-Z_]/.test(sanitized)) {
    sanitized = '_' + sanitized;
  }

  return sanitized;
}

/**
 * Extracts unique variable names from content
 * @param content - The text content to scan for variables
 * @returns Array of unique variable names found in the content
 */
export function extractVariableNames(content: string): string[] {
  const detection = detectVariables(content);
  return detection.variables.map(variable => variable.name);
}

/**
 * Checks if a template contains any variables
 * @param template - The template string to check
 * @returns true if the template contains variables, false otherwise
 */
export function hasVariables(template: string): boolean {
  if (!template || typeof template !== 'string') {
    return false;
  }

  VARIABLE_PATTERN.lastIndex = 0;
  return VARIABLE_PATTERN.test(template);
}