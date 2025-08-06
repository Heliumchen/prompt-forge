# Implementation Plan

- [x] 1. Create test set data models and storage utilities
  - Define TypeScript interfaces for TestSet, TestCase, and TestResult
  - Implement localStorage-based CRUD operations for test sets
  - Create utility functions for test set data validation and migration
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 2. Implement TestSetContext for state management
  - Create TestSetContext with React Context pattern similar to ProjectContext
  - Implement test set CRUD operations (create, read, update, delete)
  - Add test case management functions (add, update, delete test cases)
  - Implement variable synchronization logic with project versions
  - _Requirements: 1.1, 1.2, 3.1, 3.2, 3.3, 3.4, 8.1, 8.2, 8.3, 8.4_

- [x] 3. Create NavTestSets sidebar component
  - Implement test set navigation component parallel to NavProjects
  - Add test set creation, selection, and deletion functionality
  - Include project association selection in test set creation dialog
  - Integrate with existing sidebar structure in app-sidebar.tsx
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 4. Build core table components for test set interface
- [x] 4.1 Create TestSetTable component
  - Implement dynamic table with variable columns based on test set structure
  - Add editable cells for test case variable values
  - Create result cells with run buttons and status indicators
  - Handle table rendering performance for large test sets
  - _Requirements: 1.1, 1.3, 8.1, 8.2_

- [x] 4.2 Create TestCaseRow component
  - Implement individual row rendering with variable value inputs
  - Add result cells showing test execution status and results
  - Handle row-level operations (delete test case)
  - Implement proper input validation and error display
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 4.3 Create ResultCell component
  - Display test results or run button based on execution status
  - Show loading states during test execution
  - Handle error display for failed tests
  - Implement retry functionality for failed tests
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 5. Implement variable synchronization functionality
- [x] 5.1 Create VariableSyncDialog component
  - Build modal interface for version selection and synchronization
  - Implement conflict resolution UI for variable changes
  - Add confirmation dialogs for destructive operations (variable removal)
  - Display preview of synchronization changes
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 5.2 Implement synchronization logic
  - Create functions to detect variable differences between test set and project version
  - Implement merge logic for adding new variables and removing unused ones
  - Handle test case data updates during synchronization
  - Add validation for synchronization operations
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 6. Build test execution system
- [x] 6.1 Implement single test execution
  - Create function to execute individual test cases
  - Integrate with OpenRouterService for LLM API calls
  - Process prompts with test case variables using processTemplate()
  - Store and display test results in result cells
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 6.2 Implement batch test execution
  - Create batch execution system with concurrency control (limit to 3)
  - Add progress tracking and real-time UI updates
  - Implement queue management for pending tests
  - Add cancellation support for batch operations
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 6.3 Add error handling for test execution
  - Handle API failures, network errors, and rate limiting
  - Implement retry mechanisms for failed tests
  - Display detailed error messages in result cells
  - Add logging for debugging test execution issues
  - _Requirements: 4.4, 5.4_

- [x] 7. Create test set control components
- [x] 7.1 Build TestSetControls toolbar
  - Add version selection dropdown for target testing
  - Implement "Run All" button with batch execution
  - Add variable synchronization trigger button
  - Include test set management controls (add/remove test cases)
  - _Requirements: 4.1, 5.1, 8.1, 8.3_

- [x] 7.2 Implement comparison functionality
  - Add comparison column management (add/remove comparison versions)
  - Create version selection interface for comparison columns
  - Implement separate result storage for different versions
  - Display comparison results side by side in table
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 8. Create main TestSetView component
  - Integrate all test set components into main interface
  - Handle test set selection and display
  - Coordinate between table, controls, and synchronization components
  - Implement proper loading states and error boundaries
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 9. Add test set data management features
- [x] 9.1 Implement test case CRUD operations
  - Add functionality to create new test cases (table rows)
  - Enable editing of variable values in test cases
  - Implement test case deletion with confirmation
  - Add bulk operations for test case management
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 9.2 Add result management
  - Implement result clearing functionality
  - Add result export capabilities
  - Handle result data cleanup for deleted test cases
  - Implement result history management
  - _Requirements: 8.4, 7.3_

- [x] 10. Integrate test sets with main application
- [x] 10.1 Update app-sidebar.tsx
  - Add TestSets section parallel to Projects section
  - Integrate NavTestSets component into sidebar
  - Handle navigation between projects and test sets
  - Maintain consistent sidebar styling and behavior
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 10.2 Update main page routing
  - Add test set view to main application page
  - Handle switching between project view and test set view
  - Implement proper state management for view switching
  - Ensure proper cleanup when switching views
  - _Requirements: 2.3, 8.1_

- [ ] 11. Add comprehensive error handling and validation
  - Implement input validation for test set names and variable values
  - Add error boundaries for test set components
  - Handle localStorage failures gracefully
  - Implement data consistency checks and recovery
  - _Requirements: 7.4, 8.2_

- [ ] 12. Write comprehensive tests
- [ ] 12.1 Create unit tests for data models and utilities
  - Test test set CRUD operations and data validation
  - Test variable synchronization logic
  - Test template processing with test case variables
  - Test error handling scenarios
  - _Requirements: 1.1, 3.1, 7.1_

- [ ] 12.2 Create component tests
  - Test table rendering with dynamic columns
  - Test cell editing functionality and validation
  - Test test execution UI states and error display
  - Test synchronization dialog functionality
  - _Requirements: 4.1, 5.1, 8.1_

- [ ] 12.3 Create integration tests
  - Test complete test set creation and management workflow
  - Test variable synchronization with project versions
  - Test batch execution with mock API responses
  - Test data persistence across browser sessions
  - _Requirements: 2.4, 3.1, 5.1, 7.2_