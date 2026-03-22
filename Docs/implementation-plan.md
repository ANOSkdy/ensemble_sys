# 実装方針書（画面・API・共通UI・ステータス定義）

## 1. 目的

本書は、`airwork-ops-console` の今後の実装を Codex 主導で安全かつ効率的に進めるために、画面一覧、API一覧、共通UI、ステータス定義、認証方針、DBアクセス方針を固定するための実装方針書である。  
Neon 実DBを正とし、設計書・AGENTS.md・実装コードの整合を取りながら、最小差分で段階的に構築する。  
本書は、基本設計書・詳細設計書・`Docs/db/schema-diff-report.md`・`Docs/db/db-alignment-policy.md` を踏まえた実装用の運用基準とする。

---

## 2. 前提方針

- リポジトリ: `C:\dev\airwork-ops-console`
- デプロイ先: Vercel
- フレームワーク: Next.js App Router + TypeScript
- パッケージマネージャ: pnpm
- 主DB: Neon Postgres
- DBの正: **live Neon schema**
- DB命名の正: `org_id`, `owner_name`, `memo`, `internal_title`, `file_format`, `file_sha256`, `actor_user_id`, `client_meetings`
- DBアクセス: server-only
- runtime: DB利用APIは原則 `nodejs`
- client bundleに秘密情報を出さない
- APIは `{ ok: true } / { ok: false }` 形式を基本とする

---

## 3. 実装フェーズ

## Phase 1: 読み取り中心の一覧画面
最優先で実装する画面とAPI:
- `/clients`
- `/jobs`
- `/runs`
- `/todos`

対応API:
- `GET /api/clients`
- `GET /api/jobs`
- `GET /api/runs`
- `GET /api/todos`

目的:
- Neon実DBとの接続確認
- actual schema ベースの read 実装確立
- 共通UI部品の定着
- empty / loading / error の統一

## Phase 2: 詳細画面
- `/clients/[clientId]`
- `/jobs/[jobId]`
- `/runs/[runId]`
- `/todos/[todoId]`

対応API:
- `GET /api/clients/[id]`
- `GET /api/jobs/[id]`
- `GET /api/runs/[id]`
- `GET /api/todos/[id]`

目的:
- 関連データ表示
- 遷移整合
- ステータス表示の具体化

## Phase 3: 作成・編集導線
- `/clients/new`
- `/jobs/new`
- `/jobs/[jobId]/edit`
- `/todos/[todoId]/edit`

対応API:
- `POST /api/clients`
- `POST /api/jobs`
- `PATCH /api/jobs/[id]`
- `PATCH /api/todos/[id]`

目的:
- Zod検証
- DB更新
- audit_logs運用開始

## Phase 4: 業務コア
- revision 管理
- AI proposal 管理
- run 生成
- result import
- freshness

---

## 4. 画面一覧と責務

## 4.1 ホーム `/`
役割:
- 主要業務の入口
- KPIカード表示
- 一覧画面への導線

表示内容:
- Open ToDos
- Recent Runs
- Freshness Targets
- Freshness Candidates
- Recent Run Summary
- Pending Tasks

主アクション:
- Clients / Jobs / Runs / ToDos へ遷移

備考:
- 初期段階では集計API未実装でも可
- まずは導線優先

## 4.2 Clients 一覧 `/clients`
役割:
- 取引先一覧の表示
- 詳細画面への導線

主要表示項目:
- `name`
- `owner_name`
- `memo`
- `created_at`（存在する場合）
- `updated_at`（存在する場合）

主アクション:
- 詳細へ遷移
- 新規作成

対応API:
- `GET /api/clients`

完了条件:
- 一覧表示
- empty state
- error state
- row click または詳細リンク

## 4.3 Client 詳細 `/clients/[clientId]`
役割:
- 取引先の基本情報表示
- 関連リソース表示

主要表示:
- client基本情報
- channel_accounts
- airwork_locations
- jobs
- client_meetings

対応API:
- `GET /api/clients/[id]`

## 4.4 Jobs 一覧 `/jobs`
役割:
- 求人系データの一覧表示

主要表示項目:
- `internal_title`
- `status`
- `client_id`
- `updated_at`

対応API:
- `GET /api/jobs`

## 4.5 Job 詳細 `/jobs/[jobId]`
役割:
- 求人基本情報
- posting / revision / proposal へのハブ

主要表示:
- job基本情報
- job_postings
- job_revisions
- ai_proposals

対応API:
- `GET /api/jobs/[id]`

## 4.6 Runs 一覧 `/runs`
役割:
- 入稿実行履歴一覧

主要表示項目:
- `run_type`
- `channel`
- `file_format`
- `status`
- `executed_at`
- `completed_at`

対応API:
- `GET /api/runs`

## 4.7 Run 詳細 `/runs/[runId]`
役割:
- 実行対象、結果、エラーの詳細表示

主要表示:
- run本体
- run_items
- 結果サマリ

対応API:
- `GET /api/runs/[id]`

## 4.8 ToDos 一覧 `/todos`
役割:
- ToDoの作業管理一覧

主要表示項目:
- `title`
- `status`
- `assigned_to`
- `due_date`
- `completed_at`

対応API:
- `GET /api/todos`

## 4.9 Todo 詳細 `/todos/[todoId]`
役割:
- 作業内容、メモ、証跡表示

主要表示:
- `instructions`
- `evidence_urls`
- `status`
- `completed_at`

対応API:
- `GET /api/todos/[id]`

## 4.10 Meetings 系
実DB正:
- `client_meetings`

方針:
- 初期実装では Clients 詳細配下の関連情報として扱う
- 独立画面化は Phase 3 以降

---

## 5. API一覧と契約方針

## 5.1 共通レスポンス方針
成功:
```json
{ "ok": true, "data": ... }
```

失敗:
```json
{ "ok": false, "error": "..." }
```

補足:
- 必要に応じて `meta` を追加可
- 一覧では `data: []`
- 詳細では `data: { ... }`

## 5.2 一覧API
### `GET /api/clients`
返却:
- `id`
- `name`
- `owner_name`
- `memo`

### `GET /api/jobs`
返却:
- `id`
- `client_id`
- `internal_title`
- `status`

### `GET /api/runs`
返却:
- `id`
- `run_type`
- `channel`
- `file_format`
- `status`
- `executed_at`
- `completed_at`

### `GET /api/todos`
返却:
- `id`
- `title`
- `status`
- `assigned_to`
- `due_date`
- `completed_at`

## 5.3 詳細API
IDは全て Zod で検証する。  
存在しないIDは 404。

### `GET /api/clients/[id]`
返却:
- client本体
- channel_accounts
- airwork_locations
- jobs
- client_meetings

### `GET /api/jobs/[id]`
返却:
- job本体
- job_postings
- job_revisions
- ai_proposals

### `GET /api/runs/[id]`
返却:
- run本体
- run_items

### `GET /api/todos/[id]`
返却:
- todo本体

---

## 6. 認証・認可方針

基本方針:
- ログインユーザー前提
- 認証済みでない画面・APIは利用不可
- 実装初期は簡易保護でも、以後全画面保護へ寄せる

推奨:
- middleware または共通 auth helper で保護
- APIごとに `org_id` で絞る
- クライアントからの `org_id` 信頼禁止

最低限守ること:
- DB問い合わせ時に org 境界を考慮する
- `id` 単独検索だけで全件参照させない
- 権限不足時は 403

---

## 7. 共通UI部品一覧

最優先で整備する部品:
- `PageHeader`
- `SectionCard`
- `StatusBadge`
- `EmptyState`
- `LoadingState`
- `ErrorState`
- `DataTable`
- `SummaryCard`
- `FilterBar`

## 7.1 PageHeader
役割:
- タイトル
- 説明
- 右側アクション配置

## 7.2 SectionCard
役割:
- 白背景カード
- 共通余白
- 柔らかいシャドウ
- 角丸

## 7.3 StatusBadge
役割:
- 各ステータスの色分け表示

## 7.4 EmptyState
役割:
- データ0件のガイド表示

表示例:
- データがありません
- 条件を変更してください
- 新規作成してください

## 7.5 LoadingState
役割:
- 読み込み中表示

方針:
- スケルトンまたはシンプルなプレースホルダ
- 派手なアニメーションは禁止

## 7.6 ErrorState
役割:
- API失敗時表示
- 再試行導線

## 7.7 DataTable
役割:
- 一覧表示の標準部品

標準仕様:
- ヘッダ
- 行クリック
- 省略記法
- 空状態

---

## 8. デザイン適用方針

凍結されたデザイン仕様を画面実装時に反映する。

## 8.1 カラースキーム
- ベース: `#F9F9F9`
- プライマリ: `#4A90E2`
- セカンダリ: `#50E3C2`
- アクセント1: `#FFD166`
- アクセント2: `#F25F5C`
- アクセント3: `#9D59EC`

## 8.2 表現ルール
- セクションを明確に分ける
- カードは大きめの角丸
- 柔らかいドロップシャドウ
- 2px線画＋塗りアイコン
- 装飾はドット、波線、パターン
- グラフはフラット
- トランジションは控えめ

## 8.3 実装順
1. 共通トークン
2. 共通部品
3. 一覧画面
4. 詳細画面
5. グラフ・装飾

---

## 9. ステータス定義

## 9.1 Job Revision Status
候補:
- `draft`
- `in_review`
- `approved`
- `rejected`

表示方針:
- draft: muted
- in_review: primary
- approved: secondary
- rejected: accent-2

## 9.2 AI Proposal Status
候補:
- `draft`
- `generated`
- `applied`
- `dismissed`

表示方針:
- generated: accent-3
- applied: secondary
- dismissed: muted/error寄り

## 9.3 Run Status
候補:
- `draft`
- `queued`
- `executing`
- `completed`
- `failed`

表示方針:
- queued: primary薄色
- executing: primary
- completed: secondary
- failed: accent-2

## 9.4 Todo Status
候補:
- `open`
- `in_progress`
- `done`
- `blocked`
- `canceled`

表示方針:
- open: muted
- in_progress: primary
- done: secondary
- blocked: accent-2
- canceled: muted

注意:
- 実DB値が異なる場合、初期は actual DB value を正とする
- UI表示文言だけ変換してよい

---

## 10. 一覧画面の共通ルール

- 既定ソートは `updated_at desc` を優先
- 該当列が無ければ業務上意味のある列で代替
- nullable 値は `—` 表示
- 日時はローカル表示に統一
- 長文メモは省略表示
- 行アクションは最小限
- 初期段階ではページングなしでも可
- 件数が増えたら検索・フィルタを追加

---

## 11. エラー・空状態・ローディング方針

## 11.1 Empty
- データ0件を正常系として扱う
- 次アクションを示す

## 11.2 Error
- 内部エラー詳細は出さない
- 画面には簡潔な文言
- 再試行ボタンを用意

## 11.3 Loading
- 画面全体ロックではなく部分読み込み優先
- ちらつきの強い演出は避ける

---

## 12. DBアクセス方針

- SQLは server-side only
- route handler を薄く保つ
- クエリは `src/lib/db/**` に寄せる
- actual DB names を使う
- UI向けの名前は mapper で変換する

推奨構成:
- `src/lib/db/schema.ts`
- `src/lib/db/mappers.ts`
- `src/types/db-schema.ts`
- 将来的に `src/lib/db/queries/*.ts`

禁止:
- client component から DBアクセス
- SQLで logical name を使う
- 生の文字列結合SQL

---

## 13. 監査ログ方針

対象:
- 作成
- 更新
- ステータス変更
- 実行
- 取り込み

現DB前提:
- `audit_logs.detail`
- `audit_logs.actor_user_id`

方針:
- 初期は detail に JSON を集約
- before/after 分割は現DB移行後に検討

---

## 14. Seed / ローカル検証方針

最低限必要な検証データ:
- 1 organization
- 複数 clients
- 各 client の channel_accounts
- airwork_locations
- jobs
- runs
- todos
- client_meetings

ローカル確認項目:
- 一覧0件
- 一覧複数件
- 不正ID詳細
- APIエラー
- org絞り込み

---

## 15. 完了条件

Phase 1 完了条件:
- `/clients`, `/jobs`, `/runs`, `/todos` が表示可能
- API接続済み
- empty/loading/error 対応済み
- StatusBadge 適用済み
- actual DB name ベースで実装済み
- `pnpm exec tsc --noEmit` 通過
- `pnpm lint` 通過

Phase 2 完了条件:
- 詳細画面4本が遷移可能
- 関連データ表示
- 404/権限エラー処理済み

---

## 16. Codex向け実装ルール

- 1タスク = 1機能単位
- 最小差分
- 既存構造尊重
- route handler は薄く
- SQLは actual DB names
- mapper で UI/domain alias を吸収
- 画面実装時に共通UIを使い回す
- secrets は server-only
- 変更時は関連 docs も更新

---

## 17. 直近の実装優先順位

1. 共通UI追加
   - EmptyState
   - LoadingState
   - ErrorState
   - SummaryCard
   - DataTable

2. read API追加
   - `GET /api/clients`
   - `GET /api/jobs`
   - `GET /api/runs`
   - `GET /api/todos`

3. 一覧画面接続
   - `/clients`
   - `/jobs`
   - `/runs`
   - `/todos`

4. 詳細APIと詳細画面

5. 認証・org絞り込み強化

---

## 18. 保存先推奨

本書は以下に保存する。

- `Docs/implementation-plan.md`

必要に応じて関連文書:
- `Docs/db/db-alignment-policy.md`
- `Docs/db/actual-db-mapping-notes.md`
- `Docs/design/basic-design-v2.md`
- `Docs/design/detailed-design-v2.md`
- `AGENTS.md`
