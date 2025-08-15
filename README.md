# KWL Web App

関西ウイスキーラバーズ用の最小React + Firebaseアプリです。

## セットアップ

```bash
npm install
cp .env.example .env # Firebase設定を記入
npm run dev
```

## 環境変数例
`.env.example` を参照し、Firebaseの各種キーを設定してください。

## Firebase ルール
`firestore.rules` を参照してください。開発用として、認証済ユーザーのみ書き込み可・読み込みは誰でも可能です。

## 画面
- ログイン (Google/メール)
- テイスティング投稿 (写真, 銘柄, 蒸留所, 樽種類, ABV, コメント)
- 投稿一覧/検索 (最新順, ブランド/蒸留所フィルタ)
- イベント一覧/登録 (タイトル, 日付, 詳細, 参加ボタン)

Tailwind CSSで簡易UIを構築しています。
