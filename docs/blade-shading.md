# 🎨 羽板の陰影（Shading）実装計画

## 📋 概要

現在の羽板シェーダーは変形ロジックのみを実装しており、陰影計算が不足しているため、立体感に欠ける表現となっています。この計画では、羽板のしなり変形に応じて法線を正しく再計算し、物理ベースのライティングまたは簡易的な陰影計算を導入します。

### 目標

1. **法線の正確な再計算**: しなり変形後の表面方向に応じた法線ベクトルの更新
2. **陰影の導入**: Lambert拡散反射またはPBRベースのライティング実装
3. **パフォーマンス維持**: 51本構成でも60fps目標を維持
4. **デバッグ支援**: GUIによるライト調整とノーマル可視化

---

## 🎯 実装計画

### Phase 1: 現状把握と分析

#### 1.1 シェーダーの精査

**対象ファイル**:
- [src/shaders/bladeDebugVertex.glsl](../src/shaders/bladeDebugVertex.glsl)
- [src/shaders/bladeFragment.glsl](../src/shaders/bladeFragment.glsl)
- [src/shaders/bladeVertex.glsl](../src/shaders/bladeVertex.glsl)

**確認項目**:
- [ ] 現在の頂点シェーダーでの変形ロジックの詳細
- [ ] 法線計算の有無（`vNormal` の計算方法）
- [ ] フラグメントシェーダーでのライティング計算の有無
- [ ] `normalMatrix` の適用状況

#### 1.2 コンポーネント比較

**対象ファイル**:
- [src/components/BladeDebugScene.tsx](../src/components/BladeDebugScene.tsx) - デバッグ用（1本）
- [src/components/BladeInstances.tsx](../src/components/BladeInstances.tsx) - 本番用（51本）

**確認項目**:
- [ ] ShaderMaterial の uniform 定義の相違
- [ ] InstancedMesh での attribute の扱い
- [ ] カスタムシャドウマテリアルとの統合方法

---

### Phase 2: 法線の再計算

#### 2.1 実装方針の選択

**Option A: 接線ベクトルベース（推奨・高精度）**

変形後の接線ベクトルを計算し、法線を再構築します。

```glsl
// 変形後の接線ベクトルを計算
vec3 computeTransformedNormal(vec3 position, vec3 normal, float bendAmount) {
  // しなり角度の計算
  float normalizedY = clamp((position.y + (uHeight * 0.5)) / uHeight, 0.0, 1.0);
  float theta = uMaxBendAngle * bendAmount;

  if (theta <= 0.0001) {
    return normal;
  }

  // 円弧上の接線方向を計算
  float angle = theta * normalizedY;
  float radius = uHeight / theta;

  // 接線ベクトル (dP/dy)
  vec3 tangentY = vec3(0.0, cos(angle), sin(angle));

  // 法線の再計算（外積で計算）
  vec3 tangentX = vec3(1.0, 0.0, 0.0);  // X方向は変形しない
  vec3 newNormal = cross(tangentX, tangentY);

  return normalize(newNormal);
}
```

**Option B: 微分ベース（簡易・GPU負荷低）**

フラグメントシェーダーで `dFdx` / `dFdy` を使用して法線を近似計算します。

```glsl
// フラグメントシェーダー内
vec3 computeNormalFromDerivatives(vec3 pos) {
  vec3 fdx = dFdx(pos);
  vec3 fdy = dFdy(pos);
  return normalize(cross(fdx, fdy));
}
```

**推奨**: Option A（接線ベースト）
- 理由: 数学的に正確、変形ロジックと一貫性が高い
- デメリット: 若干の計算コスト増加

#### 2.2 頂点シェーダーへの実装

**対象ファイル**: [src/shaders/bladeDebugVertex.glsl](../src/shaders/bladeDebugVertex.glsl)

```glsl
uniform float uHeight;
uniform float uBendAmount;
uniform float uMaxBendAngle;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vUv = uv;

  // ===== 既存の変形ロジック =====
  float bendAmount = clamp(uBendAmount, 0.0, 1.0);
  float theta = uMaxBendAngle * bendAmount;

  vec3 transformed = position;

  if (theta > 0.0001) {
    float normalizedY = clamp((transformed.y + (uHeight * 0.5)) / uHeight, 0.0, 1.0);
    float radius = uHeight / theta;
    float angle = theta * normalizedY;
    float yPos = radius * sin(angle);
    float zOffset = radius * (1.0 - cos(angle));
    transformed.y = yPos - (uHeight * 0.5);
    transformed.z += zOffset;
  }

  // ===== 法線の再計算（新規追加） =====
  vec3 transformedNormal = normal;

  if (theta > 0.0001) {
    float normalizedY = clamp((position.y + (uHeight * 0.5)) / uHeight, 0.0, 1.0);
    float angle = theta * normalizedY;

    // 接線ベクトル（Y方向）
    vec3 tangentY = vec3(0.0, cos(angle), sin(angle));

    // 接線ベクトル（X方向）- 変形なし
    vec3 tangentX = vec3(1.0, 0.0, 0.0);

    // 従法線ベクトル（Z方向）
    vec3 bitangent = cross(tangentX, tangentY);

    // 元の法線を新しい座標系に変換
    mat3 TBN = mat3(tangentX, tangentY, bitangent);
    transformedNormal = TBN * normal;
  }

  // normalMatrixで変換（カメラ空間へ）
  vNormal = normalize(normalMatrix * transformedNormal);

  // ビュー空間での位置（スペキュラー計算用）
  vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
  vViewPosition = -mvPosition.xyz;

  gl_Position = projectionMatrix * mvPosition;
}
```

#### 2.3 検証方法

**ノーマル可視化シェーダー**の作成（デバッグ用）:

```glsl
// bladeFragment.glsl に一時的に追加
void main() {
  // 法線をRGBで可視化（-1.0〜1.0 → 0.0〜1.0）
  vec3 normalColor = vNormal * 0.5 + 0.5;
  gl_FragColor = vec4(normalColor, 1.0);
}
```

**確認ポイント**:
- しなりがない状態（bendAmount = 0）: 法線が垂直方向（緑色）
- しなりが最大（bendAmount = 1）: 法線が曲面に沿って変化（グラデーション）

---

### Phase 3: マテリアル調整

#### 3.1 実装方針の選択

**Option A: 簡易的な Lambert + Blinn-Phong（推奨）**

軽量で効果的な陰影表現。木材質感に適しています。

```glsl
// bladeFragment.glsl
uniform vec3 uColor;
uniform vec3 uLightDirection;  // 正規化されたライト方向
uniform vec3 uLightColor;
uniform float uAmbientStrength;
uniform float uSpecularStrength;
uniform float uShininess;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);

  // ===== Ambient（環境光） =====
  vec3 ambient = uAmbientStrength * uLightColor;

  // ===== Diffuse（拡散反射） - Lambert =====
  float diff = max(dot(normal, uLightDirection), 0.0);
  vec3 diffuse = diff * uLightColor;

  // ===== Specular（鏡面反射） - Blinn-Phong =====
  vec3 halfDir = normalize(uLightDirection + viewDir);
  float spec = pow(max(dot(normal, halfDir), 0.0), uShininess);
  vec3 specular = uSpecularStrength * spec * uLightColor;

  // ===== 最終的な色の合成 =====
  vec3 result = (ambient + diffuse + specular) * uColor;

  gl_FragColor = vec4(result, 1.0);
}
```

**Option B: PBRベース（高品質）**

Three.jsの `MeshStandardMaterial` 相当のPBR計算。

```glsl
// より複雑な実装が必要
// - BRDF（双方向反射率分布関数）
// - Fresnel項
// - roughness/metalness パラメータ
// - 環境マップ（IBL）対応

// 参考: Three.jsの physical_fragment.glsl.js
```

**推奨**: Option A（Lambert + Blinn-Phong）
- 理由: 木材質感に十分、パフォーマンス良好
- Option Bは必要に応じて後で検討

#### 3.2 Uniform パラメータの追加

**対象ファイル**: [src/components/BladeDebugScene.tsx](../src/components/BladeDebugScene.tsx)

```typescript
const material = useMemo(
  () =>
    new ShaderMaterial({
      uniforms: {
        uColor: { value: new Color(ANIMATION_CONFIG.blade.color) },
        uHeight: { value: toSceneUnits(ANIMATION_CONFIG.blade.height) },
        uBendAmount: { value: 0 },
        uMaxBendAngle: { value: ANIMATION_CONFIG.blade.maxBendAngle },

        // ===== 新規追加: ライティングパラメータ =====
        uLightDirection: { value: new Vector3(0.5, 1.0, 0.5).normalize() },
        uLightColor: { value: new Color(0xffffff) },
        uAmbientStrength: { value: 0.3 },
        uSpecularStrength: { value: 0.5 },
        uShininess: { value: 32.0 },
      },
      side: DoubleSide,
      vertexShader: bladeDebugVertexShader,
      fragmentShader: bladeFragmentShader,
    }),
  [],
);
```

#### 3.3 設定ファイルへの追加

**対象ファイル**: [src/config/animation.ts](../src/config/animation.ts)

```typescript
export const ANIMATION_CONFIG = {
  // ... 既存の設定 ...
  blade: {
    // ... 既存のパラメータ ...

    // ライティングパラメータ
    lighting: {
      ambientStrength: 0.3,      // 環境光の強度 (0.0〜1.0)
      specularStrength: 0.5,     // 鏡面反射の強度 (0.0〜1.0)
      shininess: 32.0,           // 鏡面反射の鋭さ (1.0〜128.0)
      lightColor: 0xffffff,      // ライトの色
    },
  },
};
```

---

### Phase 4: デバッグ支援

#### 4.1 GUI コントロールの追加

**対象ファイル**: [src/components/BladeDebugScene.tsx](../src/components/BladeDebugScene.tsx)

```typescript
// GUI パラメータの拡張
const guiParamsRef = useRef({
  // ... 既存のパラメータ ...

  // ライティング調整
  lightX: 0.5,
  lightY: 1.0,
  lightZ: 0.5,
  ambientStrength: 0.3,
  specularStrength: 0.5,
  shininess: 32.0,

  // デバッグモード
  showNormals: false,  // 法線可視化
});

// GUI フォルダーの追加
useEffect(() => {
  // ... 既存のGUI初期化 ...

  const lightingFolder = gui.addFolder('Lighting');

  lightingFolder.add(guiParamsRef.current, 'lightX', -1, 1, 0.1)
    .name('Light Direction X')
    .onChange((value: number) => {
      const dir = new Vector3(
        value,
        guiParamsRef.current.lightY,
        guiParamsRef.current.lightZ
      ).normalize();
      material.uniforms.uLightDirection.value = dir;
    });

  lightingFolder.add(guiParamsRef.current, 'lightY', -1, 1, 0.1)
    .name('Light Direction Y')
    .onChange((value: number) => {
      const dir = new Vector3(
        guiParamsRef.current.lightX,
        value,
        guiParamsRef.current.lightZ
      ).normalize();
      material.uniforms.uLightDirection.value = dir;
    });

  lightingFolder.add(guiParamsRef.current, 'lightZ', -1, 1, 0.1)
    .name('Light Direction Z')
    .onChange((value: number) => {
      const dir = new Vector3(
        guiParamsRef.current.lightX,
        guiParamsRef.current.lightY,
        value
      ).normalize();
      material.uniforms.uLightDirection.value = dir;
    });

  lightingFolder.add(guiParamsRef.current, 'ambientStrength', 0, 1, 0.05)
    .name('Ambient Strength')
    .onChange((value: number) => {
      material.uniforms.uAmbientStrength.value = value;
    });

  lightingFolder.add(guiParamsRef.current, 'specularStrength', 0, 2, 0.05)
    .name('Specular Strength')
    .onChange((value: number) => {
      material.uniforms.uSpecularStrength.value = value;
    });

  lightingFolder.add(guiParamsRef.current, 'shininess', 1, 128, 1)
    .name('Shininess')
    .onChange((value: number) => {
      material.uniforms.uShininess.value = value;
    });

  lightingFolder.add(guiParamsRef.current, 'showNormals')
    .name('Show Normals (Debug)')
    .onChange((value: boolean) => {
      // フラグメントシェーダーを切り替え
      material.uniforms.uShowNormals = { value: value };
      material.needsUpdate = true;
    });

  lightingFolder.open();
}, []);
```

#### 4.2 ノーマル可視化モード

**対象ファイル**: [src/shaders/bladeFragment.glsl](../src/shaders/bladeFragment.glsl)

```glsl
uniform vec3 uColor;
uniform vec3 uLightDirection;
uniform vec3 uLightColor;
uniform float uAmbientStrength;
uniform float uSpecularStrength;
uniform float uShininess;
uniform bool uShowNormals;  // デバッグフラグ

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  // ===== デバッグモード: 法線可視化 =====
  if (uShowNormals) {
    vec3 normalColor = normalize(vNormal) * 0.5 + 0.5;
    gl_FragColor = vec4(normalColor, 1.0);
    return;
  }

  // ===== 通常のライティング計算 =====
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);

  // Ambient
  vec3 ambient = uAmbientStrength * uLightColor;

  // Diffuse (Lambert)
  float diff = max(dot(normal, uLightDirection), 0.0);
  vec3 diffuse = diff * uLightColor;

  // Specular (Blinn-Phong)
  vec3 halfDir = normalize(uLightDirection + viewDir);
  float spec = pow(max(dot(normal, halfDir), 0.0), uShininess);
  vec3 specular = uSpecularStrength * spec * uLightColor;

  // 最終的な色
  vec3 result = (ambient + diffuse + specular) * uColor;

  gl_FragColor = vec4(result, 1.0);
}
```

---

### Phase 5: 本番適用

#### 5.1 BladeInstances.tsx への反映

**対象ファイル**: [src/components/BladeInstances.tsx](../src/components/BladeInstances.tsx)

**実装手順**:
1. デバッグシーンで確定したシェーダーコードをコピー
2. InstancedMesh での attribute 伝達を確認
3. `InstancedBufferAttribute` での bendAmount の伝達
4. uniform の共有方法を確認

**注意点**:
- InstancedMesh では各インスタンスで法線計算が独立して行われることを確認
- `normalMatrix` が各インスタンスに正しく適用されるか検証

#### 5.2 カスタムシャドウマテリアルへの反映

**対象ファイル**: [src/components/BladeDebugScene.tsx](../src/components/BladeDebugScene.tsx) (applyBendToShader)

影マテリアルにも同じ法線計算ロジックを適用する必要があります。

```typescript
const applyBendToShader = useCallback(
  (shader: Shader) => {
    // ... 既存の uniform 共有 ...

    // ===== 法線計算ロジックの注入 =====
    const normalCalculationChunk = `
      // 法線の再計算
      if (theta > 0.0001) {
        float normalizedY = clamp((bendPos.y + uHeight * 0.5) / uHeight, 0.0, 1.0);
        float angle = theta * normalizedY;

        vec3 tangentY = vec3(0.0, cos(angle), sin(angle));
        vec3 tangentX = vec3(1.0, 0.0, 0.0);
        vec3 bitangent = cross(tangentX, tangentY);

        mat3 TBN = mat3(tangentX, tangentY, bitangent);
        objectNormal = TBN * objectNormal;
      }
    `;

    // #include <beginnormal_vertex> の後に注入
    shader.vertexShader = shader.vertexShader.replace(
      /#include\s*<beginnormal_vertex>/,
      `#include <beginnormal_vertex>
${normalCalculationChunk}`,
    );

    console.log('✅ [SHADER] Normal calculation applied to shadow shader');
  },
  [bendChunk],
);
```

---

### Phase 6: パフォーマンス確認

#### 6.1 パフォーマンス計測

**計測ツール**:
- Stats.js（@react-three/drei の `<Stats />`）
- Chrome DevTools Performance タブ

**計測項目**:
- [ ] デバッグシーン（1本）での FPS
- [ ] 本番シーン（51本）での FPS
- [ ] スクロール時の FPS 変動
- [ ] GPU使用率

**目標値**:
- デスクトップ: 60fps 以上
- モバイル: 30fps 以上

#### 6.2 最適化手法

**セグメント数の調整**:

```typescript
// src/config/animation.ts
export const ANIMATION_CONFIG = {
  blade: {
    heightSegments: 64,  // 高品質（デフォルト）
    // モバイル向け: 32 に削減
  },
};
```

**デバイス判定による動的調整**:

```typescript
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const heightSegments = isMobile ? 32 : 64;
const specularStrength = isMobile ? 0.2 : 0.5;  // モバイルではスペキュラーを抑える
```

**ライティング最適化**:
- DirectionalLight の数を最小限に（1〜2個）
- スペキュラー計算の簡略化（Blinn-Phong から Lambert のみへ）
- シャドウマップの解像度調整（1024x1024 → 512x512）

#### 6.3 パフォーマンスチェックリスト

- [ ] 1本構成で 60fps 達成
- [ ] 51本構成で 60fps 達成（デスクトップ）
- [ ] 51本構成で 30fps 達成（モバイル）
- [ ] スクロール時のフレーム落ちなし
- [ ] GPU使用率が 80% 以下
- [ ] メモリリークなし

---

## 📐 技術的な詳細

### 法線計算の数学的背景

#### 円弧上の法線

羽板がしなると、表面は円弧状になります。円弧上の任意の点での法線は、その点での接線に垂直です。

**接線ベクトル（Y方向）**:
```
円弧の式:
  y = r * sin(θ * t)
  z = r * (1 - cos(θ * t))

接線ベクトル dy/dt:
  dy/dt = r * θ * cos(θ * t)
  dz/dt = r * θ * sin(θ * t)

正規化すると:
  tangentY = (0, cos(θ * t), sin(θ * t))
```

**法線ベクトル**:
```
tangentX = (1, 0, 0)  // X方向は変形しない
tangentY = (0, cos(angle), sin(angle))
normal = cross(tangentX, tangentY) = (0, -sin(angle), cos(angle))
```

#### TBN行列

元の法線を新しい座標系に変換するため、TBN（Tangent-Bitangent-Normal）行列を構築します。

```glsl
mat3 TBN = mat3(
  tangentX,     // 列1
  tangentY,     // 列2
  bitangent     // 列3
);

transformedNormal = TBN * originalNormal;
```

---

## 🎨 期待される成果

### Before（現状）
- 羽板が単色で平坦に見える
- 立体感がなく、変形が分かりにくい
- 木材の質感が表現できていない

### After（実装後）
- 羽板の曲面に沿った陰影が表現される
- しなりの動きが視覚的に理解しやすくなる
- 木材らしい質感（拡散反射+鏡面反射）が実現
- デバッグGUIでライティングを調整可能

---

## 📝 実装チェックリスト

### Phase 1: 現状把握 ⏳
- [ ] bladeDebugVertex.glsl の変形ロジック確認
- [ ] bladeFragment.glsl の現在の実装確認
- [ ] bladeVertex.glsl との相違点洗い出し
- [ ] BladeInstances.tsx の実装確認

### Phase 2: 法線再計算 ⏳
- [ ] 接線ベースの法線計算実装
- [ ] 頂点シェーダーへの統合
- [ ] ノーマル可視化シェーダーでの検証
- [ ] しなり量による法線変化の確認

### Phase 3: マテリアル調整 ⏳
- [ ] Lambert拡散反射の実装
- [ ] Blinn-Phong鏡面反射の実装
- [ ] uniform パラメータの追加
- [ ] animation.ts への設定追加

### Phase 4: デバッグ支援 ⏳
- [ ] GUIライティングコントロールの追加
- [ ] ノーマル可視化モードの実装
- [ ] ライト方向の可視化
- [ ] パラメータのリアルタイム調整

### Phase 5: 本番適用 ⏳
- [ ] BladeInstances.tsx へのシェーダー反映
- [ ] InstancedMesh での動作確認
- [ ] カスタムシャドウマテリアルへの反映
- [ ] 51本構成での見栄え確認

### Phase 6: パフォーマンス確認 ⏳
- [ ] FPS計測（1本/51本）
- [ ] スクロール時のパフォーマンス確認
- [ ] heightSegments の最適化
- [ ] ライティングパラメータの調整
- [ ] モバイル対応の検証

---

## 🔗 関連ドキュメント

- [技術仕様書](technical-specification.md) - 全体的な技術仕様
- [カスタムシャドウ実装](shadow-issue.md) - シャドウマテリアルのパターン
- [要件定義書](requirements.md) - プロジェクトの要件

---

## 💡 実装のヒント

### デバッグ時のTips

1. **法線の向きを確認**:
   - ノーマル可視化モードで、緑色（+Y）が上を向いているか確認
   - しなり時に法線が滑らかに変化するか確認

2. **ライト方向の調整**:
   - 初期値: `(0.5, 1.0, 0.5)` - 斜め上から照射
   - GUIで調整しながら最適な角度を見つける

3. **スペキュラーハイライトの確認**:
   - shininess が高い（64〜128）: 鋭いハイライト（金属的）
   - shininess が低い（8〜32）: 柔らかいハイライト（木材的）

### パフォーマンス最適化のTips

1. **計算の簡略化**:
   - スペキュラー計算が重い場合は、Lambert のみに切り替え
   - `pow()` 関数の使用を最小限に

2. **セグメント数の調整**:
   - heightSegments: 64 → 32 で約50%の頂点数削減
   - 視覚的な品質とのバランスを確認

3. **条件分岐の最適化**:
   - `if (theta > 0.0001)` のような分岐はGPUで重い
   - 可能であれば `mix()` や `step()` で置き換え

---

## ✅ 実装完了

### 達成事項

#### 1. **法線の再計算実装** ✅
- **実装方式**: Jacobian逆転置行列を使用した高精度法線計算
- **対象ファイル**: [src/shaders/bladeDebugVertex.glsl](../src/shaders/bladeDebugVertex.glsl)
- **技術詳細**:
  - しなり変形のJacobian行列の逆転置を計算
  - `mat3 jacobianInvTranspose` による法線変換
  - ゼロ除算対策（`safeCos` による安全な計算）
  - ワールド空間での法線計算（`vWorldNormal`）

**実装コード**:
```glsl
// Jacobian逆転置行列による法線変換
float safeCos = abs(cosAngle) > 1e-4 ? cosAngle : (cosAngle >= 0.0 ? 1e-4 : -1e-4);
float invCos = 1.0 / safeCos;
float tanAngle = sinAngle * invCos;

mat3 jacobianInvTranspose = mat3(
  1.0,    0.0,        0.0,
  0.0,    invCos,     0.0,
  0.0,   -tanAngle,   1.0
);

vec3 bentNormal = normalize(jacobianInvTranspose * normal);
vWorldNormal = normalize(mat3(modelMatrix) * bentNormal);
```

#### 2. **Blinn-Phongライティング実装** ✅
- **実装方式**: Lambert拡散反射 + Blinn-Phong鏡面反射
- **対象ファイル**: [src/shaders/bladeFragment.glsl](../src/shaders/bladeFragment.glsl)
- **技術詳細**:
  - Ambient（環境光）: `uAmbientIntensity`で調整可能
  - Diffuse（拡散反射）: Lambert計算 `max(dot(normal, lightDir), 0.0)`
  - Specular（鏡面反射）: Blinn-Phong計算 `pow(max(dot(normal, halfVector), 0.0), uSpecularPower)`
  - ワールド空間でのライティング計算

**実装コード**:
```glsl
// Lambert拡散反射
float diffuseStrength = max(dot(normal, lightDir), 0.0);
vec3 diffuse = uColor * uLightColor * diffuseStrength * uLightIntensity;

// 環境光
vec3 ambient = uColor * uAmbientColor * uAmbientIntensity;

// Blinn-Phong鏡面反射
vec3 viewDir = normalize(cameraPosition - vWorldPosition);
vec3 halfVector = normalize(lightDir + viewDir);
float spec = pow(max(dot(normal, halfVector), 0.0), uSpecularPower) * uSpecularIntensity;
vec3 specular = uLightColor * spec;

vec3 finalColor = ambient + diffuse + specular;
```

#### 3. **Zustand Store実装** ✅
- **対象ファイル**: [src/store/bladeShadeStore.ts](../src/store/bladeShadeStore.ts)
- **管理パラメータ**:
  - `ambientIntensity`: 環境光強度（0〜1.5）デフォルト: 0.35
  - `specularIntensity`: 鏡面反射強度（0〜1）デフォルト: 0.25
  - `specularPower`: 鏡面反射鋭さ（1〜256）デフォルト: 32
- **バリデーション**: clamp関数による範囲制限

#### 4. **デバッグGUIコントロール実装** ✅
- **対象ファイル**: [src/components/BladeDebugScene/BladeDebugControls.tsx](../src/components/BladeDebugScene/BladeDebugControls.tsx)
- **実装機能**:
  - Lighting フォルダー内に4つのスライダー
    - Ambient Intensity (0〜1.5)
    - Specular Intensity (0〜1)
    - Specular Power (1〜256)
    - Directional Intensity (0〜5) - DirectionalLight強度
  - Show Normals トグル（法線可視化）
  - Show Axes トグル（座標軸表示）
  - Show Shadow Helper トグル（シャドウカメラ可視化）

#### 5. **デバッグヘルパー実装** ✅

**BladeNormalsHelper** ([src/components/BladeDebugScene/BladeNormalsHelper.tsx](../src/components/BladeDebugScene/BladeNormalsHelper.tsx))
- Three.jsの `VertexNormalsHelper` を使用
- 法線ベクトルを視覚的に表示
- リアルタイム更新（useFrame）
- GUIから切り替え可能

**AxesIndicator** ([src/components/BladeDebugScene/AxesIndicator.tsx](../src/components/BladeDebugScene/AxesIndicator.tsx))
- 座標軸の可視化
- X軸（赤）、Y軸（緑）、Z軸（青）

**ShadowCameraHelper** ([src/components/BladeDebugScene/ShadowCameraHelper.tsx](../src/components/BladeDebugScene/ShadowCameraHelper.tsx))
- シャドウカメラの視錐台可視化
- 影の範囲最適化に使用

#### 6. **コンポーネント分離** ✅

**新しいディレクトリ構造**: `src/components/BladeDebugScene/`
- `index.tsx` - メインシーンコンポーネント
- `SingleBlade.tsx` - 羽板コンポーネント
- `DebugRibbon.tsx` - リボンコンポーネント
- `DebugWire.tsx` - ワイヤーコンポーネント
- `BladeDebugControls.tsx` - GUIコントロール
- `BladeNormalsHelper.tsx` - 法線可視化ヘルパー
- `AxesIndicator.tsx` - 座標軸ヘルパー
- `ShadowCameraHelper.tsx` - シャドウカメラヘルパー
- `Ground.tsx` - 地面コンポーネント
- `useBladeGeometry.ts` - ジオメトリフック
- `utils.ts` - ユーティリティ関数

**メリット**:
- コードの可読性向上
- 再利用性の向上
- メンテナンス性の向上
- 関心の分離

---

## 🎯 実装の成果

### Before（実装前）
- 羽板が単色フラットで立体感なし
- 変形が視覚的に分かりにくい
- 木材の質感が表現できていない

### After（実装後）
- **羽板に美しい陰影**:
  - しなりに応じた自然な陰影
  - 木材らしい質感（拡散反射+鏡面反射）
  - リアルタイムライティング
- **デバッグ機能充実**:
  - GUIで全パラメータ調整可能
  - 法線可視化で計算検証可能
  - 座標軸・シャドウカメラ可視化
- **コード品質向上**:
  - コンポーネント分離で保守性向上
  - Zustand storeで状態管理一元化

---

## 📊 実装チェックリスト更新

### Phase 1: 現状把握 ✅ 完了
- [x] bladeDebugVertex.glsl の変形ロジック確認
- [x] bladeFragment.glsl の現在の実装確認
- [x] bladeVertex.glsl との相違点洗い出し
- [x] BladeInstances.tsx の実装確認

### Phase 2: 法線再計算 ✅ 完了
- [x] Jacobian逆転置行列による法線計算実装
- [x] 頂点シェーダーへの統合
- [x] ノーマル可視化シェーダーでの検証（BladeNormalsHelper）
- [x] しなり量による法線変化の確認

### Phase 3: マテリアル調整 ✅ 完了
- [x] Lambert拡散反射の実装
- [x] Blinn-Phong鏡面反射の実装
- [x] uniform パラメータの追加
- [x] bladeShadeStore（Zustand）の作成

### Phase 4: デバッグ支援 ✅ 完了
- [x] GUIライティングコントロールの追加
- [x] ノーマル可視化モードの実装（BladeNormalsHelper）
- [x] 座標軸の可視化（AxesIndicator）
- [x] シャドウカメラ可視化（ShadowCameraHelper）
- [x] パラメータのリアルタイム調整

### Phase 5: 本番適用 ⏳ 次のステップ
- [ ] BladeInstances.tsx へのシェーダー反映
- [ ] InstancedMesh での動作確認
- [ ] カスタムシャドウマテリアルへの法線計算反映
- [ ] 51本構成での見栄え確認

### Phase 6: パフォーマンス確認 ⏳ 次のステップ
- [ ] FPS計測（1本/51本）
- [ ] スクロール時のパフォーマンス確認
- [ ] heightSegments の最適化
- [ ] ライティングパラメータの調整
- [ ] モバイル対応の検証

---

## 🔧 実装で使用した技術

### 数学的手法
- **Jacobian逆転置行列**: 変形後の法線を正確に計算
  - しなり変形のヤコビアン J を計算
  - 法線変換には (J⁻¹)ᵀ を使用
  - ゼロ除算対策で数値安定性を確保

### シェーダー技術
- **ワールド空間でのライティング**: カメラに依存しない一貫した陰影
- **Blinn-Phong**: Phongより高速な鏡面反射計算
- **Half Vector**: `normalize(lightDir + viewDir)` で効率的に計算

### React/Three.js技術
- **Zustand Store**: グローバル状態管理
- **useFrame**: 毎フレームのuniform更新
- **forwardRef**: 親コンポーネントからのメッシュ参照
- **VertexNormalsHelper**: 法線のデバッグ可視化

---

**ステータス**: ✅ Phase 1-4 完了 | Phase 5-6 次のステップ（51本構成への適用）
**最終更新**: 2025年10月30日
