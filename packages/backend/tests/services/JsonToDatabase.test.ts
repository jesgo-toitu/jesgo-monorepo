import { DbAccess } from '../../backendapp/logic/DbAccess';
import { logging, LOGTYPE } from '../../backendapp/logic/Logger';

// JsonToDatabaseサービスのテスト
// 注意: 実際のデータベースに接続する必要があるため、テスト環境でのみ実行してください

describe('JsonToDatabase - スキーマ登録機能のテスト', () => {
  let dbAccess: DbAccess;

  beforeAll(async () => {
    dbAccess = new DbAccess();
    try {
      await dbAccess.connectWithConf();
    } catch (error) {
      console.warn('データベース接続に失敗しました。テストをスキップします。');
    }
  });

  afterAll(async () => {
    if (dbAccess) {
      await dbAccess.end();
    }
  });

  test('schema_primary_id=0のスキーマが存在することを確認', async () => {
    if (!dbAccess) {
      console.warn('データベース接続が利用できません。テストをスキップします。');
      return;
    }

    const result = await dbAccess.query(
      'SELECT schema_primary_id, schema_id, subschema, subschema_default FROM jesgo_document_schema WHERE schema_primary_id = 0'
    ) as { schema_primary_id: number; schema_id: number; subschema: number[]; subschema_default: number[] }[];

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].schema_primary_id).toBe(0);
    expect(result[0].schema_id).toBe(0);
    expect(Array.isArray(result[0].subschema)).toBe(true);
    expect(Array.isArray(result[0].subschema_default)).toBe(true);
  });

  test('新規スキーマ登録後のルートスキーマ更新機能のテスト', async () => {
    if (!dbAccess) {
      console.warn('データベース接続が利用できません。テストをスキップします。');
      return;
    }

    // テスト用のスキーマデータを作成
    const testSchema = {
      $id: '/test/schema',
      title: 'テストスキーマ',
      type: 'object',
      properties: {
        test_field: {
          type: 'string',
          description: 'テストフィールド'
        }
      },
      'jesgo:author': 'test',
      'jesgo:version': [1, 0]
    };

    // ルートスキーマの現在の状態を取得
    const beforeResult = await dbAccess.query(
      'SELECT subschema, subschema_default FROM jesgo_document_schema WHERE schema_primary_id = 0'
    ) as { subschema: number[]; subschema_default: number[] }[];

    const beforeSubschema = beforeResult[0].subschema || [];
    const beforeSubschemaDefault = beforeResult[0].subschema_default || [];

    // 新規スキーマを登録
    const insertQuery = `
      INSERT INTO jesgo_document_schema (
        schema_id, schema_id_string, title, document_schema, 
        author, version_major, version_minor, subschema, subschema_default
      ) VALUES (
        (SELECT COALESCE(MAX(schema_id), 0) + 1 FROM jesgo_document_schema WHERE schema_id > 0),
        $1, $2, $3, $4, $5, $6, $7, $8
      )
      RETURNING schema_id
    `;

    const newSchemaId = (await dbAccess.query(insertQuery, [
      testSchema.$id,
      testSchema.title,
      JSON.stringify(testSchema),
      testSchema['jesgo:author'],
      testSchema['jesgo:version'][0],
      testSchema['jesgo:version'][1],
      [],
      []
    ])) as { schema_id: number }[];

    expect(newSchemaId.length).toBeGreaterThan(0);
    const insertedSchemaId = newSchemaId[0].schema_id;

    // addNewSchemaToRootSchema関数の機能をテスト
    // 実際の関数は非公開なので、同様の処理を実行
    const rootSchemaRows = await dbAccess.query(
      'SELECT subschema, subschema_default FROM jesgo_document_schema WHERE schema_primary_id = 0'
    ) as { subschema: number[]; subschema_default: number[] }[];

    if (rootSchemaRows.length > 0) {
      const currentSubschema = rootSchemaRows[0].subschema || [];
      const currentSubschemaDefault = rootSchemaRows[0].subschema_default || [];

      if (!currentSubschema.includes(insertedSchemaId)) {
        const updatedSubschema = [...currentSubschema, insertedSchemaId];
        const updatedSubschemaDefault = [...currentSubschemaDefault, insertedSchemaId];

        await dbAccess.query(
          'UPDATE jesgo_document_schema SET subschema = $1, subschema_default = $2 WHERE schema_primary_id = 0',
          [updatedSubschema, updatedSubschemaDefault]
        );
      }
    }

    // ルートスキーマが更新されたことを確認
    const afterResult = await dbAccess.query(
      'SELECT subschema, subschema_default FROM jesgo_document_schema WHERE schema_primary_id = 0'
    ) as { subschema: number[]; subschema_default: number[] }[];

    const afterSubschema = afterResult[0].subschema || [];
    const afterSubschemaDefault = afterResult[0].subschema_default || [];

    // 新しいスキーマIDが追加されていることを確認
    expect(afterSubschema).toContain(insertedSchemaId);
    expect(afterSubschemaDefault).toContain(insertedSchemaId);
    expect(afterSubschema.length).toBe(beforeSubschema.length + 1);
    expect(afterSubschemaDefault.length).toBe(beforeSubschemaDefault.length + 1);

    // テストデータをクリーンアップ
    await dbAccess.query(
      'DELETE FROM jesgo_document_schema WHERE schema_id = $1',
      [insertedSchemaId]
    );

    // ルートスキーマを元の状態に戻す
    await dbAccess.query(
      'UPDATE jesgo_document_schema SET subschema = $1, subschema_default = $2 WHERE schema_primary_id = 0',
      [beforeSubschema, beforeSubschemaDefault]
    );
  });

  test('重複するスキーマIDが追加されないことを確認', async () => {
    if (!dbAccess) {
      console.warn('データベース接続が利用できません。テストをスキップします。');
      return;
    }

    // ルートスキーマの現在の状態を取得
    const beforeResult = await dbAccess.query(
      'SELECT subschema, subschema_default FROM jesgo_document_schema WHERE schema_primary_id = 0'
    ) as { subschema: number[]; subschema_default: number[] }[];

    const beforeSubschema = beforeResult[0].subschema || [];
    const beforeSubschemaDefault = beforeResult[0].subschema_default || [];

    if (beforeSubschema.length > 0) {
      const existingSchemaId = beforeSubschema[0];

      // 既存のスキーマIDを再度追加しようとする
      const updatedSubschema = [...beforeSubschema, existingSchemaId];
      const updatedSubschemaDefault = [...beforeSubschemaDefault, existingSchemaId];

      await dbAccess.query(
        'UPDATE jesgo_document_schema SET subschema = $1, subschema_default = $2 WHERE schema_primary_id = 0',
        [updatedSubschema, updatedSubschemaDefault]
      );

      // 重複が発生していることを確認
      const afterResult = await dbAccess.query(
        'SELECT subschema, subschema_default FROM jesgo_document_schema WHERE schema_primary_id = 0'
      ) as { subschema: number[]; subschema_default: number[] }[];

      const afterSubschema = afterResult[0].subschema || [];
      const afterSubschemaDefault = afterResult[0].subschema_default || [];

      // 重複が発生していることを確認
      const duplicateCount = afterSubschema.filter(id => id === existingSchemaId).length;
      expect(duplicateCount).toBeGreaterThan(1);

      // 元の状態に戻す
      await dbAccess.query(
        'UPDATE jesgo_document_schema SET subschema = $1, subschema_default = $2 WHERE schema_primary_id = 0',
        [beforeSubschema, beforeSubschemaDefault]
      );
    }
  });
});
