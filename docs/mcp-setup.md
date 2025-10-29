# MCP (Model Context Protocol) Setup

このプロジェクトでは、Chrome DevTools MCPサーバーを使用してブラウザの開発者ツールと連携します。

## 設定ファイル

MCP設定は [.mcp/config.json](../.mcp/config.json) に保存されています。

## インストール済みMCPサーバー

### Chrome DevTools MCP

Chrome DevToolsと連携し、ブラウザのデバッグやパフォーマンス分析を支援します。

**設定内容:**
```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest"]
    }
  }
}
```

## Claude Desktopでの使用方法

### ローカル設定のコピー (推奨)

プロジェクト固有の設定をClaude Desktopで使用する場合:

1. プロジェクトの設定を確認:
   ```bash
   type .mcp\config.json
   ```

2. Claude Desktopの設定ファイルにマージ:
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

3. Claude Desktopを再起動して設定を反映

### シンボリックリンク (上級者向け)

プロジェクトの設定を直接参照する場合は、シンボリックリンクを作成することもできます。

## 新しいMCPサーバーの追加

[.mcp/config.json](../.mcp/config.json) の `mcpServers` オブジェクトに新しいエントリを追加してください:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest"]
    },
    "your-new-server": {
      "command": "command-here",
      "args": ["arg1", "arg2"]
    }
  }
}
```

## トラブルシューティング

- MCPサーバーが認識されない場合は、Claude Desktopを再起動してください
- `npx`コマンドが見つからない場合は、Node.jsがインストールされているか確認してください
- ネットワークエラーが発生する場合は、インターネット接続を確認してください

## 参考リンク

- [Model Context Protocol 公式ドキュメント](https://modelcontextprotocol.io/)
- [Chrome DevTools MCP](https://github.com/modelcontextprotocol/servers/tree/main/src/chrome-devtools)
