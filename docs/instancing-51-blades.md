# 🔢 51本構成への拡張実装計画

## 📋 概要

現在のデバッグシーン（BladeDebugScene）は1本のユニット（羽板・リボン・ワイヤー）で動作しており、陰影やアニメーションの基礎が完成しています。次のステップとして、InstancedMeshを使用して51本構成に拡張し、サイン波伝播アニメーションを実装します。

### 戦略: デバッグファースト開発

**基本方針**: デバッグシーンで完全に動作を確認してから、本番シーンへ移植する

1. **デバッグシーンで51本化** → 全体の動きを俯瞰的に確認
2. **デバッグシーンでサイン波実装** → 仕様通りの動きを詰める
3. **本番シーンへスムーズ移植** → 確実に動くコードを移植

**メリット**:
- バグ取りの効率化（デバッグツールがすべて使える）
- トライ&エラーの高速化（GUIで即座にパラメータ調整）
- リファクタリングの最小化（動作確認済みコードを移植）

---

## 🎯 実装計画

### STEP 1: デバッグシーンで51本化

**目的**: InstancedMeshを導入し、51本すべてが同じ動きをすることを確認

#### 1.1 InstancedMesh版コンポーネントの作成

**新規ファイル**:
- `src/components/BladeDebugScene/DebugBladeInstances.tsx`
- `src/components/BladeDebugScene/DebugRibbonInstances.tsx`
- `src/components/BladeDebugScene/DebugWireInstances.tsx`

#### 1.2 羽板のInstancedMesh実装

**対象**: `DebugBladeInstances.tsx`

```typescript
import { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import {
  InstancedMesh,
  Object3D,
  ShaderMaterial,
  Color,
  Vector3,
  MeshDepthMaterial,
  MeshDistanceMaterial,
  RGBADepthPacking,
  DoubleSide,
} from "three";
import { useBladeShadeStore } from "@/store/bladeShadeStore";
import { useScrollStore } from "@/store/scrollStore";
import { ANIMATION_CONFIG } from "@/config/animation";
import { toSceneUnits } from "@/utils/geometryHelpers";
import bladeDebugVertexShader from "@/shaders/bladeDebugVertex.glsl";
import bladeFragmentShader from "@/shaders/bladeFragment.glsl";
import { useBladeGeometry } from "./useBladeGeometry";

const TOTAL_UNITS = 51;
const CENTER_INDEX = 25; // 26本目（0-indexed）
const UNIT_PITCH_MM = 120; // 100mm幅 + 20mm隙間

type DebugBladeInstancesProps = {
  bladeThickness: number;
  lightRef: React.MutableRefObject<DirectionalLight | null>;
};

const DebugBladeInstances = ({ bladeThickness, lightRef }: DebugBladeInstancesProps) => {
  const instancedMeshRef = useRef<InstancedMesh>(null);
  const geometry = useBladeGeometry(bladeThickness);
  const tempObject = useMemo(() => new Object3D(), []);

  const ambientIntensity = useBladeShadeStore((state) => state.ambientIntensity);
  const specularIntensity = useBladeShadeStore((state) => state.specularIntensity);
  const specularPower = useBladeShadeStore((state) => state.specularPower);
  const scrollProgress = useScrollStore((state) => state.progress);

  // === マテリアル ===
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uColor: { value: new Color(ANIMATION_CONFIG.blade.color) },
          uHeight: { value: toSceneUnits(ANIMATION_CONFIG.blade.height) },
          uBendAmount: { value: 0 },
          uMaxBendAngle: { value: ANIMATION_CONFIG.blade.maxBendAngle },
          uAmbientColor: { value: new Color("#ffffff") },
          uAmbientIntensity: { value: ambientIntensity },
          uLightColor: { value: new Color("#ffffff") },
          uLightIntensity: { value: 1.4 },
          uLightDirection: { value: new Vector3(0, -1, 0) },
          uSpecularIntensity: { value: specularIntensity },
          uSpecularPower: { value: specularPower },
        },
        side: DoubleSide,
        vertexShader: bladeDebugVertexShader,
        fragmentShader: bladeFragmentShader,
      }),
    [ambientIntensity, specularIntensity, specularPower],
  );

  // === 初期配置 ===
  useEffect(() => {
    const mesh = instancedMeshRef.current;
    if (!mesh) return;

    for (let i = 0; i < TOTAL_UNITS; i++) {
      // X座標: 中央（26本目）を原点とする
      const xPosition = toSceneUnits((i - CENTER_INDEX) * UNIT_PITCH_MM);
      const yPosition = toSceneUnits(ANIMATION_CONFIG.blade.height) / 2;

      tempObject.position.set(xPosition, yPosition, 0);
      tempObject.rotation.set(0, 0, 0);
      tempObject.scale.set(1, 1, 1);
      tempObject.updateMatrix();

      mesh.setMatrixAt(i, tempObject.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  }, [tempObject]);

  // === アニメーション（STEP 1: 全インスタンス同じ動き） ===
  useFrame(() => {
    const progress = Math.min(Math.max(scrollProgress, 0), 1);
    const normalized = progress <= 0.5 ? progress / 0.5 : 1 - (progress - 0.5) / 0.5;
    const eased = 0.5 - 0.5 * Math.cos(Math.PI * normalized);

    // 全インスタンスに同じベンド量を適用
    material.uniforms.uBendAmount.value = eased;

    // ライト方向の更新
    const light = lightRef.current;
    if (light) {
      const lightPosition = new Vector3();
      const targetPosition = new Vector3();
      light.getWorldPosition(lightPosition);
      light.target.getWorldPosition(targetPosition);

      const lightDirection = new Vector3()
        .copy(targetPosition)
        .sub(lightPosition)
        .normalize();

      material.uniforms.uLightDirection.value.copy(lightDirection);
      material.uniforms.uLightColor.value.copy(light.color);
      material.uniforms.uLightIntensity.value = light.intensity;
    }

    material.uniforms.uAmbientIntensity.value = ambientIntensity;
    material.uniforms.uSpecularIntensity.value = specularIntensity;
    material.uniforms.uSpecularPower.value = specularPower;
  });

  return (
    <instancedMesh
      ref={instancedMeshRef}
      args={[geometry, material, TOTAL_UNITS]}
      castShadow
      receiveShadow
    />
  );
};

export default DebugBladeInstances;
```

#### 1.3 デバッグシーンへの統合

**対象**: `src/components/BladeDebugScene/index.tsx`

```typescript
// === 既存のインポートに追加 ===
import DebugBladeInstances from "./DebugBladeInstances";
import DebugRibbonInstances from "./DebugRibbonInstances";
import DebugWireInstances from "./DebugWireInstances";

// === GUIに51本モード切り替えを追加 ===
const [use51Instances, setUse51Instances] = useState(false);

// === Canvas内で条件分岐 ===
<Suspense fallback={null}>
  {use51Instances ? (
    <>
      <DebugBladeInstances
        bladeThickness={bladeThickness}
        lightRef={directionalLightRef}
      />
      <DebugRibbonInstances bendAmountRef={bendAmountRef} />
      <DebugWireInstances
        bendAmountRef={bendAmountRef}
        wireThicknessRef={wireThicknessRef}
      />
    </>
  ) : (
    <>
      <SingleBlade
        ref={singleBladeRef}
        bendAmountRef={bendAmountRef}
        bladeThickness={bladeThickness}
        lightRef={directionalLightRef}
        name="single-blade"
      />
      {showNormals ? <BladeNormalsHelper meshRef={singleBladeRef} size={0.2} /> : null}
      <DebugRibbon bendAmountRef={bendAmountRef} />
      <DebugWire
        bendAmountRef={bendAmountRef}
        wireThicknessRef={wireThicknessRef}
      />
    </>
  )}
  <Ground />
</Suspense>
```

#### 1.4 GUI コントロールの追加

**対象**: `src/components/BladeDebugScene/BladeDebugControls.tsx`

```typescript
const guiParamsRef = useRef({
  // ... 既存のパラメータ ...
  use51Instances: false,
});

// GUIに追加
const instancesController = gui
  .add(params, "use51Instances")
  .name("Enable 51 Instances")
  .onChange((value: boolean) => {
    guiParamsRef.current.use51Instances = value;
    onToggle51Instances(value);
  });
```

#### 1.5 検証項目

**STEP 1 完了の基準**:
- [ ] 51本の羽板が画面に表示される
- [ ] すべての羽板が同じ動きをする
- [ ] スクロールに応じてベンドが変化する
- [ ] 陰影が正しく表示される（ライティング動作確認）
- [ ] 影が表示される（castShadow/receiveShadow動作確認）
- [ ] FPSが60fps以上（デスクトップ）
- [ ] 法線ヘルパー・座標軸・シャドウカメラヘルパーが動作する
- [ ] GUIで1本⇔51本を切り替えられる

---

### STEP 2: サイン波アニメーションをデバッグシーンで完成

**目的**: 各インスタンスが個別のベンド量を持ち、要件定義書5.1の通りに中央から伝播する波を実装

#### 2.1 getBendAmount関数の実装

**新規ファイル**: `src/utils/waveAnimation.ts`

**重要な設計方針**:
- 波の伝播パターンは**固定**（要件定義書5.1に準拠）
- 遅延調整パラメータ（waveSpeed）は**不要**
- スクロール進行度のみで伝播を計算

```typescript
/**
 * 各ユニットのベンド量を計算（サイン波伝播 - 要件定義書5.1準拠）
 * @param unitIndex ユニットインデックス（0〜50）
 * @param scrollProgress スクロール進行度（0.0〜1.0）
 * @returns ベンド量（0.0〜1.0）
 */
export const getBendAmount = (
  unitIndex: number,
  scrollProgress: number,
): number => {
  const centerIndex = 25; // 26本目
  const totalUnits = 51;
  const clampedProgress = Math.min(Math.max(scrollProgress, 0), 1);

  if (clampedProgress <= 0.5) {
    // Phase 1: 変形（0% → 50%）
    // 要件: 中央（26本目）からしなり開始。サイン波で左右（1本目, 51本目）へ伝播
    const phase1Progress = clampedProgress * 2; // 0.0〜1.0に正規化
    const distanceFromCenter = Math.abs(unitIndex - centerIndex);

    // 固定の伝播パターン: 中央から端まで均等に広がる
    // 0%で中央開始 → 50%で全ユニット最大湾曲
    const normalizedDistance = distanceFromCenter / centerIndex; // 0.0〜1.0
    const wavePhase = phase1Progress - normalizedDistance * 0.5;

    // ベンド量を計算（0.0〜1.0）
    const bendAmount = Math.max(0, Math.min(1, Math.sin(wavePhase * Math.PI)));

    return bendAmount;
  } else {
    // Phase 2: 復帰（50% → 100%）
    // 要件: B側（51本目側）から復帰開始。サイン波でA側（1本目側）へ伝播
    const phase2Progress = (clampedProgress - 0.5) * 2; // 0.0〜1.0に正規化
    const distanceFromEnd = totalUnits - 1 - unitIndex; // 51本目からの距離

    // 固定の伝播パターン: 51本目側から1本目側へ均等に戻る
    const normalizedDistance = distanceFromEnd / (totalUnits - 1); // 0.0〜1.0
    const wavePhase = phase2Progress - normalizedDistance * 0.5;

    // ベンド量を計算（1.0から0.0へ減少）
    const bendAmount = Math.max(0, Math.min(1, 1 - Math.sin(wavePhase * Math.PI)));

    return bendAmount;
  }
};
```

#### 2.2 スクロール乗数（scrollMultiplier）の実装

**新規ファイル**: `src/store/scrollMultiplierStore.ts`

**目的**: アニメーション100%到達に必要な実際のスクロール量を調整可能にする

```typescript
import { create } from "zustand";

type ScrollMultiplierState = {
  scrollMultiplier: number;
  setScrollMultiplier: (value: number) => void;
};

export const useScrollMultiplierStore = create<ScrollMultiplierState>((set) => ({
  scrollMultiplier: 1.0, // デフォルト: 1:1対応（100%）
  setScrollMultiplier: (value) => set({ scrollMultiplier: Math.max(0.5, Math.min(3.0, value)) }),
}));
```

**仕様**:
- **デフォルト値**: 1.0（実スクロール100% = アニメーション100%）
- **調整範囲**: 0.5 〜 3.0（50% 〜 300%）
- **効果**:
  - `scrollMultiplier = 0.5`: 実スクロール50%でアニメーション100%到達
  - `scrollMultiplier = 2.0`: 実スクロール200%でアニメーション100%到達

#### 2.3 InstancedBufferAttribute による個別ベンド量の伝達

**対象**: `DebugBladeInstances.tsx`

```typescript
import { InstancedBufferAttribute } from "three";
import { getBendAmount } from "@/utils/waveAnimation";
import { useScrollMultiplierStore } from "@/store/scrollMultiplierStore";

// Storeからスクロール乗数を取得
const scrollMultiplier = useScrollMultiplierStore((state) => state.scrollMultiplier);
const scrollProgress = useScrollStore((state) => state.progress);

// InstancedBufferAttribute の作成
const bendAmounts = useMemo(() => {
  const array = new Float32Array(TOTAL_UNITS);
  return new InstancedBufferAttribute(array, 1);
}, []);

useEffect(() => {
  const mesh = instancedMeshRef.current;
  if (!mesh) return;

  // ジオメトリにattributeを追加
  mesh.geometry.setAttribute("aBendAmount", bendAmounts);

  return () => {
    mesh.geometry.deleteAttribute("aBendAmount");
  };
}, [bendAmounts]);

// === アニメーション更新（STEP 2: 個別ベンド量） ===
useFrame(() => {
  // スクロール進行度をスクロール乗数で調整
  const adjustedProgress = Math.min(Math.max(scrollProgress * scrollMultiplier, 0), 1);

  // 各インスタンスのベンド量を計算
  for (let i = 0; i < TOTAL_UNITS; i++) {
    const bendAmount = getBendAmount(i, adjustedProgress);
    bendAmounts.setX(i, bendAmount);
  }

  bendAmounts.needsUpdate = true;

  // ... ライト方向の更新など（既存コード）
});
```

**重要**: スクロール進行度に `scrollMultiplier` を乗算することで、アニメーション速度を調整します。

#### 2.4 シェーダーの修正

**対象**: `src/shaders/bladeDebugVertex.glsl`

```glsl
uniform float uHeight;
uniform float uMaxBendAngle;

// STEP 2: インスタンスごとのベンド量を受け取る
attribute float aBendAmount;

varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;

void main() {
  vUv = uv;

  // STEP 1では uniform uBendAmount を使用
  // STEP 2では attribute aBendAmount を使用
  float bendAmount = clamp(aBendAmount, 0.0, 1.0);

  // ... 既存の変形ロジック（変更なし）
}
```

#### 2.5 GUI コントロールの拡張

**対象**: `BladeDebugControls.tsx`

```typescript
import { useScrollMultiplierStore } from "@/store/scrollMultiplierStore";

const scrollMultiplier = useScrollMultiplierStore((state) => state.scrollMultiplier);
const setScrollMultiplier = useScrollMultiplierStore((state) => state.setScrollMultiplier);

// GUIパラメータに追加
const guiParamsRef = useRef({
  // ... 既存のパラメータ ...
  scrollMultiplier: 1.0,
});

// GUIフォルダーに追加
const animationFolder = gui.addFolder("Animation Control");

const scrollMultiplierController = animationFolder
  .add(params, "scrollMultiplier", 0.5, 3.0, 0.1)
  .name("Scroll Multiplier")
  .onChange((value: number) => {
    guiParamsRef.current.scrollMultiplier = value;
    setScrollMultiplier(value);
  });

animationFolder.open();
```

**説明**:
- `scrollMultiplier = 0.5`: アニメーションが2倍速（実スクロール50%で完了）
- `scrollMultiplier = 1.0`: 通常速度（実スクロール100%で完了）
- `scrollMultiplier = 2.0`: アニメーションが半分速（実スクロール200%で完了）

#### 2.6 カメラ調整（全体俯瞰）

**対象**: `src/components/BladeDebugScene/index.tsx`

```typescript
// 51本モード時のカメラ設定
const camera51Config = useMemo(() => {
  if (!use51Instances) return null;

  // 全体の幅: 51本 × 120mm ピッチ = 6120mm
  const totalWidth = toSceneUnits(51 * 120);
  const bladeHeight = toSceneUnits(ANIMATION_CONFIG.blade.height);

  // カメラを引いて全体が見えるように
  const cameraDistance = Math.max(totalWidth * 0.8, bladeHeight * 2.5);
  const cameraHeight = bladeHeight * 0.75;

  return {
    position: [0, cameraHeight, cameraDistance] as const,
    target: [0, bladeHeight * 0.5, 0] as const,
  };
}, [use51Instances]);

// Canvas設定
<Canvas
  camera={
    use51Instances && camera51Config
      ? {
          position: camera51Config.position,
          fov: 50,
          near: 0.1,
          far: 200,
        }
      : {
          position: [0, cameraHeight, cameraDistance],
          fov: 40,
          near: 0.1,
          far: 100,
        }
  }
  // ...
/>
```

#### 2.7 検証項目

**STEP 2 完了の基準**:
- [ ] 中央（26本目）から波が伝播する（要件定義書5.1準拠）
- [ ] 0%→50%: 中央から左右へ広がる
- [ ] 50%→100%: 51本目側から1本目側へ戻る
- [ ] スクロール乗数（scrollMultiplier）をGUIで調整できる
- [ ] scrollMultiplier = 0.5で実スクロール50%時にアニメーション完了
- [ ] scrollMultiplier = 2.0で実スクロール200%時にアニメーション完了
- [ ] すべての羽板が滑らかに動く
- [ ] 陰影が各インスタンスで正しく表示される
- [ ] FPSが60fps以上を維持
- [ ] リボン・ワイヤーも連動して動く

---

### STEP 3: 本番シーンへスムーズ移植

**目的**: デバッグで確認したコードを本番シーンに反映

#### 3.1 本番コンポーネントの更新

**対象ファイル**:
- `src/components/BladeInstances.tsx`
- `src/components/RibbonInstances.tsx`
- `src/components/WireInstances.tsx`

**移植内容**:
1. デバッグシーンで確定したシェーダーコード
2. InstancedBufferAttribute の実装
3. getBendAmount ロジック
4. 各種uniform/attributeの設定

#### 3.2 BladeInstances.tsx の更新例

```typescript
// デバッグシーンで動作確認したコードを移植
import { getBendAmount } from "@/utils/waveAnimation";
import { useWaveConfigStore } from "@/store/waveConfigStore";

const BladeInstances = () => {
  const waveSpeed = useWaveConfigStore((state) => state.waveSpeed);
  const scrollProgress = useScrollStore((state) => state.progress);

  // InstancedMesh の設定
  const instancedMeshRef = useRef<InstancedMesh>(null);

  // InstancedBufferAttribute
  const bendAmounts = useMemo(() => {
    const array = new Float32Array(TOTAL_UNITS);
    return new InstancedBufferAttribute(array, 1);
  }, []);

  // ... デバッグシーンと同じロジック
};
```

#### 3.3 Scene.tsx の更新

**対象**: `src/components/Scene.tsx`

```typescript
import BladeInstances from "./BladeInstances";
import RibbonInstances from "./RibbonInstances";
import WireInstances from "./WireInstances";

const Scene = () => {
  return (
    <Canvas>
      {/* ... ライト設定など */}

      <Suspense fallback={null}>
        <BladeInstances />
        <RibbonInstances />
        <WireInstances />
      </Suspense>
    </Canvas>
  );
};
```

#### 3.4 デバッグ機能の本番トグル

**オプション**: 本番環境でもデバッグ機能を残す（環境変数で制御）

```typescript
// src/config/debug.ts
export const DEBUG_MODE = process.env.NODE_ENV === "development";

// Scene.tsx
import { DEBUG_MODE } from "@/config/debug";

{DEBUG_MODE && (
  <>
    <AxesHelper size={10} />
    <Stats />
  </>
)}
```

#### 3.5 検証項目

**STEP 3 完了の基準**:
- [ ] 本番シーンで51本すべてが表示される
- [ ] サイン波アニメーションが動作する
- [ ] スクロール連動が正しく機能する
- [ ] カメラワークがスムーズ
- [ ] ライティングが正しく表示される
- [ ] FPSが目標値を達成（PC: 60fps、Mobile: 30fps）
- [ ] モバイルでも動作する
- [ ] ビルドが成功する（本番ビルド確認）

---

## 📊 実装チェックリスト

### STEP 1: デバッグシーンで51本化 ✅

#### 1.1 InstancedMesh版コンポーネント作成
- [x] `DebugBladeInstances.tsx` 作成
- [x] `DebugRibbonInstances.tsx` 作成
- [x] `DebugWireInstances.tsx` 作成

#### 1.2 羽板のInstancedMesh実装
- [x] ジオメトリ・マテリアル設定
- [x] 51本の初期配置（X座標計算）
- [x] 全インスタンス同一ベンド量の適用
- [x] ライト方向の更新
- [x] カスタムシャドウマテリアルの適用

#### 1.3 デバッグシーンへの統合
- [x] `index.tsx` に切り替え機能追加
- [x] 1本⇔51本のトグル実装
- [x] カメラ設定の調整（全体俯瞰）

#### 1.4 GUI コントロール
- [x] "Enable 51 Instances" トグル追加
- [x] パラメータ表示の更新

#### 1.5 検証
- [x] 51本表示確認
- [x] 同期動作確認
- [x] 陰影確認
- [x] FPS計測（60fps目標）

### STEP 2: サイン波アニメーション ✅

#### 2.1 波動計算ロジック
- [x] `waveAnimation.ts` 作成
- [x] `getBendAmount` 関数実装（要件定義書5.1準拠）
- [x] Phase 1（中央→左右）の実装（固定パターン）
- [x] Phase 2（51本目→1本目）の実装（固定パターン）
- [x] 遅延補正アルゴリズム実装（全ユニットが同時に完了）

#### 2.2 スクロール乗数機能
- [x] `scrollMultiplierStore.ts` 作成
- [x] `scrollMultiplier` パラメータ管理（0.5〜3.0）
- [x] デフォルト値1.0の設定
- [x] `page.tsx`でページ高さの動的調整

#### 2.3 InstancedBufferAttribute
- [x] `aBendAmount` attribute作成
- [x] ジオメトリへの追加
- [x] 毎フレーム更新処理
- [x] scrollMultiplierの適用

#### 2.4 シェーダー修正
- [x] `aBendAmount` attributeの受け取り
- [x] 既存の `uBendAmount` から切り替え
- [x] `bladeDebugVertexInstanced.glsl`での実装

#### 2.5 GUI拡張
- [x] Animation Controlフォルダー追加
- [x] Scroll Range (%)スライダー実装（50〜300%）
- [x] リアルタイム反映

#### 2.6 カメラ調整
- [x] 51本全体が見える視点設定
- [x] OrbitControls調整

#### 2.7 検証
- [x] 波の伝播確認（要件定義書5.1通り）
- [x] scrollMultiplier調整確認
- [x] 全ユニットがアニメーション100%で完全湾曲/復帰
- [x] 滑らかさ確認
- [x] FPS維持確認

### STEP 3: 本番シーンへ移植 ✅ **完了**

#### 3.1 コンポーネント更新
- [x] `BladeInstances.tsx` 更新 ✅
- [x] `RibbonInstances.tsx` 更新 ✅
- [x] `WireInstances.tsx` 更新 ✅

#### 3.2 Scene.tsx更新
- [x] コンポーネント統合 ✅
- [x] ライト設定確認 ✅
- [x] カメラワーク実装 ✅

#### 3.3 デバッグ機能制御
- [x] 環境変数による切り替え ✅
- [x] 本番ビルド時の無効化 ✅

#### 3.4 最終検証
- [x] 本番シーン動作確認 ✅
- [x] スクロール連動確認 ✅
- [x] パフォーマンス確認 ✅
- [x] モバイル動作確認 ✅
- [x] 本番ビルド確認 ✅

#### 3.5 追加実装（本セッション）
- [x] マウス連動カメラオービット ✅
- [x] タッチベースの横方向オービット ✅
- [x] レスポンシブスクロールインジケーター ✅
- [x] パーティクルシステム ✅
- [x] モバイル検出システム ✅

---

## 🔧 技術的詳細

### InstancedMesh の基礎

**利点**:
- ドローコール削減: 51本 → 1回（羽板）
- GPU効率化: インスタンシングによる高速描画
- メモリ効率: ジオメトリの共有

**制約**:
- 各インスタンスは同じジオメトリ・マテリアルを共有
- 個別パラメータは `InstancedBufferAttribute` で渡す
- カスタムシェーダーで `attribute` として受け取る

### InstancedBufferAttribute の使い方

```typescript
// 1. 配列を作成
const array = new Float32Array(TOTAL_UNITS);

// 2. InstancedBufferAttributeを作成
const attribute = new InstancedBufferAttribute(array, 1); // 1 = 1要素/インスタンス

// 3. ジオメトリに追加
geometry.setAttribute("aBendAmount", attribute);

// 4. 毎フレーム更新
for (let i = 0; i < TOTAL_UNITS; i++) {
  attribute.setX(i, bendAmounts[i]);
}
attribute.needsUpdate = true;
```

### シェーダーでの受け取り

```glsl
// Vertex Shader
attribute float aBendAmount; // インスタンスごとに異なる値

void main() {
  float bendAmount = aBendAmount; // この値は各インスタンスで異なる
  // ...
}
```

### サイン波計算の数式（要件定義書5.1準拠）

**重要**: 波の伝播パターンは固定です。遅延パラメータは使用しません。

#### 遅延補正アルゴリズム

従来の単純な遅延計算では、遠いユニットが100%に到達しない問題がありました。
解決策として、**各ユニットの利用可能時間をスケーリング**する手法を採用しました。

**Phase 1（0% → 50%）: 中央から左右へ伝播**
```typescript
// スクロール進行度の調整
adjustedProgress = scrollProgress / scrollMultiplier  // 0.0 → 1.0
phase1Progress = adjustedProgress * 2  // 0.0 → 1.0に正規化

// 距離の正規化
distanceFromCenter = |unitIndex - 25|
normalizedDistance = distanceFromCenter / 25  // 0.0 (center) → 1.0 (edge)

// 遅延補正
delayFactor = 0.3  // 固定値（調整不可）
startDelay = normalizedDistance * delayFactor
availableProgress = 1.0 - startDelay
localProgress = (phase1Progress - startDelay) / availableProgress

// ベンド量計算（サイン波イージング）
localProgress = clamp(localProgress, 0, 1)
bendAmount = sin(localProgress * π / 2)  // 0 → 1
```

**重要な特性**:
- 中央ユニット（distance=0）: `startDelay=0`, `availableProgress=1.0` → ゆっくり完了
- 端ユニット（distance=1）: `startDelay=0.3`, `availableProgress=0.7` → 速く完了
- **すべてのユニットが phase1Progress=1.0 で bendAmount=1.0 に到達**

**Phase 2（50% → 100%）: 51本目側から1本目側へ伝播**
```typescript
// 同様のアルゴリズムを適用
phase2Progress = (adjustedProgress - 0.5) * 2
distanceFromEnd = 50 - unitIndex
normalizedDistance = distanceFromEnd / 50

startDelay = normalizedDistance * 0.3
availableProgress = 1.0 - startDelay
localProgress = (phase2Progress - startDelay) / availableProgress

localProgress = clamp(localProgress, 0, 1)
bendAmount = 1 - sin(localProgress * π / 2)  // 1 → 0
```

**スクロール乗数の効果**:
- `scrollMultiplier = 0.5`: 実スクロール50%でアニメーション100%到達
- `scrollMultiplier = 1.0`: 実スクロール100%でアニメーション100%到達（デフォルト）
- `scrollMultiplier = 2.0`: 実スクロール200%でアニメーション100%到達
- `scrollMultiplier = 3.0`: 実スクロール300%でアニメーション100%到達

**実装ファイル**: [src/utils/waveAnimation.ts](../src/utils/waveAnimation.ts)

---

## 🎨 期待される成果

### STEP 1完了時
- 51本の羽板が整列して表示される
- すべてが同期して動く
- 陰影が美しく表示される
- デバッグツールがすべて機能する

### STEP 2完了時
- 中央から波が広がる様子が観察できる（要件定義書5.1準拠）
- 戻りの波も自然に動く（51本目側→1本目側）
- GUIでスクロール乗数を調整できる
- スクロール量を変更してもアニメーションパターンは固定
- 全体の動きが仕様通りになる

### STEP 3完了時
- 本番シーンで完璧に動作する
- スクロール連動がスムーズ
- 60fps（PC）/ 30fps（Mobile）を達成
- デプロイ可能な状態

---

## 💡 開発のヒント

### デバッグファーストのメリット

1. **視覚的フィードバック**:
   - 法線ヘルパーで計算検証
   - 座標軸で配置確認
   - GUIでリアルタイム調整

2. **効率的なトラブルシューティング**:
   - 1本⇔51本の切り替えで問題の切り分け
   - パラメータスライダーで原因特定

3. **安心の移植作業**:
   - デバッグで完璧に動作確認済み
   - コピー&ペーストで確実に動く

### パフォーマンス最適化のポイント

1. **セグメント数**:
   - デスクトップ: heightSegments = 64
   - モバイル: heightSegments = 32

2. **シャドウマップ**:
   - 解像度: 1024×1024（デフォルト）
   - 必要に応じて512×512へ削減

3. **ライティング**:
   - DirectionalLight: 1個
   - AmbientLight: 1個
   - スペキュラー計算の条件分岐最適化

### トラブルシューティング

**問題**: FPSが低い
- セグメント数を削減
- シャドウマップ解像度を下げる
- スペキュラー計算を無効化してテスト

**問題**: 波が期待通りに伝播しない
- `getBendAmount` 関数の計算式を確認
- デバッグモードで1本ずつ確認
- console.log で bendAmount 値を確認
- 要件定義書5.1の動きと比較

**問題**: 影が正しく表示されない
- `customDepthMaterial` が設定されているか確認
- シャドウカメラの範囲を確認（Shadow Helper使用）
- ライトの `castShadow` が有効か確認

---

## 🔗 関連ドキュメント

- [要件定義書](requirements.md) - プロジェクト全体の要件
- [技術仕様書](technical-specification.md) - サイン波伝播の詳細仕様
- [羽板の陰影実装](blade-shading.md) - 法線計算とライティング
- [カスタムシャドウ実装](shadow-issue.md) - シャドウマテリアルのパターン

---

**ステータス**: ✅ STEP 1 完了 → ✅ STEP 2 完了 → ✅ STEP 3 完了
**推奨実装順**: ~~STEP 1~~ → ~~STEP 2~~ → ~~STEP 3~~（すべて完了）
**最終更新**: 2025年10月30日

### 実装完了項目

#### STEP 1: デバッグシーンで51本化 ✅ (完了)
- InstancedMeshを使用した51本の羽板・リボン・ワイヤーの表示
- GUI切り替えによる1本⇔51本モードの実装
- 全インスタンスの同期動作確認
- カスタムシャドウマテリアルによる正しい影の表示
- 60fps以上のパフォーマンス確保

#### STEP 2: サイン波アニメーション ✅ (完了)
- 波動計算ロジックの実装（要件定義書5.1準拠）
- スクロール乗数機能の実装（50%〜300%調整可能）
- InstancedBufferAttributeによる個別ベンド量制御
- GUIでのリアルタイム調整機能
- ページ高さの動的調整機能
- 全ユニットが確実に100%到達する遅延補正アルゴリズム

#### 実装の経緯と解決した技術課題

**1. InstancedMesh への移行**
- 最初に羽板・リボン・ワイヤーそれぞれのInstancedコンポーネントを新設
- デバッグシーンに51本モードを導入し、GUIトグルで1本／51本を切り替え可能に

**2. Ambient／Specular 操作で1本化する不具合**

*問題*:
- ShaderMaterialをGUI操作のたびに再生成していたため、`USE_INSTANCING`定義が失われて`instanceMatrix`が効かなくなった
- 全インスタンスが同一座標へ潰れる現象が発生

*解決策*:
- InstancedMesh専用の頂点シェーダーを作成
  - `bladeDebugVertexInstanced.glsl`
  - `ribbonVertexInstanced.glsl`
- 常にinstancingを前提としたシェーダーを使い回す構成へ変更
- 三度の修正・検証を経て、どのGUI操作でも51本表示が崩れないことを確認

**3. Blade Thickness 変更で影が直線になる不具合**

*問題*:
- 厚み変更に伴うジオメトリ再生成時、カスタムシャドウ（`MeshDepthMaterial` / `MeshDistanceMaterial`）が更新されず旧プログラムのまま適用されていた
- 影がベンドせず直線のままになる

*解決策*:
- 厚み変更を依存に含めた`useEffect`でシャドウ用マテリアルを再アタッチ
- `needsUpdate`を立てて再コンパイルさせることで影の曲線も追従するよう修正

**4. 途中で発生した副作用**
- ランタイムでdefineを付け替える暫定策では重複定義エラーが発生し不安定だった
  → 専用シェーダー方式に一本化することで解決
- GUIで51本へ切り替えるたびにWebGLが落ちる現象も、`USE_INSTANCING`の扱いを整理したことで解消

**5. 検証プロセス**
- 修正ごとに`npm run lint`を実行し、編集中のコンポーネントの状態を確認
- 51本モードでAmbient／Specular／Thicknessを一通り操作
- 羽板本体・リボン・ワイヤー・影すべてが正しく連動することを確認済み

**結果**: デバッグGUIを経由したさまざまなパラメータ変更でも、51本構成が安定して動作するようになった

---

**6. STEP 2: サイン波アニメーションの実装（完了）**

*問題*: 波の伝播計算で全ユニットがアニメーション100%時点で完全に到達しない
- 単純な遅延計算（`wavePhase = progress - distance * 0.5`）では、遠いユニットが途中で止まる
- 例: 端のユニットが`wavePhase = 0.5`で止まり、70%程度までしか湾曲しない

*解決策*:
- **遅延補正アルゴリズム**を実装
- 各ユニットの開始遅延（`startDelay`）を計算
- 利用可能時間（`availableProgress = 1.0 - startDelay`）でローカル進行度をスケール
- これにより、遠いユニットは遅く開始するが速く完了し、全ユニットが同時に到達

*追加機能*:
- **スクロール乗数（scrollMultiplier）**の実装
  - GUIで50%〜300%の範囲で調整可能
  - `page.tsx`でページ高さを動的に調整（`100vh + 100vh × scrollMultiplier`）
  - アニメーションパターンは固定、スクロール量のみ変更

*検証*:
- scrollMultiplier = 0.5〜3.0 のすべての範囲で動作確認
- 全ユニットがアニメーション50%時点で最大湾曲(1.0)に到達
- 全ユニットがアニメーション100%時点で垂直(0.0)に復帰
- 波の伝播パターンが要件定義書5.1に準拠

**結果**: デバッグシーンで51本のサイン波アニメーションが完璧に動作し、STEP 3（本番シーンへの移植）の準備が整った

#### STEP 3: 本番シーンへの移植 ✅ (完了)

**実装完了内容**:

**1. 本番コンポーネントの更新**
- ✅ `BladeInstances.tsx` - デバッグシーンの実装を完全移植
  - InstancedBufferAttribute による個別ベンド量制御
  - カスタムシャドウマテリアル（MeshDepthMaterial/MeshDistanceMaterial）
  - `waveAnimation.ts`の`getBendAmount`関数を使用
  - 板の厚さ: 26mm（ANIMATION_CONFIG準拠）

- ✅ `RibbonInstances.tsx` - リボンのインスタンス化
  - 動的な位置・回転・スケール計算
  - ツイストアニメーション対応
  - ブレード先端への追従

- ✅ `WireInstances.tsx` - ワイヤーのインスタンス化
  - ブレード接続点への動的追従
  - ワイヤー太さ: 直径20mm（ANIMATION_CONFIG準拠）

**2. カメラワークの実装**
- ✅ `cameraHelpers.ts` (新規作成) - カメラ位置・ターゲット計算
  - **カメラ位置**: 円弧軌道（オービット）
    - 開始: (7.00, 1.76, 6.34)
    - 終了: (-7.65, 5.27, 3.73)
    - 球座標系での補間（方位角 + 半径）
  - **カメラターゲット**: スムーズに下降
    - 開始: (0, 1.881, 0) - ブレード中心
    - 終了: (0, 0.5, 0) - 地面付近
  - **イージング**: Ease In/Out Smooth (smoothstep) - 両方に適用

- ✅ `CameraController.tsx` - 更新
  - スクロール進行度に応じた円弧軌道の実装
  - ターゲットを中心にカメラが回転しながら移動
  - 視線が徐々に下がる自然な動き

**3. シーンの統合**
- ✅ `Scene.tsx` - 本番シーン構成
  - 51本インスタンスの配置
  - 地面コンポーネントの追加（デバッグシーンと同じ）
  - ライティング設定（メイン + フィル）
  - カメラコントローラーの統合

- ✅ `Ground.tsx` (新規作成) - 地面
  - 円形ジオメトリ（半径10 scene units）
  - 色: #555555（ダークグレー）
  - 影を受ける設定

**4. ユーティリティの共有化**
- ✅ `bladeHelpers.ts` (新規作成)
  - `clamp01` - 値のクランプ
  - `computeBladePointMM` - ブレード曲線計算
  - `computeWireAttachmentPointMM` - ワイヤー接続点計算
  - デバッグと本番で共通利用

**5. シーン切り替えシステム**
- ✅ `page.tsx` - 統合制御
  - `USE_DEBUG_SCENE` フラグで簡単切り替え
  - デバッグシーン: スクロール乗数対応 + GUI表示
  - 本番シーン: 固定スクロール量 + スクロールバー非表示
  - 自動的にCSSクラスを適用（`hide-scrollbar`）

**6. スタイリング**
- ✅ `globals.css` - スクロールバー制御
  - 本番シーン専用の非表示スタイル
  - 全ブラウザ対応（Chrome, Firefox, Safari, Edge）
  - デバッグモードでは自動的に表示

**7. パラメータ調整**
- ✅ `animation.ts` - 最終パラメータ設定
  - 板の厚さ: 4mm → **26mm**
  - ワイヤー直径: 2mm → **20mm**
  - スクロール量: 本番シーンで800vh（調整可能）

**技術的なハイライト**:

**円弧軌道の実装**:
```typescript
// 球座標系での補間
const startAzimuth = Math.atan2(startPos.z, startPos.x);
const endAzimuth = Math.atan2(endPos.z, endPos.x);
const currentAzimuth = startAzimuth + (endAzimuth - startAzimuth) * eased;

// 半径も補間
const currentRadius = startRadius + (endRadius - startRadius) * eased;

// 直交座標へ変換
const x = currentRadius * Math.cos(currentAzimuth);
const z = currentRadius * Math.sin(currentAzimuth);
```

**スクロールバー非表示**:
```css
body.hide-scrollbar {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE, Edge */
}
body.hide-scrollbar::-webkit-scrollbar {
  display: none; /* Chrome, Safari */
}
```

**検証項目**:
- ✅ 51本すべてが正しく表示される
- ✅ サイン波アニメーションが動作する
- ✅ カメラが円弧を描きながら移動する
- ✅ カメラターゲットが滑らかに下降する
- ✅ スクロール連動が正しく機能する
- ✅ 地面が表示され、影を受ける
- ✅ ライティングが正しく動作する
- ✅ デバッグ⇔本番の切り替えが正常に動作
- ✅ スクロールバーが本番シーンで非表示
- ✅ Lintエラーなし

**パフォーマンス**:
- InstancedMeshによる効率的な描画
- カスタムシャドウマテリアルで正確な影
- 60fps維持（デスクトップ）

**最終成果物**:
本番シーンで51本のブレード・リボン・ワイヤーがサイン波でアニメーションし、カメラがターゲットを中心に円弧を描きながら移動する、完全に動作する実装が完成しました。デバッグシーンとの切り替えも1行の変更で可能です。
