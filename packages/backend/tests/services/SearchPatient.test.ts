// 患者リストの一覧の処理（searchPatients）のテスト
// データベースには接続しない（DbAccess を差し替える）。症例データはテスト用の架空の値のみを使う

const mockQuery = jest.fn();
const mockLogging = jest.fn();

jest.mock('../../backendapp/logic/DbAccess', () => ({
  DbAccess: jest.fn().mockImplementation(() => ({
    connectWithConf: jest.fn().mockResolvedValue(undefined),
    query: mockQuery,
    end: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('../../backendapp/logic/Logger', () => ({
  LOGTYPE: { FATAL: 1, ERROR: 2, WARN: 3, INFO: 4, DEBUG: 5 },
  logging: (...args: unknown[]) => mockLogging(...args),
}));

import { searchPatients, searchPatientRequest } from '../../backendapp/services/SearchPatient';

type Row = { [key: string]: unknown };

const LATEST_ID = 10;

// 主要がん種と進行期のタグを持つ、入れ子のあるスキーマ
const schema = {
  type: 'object',
  properties: {
    がん種: { type: 'string', 'jesgo:tag': 'cancer_major' },
    詳細: {
      type: 'object',
      properties: {
        進行期: { type: 'string', 'jesgo:tag': 'figo' },
        メモ: { type: 'string', enum: ['あ', 'い', 'う'] },
      },
    },
  },
};

/** 架空の症例 count 件分の行（症例ごとに文書 1 件）を作る */
const makeRows = (count: number): Row[] => {
  const rows: Row[] = [];
  for (let i = 1; i <= count; i++) {
    rows.push({
      his_id: `T${String(i).padStart(5, '0')}`,
      name: `テスト${i}`,
      age: 40 + (i % 30),
      death_age: null,
      schemaidstring: '/schema/test/root',
      date_of_death: null,
      decline: false,
      last_updated: '2026/01/01',
      document: {
        がん種: i % 2 === 0 ? '子宮体がん' : '子宮頸がん',
        詳細: { 進行期: i % 3 === 0 ? '' : 'IA' },
        ...(i % 5 === 0 ? { 'jesgo:error': ['要修正: テスト'] } : {}),
      },
      child_documents: [],
      document_id: 1000 + i,
      case_id: i,
      deleted: false,
      event_date: null,
      schema_primary_id: LATEST_ID,
      latest_schema_primary_id: LATEST_ID,
    });
  }
  // 文書の無い症例（スキーマと結合されない行）
  rows.push({
    his_id: 'T99999',
    name: '文書なし',
    age: 50,
    death_age: null,
    schemaidstring: null,
    date_of_death: null,
    decline: false,
    last_updated: '2026/01/01',
    document: null,
    child_documents: null,
    document_id: null,
    case_id: count + 1,
    deleted: null,
    event_date: null,
    schema_primary_id: null,
    latest_schema_primary_id: null,
  });
  return rows;
};

/** SQL の内容に応じて架空の結果を返す */
const setupQuery = (rows: Row[]) => {
  mockQuery.mockImplementation((sql: string) => {
    if (sql.includes('FROM jesgo_document doc')) {
      // 行ごとに別のオブジェクトを返す（データベースから受け取ったときと同じ）
      return Promise.resolve(
        rows.map((r) => ({
          ...r,
          document_schema:
            r.latest_schema_primary_id == null ? null : JSON.parse(JSON.stringify(schema)),
        }))
      );
    }
    if (sql.includes('FROM jesgo_search_column')) {
      return Promise.resolve([{ column_id: 2, column_name: '子宮体がん' }]);
    }
    return Promise.resolve([]);
  });
};

type ResultBody = {
  data: {
    caseId: number;
    patientId: string;
    diagnosis: string;
    advancedStage: string;
    registration: string[];
  }[];
  totalCount: number;
  filteredDocuments: number[][];
};

const run = async (query: Partial<searchPatientRequest>): Promise<ResultBody> => {
  const result = await searchPatients(query as searchPatientRequest);
  return result.body as ResultBody;
};

beforeEach(() => {
  mockQuery.mockReset();
  mockLogging.mockReset();
});

test('タグの値・エラーあり・文書の無い症例が従来どおり一覧に出る', async () => {
  setupQuery(makeRows(6));
  const body = await run({ page: '1', pageSize: '100' });
  expect(body.totalCount).toBe(7);
  expect(body.data.map((d) => d.caseId)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  expect(body.data[0].diagnosis).toBe('子宮頸がん');
  expect(body.data[1].diagnosis).toBe('子宮体がん');
  expect(body.data[0].advancedStage).toBe('IA');
  expect(body.data[2].advancedStage).toBe('未');
  expect(body.data[4].registration).toContain('has_error');
  expect(body.data[3].registration).not.toContain('has_error');
  // 文書の無い症例
  expect(body.data[6].patientId).toBe('T99999');
  expect(body.data[6].diagnosis).toBe('未');
});

test('文書の最上位の jesgo:error だけをエラーありの判定に使う', async () => {
  const rows = makeRows(2);
  // 入れ子の中にある jesgo:error は従来どおり判定に使わない
  rows[0].document = { がん種: '子宮頸がん', 詳細: { 'jesgo:error': ['要修正: テスト'] } };
  rows[1].document = { がん種: '子宮体がん', 'jesgo:error': ['要確認: テスト'] };
  setupQuery(rows);
  const body = await run({ page: '1', pageSize: '100' });
  expect(body.data[0].registration).toEqual([]);
  expect(body.data[1].registration).toEqual(['has_warn']);
});

test('ログの件数が症例数に比例して増えない', async () => {
  setupQuery(makeRows(10));
  await run({});
  const small = mockLogging.mock.calls.length;

  mockLogging.mockReset();
  setupQuery(makeRows(300));
  await run({});
  const large = mockLogging.mock.calls.length;

  expect(large).toBe(small);
});

test('プリセット項目の絞り込み（項目のパス・がん種）が従来どおり働く', async () => {
  setupQuery(makeRows(6));
  const body = await run({
    presetId: '2',
    presetFilters: JSON.stringify([
      { field_id: 1, field_name: 'がん種', field_path: 'がん種', field_type: 'string', value: '体' },
    ]),
  });
  expect(body.data.map((d) => d.caseId)).toEqual([2, 4, 6]);
  expect(body.filteredDocuments).toEqual([[1006, 1004, 1002]]);

  const byCancer = await run({ page: '1', pageSize: '100', cancerType: '2' });
  expect(byCancer.data.map((d) => d.caseId)).toEqual([2, 4, 6]);
});

test('jesgo:error に想定外の値があっても一覧は止まらず、その症例だけ「エラーあり」になる', async () => {
  const rows = makeRows(8);
  const setError = (index: number, value: unknown) => {
    rows[index].document = { ...(rows[index].document as Row), 'jesgo:error': value };
  };
  setError(0, [1, '要確認: テスト']); // 数値と文字列の混在
  setError(1, [true]); // 真偽値
  setError(2, [null]); // null だけ
  setError(3, [{ 項目: '要確認: テスト' }]); // 製品の仕様の形
  setError(5, [{ 項目: 3 }]); // 値が文字列でないオブジェクト
  setError(6, '要確認: テスト'); // 配列でない
  setError(7, [['要修正: テスト']]); // 配列の入れ子
  setupQuery(rows);

  const body = await run({ page: '1', pageSize: '100' });
  expect(body.totalCount).toBe(9);
  expect(body.data.map((d) => d.caseId)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const reg = (caseId: number) => body.data.find((d) => d.caseId === caseId)?.registration;
  expect(reg(1)).toEqual(['has_warn', 'has_error']);
  expect(reg(2)).toEqual(['has_error']);
  expect(reg(3)).toEqual([]);
  expect(reg(4)).toEqual(['has_warn']);
  // case 5 は元から「要修正」の文字列（makeRows の 5 の倍数）
  expect(reg(5)).toEqual(['has_error']);
  expect(reg(6)).toEqual(['has_error']);
  expect(reg(7)).toEqual(['has_error']);
  expect(reg(8)).toEqual(['has_error']);
  // 他の列は想定外の値が無い場合と同じ
  expect(body.data[0].diagnosis).toBe('子宮頸がん');
  expect(body.data[1].advancedStage).toBe('IA');

  // 運用ログには文書の ID だけを出す（患者 ID・氏名・エラー情報の中身は出さない）
  const warnLogs = mockLogging.mock.calls.filter((c) => c[0] === 3).map((c) => String(c[1]));
  expect(warnLogs).toHaveLength(1);
  expect(warnLogs[0]).toContain('document_id=1001,1002,1006,1007,1008');
  expect(warnLogs[0]).not.toMatch(/T0000|テスト|要確認|要修正/);
});
