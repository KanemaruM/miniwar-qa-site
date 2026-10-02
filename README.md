# Temporary Static Pages

短期間だけ共有・確認するための静的ページ置き場です。

## 用途

- 調査結果の一時共有
- 写真付きランキング・比較ページ
- イベント候補や撮影スポットのまとめ
- 1〜2日程度で不要になる確認用HTML

## 運用

- 公開物は基本的にフォルダ単位で追加します。
- 例: `card-market/index.html`
- 公開URL: `https://kanemarum.github.io/<repository-name>/card-market/`
- 用途が終わったページは削除します。
- 個人情報・認証情報・非公開データは置きません。

## GitHub Pages

`.github/workflows/pages.yml` により `main` の内容をGitHub Pagesへ公開します。

このリポジトリは長期保管用ではなく、短期的な公開・確認用です。
