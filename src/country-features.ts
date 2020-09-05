import { FeatureCollection, Feature } from "geojson";
import { responseToJson } from "./common";
// @ts-ignore
import rewind from "@mapbox/geojson-rewind";

export const getFeatureCountry = (feature?: Feature) =>
  (feature?.properties as any)?.["ADMIN"] ?? (feature?.properties as any)?.["admin"] ?? (feature?.properties as any)?.["NAME_0"];
export const getFeatureState = (feature?: Feature) => (feature?.properties as any)?.["name"] ?? (feature?.properties as any)?.["NAME_1"];

const removeChinaUs = (fc: FeatureCollection) => {
  fc.features = fc.features.filter((f) => {
    const admin = getFeatureCountry(f);

    return admin !== "China" && admin !== "United States of America";
  });
};

export async function getCountryFeatures(): Promise<FeatureCollection | undefined> {
  const res = [
    { fetch: fetch("./ne_110m_admin_0_countries.geojson"), preprocess: removeChinaUs },
    fetch("./ne_110m_admin_1_states_provinces.geojson"),
    fetch("./gadm36_CHN_1.json"),
  ];

  let fc: FeatureCollection | undefined = undefined;

  await Promise.allSettled(
    res.map(async (r) => {
      const cd = (await responseToJson((r as any).fetch ?? r)) as FeatureCollection;

      rewind(cd, true);

      (r as any).preprocess?.(cd);

      if (fc === undefined) fc = cd;
      else fc.features.push(...cd.features);
    })
  );

  return fc;
}
