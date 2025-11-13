"use client";

import {
  Key,
  FolderPlus,
  ListChecks,
  Lock,
  Zap,
  MessageSquareCode,
  Grid3x3,
} from "lucide-react";

export function IntroBlock() {
  return (
    <div className="flex flex-col items-center justify-center p-8 h-full w-full overflow-auto">
      {/* Hero Section */}
      <div className="mb-12 text-center">
        <h1 className="mb-3 text-4xl font-semibold">Welcome to Prompt Forge</h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          A local-first prompt engineering tool to create, test, and optimize
          your LLM prompts
        </p>
      </div>

      {/* Getting Started Steps */}
      <div className="w-full max-w-4xl mb-12">
        <h2 className="mb-6 text-2xl font-medium text-center">
          Get Started in 3 Steps
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="flex flex-col items-center text-center p-6 bg-muted/50 rounded-lg transition-all hover:shadow-md hover:scale-[1.02]">
            <div className="w-16 h-16 bg-linear-to-br from-primary to-primary/80 text-primary-foreground rounded-full flex items-center justify-center mb-4 shadow-sm">
              <Key className="h-7 w-7" />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold">
                1
              </div>
              <h3 className="text-lg font-semibold">Set up API Key</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Click [🔑 API Key Settings] in the sidebar to configure your
              OpenRouter API key and start using AI models
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-6 bg-muted/50 rounded-lg transition-all hover:shadow-md hover:scale-[1.02]">
            <div className="w-16 h-16 bg-linear-to-br from-primary to-primary/80 text-primary-foreground rounded-full flex items-center justify-center mb-4 shadow-sm">
              <FolderPlus className="h-7 w-7" />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold">
                2
              </div>
              <h3 className="text-lg font-semibold">Create a Project</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Create your first project to start writing and testing prompt
              templates
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-6 bg-muted/50 rounded-lg transition-all hover:shadow-md hover:scale-[1.02]">
            <div className="w-16 h-16 bg-linear-to-br from-primary to-primary/80 text-primary-foreground rounded-full flex items-center justify-center mb-4 shadow-sm">
              <ListChecks className="h-7 w-7" />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold">
                3
              </div>
              <h3 className="text-lg font-semibold">Create Test Sets</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Build test sets to batch test your prompts and validate
              performance across different scenarios
            </p>
          </div>
        </div>
      </div>

      {/* Why Prompt Forge */}
      <div className="w-full max-w-4xl">
        <h3 className="text-2xl font-medium mb-6 text-center">
          Why Prompt Forge?
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="p-5 border rounded-lg transition-all hover:shadow-md hover:border-primary/50 group">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <h4 className="font-semibold">Local-first</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              All data is stored locally in your browser, protecting your
              privacy and security
            </p>
          </div>

          <div className="p-5 border rounded-lg transition-all hover:shadow-md hover:border-primary/50 group">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <h4 className="font-semibold">Simulation</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Powerful simulation testing features to quickly validate prompt
              effectiveness
            </p>
          </div>

          <div className="p-5 border rounded-lg transition-all hover:shadow-md hover:border-primary/50 group">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <MessageSquareCode className="h-5 w-5 text-primary" />
              </div>
              <h4 className="font-semibold">Prompt Review</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              AI-powered prompt review to help you optimize prompt quality
            </p>
          </div>

          <div className="p-5 border rounded-lg transition-all hover:shadow-md hover:border-primary/50 group">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Grid3x3 className="h-5 w-5 text-primary" />
              </div>
              <h4 className="font-semibold">Test Sets</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Batch testing capabilities to systematically evaluate prompt
              performance across different scenarios
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
