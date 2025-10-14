/* eslint-disable no-restricted-globals */
import React, { useState, useEffect, useMemo } from 'react';
import {
  FormControl,
  FormGroup,
  Radio,
  Glyphicon,
  Button,
  Checkbox,
} from 'react-bootstrap';
import './SearchDateComponent.css';
import { Const } from '../../common/Const';

export type searchDateInfo = {
  year: string;
  month: string;
  day: string;
};

export type searchDateInfoDataSet = {
  fromInfo: searchDateInfo;
  toInfo: searchDateInfo;
  isRange: boolean;
  searchType: string;
};

const MIN_DATE: Date = new Date(Const.INPUT_DATE_MIN); // 1900/01/01
const MAX_DATE: Date = new Date(9999, 11, 31); // 9999/12/31

const radioDefaultValue = '年次';
const dateInfoDefaultValue: searchDateInfo = { year: '', month: '', day: '' };

/**
 * 日付検索コンポーネント
 */
const SearchDateComponent = React.memo(
  (props: {
    ctrlId: string;
    searchValue: searchDateInfoDataSet | undefined;
    setSearchDateInfoDataSet: React.Dispatch<
      React.SetStateAction<searchDateInfoDataSet | undefined>
    >;
  }) => {
    const { ctrlId, searchValue, setSearchDateInfoDataSet } = props;

    const radioGroupName = useMemo(
      () => `${ctrlId}-${Math.random().toString()}`,
      []
    );

    const [isHiddenMonth, setisHiddenMonth] = useState(true);
    const [isHiddenDay, setisHiddenDay] = useState(true);
    const [radioSelectedValue, setRadioSelectedValue] =
      useState(radioDefaultValue);

    const [dateFromInfo, setDateFromInfo] =
      useState<searchDateInfo>(dateInfoDefaultValue);

    const [dateToInfo, setDateToInfo] =
      useState<searchDateInfo>(dateInfoDefaultValue);

    const [isRangeSearch, setIsRangeSearch] = useState(false);

    const checkedValue = (targetValue: string) =>
      radioSelectedValue === targetValue;

    // 年次/月次/日次ラジオボタン選択時のイベント
    const onChangeRadio = (e: React.FormEvent<Radio> | string) => {
      let selectedValue = '';
      if (typeof e === 'string') {
        selectedValue = e;
      } else {
        selectedValue = (e.target as HTMLInputElement).value.toString();
      }
      setRadioSelectedValue(selectedValue);
      switch (selectedValue) {
        case '年次': {
          setisHiddenMonth(true);
          setisHiddenDay(true);
          break;
        }
        case '月次': {
          setisHiddenMonth(false);
          setisHiddenDay(true);
          break;
        }

        case '日次': {
          setisHiddenMonth(false);
          setisHiddenDay(false);
          break;
        }

        default:
          break;
      }
    };

    // 日付入力時のイベント
    const onChangeDateText = (e: React.FormEvent<FormControl>) => {
      const element = e.target as HTMLInputElement;
      const targetId = element.id;

      let nextCtrlId1 = ''; // 移動先第1候補
      let nextCtrlId2 = ''; // 移動先第2候補

      // 入力中フラグ(全角入力の未確定時にtrue)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const isComposing = !!(e.nativeEvent as any)?.isComposing;

      // 数値は半角にする
      let value = element.value;
      if (!isComposing) {
        value = value.replace(/[０-９]/g, (s) =>
          String.fromCharCode(s.charCodeAt(0) - 0xfee0)
        );
      }

      // Fromのテキスト欄
      if (targetId.includes('dateFromYear')) {
        setDateFromInfo({ ...dateFromInfo, year: value });
        nextCtrlId1 = `dateFromMonth_${ctrlId}`;
        nextCtrlId2 = `dateToYear_${ctrlId}`;
      } else if (targetId.includes('dateFromMonth')) {
        setDateFromInfo({ ...dateFromInfo, month: value });
        nextCtrlId1 = `dateFromDay_${ctrlId}`;
        nextCtrlId2 = `dateToYear_${ctrlId}`;
      } else if (targetId.includes('dateFromDay')) {
        setDateFromInfo({ ...dateFromInfo, day: value });
        nextCtrlId1 = `dateToYear_${ctrlId}`;
      }

      // Toのテキスト欄
      if (targetId.includes('dateToYear')) {
        setDateToInfo({ ...dateToInfo, year: value });
        nextCtrlId1 = `dateToMonth_${ctrlId}`;
      } else if (targetId.includes('dateToMonth')) {
        setDateToInfo({ ...dateToInfo, month: value });
        nextCtrlId1 = `dateToDay_${ctrlId}`;
      } else if (targetId.includes('dateToDay')) {
        setDateToInfo({ ...dateToInfo, day: value });
      }

      // 最終桁まで入力したら次のコントロールにフォーカスを移動する
      if (
        value &&
        value.length === element.maxLength &&
        element.selectionStart === element.maxLength &&
        element.selectionStart === element.selectionEnd &&
        !isComposing
      ) {
        let nextElement = nextCtrlId1
          ? document.getElementById(nextCtrlId1)
          : null;
        // 見つかればフォーカス移動
        if (nextElement) {
          nextElement.focus();
        } else {
          // 第2候補
          nextElement = nextCtrlId2
            ? document.getElementById(nextCtrlId2)
            : null;
          if (nextElement) {
            nextElement.focus();
          }
        }
      }
    };

    // 現在日セットボタンのキャプション
    let nowDateButtonLabel = '今年';
    if (radioSelectedValue === '月次') {
      nowDateButtonLabel = '今月';
    } else if (radioSelectedValue === '日次') {
      nowDateButtonLabel = '本日';
    }

    useEffect(() => {
      // 入力値を親に返す
      setSearchDateInfoDataSet({
        fromInfo: dateFromInfo,
        toInfo: dateToInfo,
        isRange: isRangeSearch,
        searchType: radioSelectedValue,
      });
    }, [dateFromInfo, dateToInfo, isRangeSearch, radioSelectedValue]);

    useEffect(() => {
      if (!searchValue) {
        // 検索条件リセット
        setRadioSelectedValue(radioDefaultValue);
        setIsRangeSearch(false);
        setisHiddenMonth(true);
        setisHiddenDay(true);
        setDateFromInfo(dateInfoDefaultValue);
        setDateToInfo(dateInfoDefaultValue);
      } else {
        // 検索条件設定
        onChangeRadio(searchValue.searchType);
        setIsRangeSearch(searchValue.isRange);
        setDateFromInfo(searchValue.fromInfo);
        setDateToInfo(searchValue.toInfo);
      }
    }, [searchValue]);

    // 検索条件に現在日セット
    const setToday = (mode: 'from' | 'to') => {
      const today = new Date();
      const year = today.getFullYear().toString();
      const month = (today.getMonth() + 1).toString();
      const day = today.getDate().toString();

      const setValue: searchDateInfo = { year, month, day };

      // 非表示の項目はセットしない
      if (isHiddenMonth) setValue.month = '';
      if (isHiddenDay) setValue.day = '';

      if (mode === 'from') {
        setDateFromInfo(setValue);
      } else {
        setDateToInfo(setValue);
      }
    };

    // 矢印ボタン押下時の日付セット処理
    const setPrevNextDate = (
      mode: 'from' | 'to',
      direction: 'prev' | 'next'
    ) => {
      const dateInfo = mode === 'from' ? dateFromInfo : dateToInfo;
      const setValue: searchDateInfo = { ...dateInfo };

      const calcDirection = direction === 'prev' ? -1 : 1;

      const today = new Date();

      if (radioSelectedValue === '年次') {
        if (dateInfo.year && !isNaN(Number(dateInfo.year))) {
          setValue.year = (Number(dateInfo.year) + calcDirection).toString();
        } else {
          setValue.year = today.getFullYear().toString();
        }
      } else {
        // 月次か日次の場合はDateに変換してから計算

        // 空欄の項目は現在日を設定
        if (!dateInfo.year) dateInfo.year = today.getFullYear().toString();
        if (!dateInfo.month) dateInfo.month = (today.getMonth() + 1).toString();
        if (radioSelectedValue === '日次' && !dateInfo.day)
          dateInfo.day = today.getDate().toString();

        let currentDate = new Date(
          Number(dateInfo.year),
          Number(dateInfo.month) - 1,
          radioSelectedValue === '月次' ? 1 : Number(dateInfo.day)
        );
        currentDate.setFullYear(Number(dateInfo.year));
        // 不正な日付の場合は現在日を設定
        if (Number.isNaN(currentDate.getTime())) {
          currentDate = today;
        }

        if (radioSelectedValue === '月次') {
          currentDate.setMonth(currentDate.getMonth() + calcDirection);
        } else {
          currentDate.setDate(currentDate.getDate() + calcDirection);
        }

        setValue.year = currentDate.getFullYear().toString();
        setValue.month = (currentDate.getMonth() + 1).toString();
        if (radioSelectedValue === '日次') {
          setValue.day = currentDate.getDate().toString();
        }
      }

      // 日付の最大・最小値チェック
      const checkDate = new Date(1, 0, 1); // チェックする日付をsetValueから生成
      checkDate.setFullYear(
        Number(setValue.year) <= 0 ? 0 : Number(setValue.year)
      );

      if (['月次', '日次'].includes(radioSelectedValue)) {
        checkDate.setMonth(
          (Number(setValue.month) <= 0 ? 0 : Number(setValue.month)) - 1
        );
        if (radioSelectedValue === '日次') {
          checkDate.setDate(
            Number(setValue.day) <= 0 ? 1 : Number(setValue.day)
          );
        }
      }

      // 最大値チェック
      if (checkDate > MAX_DATE) {
        setValue.year = MAX_DATE.getFullYear().toString();
        if (['月次', '日次'].includes(radioSelectedValue)) {
          setValue.month = (MAX_DATE.getMonth() + 1).toString();
        }
        if (radioSelectedValue === '日次') {
          setValue.day = MAX_DATE.getDate().toString();
        }
      } else if (
        checkDate < MIN_DATE ||
        checkDate.getFullYear() < MIN_DATE.getFullYear()
      ) {
        // 最小値チェック
        setValue.year = MIN_DATE.getFullYear().toString();
        if (['月次', '日次'].includes(radioSelectedValue)) {
          setValue.month = (MIN_DATE.getMonth() + 1).toString();
        }
        if (radioSelectedValue === '日次') {
          setValue.day = MIN_DATE.getDate().toString();
        }
      }

      if (mode === 'from') {
        setDateFromInfo(setValue);
      } else {
        setDateToInfo(setValue);
      }
    };

    return (
      <>
        {/* 年次、月次、日次のラジオ */}
        <FormGroup className="searchdate-group">
          <Radio
            name={radioGroupName}
            className="searchdate-radio"
            onChange={onChangeRadio}
            value="年次"
            checked={checkedValue('年次')}
          >
            年次
          </Radio>
          <Radio
            name={radioGroupName}
            className="searchdate-radio"
            onChange={onChangeRadio}
            value="月次"
            checked={checkedValue('月次')}
          >
            月次
          </Radio>
          <Radio
            name={radioGroupName}
            className="searchdate-radio"
            onChange={onChangeRadio}
            value="日次"
            checked={checkedValue('日次')}
          >
            日次
          </Radio>
          <Checkbox
            className="searchdate-rangecheck"
            checked={isRangeSearch}
            onChange={(e: any) => {
              setIsRangeSearch(e.target.checked);
            }}
          >
            範囲指定
          </Checkbox>
        </FormGroup>

        <FormGroup className="searchdate-group">
          {/* From */}
          <Button onClick={() => setPrevNextDate('from', 'prev')}>
            <Glyphicon glyph="chevron-left" />
          </Button>
          <FormControl
            id={`dateFromYear_${ctrlId}`}
            type="text"
            autoComplete="off"
            className="searchdate-year"
            maxLength={4}
            value={dateFromInfo.year}
            onChange={onChangeDateText}
            onCompositionEnd={(e) => {
              onChangeDateText(e);
            }}
          />
          <span className="searchdate-between-text">年</span>
          {!isHiddenMonth && (
            <>
              <FormControl
                id={`dateFromMonth_${ctrlId}`}
                type="text"
                autoComplete="off"
                className="searchdate-month"
                maxLength={2}
                readOnly={isHiddenMonth}
                value={dateFromInfo.month}
                onChange={onChangeDateText}
                onCompositionEnd={(e) => {
                  onChangeDateText(e);
                }}
              />
              <span className="searchdate-between-text">月</span>
            </>
          )}
          {!isHiddenDay && (
            <>
              <FormControl
                id={`dateFromDay_${ctrlId}`}
                type="text"
                autoComplete="off"
                className="searchdate-day"
                maxLength={2}
                readOnly={isHiddenDay}
                value={dateFromInfo.day}
                onChange={onChangeDateText}
                onCompositionEnd={(e) => {
                  onChangeDateText(e);
                }}
              />
              <span className="searchdate-between-text">日</span>
            </>
          )}
          <Button onClick={() => setPrevNextDate('from', 'next')}>
            <Glyphicon glyph="chevron-right" />
          </Button>
          <Button onClick={() => setToday('from')}>{nowDateButtonLabel}</Button>
          {/* To */}
          {isRangeSearch && (
            <>
              <span style={{ margin: '0px 10px' }}>～</span>
              <Button onClick={() => setPrevNextDate('to', 'prev')}>
                <Glyphicon glyph="chevron-left" />
              </Button>
              <FormControl
                id={`dateToYear_${ctrlId}`}
                type="text"
                autoComplete="off"
                className="searchdate-year"
                maxLength={4}
                value={dateToInfo.year}
                onChange={onChangeDateText}
                onCompositionEnd={(e) => {
                  onChangeDateText(e);
                }}
              />
              <span className="searchdate-between-text">年</span>
              {!isHiddenMonth && (
                <>
                  <FormControl
                    id={`dateToMonth_${ctrlId}`}
                    type="text"
                    autoComplete="off"
                    className="searchdate-month"
                    maxLength={2}
                    readOnly={isHiddenMonth}
                    value={dateToInfo.month}
                    onChange={onChangeDateText}
                    onCompositionEnd={(e) => {
                      onChangeDateText(e);
                    }}
                  />
                  <span className="searchdate-between-text">月</span>
                </>
              )}
              {!isHiddenDay && (
                <>
                  <FormControl
                    id={`dateToDay_${ctrlId}`}
                    type="text"
                    autoComplete="off"
                    className="searchdate-day"
                    maxLength={2}
                    readOnly={isHiddenDay}
                    value={dateToInfo.day}
                    onChange={onChangeDateText}
                    onCompositionEnd={(e) => {
                      onChangeDateText(e);
                    }}
                  />
                  <span className="searchdate-between-text">日</span>
                </>
              )}
              <Button onClick={() => setPrevNextDate('to', 'next')}>
                <Glyphicon glyph="chevron-right" />
              </Button>
              <Button onClick={() => setToday('to')}>
                {nowDateButtonLabel}
              </Button>
            </>
          )}
        </FormGroup>
      </>
    );
  }
);

/**
 * searchDateInfoから日付文字列生成
 * @param dateInfo
 * @param searchType
 * @returns 変換成功時は日付文字列(yyyy-m-d) 失敗時はErrorを返す
 */
export const convertSearchDate = (
  dateInfo: searchDateInfo,
  searchType: string
): string | Error => {
  let dateStr = '';
  // #region  正常な日付かチェック
  // 全て空欄の場合は未入力扱いで返す
  if (
    (searchType === '年次' && dateInfo.year === '') ||
    (searchType === '月次' && dateInfo.year === '' && dateInfo.month === '') ||
    (searchType === '日次' &&
      dateInfo.year === '' &&
      dateInfo.month === '' &&
      dateInfo.day === '')
  ) {
    return '';
  }

  if (!dateInfo.year) {
    return new Error('年が未入力です');
  }

  const minYear = MIN_DATE.getFullYear();
  const maxYear = MAX_DATE.getFullYear();
  if (
    isNaN(Number(dateInfo.year)) ||
    Number(dateInfo.year) < minYear ||
    Number(dateInfo.year) > maxYear
  ) {
    return new Error(`年は${minYear}～${maxYear}の範囲で入力してください`);
  }

  const checkDate = new Date(1, 0, 1);
  checkDate.setFullYear(Number(dateInfo.year));
  dateStr += checkDate.getFullYear().toString();

  if (['月次', '日次'].includes(searchType)) {
    if (!dateInfo.month) {
      return new Error('月が未入力です');
    }
    if (
      isNaN(Number(dateInfo.month)) ||
      Number(dateInfo.month) < 1 ||
      Number(dateInfo.month) > 12
    ) {
      return new Error('月は1～12の範囲で入力してください');
    }
    checkDate.setMonth(Number(dateInfo.month) - 1);
    dateStr += `-${checkDate.getMonth() + 1}`;

    if (searchType === '日次') {
      if (!dateInfo.day) {
        return new Error('日が未入力です');
      }
      if (
        isNaN(Number(dateInfo.day)) ||
        Number(dateInfo.day) < 1 ||
        Number(dateInfo.day) > 31
      ) {
        return new Error('日は1～31の範囲で入力してください');
      }
      checkDate.setDate(Number(dateInfo.day));
      if (
        isNaN(checkDate.getTime()) ||
        checkDate.getDate() !== Number(dateInfo.day)
      ) {
        return new Error('存在しない日付が入力されています(例：2月31日など)');
      }

      dateStr += `-${checkDate.getDate()}`;
    }
  }
  // #endregion

  return dateStr;
};

export default SearchDateComponent;
