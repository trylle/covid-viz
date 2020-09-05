import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import ThreeGlobe from "three-globe";
import { GeoJsonGeometry } from "three-geojson-geometry";
import * as geojson from "geojson";
import * as d3 from "d3";
import { createMuiTheme, ThemeProvider } from "@material-ui/core/styles";
import { processStatistics, StatisticsRequests } from "./processing";
import { initScene, createLatLngClickHandler } from "./scene";
import { getCountryDensities, CountryDensities } from "./country-densities";
import { generateDatapoints } from "./data-points";
import { CovidStatistics, GlobalsType } from "./types";
import { generateChart } from "./chart";
import { getCountryFeatures, getFeatureCountry, getFeatureState } from "./country-features";
import { GLOBE_RADIUS } from "./three-globe";
import UiOverlay from "./ui-overlay";
import "./app.scss";

const simulatedDaysPerRealtimeSecond = 4;
const msPerTimeUnit = 24 * 60 * 60 * 1000;

function App() {
  const rootElement = useRef<HTMLDivElement>(null);
  const [scene, setScene] = useState<THREE.Scene>();
  const [globe, setGlobe] = useState<ThreeGlobe>();
  const [renderer, setRenderer] = useState<THREE.WebGLRenderer>();
  const [camera, setCamera] = useState<THREE.PerspectiveCamera>();
  const [countriesGeoJson, setCountriesGeoJson] = useState<geojson.FeatureCollection>();
  const [statsConfirmed, setStatsConfirmed] = useState<CovidStatistics>();
  const [statsRecovered, setStatsRecovered] = useState<CovidStatistics>();
  const [statsDeaths, setStatsDeaths] = useState<CovidStatistics>();
  const [countryDensities, setCountryDensities] = useState<CountryDensities[]>();
  const [selectedRegion, setSelectedRegion] = useState<string>();
  const [paused, setPaused] = useState<boolean>(true);
  const [globals] = useState<GlobalsType>({
    dispatcher: d3.dispatch("timeChanged"),
    _time: 0,
    _paused: true,
    _intervalId: undefined,
    extinction: 30,
    useRecoveryData: true,
    keepDeaths: true,
    get time() {
      return this._time;
    },
    set time(value) {
      if (this._time === value) return;

      this._time = value;
      this.dispatcher.call("timeChanged", null, this._time, this.date);
    },
    get date(): Date | undefined {
      const { startDate } = this;

      if (startDate === undefined) return undefined;

      return new Date(startDate.valueOf() + this.time * msPerTimeUnit);
    },
    set date(date: Date | undefined) {
      const { startDate } = this;

      if (startDate === undefined || date === undefined) return;

      this.time = (date.valueOf() - startDate.valueOf()) / msPerTimeUnit;
    },
    get paused() {
      return this._paused;
    },
    set paused(value) {
      if (value === this.paused) return;

      this._paused = value;

      if (this._intervalId !== undefined) {
        clearInterval(this._intervalId);
        this._intervalId = undefined;
      }

      if (!this.paused) {
        let lastTime: number | undefined = undefined;

        this._intervalId = setInterval(() => {
          const date = Date.now();

          const secondsElapsed = (date - (lastTime ?? date)) / 1000;

          lastTime = date;

          globals.time += secondsElapsed * simulatedDaysPerRealtimeSecond;
        }, 1000 / 60);
      }
    },
  } as any);

  useEffect(() => {
    const element = rootElement.current;

    if (!element) return;

    const obj = initScene(element);

    setGlobe(obj.globe);
    setScene(obj.scene);
    setRenderer(obj.renderer);
    setCamera(obj.camera);
  }, []);

  useEffect(() => {
    if (!countriesGeoJson || !camera || !globe || !renderer) return;

    const onClick = (latlng?: { lat: number; lng: number }) => {
      if (!latlng) return setSelectedRegion(undefined);

      const geopt: [number, number] = [latlng.lng, latlng.lat];

      const feature = countriesGeoJson?.features?.find?.((f) => {
        return d3.geoContains(f.geometry, geopt);
      });

      const countryName = getFeatureCountry(feature);
      const stateName = getFeatureState(feature);

      setSelectedRegion(stateName ?? countryName);
    };

    createLatLngClickHandler({ camera, globe, renderer, onClick });
  }, [countriesGeoJson, renderer, camera, globe]);

  useEffect(() => {
    if (!scene) return;

    if (globals.selectedRegionLines) {
      scene?.remove(globals.selectedRegionLines);
      globals.selectedRegionLines = undefined;
    }

    if (!countriesGeoJson || !selectedRegion) return;

    const material = new THREE.LineBasicMaterial({ color: "white" });

    for (const country of countriesGeoJson.features) {
      if (getFeatureCountry(country) !== selectedRegion && getFeatureState(country) !== selectedRegion) continue;

      globals.selectedRegionLines = new THREE.LineSegments(
        new GeoJsonGeometry(country.geometry as any /* messed up types */, GLOBE_RADIUS * 1.001),
        material
      );

      scene.add(globals.selectedRegionLines);

      break;
    }
  }, [countriesGeoJson, selectedRegion, scene, globals]);

  useEffect(() => {
    getCountryDensities().then((cd) => setCountryDensities(cd));
  }, []);

  useEffect(() => {
    (async () => {
      setCountriesGeoJson(await getCountryFeatures());
    })();
  }, []);

  useEffect(() => {
    if (!scene || !countriesGeoJson) return;

    const material = new THREE.LineBasicMaterial({ color: "red" });

    for (const country of countriesGeoJson.features) {
      const myLine = new THREE.LineSegments(new GeoJsonGeometry(country.geometry as any /* messed up types */, GLOBE_RADIUS), material);

      scene.add(myLine);
    }
  }, [scene, countriesGeoJson]);

  useEffect(() => {
    if (!countriesGeoJson) return;

    const requests: StatisticsRequests = [
      {
        path:
          "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv",
        func: setStatsConfirmed,
      },
      {
        path:
          "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_recovered_global.csv",
        func: setStatsRecovered,
      },
      {
        path:
          "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_global.csv",
        func: setStatsDeaths,
      },

      // US
      {
        path:
          "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_US.csv",
        func: setStatsConfirmed,
      },
      {
        path:
          "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_US.csv",
        func: setStatsDeaths,
      },
    ];

    processStatistics(requests, countriesGeoJson, globals);
  }, [globals, countriesGeoJson]);

  useEffect(() => {
    const element = rootElement.current;

    if (!element || !statsConfirmed || !statsDeaths || !globals) return;

    generateChart({ element, globals, statsConfirmed, statsDeaths, selectedRegion });
  }, [statsConfirmed, statsDeaths, globals, selectedRegion]);

  useEffect(() => {
    if (!countryDensities || !scene || !countriesGeoJson || !statsConfirmed || !statsRecovered || !statsDeaths) return;

    const mesh = generateDatapoints(countryDensities, countriesGeoJson, globals, statsConfirmed, statsRecovered, statsDeaths);

    scene.add(mesh);

    setPaused(false);
  }, [scene, countryDensities, countriesGeoJson, globals, statsConfirmed, statsRecovered, statsDeaths]);

  const theme = React.useMemo(
    () =>
      createMuiTheme({
        palette: {
          type: "dark",
          primary: {
            main: "#648dae",
          },
        },
      }),
    []
  );

  globals.paused = paused;

  return (
    <ThemeProvider theme={theme}>
      <div className="App" ref={rootElement}></div>
      <UiOverlay
        paused={paused}
        setPaused={(paused: boolean) => {
          setPaused(paused);
        }}
        globals={globals}
      />
    </ThemeProvider>
  );
}

export default App;
