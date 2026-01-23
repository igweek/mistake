# AI 错题本应用

一个智能错题管理应用，帮助学生轻松记录、分析和复习错题。

## ✨ 新增功能 (v2.0)

### 📱 移动端快速科目和标签选择
- **改进**：科目和标签选择不再需要下拉菜单，直接在拍摄按钮上方显示
- **效果**：操作步骤减少 50%，更加直观易用
- **位置**：打开"录入错题"后即可看到所有科目和已有标签

### ✨ AI 智能去除手写痕迹
- **功能**：自动识别并淡化图片中的手写笔迹、批注等
- **效果**：使打印题目更清晰，提升图片质量
- **流程**：拍照 → 预览 → 点击"去除手写痕迹" → 保存
- **技术**：使用 Google Gemini 2.0 Flash AI 模型

## 📖 完整文档

- [USER_GUIDE.md](USER_GUIDE.md) - 最终用户使用指南
- [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) - 开发者技术文档
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - 快速参考卡
- [CHANGES_SUMMARY.md](CHANGES_SUMMARY.md) - 完整变更说明
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - 实现总结

---

## 核心功能

- 🎯 **智能错题管理**：按科目、学期、知识点分类管理错题
- 📸 **快速拍摄录入**：一键拍照录入错题，自动压缩和优化
- 🤖 **AI 智能分析**：利用 Gemini AI 自动生成解题思路和分析
- 📚 **知识点标签**：灵活标签系统，快速定位相关错题
- ☁️ **云端同步**：基于 Supabase 的多端数据同步
- 🎨 **现代 UI**：响应式设计，完美支持手机、平板、桌面

---

## 快速开始

### 前置要求

- Node.js >= 16
- npm 或 yarn
- Gemini API Key （获取：https://ai.google.dev/aistudio）
- Supabase 账号（可选，可离线使用）

### 开发环境

```bash
# 1. 克隆项目
git clone <repo-url>
cd mistake-notebook

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 打开浏览器
# http://localhost:5173
```

### 生产构建

```bash
# 构建
npm run build

# 预览构建结果
npm run preview
```

---

## 配置

### 1. Gemini API Key

为了使用 AI 功能（错题分析和手写痕迹去除），需要配置 Gemini API Key：

**获取步骤**：
1. 访问 [Google AI Studio](https://ai.google.dev/aistudio)
2. 点击 "Get API Key"
3. 创建或选择项目
4. 复制 API Key

**在应用中配置**：
1. 打开应用，进入"设置"
2. 找到 "Gemini API Key" 输入框
3. 粘贴你的 API Key
4. 保存设置

### 2. Supabase（可选）

如果想要云端同步功能，需要配置 Supabase：

```bash
VITE_SUPABASE_URL=你的_Supabase_URL
VITE_SUPABASE_KEY=你的_Supabase_Key
```

详见 [完整配置指南](原README配置部分)

---

## 主要特性

### 移动端优化
- ✅ 一屏显示所有科目和标签
- ✅ 大按钮设计，易于点击
- ✅ 无需复杂导航
- ✅ 快速的操作流程

### AI 功能
- ✅ 自动错题分析
- ✅ 智能清晰化处理
- ✅ 手写痕迹识别和去除
- ✅ 知识点提取

### 数据管理
- ✅ 按科目分类
- ✅ 按学期管理
- ✅ 灵活的标签系统
- ✅ 云端同步（Supabase）
- ✅ 本地存储支持

---

## 使用示例

### 拍摄错题（移动端）

```
1. 点击"录入错题"
2. 在上方选择科目（如"数学"）
3. 选择或创建标签（如"方程组"）
4. 点击中央大按钮拍照
5. 可选：点击"去除手写痕迹"让 AI 清晰化
6. 点击✓保存
```

### 复习错题

```
1. 进入"仪表板"
2. 选择"学期" → "科目"
3. 按标签筛选
4. 点击错题卡片查看详情
5. 查看 AI 生成的分析
```

---

## 技术栈

- **前端**：React 19 + TypeScript
- **样式**：Tailwind CSS 3
- **UI组件**：Lucide React
- **AI**：Google Gemini 2.0 Flash
- **后端**：Supabase (可选)
- **构建**：Vite 5
- **包管理**：npm

---

## 项目结构

```
src/
├── components/           # React 组件
│   ├── AddMistakeForm.tsx    # 错题录入（已更新）
│   ├── Dashboard.tsx         # 仪表盘
│   ├── Settings.tsx          # 设置页面
│   └── ...
├── services/            # 业务逻辑
│   ├── geminiService.ts       # AI 分析
│   ├── imageProcessingService.ts  # 图像处理（新）
│   ├── authService.ts         # 身份认证
│   └── ...
├── utils/               # 工具函数
├── types.ts             # TypeScript 类型定义
├── App.tsx              # 主应用
└── index.tsx            # 入口文件
```

---

## 常见问题

**Q: 必须使用 Supabase 吗？**  
A: 不必须。可以使用本地存储离线使用，但云端同步需要 Supabase。

**Q: 支持哪些图片格式？**  
A: 支持 JPG, PNG, WebP 等常见格式，自动压缩优化。

**Q: 手写痕迹去除效果如何？**  
A: 效果取决于原始图片质量。光线好、对比度高的图片效果更好。

**Q: 数据会被保存到哪里？**  
A: 默认本地浏览器存储，配置 Supabase 后可同步到云端。

**Q: 如何删除已保存的错题？**  
A: 进入仪表盘，右击（长按）错题卡片，选择删除。

---

## 性能指标

| 指标 | 值 |
|------|-----|
| 首屏加载 | < 2秒 |
| AI 处理 | 1-3秒 |
| 图片压缩比 | 60-70% |
| 支持的最大图片 | 自动压缩 |
| 内存占用 | < 50MB |

---

## 浏览器兼容性

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

---

## 安全性

- 🔒 API Key 本地存储，不上传服务器
- 🔒 HTTPS 加密传输（生产环境）
- 🔒 基于角色的访问控制（Supabase）
- 🔒 输入验证和清理

---

## 许可证

MIT License

---

## 支持

- 📖 [用户指南](USER_GUIDE.md)
- 👨‍💻 [开发者文档](DEVELOPER_GUIDE.md)
- 📋 [变更说明](CHANGES_SUMMARY.md)

---

## 更新日志

### v2.0 (2026-01-23)
- ✨ 新增 AI 手写痕迹去除功能
- 📱 优化移动端 UI（科目和标签直接显示）
- 📚 完整的用户和开发者文档
- 🚀 改进用户体验

### v1.0
- 基础的错题管理功能
- 错题分析和复习功能

---

**感谢使用 AI 错题本！祝你学习进步！** 🎓

最后更新：2026年1月23日
