import { query } from "@/lib/db";
import { requireAdminUser } from "@/lib/server/auth";
import { isMissingTableError } from "@/lib/todos";
import CsvUploadForm from "@/app/settings/components/csv-upload-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AirworkCodeRow = {
  field_key: string;
  code: string;
  name_ja: string;
  is_active: boolean;
  updated_at: string;
};

export default async function AirworkCodesPage() {
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

  let rows: AirworkCodeRow[] = [];
  let loadError: string | null = null;

  try {
    const result = await query<AirworkCodeRow>(
      `SELECT field_key, code, name_ja, is_active, updated_at
       FROM airwork_codes
       ORDER BY field_key ASC, code ASC`
    );
    rows = result.rows;
  } catch (error) {
    if (isMissingTableError(error)) {
      loadError = "airwork_codes テーブルが見つかりません。";
    } else {
      loadError = "airwork_codes の取得に失敗しました。";
    }
  }

  return (
    <main>
      <div className="container">
        <section className="card">
          <h1>Airワークコード一覧</h1>
          <p>公式コード一覧を閲覧し、CSVで更新できます。</p>
        </section>

        <CsvUploadForm
          action="/api/settings/airwork-codes/upload"
          title="CSV取り込み"
          description="UTF-8 の CSV をアップロードしてコード一覧を更新します。"
          templateHeaders="field_key,code,name_ja,is_active"
        />

        <section className="card">
          <header className="card-header">
            <div>
              <h2>登録済みのコード</h2>
              <p>最新のコードと更新日時を表示します。</p>
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
                    <th>code</th>
                    <th>name_ja</th>
                    <th>is_active</th>
                    <th>updated_at</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={5}>まだデータがありません。</td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={`${row.field_key}-${row.code}`}>
                        <td>{row.field_key}</td>
                        <td>{row.code}</td>
                        <td>{row.name_ja}</td>
                        <td>{row.is_active ? "true" : "false"}</td>
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
