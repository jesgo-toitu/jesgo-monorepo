import React from 'react';
import { TreeItem, TreeItemProps } from '@mui/x-tree-view/TreeItem';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';

// TreeItemのラベル部分をカスタマイズするためのスタイル付きコンポーネント
const StyledTreeItem = styled(TreeItem)(({ theme }) => ({
  '& .MuiTreeItem-content': {
    padding: theme.spacing(0.5, 1),
  },
  '& .MuiTreeItem-label': {
    padding: theme.spacing(0.25, 0),
  },
}));

/**
 * CustomTreeItem (labelクリックでのツリー展開抑止)
 * @param treeProps
 * @returns
 */
const CustomTreeItem = (treeProps: TreeItemProps) => (
  <StyledTreeItem
    {...treeProps}
    label={
      <Typography
        component="div"
        onClick={(event: React.MouseEvent) => {
          // ラベルクリック時の展開を防ぐため、イベントを停止
          event.stopPropagation();
          // カスタムのonClickイベントがあれば実行
          if (treeProps.onClick) {
            treeProps.onClick(event);
          }
        }}
      >
        {treeProps.label}
      </Typography>
    }
  />
);

export default CustomTreeItem;
