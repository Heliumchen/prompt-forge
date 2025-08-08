import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Braces } from "lucide-react";
import { VariablesSection } from "@/components/variables-section";
import { toast } from "sonner";
import { Project } from "@/lib/storage";

interface VariablesBannerProps {
  currentProject: Project | null;
  isGenerating: boolean;
  getDetectedVariables: (projectUid: string) => string[];
  updateVariable: (projectUid: string, name: string, value: string) => void;
}

export function VariablesBanner({
  currentProject,
  isGenerating,
  getDetectedVariables,
  updateVariable,
}: VariablesBannerProps) {
  if (!currentProject) return null;

  try {
    const currentVersion = currentProject.versions.find(
      (v) => v.id === currentProject.currentVersion,
    );
    if (!currentVersion) return null;

    const detectedVariables = getDetectedVariables(currentProject.uid);
    const currentVariables = currentVersion.data.variables || [];

    if (detectedVariables.length > 0) {
      return (
        <VariablesSection
          variables={currentVariables}
          onVariableUpdate={(name: string, value: string) => {
            try {
              updateVariable(currentProject.uid, name, value);
            } catch (error) {
              console.error("Error updating variable:", error);
              toast.error("Failed to update variable");
            }
          }}
          isGenerating={isGenerating}
          defaultCollapsed={detectedVariables.length > 3}
        />
      );
    } else {
      return (
        <Alert className="border-dashed mb-6">
          <Braces className="h-4 w-4" />
          <AlertTitle>Variables</AlertTitle>
          <AlertDescription>
            You can create a variable in prompt template
            like this: {"{{variable_name}}"}
          </AlertDescription>
        </Alert>
      );
    }
  } catch (error) {
    console.error("Error rendering Variables Section:", error);
    return (
      <Alert className="border-dashed mb-6" variant="destructive">
        <Braces className="h-4 w-4" />
        <AlertTitle>Variables Error</AlertTitle>
        <AlertDescription>
          Failed to load variables. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }
}