# 実装計画書（Phase 1 実装済み後の残タスク 10PR）

## 1. 目的

本書は、Phase 1 の API 主線（会議登録 → AI 提案生成 → 承認 → job_revision 作成 → manual publish run 作成）が通った現状を前提に、次の 10 本の PR を **実装順で固定**する実行計画書である。  
以後の Codex 実装は本書の PR 単位を最小実装単位として扱い、Neon 実 DB 制約・Vercel デプロイ互換・server-only 秘密管理を崩さないことを最優先とする。

---

## 2. 適用前提（固定）

- フレームワーク: Next.js App Router + TypeScript
- 実行環境: Vercel（GitHub 連携）
- DB: Neon Postgres（live schema を正）
- DB アクセス: server-only（Route Handler / Server Action / server component）
- runtime: DB 利用 API は `nodejs`
- API 形式: `{ ok: true, ... }` / `{ ok: false, error: "..." }`
- SQL: 必ずパラメータ化、文字列連結禁止
- 入力検証: Zod を必須

---

## 3. Current Baseline（実装済みの事実）

Phase 1 時点で、以下は既に実装されている前提で次フェーズを分割する。

1. meeting creation API が配線済み
   - `POST /api/meetings`
2. proposal generation API が配線済み
   - `POST /api/job-postings/[jobPostingId]/ai-proposals`
3. approval → job_revision 作成が配線済み
   - `POST /api/ai-proposals/[proposalId]/approve`
   - 承認時に `job_revisions` を作成するクエリが存在
4. queue publish run 作成が配線済み
   - `POST /api/job-revisions/[revisionId]/queue-publish`
   - `runs` と `run_items` を作成
5. Gemini 連携（server-only）が導入済み
   - `src/lib/ai/gemini/**` 経由で提案生成
6. DB 制約で既に判明している値を踏んだ実装が存在
   - `job_revisions.source` は現実装で `"ai"` を使用
   - `runs.run_type` は現実装で `"update"` を使用
7. PowerShell 表示上の日本語文字化けはクライアント表示問題として扱い、DB 保存値（日本語テキスト自体）は有効であることを前提化済み

---

## 4. Execution Rules for Future Codex PRs

1. 既存 DB 制約値に必ず合わせる（推測値を増やさない）。
2. スキーマ追加は「必要性」「既存制約との整合」「移行手順」を確認できる場合のみ行う。
3. 差分は最小化し、1PR1目的を厳守する。
4. 秘密情報は server-only（`DATABASE_URL`/`NEON_DATABASE_URL`/`GEMINI_API_KEY` など）。
5. ローカル検証や I/O で UTF-8 安全な扱いを維持する（表示問題と保存問題を混同しない）。
6. 公開済みコンテンツを直接上書きしない。必ず revision を作成して反映する。
7. 外部公開導線は引き続き `runs` / `run_items` を経由する。

---

## 5. 10 PR Roadmap

> 依存関係は「前 PR 完了」を基本とする。後続 PR は先行 PR の API 契約を前提に実装する。

### PR1: 制約安全な定数・Enum 正規化（Phase 1 ハードニング）

- **Objective**
  - DB 制約に依存する値（status/source/run_type/action/channel/file_format）を定数化し、入力検証・クエリ・レスポンス整形の不一致を解消する。
- **Why / User Value**
  - 400/500 の偶発を減らし、以後の UI 接続時に値不一致バグを防ぐ。
- **Exact Scope**
  - 既存 API/クエリで文字列リテラル散在箇所を定数参照へ置換。
  - `src/lib/validators/schemas.ts` の enum/literal を DB 制約準拠で再定義。
  - `src/types/**` の型表現を定数と同期。
- **Out of Scope**
  - 新規機能追加、UI 追加、大規模ファイル移動。
- **Affected Areas / Files / Directories**
  - `src/lib/validators/schemas.ts`
  - `src/lib/db/queries/create-job-revision-from-proposal.ts`
  - `src/lib/db/queries/create-manual-publish-run.ts`
  - `src/lib/db/queries/**`（対象箇所のみ）
  - `src/types/**`
  - `Docs/implementation-plan.md`（必要なら参照更新のみ）
- **DB / Schema Impact**
  - なし（コード側整合のみ）。
- **API Impact**
  - 既存契約維持。バリデーションエラー文言は明確化。
- **UI Impact**
  - 直接変更なし。
- **Tests / Manual Verification**
  - `pnpm exec tsc --noEmit`
  - `pnpm lint`
  - 主要 API の正常/異常入力を curl で確認。
- **Dependencies**
  - なし（起点 PR）。
- **Risks / Rollback**
  - リテラル変更漏れによる runtime エラー。ロールバックは定数導入コミット単位で revert。
- **Acceptance Criteria**
  - 主要 DB 制約値が 1 か所で定義され、対象 API が同じ値集合を使用している。

### PR2: 承認フローの `job_postings` 反映強化（current revision / status 連動）

- **Objective**
  - proposal 承認時に `job_postings` 側へ current revision 参照と状態連動を実装する。
- **Why / User Value**
  - 「どの revision が現行か」を DB で一意に追跡でき、run 生成判断が安定する。
- **Exact Scope**
  - approve API 内のトランザクションを見直し、`job_revisions` 生成と `job_postings` 更新を同一整合単位にする。
  - 必要に応じ `job_postings` 参照用クエリを追加。
- **Out of Scope**
  - proposal ステータス履歴拡張（PR3 で実施）。
- **Affected Areas / Files / Directories**
  - `src/app/api/ai-proposals/[proposalId]/approve/route.ts`
  - `src/lib/db/queries/create-job-revision-from-proposal.ts`
  - `src/lib/db/queries/job-postings*.ts`（新規/更新）
  - `src/lib/validators/schemas.ts`
- **DB / Schema Impact**
  - 原則なし。既存列で実現不能な場合のみ、追加案を Docs に先出し（この PR では未 migration）。
- **API Impact**
  - approve レスポンスに `job_posting` の current revision 情報を追加（後方互換を保つ）。
- **UI Impact**
  - 直接変更なし（PR6/PR7 の表示基盤）。
- **Tests / Manual Verification**
  - approve 実行で `job_revisions` 作成 + `job_postings` 反映を DB 確認。
  - 二重承認時の挙動確認（安全に失敗/冪等）。
- **Dependencies**
  - PR1。
- **Risks / Rollback**
  - 更新対象列の誤認。ロールバックは approve 内追加 UPDATE を revert。
- **Acceptance Criteria**
  - 承認後、対象 job_posting から current revision が追跡可能。

### PR3: `ai_proposals` ステータスライフサイクル実装（状態遷移と検索）

- **Objective**
  - `ai_proposals` の状態遷移（generated / approved / rejected / applied 等）を API 一貫で扱う。
- **Why / User Value**
  - 提案の現在地を UI・運用双方で正確に把握できる。
- **Exact Scope**
  - review/approve/apply 系 API の更新ロジック統一。
  - 提案一覧・詳細クエリに status フィルタ/並び順を追加。
  - invalid transition を 409 で返す。
- **Out of Scope**
  - 差分 UI 改修（PR6）。
- **Affected Areas / Files / Directories**
  - `src/app/api/ai-proposals/**`
  - `src/lib/db/queries/get-ai-proposal-detail.ts`
  - `src/lib/db/queries/ai-proposals*.ts`（追加可）
  - `src/lib/validators/schemas.ts`
- **DB / Schema Impact**
  - 既存 `ai_proposals` 列で対応。必要時は enum 値のみ docs 明記（migration なし）。
- **API Impact**
  - 提案系 API に status 遷移ルールを追加。
- **UI Impact**
  - PR5/PR6 の表示条件が明確化。
- **Tests / Manual Verification**
  - 正常遷移・不正遷移テスト。
  - status フィルタ付き一覧取得確認。
- **Dependencies**
  - PR2。
- **Risks / Rollback**
  - 既存レコードの status 不整合。ロールバックは遷移バリデーションのみ段階無効化。
- **Acceptance Criteria**
  - 許可遷移のみ成功し、一覧/詳細で status が一貫表示される。

### PR4: proposal 読み取り API の堅牢化（review/read とエラー報告改善）

- **Objective**
  - proposal 関連 read/review API の入力検証、エラー分類、レスポンス整形を強化。
- **Why / User Value**
  - UI 接続時の障害切り分けが容易になり、運用中の調査コストが下がる。
- **Exact Scope**
  - 404/409/422/500 の返却基準を明示・統一。
  - `ok: false` の `error` 文言と `code`（必要最小限）を統一。
  - org 境界チェックの抜け漏れ補強。
- **Out of Scope**
  - 新しい業務ロジック追加。
- **Affected Areas / Files / Directories**
  - `src/app/api/ai-proposals/**`
  - `src/app/api/job-revisions/**`
  - `src/lib/auth/**`（必要時）
  - `src/lib/validators/schemas.ts`
- **DB / Schema Impact**
  - なし。
- **API Impact**
  - エラー応答契約を安定化（breaking 回避）。
- **UI Impact**
  - PR5/PR6 でのエラー表示が実装しやすくなる。
- **Tests / Manual Verification**
  - 不正 UUID / 他 org / 不正状態で API 応答を確認。
  - 主要 route の snapshot 的レスポンス確認。
- **Dependencies**
  - PR3。
- **Risks / Rollback**
  - エラー code 追加が既存 UI 互換に影響。ロールバックは code を optional 化。
- **Acceptance Criteria**
  - proposal 関連 API が統一的なエラー契約で返る。

### PR5: Meeting 登録 UI + Proposal 生成 UI 接続

- **Objective**
  - 会議登録から提案生成までの UI 導線を `/meetings/new`・ジョブ画面から操作可能にする。
- **Why / User Value**
  - 現在 API でしか使えないフローを運用担当が画面から実行できる。
- **Exact Scope**
  - 会議登録フォーム（Zod 準拠）
  - proposal 生成トリガ UI（thinking_level/model 指定）
  - 成功後の proposal 詳細遷移
- **Out of Scope**
  - proposal 差分レビュー UI（PR6）。
- **Affected Areas / Files / Directories**
  - `src/app/meetings/new/page.tsx`
  - `src/app/jobs/[jobId]/ai/**`
  - `src/components/**`（フォーム/状態表示の再利用範囲）
  - `src/lib/validators/schemas.ts`（UI 入力との整合）
- **DB / Schema Impact**
  - なし。
- **API Impact**
  - 既存 API を利用（必要なら軽微なレスポンス項目追加）。
- **UI Impact**
  - meetings/proposal 生成導線を追加。
- **Tests / Manual Verification**
  - 画面操作で meeting 作成 → proposal 生成の完走確認。
  - 空入力/不正入力時のエラー表示確認。
- **Dependencies**
  - PR4。
- **Risks / Rollback**
  - フォーム state 不整合。ロールバックは新規 UI ルート単位で revert。
- **Acceptance Criteria**
  - UI から meeting 登録と proposal 生成が成功し、生成結果へ遷移できる。

### PR6: Proposal diff/review UI + 承認 UI 接続

- **Objective**
  - proposal の before/after diff、承認/却下/部分採用（仕様範囲内）を UI で実行可能にする。
- **Why / User Value**
  - AI 出力を人間レビュー前提で安全に扱える。
- **Exact Scope**
  - proposal 詳細画面でサマリ・diff・リスクメモを表示。
  - approve/reject 操作を API 接続。
  - 承認成功時に生成 revision 情報を表示。
- **Out of Scope**
  - publish run 画面統合（PR7）。
- **Affected Areas / Files / Directories**
  - `src/app/jobs/[jobId]/ai/[proposalId]/page.tsx`
  - `src/components/DiffViewer*`（存在時）
  - `src/components/StatusBadge*`
  - `src/app/api/ai-proposals/**`（必要な軽微拡張のみ）
- **DB / Schema Impact**
  - なし。
- **API Impact**
  - review/approve API 利用、必要なら表示補助項目追加。
- **UI Impact**
  - proposal レビュー体験を実装。
- **Tests / Manual Verification**
  - approve/reject 操作と status 反映確認。
  - diff 表示の日本語崩れが保存値由来でないことを確認。
- **Dependencies**
  - PR5。
- **Risks / Rollback**
  - 差分表示ロジック誤差。ロールバックは表示専用コンポーネントを分離 revert。
- **Acceptance Criteria**
  - proposal 詳細画面でレビュー・承認操作が完結する。

### PR7: manual publish queue UI + Run 可視化強化

- **Objective**
  - 承認 revision から queue-publish を UI 実行し、run 作成結果を runs 画面で追跡しやすくする。
- **Why / User Value**
  - API 手打ち不要で運用フローが連続化する。
- **Exact Scope**
  - revision 画面に「queue publish」操作を追加。
  - run 一覧/詳細に起点情報（job/revision/proposal）を明示。
  - run_items の最小可視化改善。
- **Out of Scope**
  - 自動 execute ワーカー実装。
- **Affected Areas / Files / Directories**
  - `src/app/jobs/[jobId]/revisions/[revId]/page.tsx`
  - `src/app/runs/page.tsx`
  - `src/app/runs/[runId]/page.tsx`
  - `src/app/api/job-revisions/[revisionId]/queue-publish/route.ts`
  - `src/lib/db/queries/run-detail.ts`
- **DB / Schema Impact**
  - なし。
- **API Impact**
  - queue-publish 応答に run/run_item 要約を含める。
- **UI Impact**
  - queue 操作と run 可視化を追加。
- **Tests / Manual Verification**
  - UI から queue 実行 → runs 一覧/詳細反映を確認。
  - 同 revision 二重 queue の扱いを確認。
- **Dependencies**
  - PR6。
- **Risks / Rollback**
  - 重複 run 発生。ロールバックは UI ボタンを feature-flag 相当で非表示化。
- **Acceptance Criteria**
  - 承認 revision から run 作成と可視化が UI で完結する。

### PR8: Gemini 入力強化（現行 revision 文脈）と diff 品質改善

- **Objective**
  - proposal 生成時に current revision / 現在掲載情報を文脈注入し、差分品質を改善する。
- **Why / User Value**
  - 不要変更や幻覚差分を減らし、レビュー負荷を下げる。
- **Exact Scope**
  - 生成プロンプト組み立てに現行 revision payload を追加。
  - 変更点抽出（diff summary）を deterministic に整形。
  - 生成失敗時の再試行方針を最小実装（1 回まで等）で明示。
- **Out of Scope**
  - モデル切替基盤の大規模化。
- **Affected Areas / Files / Directories**
  - `src/lib/ai/gemini/**`
  - `src/app/api/job-postings/[jobPostingId]/ai-proposals/route.ts`
  - `src/lib/db/queries/job-detail.ts` または revision 取得クエリ
  - `Docs/`（プロンプト方針の追記）
- **DB / Schema Impact**
  - なし。
- **API Impact**
  - proposal 生成レスポンスに diff quality 判定用メタを追加可（後方互換）。
- **UI Impact**
  - PR6 の diff 表示品質向上。
- **Tests / Manual Verification**
  - 同一入力で差分過多が減ることをサンプル比較。
  - 生成失敗時のハンドリング確認。
- **Dependencies**
  - PR7。
- **Risks / Rollback**
  - プロンプト変更で出力劣化。ロールバックは旧プロンプトテンプレへ即時復帰。
- **Acceptance Criteria**
  - 現行 revision を踏まえた提案生成が行われ、diff の妥当性が目視で改善。

### PR9: 監査ログ / 冪等性 / 再試行安全性の横断強化

- **Objective**
  - meeting→proposal→approve→queue の全 API に監査ログ・冪等防護・再試行安全策を入れる。
- **Why / User Value**
  - 本番運用時の二重実行や障害復旧時の事故を予防できる。
- **Exact Scope**
  - 主要 mutate API で監査ログ統一（actor/action/target/detail）。
  - 重複実行検出キーの導入（ヘッダ/ボディいずれか）と最小実装。
  - 再送時の安全応答（既処理なら既存結果を返す）。
- **Out of Scope**
  - 非同期ワーカー全体再設計。
- **Affected Areas / Files / Directories**
  - `src/app/api/meetings/route.ts`
  - `src/app/api/job-postings/[jobPostingId]/ai-proposals/route.ts`
  - `src/app/api/ai-proposals/[proposalId]/approve/route.ts`
  - `src/app/api/job-revisions/[revisionId]/queue-publish/route.ts`
  - `src/lib/db/queries/audit*.ts`（必要なら追加）
- **DB / Schema Impact**
  - 原則なし。必要なら既存 `audit_logs.detail` 活用で完結。
- **API Impact**
  - 冪等時のレスポンスコード/メッセージを明確化。
- **UI Impact**
  - エラー表示の解像度向上（PR5-7 の UX 改善）。
- **Tests / Manual Verification**
  - 同一 payload 連打時の重複抑止確認。
  - 監査ログに主要操作が残ることを確認。
- **Dependencies**
  - PR8。
- **Risks / Rollback**
  - 厳格化しすぎで通常操作が弾かれる。ロールバックは idempotency 判定を optional 化。
- **Acceptance Criteria**
  - 主要 mutate API が再試行に対して安全かつ監査可能。

### PR10: freshness 自動化準備（接続フック整備）

- **Objective**
  - 後続フェーズで freshness 自動化を接続できるよう、検知・候補化・ToDo 化のフックを追加する。
- **Why / User Value**
  - 14 日超過運用の導入コストを下げ、次フェーズへの移行を滑らかにする。
- **Exact Scope**
  - freshness 判定対象取得クエリの追加（read-only）。
  - API フック（例: `/api/freshness/targets`）を最小実装。
  - run/proposal と接続するためのインターフェース（stub）を docs とコードで定義。
- **Out of Scope**
  - 自動 proposal 作成・自動 publish 実行。
- **Affected Areas / Files / Directories**
  - `src/lib/db/queries/freshness*.ts`（新規）
  - `src/app/api/freshness/**`（新規）
  - `src/app/todos/**`（必要なら表示フックのみ）
  - `Docs/phase-plan.md`
  - `Docs/implementation-plan.md`
- **DB / Schema Impact**
  - 既存列で判定可能な範囲で実装。列不足時は docs に「追加候補」を記載し、PR 内 migration は行わない。
- **API Impact**
  - freshness 対象参照 API を追加（内部運用向け）。
- **UI Impact**
  - 必要最小限（候補件数表示程度）。
- **Tests / Manual Verification**
  - 14 日閾値判定の境界日テスト。
  - API 返却内容が ToDo 生成前提で利用可能か確認。
- **Dependencies**
  - PR9。
- **Risks / Rollback**
  - 閾値解釈ミス。ロールバックは freshness API を内部 feature flag 扱いで無効化。
- **Acceptance Criteria**
  - freshness 後続開発で再利用可能な対象取得 API/クエリが揃う。

---

## 6. 完了定義（この計画書の運用ルール）

- 各 PR は本書記載の Scope を超えない。
- 追加対応が必要な場合は、該当 PR の「Out of Scope」から切り出して次 PR に明示移送する。
- 実装完了時は最低限以下を実施する。
  - `pnpm exec tsc --noEmit`
  - `pnpm lint`
- 仕様変更が発生した場合は `Docs/implementation-plan.md` と関連 Docs を同一 PR で更新する。
