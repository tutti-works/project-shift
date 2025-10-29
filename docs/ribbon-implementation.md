# 🎀 リボンのデバッグモード実装計画

## 📋 概要

リボンコンポーネントをデバッグモードで実装します。平たいリボンが、根本（地面側）で最もねじれ、先端（羽板側）ではねじれない、グラデーション状のねじれを表現します。

### 目標

1. **グラデーション状のねじれ**: 根本で最大、先端で最小（0）
2. **GUIによるインタラクティブ制御**: 基準角度と最大角度をリアルタイム調整
3. **スクロール連動**: 羽板の曲がりに応じてリボンが変形
4. **影の同期**: カスタムシャドウマテリアルで影も変形に連動

---

## 🎯 実装計画

### 1. GUI拡張（デバッグコントロール）

**対象ファイル**: [src/components/BladeDebugScene.tsx](../src/components/BladeDebugScene.tsx) (line 374付近)

#### 実装内容

デバッグGUIにリボン用のスライダーを追加:

```typescript
// GUI設定の追加
const guiParamsRef = useRef({
  wireThickness: 10,
  bladeThickness: ANIMATION_CONFIG.blade.thickness,
  ribbonBaseTwistDeg: 0,      // 基準ねじれ角度（度）
  ribbonMaxTwistDeg: 90,      // 最大ねじれ角度（度）
});

// GUIコントローラーの追加
const ribbonFolder = gui.addFolder('Ribbon');
ribbonFolder.add(guiParamsRef.current, 'ribbonBaseTwistDeg', 0, 180, 1)
  .name('Base Twist (deg)')
  .onChange((value: number) => {
    // Zustand store or ref に反映
    setRibbonBaseTwist(value * (Math.PI / 180));
  });

ribbonFolder.add(guiParamsRef.current, 'ribbonMaxTwistDeg', 0, 180, 1)
  .name('Max Twist (deg)')
  .onChange((value: number) => {
    setRibbonMaxTwist(value * (Math.PI / 180));
  });

ribbonFolder.open();
```

#### 状態管理の選択肢

**Option A: useRef（シンプル）**
```typescript
const ribbonBaseTwistRef = useRef<number>(0);
const ribbonMaxTwistRef = useRef<number>(Math.PI / 2);
```

**Option B: Zustand Store（推奨）**
```typescript
// src/store/ribbonConfigStore.ts
import { create } from 'zustand';

interface RibbonConfigState {
  ribbonBaseTwist: number;  // ラジアン
  ribbonMaxTwist: number;   // ラジアン
  setRibbonBaseTwist: (value: number) => void;
  setRibbonMaxTwist: (value: number) => void;
}

export const useRibbonConfigStore = create<RibbonConfigState>((set) => ({
  ribbonBaseTwist: 0,
  ribbonMaxTwist: Math.PI / 2,  // 90度
  setRibbonBaseTwist: (value) => set({ ribbonBaseTwist: value }),
  setRibbonMaxTwist: (value) => set({ ribbonMaxTwist: value }),
}));
```

**推奨理由**: Zustand storeを使うことで、複数コンポーネント間での状態共有が容易になり、将来的な拡張性が高い。

---

### 2. DebugRibbonコンポーネントの追加

**対象ファイル**: [src/components/BladeDebugScene.tsx](../src/components/BladeDebugScene.tsx) (line 493付近)

#### コンポーネント設計

```typescript
type DebugRibbonProps = {
  bendAmountRef: MutableRefObject<number>;
  ribbonWidth: number;        // リボン幅（mm）
  ribbonHeight: number;       // リボン高さ（mm）
};

const DebugRibbon = ({ bendAmountRef, ribbonWidth, ribbonHeight }: DebugRibbonProps) => {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<ShaderMaterial | null>(null);
  const depthMaterialRef = useRef<MeshDepthMaterial | null>(null);
  const distanceMaterialRef = useRef<MeshDistanceMaterial | null>(null);

  // Zustand storeから取得
  const ribbonBaseTwist = useRibbonConfigStore((state) => state.ribbonBaseTwist);
  const ribbonMaxTwist = useRibbonConfigStore((state) => state.ribbonMaxTwist);

  // ジオメトリ
  const geometry = useMemo(
    () =>
      new PlaneGeometry(
        toSceneUnits(ribbonWidth),
        toSceneUnits(ribbonHeight),
        1,  // widthSegments
        ANIMATION_CONFIG.ribbon.heightSegments || 64,  // heightSegments
      ),
    [ribbonWidth, ribbonHeight],
  );

  // アンカー位置（地面側、ワイヤーと反対側）
  const anchorScene = useMemo(
    () => new Vector3(0, 0, toSceneUnits(2400)),  // Z = +2400mm
    [],
  );

  // useFrameでマトリクス更新
  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const bendAmount = bendAmountRef.current;

    // 先端位置を計算（羽板の高さとbendAmountから）
    const bladeHeight = ANIMATION_CONFIG.blade.height;
    const tipPoint = computeBladePointMM(bendAmount, 1.0); // normalizedY = 1.0 (先端)
    const tipScene = new Vector3(
      toSceneUnits(tipPoint.x),
      toSceneUnits(tipPoint.y),
      toSceneUnits(tipPoint.z),
    );

    // リボンの方向ベクトル
    const direction = new Vector3().subVectors(tipScene, anchorScene);
    const length = direction.length();
    direction.normalize();

    // リボンの位置・回転・スケールを更新
    mesh.position.copy(anchorScene).add(direction.clone().multiplyScalar(length / 2));

    const up = new Vector3(0, 1, 0);
    const quaternion = new Quaternion().setFromUnitVectors(up, direction);
    mesh.quaternion.copy(quaternion);

    mesh.scale.set(1, length / toSceneUnits(ribbonHeight), 1);
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      position={[0, 0, 0]}
      castShadow
      receiveShadow
    />
  );
};
```

#### 配置

```tsx
<Suspense fallback={null}>
  <SingleBlade
    bendAmountRef={bendAmountRef}
    bladeThickness={bladeThickness}
  />
  <DebugWire
    bendAmountRef={bendAmountRef}
    wireThicknessRef={wireThicknessRef}
  />
  <DebugRibbon
    bendAmountRef={bendAmountRef}
    ribbonWidth={100}   // 仮の値、後で調整
    ribbonHeight={ANIMATION_CONFIG.blade.height}
  />
  <Ground />
</Suspense>
```

---

### 3. リボン用シェーダーの実装

**対象ファイル**: [src/shaders/ribbonVertex.glsl](../src/shaders/ribbonVertex.glsl)

#### Vertex Shader設計

```glsl
// Uniforms
uniform float uRibbonHeight;      // リボンの高さ（シーン単位）
uniform float uBaseTwist;         // 基準ねじれ角度（ラジアン）
uniform float uMaxTwist;          // 最大ねじれ角度（ラジアン）
uniform float uBendAmount;        // 羽板の曲がり量（0.0〜1.0）

varying vec2 vUv;
varying vec3 vNormal;

void main() {
  vUv = uv;

  // 高さ方向の正規化座標（0.0 = 根本, 1.0 = 先端）
  float normalizedY = (position.y + uRibbonHeight * 0.5) / uRibbonHeight;
  normalizedY = clamp(normalizedY, 0.0, 1.0);

  // ねじれ量の計算（根本で最大、先端で0）
  float twistGradient = 1.0 - normalizedY;  // 根本1.0 → 先端0.0

  // bendAmountに応じてねじれ角度を補間
  float twistAngle = mix(uBaseTwist, uMaxTwist, uBendAmount) * twistGradient;

  // 回転行列（Z軸周りの回転）
  float cosTheta = cos(twistAngle);
  float sinTheta = sin(twistAngle);
  mat2 rotationMatrix = mat2(
    cosTheta, -sinTheta,
    sinTheta, cosTheta
  );

  // 位置の変形
  vec3 transformed = position;
  vec2 rotatedXY = rotationMatrix * transformed.xy;
  transformed.x = rotatedXY.x;
  transformed.y = rotatedXY.y;

  // 法線の変形
  vec3 transformedNormal = normal;
  vec2 rotatedNormalXY = rotationMatrix * transformedNormal.xy;
  transformedNormal.x = rotatedNormalXY.x;
  transformedNormal.y = rotatedNormalXY.y;

  vNormal = normalize(normalMatrix * transformedNormal);

  // 最終的な位置
  gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
}
```

#### Fragment Shader

```glsl
// src/shaders/ribbonFragment.glsl
varying vec2 vUv;
varying vec3 vNormal;

void main() {
  // シンプルな拡散光
  vec3 lightDir = normalize(vec3(0.5, 1.0, 0.5));
  float diffuse = max(dot(vNormal, lightDir), 0.0);

  vec3 baseColor = vec3(0.8, 0.2, 0.2);  // 赤系の色
  vec3 color = baseColor * (0.4 + 0.6 * diffuse);

  gl_FragColor = vec4(color, 1.0);
}
```

---

### 4. カスタムシャドウマテリアルの実装

**対象ファイル**: [src/components/BladeDebugScene.tsx](../src/components/BladeDebugScene.tsx) (line 156付近のapplyBendToShaderパターン参照)

#### シェーダー共有関数

```typescript
const applyTwistToShader = useCallback(
  (shader: Shader, twistChunk: string) => {
    const ribbonBaseTwist = useRibbonConfigStore.getState().ribbonBaseTwist;
    const ribbonMaxTwist = useRibbonConfigStore.getState().ribbonMaxTwist;

    // Uniformを共有
    shader.uniforms.uRibbonHeight = sharedUniformsRef.current.uRibbonHeight;
    shader.uniforms.uBaseTwist = { value: ribbonBaseTwist };
    shader.uniforms.uMaxTwist = { value: ribbonMaxTwist };
    shader.uniforms.uBendAmount = sharedUniformsRef.current.uBendAmount;

    // Uniform宣言を追加
    shader.vertexShader = shader.vertexShader.replace(
      /#include\s*<common>/,
      `#include <common>
uniform float uRibbonHeight;
uniform float uBaseTwist;
uniform float uMaxTwist;
uniform float uBendAmount;`,
    );

    // twistChunkを #include <project_vertex> の直前に注入
    const twistBlock = `
      {
        vec3 twistPos = transformed;

        float normalizedY = (twistPos.y + uRibbonHeight * 0.5) / uRibbonHeight;
        normalizedY = clamp(normalizedY, 0.0, 1.0);

        float twistGradient = 1.0 - normalizedY;
        float twistAngle = mix(uBaseTwist, uMaxTwist, uBendAmount) * twistGradient;

        float cosTheta = cos(twistAngle);
        float sinTheta = sin(twistAngle);

        vec2 rotatedXY = vec2(
          twistPos.x * cosTheta - twistPos.y * sinTheta,
          twistPos.x * sinTheta + twistPos.y * cosTheta
        );

        twistPos.x = rotatedXY.x;
        twistPos.y = rotatedXY.y;

        transformed = twistPos;
      }
    `;

    shader.vertexShader = shader.vertexShader.replace(
      /#include\s*<project_vertex>/,
      `${twistBlock}
#include <project_vertex>`,
    );

    console.log('✅ [SHADER] Twist applied to ribbon shader');
  },
  [],
);
```

#### depthMaterial作成

```typescript
const ribbonDepthMaterial = useMemo(() => {
  if (!USE_CUSTOM_SHADOW) return null;

  const mat = new MeshDepthMaterial({
    side: DoubleSide,
    depthPacking: RGBADepthPacking,  // 高精度（必須）
  });

  mat.onBeforeCompile = (shader) => {
    applyTwistToShader(shader, twistChunk);
  };

  return mat;
}, [applyTwistToShader]);

const ribbonDistanceMaterial = useMemo(() => {
  if (!USE_CUSTOM_SHADOW) return null;

  const mat = new MeshDistanceMaterial({ side: DoubleSide });

  mat.onBeforeCompile = (shader) => {
    applyTwistToShader(shader, twistChunk);
  };

  return mat;
}, [applyTwistToShader]);
```

#### メッシュへの適用

```typescript
useLayoutEffect(() => {
  const mesh = meshRef.current;
  if (!mesh) return;

  materialRef.current = material;
  depthMaterialRef.current = ribbonDepthMaterial;
  distanceMaterialRef.current = ribbonDistanceMaterial;

  mesh.customDepthMaterial = ribbonDepthMaterial ?? undefined;
  mesh.customDistanceMaterial = ribbonDistanceMaterial ?? undefined;

  return () => {
    mesh.customDepthMaterial = undefined;
    mesh.customDistanceMaterial = undefined;
    depthMaterialRef.current = null;
    distanceMaterialRef.current = null;
  };
}, [ribbonDepthMaterial, ribbonDistanceMaterial, material]);
```

---

### 5. 動作確認

#### チェックリスト

**基本動作:**
- [ ] リボンが地面（Z=+2400mm）から羽板先端まで伸びている
- [ ] スクロールに応じてリボンが伸縮する
- [ ] リボンの根本が最もねじれている
- [ ] リボンの先端がねじれていない

**GUI連動:**
- [ ] Base Twistスライダーを動かすと基準ねじれ角度が変わる
- [ ] Max Twistスライダーを動かすと最大ねじれ角度が変わる
- [ ] スクロール位置によってねじれ量が補間される

**影の同期:**
- [ ] リボンの影が表示される
- [ ] リボンのねじれに応じて影も変形する
- [ ] スクロールで影が連動する
- [ ] SHOW_SHADOW_CAMERA_HELPERで視錐台を確認できる

#### デバッグ方法

1. **SHOW_SHADOW_CAMERA_HELPER = true** に設定
   ```typescript
   const SHOW_SHADOW_CAMERA_HELPER = true;
   ```

2. **シャドウカメラの視錐台確認**
   - リボンが視錐台内に収まっているか確認
   - 必要に応じてshadow-camera範囲を調整

3. **コンソールログ確認**
   ```typescript
   console.log('🎀 [RIBBON] Twist:', {
     baseTwist: ribbonBaseTwist * (180 / Math.PI) + '°',
     maxTwist: ribbonMaxTwist * (180 / Math.PI) + '°',
     bendAmount: bendAmountRef.current,
   });
   ```

---

## 📐 技術的な詳細

### ねじれのグラデーション計算

```
normalizedY: 0.0 (根本) → 1.0 (先端)
twistGradient = 1.0 - normalizedY
  → 1.0 (根本) → 0.0 (先端)

twistAngle = mix(baseTwist, maxTwist, bendAmount) * twistGradient
```

**例:**
- baseTwist = 0°
- maxTwist = 90°
- bendAmount = 0.5（50%スクロール）

→ 中間値 = 45°

- 根本: 45° × 1.0 = 45°
- 中央: 45° × 0.5 = 22.5°
- 先端: 45° × 0.0 = 0°

### 回転行列（Z軸周り）

```
[ cos(θ)  -sin(θ) ]
[ sin(θ)   cos(θ) ]
```

XY平面での回転を適用:
```glsl
vec2 rotatedXY = vec2(
  x * cos(θ) - y * sin(θ),
  x * sin(θ) + y * cos(θ)
);
```

### シャドウマテリアルの重要ポイント

[docs/shadow-issue.md](shadow-issue.md) の実装パターンを踏襲:

1. **depthPacking: RGBADepthPacking** - 高精度エンコーディング（必須）
2. **#include <project_vertex> 直前に注入** - transformedの上書き防止
3. **Uniform参照共有** - Object.assignまたは直接代入
4. **毎フレーム更新不要** - onBeforeCompileは初回のみ実行

---

## 🔧 設定パラメータ

### ANIMATION_CONFIGへの追加

```typescript
// src/config/animation.ts
export const ANIMATION_CONFIG = {
  // ... 既存の設定 ...
  ribbon: {
    width: 100,               // mm
    heightSegments: 64,       // 分割数
    baseTwistDeg: 0,          // 基準ねじれ角度（度）
    maxTwistDeg: 90,          // 最大ねじれ角度（度）
    anchorDistance: 2400,     // 地面からのアンカー距離（mm）
    color: 0xcc2222,          // 赤系の色
  },
};
```

### デフォルト値の推奨

- **ribbonWidth**: 100mm（調整可能）
- **ribbonHeightSegments**: 64（スムーズなねじれ表現に必要）
- **baseTwistDeg**: 0°（スクロール0%時のねじれ）
- **maxTwistDeg**: 90°（スクロール50%時のねじれ）
- **anchorDistance**: 2400mm（ワイヤーと反対側）

---

## 📝 実装の優先順位

### Phase 1: 基本実装（最優先）
1. Zustand store作成（ribbonConfigStore.ts）
2. GUI拡張（ribbonBaseTwist, ribbonMaxTwist）
3. DebugRibbonコンポーネント作成
4. リボン用シェーダー実装

### Phase 2: 影の実装
5. applyTwistToShader関数実装
6. ribbonDepthMaterial作成
7. ribbonDistanceMaterial作成
8. メッシュへのカスタムマテリアル適用

### Phase 3: 調整と最適化
9. パラメータの微調整
10. シャドウカメラ範囲の最適化
11. パフォーマンス確認
12. ドキュメント更新

---

## 🎯 期待される成果物

### 動作デモ

1. **スクロール0%**: リボンが直線、ねじれなし（baseTwist）
2. **スクロール50%**: リボンが曲がる、根本が最大ねじれ（maxTwist）
3. **スクロール100%**: リボンが直線に戻る、ねじれなし（baseTwist）

### GUIコントロール

- Base Twistスライダー: 0° - 180°
- Max Twistスライダー: 0° - 180°
- リアルタイム更新: スライダー操作で即座に反映

### 影の同期

- リボンのねじれに応じて影も変形
- スクロールで影が連動
- 高解像度の影（シャドウカメラ最適化済み）

---

## 📚 参考資料

- [docs/shadow-issue.md](shadow-issue.md) - カスタムシャドウの実装パターン
- [docs/technical-specification.md](technical-specification.md) - 技術仕様
- [docs/animation-config.md](animation-config.md) - パラメータ設定

---

**ステータス**: 計画完了、実装待ち
**最終更新**: 2025-10-30
