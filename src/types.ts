export type CovidStatisticsDataForRegion = {
  country: string;
  state: string | undefined;
  values: number[];
};

export type CovidStatisticsData = CovidStatisticsDataForRegion[];

export type CovidStatistics = {
  data: CovidStatisticsData;
  dates: Date[];
};

export type GlobalsType = {
  dispatcher: d3.Dispatch<object>;
  time: number;
  date?: Date;
  startDate?: Date;
  selectedRegionLines?: THREE.LineSegments;
  paused: boolean;
  extinction: number;
  useRecoveryData: boolean;
  keepDeaths: boolean;
};
