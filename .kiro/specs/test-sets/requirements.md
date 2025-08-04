# Requirements Document

## Introduction

The Test Set feature enables users to systematically test prompts against predefined test cases with variables, allowing for comprehensive evaluation and comparison of different prompt versions. This feature provides a tabular interface for managing test cases, running tests individually or in batches, and comparing results across different project versions.

## Requirements

### Requirement 1

**User Story:** As a prompt engineer, I want to create test sets with tabular data structure, so that I can organize test cases with variables and results in a clear, structured format.

#### Acceptance Criteria

1. WHEN a user creates a new test set THEN the system SHALL create a table with columns for variables and result columns
2. WHEN a user associates a test set with a project THEN the system SHALL link the test set to that specific project
3. WHEN a user adds test cases THEN the system SHALL allow adding rows with variable values for each case
4. IF a test set exists THEN the system SHALL display it in a tabular format with proper column headers

### Requirement 2

**User Story:** As a prompt engineer, I want to manage test sets through a dedicated sidebar section, so that I can easily navigate and organize my test sets alongside projects.

#### Acceptance Criteria

1. WHEN a user opens the application THEN the system SHALL display a "Test Sets" section in the left sidebar parallel to the Projects section
2. WHEN a user creates a new test set THEN the system SHALL add it to the Test Sets sidebar section
3. WHEN a user clicks on a test set in the sidebar THEN the system SHALL open that test set in the main view
4. WHEN a user creates a test set THEN the system SHALL allow selecting an associated project from available projects

### Requirement 3

**User Story:** As a prompt engineer, I want to synchronize table headers with project version variables, so that my test cases automatically include the relevant variables from my prompts.

#### Acceptance Criteria

1. WHEN a user selects a project version for synchronization THEN the system SHALL automatically create table columns for all variables in that version
2. WHEN a user synchronizes with a version that has fewer variables THEN the system SHALL prompt the user to confirm deletion of unused variable columns
3. WHEN a user synchronizes with a version that has additional variables THEN the system SHALL add new columns for the additional variables
4. IF a test set has no existing variables THEN the system SHALL create all columns based on the selected version without prompts

### Requirement 4

**User Story:** As a prompt engineer, I want to run individual test cases, so that I can test specific scenarios and see immediate results.

#### Acceptance Criteria

1. WHEN a user clicks a run button in a result cell THEN the system SHALL execute the prompt with that test case's variable values
2. WHEN a test completes successfully THEN the system SHALL populate the result directly in the corresponding table cell
3. WHEN a user selects a target version for testing THEN the system SHALL use that version's prompt for all test executions
4. IF a test fails THEN the system SHALL display an error message in the result cell

### Requirement 5

**User Story:** As a prompt engineer, I want to run all test cases in batch, so that I can efficiently test multiple scenarios without manual intervention.

#### Acceptance Criteria

1. WHEN a user clicks "Run All" THEN the system SHALL execute all test cases that don't have current results
2. WHEN running batch tests THEN the system SHALL limit concurrent executions to 3 to respect API rate limits
3. WHEN batch testing is in progress THEN the system SHALL show progress indicators for each test case
4. WHEN all batch tests complete THEN the system SHALL display all results in their respective table cells

### Requirement 6

**User Story:** As a prompt engineer, I want to compare results across different project versions, so that I can evaluate which version performs better on my test cases.

#### Acceptance Criteria

1. WHEN a user adds a comparison column THEN the system SHALL allow selecting a different project version for comparison
2. WHEN a comparison version is selected THEN the system SHALL create a new result column labeled with the version identifier
3. WHEN a user runs tests for comparison THEN the system SHALL populate the comparison column with results from the selected version
4. IF multiple comparison columns exist THEN the system SHALL maintain separate results for each version being compared

### Requirement 7

**User Story:** As a prompt engineer, I want test sets to persist locally, so that my test data is saved and available across sessions.

#### Acceptance Criteria

1. WHEN a user creates or modifies a test set THEN the system SHALL save the data to local storage
2. WHEN a user reopens the application THEN the system SHALL restore all previously created test sets
3. WHEN a user deletes a test set THEN the system SHALL remove it from local storage permanently
4. IF local storage is unavailable THEN the system SHALL display an appropriate error message

### Requirement 8

**User Story:** As a prompt engineer, I want to manage test case data efficiently, so that I can add, edit, and remove test cases as needed.

#### Acceptance Criteria

1. WHEN a user adds a new test case THEN the system SHALL create a new row in the table
2. WHEN a user edits variable values in a test case THEN the system SHALL update the data and save changes
3. WHEN a user deletes a test case THEN the system SHALL remove the row and update the stored data
4. WHEN a user clears results THEN the system SHALL remove result data while preserving test case variable values