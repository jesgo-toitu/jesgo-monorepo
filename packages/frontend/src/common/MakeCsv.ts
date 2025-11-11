export const csvHeader = [
  { label: '患者ID', key: 'patientId' },
  { label: '患者氏名', key: 'patinetName' },
  { label: '年齢', key: 'age' },
  { label: '初回治療開始日', key: 'startDate' },
  { label: '最終更新日', key: 'lastUpdate' },
  { label: '診断(主要がん種)', key: 'diagnosisMajor' },
  { label: '診断(その他)', key: 'diagnosisMinor' },
  { label: '進行期', key: 'advancedStage' },
  { label: '再発', key: 'recurrence' },
  { label: '化学療法', key: 'chemotherapy' },
  { label: '手術療法', key: 'operation' },
  { label: '放射線療法', key: 'radiotherapy' },
  { label: '緩和療法', key: 'supportiveCare' },
  { label: '登録', key: 'registration' },
  { label: '死亡', key: 'death' },
  { label: '3年予後', key: 'threeYearPrognosis' },
  { label: '5年予後', key: 'fiveYearPrognosis' },
];

export interface patientListCsv {
  patientId: string;
  patinetName: string;
  age: string;
  startDate: string;
  lastUpdate: string;
  diagnosisMajor: string;
  diagnosisMinor: string;
  advancedStage: string;
  recurrence: string;
  chemotherapy: string;
  operation: string;
  radiotherapy: string;
  supportiveCare: string;
  registration: string;
  death: string;
  threeYearPrognosis: string;
  fiveYearPrognosis: string;
}
