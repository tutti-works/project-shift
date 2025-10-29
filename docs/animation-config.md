# ⚙️ アニメーション設定詳細

このドキュメントは、実装時に使用するアニメーションパラメータの初期値と、調整可能な項目をまとめたものです。

---

## 1. アニメーション設定ファイルの構造

実装時は、以下のような設定ファイル（`src/config/animation.ts`）として定義します。

```typescript
export const ANIMATION_CONFIG = {
  // ユニット配置
  units: {
    total: 51,
    centerIndex: 25, // 26本目
    pitch: 120, // mm
  },

  // 羽板
  blade: {
    width: 100, // mm
    height: 3762, // mm
    thickness: 4, // mm
    color: '#e5bb72',
    heightSegments: 64, // しなりの滑らかさ
    maxBendAngle: Math.PI / 2, // 4分の1円弧 = 90度
  },

  // リボン
  ribbon: {
    width: 100, // mm
    height: 3000, // mm（適宜調整）
    thickness: 2, // mm
    color: '#ffffff',
    opacity: 0.9,
    heightSegments: 64, // ねじれの滑らかさ
    maxTwistAngle: Math.PI, // 最大ねじれ角度（ラジアン）= 180度
    anchorDistance: 2400, // mm（羽板中心からアンカーまでの水平距離）
  },

  // ワイヤー
  wire: {
    diameter: 2, // mm
    color: '#888888',
    metalness: 0.8,
    roughness: 0.2,
    radialSegments: 8, // 円柱の分割数
    anchorDistance: 2400, // mm
  },

  // サイン波伝播アニメーション
  wave: {
    // Phase 1: 変形（0%→50%）
    phase1: {
      startFromCenter: true, // 中央（26本目）から開始
      propagationSpeed: 0.05, // 伝播速度（値が大きいほど遅延が大きい）
      easing: 'easeInOutSine', // イージング関数
    },

    // Phase 2: 復帰（50%→100%）
    phase2: {
      startFromEnd: true, // 51本目から開始
      propagationSpeed: 0.05,
      easing: 'easeInOutSine',
    },
  },

  // カメラワーク
  camera: {
    target: {
      x: 0,
      y: 1881, // 構造体の高さの半分
      z: 0,
    },
    distance: 8000, // mm
    fov: {
      desktop: 50, // 度
      mobile: 75, // 度
    },
    positionA: {
      azimuth: 45, // 方位角（度）
      elevation: 30, // 仰角（度）
    },
    positionB: {
      azimuth: 225, // 方位角（度）
      elevation: 30, // 仰角（度）
    },
    transitionEasing: 'easeInOutCubic', // カメラ移動のイージング
  },

  // ライティング
  lighting: {
    ambient: {
      intensity: 0.4,
    },
    mainLight: {
      position: [5000, 8000, 3000],
      intensity: 1.2,
      castShadow: true,
      shadowMapSize: 2048,
    },
    fillLight: {
      position: [-3000, 4000, -2000],
      intensity: 0.5,
    },
  },

  // パフォーマンス設定
  performance: {
    targetFPS: {
      desktop: 60,
      mobile: 30,
    },
    pixelRatio: {
      max: 2, // デバイスピクセル比の上限
    },
    lod: {
      // スマートフォン向けのセグメント数削減
      mobile: {
        bladeHeightSegments: 32,
        ribbonHeightSegments: 32,
        wireRadialSegments: 6,
      },
    },
  },

  // スクロール設定
  scroll: {
    smooth: true, // スムーススクロールを有効化
    lerp: 0.05, // スクロールの補間速度（Lenis）
    multiplier: 1.0, // スクロール速度倍率
  },
};
```

---

## 2. 調整可能なパラメータの詳細

### 2.1 しなりの調整

| パラメータ | 説明 | 初期値 | 調整の影響 |
|-----------|------|--------|-----------|
| `blade.maxBendAngle` | 最大しなり角度 | π/2 (90度) | 大きいほど大きくしなる |
| `blade.heightSegments` | 羽板の縦分割数 | 64 | 大きいほど滑らかだが重くなる |
| `wave.phase1.propagationSpeed` | サイン波伝播速度 | 0.05 | 大きいほど遅延が大きい（遅く伝わる） |

#### 調整例
```typescript
// しなりをより大きくする
blade.maxBendAngle = Math.PI * 0.6; // 108度

// サイン波をゆっくり伝播させる
wave.phase1.propagationSpeed = 0.08;
```

### 2.2 リボンのねじれの調整

| パラメータ | 説明 | 初期値 | 調整の影響 |
|-----------|------|--------|-----------|
| `ribbon.maxTwistAngle` | 最大ねじれ角度 | π (180度) | 大きいほど激しくねじれる |
| `ribbon.heightSegments` | リボンの縦分割数 | 64 | 大きいほど滑らかだが重くなる |
| `ribbon.opacity` | リボンの不透明度 | 0.9 | 小さいほど透明になる |

#### 調整例
```typescript
// ねじれを控えめにする
ribbon.maxTwistAngle = Math.PI * 0.75; // 135度

// リボンをより透明にする
ribbon.opacity = 0.7;
```

### 2.3 カメラワークの調整

| パラメータ | 説明 | 初期値 | 調整の影響 |
|-----------|------|--------|-----------|
| `camera.distance` | カメラの距離 | 8000mm | 大きいほど引きの絵になる |
| `camera.positionA.azimuth` | 位置Aの方位角 | 45度 | カメラの水平方向の角度 |
| `camera.positionA.elevation` | 位置Aの仰角 | 30度 | カメラの上下方向の角度 |
| `camera.positionB.azimuth` | 位置Bの方位角 | 225度 | 背面側の角度 |

#### 調整例
```typescript
// カメラをもっと引く
camera.distance = 10000;

// カメラをより低い位置から見上げる
camera.positionA.elevation = 15; // 度
```

### 2.4 ライティングの調整

| パラメータ | 説明 | 初期値 | 調整の影響 |
|-----------|------|--------|-----------|
| `lighting.ambient.intensity` | 環境光の強度 | 0.4 | 全体の明るさ |
| `lighting.mainLight.intensity` | メインライトの強度 | 1.2 | 明暗のコントラスト |
| `lighting.fillLight.intensity` | フィルライトの強度 | 0.5 | 影の柔らかさ |

#### 調整例
```typescript
// 全体的に明るくする
lighting.ambient.intensity = 0.6;

// 影を強調する
lighting.mainLight.intensity = 1.5;
lighting.fillLight.intensity = 0.3;
```

---

## 3. イージング関数

アニメーションのイージング（加速・減速）を調整できます。

### 使用可能なイージング関数
- `linear`: 等速
- `easeInSine`: ゆっくり始まる
- `easeOutSine`: ゆっくり終わる
- `easeInOutSine`: ゆっくり始まり、ゆっくり終わる
- `easeInQuad`: より急に始まる
- `easeOutQuad`: より急に終わる
- `easeInOutCubic`: 滑らかな加減速（推奨）
- `easeInOutQuart`: 強めの加減速

### 実装例
```typescript
// イージング関数の実装
const easing = {
  linear: (t: number) => t,
  easeInSine: (t: number) => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine: (t: number) => Math.sin((t * Math.PI) / 2),
  easeInOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
};
```

---

## 4. レスポンシブ設定

デバイスごとの設定を調整できます。

### デバイス判定
```typescript
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const isLowPerformance = isMobile || (window.devicePixelRatio < 1.5);
```

### 設定の切り替え
```typescript
const segments = isMobile
  ? ANIMATION_CONFIG.performance.lod.mobile.bladeHeightSegments
  : ANIMATION_CONFIG.blade.heightSegments;
```

---

## 5. デバッグ用パラメータ

開発中に便利なデバッグ用の設定です。

```typescript
export const DEBUG_CONFIG = {
  // ヘルパー表示
  showAxesHelper: true, // 座標軸を表示
  showGridHelper: true, // グリッドを表示
  showStats: true, // FPSカウンターを表示

  // アニメーション速度調整
  animationSpeed: 1.0, // 1.0が通常速度、2.0で2倍速

  // 単一ユニットのテスト
  singleUnitMode: false, // trueで1本のみ表示
  singleUnitIndex: 25, // 表示するユニットのインデックス

  // スクロール位置の固定
  fixedScrollProgress: null, // 0.0〜1.0の値を指定すると、その位置で固定
};
```

---

## 6. 実装時の注意事項

### 6.1 単位の統一
- すべての距離・長さは **mm（ミリメートル）** で定義
- Three.jsのシーン内では 1単位 = 1mm として扱う
- 必要に応じてシーン全体を0.001倍してメートル単位に変換

### 6.2 パフォーマンスとの兼ね合い
- `heightSegments` や `radialSegments` を増やすと滑らかになるが、パフォーマンスが低下
- 目標FPSを達成できない場合は、セグメント数を減らす

### 6.3 ブラウザ互換性
- WebGL 2.0 が必須
- 古いブラウザでは動作しない可能性があるため、フォールバック表示を検討

---

## 7. 設定の読み込みと使用例

```typescript
// src/config/animation.ts
export const ANIMATION_CONFIG = { /* ... */ };

// src/components/BladeInstances.tsx
import { ANIMATION_CONFIG } from '@/config/animation';

const bladeGeometry = new THREE.BoxGeometry(
  ANIMATION_CONFIG.blade.width,
  ANIMATION_CONFIG.blade.height,
  ANIMATION_CONFIG.blade.thickness,
  1,
  ANIMATION_CONFIG.blade.heightSegments,
  1
);

const bladeMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uColor: { value: new THREE.Color(ANIMATION_CONFIG.blade.color) },
    uMaxBendAngle: { value: ANIMATION_CONFIG.blade.maxBendAngle },
    // ...
  },
  // ...
});
```

---

## 8. パラメータ調整のワークフロー

実装完了後、以下の手順でパラメータを調整します：

1. **プロトタイプで基本動作を確認**
   - 1本のユニットで、しなり・ねじれ・ワイヤーが正しく動作するか確認

2. **アニメーション速度の調整**
   - `wave.propagationSpeed` を変更して、サイン波の伝播速度を調整

3. **カメラワークの調整**
   - `camera.distance`, `azimuth`, `elevation` を変更して、最適な視点を探す

4. **ライティングの調整**
   - `lighting.*` のパラメータを変更して、雰囲気を作る

5. **パフォーマンスチューニング**
   - FPSが目標に達しない場合、セグメント数やシャドウ設定を調整

6. **最終調整**
   - 実際のデバイスでテストし、微調整を繰り返す

---

## 9. 参考資料

### サイン波の計算式
```
bendAmount = sin(phase * π/2)

where:
  phase = scrollProgress - (distanceFromCenter * propagationSpeed)
  phase ∈ [0, 1]
  bendAmount ∈ [0, 1]
```

### しなりの変形計算式（実装版）
```glsl
// Y座標の正規化（0.0〜1.0）
normalizedY = (position.y + (height * 0.5)) / height

// しなり角度（上に行くほど大きくなる）
bendAngle = maxBendAngle * bendAmount * normalizedY

// Z軸方向のオフセット（下側ほど大きい）
offset = (1.0 - normalizedY) * height * 0.1

// 変形後の座標
transformed.z += sin(bendAngle) * offset
transformed.y = cos(bendAngle) * transformed.y

where:
  bendAmount ∈ [0, 1] (各ユニットのしなり量)
  normalizedY ∈ [0, 1] (下が0、上が1)
  maxBendAngle = π/2 (90度)
  係数 0.1 で曲がり具合を調整可能
```

**特徴：**
- 数学的に完全な円弧ではなく、視覚的に自然なしなりを表現
- `offset` の係数 `0.1` を変更することで曲がり具合を調整可能
- パフォーマンスが良く、調整しやすい実装

### ねじれの計算式
```
twistAngle = maxTwistAngle * twistAmount * (1 - normalizedY)

where:
  twistAmount ∈ [0, 1] (しなり量に連動)
  normalizedY ∈ [0, 1] (下が0、上が1)
```

---

このドキュメントをもとに、実装時には `src/config/animation.ts` ファイルを作成し、すべてのパラメータを集約管理してください。
