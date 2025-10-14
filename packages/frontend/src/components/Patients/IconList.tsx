import React from 'react';
import lodash from 'lodash';

const makeIconList = (props: { iconList: string[], displayCaption: string, displayText: string }) => {
  const iconCaptions: { [key: string]: string } = {
    death: '死',
    recurrence: '再発',
    complications: '合',
    completed: '済',
    not_completed: '未',
    surveillance: '経過',
    chemo: '化',
    radio: '放',
    surgery: '手',
    supportivecare: '緩和',
    has_error: 'エラーあり',
  };
  const { iconList, displayCaption, displayText } = props;
  const orderRule = [
    'surgery',
    'chemo',
    'radio',
    'supportivecare',
    'complications',
    'recurrence',
    'surveillance',
    'death',
    'not_completed',
    'completed',
    'has_error',
  ];

  return (
    <>
      {lodash
        .uniq(iconList)
        .sort((a, b) => orderRule.indexOf(a) - orderRule.indexOf(b))
        .map((icon) => (
          icon === displayCaption ? displayText :
          <img
            key={icon}
            src={`./image/icon_${icon}.svg`}
            alt={`${iconCaptions[icon]}`}
          />
        ))}
    </>
  );
};

export default makeIconList;
