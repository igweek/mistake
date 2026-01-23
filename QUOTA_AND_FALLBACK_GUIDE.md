# 🔧 API 配额和故障排除指南

**问题**：Gemini API 免费层配额超出 (429 错误)  
**状态**：✅ **已解决** - 现已支持自动降级方案  
**更新日期**：2026年1月23日

---

## 📋 问题说明

### 错误症状
```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent 429 (Too Many Requests)

Error: Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_input_token_count
```

### 原因
Gemini API 的免费层有配额限制：
- ⏱️ **每分钟请求数**：有限制
- 🔤 **每天 Token 数**：有限制  
- 💾 **每分钟 Token 数**：有限制

超出限制时会返回 429 错误。

---

## ✅ 解决方案

### 方案 1️⃣：自动降级（推荐）✨ 新

应用现已支持**自动降级到本地图像增强**：

**工作流程**：
```
用户点击"去除手写痕迹"
        ↓
尝试使用 Gemini AI
        ↓
    如果失败（配额超出/网络错误）
        ↓
自动降级到本地增强算法
        ↓
返回增强后的图片
        ↓
用户看到结果（标注为"本地增强"）
```

**用户体验**：
- ✅ 自动处理，无需用户干预
- ✅ 降级后仍能改善图片质量
- ✅ 清晰的提示说明使用的方案

**技术细节**：
- 本地增强使用强化对比度算法 (1.8x)
- 自动识别打印文字 vs 手写痕迹
- 在网页浏览器中运行，无需服务器

---

### 方案 2️⃣：升级 API 计划

如果需要更好的 AI 处理效果（推荐用于生产环境）：

**步骤**：
1. 访问 [Google AI Studio](https://ai.google.dev/aistudio)
2. 点击 "Manage billing"
3. 选择 "Upgrade to paid plan"
4. 配置信用卡并启用付费计划

**付费计划优势**：
- 💰 更高的配额限制
- 🚀 更快的响应速度
- 🔒 更好的技术支持
- 📊 详细的使用统计

**定价**：
```
初始额度：$300 (90天)
超出后：$0.50/百万 tokens (输入)
        $1.50/百万 tokens (输出)
```

详见 [Gemini 定价](https://ai.google.dev/pricing)

---

### 方案 3️⃣：等待配额重置

免费层配额通常在 24 小时内重置。

**检查配额状态**：
1. 访问 [Google AI Studio Dashboard](https://ai.google.dev/aistudio)
2. 查看 "Usage" 或 "Quotas" 部分
3. 查看下次重置时间

---

## 🎯 用户面临的情况

### 场景 1：API 配额超出
```
用户点击"去除手写痕迹"
         ↓
系统提示："已使用本地算法增强
（提示：升级 API 可获得更好的 AI 处理效果）"
         ↓
图片使用本地算法处理
         ↓
用户可以继续使用应用
         ↓
可选择升级 API 获得更好效果
```

### 场景 2：API Key 配置错误
```
用户点击"去除手写痕迹"
         ↓
系统提示清晰的错误信息：
"Gemini API Key 配置错误
请检查:
1. API Key 是否正确配置
2. API Key 是否有效
3. 是否启用了 Gemini API

获取或重新配置: https://ai.google.dev/aistudio"
         ↓
用户点击链接重新配置
```

### 场景 3：网络错误
```
用户点击"去除手写痕迹"
         ↓
网络连接失败或中断
         ↓
系统自动降级到本地增强
         ↓
图片处理完成
```

---

## 🔍 技术改进说明

### 代码变更

#### 1. 添加本地增强函数 (`imageProcessingService.ts`)

```typescript
const enhanceImageLocally = async (base64Image: string): Promise<string> => {
  // 使用本地算法（1.8x 对比度增强）
  // 自动标注"本地增强"
  // 完全离线处理
}
```

#### 2. 改进错误处理

```typescript
// 精确识别错误类型
- 429 配额超出 → 尝试降级
- 403 API Key 错误 → 提示重新配置
- 网络错误 → 自动降级
- 其他错误 → 降级处理

// 用户友好的错误消息
throw new Error("清晰的错误说明\n\n解决方案:\n1. ...\n2. ...");
```

#### 3. 添加自动降级参数

```typescript
export const removeHandwritingWithAI = async (
  base64Image: string,
  geminiApiKey?: string,
  fallbackToLocal: boolean = true  // ← 新增参数
)
```

#### 4. 改进 UI 提示

```typescript
const successMsg = cleanedImage.includes('本地增强') 
  ? "已使用本地算法增强（提示：升级API可获得更好的AI处理效果）"
  : "AI处理成功";
```

---

## 📊 功能对比

| 功能 | Gemini AI | 本地增强 |
|------|-----------|---------|
| 识别手写痕迹 | ✅ 精确 | ⭐ 基础 |
| 清晰化效果 | ✅ 优秀 | ⭐⭐ 良好 |
| 处理速度 | ⏱️ 1-3秒 | ⚡ <100ms |
| 离线使用 | ❌ 否 | ✅ 是 |
| 配额限制 | ⚠️ 有 | ❌ 无 |
| 成本 | 💰 付费后 | 🆓 免费 |

---

## 💡 最佳实践建议

### 对于开发者

1. **始终配置 API Key**
   ```typescript
   const geminiApiKey = settings?.geminiApiKey;
   if (!geminiApiKey) {
     // 引导用户配置
   }
   ```

2. **监控配额使用**
   - 定期检查 [AI Studio Dashboard](https://ai.google.dev/aistudio)
   - 设置配额告警

3. **优化请求**
   - 压缩图片大小
   - 减少不必要的请求
   - 实现请求缓存

4. **妥善处理错误**
   ```typescript
   try {
     // AI 处理
   } catch (error) {
     if (isQuotaExceeded(error)) {
       // 降级到本地
     }
   }
   ```

### 对于最终用户

1. **升级计划获得更好体验**
   - 免费层限制有限
   - 付费计划更稳定可靠
   - 成本很低（按使用付费）

2. **遇到问题时**
   - 检查错误提示
   - 访问提示的文档链接
   - 等待配额重置（如适用）

3. **优化使用方式**
   - 拍摄清晰的图片（减少 AI 处理难度）
   - 避免频繁处理相同图片
   - 定期检查配额使用

---

## 🔗 相关资源

### 官方文档
- 📖 [Gemini API 文档](https://ai.google.dev/docs)
- 📋 [速率限制和配额](https://ai.google.dev/gemini-api/docs/rate-limits)
- 💰 [定价信息](https://ai.google.dev/pricing)
- 📊 [使用控制面板](https://ai.dev/rate-limit)

### 故障排除
- 🔧 [API 错误代码](https://ai.google.dev/gemini-api/docs/error-handling)
- 🆘 [常见问题](https://ai.google.dev/faq)
- 💬 [社区论坛](https://github.com/google/generative-ai)

---

## 📝 问题排查表

| 症状 | 原因 | 解决方案 |
|------|------|---------|
| 429 Too Many Requests | 配额超出 | 升级计划或等待重置 |
| 403 Forbidden | API Key 无效 | 重新配置 API Key |
| Network Error | 网络连接问题 | 检查网络或自动降级 |
| Timeout | 请求超时 | 重试或降级 |
| Invalid API Key | Key 配置错误 | 复制正确的 Key |

---

## ✨ 后续改进计划

### 已实现
- ✅ 自动降级到本地增强
- ✅ 改进错误提示
- ✅ 支持多种错误类型识别

### 计划中
- ⏳ 请求队列和重试机制
- ⏳ 配额监控和告警
- ⏳ 可配置的降级策略
- ⏳ 使用统计展示

---

## 🎓 使用建议

### 开发环境
```
使用免费层 API Key，配合自动降级
→ 足够用于开发和测试
→ 无需额外成本
```

### 测试环境  
```
使用免费层或低额度付费计划
→ 测试更真实的场景
→ 监控配额使用
```

### 生产环境
```
强烈推荐付费计划
→ 更高配额保障
→ 更好的性能
→ 更稳定的服务
```

---

## 📞 获取帮助

### 应用内问题
- 查看弹出的错误提示
- 按照提示的链接操作

### 配置问题
- 参考 [USER_GUIDE.md](USER_GUIDE.md) 的配置部分
- 访问 [Google AI Studio](https://ai.google.dev/aistudio)

### 技术问题
- 查看 [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)
- 检查浏览器控制台日志
- 参考本文档的故障排查表

---

**版本**：2.0（配额和降级支持）  
**最后更新**：2026年1月23日

---

感谢使用 AI 错题本应用！如有任何问题，请参考上述指南。
