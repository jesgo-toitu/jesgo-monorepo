/**
 * その他共通で扱うデータ
 */

import { Reducer } from 'redux';
import { jesgoPluginColumns } from '../common/Plugin';
import { JesgoRequiredHighlight } from '../common/CaseRegistrationUtility';

export interface commonState {
  scrollTop?: number; // スクロール位置(Y軸)
  isHiddenSaveMassage?: boolean; // 保存確認ダイアログの表示有無
  isSaveAfterTabbing?: boolean; // タブ移動時の保存有無
  isShownSaveMessage?: boolean; // 保存確認ダイアログ表示中フラグ
  subSchemaCount?: number; // 自動生成されるサブスキーマの個数
  isJesgoRequiredHighlight?: JesgoRequiredHighlight; // jesgo:required 未入力時ハイライト

  pluginList?: jesgoPluginColumns[];

  topMenuInfo?: {
    paramString: string;
    isDetail: boolean;
  };
}

export interface commonAction {
  type: string;
  scrollTop?: number;
  isHiddenSaveMassage?: boolean;
  isSaveAfterTabbing?: boolean;
  isShownSaveMessage?: boolean;
  isJesgoRequiredHighlight?: JesgoRequiredHighlight;

  pluginList?: jesgoPluginColumns[];

  topMenuInfo?: {
    paramString: string;
    isDetail: boolean;
  };
}

const createInitialState = (): commonState => ({
  scrollTop: 0,
  isHiddenSaveMassage: false,
  isSaveAfterTabbing: false,
  isShownSaveMessage: false,
  isJesgoRequiredHighlight: {
    jsog: false,
    jsgoe: false,
    others: false
  },
  pluginList: undefined,
  topMenuInfo: {
    paramString: '',
    isDetail: false,
  },
});

const initialState: commonState = createInitialState();

const commonReducer: Reducer<commonState, commonAction> = (
  // eslint-disable-next-line default-param-last
  state = initialState,
  action: commonAction // eslint-disable-line @typescript-eslint/no-explicit-any
) => {
  const copyState = state;

  switch (action.type) {
    // スクロール位置保存
    case 'SCROLL_POSITION': {
      copyState.scrollTop = action.scrollTop;
      break;
    }

    case 'SAVE_MESSAGE_STATE': {
      // 保存確認ダイアログ表示有無
      if (action.isHiddenSaveMassage !== undefined) {
        copyState.isHiddenSaveMassage = action.isHiddenSaveMassage;
      }
      // タブ移動での保存許可
      if (action.isSaveAfterTabbing !== undefined) {
        copyState.isSaveAfterTabbing = action.isSaveAfterTabbing;
      }
      break;
    }

    // 保存ダイアログ表示中フラグの更新
    case 'SHOWN_SAVE_MESSAGE': {
      copyState.isShownSaveMessage = action.isShownSaveMessage;
      break;
    }

    // jesgo:requiredのハイライトON/OFFの更新
    case 'JESGO_REQUIRED_HIGHLIGHT': {
      copyState.isJesgoRequiredHighlight = action.isJesgoRequiredHighlight;
      break;
    }

    // プラグイン一覧キャッシュ
    case 'PLUGIN_LIST': {
      copyState.pluginList = action.pluginList;
      break;
    }

    // 患者一覧の検索条件
    case 'SET_TOP_MENU_INFO': {
      copyState.topMenuInfo = action.topMenuInfo;
      break;
    }

    // 初期化
    case 'INIT_STORE': {
      // プラグイン一覧はここでは初期化しない
      return {
        ...createInitialState(),
        pluginList: copyState.pluginList,
        topMenuInfo: copyState.topMenuInfo,
      };
    }
    default:
      break;
  }

  return copyState;
};

export default commonReducer;
