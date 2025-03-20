"use client"

export function IntroBlock() {
  return (
    
    <div className="flex flex-col items-center justify-center p-8 rounded-lg">
        <h2 className="mb-4 text-3xl font-medium">Welcome to Prompt Forge</h2>
        <ol className="list-decimal pl-5 space-y-2">
            <li>
                Local-first: 所有数据都存储在本地浏览器中，不会上传到任何服务器。
            </li>
            <li>
                Open-source: 所有代码都开源，可以随时查看和修改。
            </li>
            <li>
                Powerful Playground: 可以方便地测试和调试提示。
            </li>
            <li>
                Evaluation (LLM-as-a-User): 可以方便地评估和比较不同提示的效果。
            </li>
            <li>
                Prompt Versioning: 可以方便地查看和比较不同提示的版本。
            </li>
        </ol>
    </div>
  )
}
