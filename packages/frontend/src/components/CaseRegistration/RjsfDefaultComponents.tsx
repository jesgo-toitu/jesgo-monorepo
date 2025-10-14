import React from 'react';

// react-jsonschema-formからコピーしてきたもの。独自の追記なし。eslintは無効とする。
/* eslint-disable */

// https://github.com/rjsf-team/react-jsonschema-form/blob/master/packages/core/src/components/IconButton.js
// Latest commit ef8b7fc
// TODO 仮でany
export var IconButton = (props: any) => {
  const { type = 'default', icon, className, ...otherProps } = props;
  return (
    <button
      type="button"
      className={`btn btn-${type} ${className}`}
      {...otherProps}
    >
      <i className={`glyphicon glyphicon-${icon}`} />
    </button>
  );
};
