4. 总体架构设计

你的目标架构应该是这样：

GeekDesign
├── Web Editor 在线编辑器
├── Design Schema 设计文档模型
├── Scene Graph Engine 场景图引擎
├── Command System 命令系统
├── Canvas/WebGL Renderer 渲染器
├── Template System 模板系统
├── Asset System 素材系统
├── Export Service 导出服务
├── AI Agent Service AI 操作服务
├── MCP Server MCP 工具服务
├── User / Project System 用户和项目系统
├── Payment System 支付系统
└── Team / Collaboration 后期团队协作

其中长期最核心的是：

Design Schema
Scene Graph Engine
Command System
Renderer
MCP Tools

这五个决定你以后能不能接近 Canva / Figma。

5. 项目目录结构

建议直接做 Monorepo：

geekdesign/
├── apps/
│ ├── web/ # Next.js 前端
│ ├── api/ # FastAPI 主后端
│ ├── mcp-server/ # MCP Server，TypeScript
│ ├── agent-service/ # DeepSeek Agent Service，Python
│ ├── render-worker/ # 渲染导出服务
│ └── admin/ # 后台管理，后期
│
├── packages/
│ ├── design-schema/ # 设计 JSON Schema，TypeScript
│ ├── scene-graph/ # 场景图引擎
│ ├── command-system/ # 命令系统、撤销重做
│ ├── renderer-core/ # 渲染抽象层
│ ├── editor-core/ # 编辑器核心逻辑
│ ├── ui/ # 通用 UI 组件
│ └── shared/ # 通用类型、工具函数
│
├── infra/
│ ├── docker/
│ ├── nginx/
│ ├── postgres/
│ └── minio/
│
├── docs/
│ ├── architecture.md
│ ├── design-schema.md
│ ├── command-system.md
│ ├── mcp-tools.md
│ └── testing.md
│
├── scripts/
├── tests/
├── .github/
│ └── workflows/
├── package.json
├── pnpm-workspace.yaml
├── pyproject.toml
├── docker-compose.yml
└── AGENTS.md 6. Design Schema 详细设计

Design Schema 是整个系统的“宪法”。

你千万不要直接保存 Konva/Fabric 的对象格式。
你要保存自己的格式。

原因是：

以后你可能换渲染器
以后要导出 PDF / PPTX / SVG
以后要给 AI 操作
以后要做版本迁移
以后要做协同编辑
以后要做模板市场

如果直接存 Konva JSON，后面会被框架绑死。

6.1 设计文档结构
{
"schemaVersion": "0.1.0",
"documentId": "design_001",
"title": "AI 讲座邀请函",
"createdAt": "2026-06-13T00:00:00Z",
"updatedAt": "2026-06-13T00:00:00Z",
"canvas": {
"width": 1080,
"height": 1920,
"unit": "px",
"dpi": 96
},
"pages": [
{
"id": "page_001",
"name": "Page 1",
"background": {
"type": "color",
"value": "#ffffff"
},
"children": ["node_bg_001", "node_title_001", "node_qr_001"]
}
],
"nodes": {
"node_title_001": {
"id": "node_title_001",
"type": "text",
"role": "title",
"name": "主标题",
"parentId": "page_001",
"transform": {
"x": 120,
"y": 160,
"width": 840,
"height": 120,
"rotation": 0,
"scaleX": 1,
"scaleY": 1
},
"style": {
"opacity": 1,
"visible": true,
"locked": false,
"fill": "#111827",
"stroke": null,
"shadow": null
},
"text": {
"content": "AI Agent 实战分享",
"fontFamily": "Source Han Sans",
"fontSize": 56,
"fontWeight": 700,
"lineHeight": 1.2,
"letterSpacing": 0,
"textAlign": "center"
}
}
},
"assets": {},
"fonts": {},
"variables": {},
"metadata": {}
}
6.2 为什么 nodes 要用 Map，而不是数组？

不要这样：

{
"nodes": [
{ "id": "a" },
{ "id": "b" }
]
}

建议这样：

{
"nodes": {
"a": { "id": "a" },
"b": { "id": "b" }
}
}

原因：

根据 id 查元素更快
AI 工具调用通常按 element_id 修改
Command System 更容易做 patch
协同编辑更容易合并
撤销重做更容易记录差异

页面里的 children 决定图层顺序。

{
"children": ["background", "image_1", "title", "qr_code"]
}

越后面的元素越靠上。

6.3 节点类型

第一版支持：

text
image
rect
ellipse
line
svg
group
frame

第二版支持：

qr_code
table
chart
rich_text
video
component

第三版支持：

smart_layout
auto_fit_text
animation
transition
interactive_component
6.4 通用节点字段

所有节点都必须有：

type BaseNode = {
id: string;
type: NodeType;
role?: NodeRole;
name?: string;
parentId: string;
transform: Transform;
style: BaseStyle;
constraints?: LayoutConstraints;
data?: Record<string, unknown>;
};

其中：

type Transform = {
x: number;
y: number;
width: number;
height: number;
rotation: number;
scaleX: number;
scaleY: number;
};
type BaseStyle = {
opacity: number;
visible: boolean;
locked: boolean;
fill?: Paint;
stroke?: Stroke;
shadow?: Shadow;
blendMode?: BlendMode;
};
6.5 Paint 设计

颜色不能只支持纯色，必须支持可扩展：

type Paint =
| { type: "solid"; color: string }
| { type: "linear-gradient"; angle: number; stops: ColorStop[] }
| { type: "radial-gradient"; stops: ColorStop[] }
| { type: "image"; assetId: string; fit: "cover" | "contain" | "stretch" };

这样以后可以做：

渐变背景
图片填充
纹理填充
品牌色替换
AI 一键改色
6.6 Role 非常重要

你要给 AI 操作用的语义字段：

type NodeRole =
| "background"
| "title"
| "subtitle"
| "body"
| "logo"
| "qr_code"
| "avatar"
| "date"
| "location"
| "button"
| "decoration"
| "section_title"
| "experience"
| "education"
| "skill";

用户说：

把标题改大一点

AI 就可以找到：

role = title

而不是猜哪个文本是标题。

7. Command System 详细设计

Command System 是长期扩展的关键。

你要做到 Canva / Figma 那种体验，必须有：

撤销
重做
历史记录
版本回放
AI 操作可回滚
协同编辑
权限校验
操作日志

这些都依赖命令系统。

7.1 命令结构
type Command = {
id: string;
type: CommandType;
designId: string;
userId: string;
timestamp: number;
payload: unknown;
before?: Patch[];
after?: Patch[];
source: "user" | "ai" | "system";
};

命令类型：

type CommandType =
| "CREATE_NODE"
| "DELETE_NODE"
| "UPDATE_NODE"
| "MOVE_NODE"
| "RESIZE_NODE"
| "ROTATE_NODE"
| "SET_STYLE"
| "UPDATE_TEXT"
| "REORDER_NODE"
| "GROUP_NODES"
| "UNGROUP_NODES"
| "ADD_PAGE"
| "DELETE_PAGE"
| "SET_BACKGROUND"
| "FILL_TEMPLATE_VARIABLES";
7.2 命令执行流程
Command
↓
Validate
↓
Permission Check
↓
Apply to Scene Graph
↓
Generate Patch
↓
Save History
↓
Emit Event
↓
Render Update
7.3 为什么 AI 必须走 Command？

因为 AI 可能犯错。

如果 DeepSeek 直接改 JSON，可能：

删错节点
生成非法字段
把元素放出画布
引用不存在的素材
破坏模板变量
导致导出失败

所以必须让 AI 只能调用受控命令：

update_text
move_element
set_style
add_image
export_pdf

这些工具内部再转成 Command。

7.4 撤销重做

每个命令都要能生成 inverse command 或 before/after patch。

例如：

{
"type": "UPDATE_TEXT",
"targetId": "node_title_001",
"before": {
"text.content": "旧标题"
},
"after": {
"text.content": "新标题"
}
}

撤销就是把 before 应用回去。

8. 每个模块详细设计
   8.1 Web Editor 在线编辑器

职责：

渲染设计稿
响应鼠标键盘操作
选择元素
拖拽缩放旋转
修改样式
图层管理
页面管理
调用 Command System

核心组件：

CanvasViewport
CanvasStage
LayerRenderer
SelectionBox
TransformHandles
Toolbar
LeftPanel
RightInspector
LayersPanel
PagesPanel
AssetPanel
TemplatePanel
CommandPalette
AIAssistantPanel

技术建议：

Next.js
React
TypeScript
Zustand
自定义 Scene Graph
Canvas 2D 起步
后期 WebGL Renderer

第一版可以先 Canvas 2D，不要马上 WebGL。
WebGL 后期用在：

大量元素
复杂滤镜
视频
动画
高性能缩放
8.2 Design Schema

职责：

定义设计文档格式
定义节点类型
定义样式系统
定义资源引用
定义版本迁移
提供 JSON Schema 校验

必须提供：

TypeScript 类型
JSON Schema
Zod 校验器
版本迁移器
默认节点工厂
示例文档
单元测试
8.3 Scene Graph Engine

职责：

管理节点树
增删改查节点
计算层级关系
计算边界框
命中测试
对齐吸附
布局计算
序列化 / 反序列化

核心 API：

createScene(document)
getNode(id)
addNode(parentId, node)
removeNode(id)
updateNode(id, patch)
getChildren(parentId)
getAncestors(id)
getDescendants(id)
getBoundingBox(id)
hitTest(point)
serialize()
deserialize()
8.4 Canvas/WebGL Renderer

职责：

把 Scene Graph 画出来
支持缩放和平移
支持选中状态
支持导出预览
以后支持 WebGL

第一阶段：

Canvas 2D Renderer

第二阶段：

分层缓存
离屏 Canvas
图片缓存
字体加载

第三阶段：

WebGL Renderer
滤镜
动画
视频
高性能大画布
8.5 Template System

职责：

模板分类
模板变量
模板预览图
模板搜索
模板套用
高级模板权限

模板数据：

{
"templateId": "invite_black_gold_001",
"title": "黑金邀请函",
"category": "invitation",
"tags": ["黑金", "讲座", "商务"],
"premium": false,
"thumbnailUrl": "/templates/invite_black_gold.png",
"document": {},
"variables": [
{
"key": "title",
"label": "活动标题",
"targetNodeId": "node_title_001",
"path": "text.content",
"type": "text"
}
]
}
8.6 Asset System

职责：

上传图片
管理素材
生成缩略图
图片压缩
权限控制
素材搜索
素材插入设计稿

资源类型：

image
svg
icon
font
video
audio
background
texture

后端要做：

文件 MIME 检查
大小限制
病毒扫描，后期
缩略图生成
图片元信息提取
对象存储上传
8.7 Export Service

职责：

导出 PNG
导出 PDF
导出 SVG
导出 PPTX
批量导出 ZIP
服务端高清渲染

第一版：

前端 Canvas 导出 PNG
后端 Playwright 导出 PDF

第二版：

Render Worker 根据 Design JSON 生成高清 PNG/PDF

第三版：

PPTX 导出
SVG 导出
视频导出

注意：

PPTX 先做图片型 PPTX
后期再做可编辑 PPTX
8.8 AI Agent Service

职责：

接收用户自然语言
调用 DeepSeek
管理工具调用
调用 MCP tools
读取设计摘要
执行设计命令
返回预览和解释

核心流程：

user prompt
↓
build context
↓
DeepSeek tool calling
↓
execute tool
↓
render preview
↓
continue or respond

AI 不能直接改数据库，只能走：

AI Tool Call → Command → Scene Graph
8.9 MCP Server

职责：

暴露工具给 AI
暴露资源给 AI
暴露设计工作流 Prompt
统一工具协议

MCP Tools：

create_design
open_design
search_templates
create_design_from_template
get_current_design_summary
list_elements
update_text
add_text
add_image
replace_image
move_element
resize_element
set_style
align_element
apply_palette
render_preview
export_png
export_pdf

MCP Resources：

design://current/scene
design://current/elements
design://current/thumbnail
template://categories
template://{template_id}
asset://user/uploads
brand://current

MCP Prompts：

create_invitation_from_brief
create_resume_from_profile
create_certificate_batch
create_presentation_from_outline
revise_design_by_feedback
8.10 User / Project System

职责：

注册登录
项目列表
保存设计
自动保存
版本历史
项目权限
分享链接

核心表：

users
projects
project_versions
project_snapshots
project_members
share_links
8.11 Payment System

职责：

会员套餐
订单
支付
导出权益
AI 点数
高级模板权限
去水印

早期可以先做“权益系统”，支付后接。

权益字段：

can_export_hd
can_remove_watermark
can_use_premium_template
ai_credits
max_projects
max_upload_storage
8.12 Team / Collaboration

后期做。

职责：

团队空间
成员邀请
角色权限
团队模板
品牌资产
实时协作
评论
审批

协同建议：

早期不要做实时协作
中期做分享和评论
后期再接 Yjs / CRDT
