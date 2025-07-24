# Requirements Document

## Introduction

The Prompt Variables feature enables users to create dynamic prompt templates by inserting variables using `{{variable}}` syntax. This feature allows for more flexible prompt engineering and prepares the foundation for future test set-based evaluation capabilities. Users can define variables in their prompt templates and manage their values through a dedicated Variables section in the UI.

## Requirements

### Requirement 1

**User Story:** As a prompt engineer, I want to insert variables into my prompt templates using `{{variable}}` syntax, so that I can create reusable and dynamic prompts.

#### Acceptance Criteria

1. WHEN a user types `{{variableName}}` in a prompt template THEN the system SHALL recognize it as a variable placeholder
2. WHEN a variable is detected in the prompt template THEN the system SHALL automatically extract the variable name from between the double curly braces
3. WHEN multiple instances of the same variable exist in a prompt THEN the system SHALL treat them as references to the same variable
4. WHEN a user uses invalid variable syntax THEN the system SHALL handle it gracefully without breaking the prompt functionality

### Requirement 2

**User Story:** As a prompt engineer, I want to see all detected variables in a dedicated Variables section, so that I can manage their values in one place.

#### Acceptance Criteria

1. WHEN variables are detected in prompt templates THEN the system SHALL display them in a Variables section on the right side of the interface
2. WHEN a variable is removed from all prompt templates THEN the system SHALL automatically remove it from the Variables section
3. WHEN a new variable is added to a prompt template THEN the system SHALL automatically add it to the Variables section
4. WHEN no variables are present THEN the Variables section SHALL display an appropriate empty state message

### Requirement 3

**User Story:** As a prompt engineer, I want to edit variable values in textarea inputs, so that I can define the content that will replace each variable placeholder.

#### Acceptance Criteria

1. WHEN a variable appears in the Variables section THEN the system SHALL provide a textarea input for editing its value
2. WHEN a user types in a variable textarea THEN the system SHALL save the value in real-time
3. WHEN a variable value is empty THEN the system SHALL handle the replacement gracefully during generation
4. WHEN a user switches between project versions THEN the system SHALL preserve variable values per version

### Requirement 4

**User Story:** As a prompt engineer, I want variables to be replaced with their values before sending to the LLM, so that the model receives the complete prompt with actual content.

#### Acceptance Criteria

1. WHEN a user clicks generate THEN the system SHALL replace all `{{variable}}` placeholders with their corresponding values before sending to the LLM
2. WHEN a variable has no defined value THEN the system SHALL replace it with an empty string
3. WHEN variable replacement occurs THEN the original template SHALL remain unchanged for future edits
4. WHEN the replaced prompt is sent to the LLM THEN it SHALL contain no remaining `{{variable}}` syntax

### Requirement 5

**User Story:** As a prompt engineer, I want variable values to persist across sessions, so that I don't lose my work when I close and reopen the application.

#### Acceptance Criteria

1. WHEN a user defines variable values THEN the system SHALL store them in the project version data
2. WHEN a user reopens the application THEN the system SHALL restore previously defined variable values
3. WHEN a user switches between project versions THEN the system SHALL load the correct variable values for each version
4. WHEN a user creates a new version THEN the system SHALL copy variable values from the current version

### Requirement 6

**User Story:** As a prompt engineer, I want clear visual feedback about variables in my prompts, so that I can easily identify and manage variable placeholders.

#### Acceptance Criteria

1. WHEN variables are present in prompt templates THEN the system SHALL provide visual highlighting or styling to distinguish them from regular text
2. WHEN a variable is referenced but has no value defined THEN the system SHALL provide visual indication of this state
3. WHEN hovering over a variable in the prompt THEN the system SHALL show relevant information or actions
4. WHEN the Variables section is displayed THEN it SHALL clearly show the variable name and provide intuitive editing controls