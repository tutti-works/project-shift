# SHIFT - インタラクティブWebインスタレーション

浅川竜成氏の修士制作「SHIFT」をWeb上でインタラクティブに体験できる3Dコンテンツです。
物理的な彫刻作品を、スクロール駆動の3Dナラティブとして、React Three Fiber、カスタムシェーダー、Lenisを使用して実装しています。

## 📋 ドキュメント

- [要件定義書](docs/requirements.md) - プロジェクトの概要と機能要件
- [技術仕様書](docs/technical-specification.md) - 実装の詳細設計
- [アニメーション設定](docs/animation-config.md) - パラメータの調整方法
- [カスタムシャドウ実装](docs/shadow-issue.md) - 影の変形連動実装とデバッグ記録
- [リボン実装計画](docs/ribbon-implementation.md) - リボンのねじれ表現とデバッグモード

## 🛠 技術スタック

- **Next.js 14** (App Router) + TypeScript
- **React Three Fiber** - Three.jsのReactラッパー
- **@react-three/drei** - R3Fユーティリティライブラリ
- **Three.js 0.170** - WebGL 3Dライブラリ
- **カスタムGLSLシェーダー** - 羽板のしなり・リボンのねじれ実装
- **Lenis** - スムーススクロールとスクロール進行度の追跡
- **Tailwind CSS v4** - スタイリング
- **Zustand** - スクロール状態管理

## 📁 プロジェクト構造

```
src/
├── app/              # Next.jsエントリーポイント
│   ├── page.tsx      # メインページ
│   └── layout.tsx    # ルートレイアウト
├── components/       # 3Dコンポーネント
│   ├── Scene.tsx              # R3F Canvasラッパー
│   ├── ShiftStructure.tsx     # メイン構造体
│   ├── BladeInstances.tsx     # 羽板（InstancedMesh）
│   ├── RibbonInstances.tsx    # リボン（InstancedMesh）
│   ├── WireInstances.tsx      # ワイヤー（InstancedMesh）
│   ├── CameraController.tsx   # カメラ制御
│   └── ScrollController.tsx   # スクロール制御
├── config/           # 設定ファイル
│   └── animation.ts  # アニメーションパラメータ（唯一の設定源）
├── shaders/          # GLSLシェーダー
│   ├── bladeVertex.glsl      # 羽板 Vertex Shader
│   ├── bladeFragment.glsl    # 羽板 Fragment Shader
│   ├── ribbonVertex.glsl     # リボン Vertex Shader
│   └── ribbonFragment.glsl   # リボン Fragment Shader
├── store/            # グローバル状態
│   └── scrollStore.ts        # スクロール状態管理
├── types/            # TypeScript型定義
│   └── animation.ts          # アニメーション設定の型
└── utils/            # ユーティリティ関数
    ├── animationHelpers.ts   # アニメーション計算
    └── geometryHelpers.ts    # ジオメトリ生成
```

## 🚀 セットアップ

### 必要環境

- Node.js 20以上
- npm または yarn

### インストール

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。
スクロールすると、カメラパスとアニメーションが連動します。

### その他のコマンド

```bash
# 本番ビルド
npm run build

# 本番サーバーの起動
npm start

# ESLintによるコードチェック
npm run lint
```

## 📊 実装状況

### ✅ 完了済み

- [x] Next.jsプロジェクトのセットアップ
- [x] R3Fの基本シーン構築
- [x] アニメーション設定ファイル（`src/config/animation.ts`）
- [x] ユーティリティ関数（座標変換、ジオメトリ生成）
- [x] スクロール状態管理（Zustand）
- [x] スクロールコントローラー（Lenis統合）
- [x] カメラコントローラー（円弧軌道移動）
- [x] 羽板のInstancedMesh実装
- [x] リボンのInstancedMesh実装
- [x] ワイヤーのInstancedMesh実装
- [x] 羽板用カスタムシェーダー（しなり表現）
- [x] リボン用カスタムシェーダー（ねじれ表現）
- [x] ライティング設定
- [x] **カスタムシャドウマテリアル実装（影の変形連動）**
- [x] **シャドウカメラヘルパー実装（デバッグ・最適化用）**
- [x] レスポンシブ対応の基本実装

### ✅ 最近完了した項目

#### 1. **リボンのデバッグモード実装** ✅ **完了**
   - **実装内容**:
     - グラデーション状のねじれ（根本で最大、先端で0） ✅
     - GUIによるインタラクティブ制御（基準角度・最大角度） ✅
     - スクロール連動と影の同期 ✅
     - カスタムDepth/DistanceMaterialによる影の変形連動 ✅
   - **調整可能なパラメータ（デバッグGUI）**:
     - Ribbon Twist (deg, rest): リボンの静止時ねじれ角度（-180〜180度）
     - Ribbon Twist (deg, max): リボンの最大曲げ時ねじれ角度（-180〜360度）
   - **ファイル**: [src/components/BladeDebugScene.tsx](src/components/BladeDebugScene.tsx)
   - **参考**: [docs/ribbon-implementation.md](docs/ribbon-implementation.md) | [docs/shadow-issue.md](docs/shadow-issue.md)

### 🔄 進行中・調整が必要な項目

#### 2. **シェーダーロジックの拡張**
   - **現状**: 羽板のしなりが全ユニット一律で動作（中央の26本目の値を使用）
   - **必要な実装**: 各ユニットごとにしなり量を計算してシェーダーに渡す
   - **ファイル**: [src/components/BladeInstances.tsx](src/components/BladeInstances.tsx)
   - **詳細**:
     - 現在は `getBendAmount(scrollProgress, centerIndex)` で中央のみ計算
     - 51本すべての `bendAmount` を計算し、InstancedMesh の attribute として渡す必要あり

#### 3. **サイン波伝播アニメーション**
   - **現状**: 基本的な計算関数は実装済み（`src/utils/animationHelpers.ts`）
   - **必要な実装**:
     - 各ユニットの `bendAmount` を個別に計算
     - Phase 1（0%→50%）とPhase 2（50%→100%）の伝播ロジック
     - InstancedMesh の各インスタンスに値を適用
   - **参考**: [docs/technical-specification.md](docs/technical-specification.md#32-しなりアニメーションの計算)

#### 3. **リボンのねじれ連動**
   - **現状**: リボンシェーダーは実装済み
   - **必要な実装**:
     - リボンのねじれ量を羽板のしなり量に連動させる
     - 各ユニットごとに `twistAmount` を計算
   - **ファイル**: [src/components/RibbonInstances.tsx](src/components/RibbonInstances.tsx)

#### 4. **ワイヤーの動的更新（ロジックA）**
   - **現状**: ワイヤーの基本配置は完了
   - **必要な実装**:
     - 羽板の先端位置を計算（しなり後の座標）
     - 地面アンカーと羽板先端を結ぶように、各ワイヤーの位置・回転・スケールを更新
   - **ファイル**: [src/components/WireInstances.tsx](src/components/WireInstances.tsx)
   - **参考**: [docs/technical-specification.md](docs/technical-specification.md#35-ワイヤーの動的更新ロジックa)

#### 5. **パフォーマンス計測と最適化**
   - **必要な実装**:
     - FPSカウンターの追加（開発用）
     - デスクトップ: 60fps、モバイル: 30fps の目標達成
     - 必要に応じてセグメント数の調整（LOD）
   - **参考**: [docs/animation-config.md](docs/animation-config.md#5-デバッグ用パラメータ)

#### 6. **モバイル対応の調整**
   - **必要な実装**:
     - デバイス判定（モバイル/デスクトップ）
     - モバイルでのセグメント数削減
     - カメラFOVの自動調整（実装済みだが未テスト）
   - **ファイル**: [src/components/Scene.tsx](src/components/Scene.tsx)

## 🎯 次のステップ（優先順位順）

### Phase 1: サイン波伝播の完全実装

1. **各ユニットのしなり量を個別計算**
   ```typescript
   // BladeInstances.tsx 内で実装
   const bendAmounts = positions.map((_, index) =>
     getBendAmount(scrollProgress, index)
   );
   ```

2. **InstancedMesh の attribute として渡す**
   - Three.js の `InstancedBufferAttribute` を使用
   - 各フレームで bendAmount を更新

3. **シェーダー側で attribute を受け取る**
   - `bladeVertex.glsl` を修正
   - `attribute float aBendAmount;` を追加

### Phase 2: リボン・ワイヤーの連動

4. **リボンのねじれを羽板に連動**
   - リボンの `twistAmount` を羽板の `bendAmount` と同期

5. **ワイヤーの動的更新（ロジックA）**
   - 羽板の先端座標を計算
   - ワイヤーの Matrix を毎フレーム更新

### Phase 3: 調整と最適化

6. **パラメータの微調整**
   - `src/config/animation.ts` の値を調整
   - サイン波の伝播速度、しなりの大きさなど

7. **パフォーマンスチューニング**
   - FPS計測
   - 必要に応じてセグメント数を削減

8. **モバイルテスト**
   - 実機でのテスト
   - レスポンシブ対応の最終調整

## 🔧 開発のヒント

### アニメーションパラメータの調整

すべてのパラメータは [src/config/animation.ts](src/config/animation.ts) に集約されています。
詳細な調整方法は [docs/animation-config.md](docs/animation-config.md) を参照してください。

### デバッグ

開発中は以下のヘルパーを追加すると便利です：

```tsx
// Scene.tsx に追加
import { OrbitControls, Stats } from '@react-three/drei';

<Stats />
<OrbitControls target={cameraTarget} />
```

### シェーダーのホットリロード

GLSLファイルを編集したら、ブラウザをリロードしてください。
Next.jsのHot Reloadはシェーダーファイルに対応していません。

## 📝 コーディング規約

- **単位**: すべての距離・長さはmm（ミリメートル）で定義
- **座標系**: Three.js標準（Y-up、右手系）
- **変換**: `toSceneUnits()` を使用してmmからシーン単位（メートル）に変換
- **型定義**: すべてのコンポーネントと関数に適切な型を付ける
- **コメント**: 複雑なロジックには日本語コメントを追加

## 🐛 トラブルシューティング

### シェーダーが動作しない

- ブラウザの開発者ツールでWebGLエラーを確認
- GLSLシンタックスエラーがないか確認
- uniform変数が正しく渡されているか確認

### パフォーマンスが悪い

- セグメント数を減らす（`config/animation.ts` の `heightSegments`）
- シャドウマップのサイズを削減（1024→512）
- シャドウカメラの範囲を最適化
- PixelRatioを1に固定

### スクロールが動作しない

- Lenisが正しく初期化されているか確認（`ScrollController.tsx`）
- `scrollStore` の値が更新されているか確認

## 📄 ライセンス

このプロジェクトは浅川竜成氏の修士制作「SHIFT」のWeb実装です。

## 🙏 謝辞

- 原作: 浅川竜成氏
- 技術協力: Claude Code

---

## 🎨 技術的ハイライト

### カスタムシャドウの実装

Three.jsのカスタム頂点シェーダーを使用する際、影を変形に連動させるのは困難な課題でした。この実装では以下の技術的な解決策を採用しています:

- **RGBADepthPacking**: 高精度な深度エンコーディング（24ビット精度）
- **#include <project_vertex> 直前への注入**: Three.jsのシェーダーチャンクシステムの理解
- **Uniform参照共有**: `Object.assign`によるメインマテリアルとシャドウマテリアルの同期
- **シャドウカメラヘルパー**: デバッグと最適化のための可視化ツール

詳細なデバッグプロセスと実装については [docs/shadow-issue.md](docs/shadow-issue.md) を参照してください。

---

**開発状況**: Phase 1 完了（1本のユニットのデバッグモード実装完了）| Phase 2 準備中（51本への拡張）
**最終更新**: 2025年10月30日
