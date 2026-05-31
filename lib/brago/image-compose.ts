import "server-only";
import { composeProofImage } from "./compose/proof-image";

/**
 * @deprecated 使用 `lib/brago/compose/proof-image.ts` 中的 composeProofImage。
 * 此 shim 仅为兼容老测试保留——不要在新代码中调用。
 */
export async function composeBeforeAfterProof(
  beforeBuffer: Buffer,
  afterBuffer: Buffer,
): Promise<Buffer> {
  return composeProofImage({
    mode: "before_after",
    before: beforeBuffer,
    after: afterBuffer,
    overlayText: "",
    watermark: { logo: null, businessName: null },
  });
}
