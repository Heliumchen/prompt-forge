import * as React from 'react'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { VariablesSection, VariablesSectionSkeleton } from './variables-section'
import { Variable } from '@/lib/storage'

// Mock the debounce timeout
vi.useFakeTimers()

describe('VariablesSection', () => {
  const mockOnVariableUpdate = vi.fn()

  const mockVariables: Variable[] = [
    { name: 'userName', value: 'John Doe' },
    { name: 'topic', value: 'React Testing' },
    { name: 'emptyVar', value: '' }
  ]

  beforeEach(() => {
    mockOnVariableUpdate.mockClear()
    cleanup()
  })

  afterEach(() => {
    vi.clearAllTimers()
    cleanup()
  })

  describe('Empty State', () => {
    it('renders empty state when no variables are provided', () => {
      render(
        <VariablesSection
          variables={[]}
          onVariableUpdate={mockOnVariableUpdate}
        />
      )

      expect(screen.getByText('Variables')).toBeInTheDocument()
      expect(screen.getByText('No variables detected')).toBeInTheDocument()
      expect(screen.getByText((_content, element) => {
        return element?.textContent === 'Use {{variable}} syntax in your prompts'
      })).toBeInTheDocument()
    })

    it('shows proper empty state styling', () => {
      render(
        <VariablesSection
          variables={[]}
          onVariableUpdate={mockOnVariableUpdate}
        />
      )

      const emptyStateContainer = screen.getByText('No variables detected').closest('div')
      expect(emptyStateContainer).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center')
    })
  })

  describe('Variable List Display', () => {
    it('renders variables section with correct title and count', () => {
      render(
        <VariablesSection
          variables={mockVariables}
          onVariableUpdate={mockOnVariableUpdate}
        />
      )

      expect(screen.getByText('Variables')).toBeInTheDocument()
      expect(screen.getByText('(3)')).toBeInTheDocument()
    })

    it('renders textarea inputs for each variable', () => {
      render(
        <VariablesSection
          variables={mockVariables}
          onVariableUpdate={mockOnVariableUpdate}
        />
      )

      mockVariables.forEach(variable => {
        const textarea = screen.getByLabelText(`Value for variable ${variable.name}`)
        expect(textarea).toBeInTheDocument()
        expect(textarea).toHaveValue(variable.value)
      })
    })

    it('displays variable names in code format', () => {
      render(
        <VariablesSection
          variables={mockVariables}
          onVariableUpdate={mockOnVariableUpdate}
        />
      )

      mockVariables.forEach(variable => {
        expect(screen.getByText(`{{${variable.name}}}`)).toBeInTheDocument()
      })
    })

    it('shows proper placeholder text for textareas', () => {
      render(
        <VariablesSection
          variables={mockVariables}
          onVariableUpdate={mockOnVariableUpdate}
        />
      )

      mockVariables.forEach(variable => {
        const textarea = screen.getByLabelText(`Value for variable ${variable.name}`)
        expect(textarea).toHaveAttribute('placeholder', `Enter value for ${variable.name}...`)
      })
    })
  })

  describe('Variable Value Updates', () => {
    it('updates local state immediately when typing', () => {
      render(
        <VariablesSection
          variables={mockVariables}
          onVariableUpdate={mockOnVariableUpdate}
        />
      )

      const textarea = screen.getByLabelText('Value for variable userName')
      fireEvent.change(textarea, { target: { value: 'Jane Smith' } })

      expect(textarea).toHaveValue('Jane Smith')
    })

    it('debounces variable updates with 300ms delay', () => {
      render(
        <VariablesSection
          variables={mockVariables}
          onVariableUpdate={mockOnVariableUpdate}
        />
      )

      const textarea = screen.getByLabelText('Value for variable userName')
      fireEvent.change(textarea, { target: { value: 'Jane Smith' } })

      // Should not call immediately
      expect(mockOnVariableUpdate).not.toHaveBeenCalled()

      // Fast forward 300ms
      vi.advanceTimersByTime(300)

      expect(mockOnVariableUpdate).toHaveBeenCalledWith('userName', 'Jane Smith')
    })

    it('cancels previous debounced call when typing rapidly', () => {
      render(
        <VariablesSection
          variables={mockVariables}
          onVariableUpdate={mockOnVariableUpdate}
        />
      )

      const textarea = screen.getByLabelText('Value for variable userName')

      // Type rapidly
      fireEvent.change(textarea, { target: { value: 'J' } })
      vi.advanceTimersByTime(100)
      fireEvent.change(textarea, { target: { value: 'Ja' } })
      vi.advanceTimersByTime(100)
      fireEvent.change(textarea, { target: { value: 'Jane' } })

      // Fast forward full debounce time
      vi.advanceTimersByTime(300)

      expect(mockOnVariableUpdate).toHaveBeenCalledTimes(1)
      expect(mockOnVariableUpdate).toHaveBeenCalledWith('userName', 'Jane')
    })

    it('handles empty variable values correctly', () => {
      render(
        <VariablesSection
          variables={mockVariables}
          onVariableUpdate={mockOnVariableUpdate}
        />
      )

      const textarea = screen.getByLabelText('Value for variable emptyVar')
      fireEvent.change(textarea, { target: { value: 'New value' } })

      expect(textarea).toHaveValue('New value')
    })
  })

  describe('Loading and Disabled States', () => {
    it('disables all textareas when isGenerating is true', () => {
      render(
        <VariablesSection
          variables={mockVariables}
          onVariableUpdate={mockOnVariableUpdate}
          isGenerating={true}
        />
      )

      const userNameTextarea = screen.getByLabelText('Value for variable userName')
      const topicTextarea = screen.getByLabelText('Value for variable topic')
      const emptyVarTextarea = screen.getByLabelText('Value for variable emptyVar')

      expect(userNameTextarea).toBeDisabled()
      expect(topicTextarea).toBeDisabled()
      expect(emptyVarTextarea).toBeDisabled()
    })

    it('enables textareas when isGenerating is false', () => {
      render(
        <VariablesSection
          variables={mockVariables}
          onVariableUpdate={mockOnVariableUpdate}
          isGenerating={false}
        />
      )

      const userNameTextarea = screen.getByLabelText('Value for variable userName')
      const topicTextarea = screen.getByLabelText('Value for variable topic')
      const emptyVarTextarea = screen.getByLabelText('Value for variable emptyVar')

      expect(userNameTextarea).not.toBeDisabled()
      expect(topicTextarea).not.toBeDisabled()
      expect(emptyVarTextarea).not.toBeDisabled()
    })

    it('prevents updates when disabled', () => {
      render(
        <VariablesSection
          variables={mockVariables}
          onVariableUpdate={mockOnVariableUpdate}
          isGenerating={true}
        />
      )

      const textarea = screen.getByLabelText('Value for variable userName')
      fireEvent.change(textarea, { target: { value: 'Should not update' } })

      // Even after debounce time, should not call update
      vi.advanceTimersByTime(300)
      expect(mockOnVariableUpdate).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels for textareas', () => {
      render(
        <VariablesSection
          variables={mockVariables}
          onVariableUpdate={mockOnVariableUpdate}
        />
      )

      const userNameTextarea = screen.getByLabelText('Value for variable userName')
      const topicTextarea = screen.getByLabelText('Value for variable topic')
      const emptyVarTextarea = screen.getByLabelText('Value for variable emptyVar')

      expect(userNameTextarea).toHaveAttribute('aria-label', 'Value for variable userName')
      expect(topicTextarea).toHaveAttribute('aria-label', 'Value for variable topic')
      expect(emptyVarTextarea).toHaveAttribute('aria-label', 'Value for variable emptyVar')
    })

    it('associates labels with textareas using htmlFor', () => {
      render(
        <VariablesSection
          variables={mockVariables}
          onVariableUpdate={mockOnVariableUpdate}
        />
      )

      const userNameLabel = screen.getByText('{{userName}}').closest('label')
      const userNameTextarea = screen.getByLabelText('Value for variable userName')

      expect(userNameLabel).toHaveAttribute('for', 'variable-userName')
      expect(userNameTextarea).toHaveAttribute('id', 'variable-userName')
    })

    it('maintains proper keyboard navigation', () => {
      render(
        <VariablesSection
          variables={mockVariables}
          onVariableUpdate={mockOnVariableUpdate}
        />
      )

      const textareas = screen.getAllByRole('textbox')

      // All textareas should be focusable
      textareas.forEach((textarea) => {
        expect(textarea).not.toHaveAttribute('tabindex', '-1')
      })
    })
  })

  describe('Component Props', () => {
    it('applies custom className', () => {
      const { container } = render(
        <VariablesSection
          variables={mockVariables}
          onVariableUpdate={mockOnVariableUpdate}
          className="custom-class"
        />
      )

      expect(container.firstChild).toHaveClass('custom-class')
    })

    it('updates when variables prop changes', () => {
      const { rerender } = render(
        <VariablesSection
          variables={mockVariables}
          onVariableUpdate={mockOnVariableUpdate}
        />
      )

      const newVariables: Variable[] = [
        { name: 'newVar', value: 'new value' }
      ]

      rerender(
        <VariablesSection
          variables={newVariables}
          onVariableUpdate={mockOnVariableUpdate}
        />
      )

      expect(screen.getByText('{{newVar}}')).toBeInTheDocument()
      expect(screen.getByLabelText('Value for variable newVar')).toHaveValue('new value')
      expect(screen.queryByText('{{userName}}')).not.toBeInTheDocument()
    })
  })

  describe('Collapse/Expand Functionality', () => {
    it('renders expanded by default', () => {
      render(
        <VariablesSection
          variables={mockVariables}
          onVariableUpdate={mockOnVariableUpdate}
        />
      )

      // Variables should be visible by default
      expect(screen.getByLabelText('Value for variable userName')).toBeInTheDocument()
      expect(screen.getByLabelText('Value for variable topic')).toBeInTheDocument()

      // Collapse button should show down chevron
      const collapseButton = screen.getByLabelText('Collapse variables')
      expect(collapseButton).toBeInTheDocument()
    })

    it('can be collapsed by clicking the collapse button', () => {
      render(
        <VariablesSection
          variables={mockVariables}
          onVariableUpdate={mockOnVariableUpdate}
        />
      )

      const collapseButton = screen.getByLabelText('Collapse variables')
      fireEvent.click(collapseButton)

      // Variables should be hidden after collapse
      expect(screen.queryByLabelText('Value for variable userName')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Value for variable topic')).not.toBeInTheDocument()

      // Button should now show expand label and right chevron
      expect(screen.getByLabelText('Expand variables')).toBeInTheDocument()
    })

    it('can be expanded again after being collapsed', () => {
      render(
        <VariablesSection
          variables={mockVariables}
          onVariableUpdate={mockOnVariableUpdate}
        />
      )

      const collapseButton = screen.getByLabelText('Collapse variables')

      // Collapse first
      fireEvent.click(collapseButton)
      expect(screen.queryByLabelText('Value for variable userName')).not.toBeInTheDocument()

      // Then expand
      const expandButton = screen.getByLabelText('Expand variables')
      fireEvent.click(expandButton)

      // Variables should be visible again
      expect(screen.getByLabelText('Value for variable userName')).toBeInTheDocument()
      expect(screen.getByLabelText('Value for variable topic')).toBeInTheDocument()
      expect(screen.getByLabelText('Collapse variables')).toBeInTheDocument()
    })

    it('respects defaultCollapsed prop', () => {
      render(
        <VariablesSection
          variables={mockVariables}
          onVariableUpdate={mockOnVariableUpdate}
          defaultCollapsed={true}
        />
      )

      // Variables should be hidden initially
      expect(screen.queryByLabelText('Value for variable userName')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Value for variable topic')).not.toBeInTheDocument()

      // Button should show expand label
      expect(screen.getByLabelText('Expand variables')).toBeInTheDocument()
    })

    it('maintains collapse state when variables change', () => {
      const { rerender } = render(
        <VariablesSection
          variables={mockVariables}
          onVariableUpdate={mockOnVariableUpdate}
        />
      )

      // Collapse the section
      const collapseButton = screen.getByLabelText('Collapse variables')
      fireEvent.click(collapseButton)
      expect(screen.queryByLabelText('Value for variable userName')).not.toBeInTheDocument()

      // Update variables
      const newVariables: Variable[] = [
        { name: 'newVar', value: 'new value' }
      ]

      rerender(
        <VariablesSection
          variables={newVariables}
          onVariableUpdate={mockOnVariableUpdate}
        />
      )

      // Should remain collapsed
      expect(screen.queryByLabelText('Value for variable newVar')).not.toBeInTheDocument()
      expect(screen.getByLabelText('Expand variables')).toBeInTheDocument()
    })

    it('shows variable count in header even when collapsed', () => {
      render(
        <VariablesSection
          variables={mockVariables}
          onVariableUpdate={mockOnVariableUpdate}
          defaultCollapsed={true}
        />
      )

      // Header with count should still be visible
      expect(screen.getByText('Variables')).toBeInTheDocument()
      expect(screen.getByText('(3)')).toBeInTheDocument()
    })
  })
})

describe('VariablesSectionSkeleton', () => {
  it('renders loading skeleton with proper structure', () => {
    const { container } = render(<VariablesSectionSkeleton />)

    // Should have skeleton elements for title and variables
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('applies custom className to skeleton', () => {
    const { container } = render(<VariablesSectionSkeleton className="skeleton-custom" />)
    expect(container.firstChild).toHaveClass('skeleton-custom')
  })
})