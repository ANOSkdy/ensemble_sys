import { query } from "@/lib/db";
import { requireAdminUser } from "@/lib/server/auth";
import { isMissingTableError } from "@/lib/todos";
import CsvUploadForm from "@/app/settings/components/csv-upload-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AirworkFieldRow = {
  field_key: string;
  label_ja: string;
  input_kind: string;
  is_editable: boolean;
  sort_order: number;
  spec_version: string;
  updated_at: string;
};

export default async function AirworkFieldsPage() {
  try {
    await requireAdminUser();
  } catch (error) {
    return (
      <main>
        <div className="container">
          <section className="card">
            <h1>アクセス権限がありません</h1>
            <p>このページは管理者のみ閲覧できます。</p>
          </section>
        </div>
      </main>
    );
  }

  let rows: AirworkFieldRow[] = [];
  let loadError: string | null = null;

  try {
    const result = await query<AirworkFieldRow>(
      `SELECT field_key, label_ja, input_kind, is_editable, sort_order, spec_version, updated_at
       FROM airwork_fields
       ORDER BY sort_order ASC, field_key ASC`
    );
    rows = result.rows;
  } catch (error) {
    if (isMissingTableError(error)) {
      loadError = "airwork_fields テーブルが見つかりません。";
    } else {
      loadError = "airwork_fields の取得に失敗しました。";
    }
  }

  return (
    <main>
      <div className="container">
        <section className="card">
          <h1>Airワーク項目定義</h1>
          <p>公式コード一覧に基づく項目定義を閲覧・CSVで更新します。</p>
        </section>

        <CsvUploadForm
          action="/api/settings/airwork-fields/upload"
          title="CSV取り込み"
          description="UTF-8 の CSV をアップロードして項目定義を更新します。"
          templateHeaders="field_key,label_ja,input_kind,is_editable,sort_order,spec_version"
        />

        <section className="card">
          <header className="card-header">
            <div>
              <h2>登録済みの項目</h2>
              <p>最新の項目定義と更新日時を表示します。</p>
            </div>
          </header>
          {loadError ? (
            <p>{loadError}</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>field_key</th>
                    <th>label_ja</th>
                    <th>input_kind</th>
                    <th>is_editable</th>
                    <th>sort_order</th>
                    <th>spec_version</th>
                    <th>updated_at</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={7}>まだデータがありません。</td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.field_key}>
                        <td>{row.field_key}</td>
                        <td>{row.label_ja}</td>
                        <td>{row.input_kind}</td>
                        <td>{row.is_editable ? "true" : "false"}</td>
                        <td>{row.sort_order}</td>
                        <td>{row.spec_version}</td>
                        <td>{row.updated_at}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
