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

/**
 * Extracts variable value from system message by comparing with prompt template
 * @param promptTemplate - The prompt template containing the variable
 * @param systemContent - The system message content to extract from
 * @param variableName - The name of the variable to extract
 * @returns The extracted variable value or null if not found
 */
export function extractVariableValueFromSystemMessage(promptTemplate: string, systemContent: string, variableName: string): string | null {
  const variablePattern = `{{${variableName}}}`;
  
  if (!promptTemplate.includes(variablePattern)) {
    return null;
  }
  
  // Use segment-based extraction inspired by your algorithm
  return extractUsingSegments(promptTemplate, systemContent, variableName);
}

/**
 * Extracts variable value using segment-based approach similar to your algorithm
 */
function extractUsingSegments(promptTemplate: string, systemContent: string, variableName: string): string | null {
  const variableRegex = /\{\{([^{}]+)\}\}/g;
  let match;
  
  // Find all variables and their positions in the template
  const variablePositions: { name: string; start: number; end: number }[] = [];
  
  while ((match = variableRegex.exec(promptTemplate)) !== null) {
    variablePositions.push({
      name: match[1],
      start: match.index,
      end: match.index + match[0].length
    });
  }
  
  // If no variables found, return null
  if (variablePositions.length === 0) {
    return null;
  }
  
  // Sort by position
  variablePositions.sort((a, b) => a.start - b.start);
  
  // Create segments: text and variable segments
  const segments: { type: 'text' | 'variable'; content: string; name?: string }[] = [];
  
  // Add first text segment if exists
  if (variablePositions[0].start > 0) {
    segments.push({
      type: 'text',
      content: promptTemplate.substring(0, variablePositions[0].start)
    });
  }
  
  // Add variables and text segments between them
  for (let i = 0; i < variablePositions.length; i++) {
    const variable = variablePositions[i];
    
    // Add the variable segment
    segments.push({
      type: 'variable',
      content: `{{${variable.name}}}`,
      name: variable.name
    });
    
    // Add text segment after variable (if not the last variable)
    if (i < variablePositions.length - 1) {
      const nextVariable = variablePositions[i + 1];
      const textBetween = promptTemplate.substring(variable.end, nextVariable.start);
      if (textBetween) {
        segments.push({
          type: 'text',
          content: textBetween
        });
      }
    }
  }
  
  // Add final text segment if exists
  const lastVariable = variablePositions[variablePositions.length - 1];
  if (lastVariable.end < promptTemplate.length) {
    segments.push({
      type: 'text',
      content: promptTemplate.substring(lastVariable.end)
    });
  }
  
  // Now extract the target variable from system content using segments
  return extractVariableFromSegments(segments, systemContent, variableName);
}

/**
 * Extract variable from segments by matching template structure with content
 */
function extractVariableFromSegments(segments: { type: 'text' | 'variable'; content: string; name?: string }[], systemContent: string, variableName: string): string | null {
  let contentRemaining = systemContent;
  let foundAnyText = false;
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    
    if (segment.type === 'text') {
      // Find this text segment in the remaining content
      const textPos = contentRemaining.indexOf(segment.content);
      
      if (textPos === -1) {
        // Text segment not found - this indicates a structure mismatch
        // We should not extract anything in this case
        return null;
      }
      
      foundAnyText = true;
      
      // If this is the first segment, just skip past it
      if (i === 0) {
        contentRemaining = contentRemaining.substring(textPos + segment.content.length);
        continue;
      }
      
      // If previous segment was our target variable, extract its value
      if (i > 0 && segments[i - 1].type === 'variable' && segments[i - 1].name === variableName) {
        const variableValue = contentRemaining.substring(0, textPos);
        return variableValue.trim();
      }
      
      // Skip past this text segment
      contentRemaining = contentRemaining.substring(textPos + segment.content.length);
      
    } else if (segment.type === 'variable') {
      // This is a variable placeholder - we'll handle it when we find the next text segment
      continue;
    }
  }
  
  // Handle case where the target variable is the last segment
  // But only if we found at least some matching text structure
  if (foundAnyText && segments.length > 0 && segments[segments.length - 1].type === 'variable' && segments[segments.length - 1].name === variableName) {
    return contentRemaining.trim();
  }
  
  return null;
}


/**
 * Extracts all variable values from system message content using prompt templates
 * @param systemContent - The system message content to extract from
 * @param promptTemplates - Array of prompt templates containing variables
 * @returns Record of variable names to their extracted values
 */
export function extractVariablesFromSystemMessage(systemContent: string, promptTemplates: string[]): Record<string, string> {
  const extractedVariables: Record<string, string> = {};

  if (!systemContent || !promptTemplates || promptTemplates.length === 0) {
    return extractedVariables;
  }

  // Extract all variable names from all prompts
  const allVariableNames: string[] = [];
  promptTemplates.forEach(prompt => {
    const variables = extractVariableNames(prompt);
    variables.forEach(varName => {
      if (!allVariableNames.includes(varName)) {
        allVariableNames.push(varName);
      }
    });
  });

  // Extract variable values from system message
  allVariableNames.forEach(varName => {
    for (const prompt of promptTemplates) {
      if (prompt.includes(`{{${varName}}}`)) {
        const value = extractVariableValueFromSystemMessage(prompt, systemContent, varName);
        if (value !== null) {
          extractedVariables[varName] = value;
          break;
        }
      }
    }
  });

  return extractedVariables;
}

/**
 * Extracts all variable values from a single message using a prompt template
 * @param promptTemplate - The prompt template containing variables
 * @param messageContent - The message content to extract from
 * @returns Record of variable names to their extracted values
 */
export function extractVariablesFromMessage(promptTemplate: string, messageContent: string): Record<string, string> {
  const extractedVariables: Record<string, string> = {};

  if (!promptTemplate || !messageContent) {
    return extractedVariables;
  }

  // Extract all variable names from the template
  const variableNames = extractVariableNames(promptTemplate);

  // Extract each variable value from the message
  variableNames.forEach(varName => {
    const value = extractVariableValueFromSystemMessage(promptTemplate, messageContent, varName);
    if (value !== null) {
      extractedVariables[varName] = value;
    }
  });

  return extractedVariables;
}

/**
 * Extracts variables from messages by matching them with prompt templates in order
 * @param prompts - Array of prompt templates with roles (from version data)
 * @param messages - Array of messages to extract from
 * @returns Object containing extracted variables and the count of matched messages
 */
export function extractVariablesFromMessages(
  prompts: Array<{ role: string; content: string }>,
  messages: Array<{ role: string; content: string }>
): { extractedVariables: Record<string, string>; matchedCount: number } {
  const extractedVariables: Record<string, string> = {};
  let matchedCount = 0;

  if (!prompts || prompts.length === 0 || !messages || messages.length === 0) {
    return { extractedVariables, matchedCount };
  }

  // Match prompts with messages in order
  for (let i = 0; i < prompts.length && i < messages.length; i++) {
    const prompt = prompts[i];
    const message = messages[i];

    // Only extract if roles match
    if (prompt.role === message.role) {
      const variables = extractVariablesFromMessage(prompt.content, message.content);
      // Merge extracted variables (later values don't overwrite existing ones)
      Object.entries(variables).forEach(([name, value]) => {
        if (!(name in extractedVariables)) {
          extractedVariables[name] = value;
        }
      });
      matchedCount++;
    } else {
      // If roles don't match, stop matching
      break;
    }
  }

  return { extractedVariables, matchedCount };
}