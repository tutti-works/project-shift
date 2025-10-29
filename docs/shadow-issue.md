# 🔧 カスタムシャドウの問題と解決プロセス

## 📋 問題の概要

### 現象
- **メインオブジェクト（羽板）**: カスタムVertex Shaderによる変形が正常に動作
- **影**: カスタムシャドウマテリアルを有効化すると**影が表示されない**
- **エラー**: コンソールにエラーやWarningは出ていない

### 環境
- React Three Fiber 8.17.10
- Three.js 0.170.0
- TypeScript
- カスタムGLSLシェーダー

### 対象ファイル
- [src/components/BladeDebugScene.tsx](../src/components/BladeDebugScene.tsx)
- [src/shaders/bladeDebugVertex.glsl](../src/shaders/bladeDebugVertex.glsl)

---

## 🔍 根本原因（Gemini Deep Research調査結果）

### Three.jsのシャドウレンダリングメカニズム

Three.jsは2つの独立したレンダリングパスを実行します：

1. **メインパス**: オブジェクトをカメラから見て描画
2. **シャドウパス**: オブジェクトを光源から見て描画し、深度情報をシャドウマップに記録

**重要な点：**
- シャドウパス実行時、メインマテリアル（`ShaderMaterial`）は使われない
- 内部的に深度用マテリアル（`MeshDepthMaterial`）に置き換えられる
- メインマテリアルとシャドウマテリアルは**完全に独立したコンテキスト**で処理される
- Uniformの値が自動的に共有されることはない

### なぜ影が変形しないのか

`onBeforeCompile`でアクセスできる`shader`オブジェクトは一時的なもので、メインパス用とシャドウパス用で**別々に生成**されます。

したがって、以下のアプローチは失敗します：

1. **Uniformsの再割り当て**
   ```typescript
   // ❌ 失敗: 別々のコピーが作られるだけ
   shader.uniforms = {
     ...shader.uniforms,
     uBendAmount: sharedUniforms.uBendAmount,
   };
   ```

2. **毎フレームneedsUpdate = true**
   ```typescript
   // ❌ 失敗: 高コストな再コンパイルで影が消える
   depthMaterial.needsUpdate = true;
   ```

---

## 📝 試した修正の履歴

### ステップ1: ベースライン確認 ✅
**実施内容：**
```typescript
const USE_CUSTOM_SHADOW = false;
```

**結果：**
- 標準の`MeshDepthMaterial`で影が正常に表示される
- 変形は連動しないが、影の描画自体は機能している

---

### ステップ2: シェーダーロジックの注入
**実施内容：**
```typescript
const USE_CUSTOM_SHADOW = true;

depthMaterial.onBeforeCompile = (shader) => {
  shader.uniforms = {
    ...shader.uniforms,
    uBendAmount: sharedUniforms.uBendAmount,
    // ...
  };

  // uniform宣言を追加
  shader.vertexShader = shader.vertexShader.replace(
    "#include <common>",
    `#include <common>\nuniform float uHeight;\n...`
  );

  // 変形ロジックを注入
  shader.vertexShader = shader.vertexShader.replace(
    "#include <begin_vertex>",
    `#include <begin_vertex>\n${bendChunk}`
  );
};
```

**結果：**
- 影が表示される
- ただし、変形に連動せず直線のまま

**問題点：**
- `shader.uniforms = {...}`による再割り当てで参照が切れる
- メインマテリアルのuniform更新が影に伝わらない

---

### ステップ3: userData.updateBend による個別更新
**実施内容：**
```typescript
depthMaterial.onBeforeCompile = (shader) => {
  // ...
  mat.userData.updateBend = (value: number) => {
    shader.uniforms.uBendAmount.value = value;
  };
};

useFrame(() => {
  bladeMaterial.uniforms.uBendAmount.value = eased;
  depthMaterial.userData.updateBend(eased);
});
```

**結果：**
- 影は表示される
- 変形には連動しない

**問題点：**
- クロージャでキャプチャした`shader`変数への依存
- `BendSetter`型が未定義でTypeScriptエラー
- コードが複雑化

---

### ステップ4: needsUpdate フラグの設定
**実施内容：**
```typescript
useFrame(() => {
  bladeMaterial.uniforms.uBendAmount.value = eased;
  bladeMaterial.uniformsNeedUpdate = true;

  if (depthMaterial) {
    depthMaterial.needsUpdate = true; // ← 追加
  }
});
```

**結果：**
- **影が完全に消える**

**問題点：**
- `needsUpdate = true`は高コストな再コンパイル命令
- 毎フレーム実行すると`onBeforeCompile`の設定が失われる
- パフォーマンスも著しく低下

---

### ステップ5: Object.assign による参照維持（現在の実装）
**実施内容：**
```typescript
const material = useMemo(() =>
  new ShaderMaterial({
    uniforms: {
      uBendAmount: { value: 0 },
      uHeight: { value: toSceneUnits(ANIMATION_CONFIG.blade.height) },
      uMaxBendAngle: { value: ANIMATION_CONFIG.blade.maxBendAngle },
    },
    // ...
  }), []
);
const sharedUniforms = material.uniforms;

const depthMaterial = useMemo(() => {
  if (!USE_CUSTOM_SHADOW) return null;

  const mat = new MeshDepthMaterial({ side: DoubleSide });
  mat.onBeforeCompile = (shader) => {
    // Object.assignで既存のuniformsオブジェクトに追加（参照を維持）
    Object.assign(shader.uniforms, {
      uHeight: sharedUniforms.uHeight,
      uBendAmount: sharedUniforms.uBendAmount,
      uMaxBendAngle: sharedUniforms.uMaxBendAngle,
    });

    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      `#include <common>\nuniform float uHeight;\nuniform float uBendAmount;\nuniform float uMaxBendAngle;\n`
    );

    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>\n${bendChunk}`
    );
  };
  return mat;
}, [bendChunk, sharedUniforms]);

useFrame(() => {
  bladeMaterial.uniforms.uBendAmount.value = eased;
  bladeMaterial.uniformsNeedUpdate = true;
  // シャドウマテリアルには何もしない
});
```

**期待される動作：**
- `sharedUniforms`の参照が維持される
- メインマテリアルの更新が自動的に影に反映される

**実際の結果：**
- **影が表示されない**

**考えられる原因：**
1. `onBeforeCompile`が実行されていない
2. シェーダーコードの注入位置が間違っている
3. Uniform宣言が不足している
4. Three.jsの内部でuniformsオブジェクトが再構築されている

---

## 🎯 次にすべきこと（優先順位順）

### Phase 1: デバッグとログ追加（最優先）

#### 1.1 onBeforeCompileの実行確認
```typescript
depthMaterial.onBeforeCompile = (shader) => {
  console.log('🔍 Depth onBeforeCompile called');
  console.log('Shader uniforms:', shader.uniforms);
  console.log('uBendAmount reference match:',
    shader.uniforms.uBendAmount === sharedUniforms.uBendAmount
  );

  // 既存のコード...
};
```

#### 1.2 useFrame内でUniform値を確認
```typescript
useFrame(() => {
  const eased = ...;

  console.log('📊 Frame update:', {
    mainBendAmount: bladeMaterial.uniforms.uBendAmount.value,
    sharedBendAmount: sharedUniforms.uBendAmount.value,
    easedValue: eased,
  });

  bladeMaterial.uniforms.uBendAmount.value = eased;
  bladeMaterial.uniformsNeedUpdate = true;
});
```

#### 1.3 シェーダーコードの出力
```typescript
depthMaterial.onBeforeCompile = (shader) => {
  // ...
  console.log('📝 Modified vertex shader:', shader.vertexShader);
};
```

**確認ポイント：**
- `onBeforeCompile`が1回だけ呼ばれているか
- Uniform宣言が正しく注入されているか
- `bendChunk`のコードが正しい位置に配置されているか
- `transformed`変数が使用可能な位置にあるか

---

### Phase 2: シェーダーコードの検証

#### 2.1 bendChunkの内容を確認
```glsl
// 現在のbendChunk（103-119行目）
float bendAmount = clamp(uBendAmount, 0.0, 1.0);
float theta = uMaxBendAngle * bendAmount;
if (theta > 0.0001) {
  float normalizedY = clamp((transformed.y + (uHeight * 0.5)) / uHeight, 0.0, 1.0);
  float radius = uHeight / theta;
  float angle = theta * normalizedY;
  float yPos = radius * sin(angle);
  float zOffset = radius * (1.0 - cos(angle));
  transformed.y = yPos - (uHeight * 0.5);
  transformed.z += zOffset;
}
```

**確認事項：**
- `transformed`変数が`#include <begin_vertex>`の後に定義されているか
- Three.jsの`MeshDepthMaterial`で`transformed`が使用可能か

#### 2.2 注入位置の調整（必要に応じて）
```typescript
// 代替案1: project_vertexの前に注入
shader.vertexShader = shader.vertexShader.replace(
  "#include <project_vertex>",
  `${bendChunk}\n#include <project_vertex>`
);

// 代替案2: beginnormalの後に注入
shader.vertexShader = shader.vertexShader.replace(
  "#include <beginnormal_vertex>",
  `#include <beginnormal_vertex>\n${bendChunk}`
);
```

---

### Phase 3: Spector.jsによる深堀り（Phase 1-2で解決しない場合）

#### 3.1 Spector.jsのインストール
```bash
npm install --save-dev spectorjs
```

#### 3.2 キャプチャの実装
```typescript
import { Spector } from 'spectorjs';

useEffect(() => {
  const spector = new Spector();
  spector.displayUI();
}, []);
```

#### 3.3 確認事項
- シャドウマップのレンダリングパスを追跡
- GPUに送られているuniform値を直接確認
- シェーダーコンパイルのエラーメッセージを確認

---

### Phase 4: 代替アプローチの検討（最終手段）

#### 4.1 完全カスタムシャドウマテリアルクラス
```typescript
class BendableDepthMaterial extends THREE.MeshDepthMaterial {
  constructor(sharedUniforms: any, bendChunk: string) {
    super({ side: THREE.DoubleSide });

    this.onBeforeCompile = (shader) => {
      // より詳細な制御
      shader.uniforms.uBendAmount = sharedUniforms.uBendAmount;
      shader.uniforms.uHeight = sharedUniforms.uHeight;
      shader.uniforms.uMaxBendAngle = sharedUniforms.uMaxBendAngle;

      // シェーダーコード注入...
    };
  }
}
```

#### 4.2 RawShaderMaterialの使用
- より低レベルな制御が可能
- 完全に独自のシャドウマップ生成ロジックを実装
- 実装コストが高い

---

## 📚 参考資料

### Gemini Deep Research調査結果の要約
- Three.jsのメインパスとシャドウパスは完全に独立
- `onBeforeCompile`のshaderオブジェクトは一時的
- Uniformの参照共有が正しい解決策
- InstancedMeshへの拡張も同じ手法で可能

### 関連するThree.jsドキュメント
- [Material.onBeforeCompile](https://threejs.org/docs/#api/en/materials/Material.onBeforeCompile)
- [WebGLRenderer.shadowMap](https://threejs.org/docs/#api/en/renderers/WebGLRenderer.shadowMap)
- [MeshDepthMaterial](https://threejs.org/docs/#api/en/materials/MeshDepthMaterial)
- [LightShadow](https://threejs.org/docs/#api/en/lights/shadows/LightShadow)

### 類似する問題の報告
- [Three.js GitHub Issue #12820](https://github.com/mrdoob/three.js/issues/12820) - Custom shadow with morphing
- [Stack Overflow: Dynamic shadow with custom shader](https://stackoverflow.com/questions/tagged/three.js+shadow)

---

## 🧪 テスト方法

### 基本テスト
1. `USE_CUSTOM_SHADOW = false` で影が表示されることを確認
2. `USE_CUSTOM_SHADOW = true` にして、コンソールログを確認
3. `onBeforeCompile`が呼ばれているか
4. Uniform値が正しく設定されているか
5. シェーダーコードが正しく注入されているか

### 詳細テスト（Spector.js使用）
1. シャドウマップのレンダリングパスをキャプチャ
2. GPUに送られているuniform値を確認
3. シェーダーコンパイルエラーの有無を確認
4. 深度テクスチャの内容を可視化

---

## ✅ 成功の判定基準

1. **影が表示される**
2. **スクロール時に影が羽板の変形に連動する**
3. **パフォーマンスが維持される**（60fps目標）
4. **コンソールにエラーが出ない**

---

## 📝 メモ

### 現在の状態
- 日付: 2025-10-29
- フラグ: `USE_CUSTOM_SHADOW = true`
- 現象: 影が表示されない
- エラー: なし

### 次のセッションで最初にすること
1. Phase 1のデバッグログを追加
2. コンソール出力を確認
3. `onBeforeCompile`の実行状況を把握
4. 結果に基づいて次のステップを決定

---

## 🔬 デバッグセッション 2025-10-30

### Phase 1実施: Chrome DevTools MCPによる詳細デバッグ

#### 実施内容
Chrome DevTools MCPを使用してブラウザコンソールを直接確認し、Phase 1のすべてのチェックポイントを検証。

#### Phase 1.1: onBeforeCompileの実行確認 ✅
**結果:**
```json
{
  "category": "DEPTH",
  "message": "onBeforeCompile called"
}
```
- ✅ `onBeforeCompile`は正常に実行されている
- ✅ depthMaterialのシェーダーカスタマイズは動作している

#### Phase 1.2: Uniform参照の検証 ✅
**結果:**
```json
{
  "category": "UNIFORM",
  "message": "uBendAmount reference match",
  "data": { "referenceMatch": true }
}
```
- ✅ `Object.assign`によるUniform参照の共有は成功している
- ✅ `shader.uniforms.uBendAmount === sharedUniforms.uBendAmount` が `true`

**初期値の確認:**
```json
{
  "category": "DEPTH",
  "message": "sharedUniforms",
  "data": {
    "uHeight": 3.762,
    "uBendAmount": 0,
    "uMaxBendAngle": 1.5707963267948966
  }
}
```
- ✅ sharedUniformsの初期値は正しい

#### Phase 1.3: シェーダーコードの検証 ✅
**バリデーション結果:**
```json
{
  "hasUniformDeclarations": true,
  "hasBendChunk": true,
  "hasTransformed": true,
  "includesBeginVertex": true,
  "shaderLength": 1391
}
```
- ✅ Uniform宣言が正しく注入されている
- ✅ bendChunkのコードが正しく注入されている
- ✅ `transformed`変数が使用可能な位置にある
- ✅ シェーダーコードの長さは妥当（1391文字）

**注入されたVertex Shader（抜粋）:**
```glsl
#include <common>
uniform float uHeight;
uniform float uBendAmount;
uniform float uMaxBendAngle;

#include <batching_pars_vertex>
// ... (中略)
void main() {
  #include <uv_vertex>
  #include <batching_vertex>
  #include <skinbase_vertex>
  #include <morphinstance_vertex>
  // ... (続く)
```

#### Phase 1.4: useFrame内のUniform更新確認 ✅
**スクロール位置50%（最大曲がり）での値:**
```json
{
  "progress": 0.5005599104143337,
  "eased": 0.9999969058854479,
  "mainBendAmount": 0.9999969058854479,
  "sharedBendAmount": 0.9999969058854479,
  "referenceMatch": true
}
```
- ✅ スクロール進行度は正しく計算されている
- ✅ eased値（曲がり量）は正しく計算されている（約1.0）
- ✅ mainMaterialとsharedUniformsは同じ値を持っている
- ✅ 参照は維持されている（`referenceMatch: true`）

### Phase 1の結論
**技術的には完璧に実装されている：**
- onBeforeCompileは実行されている
- Uniform参照は正しく共有されている
- シェーダーコードは正しく注入されている
- Uniformの値は正しく更新されている

**しかし、影が表示されない理由が判明：**

---

### 根本原因の特定 ⚠️

#### 問題1: DirectionalLightのshadow-camera設定不足
**発見内容:**
DirectionalLightに`shadow-camera-*`プロパティが設定されていなかった。

**修正内容:**
```typescript
<directionalLight
  position={[3, 5, 2]}
  intensity={1.4}
  castShadow
  shadow-mapSize-width={1024}
  shadow-mapSize-height={1024}
  shadow-camera-left={-5}      // ← 追加
  shadow-camera-right={5}       // ← 追加
  shadow-camera-top={5}         // ← 追加
  shadow-camera-bottom={-5}     // ← 追加
  shadow-camera-near={0.1}      // ← 追加
  shadow-camera-far={20}        // ← 追加
/>
```

**結果:**
- ❌ 影は表示されるようになったが、まだ変形に連動しない

#### 問題2: sharedUniformsが更新されていない 🔥
**発見内容:**
useFrame内で**メインマテリアルのuniformを更新していたが、sharedUniformsを更新していなかった**。

**問題のコード（BladeDebugScene.tsx: 269行目）:**
```typescript
useFrame(() => {
  const eased = ...; // 曲がり量を計算

  // ❌ メインマテリアルだけ更新
  bladeMaterial.uniforms.uBendAmount.value = eased;
  bladeMaterial.uniformsNeedUpdate = true;

  // シャドウマテリアルは sharedUniforms を参照しているため、
  // メインマテリアルの更新で自動的に連動する ← これは間違い！
});
```

**問題の詳細:**
1. メインマテリアルは`material.uniforms`を持つ
2. depthMaterialは`sharedUniforms`を参照するよう`Object.assign`で設定
3. しかし、**メインマテリアルのuniformを更新してもsharedUniformsは更新されない**
4. 参照は維持されているが、**値が更新されていない**

**正しい実装:**
```typescript
useFrame(() => {
  const eased = ...; // 曲がり量を計算

  // ✅ sharedUniformsを直接更新（メイン・シャドウ両方が参照している）
  sharedUniforms.uBendAmount.value = eased;

  // メインマテリアルのuniformsNeedUpdateフラグを設定
  bladeMaterial.uniformsNeedUpdate = true;

  // シャドウマテリアルはsharedUniformsを参照しているため自動連動
});
```

**修正の実施日時:** 2025-10-30

**結果:**
- ❌ **影が完全に消えた**

### 現在の状態（2025-10-30）
- DirectionalLightのshadow-camera設定: 追加済み
- sharedUniformsの直接更新: 実装済み
- 影の表示: **消えた**

### 次のステップ
1. 修正前（メインマテリアルのuniformを更新）の状態に戻す
2. なぜ影が変形に連動しないのか再調査
3. 別のアプローチを検討
   - depthMaterial.uniformsNeedUpdateの設定
   - シェーダーコードの注入位置の変更
   - カスタムマテリアルクラスの実装

### 見やすさの改善
以下を実装済み：
- Groundの色を薄いグレー（`#cccccc`）に変更
- ワイヤーの太さのデフォルトを10mmに変更
- ワイヤー太さの調整範囲を0.5-20mmに拡大

---

**最終更新**: 2025-10-30
