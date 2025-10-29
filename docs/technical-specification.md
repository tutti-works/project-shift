# 📐 技術仕様書

## 1. プロジェクト構成

### 1.1 技術スタック

- **フレームワーク:** Next.js 14+ (App Router)
- **言語:** TypeScript
- **3Dライブラリ:**
  - Three.js
  - React Three Fiber (R3F) v8+
  - @react-three/drei
- **スタイリング:** CSS Modules / Tailwind CSS
- **スクロール制御:** Lenis（スムーススクロール）
- **状態管理:** React Context / Zustand（必要に応じて）

### 1.2 ディレクトリ構成

```
project-shift/
├── src/
│   ├── app/
│   │   ├── page.tsx              # メインページ
│   │   ├── layout.tsx            # ルートレイアウト
│   │   └── globals.css           # グローバルスタイル
│   ├── components/
│   │   ├── Scene.tsx             # R3F Canvas ラッパー
│   │   ├── ShiftStructure.tsx    # メイン3D構造体
│   │   ├── Unit.tsx              # 単一ユニット（羽板・リボン・ワイヤー）
│   │   ├── BladeInstances.tsx    # 羽板の InstancedMesh
│   │   ├── RibbonInstances.tsx   # リボンの InstancedMesh
│   │   ├── WireInstances.tsx     # ワイヤーの InstancedMesh
│   │   ├── CameraController.tsx  # カメラ制御
│   │   └── ScrollController.tsx  # スクロール制御
│   ├── shaders/
│   │   ├── bladeVertex.glsl      # 羽板用 Vertex Shader
│   │   ├── bladeFragment.glsl    # 羽板用 Fragment Shader
│   │   ├── ribbonVertex.glsl     # リボン用 Vertex Shader
│   │   └── ribbonFragment.glsl   # リボン用 Fragment Shader
│   ├── config/
│   │   └── animation.ts          # アニメーション設定
│   ├── utils/
│   │   ├── animationHelpers.ts   # アニメーション計算ヘルパー
│   │   └── geometryHelpers.ts    # ジオメトリ生成ヘルパー
│   └── types/
│       └── animation.ts          # 型定義
├── public/
│   └── assets/                   # 画像・テクスチャ
├── docs/
│   ├── requirements.md           # 要件定義書
│   ├── technical-specification.md # 技術仕様書（本ファイル）
│   └── animation-config.md       # アニメーション設定詳細
└── package.json
```

---

## 2. 3Dモデル詳細

### 2.1 座標系と単位

- **座標系:** Three.js標準（Y-up、右手系）
- **単位:** mm（ミリメートル）を基準とし、Three.jsのシーン内では1単位=1mmとして扱う
- **スケール変換:** 必要に応じてシーン全体を0.001倍してメートル単位に変換

### 2.2 ユニット配置計算

#### 基本パラメータ
- **ユニット総数:** 51本
- **中央ユニット:** 26本目（インデックス25）
- **羽板幅:** 100mm
- **隙間:** 20mm
- **ピッチ:** 120mm（100mm + 20mm）

#### 配置計算式
```typescript
// ユニットインデックス i (0〜50) の X座標
const unitPositionX = (i - 25) * 120; // -3000mm 〜 +3000mm

// 例:
// i=0  (1本目):  X = -3000mm
// i=25 (26本目): X = 0mm
// i=50 (51本目): X = +3000mm
```

#### 各要素の座標
```typescript
// 羽板の位置
blade.position.set(unitPositionX, 1881, 0); // Y座標は高さの半分

// リボンの位置（羽板から2400mm離れた位置、Z軸方向）
ribbon.position.set(unitPositionX, ribbonHeight/2, -2400);

// ワイヤーのアンカー位置
wireAnchor.position.set(unitPositionX, 0, -2400); // 地面
wireTop.position.set(unitPositionX, 3762, 0);     // 羽板先端
```

### 2.3 ジオメトリ定義

#### 羽板（Blade）
```typescript
const bladeGeometry = new THREE.BoxGeometry(
  100,   // 幅
  3762,  // 高さ
  4,     // 厚さ
  1,     // widthSegments（シェーダーで変形しないので1）
  64,    // heightSegments（しなりの滑らかさ、重要！）
  1      // depthSegments
);
```

#### リボン（Ribbon）
```typescript
const ribbonGeometry = new THREE.PlaneGeometry(
  100,   // 幅
  3000,  // 高さ（適宜調整）
  1,     // widthSegments
  64     // heightSegments（ねじれの滑らかさ）
);
```

#### ワイヤー（Wire）
```typescript
// 動的に長さを変更するため、初期ジオメトリは基準長で作成
const wireGeometry = new THREE.CylinderGeometry(
  1,     // 上の半径
  1,     // 下の半径
  3000,  // 高さ（初期値）
  8      // radialSegments（円柱の分割数）
);
```

### 2.4 マテリアル定義

#### 羽板マテリアル
```typescript
const bladeMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uColor: { value: new THREE.Color(0xe5bb72) },
    uTime: { value: 0 },
    uBendAmount: { value: 0 }, // 0.0〜1.0
  },
  vertexShader: bladeVertexShader,
  fragmentShader: bladeFragmentShader,
  side: THREE.DoubleSide,
});
```

#### リボンマテリアル
```typescript
const ribbonMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uColor: { value: new THREE.Color(0xffffff) },
    uTwistAmount: { value: 0 }, // 0.0〜1.0
    uMaxTwistAngle: { value: Math.PI }, // 最大ねじれ角度（ラジアン）
  },
  vertexShader: ribbonVertexShader,
  fragmentShader: ribbonFragmentShader,
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.9,
});
```

#### ワイヤーマテリアル
```typescript
const wireMaterial = new THREE.MeshStandardMaterial({
  color: 0x888888,
  metalness: 0.8,
  roughness: 0.2,
});
```

---

## 3. アニメーション実装

### 3.1 スクロール進行度の取得

```typescript
// スクロール進行度 (0.0〜1.0)
const scrollProgress = window.scrollY / (document.body.scrollHeight - window.innerHeight);
```

### 3.2 しなりアニメーションの計算

#### サイン波伝播の実装

```typescript
/**
 * ユニットごとのしなり量を計算
 * @param unitIndex ユニットのインデックス (0〜50)
 * @param scrollProgress スクロール進行度 (0.0〜1.0)
 * @returns しなり量 (0.0〜1.0)
 */
function calculateBendAmount(unitIndex: number, scrollProgress: number): number {
  const centerIndex = 25; // 26本目のインデックス
  const totalUnits = 51;

  // スクロール進行度を2つのフェーズに分割
  if (scrollProgress <= 0.5) {
    // Phase 1: 変形 (0%→50%)
    const phase1Progress = scrollProgress * 2; // 0.0〜1.0に正規化

    // 中央からの距離
    const distanceFromCenter = Math.abs(unitIndex - centerIndex);

    // サイン波の位相（中央から離れるほど遅延）
    const wavePhase = phase1Progress - (distanceFromCenter * 0.05);

    // しなり量を計算（0.0〜1.0の範囲にクランプ）
    const bendAmount = Math.max(0, Math.min(1, Math.sin(wavePhase * Math.PI * 0.5)));

    return bendAmount;
  } else {
    // Phase 2: 復帰 (50%→100%)
    const phase2Progress = (scrollProgress - 0.5) * 2; // 0.0〜1.0に正規化

    // 51本目側からの距離
    const distanceFromEnd = 50 - unitIndex;

    // サイン波の位相（51本目側から伝播）
    const wavePhase = phase2Progress - (distanceFromEnd * 0.05);

    // しなり量を計算（1.0から0.0へ減少）
    const bendAmount = Math.max(0, Math.min(1, 1 - Math.sin(wavePhase * Math.PI * 0.5)));

    return bendAmount;
  }
}
```

### 3.3 Vertex Shader（羽板のしなり）

#### bladeVertex.glsl
```glsl
uniform float uHeight;
uniform float uMaxBendAngle;

attribute float aBendAmount; // 各インスタンスのしなり量（0.0〜1.0）

varying vec2 vUv;

void main() {
  vUv = uv;

  // 各インスタンスのしなり量を取得
  float bendAmount = clamp(aBendAmount, 0.0, 1.0);

  // Y座標を0.0〜1.0に正規化（下から上へ）
  float normalizedY = clamp((position.y + (uHeight * 0.5)) / uHeight, 0.0, 1.0);

  // しなり角度を計算（上に行くほど大きくなる）
  float bendAngle = uMaxBendAngle * bendAmount * normalizedY;

  float cosTheta = cos(bendAngle);
  float sinTheta = sin(bendAngle);

  // 変形を適用
  vec3 transformed = position;
  transformed.y = (normalizedY * uHeight) - (uHeight * 0.5);

  // Z軸方向へのオフセット（下側ほど大きい）
  float offset = (1.0 - normalizedY) * uHeight * 0.1;
  transformed.z += sinTheta * offset;

  // Y軸方向の変形（しなりによる高さの変化）
  transformed.y = cosTheta * transformed.y;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
}
```

**実装のポイント：**
- `attribute float aBendAmount` を使用して、各ユニットごとに異なるしなり量を受け取る
- `normalizedY` を掛けることで、上に行くほどしなりが大きくなる
- `offset` の係数 `0.1` で曲がり具合を調整可能（大きいほど曲がる）
- 数学的に完全な円弧ではなく、視覚的に自然なしなり表現を実現

### 3.4 Vertex Shader（リボンのねじれ）

#### ribbonVertex.glsl
```glsl
uniform float uTwistAmount;    // 0.0〜1.0
uniform float uMaxTwistAngle;  // 最大ねじれ角度（ラジアン）

void main() {
  vec3 pos = position;

  // Y座標を0.0〜1.0に正規化
  float normalizedY = (position.y + 1500.0) / 3000.0;

  // ねじれ角度を計算（下が最大、上が最小）
  float twistAngle = uMaxTwistAngle * uTwistAmount * (1.0 - normalizedY);

  // Y軸周りの回転行列を適用
  float cosTheta = cos(twistAngle);
  float sinTheta = sin(twistAngle);

  float newX = pos.x * cosTheta - pos.z * sinTheta;
  float newZ = pos.x * sinTheta + pos.z * cosTheta;

  pos.x = newX;
  pos.z = newZ;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

### 3.5 ワイヤーの動的更新（実装版）

#### 羽板上の接続点の計算

ワイヤーは羽板の先端ではなく、**円弧の接線**が地面アンカーを向く位置に接続されます。

```typescript
/**
 * 羽板の円弧上の任意の点を計算
 * @param bendAmount しなり量 (0.0〜1.0)
 * @param normalizedY 羽板の高さ方向の正規化座標 (0.0〜1.0)
 * @returns 羽板上の座標（mm単位）
 */
const computeBladePointMM = (bendAmount: number, normalizedY: number): Vector3 => {
  const { height, maxBendAngle } = ANIMATION_CONFIG.blade;
  const theta = maxBendAngle * clamp01(bendAmount);

  if (theta <= 1e-4) {
    // しなりがない場合：直線
    return new Vector3(0, height * normalizedY, 0);
  }

  // 円弧の計算
  const radius = height / theta;
  const angle = theta * normalizedY;
  const y = radius * Math.sin(angle);
  const z = radius * (1.0 - Math.cos(angle));
  return new Vector3(0, y, z);
};

/**
 * ワイヤーの接続点を計算（円弧の接線がアンカーを向く位置）
 * @param bendAmount しなり量 (0.0〜1.0)
 * @returns 接続点の座標と、先端に接続されているかどうか
 */
const computeWireAttachmentPointMM = (bendAmount: number): {
  point: Vector3;
  attachesAtTip: boolean;
} => {
  const { height, maxBendAngle } = ANIMATION_CONFIG.blade;
  const { anchorDistance } = ANIMATION_CONFIG.wire;
  const theta = maxBendAngle * clamp01(bendAmount);

  if (theta <= 1e-4) {
    // しなりがない場合：先端に接続
    return { point: computeBladePointMM(0, 1), attachesAtTip: true };
  }

  const radius = height / theta;

  // 円弧の中心から地面アンカーまでの距離
  const centerToAnchor = radius + anchorDistance;

  // 接線の角度を計算
  const cosAlpha = radius / centerToAnchor;
  const clampedCos = Math.min(Math.max(cosAlpha, -1), 1);
  const alpha = Math.acos(clampedCos);

  // 円弧の範囲内に収める
  const limitedAlpha = Math.min(alpha, theta);
  const attachesAtTip = Math.abs(limitedAlpha - theta) < 1e-4;

  // 接続点の正規化座標を計算
  const normalizedY = theta > 1e-4 ? limitedAlpha / theta : 1;

  return {
    point: computeBladePointMM(bendAmount, normalizedY),
    attachesAtTip,
  };
};
```

#### ワイヤーのメッシュ更新

```typescript
useFrame(() => {
  const mesh = meshRef.current;
  if (!mesh) return;

  const bendAmount = bendAmountRef.current;
  const { point } = computeWireAttachmentPointMM(bendAmount);

  // アンカー位置と接続点の座標をシーン単位に変換
  const anchorScene = new Vector3(0, 0, -toSceneUnits(anchorDistance));
  const attachmentScene = new Vector3(
    0,
    toSceneUnits(point.y),
    toSceneUnits(point.z)
  );

  // ワイヤーの方向ベクトル
  const direction = attachmentScene.clone().sub(anchorScene);
  const length = direction.length();

  if (length <= 1e-6) {
    mesh.visible = false;
    return;
  }

  mesh.visible = true;

  // ワイヤーの中心位置
  const center = anchorScene.clone().add(attachmentScene).multiplyScalar(0.5);

  // Y軸を向いているCylinderGeometryを方向ベクトルに合わせる
  const quaternion = new Quaternion();
  const up = new Vector3(0, 1, 0);
  quaternion.setFromUnitVectors(up, direction.normalize());

  // メッシュの変換を更新
  mesh.position.copy(center);
  mesh.quaternion.copy(quaternion);
  mesh.scale.set(
    toSceneUnits(wireThickness),  // X方向のスケール
    length,                        // Y方向（長さ）
    toSceneUnits(wireThickness)   // Z方向のスケール
  );
});
```

**実装のポイント：**
- 円弧の接線計算により、ワイヤーが自然に接続される
- しなり量に応じて接続点が動的に変化
- 円弧の範囲外になる場合は先端に接続される
- 数学的に正確な接続位置の計算

**参考実装：**
[src/components/BladeDebugScene.tsx](../src/components/BladeDebugScene.tsx#L37-L77) の `computeBladePointMM` と `computeWireAttachmentPointMM` 関数

### 3.6 カメラワークの実装

```typescript
/**
 * カメラ位置を計算
 * @param scrollProgress スクロール進行度 (0.0〜1.0)
 * @returns カメラ位置
 */
function calculateCameraPosition(scrollProgress: number): THREE.Vector3 {
  const target = new THREE.Vector3(0, 1881, 0); // 構造体の中心
  const distance = 8000; // カメラの距離

  // 方位角を計算（45度→225度→45度と円弧状に移動）
  let azimuth: number;
  if (scrollProgress <= 0.5) {
    // 0%→50%: 45度→225度
    azimuth = THREE.MathUtils.lerp(45, 225, scrollProgress * 2);
  } else {
    // 50%→100%: 225度→45度
    azimuth = THREE.MathUtils.lerp(225, 45, (scrollProgress - 0.5) * 2);
  }

  // 仰角（固定）
  const elevation = 30;

  // 球面座標から直交座標へ変換
  const azimuthRad = THREE.MathUtils.degToRad(azimuth);
  const elevationRad = THREE.MathUtils.degToRad(elevation);

  const x = target.x + distance * Math.cos(elevationRad) * Math.cos(azimuthRad);
  const y = target.y + distance * Math.sin(elevationRad);
  const z = target.z + distance * Math.cos(elevationRad) * Math.sin(azimuthRad);

  return new THREE.Vector3(x, y, z);
}
```

---

## 4. パフォーマンス最適化

### 4.1 InstancedMesh の使用

- 51本のユニットをそれぞれ個別のMeshではなく、InstancedMeshで一括描画
- ドローコールを大幅に削減（51回→3回：羽板・リボン・ワイヤー）

### 4.2 カスタムシェーダーの最適化

- Vertex Shaderでの頂点変形により、CPUでの計算を最小化
- Uniform変数の更新は毎フレーム行うが、計算はGPU側で実行

### 4.3 レベル・オブ・ディテール（LOD）

- スマートフォンでは、ジオメトリのセグメント数を削減
  - 羽板: heightSegments 64 → 32
  - リボン: heightSegments 64 → 32
  - ワイヤー: radialSegments 8 → 6

### 4.4 レンダリング最適化

```typescript
// アンチエイリアシングの条件付き有効化
const pixelRatio = Math.min(window.devicePixelRatio, 2); // 最大2まで

// Canvas設定
<Canvas
  gl={{
    antialias: true,
    pixelRatio: pixelRatio,
    powerPreference: 'high-performance',
  }}
  shadows
/>
```

---

## 5. レスポンシブ対応

### 5.1 カメラの自動調整

```typescript
function adjustCameraForViewport(camera: THREE.PerspectiveCamera) {
  const aspect = window.innerWidth / window.innerHeight;
  camera.aspect = aspect;

  // 縦長の画面（スマートフォン）ではカメラを引く
  if (aspect < 1) {
    camera.fov = 75;
  } else {
    camera.fov = 50;
  }

  camera.updateProjectionMatrix();
}
```

### 5.2 タッチ操作の最適化

- スムーススクロールライブラリ（Lenis）を使用
- スクロール慣性の調整

---

## 6. ライティングとシャドウ設定

### 6.1 基本ライティング

```typescript
// 環境光
<ambientLight intensity={0.35} />

// メインライト（DirectionalLight）
<directionalLight
  position={[3, 5, 2]}
  intensity={1.4}
  castShadow
  shadow-mapSize-width={1024}
  shadow-mapSize-height={1024}
  shadow-camera-left={-5}
  shadow-camera-right={5}
  shadow-camera-top={5}
  shadow-camera-bottom={-5}
  shadow-camera-near={0.1}
  shadow-camera-far={10}
/>
```

### 6.2 カスタムシャドウマテリアル

**重要**: カスタム頂点シェーダーを使用する場合、影も変形に連動させるため、`MeshDepthMaterial`をカスタマイズする必要があります。

```typescript
const depthMaterial = useMemo(() => {
  const mat = new MeshDepthMaterial({
    side: DoubleSide,
    depthPacking: RGBADepthPacking  // 高精度エンコーディング（必須）
  });

  mat.onBeforeCompile = (shader) => {
    // uniformをメインマテリアルと共有
    shader.uniforms.uHeight = sharedUniforms.uHeight;
    shader.uniforms.uBendAmount = sharedUniforms.uBendAmount;
    shader.uniforms.uMaxBendAngle = sharedUniforms.uMaxBendAngle;

    // uniform宣言を追加
    shader.vertexShader = shader.vertexShader.replace(
      /#include\s*<common>/,
      `#include <common>
uniform float uHeight;
uniform float uBendAmount;
uniform float uMaxBendAngle;`,
    );

    // 変形ロジックを #include <project_vertex> の直前に注入
    shader.vertexShader = shader.vertexShader.replace(
      /#include\s*<project_vertex>/,
      `${bendBlock}
#include <project_vertex>`,
    );
  };

  return mat;
}, [applyBendToShader]);

// メッシュに適用
mesh.customDepthMaterial = depthMaterial;
mesh.customDistanceMaterial = distanceMaterial;
```

**重要なポイント:**
1. **depthPacking: RGBADepthPacking** - カスタム頂点変形には高精度エンコーディングが必須
2. **#include <project_vertex> 直前に注入** - `transformed`が上書きされる前に変形を適用
3. **Object.assignで参照共有** - メインマテリアルのuniform更新が自動的に影に反映

詳細は [docs/shadow-issue.md](shadow-issue.md) を参照してください。

### 6.3 シャドウカメラの最適化

影の解像度を向上させるため、シャドウカメラの範囲をシーンに合わせて最適化します。

```typescript
// デバッグ用ヘルパー（開発時のみ）
const SHOW_SHADOW_CAMERA_HELPER = true;

const ShadowCameraHelper = ({ lightRef }) => {
  const { scene } = useThree();
  const helperRef = useRef(null);

  useEffect(() => {
    if (!SHOW_SHADOW_CAMERA_HELPER) return;

    const light = lightRef.current;
    if (!light) return;

    const helper = new CameraHelper(light.shadow.camera);
    helperRef.current = helper;
    scene.add(helper);

    return () => {
      scene.remove(helper);
      helper.dispose();
    };
  }, [scene, lightRef]);

  useFrame(() => {
    if (helperRef.current) {
      helperRef.current.update();
    }
  });

  return null;
};
```

**最適化の考え方:**
- シャドウマップのサイズ（例: 1024x1024）は固定
- シャドウカメラの範囲を狭めることで、同じピクセル数でより高密度な影を実現
- 例: 範囲10x10の場合、ピクセル密度 = 1024/10 = 102.4 px/unit

---

## 7. テスト戦略

### 7.1 プロトタイプ検証項目

- [ ] 1本の羽板がスクロールに連動してしなる
- [ ] リボンがねじれる
- [ ] ワイヤーが羽板の先端に追従する
- [ ] カスタムシェーダーが正しく動作する
- [ ] パフォーマンスが許容範囲内（60fps目標）

### 7.2 51本展開後の検証項目

- [ ] サイン波伝播が正しく動作する
- [ ] カメラワークがスムーズに動作する
- [ ] パフォーマンスが目標値を達成（PC: 60fps、SP: 30fps）
- [ ] レスポンシブ対応が正しく機能する

### 7.3 ブラウザ互換性テスト

- [ ] Chrome（最新版）
- [ ] Firefox（最新版）
- [ ] Safari（最新版、iOS含む）
- [ ] Edge（最新版）

---

## 8. 実装の優先順位

### Phase 1: プロトタイプ（1本）
1. Next.js プロジェクトのセットアップ
2. R3F の基本シーンの構築
3. 1本の羽板・リボン・ワイヤーの配置
4. カスタムシェーダーの実装（しなり・ねじれ）
5. スクロール連動の基本実装
6. ワイヤーの動的更新（ロジックA）

### Phase 2: 51本への拡張
1. InstancedMesh への移行
2. サイン波伝播アニメーションの実装
3. カメラワークの実装
4. ライティングの調整

### Phase 3: 最適化・仕上げ
1. パフォーマンスチューニング
2. レスポンシブ対応の実装
3. アニメーションパラメータの微調整
4. ブラウザ互換性テスト
