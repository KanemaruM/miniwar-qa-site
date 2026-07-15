# Mini War Discord QA Knowledge Base

DiscordのQAログ・一般チャットログから抽出した、Roblox Mini War向けの静的ナレッジベースです。

## 内容

- 質問カテゴリごとの推定件数
- 主要な回答
- その他意見・曖昧な点
- 質問が増えた日付
- 原文例
- 検索・グループ・回答確度フィルタ

## ローカル確認

ブラウザで `index.html` を開けば動きます。ローカルのfetch制限が出る場合は、以下のように簡易サーバーで確認してください。

```bash
python -m http.server 8000
```

その後 `http://localhost:8000` を開きます。

## GitHub Pagesで公開する方法

1. 新しいGitHubリポジトリを作成
2. このフォルダの中身をすべてpush
3. GitHubの Settings → Pages → Build and deployment で `GitHub Actions` を選択
4. `.github/workflows/pages.yml` が自動で公開します

## 注意

- 件数はログからのルールベース抽出のため概算です。
- 「回答確度: 低」の項目は、ログ内で回答が割れている、画像依存、またはアップデート直後で情報が荒いものです。
- Discordユーザー名は公開向けに基本表示していません。
