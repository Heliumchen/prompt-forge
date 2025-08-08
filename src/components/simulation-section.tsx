import React from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Swords } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectSelect } from "@/components/project-select";

interface SimulationSectionProps {
  selectedEvaluationProject: string;
  selectedEvaluationRound: number;
  isEvaluating: boolean;
  evaluatingRound: number;
  evaluatingTotal: number;
  onProjectChange: (value: string) => void;
  onRoundChange: (value: number) => void;
  onEvaluate: (rounds: number) => void;
}

export function SimulationSection({
  selectedEvaluationProject,
  selectedEvaluationRound,
  isEvaluating,
  evaluatingRound,
  evaluatingTotal,
  onProjectChange,
  onRoundChange,
  onEvaluate,
}: SimulationSectionProps) {
  return (
    <>
      <Separator className="my-4" />
      <h2 className="mb-2 font-semibold">Simulation (LLM-as-a-User)</h2>
      <div className="flex gap-4">
        <ProjectSelect
          value={selectedEvaluationProject}
          onChange={onProjectChange}
        />
        <Select
          defaultValue="5"
          onValueChange={(value) => onRoundChange(parseInt(value))}
        >
          <SelectTrigger className="w-[70px]">
            <SelectValue placeholder="Rounds" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1</SelectItem>
            <SelectItem value="2">2</SelectItem>
            <SelectItem value="3">3</SelectItem>
            <SelectItem value="4">4</SelectItem>
            <SelectItem value="5">5</SelectItem>
            <SelectItem value="6">6</SelectItem>
            <SelectItem value="7">7</SelectItem>
            <SelectItem value="8">8</SelectItem>
            <SelectItem value="9">9</SelectItem>
            <SelectItem value="10">10</SelectItem>
          </SelectContent>
        </Select>
        <Button
          className="flex-1"
          onClick={() => onEvaluate(selectedEvaluationRound)}
          disabled={isEvaluating}
        >
          {isEvaluating ? (
            <>
              <div className="animate-spin mr-2">⌛</div>
              {evaluatingRound}/{evaluatingTotal}
            </>
          ) : (
            <Swords className="mr-2" />
          )}
          {isEvaluating ? "Evaluating..." : "Evaluate"}
        </Button>
      </div>
    </>
  );
}