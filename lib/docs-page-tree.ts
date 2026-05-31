import type { Root } from 'fumadocs-core/page-tree';

// 项目仅支持英文（i18n.config.ts: locales = ['en']）。
// 历史上这里曾把英文导航项翻译成中文，已随 /zh 移除一并删除。
export function localizeDocsPageTree(_locale: string, tree: Root): Root {
  return tree;
}
