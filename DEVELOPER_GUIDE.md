# 开发者文档 - AI错题本应用更新说明

## 概述
本文档说明了应用最新的功能更新，包括移动端UI优化和AI手写痕迹去除功能。

---

## 架构变更

### 新增模块
```
services/
├── imageProcessingService.ts  [新] - AI图像处理服务
├── geminiService.ts           [存] - Gemini AI基础服务
├── authService.ts
├── storageService.ts
└── supabaseClient.ts
```

### 修改的模块
```
components/
├── AddMistakeForm.tsx          [改] - 更新UI布局和功能
├── Dashboard.tsx               [存] 不变
├── Layout.tsx                  [存] 不变
└── ...其他组件
```

---

## API 变更

### 新增服务：`imageProcessingService.ts`

#### 导出函数

```typescript
/**
 * 使用AI去除图片中的手写痕迹
 * @param base64Image - Base64编码的图片
 * @param geminiApiKey - Gemini API密钥（可选，会从localStorage获取）
 * @returns 处理后的Base64图片
 * @throws 处理失败时抛出错误
 */
export async function removeHandwritingWithAI(
  base64Image: string,
  geminiApiKey?: string
): Promise<string>
```

#### 使用示例

```typescript
import { removeHandwritingWithAI } from '../services/imageProcessingService';

try {
  const cleanedImage = await removeHandwritingWithAI(
    base64Image,
    apiKey
  );
  setImagePreview(cleanedImage);
} catch (error) {
  alert('处理失败: ' + error.message);
}
```

#### 工作流程
1. 验证API密钥
2. 初始化Gemini AI客户端
3. 发送图片和处理指令到Gemini 2.0 Flash模型
4. 接收AI分析结果
5. 应用图像增强算法（对比度+5%，亮度调整）
6. 返回处理后的Base64图片

#### 错误处理
- API密钥缺失 → 抛出"请先在设置中配置 Gemini API Key"
- 网络错误 → 抛出带有细节的错误信息
- 处理失败 → 抛出"AI处理失败"错误

---

## 组件更改

### `AddMistakeForm.tsx`

#### Props 变更
```typescript
interface AddMistakeFormProps {
  onSave: (mistake: Omit<Mistake, 'id' | 'createdAt'>, id?: string) => void;
  onCancel: () => void;
  existingTags: string[];
  initialData?: Mistake;
  geminiApiKey?: string;  // [新] AI处理所需的API密钥
}
```

#### 新增状态
```typescript
const [isRemovingHandwriting, setIsRemovingHandwriting] = useState(false);
```

#### 新增函数
```typescript
/**
 * 处理手写痕迹去除
 * 调用AI服务，显示加载状态，更新图片预览
 */
const handleRemoveHandwriting = async () => { ... }
```

#### UI 变更（移动端）

**之前**（下拉菜单设计）：
```
┌─────────────────────────────────┐
│ 录入错题  [⬇]  [✓]             │
├─────────────────────────────────┤
│ [侧边栏]│  [拍摄按钮]           │
│ 科目   │      图片预览          │
│ 标签   │                       │
│ (隐藏) │                       │
└─────────────────────────────────┘
点击⬇展开设置
```

**现在**（直接显示设计）：
```
┌─────────────────────────────────┐
│ 录入错题        [✓]             │
├─────────────────────────────────┤
│ 对应科目 [数学] [英语] [语文]   │
│ 已有标签 [导数] [几何]          │
│ 新建标签 [输入框] [+]           │
│ 已选标签 [导数 ✕]              │
│                                 │
│      [📷 点击拍照或上传]        │
│                                 │
└─────────────────────────────────┘
```

#### 新增UI元素

1. **移动端科目选择** - 4列网格布局
   ```tsx
   <div className="grid grid-cols-4 gap-1.5">
     {Object.values(Subject).map((s) => (
       <button ...>{t[`subj_${s}`]}</button>
     ))}
   </div>
   ```

2. **手写痕迹去除按钮** - 两个版本
   - **移动端**：在图片预览下方显示
     ```tsx
     <button onClick={async () => await handleRemoveHandwriting()}>
       <Wand2 size={18} /> 去除手写痕迹
     </button>
     ```
   - **桌面端**：在底部操作栏显示
     ```tsx
     <button onClick={async () => await handleRemoveHandwriting()}>
       <Wand2 size={22}/> AI清除
     </button>
     ```

#### 删除的UI元素
- `showSettings` 状态和相关的下拉菜单
- 侧边栏的条件渲染逻辑

---

## 集成指南

### 1. 更新应用设置传递

在 `App.tsx` 中，确保将 `geminiApiKey` 传递给 `AddMistakeForm`：

```typescript
<AddMistakeForm 
  initialData={editingMistake}
  onSave={handleSaveMistake} 
  onCancel={() => { ... }}
  existingTags={existingTags}
  geminiApiKey={settings?.geminiApiKey}  // [新增]
/>
```

### 2. 配置 Gemini API

确保应用的设置系统正确存储和读取 `geminiApiKey`：

```typescript
// 从设置读取
const apiKey = settings?.geminiApiKey;

// 保存到存储
localStorage.setItem('mistake-notebook-settings', 
  JSON.stringify({...settings, geminiApiKey: newKey})
);
```

### 3. 错误处理

添加全局错误处理：

```typescript
try {
  const cleanedImage = await removeHandwritingWithAI(base64, apiKey);
  // 处理成功
} catch (error) {
  if (error.message.includes('API Key')) {
    // 引导用户配置API Key
  } else if (error.message.includes('网络')) {
    // 网络错误提示
  } else {
    // 其他错误处理
  }
}
```

---

## 性能考虑

### 图片处理流程优化

1. **图片大小限制**
   ```typescript
   const MAX_WIDTH = 1280; // 自动压缩到此宽度
   ```

2. **格式转换**
   - 输入：任意格式 (JPG, PNG, WebP, etc.)
   - 输出：WebP 格式（更小的文件大小）
   - 质量：0.8（平衡质量和文件大小）

3. **AI处理优化**
   - 使用 Gemini 2.0 Flash（快速、轻量级模型）
   - 支持 Base64 直接传输（无需上传到服务器）
   - 响应时间：通常 1-3 秒

### 缓存策略建议

```typescript
// 可选：添加缓存以避免重复处理
const processingCache = new Map<string, string>();

export async function removeHandwritingWithAI(
  base64Image: string,
  geminiApiKey?: string
): Promise<string> {
  // 检查缓存
  if (processingCache.has(base64Image)) {
    return processingCache.get(base64Image)!;
  }
  
  // 处理并缓存
  const result = await /* AI处理 */;
  processingCache.set(base64Image, result);
  return result;
}
```

---

## 测试指南

### 单元测试

```typescript
// 测试removeHandwritingWithAI函数
describe('imageProcessingService', () => {
  test('should process image with valid API key', async () => {
    const testImage = 'data:image/jpeg;base64,...';
    const result = await removeHandwritingWithAI(testImage, 'valid-key');
    expect(result).toContain('data:image');
  });

  test('should throw error without API key', async () => {
    await expect(removeHandwritingWithAI('data:image/jpeg;...')).rejects.toThrow();
  });
});
```

### 集成测试

```typescript
// 测试AddMistakeForm中的手写痕迹去除功能
describe('AddMistakeForm', () => {
  test('should show handwriting removal button on mobile', () => {
    // 模拟移动端环境
    // 验证按钮出现
    // 点击按钮验证handleRemoveHandwriting被调用
  });
});
```

### 手动测试清单

- [ ] 移动端：科目选择显示正确
- [ ] 移动端：标签选择和创建功能正常
- [ ] 移动端：手写痕迹去除按钮出现
- [ ] 桌面端：操作栏显示AI清除按钮
- [ ] AI处理：成功处理测试图片
- [ ] 错误处理：API Key缺失时显示错误提示
- [ ] 错误处理：网络错误时显示重试选项
- [ ] 图片保存：处理后的图片能正确保存
- [ ] 性能：处理速度在可接受范围内（<5秒）

---

## 故障排除

### 常见问题及解决方案

#### 问题1：手写痕迹去除按钮不显示
**原因**：API密钥未配置或为空
**解决**：
1. 检查 `settings?.geminiApiKey` 是否有值
2. 在设置页面重新配置API密钥
3. 重启应用

#### 问题2：AI处理超时
**原因**：网络速度慢或服务器繁忙
**解决**：
1. 检查网络连接
2. 重试操作
3. 如持续失败，使用简化版本（不使用AI）

#### 问题3：处理后的图片质量差
**原因**：原始图片质量不好或手写痕迹过多
**解决**：
1. 改进拍摄条件（光线充足，角度正确）
2. 清理明显的手写笔迹后再拍
3. 调整对比度算法的强度

#### 问题4：图片超出界限显示不全
**原因**：CSS 布局问题
**解决**：
```typescript
// 确保使用正确的CSS
img {
  max-height: 100%;
  max-width: 100%;
  object-fit: contain;
}
```

---

## 未来增强

### 建议的改进方向

1. **本地AI处理**
   - 使用 TensorFlow.js 或 ONNX.js 实现离线处理
   - 减少网络依赖

2. **高级处理选项**
   - 允许用户调整清晰化强度
   - 预设处理模板（考试卷、笔记、教科书等）

3. **批量处理**
   - 支持一次上传多张图片
   - 后台批量处理

4. **处理历史**
   - 保存处理前后的对比
   - 允许撤销处理

5. **效果预览**
   - 在处理前显示预期效果
   - 处理中显示实时进度

---

## 依赖关系

### 新增依赖
无新增，使用现有的 `@google/genai` 包

### 版本要求
- React >= 19.0
- TypeScript >= 5.2
- Google GenAI SDK >= 1.37.0

---

## 部署检查清单

- [ ] 所有代码已审查
- [ ] 编译无错误和警告
- [ ] 所有测试通过
- [ ] 性能测试完成
- [ ] API Key安全处理已验证
- [ ] 用户文档已更新
- [ ] 构建产物大小合理
- [ ] 在目标平台上测试过
- [ ] 性能指标符合要求
- [ ] 错误日志收集已配置

---

**最后更新**：2026年1月23日  
**作者**：AI 开发助手  
**版本**：2.0
