/**
 * ドキュメント関連のユーティリティ関数
 */

/**
 * オブジェクトや配列から実際の値を抽出するヘルパー関数
 * @param value 抽出対象の値
 * @returns 抽出された値（文字列、数値、boolean、または配列の最初の要素など）
 */
export const extractActualValue = (value: any): any => {
  if (value === null || value === undefined) {
    return null;
  }
  
  // プリミティブ型の場合はそのまま返す
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  
  // 配列の場合
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return null;
    }
    // 配列の最初の要素を処理
    const firstElement = value[0];
    if (typeof firstElement === 'string' || typeof firstElement === 'number' || typeof firstElement === 'boolean') {
      return firstElement;
    }
    // 配列の要素がオブジェクトの場合は再帰的に抽出
    if (typeof firstElement === 'object' && firstElement !== null) {
      return extractActualValue(firstElement);
    }
    return firstElement;
  }
  
  // オブジェクトの場合、中から文字列や数値を探す
  if (typeof value === 'object' && value !== null) {
    // まず、よく使われるプロパティ名をチェック
    const commonKeys = ['value', 'text', 'label', 'name', '値', 'テキスト', 'ラベル', '名前'];
    for (const key of commonKeys) {
      if (key in value) {
        const extracted = extractActualValue(value[key]);
        if (extracted !== null && extracted !== undefined) {
          return extracted;
        }
      }
    }
    
    // 全てのプロパティをチェック
    for (const key in value) {
      if (value.hasOwnProperty(key)) {
        const val = value[key];
        // 文字列や数値が見つかればそれを返す
        if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
          // 空文字列や0、falseは除外しない（実際の値として扱う）
          return val;
        }
        // オブジェクトの場合は再帰的に抽出を試みる（無限ループを避けるため、ネストは1階層まで）
        if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
          const nestedValue = extractActualValue(val);
          if (nestedValue !== null && nestedValue !== undefined && 
              (typeof nestedValue === 'string' || typeof nestedValue === 'number' || typeof nestedValue === 'boolean')) {
            return nestedValue;
          }
        }
      }
    }
    
    // 値が見つからない場合はオブジェクト自体を返す（後で処理される）
    return value;
  }
  
  return value;
};

/**
 * field_pathを使用してドキュメントから値を取得
 * @param document ドキュメントオブジェクト
 * @param fieldPath フィールドパス（例：/schema/CC/staging.治療施行状況 または 喫煙.喫煙有無）
 * @param options オプション設定
 * @param options.extractValue 値を抽出するかどうか（デフォルト: true）
 * @returns 取得した値
 */
export const getValueFromPath = (
  document: any,
  fieldPath: string,
  options?: { extractValue?: boolean }
): any => {
  try {
    if (!fieldPath || !document) {
      return null;
    }
    
    const extractValue = options?.extractValue !== false; // デフォルトは true

    // 配列のインデックスは無視(先頭固定)
    fieldPath = fieldPath.replace(/\[\d+\]/g, '');

    // fieldPathにドットがない場合は、直接プロパティとしてアクセス
    if (!fieldPath.includes('.')) {
      if (document && typeof document === 'object' && fieldPath in document) {
        const value = document[fieldPath];
        // オブジェクトや配列の場合は実際の値を抽出
        return extractValue ? extractActualValue(value) : value;
      }
      return null;
    }
    
    // fieldPathの形式: /schema/CC/staging.治療施行状況 または 喫煙.喫煙有無
    const parts = fieldPath.split('.');
    
    if (parts.length < 2) {
      return null;
    }
    
    const schemaPath = parts[0]; // /schema/CC/staging または 喫煙
    const fieldName = parts.slice(1).join('.'); // 治療施行状況 または 腫瘍最大腫瘍径.所見 または 喫煙有無
    
    // ドキュメント内でスキーマパスを探す
    let current = document;
    
    // スキーマパスがスラッシュで始まる場合はパスを無視して、フィールド名で直接アクセス
    if (schemaPath.startsWith('/schema/')) {
      // ネストされたフィールド名を処理（例: 腫瘍最大腫瘍径.所見 または 喫煙.喫煙有無）
      const fieldNames = fieldName.split('.');
      for (const name of fieldNames) {
        if (current && typeof current === 'object' && !Array.isArray(current) && name in current) {
          current = current[name];
        } else if (Array.isArray(current) && current.length > 0) {
          // 配列の場合は最初の要素を使用
          current = current[0];
          if (current && typeof current === 'object' && name in current) {
            current = current[name];
          } else {
            return null;
          }
        } else {
          return null;
        }
      }
      // 最終的に取得した値を抽出
      return extractValue ? extractActualValue(current) : current;
    }
    
    // schemaPathが/schema/で始まらない場合は、ドキュメント内のプロパティ名として直接アクセス
    // 例: surveillance.確認日 → document.surveillance.確認日
    if (current && typeof current === 'object' && !Array.isArray(current) && schemaPath in current) {
      current = current[schemaPath];
      
      // フィールド名でアクセス
      const fieldNames = fieldName.split('.');
      for (const name of fieldNames) {
        if (current && typeof current === 'object' && !Array.isArray(current) && name in current) {
          current = current[name];
        } else if (Array.isArray(current) && current.length > 0) {
          // 配列の場合は最初の要素を使用
          current = current[0];
          if (current && typeof current === 'object' && name in current) {
            current = current[name];
          } else {
            return null;
          }
        } else {
          return null;
        }
      }
      // 最終的に取得した値を抽出
      return extractValue ? extractActualValue(current) : current;
    } else if (Array.isArray(current) && current.length > 0) {
      // 配列の場合は最初の要素を使用
      const firstElement = current[0];
      if (firstElement && typeof firstElement === 'object' && schemaPath in firstElement) {
        current = firstElement[schemaPath];
        
        // フィールド名でアクセス
        const fieldNames = fieldName.split('.');
        for (const name of fieldNames) {
          if (current && typeof current === 'object' && !Array.isArray(current) && name in current) {
            current = current[name];
          } else {
            return null;
          }
        }
        return extractValue ? extractActualValue(current) : current;
      } else {
        // プロパティが見つからない場合、schemaPathを無視して直接フィールド名で検索
        current = firstElement;
        const fieldNames = fieldName.split('.');
        for (const name of fieldNames) {
          if (current && typeof current === 'object' && !Array.isArray(current) && name in current) {
            current = current[name];
          } else {
            return null;
          }
        }
        return extractValue ? extractActualValue(current) : current;
      }
    } else {
      // プロパティが見つからない場合、schemaPathを無視して直接フィールド名で検索
      const fieldNames = fieldName.split('.');
      for (const name of fieldNames) {
        if (current && typeof current === 'object' && !Array.isArray(current) && name in current) {
          current = current[name];
        } else if (Array.isArray(current) && current.length > 0) {
          // 配列の場合は最初の要素を使用
          current = current[0];
          if (current && typeof current === 'object' && name in current) {
            current = current[name];
          } else {
            return null;
          }
        } else {
          return null;
        }
      }
      return extractValue ? extractActualValue(current) : current;
    }
  } catch (error) {
    // エラーは呼び出し側で処理する
    return null;
  }
};

