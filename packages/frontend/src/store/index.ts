import { createStore, combineReducers } from 'redux';
import formDataReducer from './formDataReducer';
import schemaDataReducer from './schemaDataReducer';
import commonReducer from './commonReducer';

const rootReducer = combineReducers({
  formDataReducer,
  schemaDataReducer,
  commonReducer,
});
export type RootState = ReturnType<typeof rootReducer>;

const store = createStore(rootReducer);

export default store;
