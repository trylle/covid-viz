import * as d3 from "d3";
import { Feature, FeatureCollection } from "geojson";
import assert from "assert";
import { getFeatureCountry, getFeatureState } from "./country-features";
import { CovidStatistics, GlobalsType } from "./types";

export const processCsseCovidData = async (
  path = "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv",
  countriesGeoJson: FeatureCollection
): Promise<CovidStatistics> => {
  const parseDate = d3.timeParse("%-m/%-d/%y");

  const getCountry = (country: string, state: string | undefined = undefined) => {
    const f = countriesGeoJson.features.find((feature: Feature) => {
      const countrygj = getFeatureCountry(feature);
      const stategj = getFeatureState(feature);

      return countrygj === country && stategj === state;
    });

    return f;
  };

  const findStartDateIdx = (keys: string[]) => {
    return keys.findIndex((k) => {
      return parseDate(k) !== null;
    });
  };

  const data = await d3.csv(path, (d) => {
    let [country, state] = [
      (d["Country/Region"] ?? d["Country_Region"]) as string,
      (d["Province/State"] ?? d["Province_State"]) as string | undefined,
    ];
    const keys = Object.keys(d);
    const values = [];

    if (state === "") state = undefined;

    if (country === "US" && state === undefined) return;

    if (country === "US") country = "United States of America"; // consistency is a nice thing

    if (state !== undefined && !getCountry(country, state) && getCountry(country)) state = undefined;

    const dateStartIdx = findStartDateIdx(keys);

    for (let i = dateStartIdx; i < keys.length; ++i) {
      const key = keys[i];
      const c = d[key];

      assert(c !== undefined);

      values.push(+c);
    }

    return { country, state, values };
  });

  for (let i = 0; i < data.length; ++i) {
    const s = data[i];

    for (let j = i + 1; j < data.length; ++j) {
      const t = data[j];

      if (s.country === t.country && s.state === t.state) {
        s.values = s.values.map((v, idx) => {
          return v + t.values[idx];
        });
        data.splice(j, 1);
        --j;
      }
    }
  }

  const keys = data.columns;
  const dates: Date[] = [];
  const dateStartIdx = findStartDateIdx(keys);

  for (let i = dateStartIdx; i < keys.length; ++i) {
    const key = keys[i];
    const date = parseDate(key);

    assert(date);

    dates.push(date);
  }

  return { dates, data };
};

export type StatisticsRequests = { path: string; func: Function; data?: CovidStatistics }[];

export const processStatistics = async (requests: StatisticsRequests, countriesGeoJson: FeatureCollection, globals: GlobalsType) => {
  const funcs = new Map<Function, CovidStatistics[]>();
  await Promise.allSettled(
    requests.map(async (r) => {
      const { func, path } = r;
      const data = await processCsseCovidData(path, countriesGeoJson);

      if (!funcs.has(func)) funcs.set(func, []);

      funcs.get(func)!.push(data);
    })
  );

  // FIXME: Handle different dates

  [...funcs.keys()].forEach((func) => {
    const datas = funcs.get(func)!;
    const finalized: CovidStatistics = {
      data: [],
      dates: [],
    };

    for (const data of datas) {
      if (finalized.dates.length === 0) finalized.dates = data.dates;

      finalized.data.push(...data.data);
    }

    if (globals.startDate === undefined) globals.startDate = finalized.dates[0];

    func(finalized);
  });
};
