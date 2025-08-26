"use client";

export function IntroBlock() {
  return (
    <div className="flex flex-col items-center justify-center p-8 h-full w-full overflow-auto">
      <h2 className="mb-8 text-3xl font-medium">How to use Prompt Forge?</h2>

      {/* How-to Steps */}
      <div className="w-full max-w-4xl mb-12">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="flex flex-col items-center text-center p-6 bg-muted/50 rounded-lg">
            <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mb-4 text-xl font-bold">
              1
            </div>
            <h3 className="text-lg font-semibold mb-2">设置API Key</h3>
            <p className="text-sm text-muted-foreground">
              在左侧边栏点击[🔑API Key Settings]，配置你的OpenRouter
              API密钥以开始使用AI模型
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-6 bg-muted/50 rounded-lg">
            <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mb-4 text-xl font-bold">
              2
            </div>
            <h3 className="text-lg font-semibold mb-2">创建Project</h3>
            <p className="text-sm text-muted-foreground">
              创建你的第一个项目，开始编写和测试提示模板
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-6 bg-muted/50 rounded-lg">
            <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mb-4 text-xl font-bold">
              3
            </div>
            <h3 className="text-lg font-semibold mb-2">创建Test Set</h3>
            <p className="text-sm text-muted-foreground">
              创建测试集来批量测试你的提示，验证不同场景下的表现
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
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Local-first</h4>
            <p className="text-sm text-muted-foreground">
              所有数据都存储在本地浏览器中，保护你的隐私和安全
            </p>
          </div>

          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Simulation</h4>
            <p className="text-sm text-muted-foreground">
              强大的模拟测试功能，让你快速验证提示效果
            </p>
          </div>

          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Prompt Review</h4>
            <p className="text-sm text-muted-foreground">
              AI驱动的提示审查，帮你优化提示质量
            </p>
          </div>

          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Test Sets</h4>
            <p className="text-sm text-muted-foreground">
              批量测试功能，系统性地评估提示在不同场景下的表现
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
