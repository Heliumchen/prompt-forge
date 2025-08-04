# Design Document

## Overview

The Test Sets feature extends Prompt Forge with systematic testing capabilities, allowing users to create tabular test cases with variables and run batch evaluations against different project versions. The feature integrates seamlessly with the existing local-first architecture and provides a comprehensive testing interface for prompt optimization.

## Architecture

### Data Model Extensions

The feature introduces new data structures that integrate with the existing storage system:

**Data Structure Logic:**
- `TestSet.variableNames`: Defines the table structure - which variable columns exist and their order
- `TestCase.variableValues`: Contains the actual values for each variable in this specific test case
- This separation allows for flexible table management where we can add/remove columns (variableNames) and each test case maintains its own variable values

```typescript
// Test result stores the output and metadata for a test execution
interface TestResult {
  id: string;
  content: string;
  timestamp: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  error?: string;
  executionTime?: number;
}

// Test case represents a single row in the test set table
interface TestCase {
  id: string;
  variableValues: Record<string, string>; // variable name -> value mapping for this test case
  results: Record<string, TestResult>; // version identifier -> result
}

// Test set contains the complete test configuration and data
interface TestSet {
  uid: string;
  name: string;
  associatedProjectUid: string;
  variableNames: string[]; // ordered list of variable names for table columns (defines table structure)
  testCases: TestCase[];
  createdAt: string;
  updatedAt: string;
}
```

### Storage Integration

Test sets will be stored in localStorage using a similar pattern to projects:

- Storage key: `'prompt-forge-test-sets'`
- CRUD operations: `getTestSets()`, `saveTestSet()`, `deleteTestSet()`
- Data persistence follows the same local-first principles as projects

### Context Integration

A new `TestSetContext` will be created following the same pattern as `ProjectContext`:

```typescript
interface TestSetContextType {
  testSets: TestSet[];
  currentTestSet: TestSet | null;
  setCurrentTestSet: (testSet: TestSet | null) => void;
  addTestSet: (name: string, associatedProjectUid: string) => void;
  updateTestSet: (testSet: TestSet) => void;
  deleteTestSet: (uid: string) => void;
  // Test case management
  addTestCase: (testSetUid: string) => void;
  updateTestCase: (testSetUid: string, caseId: string, variables: Record<string, string>) => void;
  deleteTestCase: (testSetUid: string, caseId: string) => void;
  // Variable synchronization
  syncVariablesFromVersion: (testSetUid: string, projectUid: string, versionId: number) => void;
  // Test execution
  runSingleTest: (testSetUid: string, caseId: string, targetVersion: number) => Promise<void>;
  runAllTests: (testSetUid: string, targetVersion: number) => Promise<void>;
}
```

## Components and Interfaces

### Sidebar Navigation Extension

The existing `app-sidebar.tsx` will be extended to include a Test Sets section parallel to Projects:

```typescript
// New component: NavTestSets
export function NavTestSets() {
  // Similar structure to NavProjects
  // Displays list of test sets with CRUD operations
  // Allows selection of current test set
}
```

### Main Test Set Interface

A new main interface component for test set management:

```typescript
// TestSetView component - main interface for test set interaction
export function TestSetView() {
  // Renders the tabular interface
  // Handles test execution
  // Manages variable synchronization
  // Provides comparison functionality
}
```

### Table Components

Specialized table components for test set data:

```typescript
// TestSetTable - main table component
export function TestSetTable() {
  // Renders dynamic table with variable columns
  // Handles cell editing for test cases
  // Displays results and status indicators
}

// TestCaseRow - individual row component
export function TestCaseRow() {
  // Editable cells for variable values
  // Result cells with run buttons
  // Status indicators for test execution
}

// ResultCell - specialized cell for test results
export function ResultCell() {
  // Displays test results or run button
  // Shows loading states during execution
  // Handles error display
}
```

### Control Components

Additional UI components for test set management:

```typescript
// TestSetControls - toolbar for test set operations
export function TestSetControls() {
  // Version selection for target testing
  // Batch run controls
  // Variable synchronization options
}

// VariableSyncDialog - modal for variable synchronization
export function VariableSyncDialog() {
  // Version selection interface
  // Conflict resolution for variable changes
  // Confirmation for destructive operations
}
```

## Data Models

### Test Execution Flow

1. **Single Test Execution:**
   - User clicks run button in result cell
   - System retrieves target version prompts and variables
   - Variables are merged with test case values
   - Prompts are processed using `processTemplate()`
   - LLM API call is made using existing OpenRouter integration
   - Result is stored and displayed in the cell

2. **Batch Test Execution:**
   - User clicks "Run All" button
   - System identifies test cases without results for target version
   - Tests are queued with concurrency limit of 3
   - Each test follows single test execution flow
   - Progress is tracked and displayed
   - Results are updated in real-time

### Variable Synchronization Logic

```typescript
// Synchronization algorithm
function syncVariables(testSet: TestSet, projectVersion: Version): {
  updatedTestSet: TestSet;
  conflicts: VariableConflict[];
} {
  const currentVariables = new Set(testSet.variableNames);
  const versionVariables = new Set(extractVariablesFromPrompts(projectVersion.data.prompts));
  
  const toAdd = Array.from(versionVariables).filter(v => !currentVariables.has(v));
  const toRemove = Array.from(currentVariables).filter(v => !versionVariables.has(v));
  
  return {
    updatedTestSet: {
      ...testSet,
      variableNames: Array.from(versionVariables).sort(),
      testCases: testSet.testCases.map(testCase => ({
        ...testCase,
        variableValues: filterAndExtendVariables(testCase.variableValues, versionVariables)
      }))
    },
    conflicts: toRemove.map(variable => ({ type: 'removal', variable }))
  };
}
```

## Error Handling

### Test Execution Errors

- **API Failures:** Network errors, rate limiting, authentication issues
- **Template Errors:** Invalid variable references, malformed templates
- **Validation Errors:** Missing required variables, invalid variable values

Error handling strategy:
- Store error messages in TestResult objects
- Display errors inline in result cells
- Provide retry mechanisms for failed tests
- Log detailed error information for debugging

### Data Consistency

- **Version Conflicts:** Handle cases where referenced project versions are deleted
- **Variable Mismatches:** Graceful handling of variable synchronization conflicts
- **Storage Failures:** Fallback mechanisms for localStorage issues

## Testing Strategy

### Unit Tests

- Test data model operations (CRUD for test sets and test cases)
- Variable synchronization logic
- Template processing with test case variables
- Error handling scenarios

### Integration Tests

- Test set creation and management workflow
- Variable synchronization with project versions
- Test execution with mock LLM responses
- Result storage and retrieval

### Component Tests

- Table rendering with dynamic columns
- Cell editing functionality
- Test execution UI states
- Error display and handling

### End-to-End Tests

- Complete test set creation workflow
- Batch test execution scenarios
- Version comparison functionality
- Data persistence across sessions

## Performance Considerations

### Batch Execution Optimization

- **Concurrency Control:** Limit to 3 concurrent API calls to respect rate limits
- **Progress Tracking:** Real-time updates without blocking UI
- **Cancellation Support:** Allow users to stop batch execution
- **Memory Management:** Efficient handling of large result sets

### Table Rendering Performance

- **Virtual Scrolling:** For large test sets with many cases
- **Lazy Loading:** Load results on demand
- **Memoization:** Optimize re-renders for table cells
- **Debounced Updates:** Batch variable value changes

### Storage Optimization

- **Incremental Saves:** Only save changed data
- **Compression:** Consider compressing large result sets
- **Cleanup:** Remove orphaned test results
- **Migration:** Handle data format changes gracefully

## Security Considerations

### Data Privacy

- All test data remains in localStorage (local-first principle)
- No test case data or results sent to external servers
- API keys handled through existing secure mechanisms

### Input Validation

- Sanitize variable names and values
- Validate test set configurations
- Prevent injection attacks in template processing
- Validate imported test set data

## Integration Points

### Existing Systems

- **Project Context:** Read project data and versions for testing
- **OpenRouter Integration:** Use existing OpenRouterService for LLM API calls
- **Variable Processing:** Leverage existing `processTemplate()` function
- **Storage System:** Extend existing localStorage patterns
- **UI Components:** Use shadcn/ui components for consistency

### Future Extensions

- **Export/Import:** Test set data export/import functionality
- **Templates:** Predefined test set templates
- **Analytics:** Test result analysis and reporting
- **Collaboration:** Sharing test sets (future consideration)

## Migration Strategy

### Initial Implementation

1. Create new data models and storage functions
2. Implement TestSetContext with basic CRUD operations
3. Add Test Sets section to sidebar navigation
4. Create basic table interface for test case management
5. Implement variable synchronization
6. Add single test execution capability
7. Implement batch testing with concurrency control
8. Add comparison functionality

### Rollout Approach

- Feature will be additive - no changes to existing functionality
- Test sets are optional - users can continue using existing features
- Graceful degradation if localStorage is unavailable
- Clear user feedback for any migration issues