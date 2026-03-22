# 実装タスク手順書（Phase 1 残作業中心）

## Purpose and scope

本書は、`ensemble_sys` の Phase 1 現状実装を前提に、基本設計書（`Docs/design/basic-design-v2.md`）・詳細設計書（`Docs/design/detailed-design-v2.md`）・フェーズ計画（`Docs/phase-plan.md`）と整合する形で、残作業を **優先度・依存関係・実装順・確認方法** 付きで実行可能タスクへ分解した実装手順書である。

- 対象: Next.js App Router + TypeScript + Neon Postgres + Vercel Blob + Gemini Flash（server-only）
- 方針: 最小差分、段階実装、監査可能性優先
- 非対象: 本書内では大規模リファクタや UI 全面刷新は扱わない

---

## Current completed state (what is already working)

Phase 1 主線として、以下 API のローカル検証での疎通実績を完了済みとして扱う。

- ✅ `POST /api/meetings` works
- ✅ `POST /api/meetings/[meetingId]/generate-proposals` works
- ✅ `GET /api/ai-proposals/[proposalId]` works
- ✅ `POST /api/ai-proposals/[proposalId]/approve` works
- ✅ `POST /api/job-revisions/[revisionId]/queue-publish` works
- ✅ `GET /api/runs/[runId]` works

補足（実装観点）:
- meeting → proposal → approve → run 作成の API レベル主線は成立
- Gemini 提案生成は server-only で接続済み
- run/read 系は最低限の参照導線あり

---

## DB constraints and known schema rules discovered from the live schema

必須制約（実装時に厳守）:

- `job_revisions.source` は `manual | ai` のみ
- `runs.run_type` は `update | refresh` のみ
- `job_revisions.payload_hash` は必須
- JSON リクエスト本文は UTF-8 前提（日本語の PowerShell / ローカル検証で文字化け注意）

加えて、実 DB 名優先ポリシーを維持すること（例: `org_id`, `owner_name`, `client_meetings` など）。

---

## API routes already implemented vs still needed

### Already implemented (確認済み/存在確認)

- `POST /api/meetings`
- `POST /api/meetings/[meetingId]/generate-proposals`
- `GET /api/ai-proposals/[proposalId]`
- `POST /api/ai-proposals/[proposalId]/approve`
- `POST /api/job-revisions/[revisionId]/queue-publish`
- `GET /api/runs/[runId]`
- 付随: `GET /api/runs`, `GET /api/jobs`, `GET /api/clients`, `GET /api/todos`

### Still needed / hardening needed

- `ai_proposals` の状態遷移 API（review/apply の分離または approve の拡張）
- `job_postings` への「承認済み current revision」反映 API（安全更新）
- 監査ログ不足箇所への追記（proposal 生成/承認、publish queue）
- Phase 1 API 一連フローのテスト用補助 endpoint または fixture 整備
- Phase 2 で必要な execute/import-result 系 API の設計確定（本実装は Phase 2）

---

## UI tasks still needed

最小 UI（Phase 1 完遂のため）:

1. 会議作成画面（meeting note 登録）
2. 提案レビュー画面（summary / before-after diff / approve）
3. 承認後キュー投入 UI（queue-publish）
4. Run 詳細画面での対象・状態可視化

画面方針:
- 既存コンポーネント（`PageHeader`, `SectionCard`, `StatusBadge`, `DiffViewer`）を優先利用
- ビジネスロジックは route handler / server action に集約
- エラーは `{ ok: false, error }` を UI 下部に明示表示

---

## Gemini integration hardening tasks

1. **入力コンテキスト強化**
   - 現行 job revision（最新 approved）を取得し、提案生成に必ず同梱
   - before/after diff 精度を上げるため、proposal 保存前にサーバー側正規化
2. **出力検証強化**
   - Gemini 出力 JSON を Zod で検証
   - 不正形式時は proposal を保存せず `ok: false` を返却
3. **監査性向上**
   - prompt version / model / request hash を audit または proposal metadata に保持
4. **安全弁**
   - 長文入力時のトークン上限・切り詰めポリシーを明文化

---

## Remaining implementation tasks grouped by Phase 1 / Phase 2 / Phase 3

### Phase 1（最優先: API 完成度 + 最小 UI + 監査）

#### P1-1: `job_postings` を安全に approved revision 参照へ更新
- Objective: 承認済み revision を publish 対象として一意に参照可能にする
- Target: `src/app/api/ai-proposals/[proposalId]/approve`, `src/lib/db/**`
- Expected changes:
  - トランザクション内で revision 作成 + posting 側参照更新（または publish 時参照確定）
  - `payload_hash` 必須チェック
- Validation:
  - approve → posting 参照更新が同時成功/同時失敗
  - 異常系で部分更新なし
- Risk:
  - 既存 publish 判定ロジックとの競合

#### P1-2: `ai_proposals` status lifecycle の実装/整合
- Objective: `draft/in_review/approved/rejected/applied` の遷移整合を担保
- Target: proposal 関連 route + validator + DB helper
- Expected changes:
  - 許可遷移外更新を拒否
  - `approved_revision_id` の扱いを統一
- Validation:
  - 各遷移の正常/異常テスト
- Risk:
  - 既存 `approve` endpoint 互換性

#### P1-3: 最小 UI 接続（meeting / proposal / approve / queue）
- Objective: API 主線を UI から手動完走可能にする
- Target: `src/app/meetings/**`, `src/app/jobs/[jobId]/ai/**`, `src/app/runs/**`
- Expected changes:
  - meeting 作成フォーム
  - proposal 詳細 + diff + approve ボタン
  - queue-publish 実行導線
- Validation:
  - ブラウザ操作で 1 ジョブの end-to-end 完走
- Risk:
  - UI 先行で仕様逸脱

#### P1-4: 提案生成 diff 精度改善
- Objective: 現行 revision を基準に before/after を安定生成
- Target: generate-proposals route + ai service
- Expected changes:
  - 最新 approved revision 取得ロジック追加
  - fallback（revision 不在時は posting 現在値）
- Validation:
  - 日本語含むノートで差分が正しく表示
- Risk:
  - 既存データ不整合時の比較対象欠落

#### P1-5: audit logging 補完
- Objective: 承認・キュー投入・生成失敗の監査証跡を欠損なく記録
- Target: proposal approve/generate, queue-publish route
- Expected changes:
  - `audit_logs` への actor / action / target / timestamp の保存
- Validation:
  - 成功・失敗双方で監査記録を確認
- Risk:
  - ログ過多、個人情報の過記録

#### P1-6: Phase 1 API flow テスト追加
- Objective: 回帰を防ぐ最小自動テストを追加
- Target: `tests/**` または route 単体テスト
- Expected changes:
  - meeting → proposal → approve → queue → run get の統合テスト
  - enum 制約違反テスト（`source`, `run_type`）
- Validation:
  - CI で再現可能
- Risk:
  - DB fixture メンテコスト

#### P1-7: `current_revision_id` 戦略の確定
- Objective: schema 拡張有無を含め安全な参照戦略を決定
- Target: `Docs/db/**`, route 実装方針
- Expected changes:
  - Option A: `job_postings.current_revision_id` 追加
  - Option B: latest approved をクエリ算出
  - 決定理由と rollback 方針を文書化
- Validation:
  - 同時承認時の整合性シミュレーション
- Risk:
  - 追加カラム導入時の移行コスト

### Phase 2（adapter/publisher 本実装）

#### P2-1: publish adapter interface + Airwork adapter 設計確定
- Objective: 実行層の抽象化と媒体依存隔離
- Dependency: P1-1, P1-2

#### P2-2: run execute / result import の信頼性実装
- Objective: idempotency / retry / partial failure を運用可能にする
- Dependency: P2-1

#### P2-3: credential_ref 前提の資格情報運用に移行
- Objective: 秘密情報の参照抽象化
- Dependency: P2-1

#### P2-4: Phase 2 handoff package 作成
- Objective: API 契約・実行状態遷移・障害時手順を handoff 文書化
- Dependency: P2-1〜P2-3

### Phase 3（freshness 自動化）

#### P3-1: `/api/cron/freshness` 本実装
- 14日判定 → candidate 更新 → ToDo/proposal queue

#### P3-2: freshness ダッシュボード運用指標の整備
- 検知件数、処理遅延、失敗率

#### P3-3: 監査と運用 SLO の定着
- 日次レビュー手順、アラート方針

---

## Detailed step-by-step task order for the next implementation wave

次の 1 スプリントで実行する推奨順:

1. P1-7 `current_revision_id` 戦略決定（ドキュメント確定先行）
2. P1-1 posting 参照更新の安全実装（トランザクション化）
3. P1-2 proposal status lifecycle 実装
4. P1-4 Gemini diff 精度改善（現行 revision 参照）
5. P1-5 audit logging 補完
6. P1-3 最小 UI 接続
7. P1-6 API 統合テスト追加
8. 受け入れ検証（手動 E2E + CI）

---

## Dependency map (what must be done before what)

- `current_revision_id` 戦略決定 → posting 更新実装・diff 精度改善の前提
- posting 更新安全化 + proposal status lifecycle → queue-publish 安定化の前提
- audit logging 補完 → 本番運用開始判定の前提
- API 安定化（P1-1,2,4,5）→ UI 接続（P1-3）
- Phase 1 API テスト整備（P1-6）→ Phase 2 adapter 実装着手条件

簡易依存グラフ:

`P1-7 -> P1-1 -> P1-2 -> P1-3`

`P1-7 -> P1-4 -> P1-3`

`P1-1/P1-2/P1-5 -> P1-6 -> Phase 2`

---

## Verification checklist per task

共通チェック（各タスク完了時）:

- [ ] `pnpm exec tsc --noEmit`
- [ ] `pnpm lint`
- [ ] 変更 API の正常系/異常系を curl で確認
- [ ] `ok: false` 時に秘密情報やスタックトレースを返していない
- [ ] SQL が parameterized である
- [ ] DB/Blob/Gemini 呼び出しが server-only である

Phase 1 受け入れチェック:

- [ ] meetings 作成 → proposals 生成 → proposal 参照 → approve → queue-publish → run 参照 が連続成功
- [ ] `job_revisions.source` 不正値を拒否
- [ ] `runs.run_type` 不正値を拒否
- [ ] `payload_hash` 欠落時に revision 作成を拒否
- [ ] 日本語本文（UTF-8）で文字化けなく処理可能

---

## Encoding / UTF-8 handling notes

- API の JSON body は UTF-8 を明示（`Content-Type: application/json; charset=utf-8`）
- PowerShell からの検証時は UTF-8 送信設定を統一
- meeting note / proposal summary / diff フィールドは UTF-8 前提で DB 保存
- ログ出力時にバイト列をそのまま吐かず、必要最小限のメタ情報のみ記録

---

## Technical debt / cleanup tasks

1. proposal/approve 系 route の責務分離（validation / domain / persistence）
2. DB クエリ共通化（重複 SQL の helper 化）
3. run/status 列挙値の validator 一元化
4. API エラーコード粒度の統一（400/404/409/500）
5. `/api/cron/freshness` スタブ解消の準備（feature flag 含む）

---

## Recommended commit slicing for Codex Cloud execution

1. `docs: define phase1 remaining tasks and dependency map`
   - 本手順書更新のみ
2. `feat: enforce approved revision linkage and proposal lifecycle`
   - P1-1/P1-2
3. `feat: improve proposal diff context and add audit logging`
   - P1-4/P1-5
4. `feat: add minimal phase1 ui flow for meeting proposal approval`
   - P1-3
5. `test: add phase1 api flow integration tests`
   - P1-6
6. `docs: phase2 adapter publisher handoff package`
   - P2-4 先行文書化

---

## Implementation notes for Phase 2 adapter/publisher design handoff

handoff に最低限含める内容:

- Adapter interface（prepare/publish/normalize）の TypeScript 契約
- `runs` / `run_items` 状態遷移図
- idempotency key 生成・重複時挙動
- 障害分類（外部 API 障害 / データ不整合 / 認証失敗）
- 再試行戦略（回数、間隔、打ち切り条件）
- 監査ログ項目と保存方針

