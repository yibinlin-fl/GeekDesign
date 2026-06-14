# AI Agent Service

GeekDesign 的 AI Agent Service 把自然语言请求转换为可验证的工具调用。它不持有设计状态，
也不允许 DeepSeek 直接读取或覆盖完整 `document_json`。

## 边界

Agent 只读取紧凑的场景摘要和元素列表。任何设计修改都转换成后端 Command API 请求：

```text
User -> DeepSeek tool call -> Pydantic validation -> Design Tool
     -> Backend Command API -> candidate document validation -> persistence
```

后端当前提供：

- `GET /api/projects/{project_id}/summary`
- `GET /api/projects/{project_id}/elements`
- `POST /api/projects/{project_id}/commands`

Command API 只接受白名单命令，先在文档副本上执行，再通过 Design Document 校验。合法命令
才会持久化，并写入 `command_logs` 审计表。

## 工具

只读工具包括设计摘要、元素列表、模板搜索和渲染预览。`update_text`、`add_text`、
`move_element`、`set_style` 和 `fill_template_variables` 全部转换为 Command API 请求。
从模板创建项目使用模板服务的受控入口。`export_pdf` 是高风险操作，在调用导出 API 前
必须得到明确确认。

## Agent Loop

`AgentLoop` 将 DeepSeek 返回的工具参数交给 Pydantic 严格校验。每个成功的设计修改后，
循环会重新读取场景摘要，帮助模型根据最新状态继续工作。`max_tool_steps` 限制单次请求的
工具调用次数，避免无限循环。每一步都会记录工具名、参数、状态、时间和 `dry_run` 标记。

## Dry Run

`dry_run=True` 会沿工具调用传递到 Command API。后端仍执行命令校验并生成候选摘要，但不
修改项目文档。创建项目和导出等非 Command 操作在 dry run 时只返回预览结果。

## DeepSeek 配置

`DeepSeekClient` 使用 OpenAI 兼容的 `/chat/completions` 工具调用协议。调用方应从环境变量
读取 API Key，并在应用启动时构造客户端；密钥不得写入仓库。
