# 詳細設計書（Ver.1）
Airワーク一括入稿（Excel/TSV）× AI改善提案 × 更新運用自動化システム

---

## 0. ドキュメント情報
- 文書名：詳細設計書（Ver.1）
- 作成日：2026-02-07
- 版：0.1
- 前提：
  - デプロイ：Vercel
  - リポジトリ：GitHub（PR運用）
  - DB：Neon（Postgres）
  - ファイル：Vercel Blob（生成ファイル/結果ファイル/証跡）
  - AI：Gemini Flash 3.0（サーバー側呼び出し）
  - 対象媒体：Airワーク（Ver.1固定）

---

## 1. 目的・範囲

### 1.1 目的
- 求人更新代行の運用負荷を「媒体手入力」から「データ一元管理＋一括出力＋実行支援」に移行する。
- 会議メモ→AI提案→承認→一括更新のループを標準化し、改善の再現性を上げる。
- 掲載から14日超過した求人を“鮮度維持対象”として検知し、未掲載化→複製→新規掲載の運用を継続的に回せる状態にする（Ver.1はToDo化＋証跡で成立）。

### 1.2 Ver.1スコープ
- CRM：顧客、媒体アカウント、運用メモ
- 求人管理：入力フォーム、版管理（draft/review/approved/applied）
- AI提案：Gemini Flash 3.0、構造化出力、差分表示、承認
- 一括更新：Run生成、Excel/TSVファイル生成、手順チェックリスト、証跡保存
- 鮮度維持：日次Cron検知→実行計画（ToDo）生成
- 結果取り込み：入稿結果ファイル取り込み、エラー可視化、修正ToDo化

### 1.3 非スコープ（Ver.1ではやらない）
- Airワーク以外の媒体統合
- Airワーク画面操作の完全自動化（RPA/ブラウザ自動操作）
- publish_status 等 “入稿で直接制御できない”項目の自動変更
- 有料広告・写真一括など入稿対象外領域の完全自動化

---

## 2. 外部仕様（Airワーク一括入稿）を前提にした設計上の制約

### 2.1 新規／更新の分岐
- 新規：job_offer_id（求人番号）空欄で出力
- 更新：job_offer_id を保持して出力
- 事故防止：DBで job_offer_id を厳密に保持し、生成時に「意図せぬ空欄化」を禁止する。

### 2.2 コード値厳密性
- コード値はゼロ埋め等を含むため、数値化せず文字列で保持する。
- UIは select（コードマスタ参照）を優先し、自由入力を極力排除する。

### 2.3 入力不可項目の扱い
- Airワーク一括入稿で入力不可な項目は、DBに“参照専用キャッシュ”として保持し、生成時には上書きしない。
- 未掲載化/掲載/再掲載が必要な場合は「ToDo（手動工程）」として運用に落とす。

### 2.4 大量更新の分割
- 生成ファイルはサイズ/件数で分割できる設計を持つ（Run分割）。
- Runは「顧客×媒体×日付×タイプ（update/refresh）」の単位で管理する。

---

## 3. システム構成

### 3.1 技術スタック
- Next.js（App Router） + TypeScript
- Node runtime（DB/Blob/AIはserver-only）
- Neon（Postgres）
- Vercel Blob（ファイル保管）
- Gemini Flash 3.0（サーバー側呼び出し）
- Vercel Cron（鮮度維持ジョブ）

### 3.2 環境変数（server-only）
- DATABASE_URL（runtime）
- DATABASE_URL_UNPOOLED（migration/admin）
- BLOB_READ_WRITE_TOKEN
- GEMINI_API_KEY

※ すべてVercel環境変数で管理。repoには`.env.example`のみ。

---

## 4. 画面設計（ルーティングとUI責務）

### 4.1 画面一覧（推奨ルート）
#### 認証
- `/login`：ログイン（roleで制御）
- `/logout`：ログアウト

#### ダッシュボード
- `/`：未完ToDo、直近Run、鮮度維持対象のサマリ

#### CRM
- `/clients`：顧客一覧
- `/clients/[clientId]`：顧客詳細（基本情報・運用メモ）
- `/clients/[clientId]/channels`：媒体アカウント管理（Airワーク）
- `/clients/[clientId]/locations`：勤務地マスタ管理（working_location_id等）

#### 求人
- `/jobs`：横断求人一覧（顧客フィルタ、鮮度期限、差分あり）
- `/clients/[clientId]/jobs`：顧客別求人一覧
- `/jobs/[jobId]`：求人詳細（現行版、履歴、鮮度）
- `/jobs/[jobId]/edit`：入力フォーム（Airワーク項目にマッピング）
- `/jobs/[jobId]/revisions`：版一覧
- `/jobs/[jobId]/revisions/[revId]`：版詳細・差分

#### AI提案
- `/meetings`：会議ログ一覧
- `/meetings/new`：会議ログ作成
- `/jobs/[jobId]/ai`：AI提案生成
- `/jobs/[jobId]/ai/[proposalId]`：提案差分・承認

#### 実行（Run）/プレビュー
- `/runs`：Run一覧
- `/runs/[runId]`：Run詳細（DL・手順・証跡・結果取り込み）
- `/runs/[runId]/preview`：出力前差分プレビュー（項目単位）

#### ToDo（手動工程管理）
- `/todos`：ToDo一覧（open/in_progress/done）
- `/todos/[todoId]`：手順・証跡添付・完了

#### 設定/マスタ
- `/settings/airwork-fields`：項目定義（編集不可/可、制約、順序）
- `/settings/airwork-codes`：コード一覧（有効/無効）
- `/settings/users`：ユーザー管理
- `/settings/audit`：監査ログ閲覧

---

## 5. データ設計（Neon/Postgres）

### 5.1 設計方針
- Airワーク項目は変更に追従できるよう、内容は `payload_json`（JSONB）に集約。
- 版（Revision）を必須とし、AI提案・承認・適用を追跡可能にする。
- Run/ToDo/Auditを必須とし、運用の証跡を残す。

### 5.2 テーブル一覧（Ver.1最小）
#### 認証/権限
- organizations
- users（role含む）
- sessions（採用する方式次第）

#### CRM
- clients
- channel_accounts（Airワーク）

#### Airワークマスタ
- airwork_fields（field_key, label_ja, input_kind, is_editable, constraints, sort_order, spec_version）
- airwork_codes（field_key, code, name_ja, is_active）
- airwork_locations（client別：working_location_id, name）

#### 求人
- jobs（社内求人）
- job_postings（媒体インスタンス：job_offer_id）
- job_revisions（版管理：payload_json, payload_hash, status, approved_by/at）

#### AI
- ai_proposals（input_prompt, model, output_json）

#### 実行/運用
- runs（run_type, format, file_blob_url, sha256）
- run_items（job_revision参照、create/update、validation_errors）
- todos（手動工程：未掲載化/再掲載/アップロード/同期など）
- audit_logs（監査）

### 5.3 JSONB仕様（主要）
#### job_revisions.payload_json（例）
- `job_offer_id`（文字列、更新時必須）
- `title`
- `subtitle`
- `description`
- `job_type`（コード）
- `working_location_id`（コード/ID）
- `salary_min`, `salary_max`（文字列推奨：ゼロ埋め/表記揺れ対策）
- `work_time_*`（勤務時間系）
- `features_*`（特徴ID一覧）

#### ai_proposals.output_json（例）
```json
{
  "summary": "改善方針の要約",
  "changes": [
    { "field_key": "title", "before": "...", "after": "...", "reason": "..." }
  ],
  "risk_checks": [
    { "type": "compliance", "message": "断定表現がないか確認" }
  ],
  "questions_for_human": [
    "給与レンジは実態に合っていますか？"
  ]
}
```

---

## 6. 業務フロー（状態遷移）

### 6.1 JobRevision 状態遷移

- draft（編集/AI提案反映前の下書き）
- in_review（レビュー待ち）
- approved（承認済み：Run対象）
- rejected（却下）
- applied（Runで出力に採用済み）

ルール：

- 1つの job_posting に対して、原則 “最新approved” が現行。
- Run生成時は approved の revision を参照する。

### 6.2 Run 状態遷移

- draft（対象選択/検証中）
- file_generated（ファイル生成済み・DL可能）
- executing（Airワーク側でアップロード実行中）
- done（実行完了＋証跡確認）
- failed（失敗・エラー取り込み待ち）

### 6.3 ToDo 状態遷移

- open → in_progress → done
- blocked/canceled を用意（顧客確認待ち等）

---

## 7. 処理設計（サーバー側）

### 7.1 Airワークマスタ取り込み

初期投入手段：

- 方式A：管理画面からCSVアップロード→airwork_fields/codesへ投入
- 方式B：repo同梱seed→投入（運用が固まってから）

仕様変更時：

- spec_version を更新し、変更差分を通知（運用ToDo発行）

### 7.2 求人インポート（Airワークから取り込み）

入力：AirワークからダウンロードしたExcel/TSV

マッチング：

- job_offer_idがある行は job_postings.job_offer_id で紐付け
- ない場合は新規候補として扱い、手動確認（ToDo）で紐付け

### 7.3 AI提案生成（Gemini Flash 3.0）

入力：会議メモ＋現行求人＋制約

出力：構造化JSON（changes/risk_checks/questions）

例外：

- APIキー未設定：実行時エラー（UIは落とさずエラー表示）
- 応答不正：スキーマ検証で弾き、再生成を促す

### 7.4 差分表示・承認

差分生成：

- 現行approvedのpayload_json と AI提案 after を比較し、フィールド単位差分を生成

承認時：

- job_revisions に新rev（source=ai, status=approved）を作成
- audit_logsに記録

### 7.5 Run生成（update/refresh）

入力：clientId, run_type, format(xlsx/txt), 対象条件（差分あり/鮮度超過など）

対象抽出：

- update：approved revision があり、かつ差分ありの求人
- refresh：鮮度維持対象（後述）により生成された新規posting（job_offer_id null）

バリデーション：

- コード値の存在チェック（airwork_codes/locations）
- 編集不可項目は除外（参照のみ）
- 条件依存項目は矛盾除去（警告）

出力：

- file_blob_url を発行して Blobへ保存
- sha256 を保存し改ざん検知

### 7.6 入稿結果取り込み（エラー解析）

入力：Airワーク側の結果ファイル（zip/txt等）

解析：

- 求人単位に不備項目と内容を抽出し run_items.validation_errors に保存

運用：

- 修正が必要な求人に対して ToDo（修正→再生成）を発行

---

## 8. 鮮度維持（14日超過）設計

### 8.1 前提

publish_status等を一括入稿で直接変更できないため、未掲載化/再掲載はToDoで運用する（Ver.1）。

### 8.2 Cron（毎日）

GET /api/cron/freshness

処理：

1. job_postings.last_published_at を基に freshness_expires_at を算出（= +14日）
2. 期限超過を抽出し is_refresh_candidate = true に更新
3. refresh計画を作る：
   - 旧postingの未掲載化 ToDo
   - 新規postingを作成（job_offer_id null）
   - 最新approved revisionを複製し、新規postingのapproved revisionとして登録
   - refresh Run を作成（action=create）
   - 新規掲載後に job_offer_id を取り込む同期ToDo

---

## 9. API設計（Route Handlers / Server Actions）

### 9.1 認証

- POST /api/auth/login
- POST /api/auth/logout
- GET /api/me

### 9.2 CRM

- GET/POST /api/clients
- GET/PATCH /api/clients/:id
- GET/PATCH /api/channel-accounts/:id
- GET/POST /api/clients/:id/locations

### 9.3 求人

- GET/POST /api/jobs
- GET /api/jobs/:id
- GET /api/job-postings/:id
- GET /api/job-postings/:id/revisions
- POST /api/job-postings/:id/revisions（draft作成）
- POST /api/job-revisions/:id/approve
- POST /api/job-revisions/:id/reject

### 9.4 AI

- POST /api/job-postings/:id/ai-proposals
- GET /api/ai-proposals/:id
- POST /api/ai-proposals/:id/apply（approved revision作成）

### 9.5 Run（生成）

- POST /api/runs
- POST /api/runs/:id/generate-file
- GET /api/runs/:id
- GET /api/runs/:id/download
- POST /api/runs/:id/mark-executing
- POST /api/runs/:id/complete

### 9.6 ToDo

- GET /api/todos
- POST /api/todos/:id/start
- POST /api/todos/:id/complete（証跡URL添付）

### 9.7 Cron

- GET /api/cron/freshness（Vercel Cron起動）

保護：

- User-Agentチェック（vercel-cron）
- 追加で共有シークレットヘッダ等（推奨）

---

## 10. バリデーション設計（入力・出力）

### 10.1 入力フォーム

- airwork_fields.value_constraints に応じて検証（maxLength、pattern等）
- 依存関係（相互排他）をUIで制御し、payloadに矛盾値が入らないようにする

### 10.2 AI出力

- output_json をZod等でスキーマ検証
- 不正なら保存せず、再生成/修正を促す

### 10.3 ファイル生成

- code/idフィールドは必ず存在チェック
- job_offer_idの意図せぬ空欄化を禁止（updateなのに空欄はブロック）

---

## 11. セキュリティ・監査

### 11.1 Secrets

- すべてサーバーENV（Vercel）で管理
- クライアントへ出さない（server-only）

### 11.2 媒体ログイン情報

原則：平文保管しない

保存する場合：

- 暗号化保管（AES-GCM等）
- 監査ログに閲覧/更新の記録

### 11.3 監査ログ（audit_logs）

- 承認、Run生成、ToDo完了、重要設定変更を必ず記録

---

## 12. テスト設計（最小）

### 12.1 Unit

- コード値の文字列維持（ゼロ埋め崩れ防止）
- バリデーション（必須/依存関係）
- 差分生成
- AIレスポンスのスキーマ検証
- TSV生成（UTF-8、タブ区切り、改行処理）
- Excel生成（列順、欠損、型）

### 12.2 Integration

- DB疎通（health/db）
- Run生成→Blob保存→ダウンロード
- Cron実行→鮮度維持ToDo生成

### 12.3 E2E（任意）

- ログイン→求人編集→AI提案→承認→Run生成

---

## 13. 受け入れ条件（Ver.1）

- 会議→AI提案→差分→承認→入稿ファイル生成が一連で完走できる
- コード/依存条件のバリデーションで入稿失敗率を下げられる
- 14日超の鮮度維持対象が自動検知され、Run/ToDoが作られる
- 手動工程はToDoで一元管理され、証跡が残る
- Secretsが漏洩しない（server-only）

---

## 14. 実装順序（DB → 処理 → 画面）

1. DB（SQLで最小テーブル作成）
2. server-only env層＋DB接続層
3. 求人CRUD＋版管理
4. AI提案生成＋承認
5. Run生成＋Excel/TSV生成＋Blob保存
6. ToDo（手動工程）管理
7. 日次Cron（鮮度維持）
8. 結果取り込み（エラー解析）
9. UI導線（CRM → 求人 → AI → Run/ToDo）
