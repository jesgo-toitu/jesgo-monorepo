/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete, {
  AutocompleteRenderOptionState,
} from '@mui/material/Autocomplete';
import {
  Label,
  Tooltip,
  OverlayTrigger,
  Glyphicon,
  Button,
} from 'react-bootstrap';
import './JESGOComponent.css';
import './JESGOFieldTemplete.css';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { WidgetProps } from '@rjsf/core';
import { JSONSchema7Type, JSONSchema7 } from 'json-schema'; // eslint-disable-line import/no-unresolved
import { IconButton } from './RjsfDefaultComponents';
import { Const } from '../../common/Const';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace JESGOComp {
  // "jesgo:required"用ラベル
  export const TypeLabel = (props: { requireType: string[]; pId: string }) => {
    const { requireType, pId } = props;
    const requiredStyles = { [Const.JesgoRequiredTypes.JSOG]: "default", [Const.JesgoRequiredTypes.JSGOE]: "info" } as { [key: string]: string; };

    return (
      <>
        {
          requireType.map((type: string) => {
            // JSOG,JSGOE以外は"success"
            const style: string = Object.keys(requiredStyles).includes(type) ? requiredStyles[type] : "success";
            return (
              <Label
                className="label-type"
                bsStyle={style}
                key={`${pId}_label${type}`}
              >
                {type}
              </Label>
            );
          })
        }
      </>
    );
  };

  // "description"用ラベル
  export const DescriptionToolTip = (props: {
    descriptionText: string;
    documentId: string;
  }) => {
    const { descriptionText, documentId } = props;
    if (!descriptionText) return null;

    const tooltip = (
      <Tooltip id={`${documentId}_${descriptionText}`}>
        <div className="description-tooptip">
          {descriptionText.replace(/<br>/g, '\n')}
        </div>
      </Tooltip>
    );

    return (
      <OverlayTrigger placement="right" overlay={tooltip}>
        <Glyphicon glyph="question-sign" />
      </OverlayTrigger>
    );
  };

  /**
   * 標準DateWidget
   * ※年に6桁入ってしまう問題の回避のため上限を設定
   * @param props
   * @returns
   */
  export const CustomDateWidget = (props: WidgetProps) => {
    const {
      registry: {
        widgets: { BaseInput },
      },
    } = props;

    return (
      <BaseInput
        type="date"
        min={Const.INPUT_DATE_MIN}
        max={Const.INPUT_DATE_MAX()}
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...props}
      />
    );
  };

  /**
   * 標準TextareaWidget
   * ・既存のTextareaWidgetを流用
   * ・props.options.rowsが正の数なら入力行数分コントロールを拡張、
   *   負の数なら絶対値を高さに設定、入力でそれを超える場合はスクロールバー表示
   * @param props
   * @returns
   */
  export const CustomTextareaWidget = (props: WidgetProps) => {
    const {
      id,
      options,
      placeholder,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      value,
      required,
      disabled,
      readonly,
      autofocus,
      onChange,
      onBlur,
      onFocus,
    } = props;

    const isFixedHeight = Math.sign(options.rows as number) < 0;
    const rows = Math.abs(options.rows as number);

    const calcTextAreaHeight = (val: string) => {
      let rowsHeight = rows;
      if (val) {
        const inputRowsNum = val.split('\n').length;
        if (inputRowsNum > rows) {
          rowsHeight = inputRowsNum;
        }
      }
      return rowsHeight;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value === '' ? options.emptyValue : e.target.value);
    };

    return (
      <textarea
        id={id}
        className="form-control"
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        value={value || ''}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        readOnly={readonly}
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autofocus}
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        rows={isFixedHeight ? rows : calcTextAreaHeight(value)}
        onBlur={onBlur && ((event) => onBlur(id, event.target.value))}
        onFocus={onFocus && ((event) => onFocus(id, event.target.value))}
        onChange={handleInputChange}
      />
    );
  };

  /**
   * 単位付きのTextWidget
   * @param props
   * @returns
   */
  export const WithUnits = (props: WidgetProps) => {
    const { registry, schema } = props;
    const { BaseInput } = registry.widgets;
    // 普通のtextWidgetを返す
    const units = schema.units;

    return (
      <div className="with-units-div">
        {/* eslint-disable-next-line react/jsx-props-no-spreading */}
        <BaseInput {...props} />
        {units && <span>{`（${units}）`}</span>}
      </div>
    );
  };

  /** Typeが複数あるTextWidget */
  export const MultiTypeTextBox = (props: WidgetProps) => {
    const { registry, schema } = props;
    const { BaseInput } = registry.widgets;
    // TODO validationの判定は必要
    const oneOfs = schema.oneOf as JSONSchema7[];
    let units = '';
    oneOfs.forEach((oneOf: JSONSchema7) => {
      // 単位があったらそちらを表示
      if (oneOf.units) {
        units = oneOf.units;
      }
    });

    if (units) {
      // 単位付きのTextWidgetを返す
      schema.units = units;
      // eslint-disable-next-line react/jsx-props-no-spreading
      return <WithUnits {...props} />;
    }

    return <BaseInput {...props} />; // eslint-disable-line react/jsx-props-no-spreading
  };

  /** 選択と入力ができるTextWidget */
  export const DatalistTextBox = (props: WidgetProps) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { schema, id, onChange, value } = props;
    const selectItems: JSONSchema7Type[] = [];
    const oneOfs = schema.oneOf as JSONSchema7[];
    let units = '';
    oneOfs.forEach((oneOf: JSONSchema7) => {
      if (oneOf.type === 'string' && oneOf.enum) {
        selectItems.push(...oneOf.enum);
      }

      // 単位があったらそちらを表示
      if (oneOf.units) {
        units = oneOf.units;
      }
    });
    if (!selectItems) return null;

    // TODO 他のSelectとスタイルを合わせる必要あり
    // TODO これだとサジェストされちゃうので普通のコンボボックスに置き換えが必要
    return (
      <div key={id} className="with-units-div">
        <input
          className="form-control input-text"
          type="text"
          list={`datalist-${id}`}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            onChange(event.target.value)
          }
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          value={value}
        />
        <datalist id={`datalist-${id}`}>
          {selectItems.map((item: JSONSchema7Type) => {
            const itemValue = item ?? '';
            return (
              <option
                key={`selectList-item-${itemValue.toString()}`}
                className="datalist-option"
                value={itemValue.toString()}
              >
                {itemValue.toString()}
              </option>
            );
          })}
        </datalist>
        {units && <span>{`（${units}）`}</span>}
      </div>
    );
  };

  type createSelectItemProps = {
    item: JSONSchema7;
    level: number;
    id: string;
  };

  const seqNoMap = new Map<string, number>();

  // selectの選択肢を作成
  const CreateSelectItem = (argProps: createSelectItemProps) => {
    const { item, level, id } = argProps;
    // 最上位のグループタイトル
    const title = item.title ?? '';
    const constItem = item.const as JSONSchema7Type;

    // 全角空白でインデントしているように見せる
    const INDENT_SPACE = '　';
    let indent = '';
    for (let i = 0; i < level; i += 1) {
      indent += INDENT_SPACE;
    }

    let seqNo = seqNoMap.get(id) ?? 0;
    seqNo += 1;
    seqNoMap.set(id, seqNo + 1);

    return (
      <>
        {title && (
          <option
            key={`select-grp-${title}`}
            label={`${indent}${title}`}
            disabled
            className="layer-dropdown-group-title"
          />
        )}
        {(item.oneOf as JSONSchema7[])?.map((oneOfItem: JSONSchema7, index: number) => (
          <CreateSelectItem key={`oneof-${id}-${level}-${index}`} item={oneOfItem} level={level + 1} id={id} />
        ))}
        {(item.enum as JSONSchema7Type[])?.map((subItem: JSONSchema7Type) => {
          // array,object型以外を表示
          if (
            subItem &&
            ['string', 'number', 'boolean'].includes(typeof subItem)
          ) {
            const itemValue = subItem?.toString() ?? '';
            return (
              <option key={`select-item-${itemValue}`} value={`${itemValue}`}>
                {`${indent + INDENT_SPACE}${itemValue}`}
              </option>
            );
          }
          return null;
        })}
        {constItem && (
          <option
            key={`select-item-${constItem.toString()}`}
            value={`${constItem.toString()}`}
          >
            {`${indent}${constItem.toString()}`}
          </option>
        )}
      </>
    );
  };

  /**
   * 階層表示のドロップダウンリスト
   * @param props
   * @returns
   */
  export const LayerDropdown = (props: WidgetProps) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { id, schema, onChange } = props;
    let { value } = props;
    const selectItems = schema.oneOf as JSONSchema7[];
    if (!selectItems) {
      return null;
    }
    // Array内での順番変更が出来なくなるため空文字に置き換え
    value = value ?? '';

    const seqNo = seqNoMap.get(id) ?? 0;
    seqNoMap.set(id, seqNo + 1);

    return (
      // TODO こちらもReact-Bootstrapを使いたいが、onChangeがうまく設定できない。
      <select
        className="form-control input-text"
        id={id}
        key={id}
        onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
          onChange(event.target.value)
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        value={value}
      >
        {/* 未選択用の空のリストを作成 */}
        {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
        <option key="select-item-empty" value="" />

        {selectItems.map((item: JSONSchema7, index: number) => (
          <CreateSelectItem key={`select-${id}-${index}`} item={item} level={0} id={id} />
        ))}
      </select>
    );
  };

  type ComboItemDefine = {
    seqNo: number;
    title?: string;
    label?: string;
    value?: any;
    level: number;
    groupId: number;
  };

  // フリー入力可能なlistType
  const comboTypes: string[] = [
    Const.JESGO_UI_LISTTYPE.COMBO,
    Const.JESGO_UI_LISTTYPE.SUGGEST_COMBO,
  ];

  const emptyOption: ComboItemDefine = {
    seqNo: 0,
    label: '',
    value: '',
    level: 0,
    groupId: 0,
  };

  /**
   * 階層表示可能なコンボボックス(フリー入力可)
   * @param props
   * @returns
   */
  export const LayerComboBox = (props: WidgetProps) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { id, schema, onChange, value, readonly } = props;

    const [selectedValue, setSelectedValue] =
      useState<ComboItemDefine>(emptyOption);
    const [inputValue, setInputValue] = useState<string>('');

    // blur実行フラグ
    const [blurFlg, setBlurFlg] = useState(false);

    const hasEnum = !!schema.enum;

    let oneOfItems: JSONSchema7 | undefined;
    if (!hasEnum) {
      // oneOfもしくはanyOf中のoneOfを取得
      if (schema.oneOf) {
        oneOfItems = schema;
      } else {
        const anyOfItems = schema.anyOf as JSONSchema7[];
        oneOfItems = anyOfItems?.find((p) => p.oneOf) as JSONSchema7;
      }

      if (!oneOfItems || !oneOfItems.oneOf) {
        return null;
      }
    }

    const isFreeInput = comboTypes.includes(
      schema[Const.EX_VOCABULARY.UI_LISTTYPE] ?? ''
    );

    useEffect(() => {
      setInputValue(value ?? '');
    }, [value]);

    // コンボボックスのアイテム一覧
    const comboItemList: ComboItemDefine[] = [];

    let nowGroupId = 0;
    let nowSeqNo = 1;

    let units = ''; // 単位

    // comboの選択肢を作成
    const createComboItem = (
      items: JSONSchema7[],
      level: number,
      parentGroupId?: number
    ) => {
      items.forEach((schemaItem) => {
        const newComboItem: ComboItemDefine = {
          seqNo: nowSeqNo,
          label: '',
          value: '',
          title: '',
          level,
          groupId: parentGroupId ?? 0,
        };
        nowSeqNo += 1;
        const constItem = schemaItem.const;

        if (constItem) {
          // const (通常の選択肢)
          newComboItem.value = constItem.toString();
          newComboItem.label = schemaItem.title
            ? schemaItem.title
            : constItem.toString();
          comboItemList.push(newComboItem);
        } else if (schemaItem.title) {
          // 見出し用
          newComboItem.title = schemaItem.title;
          nowGroupId += 1;
          newComboItem.groupId = nowGroupId;
          comboItemList.push(newComboItem);

          if (schemaItem.enum) {
            schemaItem.enum.forEach((enumVal) => {
              if (typeof enumVal === 'string') {
                comboItemList.push({
                  seqNo: nowSeqNo,
                  label: enumVal,
                  value: enumVal,
                  level: level + 1,
                  groupId: nowGroupId,
                });
                nowSeqNo += 1;
              }
            });
          } else if (schemaItem.oneOf) {
            // oneOfの入れ子
            createComboItem(
              schemaItem.oneOf as JSONSchema7[],
              level + 1,
              nowGroupId
            );
          }
        } else if (
          // 通常のコンボボックス
          schemaItem.enum
        ) {
          schemaItem.enum.forEach((enumVal) => {
            comboItemList.push({
              seqNo: nowSeqNo,
              label: enumVal as string,
              value: enumVal,
              level,
              groupId: nowGroupId,
            });
            nowSeqNo += 1;
          });
        }

        // 単位があったらそちらを表示
        if (schemaItem.units) {
          units = schemaItem.units;
        }
      });
    };

    // comboItemListを生成
    if (hasEnum) {
      // enumがあればenumから生成
      schema.enum?.forEach((enumVal) => {
        comboItemList.push({
          seqNo: nowSeqNo,
          label: enumVal as string,
          value: enumVal,
          level: 0,
          groupId: 0,
        });
      });
    } else {
      // oneOfまたはanyOfの場合はこちら
      createComboItem(oneOfItems?.oneOf as JSONSchema7[], 0);
    }

    if (comboItemList.length > 0) {
      comboItemList.unshift(emptyOption);
    }

    const comboComponent = useRef<HTMLDivElement>(null);

    // リストの内容からコンボボックスの幅計算
    // Arrayで順序変更した時にWidthがリセットされてしまうので、レンダリング毎に実行
    useEffect(() => {
      let comboWidth = 200; // デフォルト200px

      // 一時的にdivに描画して幅を取得する

      const div = document.createElement('div');
      div.style.position = 'absolute';
      div.style.top = '-30000px'; // 画面の見えないところへ飛ばす
      div.style.left = '-30000px';
      div.style.whiteSpace = 'pre'; // 折り返し禁止

      let textList = comboItemList.map((item) => {
        let str = item.title ? item.title : item.label ?? '';
        str = `${''.padStart(item.level, '　')}${str}`;
        return str;
      });
      if (textList.length > 0) {
        // リストの中で最大長の選択肢を取得
        textList = textList.sort((f, s) => s.length - f.length);
        const maxLengthStr = textList[0];
        div.innerHTML = maxLengthStr;
        document.body.appendChild(div); // bodyに追加して描画

        // divの幅を取得。マージンなどを考慮して補正かける
        const tmpWidth = div.clientWidth + 100;
        if (tmpWidth > comboWidth) {
          comboWidth = tmpWidth;
        }

        // 一時的なdivは削除
        div.parentElement?.removeChild(div);
      }

      // コンボボックスのwidth設定
      if (comboComponent.current) {
        comboComponent.current.style.width = `${comboWidth}px`;
      }
    });

    /* コンボボックスの値変更イベント */
    const comboOnChange = (
      e: React.SyntheticEvent<Element, Event> | undefined,
      val: any,
      reason: string
    ) => {
      // arrayで保存後に並べ替えると値がクリアされてしまう問題の回避
      // 原因不明のため暫定対処
      if (reason === 'reset') {
        return;
      }

      if (reason === 'input') {
        setInputValue(val);
        return;
      }

      if (
        val &&
        typeof val === 'object' &&
        Object.keys(val).find((p) => p === 'label')
      ) {
        onChange(val.label);
        setSelectedValue(val);
        setInputValue(val.label);
      } else {
        const convertVal = val || '';
        onChange(convertVal);
        setInputValue(val);
      }

      // リストから選択時はフォーカス外す
      if (reason === 'selectOption' && !isFreeInput) {
        setBlurFlg(true);
      }
    };

    // リスト選択後のフォーカスアウト
    // ここのタイミングでやらないと入力値が保存されない
    useEffect(() => {
      if (blurFlg) {
        const activeCtrl = document.activeElement as HTMLElement;
        activeCtrl?.blur();
        setBlurFlg(false);
      }
    }, [blurFlg]);

    // AutoCompliteのスタイルを上書き
    const autoCompleteTheme = createTheme({
      components: {
        MuiAutocomplete: {
          styleOverrides: {
            root: {
              marginTop: '5px',
              maxWidth: '100%',
              '& .MuiOutlinedInput-root': {
                padding: '0px 39px 0px 0px',
                '& .MuiAutocomplete-input': {
                  padding: '4px 4px 8px 12px',
                },
              },
            },
          },
        },
      },
    });

    return (
      <ThemeProvider theme={autoCompleteTheme}>
        <Autocomplete
          key={`${id}-autocomplete`}
          id={`${id}-autocomplete`}
          disableListWrap
          disableClearable
          freeSolo
          forcePopupIcon={comboItemList.length > 0}
          clearOnBlur={false}
          handleHomeEndKeys={false}
          disabled={readonly}
          ref={comboComponent}
          value={selectedValue}
          inputValue={inputValue}
          onChange={comboOnChange}
          onInputChange={comboOnChange}
          onBlur={() => {
            // フリー入力不可の場合、リストにない入力値はクリアする
            if (isFreeInput) {
              onChange(inputValue);
              return;
            }
            const findItem = comboItemList.find(
              (item) => item.label === inputValue
            );
            if (!findItem) {
              comboOnChange(undefined, '', 'onBlur');
            } else if (findItem.seqNo === 0) {
              onChange('');
            }
          }}
          options={comboItemList}
          renderInput={(params) => (
            <div className="with-units-div">
              <TextField
                {...params}
                className="input-text"
                label=""
                key={`${id}-combotext`}
                id={`${id}-combotext`}
              />
              {units && <span>{`（${units}）`}</span>}
            </div>
          )}
          renderOption={(
            renderProps,
            option: ComboItemDefine,
            optionState: AutocompleteRenderOptionState
          ) => {
            const indent = ''.padStart(option.level, '　');
            return (
              // eslint-disable-next-line react/jsx-no-useless-fragment
              <>
                {option.title ? (
                  // タイトル部
                  <div className="layer-combobox-group-title">
                    {`${indent}${option.title}`}
                  </div>
                ) : (
                  // 選択肢
                  <li
                    key={`${id}-listitem-${option.seqNo}`}
                    {...renderProps}
                    className="MuiAutocomplete-option layer-combobox-item"
                  >
                    <div>{`${indent}${option.label ? option.label : ''}`}</div>
                  </li>
                )}
              </>
            );
          }}
          getOptionLabel={(option) => {
            if (typeof option === 'string') {
              return option;
            }
            return option.label ?? '';
          }}
          isOptionEqualToValue={(option, val) => {
            // 選択中の選択肢ハイライト
            const inputStr =
              typeof val === 'string'
                ? (val as unknown as string)
                : val.label ?? '';
            return option.label === inputStr;
          }}
          filterOptions={(options, state) => {
            // 選択肢の検索

            // comboの場合は選択肢の検索をしない
            if (
              schema[Const.EX_VOCABULARY.UI_LISTTYPE] ===
              Const.JESGO_UI_LISTTYPE.COMBO
            ) {
              return options;
            }

            // 入力値と完全一致するリストがある = リストから選択済み と見なし、選択肢の検索をしない
            if (options.find((op) => (op.label ?? '') === state.inputValue)) {
              return options;
            }

            // 同一グループのタイトルは表示させる
            const groupIds = options
              // .filter((op) => (op.label ?? '').startsWith(state.inputValue)) // 前方一致
              .filter((op) => (op.label ?? '').includes(state.inputValue)) // 部分一致
              .map((op) => op.groupId);

            const filteredOptions = options.filter(
              (op) =>
                // (op.label ?? '').startsWith(state.inputValue) ||
                (op.label ?? '').includes(state.inputValue) ||
                (groupIds.includes(op.groupId) && op.title)
            );

            return filteredOptions.length > 0 ? filteredOptions : options;
          }}
          noOptionsText="検索結果がありません"
        />
      </ThemeProvider>
    );
  };

  /* eslint-disable 
    react/function-component-definition,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/restrict-template-expressions,react/destructuring-assignment,
    @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call,@typescript-eslint/restrict-plus-operands,@typescript-eslint/no-explicit-any */
  // https://github.com/rjsf-team/react-jsonschema-form/blob/master/packages/core/src/components/fields/ArrayField.js
  // Latest commit 1bbd0ad
  // TODO propsは仮でany
  // 配列Widget用カスタムアイテム
  export function DefaultArrayItem(props: any, isNotExistProperty: boolean) {
    const btnStyle = {
      flex: 1,
      paddingLeft: 6,
      paddingRight: 6,
      fontWeight: 'bold',
    };
    return (
      <div
        key={props.key}
        className={`array-item-border row ${props.className}`}
      >
        {/* <div className={props.hasToolbar ? "col-xs-9" : "col-xs-12"}></div> */}
        <div
          className={
            props.hasToolbar
              ? 'col-lg-11 col-md-11 col-sm-10 col-xs-9'
              : 'col-xs-12'
          }
        >
          {props.children}
        </div>

        {props.hasToolbar && (
          //   <div className="col-xs-3 array-item-toolbox">
          <div className="col-lg-1 col-md-1 col-sm-2 col-xs-3 array-item-toolbox">
            <div
              className="btn-group"
              style={{
                display: 'flex',
                justifyContent: 'space-around',
              }}
            >
              {(props.hasMoveUp || props.hasMoveDown) && (
                <IconButton
                  icon="arrow-up"
                  aria-label="Move up"
                  className="array-item-move-up"
                  tabIndex="-1"
                  style={btnStyle}
                  disabled={
                    props.disabled || props.readonly || !props.hasMoveUp
                  }
                  onClick={props.onReorderClick(props.index, props.index - 1)}
                />
              )}

              {(props.hasMoveUp || props.hasMoveDown) && (
                <IconButton
                  icon="arrow-down"
                  className="array-item-move-down"
                  aria-label="Move down"
                  tabIndex="-1"
                  style={btnStyle}
                  disabled={
                    props.disabled || props.readonly || !props.hasMoveDown
                  }
                  onClick={props.onReorderClick(props.index, props.index + 1)}
                />
              )}

              {props.hasRemove && (
                <IconButton
                  type="danger"
                  icon="remove"
                  aria-label="Remove"
                  className="array-item-remove"
                  tabIndex="-1"
                  style={btnStyle}
                  // スキーマに存在しないプロパティの場合は削除ボタンだけ使用可にする
                  disable={
                    isNotExistProperty
                      ? false
                      : props.disabled || props.readonly
                  }
                  onClick={props.onDropIndexClick(props.index)}
                />
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
  /* eslint-enable */

  /* eslint-disable */
  // 配列object用追加ボタン
  // https://github.com/rjsf-team/react-jsonschema-form/blob/master/packages/core/src/components/AddButton.js
  // Latest commit d6f0964
  type addButtonProp = {
    className: string;
    onClick: (event?: any) => void;
    disabled: boolean;
  };
  export function AddButton({ className, onClick, disabled }: addButtonProp) {
    return (
      // <div className="row">
      <div className="row array-item-padding">
        <p className={`col-xs-3 col-xs-offset-9 text-right ${className}`}>
          <IconButton
            type="info"
            icon="plus"
            className="btn-add col-xs-12"
            aria-label="Add"
            tabIndex="0"
            onClick={onClick}
            disabled={disabled}
          />
        </p>
      </div>
    );
  }

  interface RadioItem {
    label?: string; // 表示用項目名
    value?: string; // 実際の値
    title?: string; // 階層見出し
    items?: RadioItem[][]; // 子のラジオ項目
  }

  /**
   * oneOfで定義された階層表示可能なラジオボタン
   * @param props
   * @returns
   */
  export function LayerRadioButton(props: WidgetProps) {
    const {
      options,
      value,
      required,
      disabled,
      readonly,
      autofocus,
      onBlur,
      onFocus,
      onChange,
      id,
      schema,
    } = props;
    // Generating a unique field name to identify this set of radio buttons
    const name = Math.random().toString();
    // const { enumOptions, enumDisabled, inline } = options;

    // 選択肢を作成
    const createSelectItem = (
      radioItem: RadioItem,
      i: number
    ): JSX.Element | null => {
      const disabledCls = disabled || readonly ? 'disabled' : '';

      const radio = (checked: boolean, value: string, label: string) => {
        return (
          <span>
            <input
              type="radio"
              checked={checked}
              name={name}
              required={required}
              value={radioItem.value}
              disabled={disabled || readonly}
              autoFocus={autofocus && i === 0}
              onChange={(_) => onChange(value)}
              onBlur={onBlur && ((event) => onBlur(id, event.target.value))}
              onFocus={onFocus && ((event) => onFocus(id, event.target.value))}
            />
            <span>{label}</span>
          </span>
        );
      };

      return (
        <>
          {radioItem.items && (
            <>
              {radioItem.title && (
                <div className="control-label">
                  <label className="radio-label">{radioItem.title}</label>
                </div>
              )}
              {radioItem.items.map((radioItems) => {
                return (
                  <>
                    <div className={radioItem.title ? 'radio-item-div' : ''}>
                      {radioItems.map((oneItem) => {
                        return (
                          <>
                            {oneItem.items ? (
                              createSelectItem(oneItem, 1)
                            ) : (
                              <>
                                <label
                                  key={i}
                                  className={`radio-inline ${disabledCls} radio-label`}
                                >
                                  {radio(
                                    oneItem.value === value,
                                    oneItem.value ?? '',
                                    oneItem.label ?? ''
                                  )}
                                </label>
                              </>
                            )}
                          </>
                        );
                      })}
                    </div>
                  </>
                );
              })}
            </>
          )}
          {radioItem.label && radioItem.value && (
            <label
              key={i}
              className={`radio-inline ${disabledCls} radio-label`}
            >
              {radio(
                radioItem.value === value,
                radioItem.value,
                radioItem.label
              )}
            </label>
          )}
        </>
      );
    };

    // ラジオボタンのスキーマを解析して扱いやすい形式に変換する
    const createRadioItem = (radioItemList: RadioItem[], item: JSONSchema7) => {
      // const: 階層なし
      if (item.const) {
        radioItemList.push({
          label: item.title ? item.title : (item.const as string),
          value: item.const as string,
        });
      } else if (item.enum) {
        //enum: 1行に展開される選択肢一覧

        // enumの値から選択肢生成
        const enumItemList: RadioItem[] = [];
        item.enum.forEach((enumItem) => {
          if (typeof enumItem === 'string') {
            const enumVal = enumItem as string;
            enumItemList.push({ label: enumVal, value: enumVal });
          }
        });

        let isAdded = false;
        if (!item.title) {
          // タイトルなしのenumの場合は以前のセクションとして追加する
          const hasTitleItems = radioItemList.filter((p) => p.title && p.items);
          if (hasTitleItems.length > 0) {
            // 1つ前のタイトルありenumのitemsに追加する
            const prevRadioItem = hasTitleItems[hasTitleItems.length - 1];

            if (!prevRadioItem.items) {
              prevRadioItem.items = [];
            }
            prevRadioItem.items.push(enumItemList);
            isAdded = true;
          }
        }

        if (!isAdded) {
          // 新規セクションとして追加
          const newItem: RadioItem = { title: item.title ?? '' };
          newItem.items = [];
          newItem.items.push(enumItemList);
          radioItemList.push(newItem);
        }
      } else if (item.title && item.oneOf) {
        // oneOf(入れ子)
        const newItem: RadioItem = { title: item.title };
        newItem.items = [];

        const oneOfRadioItemList: RadioItem[] = [];
        (item.oneOf as JSONSchema7[]).forEach((tmpItem) => {
          createRadioItem(oneOfRadioItemList, tmpItem);
        });
        newItem.items.push(oneOfRadioItemList);

        const hasItems = radioItemList.filter((p) => p.items);
        if (hasItems.length > 0) {
          // 1つ前のitemsに追加する
          const prevRadioItem = hasItems[hasItems.length - 1];
          (prevRadioItem.items as RadioItem[][]).push([newItem]);
        } else {
          radioItemList.push(newItem);
        }
      }
    };

    const oneOf = schema.oneOf as JSONSchema7[];
    const radioItemList: RadioItem[] = [];
    // oneOfを解析してラジオ用のItem作成
    if (oneOf) {
      oneOf.forEach((item) => {
        createRadioItem(radioItemList, item);
      });
    }
    return (
      <div className="field-radio-group radio-item-div" id={id}>
        {radioItemList &&
          radioItemList.map((item: RadioItem, index: number) =>
            createSelectItem(item, index)
          )}
      </div>
    );
  }

  //#region 複数チェックボックス用
  function selectValue(value: any, selected: any, all: any) {
    const at = all.indexOf(value);

    let selectedValues = selected;
    if (!selectedValues) {
      selectedValues = [];
    }

    const updated = selectedValues
      .slice(0, at)
      .concat(value, selectedValues.slice(at));
    // As inserting values at predefined index positions doesn't work with empty
    // arrays, we need to reorder the updated selection to match the initial order
    return updated.sort((a: any, b: any) => all.indexOf(a) > all.indexOf(b));
  }

  function deselectValue(value: any, selected: any) {
    return selected.filter((v: any) => v !== value);
  }

  /**
   * 複数チェックボックス用Widget
   * @param props
   * @returns
   */
  export function CustomCheckboxesWidget(props: WidgetProps) {
    const { id, disabled, options, value, autofocus, readonly, onChange } =
      props;
    const { enumOptions, enumDisabled, inline } = options;

    // デフォルトのwidgetだとnullの考慮が不足しているので追加する
    return (
      <div className="checkboxes" id={id}>
        {enumOptions &&
          Array.isArray(enumOptions) &&
          enumOptions.map((option, index) => {
            const checked = value ? value.indexOf(option.value) !== -1 : false;
            const itemDisabled =
              enumDisabled &&
              typeof enumDisabled === 'string' &&
              enumDisabled.indexOf(option.value) != -1;
            const disabledCls =
              disabled || itemDisabled || readonly ? 'disabled' : '';
            const checkbox = (
              <span>
                <input
                  type="checkbox"
                  id={`${id}_${index}`}
                  checked={checked}
                  disabled={disabled || itemDisabled || readonly}
                  autoFocus={autofocus && index === 0}
                  onChange={(event) => {
                    const all = enumOptions.map(({ value }) => value);
                    if (event.target.checked) {
                      onChange(selectValue(option.value, value, all));
                    } else {
                      onChange(deselectValue(option.value, value));
                    }
                  }}
                />
                <span>{option.label}</span>
              </span>
            );
            return inline ? (
              <label key={index} className={`checkbox-inline ${disabledCls}`}>
                {checkbox}
              </label>
            ) : (
              <div key={index} className={`checkbox ${disabledCls}`}>
                <label>{checkbox}</label>
              </div>
            );
          })}
      </div>
    );
  }
  //#endregion 複数チェックボックス用

  /**
   * 削除ボタン付きテキストボックス
   * @param props
   * @returns
   */
  export const DeleteTextWidget = (props: WidgetProps) => {
    const { registry, schema } = props;
    const { BaseInput } = registry.widgets;

    const notExist = schema[Const.EX_VOCABULARY.NOT_EXIST_PROP];

    /**
     * 削除ボタン押下時の処理
     */
    const deleteItem = useCallback(() => {
      // eslint-disable-next-line react/destructuring-assignment
      if (props.onChange) {
        // eslint-disable-next-line react/destructuring-assignment
        props.onChange(undefined);
      }
    }, [props]);

    return (
      <div className="with-delete-div">
        {/* eslint-disable-next-line react/jsx-props-no-spreading */}
        <BaseInput {...props} />
        {notExist && (
          <span>
            <Button
              bsClass="btn btn-xs"
              className="error-msg-btn-delete"
              onClick={deleteItem}
            >
              <Glyphicon glyph="remove" />
            </Button>
          </span>
        )}
      </div>
    );
  };

  export const DeleteCheckboxWidget = (props: WidgetProps) => {
    const {
      schema,
      id,
      value,
      disabled,
      readonly,
      label,
      autofocus = false,
    } = props;

    const notExist = schema[Const.EX_VOCABULARY.NOT_EXIST_PROP];

    /**
     * 削除ボタン押下時の処理
     */
    const deleteItem = useCallback(() => {
      // eslint-disable-next-line react/destructuring-assignment
      if (props.onChange) {
        // eslint-disable-next-line react/destructuring-assignment
        props.onChange(undefined);
      }
    }, [props]);

    return (
      <div className={`checkbox ${disabled || readonly ? 'disabled' : ''}`}>
        <label>
          <input
            type="checkbox"
            id={id}
            name={id}
            checked={typeof value === 'undefined' ? false : value}
            disabled={disabled || readonly}
            autoFocus={autofocus}
          />
          <span>{label}</span>
          {notExist && (
            <span>
              <Button
                bsClass="btn btn-xs"
                className="error-msg-btn-delete"
                onClick={deleteItem}
              >
                <Glyphicon glyph="remove" />
              </Button>
            </span>
          )}
        </label>
      </div>
    );
  };
}
/* eslint-enable */
