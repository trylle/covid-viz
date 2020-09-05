/* eslint import/no-webpack-loader-syntax: off */

import { LatLng } from "leaflet";
import * as d3 from "d3";
import binarySearch from "binary-search";
import * as THREE from "three";
import { isMobile } from "mobile-device-detect";
import { CountryDensities, Densities, Density } from "./country-densities";
import { FeatureCollection, Feature } from "geojson";
import { CovidStatistics, CovidStatisticsDataForRegion } from "./types";
// @ts-ignore
import vertexShader from "!!raw-loader!./vertex-shader.glsl";
// @ts-ignore
import fragmentShader from "!!raw-loader!./fragment-shader.glsl";
import { getFeatureCountry, getFeatureState } from "./country-features";
import { polar2Cartesian } from "./three-globe";

export const getDecimation = () => {
  let decimation = 10; // FIXME: Should be handled dynamically

  if (isMobile) {
    decimation = 30;
  }

  return decimation;
};

export const generateDatapoints = (
  densities: CountryDensities[],
  countriesGeoJson: FeatureCollection,
  globals: any,
  statsConfirmed: CovidStatistics,
  statsRecovered: CovidStatistics,
  statsDeaths: CovidStatistics
) => {
  let points: {
    point: LatLng;
    time: number;
    recoveredTime?: number;
    deadTime?: number;
  }[] = [];

  type GeoPt = [number, number];
  type GeoBounds = [GeoPt, GeoPt];

  let countries: {
    geoBounds: GeoBounds;
    feature: Feature;
    densities?: Densities;
    statsConfirmed?: number[];
    statsRecovered?: number[];
    statsDeaths?: number[];
  }[] = countriesGeoJson.features.map((feature: Feature) => {
    const country = getFeatureCountry(feature);
    const state = getFeatureState(feature);

    const statMatch = (sd: CovidStatisticsDataForRegion) => sd.country === country && sd.state === state;

    return {
      geoBounds: d3.geoBounds(feature.geometry),
      feature,
      densities: densities.find((density) => density.admin === country && density.admin_1 === state)?.densities,
      statsConfirmed: statsConfirmed.data.find(statMatch)?.values,
      statsRecovered: statsRecovered.data.find(statMatch)?.values,
      statsDeaths: statsDeaths.data.find(statMatch)?.values,
    };
  });

  countries.forEach((country) => {
    if (!country.statsConfirmed) return;

    const genPoint = (country: any) => {
      const x = Math.random();

      let idx = binarySearch(country.densities, { density: x } as Density, (element: Density, needle: Density) => {
        return element.density - needle.density;
      });

      if (idx < 0) idx = -idx - 1;

      idx = Math.max(0, Math.min(country.densities.length - 1, idx));

      const point = { ...country.densities[idx].point };

      point.lat += u();
      point.lng += u();

      return point;
    };

    const s = 360 / 4096 / 2;
    const u = () => (Math.random() * 2 - 1) * s;
    const decimation = getDecimation();
    const startPoint = points.length;

    const getNewCases = (array: number[], day: number, newCasesObj: { newCases?: number; remainder?: number } = {}) => {
      const num = array[day] ?? 0;
      const prev = array[day - 1] ?? 0;
      let newCases = (num - prev) / decimation;
      let remainder = newCasesObj.remainder ?? 0;

      remainder += newCases - Math.floor(newCases);

      if (remainder >= 1) {
        const x = Math.floor(remainder);
        newCases += x;
        remainder -= x;
      }

      newCasesObj.remainder = remainder;

      return Math.floor(newCases);
    };

    const statsConfirmedCasesObj = {};
    const statsRecoveredCasesObj = {};
    const statsDeadCasesObj = {};

    if (!country.statsConfirmed) return;

    country.statsConfirmed.forEach((_, day) => {
      const newCases = getNewCases(country.statsConfirmed!, day, statsConfirmedCasesObj);

      for (let i = 0; i < newCases; ++i) {
        points.push({
          point: genPoint(country),
          time: day,
          recoveredTime: day + 14, // FIXME: Recovery is currently assumed to be within two weeks, if there is no recovery/death data.
        });
      }
    });

    let pointsChanged: { recovered: number; dead: number }[] = country.statsConfirmed.map(() => ({ recovered: 0, dead: 0 }));

    country.statsRecovered?.forEach((_, day) => {
      const newCases = getNewCases(country.statsRecovered!, day, statsRecoveredCasesObj);

      pointsChanged[day].recovered += newCases;
    });

    country.statsDeaths?.forEach((_, day) => {
      const newCases = getNewCases(country.statsDeaths!, day, statsDeadCasesObj);

      pointsChanged[day].dead += newCases;
    });

    let startPointUpdate = startPoint;

    pointsChanged.forEach((c, day) => {
      for (let i = 0; i < c.dead; ++i) {
        const pt = points[startPointUpdate++];

        if (pt === undefined) return; // exhausted points, inconsistent data?

        pt.recoveredTime = undefined;
        pt.deadTime = day;
      }

      for (let i = 0; i < c.recovered; ++i) {
        const pt = points[startPointUpdate++];

        if (pt === undefined) return; // exhausted points, inconsistent data?

        pt.recoveredTime = day;
      }
    });
  });

  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array(
    points
      .map((p: any) => {
        const xyz = polar2Cartesian(p.point);
        return [xyz.x, xyz.y, xyz.z];
      })
      .flat()
  );

  const times = new Float32Array(points.map((p) => p.time));
  const recoveredTimes = new Float32Array(points.map((p) => p.recoveredTime ?? Number.POSITIVE_INFINITY));
  const deadTimes = new Float32Array(points.map((p) => p.deadTime ?? Number.POSITIVE_INFINITY));

  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setAttribute("confirmed_time", new THREE.BufferAttribute(times, 1));
  geometry.setAttribute("recovered_time", new THREE.BufferAttribute(recoveredTimes, 1));
  geometry.setAttribute("dead_time", new THREE.BufferAttribute(deadTimes, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
    },
    vertexShader,
    fragmentShader,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.SrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    transparent: true,
    depthWrite: false,
  });
  const mesh = new THREE.Points(geometry, material);

  globals.dispatcher.on("timeChanged.data-points", (time: number) => {
    material.uniforms.time.value = time;
  });

  mesh.onBeforeRender = () => {
    material.uniforms.extinction_time = { value: globals.extinction };
    material.uniforms.keep_deaths = { value: globals.keepDeaths };
    material.uniforms.use_recovery_data = { value: globals.useRecoveryData };
  };

  return mesh;
};
