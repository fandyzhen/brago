# Brago Google-Ready Posts P0 — 主索引

> **执行说明**：按 Phase 顺序执行。每个 Phase 完成后跑一次 `pnpm lint && pnpm test && pnpm build`，确认绿了再进入下一个 Phase。
> Phase 0 是用户手动准备（API key / 域名 / Creem 验证），代码侧不实现，但 Phase 4/5 启动时会做 fallback 让"未配置"也能跑通。

**对应 Spec**：`/Volumes/FZD/开发项目/Brago项目前期/2026-05-29-1-brago-google-ready-posts-p0-spec.md`

## Phase 顺序

| Phase | 文件 | 主要交付 |
|---|---|---|
| 1 | `2026-05-29-brago-p0-phase1-info-architecture.md` | 公开首页 / 免费工具页 / 定价 / 关闭旧多渠道入口 |
| 2 | `2026-05-29-brago-p0-phase2-data-model.md` | 5 张新表 + brand voice + dashboard 骨架 + create flow 骨架 |
| 3 | `2026-05-29-brago-p0-phase3-upload-images.md` | HEIC 客户端转换 + R2 上传 + sharp 标准化 |
| 4 | `2026-05-29-brago-p0-phase4-vision-best-shot.md` | Vision provider 抽象 + best after shot + before/after proof |
| 5 | `2026-05-29-brago-p0-phase5-caption-engine.md` | 50 个模板 + policy checker + history-aware + EN/ES |
| 6 | `2026-05-29-brago-p0-phase6-reminders.md` | Weekly reminder + cron + mark-as-posted + freshness streak |
| 7 | `2026-05-29-brago-p0-phase7-tests-launch.md` | 测试套件 + privacy/terms 更新 + launch-checklist 更新 |

## 全局约束

- ❌ 不主动扩到 FB/IG/Nextdoor、自动发帖、自动发短信、CRM、视频、Google API 拉取数据、复杂 admin、AI 修图替换施工。
- ❌ 不删旧表 (`post`, `post_image_pair`)，但 UI 不再暴露旧 multi-channel 入口。
- ❌ 不删除旧 `/api/posters/*` 路由（防止 prod 数据迁移问题），但 UI 不再调用。
- ✅ 全新业务走 `google_posts` 表 + `/api/brago/google-posts/*` namespace。
- ✅ Vision/Text provider 必须可替换；未配置时 fallback 走手动选图 + 模板生成的 caption。

## 命名约定

- 新文件路径优先用 `brago-google-*` 前缀方便检索。
- 服务端模块放 `lib/brago/`。
- 客户端组件放 `features/brago/`。

## Definition of Done（任一 Phase 完成时）

- [ ] 该 Phase 描述的全部 Task 完成
- [ ] `pnpm lint` 通过
- [ ] `pnpm test` 通过
- [ ] `pnpm build` 通过（除非 Phase 自身明确豁免）
- [ ] git status 清理（每个 Task 单独 commit）
