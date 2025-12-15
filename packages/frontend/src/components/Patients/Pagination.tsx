import React from 'react';
import {
  Button,
  ButtonGroup,
  ButtonToolbar,
  FormControl,
  Glyphicon,
} from 'react-bootstrap';

interface PaginationProps {
  /** 現在のページ番号（1から始まる） */
  currentPage: number;
  /** 1ページあたりの表示件数 */
  pageSize: number;
  /** 総件数 */
  totalCount: number;
  /** 表示件数の選択肢 */
  pageSizeOptions: number[];
  /** ページ変更時のコールバック */
  onPageChange: (page: number) => void;
  /** 表示件数変更時のコールバック */
  onPageSizeChange: (size: number) => void;
}

/**
 * ページングコンポーネント
 * 表示件数選択とページネーションを提供
 */
const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  pageSize,
  totalCount,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
}) => {
  // 総ページ数を計算
  const totalPages = Math.ceil(totalCount / pageSize);
  
  // 表示範囲を計算（例: "1-50 / 200件"）
  const startIndex = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalCount);

  // 前のページに移動
  const handlePrevPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  // 次のページに移動
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  // 表示件数変更
  const handlePageSizeChange = (e: React.FormEvent<FormControl>) => {
    const target = e.target as HTMLSelectElement;
    const newSize = parseInt(target.value, 10);
    onPageSizeChange(newSize);
    // 表示件数を変更した際は1ページ目に戻る
    onPageChange(1);
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      padding: '10px 0',
      marginTop: '10px',
      borderTop: '1px solid #ddd',
    }}>
      {/* 左側: 表示件数選択 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span>表示件数:</span>
        <FormControl
          componentClass="select"
          value={pageSize}
          onChange={handlePageSizeChange}
          style={{ 
            width: 'auto', 
            display: 'inline-block', 
            margin: '0 5px',
            padding: '5px 30px 5px 10px',
            cursor: 'pointer',
            appearance: 'menulist'
          }}
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}件
            </option>
          ))}
        </FormControl>
      </div>

      {/* 中央: 件数情報 */}
      <div style={{ textAlign: 'center' }}>
        {totalCount > 0 ? (
          <span>
            {startIndex} - {endIndex} / {totalCount}件
          </span>
        ) : (
          <span>0件</span>
        )}
      </div>

      {/* 右側: ページネーション */}
      <ButtonToolbar>
        <ButtonGroup>
          <Button
            title="前のページ"
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
          >
            <Glyphicon glyph="chevron-left" />
          </Button>
          <Button disabled style={{ minWidth: '80px' }}>
            {totalPages > 0 ? `${currentPage} / ${totalPages}` : '0 / 0'}
          </Button>
          <Button
            title="次のページ"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
          >
            <Glyphicon glyph="chevron-right" />
          </Button>
        </ButtonGroup>
      </ButtonToolbar>
    </div>
  );
};

export default Pagination;

