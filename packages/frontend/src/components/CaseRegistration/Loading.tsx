import React from 'react';
import ReactLoading from 'react-loading';

// ローディング表示
const Loading = () => {
  const style: { [key: string]: string } = {
    position: 'fixed',
    left: '0',
    top: '0',
    width: '100%',
    height: '100%',
    display: 'flex',
    background: 'rgba(100, 100, 100, 0.8)', // 半透明のグレー
    zIndex: '2147483647',
    justifyContent: 'center',
    alignItems: 'center',
  };

  return (
    <div id="Loading" style={style}>
      {/* ローディングアイコン */}
      <ReactLoading type="spokes" />
    </div>
  );
};

export default Loading;
