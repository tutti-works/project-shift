# デバッグチェックリスト

このファイルは、ブラウザのコンソール出力を確認するためのチェックリストです。

## 📋 確認手順

1. ブラウザで http://localhost:3000 を開く
2. F12で開発者ツールを開く
3. Consoleタブを確認
4. 以下の項目をチェック

---

## ✅ チェック項目

### 1. onBeforeCompileの実行確認

**期待される出力：**
```
🔍 [DEPTH] onBeforeCompile called
```

- [ ] **表示された**
- [ ] **表示されなかった**

### 2. Uniform参照の確認

**期待される出力：**
```
🔗 [DEPTH] uBendAmount reference match: true
```

実際の値: `_______________`

- [ ] **true** → 正常
- [ ] **false** → 参照が切れている

### 3. シェーダー検証

**期待される出力：**
```
✅ [DEPTH] Shader validation: {
  hasUniformDeclarations: true,
  hasBendChunk: true,
  hasTransformed: true,
  includesBeginVertex: true
}
```

実際の値を記入：
- hasUniformDeclarations: `_______________`
- hasBendChunk: `_______________`
- hasTransformed: `_______________`
- includesBeginVertex: `_______________`

### 4. フレーム更新の確認（スクロール時）

**期待される出力（5秒ごと）：**
```
📊 [FRAME] Update: {
  progress: 0.5,
  eased: 0.75,
  mainBendAmount: 0.75,
  sharedBendAmount: 0.75,
  referenceMatch: true
}
```

- [ ] **ログが表示される**
- [ ] **スクロールするとeasedの値が変化する**
- [ ] **referenceMatchがtrueのまま**

### 5. エラーの有無

- [ ] **WebGLエラーなし**
- [ ] **Three.js警告なし**
- [ ] **その他のエラーなし**

エラーがある場合、以下に記入：
```
（エラー内容をここに貼り付け）
```

### 6. 影の表示状況

- [ ] **影が表示されている**
- [ ] **影が表示されていない**
- [ ] **影がまっすぐ（変形していない）**
- [ ] **その他**: _______________

---

## 📝 Modified Vertex Shaderの確認

コンソールに出力された「📝 [DEPTH] Modified vertex shader:」の内容から、以下を確認：

### Uniform宣言の有無
```glsl
uniform float uHeight;
uniform float uBendAmount;
uniform float uMaxBendAngle;
```

- [ ] **含まれている**
- [ ] **含まれていない**

### bendChunkの注入位置
```glsl
#include <begin_vertex>
vec3 transformed = vec3( position );
float bendAmount = clamp(uBendAmount, 0.0, 1.0);
float theta = uMaxBendAngle * bendAmount;
```

- [ ] **#include <begin_vertex>の直後に配置されている**
- [ ] **別の場所に配置されている**
- [ ] **見つからない**

### transformedの使用
```glsl
transformed.y = yPos - (uHeight * 0.5);
transformed.z += zOffset;
```

- [ ] **含まれている**
- [ ] **含まれていない**

---

## 🎯 結果サマリー

### 総合評価

- [ ] **すべて正常** → Phase 2へ進む
- [ ] **onBeforeCompileが呼ばれていない** → USE_CUSTOM_SHADOWの確認
- [ ] **参照が切れている** → 実装方法の変更が必要
- [ ] **シェーダーコードに問題** → 注入位置の調整が必要
- [ ] **エラーが発生** → エラー内容の詳細な確認

---

## 📸 スクリーンショット（オプション）

コンソールのスクリーンショットがあれば、より正確な診断が可能です。

---

**確認日時**: _______________
