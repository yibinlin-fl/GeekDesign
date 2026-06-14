# GeekDesign AGENTS.md

你正在开发 GeekDesign，一个长期可扩展的 Canva-like 在线设计平台。

## 产品目标

GeekDesign 不是简单海报生成器，而是一个在线视觉设计平台，长期目标接近 Canva / Figma 的架构：

- 自定义 Design Schema
- 自定义 Scene Graph Engine
- 自定义 Command System
- Canvas/WebGL Renderer
- React UI Editor
- Template System
- Asset System
- Export Service
- AI Agent Service
- MCP Server
- User / Project System
- Payment System
- Team / Collaboration

## 技术栈

前端：

- Next.js
- React
- TypeScript
- Tailwind CSS
- Zustand
- 自定义 Canvas 2D Renderer 起步
- 后期支持 WebGL Renderer

后端：

- FastAPI
- PostgreSQL
- SQLAlchemy
- Alembic
- Redis
- Celery 或 RQ
- MinIO / S3 兼容对象存储

AI：

- DeepSeek API Tool Calling
- MCP Server
- AI Agent Service
- 所有 AI 设计操作必须通过 Command System 执行，禁止直接修改数据库或完整 JSON

包管理：

- pnpm monorepo
- Python 使用 uv 或 poetry
- TypeScript 使用 strict mode

## 架构原则

1. 不允许直接使用 Konva/Fabric 的 JSON 作为长期存储格式。
2. 必须定义自己的 Design Schema。
3. 所有设计修改必须通过 Command System。
4. 所有命令必须支持验证、执行、撤销、重做和测试。
5. 所有 AI 操作必须走 MCP Tool 或 Agent Tool，再转换为 Command。
6. Scene Graph 是唯一可信的设计状态来源。
7. Renderer 只负责渲染，不负责业务状态。
8. Web Editor 只发出命令，不直接改底层文档。
9. 后端保存的是 Design Document JSON 和版本快照。
10. 任何高风险操作，例如删除项目、公开分享、批量导出、支付，必须有权限校验和操作日志。

## 测试要求

每个模块必须包含测试：

- design-schema：类型测试、Zod 校验测试、版本迁移测试
- scene-graph：节点增删改查、层级关系、hitTest、bounding box 测试
- command-system：命令执行、撤销、重做、非法参数测试
- renderer-core：基础渲染快照测试或 smoke test
- web editor：Playwright 端到端测试
- api：pytest API 测试
- mcp-server：工具 schema 测试、mock command executor 测试
- agent-service：mock DeepSeek tool calling 测试
- export-service：导出任务测试

## Git 规则

每个阶段完成后必须：

1. 运行格式化
2. 运行 lint
3. 运行单元测试
4. 运行必要的端到端测试
5. 生成简短变更总结
6. 使用规范 commit message 提交
7. 推送到当前分支

Commit message 使用 Conventional Commits：

- feat(schema): add initial design document schema
- feat(scene): implement scene graph node operations
- feat(command): add command executor with undo redo
- feat(editor): render scene graph on canvas
- feat(mcp): expose design editing tools
- test(command): cover undo redo command flow
- docs(architecture): add geekdesign system plan

## 禁止事项

- 禁止为了快速实现而绕过 Command System。
- 禁止让 AI 直接写完整 Design JSON。
- 禁止把用户上传文件直接作为可信资源。
- 禁止在没有测试的情况下修改核心 schema。
- 禁止在没有迁移器的情况下破坏旧 schema。
- 禁止把密钥写入仓库。
