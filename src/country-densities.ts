import Leaflet from "leaflet";
import { responseToJson } from "./common";

export type Density = { point: Leaflet.LatLng; density: number };
export type Densities = Density[];
export type CountryDensities = { densities: Densities; admin: string; admin_1: string };

function processCountryDensities(json: object) {
  const countryDensities = json as CountryDensities[];

  countryDensities.forEach((countryDensity) => {
    let sum = 0;

    countryDensity.densities.forEach((d, idx) => {
      countryDensity.densities[idx].density = Math.pow(countryDensity.densities[idx].density, 1);
    });

    // normalize densities per administrative region
    countryDensity.densities.forEach((d) => {
      sum += d.density;
    });

    countryDensity.densities.forEach((d, idx) => {
      countryDensity.densities[idx].density /= sum;
    });

    sum = 0;

    countryDensity.densities.forEach((d, idx) => {
      countryDensity.densities[idx].density += sum;
      sum = countryDensity.densities[idx].density;
    });
  });

  return countryDensities;
}

export const getCountryDensities = async () => {
  const res = [fetch("./country-density.json"), fetch("./china-density.json"), fetch("./usa-density.json")];

  const countryDensities: CountryDensities[] = [];

  await Promise.allSettled(
    res.map(async (r) => {
      const cd = processCountryDensities(await responseToJson(r));

      countryDensities.push(...cd);
    })
  );

  return countryDensities;
};
