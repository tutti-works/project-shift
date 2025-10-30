import { Vector3 } from "three";

/**
 * スクロール進行度に応じたカメラターゲット位置を計算
 * 高さが1.881から0.5へスムーズに移動
 * イージング: Ease In/Out Smooth
 */
export const getCameraTargetForScroll = (progress: number): Vector3 => {
  // 進行度をクランプ
  const clampedProgress = Math.min(Math.max(progress, 0), 1);

  // Ease In/Out Smooth (smoothstep)
  const eased = clampedProgress * clampedProgress * (3 - 2 * clampedProgress);

  // 開始高さと終了高さ
  const startHeight = 1.881; // 1881mm = ブレード中心付近
  const endHeight = 0.5; // 地面より少し上

  // 高さを補間
  const targetHeight = startHeight + (endHeight - startHeight) * eased;

  return new Vector3(0, targetHeight, 0);
};

/**
 * スクロール進行度に応じたカメラ位置を計算
 * カメラターゲットを中心とした円弧軌道
 * 開始: (7.00, 1.76, 6.34) → 終了: (-7.65, 5.27, 3.73)
 * イージング: Ease In/Out Smooth
 */
export const getCameraPositionForScroll = (progress: number): Vector3 => {
  // 進行度をクランプ
  const clampedProgress = Math.min(Math.max(progress, 0), 1);

  // Ease In/Out Smooth (smoothstep)
  const eased = clampedProgress * clampedProgress * (3 - 2 * clampedProgress);

  // 開始位置と終了位置
  const startPos = new Vector3(7.00, 1.76, 6.34);
  const endPos = new Vector3(-7.65, 5.27, 3.73);

  // カメラターゲットの位置を取得
  const target = getCameraTargetForScroll(progress);

  // 開始と終了の方位角（azimuth）を計算
  const startAzimuth = Math.atan2(startPos.z, startPos.x);
  const endAzimuth = Math.atan2(endPos.z, endPos.x);

  // ターゲットからの距離（半径）を計算
  const startRadius = Math.sqrt(startPos.x * startPos.x + startPos.z * startPos.z);
  const endRadius = Math.sqrt(endPos.x * endPos.x + endPos.z * endPos.z);

  // 円弧補間
  const currentAzimuth = startAzimuth + (endAzimuth - startAzimuth) * eased;
  const currentRadius = startRadius + (endRadius - startRadius) * eased;

  // ターゲットからの相対高さを補間
  const startHeightOffset = startPos.y - getCameraTargetForScroll(0).y;
  const endHeightOffset = endPos.y - getCameraTargetForScroll(1).y;
  const currentHeightOffset = startHeightOffset + (endHeightOffset - startHeightOffset) * eased;

  // 球座標から直交座標へ変換
  const x = currentRadius * Math.cos(currentAzimuth);
  const z = currentRadius * Math.sin(currentAzimuth);
  const y = target.y + currentHeightOffset;

  return new Vector3(x, y, z);
};
