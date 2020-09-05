import React, { useState, useEffect } from "react";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import HelpIcon from "@material-ui/icons/Help";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import PauseIcon from "@material-ui/icons/Pause";
import IconButton from "@material-ui/core/IconButton";
import TuneIcon from "@material-ui/icons/Tune";
import { Collapse, Fade, Grow, Link, Backdrop, TextField, Slider, Grid, FormGroup, FormControlLabel, Checkbox } from "@material-ui/core";
import useForceUpdate from "use-force-update";
import { getDecimation } from "./data-points";
import { responseToJson } from "./common";

function handleChange<T>(f: (v: T) => void) {
  return (_: React.ChangeEvent<{}>, v: any) => f(v as T);
}

export default function UiOverlay(props: any) {
  const { paused, setPaused, globals } = props;
  const forceUpdate = useForceUpdate();

  const useGlobal = <T extends unknown>(propName: string): [T, (v: T) => void] => {
    return [
      globals[propName] as T,
      (v: T) => {
        globals[propName] = v;
        forceUpdate();
      },
    ];
  };

  const [helpExpanded, setHelpExpanded] = useState<boolean>(false);
  const [parametersExpanded, setParametersExpanded] = useState<boolean>(false);
  const [sourcesExpanded, setSourcesExpanded] = useState<boolean>(false);
  const [dependenciesExpanded, setDependenciesExpanded] = useState<boolean>(false);
  const [licenses, setLicenses] = useState<any>();
  const [shownLicense, setShownLicense] = useState<string>();
  const [extinctionEnabled, setExtinctionEnabled] = useState<boolean>(true);
  const [extinction, setExtinction] = useState<number>(globals.extinction);
  const [keepDeaths, setKeepDeaths] = useGlobal<boolean>("keepDeaths");
  const [useRecoveryData, setUseRecoveryData] = useGlobal<boolean>("useRecoveryData");
  const expanded = helpExpanded || parametersExpanded;

  useEffect(() => {
    if (licenses !== undefined || !dependenciesExpanded) return;

    (async () => {
      const li = await responseToJson(fetch("./licenseInfos.json"));

      setLicenses(li);
    })();
  }, [dependenciesExpanded, licenses]);

  useEffect(() => {
    globals.extinction = extinctionEnabled ? extinction : Number.POSITIVE_INFINITY;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extinction, extinctionEnabled]);

  return (
    <div className="ui-overlay">
      <Fade in={!expanded}>
        <div className="buttons">
          <IconButton aria-label="pause toggle" onClick={() => setPaused(!paused)} className="pause-toggle">
            {paused ? <PlayArrowIcon /> : <PauseIcon />}
          </IconButton>
          <IconButton aria-label="change visualization parameters" onClick={() => setParametersExpanded(true)} className="parameters">
            <TuneIcon />
          </IconButton>
          <IconButton aria-label="help" onClick={() => setHelpExpanded(true)} className="help">
            <HelpIcon />
          </IconButton>
        </div>
      </Fade>
      <Grow in={parametersExpanded} unmountOnExit>
        <div className="info-card">
          <Card>
            <CardContent className="description">
              <Typography variant="h5" component="h2">
                Visualization parameters
              </Typography>
              <FormGroup row>
                <FormControlLabel
                  control={<Checkbox checked={extinctionEnabled} onChange={handleChange(setExtinctionEnabled)} />}
                  label="Extinction"
                />
              </FormGroup>
              <Grid container spacing={2}>
                <Grid item xs>
                  <Slider
                    value={extinction}
                    onChange={handleChange(setExtinction)}
                    aria-labelledby="extinction"
                    valueLabelDisplay="auto"
                    disabled={!extinctionEnabled}
                    min={1}
                  />
                </Grid>
                <Grid item>
                  <Typography>
                    {extinction} day{extinction > 1 ? `s` : null}
                  </Typography>
                </Grid>
              </Grid>
              <FormGroup row>
                <FormControlLabel control={<Checkbox checked={keepDeaths} onChange={handleChange(setKeepDeaths)} />} label="Keep deaths" />
                <FormControlLabel
                  control={<Checkbox checked={useRecoveryData} onChange={handleChange(setUseRecoveryData)} />}
                  label="Use recovery data"
                />
              </FormGroup>
            </CardContent>
            <CardActions>
              <Button size="small" onClick={() => setParametersExpanded(false)}>
                Dismiss
              </Button>
            </CardActions>
          </Card>
        </div>
      </Grow>
      <Grow in={helpExpanded} unmountOnExit>
        <div className="info-card">
          <Card>
            <CardContent className="description">
              <Typography variant="h5" component="h2">
                COVID-19 Visualizer
              </Typography>

              <Typography paragraph>
                This webapp fetches the latest <Link href="https://github.com/CSSEGISandData/COVID-19">JHU CSSE COVID-19 Data</Link> and generates a
                point-based visualization in <Link href="https://threejs.org/">three.js</Link> on top of a{" "}
                <Link href="https://github.com/vasturiano/three-globe">ThreeJS Globe Visualization</Link>. This visualization largely follows the same
                approach as in <Link href="https://github.com/EFHIII/COVID-19">Edward Haas's COVID-19 Confirmed cases map over time</Link>, but with
                interactive parameters (e.g. point extinction) and processed in real-time using the latest data.
              </Typography>

              <Typography paragraph>Each point in the visualizer represents {getDecimation()} cases.</Typography>

              <ul>
                <li>
                  <Typography>
                    <span style={{ color: "steelblue" }}>Blue</span> represents confirmed cases
                  </Typography>
                </li>
                <li>
                  <Typography>
                    <span style={{ color: "red" }}>Red</span> represents deaths
                  </Typography>
                </li>
                <li>
                  <Typography>
                    <span style={{ color: "green" }}>Green</span> represents recovered cases
                    <br />
                    In many cases, the recovered case data is unreliable or missing. This visualizer assumes a recovery time of 14 days if no other
                    data is available.
                  </Typography>
                </li>
              </ul>

              <Typography paragraph>The points are positioned randomly within each region according to population density.</Typography>

              <Typography paragraph>
                The blue and red lines on the chart indicate confirmed cases and deaths, respectively. The faint blue and red lines represent the
                multiplicative increase in confirmed cases and deaths, respectively, from the following day. The plot's range is 1.0x-1.25x
                (bottom-top) daily growth factor.
              </Typography>

              <Typography paragraph>
                You can click on the globe to limit the chart to a specific region. Clicking outside any region, reverts the chart to global mode.
              </Typography>

              <Typography paragraph>
                The chart is draggable and zoomable in the time-axis. Clicking on a point in the chart will revert the visualization to the clicked
                time. The current time indicator can be dragged for scrubbing purposes.
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" onClick={() => setHelpExpanded(false)}>
                Dismiss
              </Button>
              <Button size="small" onClick={() => setSourcesExpanded(!sourcesExpanded)}>
                Sources
              </Button>
              <Button size="small" onClick={() => setDependenciesExpanded(!dependenciesExpanded)}>
                Dependencies
              </Button>
              <Button size="small" href="https://github.com/trylle/covid-viz">
                GitHub
              </Button>
            </CardActions>
            <Collapse in={sourcesExpanded} timeout="auto" unmountOnExit>
              <CardContent className="sources">
                <Typography paragraph>
                  The COVID-19 statistics for this visualizer are sourced from{" "}
                  <Link href="https://github.com/CSSEGISandData/COVID-19">JHU CSSE COVID-19 Data</Link>.
                </Typography>

                <Typography paragraph>
                  Population density is derived from the{" "}
                  <Link href="https://ghsl.jrc.ec.europa.eu/download.php?ds=pop">Global Human Settlement Layer</Link>. Schiavina, Marcello; Freire,
                  Sergio; MacManus, Kytt (2019): GHS population grid multitemporal (1975, 1990, 2000, 2015) R2019A. European Commission, Joint
                  Research Centre (JRC) DOI: 10.2905/42E8BE89-54FF-464E-BE7B-BF9E64DA5218 PID:
                  http://data.europa.eu/89h/0c6b9751-a71f-4062-830b-43c9f432370f.
                </Typography>

                <Typography paragraph>
                  World &amp; US GeoJson data was sourced from <Link href="https://github.com/nvkelso/natural-earth-vector">Natural Earth</Link>.
                </Typography>

                <Typography paragraph>
                  China GeoJson data was sourced from <Link href="https://gadm.org/download_country_v3.html">GADM</Link>.
                </Typography>

                <Typography paragraph>
                  Bathymetry texture was sourced from{" "}
                  <Link href="https://www.naturalearthdata.com/downloads/50m-raster-data/50m-bathymetry">Natural Earth</Link>.
                </Typography>
              </CardContent>
            </Collapse>
            <Collapse in={dependenciesExpanded} timeout="auto" unmountOnExit>
              <CardContent className="dependencies">
                <Typography paragraph>This application uses the following libraries:</Typography>
                {Object.keys(licenses ?? {}).map((name) => {
                  const l = licenses[name];

                  return (
                    <Typography key={name} paragraph>
                      <Link href={l.repository}>{name}</Link> licensed as <Link onClick={() => setShownLicense(l.licenseText)}>{l.license}</Link>.
                    </Typography>
                  );
                })}
              </CardContent>
            </Collapse>
          </Card>
        </div>
      </Grow>
      <Backdrop open={shownLicense !== undefined} onClick={() => setShownLicense(undefined)} className="license-backdrop">
        <Card className="license-card">
          <CardContent className="license-content">
            <TextField multiline value={shownLicense} InputProps={{ readOnly: true }} />
          </CardContent>
        </Card>
      </Backdrop>
    </div>
  );
}
