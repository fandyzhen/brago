import React from "react";

/**
 * 全站氛围背景层 — Job-Site Bold 设计语言。
 *
 * 原模板的动画网格 + 流动渐变线在暖纸底色上会形成杂乱的浅色条纹，
 * 导致页面文字"渐变看不清"。这里统一替换为柔和的暖琥珀光晕，
 * 与首页 / dashboard 的 `.bg-paper-glow` 视觉保持一致，且不抢内容。
 *
 * 仍保持 `absolute inset-0 z-0` 的定位约定，页面内容用 `relative z-10`
 * 叠在其上，因此所有现有引用无需改动即可获得一致的新背景。
 */
export const Background = () => {
  return (
    <div
      aria-hidden
      className="bg-paper-glow pointer-events-none absolute inset-0 z-0 h-full w-full overflow-hidden"
    />
  );
};
