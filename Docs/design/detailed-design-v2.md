# 詳細設計書（Ver.2）
Airワーク一括入稿（Excel/TSV）× AI改善提案 × 更新運用自動化システム

---

## 0. ドキュメント情報
- 文書名：詳細設計書（Ver.2）
- 作成日：2026-03-12
- 版：1.0
- 前提：
  - デプロイ：Vercel
  - リポジトリ：GitHub（PR運用）
  - DB：Neon（Postgres）
  - ファイル：Vercel Blob（生成ファイル/結果ファイル/証跡）
  - AI：Gemini Flash 3.0（サーバー側呼び出し）
  - 対象媒体：Airワーク（Ver.1固定）
- 本版の目的：
  - Ver.1詳細設計を踏襲しつつ、デザイン仕様を実装レベルまで落とし込み、UI/画面責務/コンポーネント責務を明確化する

---

## 1. 目的・範囲

### 1.1 目的
- 求人更新代行の運用負荷を「媒体手入力」から「データ一元管理＋一括出力＋実行支援」に移行する。
- 会議メモ→AI提案→承認→一括更新のループを標準化し、改善の再現性を上げる。
- 掲載から14日超過した求人を“鮮度維持対象”として検知し、未掲載化→複製→新規掲載の運用を継続的に回せる状態にする。
- UI実装において、色・コンポーネント・余白・視覚階層の判断を固定し、画面追加時の実装ブレを防ぐ。

### 1.2 Ver.2スコープ
- CRM：顧客、媒体アカウント、運用メモ
- 求人管理：入力フォーム、版管理（draft/review/approved/applied）
- AI提案：Gemini Flash 3.0、構造化出力、差分表示、承認
- 一括更新：Run生成、Excel/TSVファイル生成、手順チェックリスト、証跡保存
- 鮮度維持：日次Cron検知→実行計画（ToDo）生成
- 結果取り込み：入稿結果ファイル取り込み、エラー可視化、修正ToDo化
- デザインシステム：共通トークン、共通UI、画面レイアウト、状態表現

---

## 2. 外部仕様を前提にした設計上の制約

### 2.1 新規／更新の分岐
- 新規：job_offer_id（求人番号）空欄で出力
- 更新：job_offer_id を保持して出力
- 事故防止：DBで job_offer_id を厳密に保持し、生成時に「意図せぬ空欄化」を禁止する。

### 2.2 コード値厳密性
- コード値はゼロ埋め等を含むため、数値化せず文字列で保持する。
- UIは select（コードマスタ参照）を優先し、自由入力を極力排除する。

### 2.3 入力不可項目の扱い
- Airワーク一括入稿で入力不可な項目は、DBに参照専用キャッシュとして保持し、生成時には上書きしない。
- 未掲載化/掲載/再掲載が必要な場合は ToDo（手動工程）として運用に落とす。

### 2.4 大量更新の分割
- 生成ファイルはサイズ/件数で分割できる設計を持つ（Run分割）。
- Runは「顧客×媒体×日付×タイプ（update/refresh）」の単位で管理する。

---

## 3. デザイントークン詳細

### 3.1 Color Tokens
```ts
export const colors = {
  base: "#F9F9F9",
  primary: "#4A90E2",
  secondary: "#50E3C2",
  accent1: "#FFD166",
  accent2: "#F25F5C",
  accent3: "#9D59EC",
};
```

### 3.2 Semantic Tokens
| semantic key | 値 | 用途 |
|---|---|---|
| `bg.canvas` | `#F9F9F9` | アプリ全体背景 |
| `bg.card` | `#FFFFFF` | カード背景 |
| `text.default` | `#1F2937` 相当 | 本文 |
| `text.subtle` | グレー系 | 補助文 |
| `state.info` | `#4A90E2` | 実行中、レビュー中 |
| `state.success` | `#50E3C2` | 完了、承認 |
| `state.warn` | `#FFD166` | 注意、保留 |
| `state.error` | `#F25F5C` | 失敗、危険 |
| `state.ai` | `#9D59EC` | AI提案、AI分析 |

### 3.3 Shadow Tokens
- card-shadow-sm: ぼかし弱、一覧カード用
- card-shadow-md: 標準、詳細カード用
- modal-shadow-lg: モーダル/重要プレビュー用

### 3.4 Radius / Spacing
- カード角丸：16〜24px
- ボタン角丸：12〜16px
- セクション間：24〜32px
- カード内余白：16〜24px
- 入力要素高さ：40〜48px

### 3.5 Icon / Illustration Rules
- アイコン線幅は2px
- 塗りつぶし色は単色または2色まで
- 人物イラストは頭身を低く保ち、誇張したリアル表現は行わない
- 装飾はドット・波線・パターンを補助的に用いる

---

## 4. システム構成

### 4.1 技術スタック
- Next.js（App Router） + TypeScript
- Node runtime（DB/Blob/AIはserver-only）
- Neon（Postgres）
- Vercel Blob（ファイル保管）
- Gemini Flash 3.0（サーバー側呼び出し）
- Vercel Cron（鮮度維持ジョブ）

### 4.2 環境変数（server-only）
- DATABASE_URL
- DATABASE_URL_UNPOOLED
- BLOB_READ_WRITE_TOKEN
- GEMINI_API_KEY

※ すべてVercel環境変数で管理。repoには`.env.example`のみ。

### 4.3 フロントエンド実装方針
- App Router前提
- DBアクセス、Blob操作、AI呼び出しはサーバー側のみ
- Server Components を基本とし、フィルタやインタラクションが強い箇所のみ Client Component を採用
- UI状態は URL Search Params または局所stateで管理し、全体状態管理の肥大化を避ける

---

## 5. 画面設計（ルーティングとUI責務）

### 5.1 画面一覧
#### 認証
- `/login`：ログイン
- `/logout`：ログアウト

#### ダッシュボード
- `/`：未完ToDo、直近Run、鮮度維持対象のサマリ

#### CRM
- `/clients`
- `/clients/[clientId]`
- `/clients/[clientId]/channels`
- `/clients/[clientId]/locations`

#### 求人
- `/jobs`
- `/clients/[clientId]/jobs`
- `/jobs/[jobId]`
- `/jobs/[jobId]/edit`
- `/jobs/[jobId]/revisions`
- `/jobs/[jobId]/revisions/[revId]`

#### AI提案
- `/meetings`
- `/meetings/new`
- `/jobs/[jobId]/ai`
- `/jobs/[jobId]/ai/[proposalId]`

#### 実行（Run）/プレビュー
- `/runs`
- `/runs/[runId]`
- `/runs/[runId]/preview`

#### ToDo
- `/todos`
- `/todos/[todoId]`

#### 設定/マスタ
- `/settings/airwork-fields`
- `/settings/airwork-codes`
- `/settings/users`
- `/settings/audit`

### 5.2 画面別レイアウトルール
#### `/`
- 上段：サマリーカード 3〜5枚
- 中段：鮮度維持対象、直近Run、未完ToDo の3セクション
- 下段：直近エラー、監査イベント
- グラフはフラット棒グラフまたは円グラフのみ

#### `/clients`, `/jobs`, `/runs`, `/todos`
- 上部：ページタイトル + フィルタバー + 主アクション
- 本文：テーブル主体
- 補足：ステータス別サマリーカード
- モバイルはカード化して縦積み

#### `/jobs/[jobId]`
- 上部：求人サマリー
- 中央：現行版、履歴、鮮度、関連Run をタブまたは縦セクションで表示
- 右カラムまたは下段：関連ToDo / リスク / AI提案導線

#### `/jobs/[jobId]/edit`
- 左カラム：フォーム本体
- 右カラム：バリデーション、ヘルプ、関連マスタ、AI補助
- 依存項目はアコーディオンまたは条件表示

#### `/jobs/[jobId]/ai/[proposalId]`
- 上段：提案サマリー
- 中段：before / after 差分比較
- 下段：risk_checks と questions_for_human
- 最下段：採用 / 却下 / 部分採用の操作エリア

#### `/runs/[runId]`
- 上段：Runサマリー + 状態バッジ
- 中段：対象一覧 / 検証結果 / 生成ファイル / 実行手順
- 下段：証跡、結果取り込み、エラー一覧

### 5.3 共通レイアウト部品
- `PageHeader`
- `SectionCard`
- `StatCard`
- `FilterBar`
- `StatusBadge`
- `EmptyState`
- `ErrorBanner`
- `HelpPanel`
- `ProcessFlow`

---

## 6. コンポーネント詳細設計

### 6.1 StatusBadge
**props**
- `status: "draft" | "in_review" | "approved" | "applied" | "executing" | "done" | "failed" | "blocked" | "ai"`

**表示仕様**
- draft：ニュートラル
- in_review / executing：primary
- approved / done：secondary
- failed / blocked：accent2
- ai：accent3

### 6.2 DiffViewer
**用途**
- AI提案差分、版差分、出力前差分の表示

**仕様**
- 左: before
- 右: after
- 差分強調は背景色の淡色塗り
- 削除は赤系、追加は緑/セカンダリ系、AI提案起点は紫系ラベル追加

### 6.3 ProcessFlow
**用途**
- 会議→AI提案→承認→Run生成→アップロード→結果取り込み
- 鮮度維持フロー

**仕様**
- Desktop：左→右
- Narrow width：上→下
- 各ノードはアイコン + ラベル + 状態バッジ

### 6.4 DataChart
**種類**
- `FlatBarChart`
- `FlatPieChart`

**ルール**
- 3D表現禁止
- 強い影やグラデーション禁止
- 色はトークンからのみ選択
- 補助テキストまたは凡例を併記

### 6.5 FormField
**props**
- `label`
- `required`
- `description`
- `error`
- `inputKind`

**仕様**
- ラベル常時表示
- 説明は薄い文字色
- エラーは直下表示
- code系入力は select / combobox を優先

### 6.6 AIProposalCard
**用途**
- AIの要約・変更点・リスク・質問をまとまりで表示

**仕様**
- ヘッダーにAIラベル（accent3）
- bodyは `summary`, `changes`, `risk_checks`, `questions_for_human` の順
- 承認ボタンは primary、却下は secondary または danger 補助

---

## 7. データ設計（Neon/Postgres）

### 7.1 設計方針
- Airワーク項目は `payload_json`（JSONB）に集約
- 版（Revision）を必須とし、AI提案・承認・適用を追跡可能にする
- Run/ToDo/Auditを必須とし、運用の証跡を残す
- UI表示のため、airwork_fieldsに将来の表示メタデータ追加を許容する

### 7.2 テーブル一覧
#### 認証/権限
- organizations
- users
- sessions

#### CRM
- clients
- channel_accounts

#### Airワークマスタ
- airwork_fields
- airwork_codes
- airwork_locations

#### 求人
- jobs
- job_postings
- job_revisions

#### AI
- ai_proposals

#### 実行/運用
- runs
- run_items
- todos
- audit_logs

### 7.3 推奨カラム拡張（UI向け）
#### airwork_fields
- `group_key`
- `ui_order`
- `help_text`
- `placeholder`
- `is_advanced`
- `display_width`
- `depends_on_field_key`
- `depends_on_value`

#### todos
- `priority`
- `due_at`
- `evidence_blob_url`
- `ui_group`

#### runs
- `run_label`
- `summary_json`

---

## 8. 業務フロー（状態遷移）

### 8.1 JobRevision
- draft
- in_review
- approved
- rejected
- applied

### 8.2 Run
- draft
- file_generated
- executing
- done
- failed

### 8.3 ToDo
- open
- in_progress
- done
- blocked
- canceled

### 8.4 状態の視覚表現
| 状態 | 色 | 補足 |
|---|---|---|
| draft | neutral | 未確定 |
| in_review | primary | 確認中 |
| approved | secondary | 承認済み |
| applied | secondary | 適用済み |
| executing | primary | 実行中 |
| done | secondary | 完了 |
| failed | accent2 | 失敗 |
| blocked | accent2 | 停止 |
| ai | accent3 | AI関連 |

---

## 9. 処理設計（サーバー側）

### 9.1 Airワークマスタ取り込み
- 管理画面からCSVアップロード、またはseedで投入
- `spec_version` 更新時に差分通知対象を抽出
- UIでは変更点をアクセント-1で注意表示

### 9.2 求人インポート
- AirワークからダウンロードしたExcel/TSVを取り込む
- job_offer_id一致で既存紐付け
- 不一致は新規候補または要確認ToDo

### 9.3 AI提案生成
- 入力：会議メモ＋現行求人＋制約
- 出力：構造化JSON
- 失敗時：UI上で ErrorBanner 表示、既存画面遷移は維持

### 9.4 差分表示・承認
- before/after差分生成
- approved時に新revision作成
- audit_logs記録

### 9.5 Run生成
- approved revision から対象抽出
- バリデーション実施
- Blobへ保存
- sha256保存

### 9.6 入稿結果取り込み
- 結果ファイル解析
- run_items.validation_errorsへ格納
- 修正ToDo生成

---

## 10. 鮮度維持（14日超過）設計

### 10.1 前提
- publish_status等は一括入稿で直接変更できないため、ToDo運用とする

### 10.2 Cron
`GET /api/cron/freshness`

**処理**
1. `last_published_at` から `freshness_expires_at` 算出
2. 期限超過抽出
3. refresh計画作成
4. 新規postingとapproved revision複製
5. refresh Run作成
6. 同期ToDo作成

### 10.3 UI表示
- ダッシュボードに鮮度維持候補カードを表示
- 期限超過日はアクセント-1
- 期限切れはアクセント-2
- 対応済みはセカンダリ

---

## 11. API設計

### 11.1 認証
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/me

### 11.2 CRM
- GET/POST /api/clients
- GET/PATCH /api/clients/:id
- GET/PATCH /api/channel-accounts/:id
- GET/POST /api/clients/:id/locations

### 11.3 求人
- GET/POST /api/jobs
- GET /api/jobs/:id
- GET /api/job-postings/:id
- GET /api/job-postings/:id/revisions
- POST /api/job-postings/:id/revisions
- POST /api/job-revisions/:id/approve
- POST /api/job-revisions/:id/reject

### 11.4 AI
- POST /api/job-postings/:id/ai-proposals
- GET /api/ai-proposals/:id
- POST /api/ai-proposals/:id/apply

### 11.5 Run
- POST /api/runs
- POST /api/runs/:id/generate-file
- GET /api/runs/:id
- GET /api/runs/:id/download
- POST /api/runs/:id/mark-executing
- POST /api/runs/:id/complete

### 11.6 ToDo
- GET /api/todos
- POST /api/todos/:id/start
- POST /api/todos/:id/complete

### 11.7 Cron
- GET /api/cron/freshness

---

## 12. バリデーション設計

### 12.1 入力フォーム
- `airwork_fields` の制約に応じて検証
- 依存関係をUIで制御
- エラーはフィールド直下 + ページ上部サマリー表示

### 12.2 AI出力
- Zod等でスキーマ検証
- 不正時は保存せず再生成案内

### 12.3 ファイル生成
- code/idフィールド存在チェック
- update時の `job_offer_id` 空欄禁止

### 12.4 UI整合性検証
- デザイントークン外のカラー利用を禁止
- 状態バッジと意味の不一致を防ぐスナップショットテスト推奨
- グラフ種別は許可されたフラット表現のみ

---

## 13. セキュリティ・監査
- SecretsはサーバーENVのみ
- 媒体ログイン情報は原則平文保管しない
- 監査ログ対象：承認、Run生成、ToDo完了、重要設定変更
- Cronは User-Agent + 共有シークレットヘッダで保護

---

## 14. テスト設計

### 14.1 Unit
- コード値の文字列維持
- バリデーション（必須/依存関係）
- 差分生成
- AIレスポンスのスキーマ検証
- TSV生成
- Excel生成
- StatusBadgeの状態色マッピング
- DiffViewerの差分表示
- デザイントークン参照の整合性

### 14.2 Integration
- DB疎通
- Run生成→Blob保存→ダウンロード
- Cron実行→鮮度維持ToDo生成
- AI提案生成→承認→revision作成

### 14.3 E2E
- ログイン→求人編集→AI提案→承認→Run生成
- Run詳細→結果取り込み→ToDo発行
- ダッシュボードで状態反映確認

### 14.4 Visual Regression（推奨）
- ダッシュボード
- 求人編集
- AI提案差分
- Run詳細
- ToDo一覧
- 主要バッジとボタン

---

## 15. 受け入れ条件（Ver.2）
- 会議→AI提案→差分→承認→入稿ファイル生成が一連で完走できる
- コード/依存条件のバリデーションで入稿失敗率を下げられる
- 14日超の鮮度維持対象が自動検知され、Run/ToDoが作られる
- 手動工程はToDoで一元管理され、証跡が残る
- デザイン仕様が主要画面に一貫適用されている
- Secretsが漏洩しない（server-only）

---

## 16. 実装順序
1. DB（SQLで最小テーブル作成）
2. server-only env層＋DB接続層
3. デザイントークン定義（colors / status / spacing）
4. 共通UI部品（PageHeader, SectionCard, StatusBadge, DiffViewer）
5. 求人CRUD＋版管理
6. AI提案生成＋承認
7. Run生成＋Excel/TSV生成＋Blob保存
8. ToDo（手動工程）管理
9. 日次Cron（鮮度維持）
10. 結果取り込み（エラー解析）
11. Visual Regression / E2EでUI凍結確認


---

# DB Alignment Addendum (Actual Neon Schema Priority)

This addendum updates implementation expectations to match the current Neon database.

## Canonical table decision
- Use `client_meetings` as the live meeting-related table.
- Do not assume `meetings` exists in SQL or foreign key definitions unless a migration explicitly adds it.

## Canonical column decision
Use actual DB column names in implementation:
- org_id
- owner_name
- login_secret_encrypted
- memo
- value_constraints
- name_ja
- internal_title
- publish_status_cache
- file_format
- file_sha256
- actor_user_id

## Type/system notes
- `users.email` uses `citext`
- `airwork_codes.name_ja` is nullable in the live DB

## Coding rule
Application code may define domain aliases, but SQL and persistence-layer types must use actual DB names.
