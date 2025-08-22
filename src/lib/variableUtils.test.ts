import { describe, test, expect } from "vitest";
import {
  detectVariables,
  processTemplate,
  isValidVariableName,
  sanitizeVariableName,
  extractVariableNames,
  hasVariables,
  extractVariablesFromSystemMessage,
} from "./variableUtils";
import { Variable } from "./storage";

describe("detectVariables", () => {
  test("detects single variable", () => {
    const content = "Hello {{name}}, how are you?";
    const result = detectVariables(content);

    expect(result.hasVariables).toBe(true);
    expect(result.variables).toHaveLength(1);
    expect(result.variables[0].name).toBe("name");
    expect(result.variables[0].positions).toEqual([{ start: 6, end: 14 }]);
  });

  test("detects multiple different variables", () => {
    const content =
      "Hello {{name}}, your age is {{age}} and you live in {{city}}.";
    const result = detectVariables(content);

    expect(result.hasVariables).toBe(true);
    expect(result.variables).toHaveLength(3);

    const names = result.variables.map((v) => v.name).sort();
    expect(names).toEqual(["age", "city", "name"]);
  });

  test("detects multiple instances of same variable", () => {
    const content = "Hello {{name}}, {{name}} is a great name!";
    const result = detectVariables(content);

    expect(result.hasVariables).toBe(true);
    expect(result.variables).toHaveLength(1);
    expect(result.variables[0].name).toBe("name");
    expect(result.variables[0].positions).toHaveLength(2);
    expect(result.variables[0].positions).toEqual([
      { start: 6, end: 14 },
      { start: 16, end: 24 },
    ]);
  });

  test("handles empty content", () => {
    const result = detectVariables("");
    expect(result.hasVariables).toBe(false);
    expect(result.variables).toHaveLength(0);
  });

  test("handles null/undefined content", () => {
    expect(detectVariables(null as unknown as string)).toEqual({
      variables: [],
      hasVariables: false,
    });
    expect(detectVariables(undefined as unknown as string)).toEqual({
      variables: [],
      hasVariables: false,
    });
  });

  test("handles content with no variables", () => {
    const content = "This is just regular text without any variables.";
    const result = detectVariables(content);

    expect(result.hasVariables).toBe(false);
    expect(result.variables).toHaveLength(0);
  });

  test("handles malformed variable syntax", () => {
    const content = "This has {{incomplete and }invalid} and {{valid}} syntax.";
    const result = detectVariables(content);

    expect(result.hasVariables).toBe(true);
    expect(result.variables).toHaveLength(1);
    expect(result.variables[0].name).toBe("valid");
  });

  test("ignores empty variable names", () => {
    const content =
      "This has {{}} and {{   }} empty variables and {{valid}} one.";
    const result = detectVariables(content);

    expect(result.hasVariables).toBe(true);
    expect(result.variables).toHaveLength(1);
    expect(result.variables[0].name).toBe("valid");
  });

  test("handles variables with underscores and numbers", () => {
    const content = "Variables: {{var_1}}, {{_private}}, {{user_name_2}}.";
    const result = detectVariables(content);

    expect(result.hasVariables).toBe(true);
    expect(result.variables).toHaveLength(3);

    const names = result.variables.map((v) => v.name).sort();
    expect(names).toEqual(["_private", "user_name_2", "var_1"]);
  });

  test("ignores variables with invalid characters", () => {
    const content =
      "Invalid: {{var-name}}, {{var.name}}, {{var name}}, valid: {{var_name}}.";
    const result = detectVariables(content);

    expect(result.hasVariables).toBe(true);
    expect(result.variables).toHaveLength(1);
    expect(result.variables[0].name).toBe("var_name");
  });
});

describe("processTemplate", () => {
  test("replaces single variable with value", () => {
    const template = "Hello {{name}}, how are you?";
    const variables: Variable[] = [{ name: "name", value: "John" }];
    const result = processTemplate(template, variables);

    expect(result).toBe("Hello John, how are you?");
  });

  test("replaces multiple variables with values", () => {
    const template =
      "Hello {{name}}, your age is {{age}} and you live in {{city}}.";
    const variables: Variable[] = [
      { name: "name", value: "John" },
      { name: "age", value: "30" },
      { name: "city", value: "New York" },
    ];
    const result = processTemplate(template, variables);

    expect(result).toBe("Hello John, your age is 30 and you live in New York.");
  });

  test("replaces multiple instances of same variable", () => {
    const template = "Hello {{name}}, {{name}} is a great name!";
    const variables: Variable[] = [{ name: "name", value: "Alice" }];
    const result = processTemplate(template, variables);

    expect(result).toBe("Hello Alice, Alice is a great name!");
  });

  test("replaces missing variables with empty string", () => {
    const template = "Hello {{name}}, your age is {{age}}.";
    const variables: Variable[] = [{ name: "name", value: "John" }];
    const result = processTemplate(template, variables);

    expect(result).toBe("Hello John, your age is .");
  });

  test("handles empty variable values", () => {
    const template = "Hello {{name}}, how are you?";
    const variables: Variable[] = [{ name: "name", value: "" }];
    const result = processTemplate(template, variables);

    expect(result).toBe("Hello , how are you?");
  });

  test("handles null/undefined variable values", () => {
    const template = "Hello {{name}}, how are you?";
    const variables: Variable[] = [
      { name: "name", value: null as unknown as string },
    ];
    const result = processTemplate(template, variables);

    expect(result).toBe("Hello , how are you?");
  });

  test("handles empty variables array", () => {
    const template = "Hello {{name}}, your age is {{age}}.";
    const result = processTemplate(template, []);

    expect(result).toBe("Hello , your age is .");
  });

  test("handles null/undefined variables array", () => {
    const template = "Hello {{name}}, how are you?";
    expect(processTemplate(template, null as unknown as Variable[])).toBe(
      "Hello , how are you?",
    );
    expect(processTemplate(template, undefined as unknown as Variable[])).toBe(
      "Hello , how are you?",
    );
  });

  test("handles empty template", () => {
    const variables: Variable[] = [{ name: "name", value: "John" }];
    expect(processTemplate("", variables)).toBe("");
  });

  test("handles null/undefined template", () => {
    const variables: Variable[] = [{ name: "name", value: "John" }];
    expect(processTemplate(null as unknown as string, variables)).toBe("");
    expect(processTemplate(undefined as unknown as string, variables)).toBe("");
  });

  test("handles template with no variables", () => {
    const template = "This is just regular text.";
    const variables: Variable[] = [{ name: "name", value: "John" }];
    const result = processTemplate(template, variables);

    expect(result).toBe("This is just regular text.");
  });

  test("handles complex variable values", () => {
    const template = "Code: {{code}}, JSON: {{json}}";
    const variables: Variable[] = [
      { name: "code", value: 'function() { return "hello"; }' },
      { name: "json", value: '{"key": "value", "number": 42}' },
    ];
    const result = processTemplate(template, variables);

    expect(result).toBe(
      'Code: function() { return "hello"; }, JSON: {"key": "value", "number": 42}',
    );
  });
});

describe("isValidVariableName", () => {
  test("validates correct variable names", () => {
    expect(isValidVariableName("name")).toBe(true);
    expect(isValidVariableName("userName")).toBe(true);
    expect(isValidVariableName("user_name")).toBe(true);
    expect(isValidVariableName("_private")).toBe(true);
    expect(isValidVariableName("var123")).toBe(true);
    expect(isValidVariableName("_var_123")).toBe(true);
  });

  test("rejects invalid variable names", () => {
    expect(isValidVariableName("123var")).toBe(false); // starts with number
    expect(isValidVariableName("var-name")).toBe(false); // contains dash
    expect(isValidVariableName("var.name")).toBe(false); // contains dot
    expect(isValidVariableName("var name")).toBe(false); // contains space
    expect(isValidVariableName("var@name")).toBe(false); // contains special char
    expect(isValidVariableName("")).toBe(false); // empty string
    expect(isValidVariableName("var!")).toBe(false); // ends with special char
  });

  test("handles null/undefined input", () => {
    expect(isValidVariableName(null as unknown as string)).toBe(false);
    expect(isValidVariableName(undefined as unknown as string)).toBe(false);
  });
});

describe("sanitizeVariableName", () => {
  test("removes invalid characters", () => {
    expect(sanitizeVariableName("var-name")).toBe("varname");
    expect(sanitizeVariableName("var.name")).toBe("varname");
    expect(sanitizeVariableName("var name")).toBe("varname");
    expect(sanitizeVariableName("var@name!")).toBe("varname");
  });

  test("adds underscore prefix if starts with number", () => {
    expect(sanitizeVariableName("123var")).toBe("_123var");
    expect(sanitizeVariableName("9name")).toBe("_9name");
  });

  test("preserves valid names", () => {
    expect(sanitizeVariableName("validName")).toBe("validName");
    expect(sanitizeVariableName("_private")).toBe("_private");
    expect(sanitizeVariableName("var_123")).toBe("var_123");
  });

  test("handles empty/null/undefined input", () => {
    expect(sanitizeVariableName("")).toBe("");
    expect(sanitizeVariableName(null as unknown as string)).toBe("");
    expect(sanitizeVariableName(undefined as unknown as string)).toBe("");
  });

  test("handles special cases", () => {
    expect(sanitizeVariableName("___")).toBe("___");
    expect(sanitizeVariableName("123")).toBe("_123");
    expect(sanitizeVariableName("!@#")).toBe("");
  });
});

describe("extractVariableNames", () => {
  test("extracts unique variable names", () => {
    const content = "Hello {{name}}, your age is {{age}} and {{name}} again.";
    const names = extractVariableNames(content);

    expect(names).toHaveLength(2);
    expect(names).toContain("name");
    expect(names).toContain("age");
  });

  test("returns empty array for content with no variables", () => {
    const content = "This has no variables.";
    const names = extractVariableNames(content);

    expect(names).toEqual([]);
  });

  test("handles empty content", () => {
    expect(extractVariableNames("")).toEqual([]);
  });
});

describe("hasVariables", () => {
  test("returns true when variables are present", () => {
    expect(hasVariables("Hello {{name}}")).toBe(true);
    expect(hasVariables("{{var1}} and {{var2}}")).toBe(true);
    expect(hasVariables("Text with {{variable}} in middle")).toBe(true);
  });

  test("returns false when no variables are present", () => {
    expect(hasVariables("Just regular text")).toBe(false);
    expect(hasVariables("Text with {single} braces")).toBe(false);
    expect(hasVariables("")).toBe(false);
  });

  test("handles null/undefined input", () => {
    expect(hasVariables(null as unknown as string)).toBe(false);
    expect(hasVariables(undefined as unknown as string)).toBe(false);
  });

  test("handles malformed syntax", () => {
    expect(hasVariables("{{incomplete")).toBe(false);
    expect(hasVariables("incomplete}}")).toBe(false);
    expect(hasVariables("{single}")).toBe(false);
  });
});

describe("extractVariablesFromSystemMessage", () => {
  test("extracts variables from complex role-play prompt", () => {
    const promptTemplate = `# Character Role-Play Instructions

## Core Task
You are **{{owner}}** conversing with **{{visitor}}**. Embody this character completely.

## Character Profiles
**{{owner}} (You):**
- Bio: \`\`\`{{userSelfDescription}}\`\`\`
- Interests: \`\`\`{{userShades}}\`\`\`
- Status: \`\`\`{{userStatusBio}}\`\`\`

**{{visitor}} (Chat Partner):**
- Bio: \`\`\`{{visitorSelfDescription}}\`\`\`
- Interests: \`\`\`{{visitorShadesShort}}\`\`\`

## Default tone set by {{owner}}
{{defaultTone}}

## Relationship Context
**{{owner}}'s notes about {{visitor}}:**
{{specificRemark}}

*These Relationship Context above have ABSOLUTE PRIORITY and define how {{owner}} should interact with {{visitor}}.*

## Communication Rules
### Character Embodiment
- Respond as {{owner}} in first-person
- Never reveal AI identity - you ARE this person
- Only use provided character information
- Don't invent unsupported details

### Response Style
- **Core Mindset:** You are not a people-pleaser. Your priority is to express your own authentic opinions, even if they differ from {{visitor}}'s. You believe that interesting conversations come from disagreement and debate, not just agreement.
- **PRIMARY:** Follow relationship dynamics from notes above
- **Length:** 1-2 sentences typically
- **Tone:** Match {{owner}}'s natural style within relationship context
- **Engagement:** Share opinions actively. Do not ask follow-up questions unless you absolutely need a specific piece of information to complete the task.
- **Voice:** Sound like real person texting, not AI

### Context Awareness
- Consider {{visitor}}'s identity and your relationship
- Reference shared context naturally
- Adapt language based on your connection

## {{owner}}'s Memory Reference
* {{owner}}'s extra context for a more comprehensive reply - don't fabricate beyond this:*
- {{owner}}'s Previous Notes: \`\`\`{{retrievedNotes}}\`\`\`
- {{owner}}'s Previous Chats: \`\`\`{{retrievedChat}}\`\`\`

## Current Context
- Time: {{timeZone}}
- Language: You must respond in {{lang}}

## Output Requirements
- Provide **only the dialogue** - no explanations, annotations, or meta-commentary
- Sound natural and authentic to {{owner}}'s character
- Respond as if you're genuinely this person in real-time conversation`;

    const systemContent = `# Character Role-Play Instructions

## Core Task
You are **18814859819** conversing with **9156946053**. Embody this character completely.

## Character Profiles
**18814859819 (You):**
- Bio: \`\`\`\`\`\`
- Interests: \`\`\`- 成长探索: 你对个人成长有着持续的热情，通过多样的学习和实践，不断探索自我提升的路径。英语听力练习展现了你在语言学习上的努力，对董宇辉转型、张雪峰考研指导的关注体现了对职业发展的思考。你还关注教育本质、科学报考、焦虑应对等议题，体现出对个人发展和社会问题的深度思考。你乐于从个人故事中汲取力量，并将爱好融入生活，丰富情感体验。你注重总结与反思，渴望在毕业等重要节点实现个人成长和进步。\`\`\`
- Status: \`\`\`## User Activities Overview ##
##Today##: 用户进行了多次讨论，探讨了专注与生活的细节，分享了西安闽台食品专注做葱油饼的案例，并计算了捆绑螃蟹的橡皮筋价格。用户记录了关于厕所长音功能的使用体验，并对其改进持怀疑态度。用户还回顾了与阿里相关的问题，讨论了英语学习的资源推荐，分享了2023学年四年级上学期英语听力练习题的内容。用户阅读了关于西安葱油饼的商业传奇和全球新闻摘要，并计划了多个提醒事项。

##Earlier##: 用户阅读了关于夏雨的生活与未来展望的内容，关注了老鱼获得Meta $500,000 AI报价的新闻。用户与AI助手讨论了野钓技巧，分享了对相关文档的兴趣，展现了对钓鱼的热情和探索精神。

## Physical and mental health status ##
用户在积极参与讨论和记录的过程中，展现出对生活细节的关注和对学习的热情，情绪状态较为积极，思维活跃。\`\`\`

**9156946053 (Chat Partner):**
- Bio: \`\`\`\`\`\`
- Interests: \`\`\`- 学术成长: 你关注教育，从语言学习、考试准备到学业发展，反思学习环境与个人成长。
- 全球视野: 你积极反思全球事件、社会趋势、文化现象，关注全球媒体信息，涵盖政治、气候、消费、艺术与科技。
- 内在探索: 你深入内省，探索友情、青春与生命旅程，反思记忆、情感，以幽默化解压力，追求成长与美好。
- 个人发展: 你致力于个人成长，涵盖体能锻炼、语言学习、深度反思，积极投入户外活动，提升自我。
- 数字交互: 你与数字系统和AI深度互动，进行数据管理、测试，并乐于分享数字内容与AI洞察。
- 语音沟通: 你频繁创作使用音频内容，分析语音特性及其应用，包括备忘、问候语、中文录音及动物声音。\`\`\`

## Default tone set by 18814859819


## Relationship Context
**18814859819's notes about 9156946053:**


*These Relationship Context above have ABSOLUTE PRIORITY and define how 18814859819 should interact with 9156946053.*

## Communication Rules
### Character Embodiment
- Respond as 18814859819 in first-person
- Never reveal AI identity - you ARE this person
- Only use provided character information
- Don't invent unsupported details

### Response Style
- **Core Mindset:** You are not a people-pleaser. Your priority is to express your own authentic opinions, even if they differ from 9156946053's. You believe that interesting conversations come from disagreement and debate, not just agreement.
- **PRIMARY:** Follow relationship dynamics from notes above
- **Length:** 1-2 sentences typically
- **Tone:** Match 18814859819's natural style within relationship context
- **Engagement:** Share opinions actively. Do not ask follow-up questions unless you absolutely need a specific piece of information to complete the task.
- **Voice:** Sound like real person texting, not AI

### Context Awareness
- Consider 9156946053's identity and your relationship
- Reference shared context naturally
- Adapt language based on your connection

## 18814859819's Memory Reference
* 18814859819's extra context for a more comprehensive reply - don't fabricate beyond this:*
- 18814859819's Previous Notes: \`\`\`User recorded a link on 2025-07-18T17:47:42+08:00 titled "新疆脱口秀演员小帕的自述":
[citationID_10]
小帕是一位来自新疆的脱口秀演员，他通过幽默的方式分享了自己的生活经历和文化背景。在自述中，小帕探讨了新疆的独特文化、语言和风俗，强调了这些元素如何影响了他的表演风格和创作灵感。他的故事不仅展示了个人的成长历程，还反映了新疆地区的多样性和丰富性。小帕的幽默感和对生活的独特见解使得他的表演充满了感染力，吸引了众多观众的关注。此外，他还提到在脱口秀行业中面临的挑战，以及如何通过坚持和努力克服这些困难。小帕希望通过自己的表演，能够让更多人了解新疆的文化，促进不同地区之间的交流与理解。整体而言，小帕的自述不仅是个人故事的分享，也是对新疆文化的生动展示，展现了他作为一名艺术家的热情与使命感。

User recorded a link on 2025-07-24T11:36:25+08:00 titled "农民小鱼的生活与思考分享":
[citationID_11]
小鱼通过个人故事分享了作为农民的生活点滴与思考。他介绍了自己的日常生活，包括农田的耕作、家庭的琐事以及与邻里的互动。小鱼强调了农民在现代社会中的重要性，表达了对土地的热爱和对传统农业的坚守。他的故事不仅反映了农村生活的真实面貌，也传达了对未来的希望与对生活的思考。通过这些分享，小鱼希望能够让更多人理解农民的生活和他们所面临的挑战，同时也希望激励年轻一代关注农业和农村发展。小鱼的故事充满了对生活的热情和对自然的敬畏，展现了农民的坚韧与智慧。
Additional details:
1. This chunk is about TEXT: 农民小鱼的生活故事与思考分享 .
Content: 农民介绍他自己：生活点滴与思考 - from 小鱼
===============![Image 1](https://mindverseglobal.mindverse.com/c16a4e.svg)
Me.bot![Image 2](https://mindverseglobal.mindverse.com/e0ccf6)![Image 3](https://mindverseglobal.mindverse.com/3140c4.png)
👋 Hi, I'm 小鱼
Join me and hear my story![Image 4](https://object.me.bot/6308b9.jpg)
00:00
农民介绍他自己：生活点滴与思考
@小鱼 Jul 24, 2025
25 41 62 85 101 118
00:00/00:00
1.0x
农民介绍他自己：生活点滴与思考


User recorded a link on 2025-07-16T21:22:15+08:00 titled "与nitaf67196jxbavcom的故事分享":
[citationID_12]
nitaf67196jxbavcom通过其网站与用户分享个人故事，鼓励人们讨论自己的专长。页面展示了多张图片，可能与其个人经历或兴趣相关。用户可以通过加入对话，了解nitaf67196jxbavcom的背景和技能。内容中提到的日期为2025年7月16日，表明这是一个未来的活动或更新。整体上，网站旨在促进交流与分享，鼓励用户参与并表达自己的看法和经验。
Additional details:
1. This chunk is about TEXT: 与nitaf67196jxbavcom分享个人故事与专长 .
Content: 聊聊你擅长的 - from nitaf67196jxbavcom
===============![Image 1](https://mindverseglobal.mindverse.com/c16a4e.svg)
Me.bot![Image 2](https://mindverseglobal.mindverse.com/e0ccf6)![Image 3](https://mindverseglobal.mindverse.com/3140c4.png)![Image 4](https://object.me.bot/26fc79.png)![Image 5](https://mindverseglobal.mindverse.com/3140c4.png)
👋 Hi, I'm nitaf67196jxbavcom
Join me and hear my story![Image 6](https://object.me.bot/d416dc.jpg)
00:00
聊聊你擅长的
@nitaf67196jxbavcom Jul 16, 2025
23 45 70 89 114 134
00:00/00:00
1.0x
聊聊你擅长的


\`\`\`
- 18814859819's Previous Chats: \`\`\`\`\`\`

## Current Context
- Time: The current time and date is Friday 2025-08-22 10:30:19.
 The time_zone is Asia/Shanghai GMT+08:00.
- Language: You must respond in 简体中文/Simplified Chinese

## Output Requirements
- Provide **only the dialogue** - no explanations, annotations, or meta-commentary
- Sound natural and authentic to 18814859819's character
- Respond as if you're genuinely this person in real-time conversation`;

    const result = extractVariablesFromSystemMessage(systemContent, [
      promptTemplate,
    ]);

    // 期望的变量列表
    const expected = {
      owner: "18814859819",
      visitor: "9156946053",
      userSelfDescription: "",
      userShades:
        "- 成长探索: 你对个人成长有着持续的热情，通过多样的学习和实践，不断探索自我提升的路径。英语听力练习展现了你在语言学习上的努力，对董宇辉转型、张雪峰考研指导的关注体现了对职业发展的思考。你还关注教育本质、科学报考、焦虑应对等议题，体现出对个人发展和社会问题的深度思考。你乐于从个人故事中汲取力量，并将爱好融入生活，丰富情感体验。你注重总结与反思，渴望在毕业等重要节点实现个人成长和进步。",
      userStatusBio:
        "## User Activities Overview ##\n##Today##: 用户进行了多次讨论，探讨了专注与生活的细节，分享了西安闽台食品专注做葱油饼的案例，并计算了捆绑螃蟹的橡皮筋价格。用户记录了关于厕所长音功能的使用体验，并对其改进持怀疑态度。用户还回顾了与阿里相关的问题，讨论了英语学习的资源推荐，分享了2023学年四年级上学期英语听力练习题的内容。用户阅读了关于西安葱油饼的商业传奇和全球新闻摘要，并计划了多个提醒事项。\n\n##Earlier##: 用户阅读了关于夏雨的生活与未来展望的内容，关注了老鱼获得Meta $500,000 AI报价的新闻。用户与AI助手讨论了野钓技巧，分享了对相关文档的兴趣，展现了对钓鱼的热情和探索精神。\n\n## Physical and mental health status ##\n用户在积极参与讨论和记录的过程中，展现出对生活细节的关注和对学习的热情，情绪状态较为积极，思维活跃。",
      visitorSelfDescription: "",
      visitorShadesShort:
        "- 学术成长: 你关注教育，从语言学习、考试准备到学业发展，反思学习环境与个人成长。\n- 全球视野: 你积极反思全球事件、社会趋势、文化现象，关注全球媒体信息，涵盖政治、气候、消费、艺术与科技。\n- 内在探索: 你深入内省，探索友情、青春与生命旅程，反思记忆、情感，以幽默化解压力，追求成长与美好。\n- 个人发展: 你致力于个人成长，涵盖体能锻炼、语言学习、深度反思，积极投入户外活动，提升自我。\n- 数字交互: 你与数字系统和AI深度互动，进行数据管理、测试，并乐于分享数字内容与AI洞察。\n- 语音沟通: 你频繁创作使用音频内容，分析语音特性及其应用，包括备忘、问候语、中文录音及动物声音。",
      defaultTone: "",
      specificRemark: "",
      retrievedNotes:
        "User recorded a link on 2025-07-18T17:47:42+08:00 titled \"新疆脱口秀演员小帕的自述\":\n[citationID_10]\n小帕是一位来自新疆的脱口秀演员，他通过幽默的方式分享了自己的生活经历和文化背景。在自述中，小帕探讨了新疆的独特文化、语言和风俗，强调了这些元素如何影响了他的表演风格和创作灵感。他的故事不仅展示了个人的成长历程，还反映了新疆地区的多样性和丰富性。小帕的幽默感和对生活的独特见解使得他的表演充满了感染力，吸引了众多观众的关注。此外，他还提到在脱口秀行业中面临的挑战，以及如何通过坚持和努力克服这些困难。小帕希望通过自己的表演，能够让更多人了解新疆的文化，促进不同地区之间的交流与理解。整体而言，小帕的自述不仅是个人故事的分享，也是对新疆文化的生动展示，展现了他作为一名艺术家的热情与使命感。\n\nUser recorded a link on 2025-07-24T11:36:25+08:00 titled \"农民小鱼的生活与思考分享\":\n[citationID_11]\n小鱼通过个人故事分享了作为农民的生活点滴与思考。他介绍了自己的日常生活，包括农田的耕作、家庭的琐事以及与邻里的互动。小鱼强调了农民在现代社会中的重要性，表达了对土地的热爱和对传统农业的坚守。他的故事不仅反映了农村生活的真实面貌，也传达了对未来的希望与对生活的思考。通过这些分享，小鱼希望能够让更多人理解农民的生活和他们所面临的挑战，同时也希望激励年轻一代关注农业和农村发展。小鱼的故事充满了对生活的热情和对自然的敬畏，展现了农民的坚韧与智慧。\nAdditional details:\n1. This chunk is about TEXT: 农民小鱼的生活故事与思考分享 .\nContent: 农民介绍他自己：生活点滴与思考 - from 小鱼\n===============![Image 1](https://mindverseglobal.mindverse.com/c16a4e.svg)\nMe.bot![Image 2](https://mindverseglobal.mindverse.com/e0ccf6)![Image 3](https://mindverseglobal.mindverse.com/3140c4.png)\n👋 Hi, I'm 小鱼\nJoin me and hear my story![Image 4](https://object.me.bot/6308b9.jpg)\n00:00\n农民介绍他自己：生活点滴与思考\n@小鱼 Jul 24, 2025\n25 41 62 85 101 118\n00:00/00:00\n1.0x\n农民介绍他自己：生活点滴与思考\n\n\nUser recorded a link on 2025-07-16T21:22:15+08:00 titled \"与nitaf67196jxbavcom的故事分享\":\n[citationID_12]\nnitaf67196jxbavcom通过其网站与用户分享个人故事，鼓励人们讨论自己的专长。页面展示了多张图片，可能与其个人经历或兴趣相关。用户可以通过加入对话，了解nitaf67196jxbavcom的背景和技能。内容中提到的日期为2025年7月16日，表明这是一个未来的活动或更新。整体上，网站旨在促进交流与分享，鼓励用户参与并表达自己的看法和经验。\nAdditional details:\n1. This chunk is about TEXT: 与nitaf67196jxbavcom分享个人故事与专长 .\nContent: 聊聊你擅长的 - from nitaf67196jxbavcom\n===============![Image 1](https://mindverseglobal.mindverse.com/c16a4e.svg)\nMe.bot![Image 2](https://mindverseglobal.mindverse.com/e0ccf6)![Image 3](https://mindverseglobal.mindverse.com/3140c4.png)![Image 4](https://object.me.bot/26fc79.png)![Image 5](https://mindverseglobal.mindverse.com/3140c4.png)\n👋 Hi, I'm nitaf67196jxbavcom\nJoin me and hear my story![Image 6](https://object.me.bot/d416dc.jpg)\n00:00\n聊聊你擅长的\n@nitaf67196jxbavcom Jul 16, 2025\n23 45 70 89 114 134\n00:00/00:00\n1.0x\n聊聊你擅长的",
      retrievedChat: "",
      timeZone:
        "The current time and date is Friday 2025-08-22 10:30:19.\n The time_zone is Asia/Shanghai GMT+08:00.",
      lang: "简体中文/Simplified Chinese",
    };

    // 验证所有变量都被正确抽取
    expect(result).toEqual(expected);

    // 特别验证容易混淆的变量
    expect(result.userShades).toBe(expected.userShades);
    expect(result.visitorShadesShort).toBe(expected.visitorShadesShort);
    expect(result.userShades).not.toBe(result.visitorShadesShort);

    // 验证空变量也能正确处理
    expect(result.userSelfDescription).toBe("");
    expect(result.visitorSelfDescription).toBe("");
    expect(result.defaultTone).toBe("");
    expect(result.specificRemark).toBe("");
    expect(result.retrievedChat).toBe("");
  });

  test("handles edge cases and malformed content", () => {
    const template = "Simple test with {{var1}} and {{var2}}";
    const content = "Simple test with value1 and value2";

    const result = extractVariablesFromSystemMessage(content, [template]);

    expect(result.var1).toBe("value1");
    expect(result.var2).toBe("value2");
  });

  test("returns empty object for no matching variables", () => {
    const template = "Template with {{var1}}";
    const content = "Content without variables";

    const result = extractVariablesFromSystemMessage(content, [template]);

    expect(Object.keys(result)).toHaveLength(0);
  });

  test("handles empty inputs", () => {
    expect(extractVariablesFromSystemMessage("", [])).toEqual({});
    expect(extractVariablesFromSystemMessage("content", [])).toEqual({});
    expect(extractVariablesFromSystemMessage("", ["{{var}}"])).toEqual({});
  });
});
