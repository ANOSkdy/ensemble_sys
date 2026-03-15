# フェーズ実装計画（3フェーズ固定）

## Phase 1: Meeting → AI proposal → approval → revision → manual publish run

### Objective
会議起点の提案～承認～版確定～手動実行run作成までを一気通貫で成立させる。

### In Scope
- `client_meetings` 登録API
- `ai_proposals` 生成API（Gemini server-only）
- proposalレビュー（approve/reject/partial）
- 承認時 `job_revisions` 作成
- approved revision から manual run 作成
- runファイル生成（Blob保存）

### Out of Scope
- Airwork公開の自動実行
- freshness完全自動化
- 高度な再試行制御

### Required Schema/API/Worker Changes
- Schema: `ai_proposals.status`, `ai_proposals.approved_revision_id`（推奨）
- API:
  - `POST /api/meetings`
  - `POST /api/job-postings/:id/ai-proposals`
  - `POST /api/ai-proposals/:id/review`
  - `POST /api/ai-proposals/:id/apply`
  - `POST /api/runs`, `POST /api/runs/:id/generate-file`
- Worker: なし（manual運用）

### Risks
- 提案品質ばらつき
- partial採用時の差分適用ミス
- run対象選択ミス

### Completion Criteria
- 会議登録から run作成までUI/APIで完走
- 承認なしでpublish対象が作れない
- 生成ファイルが run に紐づいて監査可能

---

## Phase 2: Safe Airwork publishing integration and execution reliability

### Objective
runベース公開を安全に実行できる adapter / worker / 冪等実行基盤を整備する。

### In Scope
- publish adapter インターフェース導入
- Airwork adapter 実装
- `runs/:id/execute` と実行状態更新
- `run_items` 結果記録（成功/失敗/理由）
- idempotency key による重複実行防止
- channel credential 抽象化（`credential_ref` 優先）

### Out of Scope
- 他媒体アダプタ追加
- RPA型のブラウザ自動運用
- 自動最適化アルゴリズム

### Required Schema/API/Worker Changes
- Schema:
  - `channel_accounts.credential_ref`（推奨）
  - `runs.idempotency_key`, `runs.execution_error`（推奨）
  - `run_items.result_status`, `run_items.error_detail`, `run_items.retry_count`（推奨）
- API:
  - `POST /api/runs/:id/execute`
  - `POST /api/runs/:id/import-result`
- Worker:
  - queued run 実行ワーカー（node runtime）

### Risks
- 資格情報取り扱い不備
- 外部障害時の再試行暴走
- 部分成功時の整合性崩れ

### Completion Criteria
- 1 run の end-to-end 実行が監査可能
- 同一 run の多重実行が抑止される
- 失敗アイテムが run_items 単位で再実行可能

---

## Phase 3: Full freshness automation and operational scaling

### Objective
14日freshnessを運用定着させ、提案生成・ToDo作成・実行キュー投入を自動化する。

### In Scope
- `/api/cron/freshness` 本体実装
- freshness判定と `is_refresh_candidate` 更新
- ルールに応じた proposal queue / ToDo 自動生成
- freshness関連ダッシュボード指標拡張
- 運用SLOに合わせたバッチ監視

### Out of Scope
- AI自動承認
- 完全無人publish
- 大規模アーキテクチャ刷新

### Required Schema/API/Worker Changes
- Schema:
  - `job_postings.freshness_detected_at`, `job_postings.next_refresh_due_at`（推奨）
  - proposal queue 用テーブル（必要なら追加）
- API:
  - `GET /api/cron/freshness`
  - freshness結果参照API（任意）
- Worker:
  - freshness queue 消費ワーカー（proposal生成/ToDo発行）

### Risks
- 過検知によるToDo過多
- cron重複実行
- 運用者アラート疲れ

### Completion Criteria
- freshness検知→候補化→アクション生成が日次で安定稼働
- 14日超過求人の取りこぼしが監査ログ上ゼロ
- 運用指標（件数/遅延/失敗率）がダッシュボードで追跡可能
