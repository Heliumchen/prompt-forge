"use client"

import * as React from "react"
import { VariablesSection } from "./variables-section"
import { Variable } from "@/lib/storage"

export function VariablesSectionDemo() {
  const [variables, setVariables] = React.useState<Variable[]>([
    { name: 'userName', value: 'John Doe' },
    { name: 'userAge', value: '25' },
    { name: 'topic', value: 'React Development' },
    { name: 'difficulty', value: 'Intermediate' },
    { name: 'duration', value: '2 hours' },
  ])

  const handleVariableUpdate = (name: string, value: string) => {
    setVariables(prev => 
      prev.map(variable => 
        variable.name === name ? { ...variable, value } : variable
      )
    )
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <h2 className="text-lg font-semibold">Variables Section Demo</h2>
      <p className="text-sm text-muted-foreground">
        This demo shows the collapsible Variables Section. When there are more than 3 variables, 
        it starts collapsed by default to save space.
      </p>
      
      <VariablesSection
        variables={variables}
        onVariableUpdate={handleVariableUpdate}
        isGenerating={false}
        defaultCollapsed={variables.length > 3}
      />
      
      <div className="text-xs text-muted-foreground">
        <p>Current variable values:</p>
        <pre className="mt-2 p-2 bg-muted rounded text-xs">
          {JSON.stringify(variables, null, 2)}
        </pre>
      </div>
    </div>
  )
}