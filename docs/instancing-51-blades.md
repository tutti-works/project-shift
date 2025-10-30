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

**目的**: 各インスタンスが個別のベンド量を持ち、中央から伝播する波を実装

#### 2.1 getBendAmount関数の実装

**新規ファイル**: `src/utils/waveAnimation.ts`

```typescript
/**
 * 各ユニットのベンド量を計算（サイン波伝播）
 * @param unitIndex ユニットインデックス（0〜50）
 * @param scrollProgress スクロール進行度（0.0〜1.0）
 * @param waveSpeed 波の伝播速度（調整用）
 * @returns ベンド量（0.0〜1.0）
 */
export const getBendAmount = (
  unitIndex: number,
  scrollProgress: number,
  waveSpeed: number = 0.05,
): number => {
  const centerIndex = 25; // 26本目
  const totalUnits = 51;
  const clampedProgress = Math.min(Math.max(scrollProgress, 0), 1);

  if (clampedProgress <= 0.5) {
    // Phase 1: 変形（0% → 50%）
    // 中央から左右へ伝播
    const phase1Progress = clampedProgress * 2; // 0.0〜1.0に正規化
    const distanceFromCenter = Math.abs(unitIndex - centerIndex);

    // サイン波の位相（中央から離れるほど遅延）
    const wavePhase = phase1Progress - (distanceFromCenter * waveSpeed);

    // ベンド量を計算（0.0〜1.0）
    const bendAmount = Math.max(0, Math.min(1, Math.sin(wavePhase * Math.PI * 0.5)));

    return bendAmount;
  } else {
    // Phase 2: 復帰（50% → 100%）
    // 51本目側から1本目側へ伝播
    const phase2Progress = (clampedProgress - 0.5) * 2; // 0.0〜1.0に正規化
    const distanceFromEnd = totalUnits - 1 - unitIndex; // 51本目からの距離

    // サイン波の位相（51本目側から伝播）
    const wavePhase = phase2Progress - (distanceFromEnd * waveSpeed);

    // ベンド量を計算（1.0から0.0へ減少）
    const bendAmount = Math.max(0, Math.min(1, 1 - Math.sin(wavePhase * Math.PI * 0.5)));

    return bendAmount;
  }
};
```

#### 2.2 InstancedBufferAttribute による個別ベンド量の伝達

**対象**: `DebugBladeInstances.tsx`

```typescript
import { InstancedBufferAttribute } from "three";
import { getBendAmount } from "@/utils/waveAnimation";

// === Storeに波速度パラメータを追加 ===
// src/store/waveConfigStore.ts（新規）
import { create } from "zustand";

type WaveConfigState = {
  waveSpeed: number;
  setWaveSpeed: (value: number) => void;
};

export const useWaveConfigStore = create<WaveConfigState>((set) => ({
  waveSpeed: 0.05,
  setWaveSpeed: (value) => set({ waveSpeed: Math.max(0.01, Math.min(0.2, value)) }),
}));

// === DebugBladeInstances.tsx に追加 ===
const waveSpeed = useWaveConfigStore((state) => state.waveSpeed);

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
  const progress = Math.min(Math.max(scrollProgress, 0), 1);

  // 各インスタンスのベンド量を計算
  for (let i = 0; i < TOTAL_UNITS; i++) {
    const bendAmount = getBendAmount(i, progress, waveSpeed);
    bendAmounts.setX(i, bendAmount);
  }

  bendAmounts.needsUpdate = true;

  // ... ライト方向の更新など（既存コード）
});
```

#### 2.3 シェーダーの修正

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

#### 2.4 GUI コントロールの拡張

**対象**: `BladeDebugControls.tsx`

```typescript
import { useWaveConfigStore } from "@/store/waveConfigStore";

const waveSpeed = useWaveConfigStore((state) => state.waveSpeed);
const setWaveSpeed = useWaveConfigStore((state) => state.setWaveSpeed);

// GUIパラメータに追加
const guiParamsRef = useRef({
  // ... 既存のパラメータ ...
  waveSpeed: 0.05,
});

// GUIフォルダーに追加
const waveFolder = gui.addFolder("Wave Animation");

const waveSpeedController = waveFolder
  .add(params, "waveSpeed", 0.01, 0.2, 0.01)
  .name("Wave Speed")
  .onChange((value: number) => {
    guiParamsRef.current.waveSpeed = value;
    setWaveSpeed(value);
  });

waveFolder.open();
```

#### 2.5 カメラ調整（全体俯瞰）

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

#### 2.6 検証項目

**STEP 2 完了の基準**:
- [ ] 中央（26本目）から波が伝播する
- [ ] 0%→50%: 中央から左右へ広がる
- [ ] 50%→100%: 51本目側から1本目側へ戻る
- [ ] 波の速度をGUIで調整できる
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

### STEP 2: サイン波アニメーション ⏳

#### 2.1 波動計算ロジック
- [ ] `waveAnimation.ts` 作成
- [ ] `getBendAmount` 関数実装
- [ ] Phase 1（中央→左右）の実装
- [ ] Phase 2（51本目→1本目）の実装

#### 2.2 InstancedBufferAttribute
- [ ] `aBendAmount` attribute作成
- [ ] ジオメトリへの追加
- [ ] 毎フレーム更新処理

#### 2.3 Zustand Store
- [ ] `waveConfigStore.ts` 作成
- [ ] `waveSpeed` パラメータ管理

#### 2.4 シェーダー修正
- [ ] `aBendAmount` attributeの受け取り
- [ ] 既存の `uBendAmount` から切り替え

#### 2.5 GUI拡張
- [ ] Wave Animationフォルダー追加
- [ ] Wave Speedスライダー実装

#### 2.6 カメラ調整
- [ ] 51本全体が見える視点設定
- [ ] OrbitControls調整

#### 2.7 検証
- [ ] 波の伝播確認
- [ ] 速度調整確認
- [ ] 滑らかさ確認
- [ ] FPS維持確認

### STEP 3: 本番シーンへ移植 ⏳

#### 3.1 コンポーネント更新
- [ ] `BladeInstances.tsx` 更新
- [ ] `RibbonInstances.tsx` 更新
- [ ] `WireInstances.tsx` 更新

#### 3.2 Scene.tsx更新
- [ ] コンポーネント統合
- [ ] ライト設定確認
- [ ] カメラワーク実装

#### 3.3 デバッグ機能制御
- [ ] 環境変数による切り替え
- [ ] 本番ビルド時の無効化

#### 3.4 最終検証
- [ ] 本番シーン動作確認
- [ ] スクロール連動確認
- [ ] パフォーマンス確認
- [ ] モバイル動作確認
- [ ] 本番ビルド確認

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

### サイン波計算の数式

**Phase 1（0% → 50%）**:
```
phase1Progress = scrollProgress * 2  // 0.0〜1.0
distanceFromCenter = |unitIndex - 25|
wavePhase = phase1Progress - (distanceFromCenter * waveSpeed)
bendAmount = sin(wavePhase * π / 2)  // 0.0〜1.0にクランプ
```

**Phase 2（50% → 100%）**:
```
phase2Progress = (scrollProgress - 0.5) * 2  // 0.0〜1.0
distanceFromEnd = 50 - unitIndex
wavePhase = phase2Progress - (distanceFromEnd * waveSpeed)
bendAmount = 1.0 - sin(wavePhase * π / 2)  // 1.0〜0.0にクランプ
```

---

## 🎨 期待される成果

### STEP 1完了時
- 51本の羽板が整列して表示される
- すべてが同期して動く
- 陰影が美しく表示される
- デバッグツールがすべて機能する

### STEP 2完了時
- 中央から波が広がる様子が観察できる
- 戻りの波も自然に動く
- GUIで波速度を調整できる
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
- `waveSpeed` を調整（0.05 → 0.1）
- デバッグモードで1本ずつ確認
- console.log で bendAmount 値を確認

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

**ステータス**: ✅ STEP 1 完了 → 🚧 STEP 2 実装中
**推奨実装順**: ~~STEP 1~~ → **STEP 2** → STEP 3（段階的に確実に）
**最終更新**: 2025年10月30日

### 実装完了項目

#### STEP 1: デバッグシーンで51本化 ✅ (完了)
- InstancedMeshを使用した51本の羽板・リボン・ワイヤーの表示
- GUI切り替えによる1本⇔51本モードの実装
- 全インスタンスの同期動作確認
- カスタムシャドウマテリアルによる正しい影の表示
- 60fps以上のパフォーマンス確保

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

#### 次のステップ
STEP 2: サイン波アニメーションの実装
- `waveAnimation.ts` と `getBendAmount` 関数の実装
- InstancedBufferAttributeによる個別ベンド量の適用
- GUIでの波速度調整機能の追加
