import { readdirSync } from 'fs';

/**
 * ディレクトリを再帰的に走査してファイルリストを取得
 * @param dir 走査するディレクトリパス
 * @returns ファイルパスの配列
 */
export const listFilesRecursive = (dir: string): string[] => {
  return readdirSync(dir, { withFileTypes: true }).flatMap((dirent) =>
    dirent.isFile()
      ? [`${dir}/${dirent.name}`]
      : listFilesRecursive(`${dir}/${dirent.name}`)
  );
};

