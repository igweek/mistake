## 第一步：准备 Supabase 环境（后端）
创建项目：前往 Supabase 官网，创建一个新项目。
创建数据库表：在左侧菜单进入 SQL Editor，点击 New query，粘贴并运行以下代码（用于创建错题表和用户设置表）：
```sql
-- 1. 创建错题表
create table mistakes (
  id uuid default gen_random_uuid() primary key,
  subject text not null,
  semester text,
  questionText text,
  imageUrl text,
  aiAnalysis text,
  tags text[],
  createdAt bigint not null,
  deletedAt bigint,
  user_id uuid references auth.users not null default auth.uid()
);

-- 2. 创建用户配置表（用于多端同步 AI Key 等设置）
create table user_settings (
  user_id uuid references auth.users primary key,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default now()
);

-- 开启 Row Level Security (RLS) 确保数据安全，只有用户自己能看自己的数据
alter table mistakes enable row level security;
create policy "Users can manage their own mistakes" on mistakes for all using (auth.uid() = user_id);

alter table user_settings enable row level security;
create policy "Users can manage their own settings" on user_settings for all using (auth.uid() = user_id);

```
创建存储桶 (Storage)：
进入左侧 Storage 菜单，点击 New Bucket。
名称必须填：mistake-images。
将模式设为 Public（公开），这样 AI 才能读取到图片进行分析。

## 第二步：在 Vercel 中设置环境变量
部署到 Vercel 时，请在 Settings -> Environment Variables 中添加以下变量。注意：前缀必须带有 VITE_，否则浏览器端代码无法读取。

变量名	来源	说明
VITE_SUPABASE_URL	Supabase -> Settings -> API	项目的 Project URL
VITE_SUPABASE_KEY	Supabase -> Settings -> API	anon / public 密钥
VITE_GEMINI_API_KEY	Google AI Studio	您的 Gemini 密钥
VITE_ADMIN_USERNAME	自定义	登录后右上角显示的名称

## 第三步：创建管理员账号
由于这是您的私人应用，建议您通过以下方式创建账号：
进入 Supabase 仪表盘的 Authentication 页面。
点击 Add User -> Create new user。
输入您想使用的管理员邮箱和密码，点击创建。
注意：在 Auth Settings 里可以关闭 Confirm email（邮件确认），这样创建完就能直接登录。
## 第四步：部署
将代码推送到 GitHub。
在 Vercel 中导入该仓库。
Vercel 会自动识别 Vite 项目并进行构建。
部署完成后访问域名：系统会因为检测到了环境变量，直接显示管理员登录界面，您只需输入刚才创建的邮箱和密码即可。
