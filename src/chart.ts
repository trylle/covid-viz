import * as d3 from "d3";
import { CovidStatistics, GlobalsType, CovidStatisticsDataForRegion } from "./types";

const margin = [112, 96];

type DatumType = {
  value: number | undefined;
  date: Date;
};

function calcRate(array: number[]): (number | undefined)[] {
  return array.map((next, idx) => {
    const prev = array[idx - 1] ?? 0;
    const rate = next / prev;

    if (!Number.isFinite(rate)) return undefined;

    return rate;
  });
}

export const generateChart = ({
  element,
  globals,
  statsConfirmed,
  statsDeaths,
  selectedRegion,
}: {
  element: HTMLDivElement;
  globals: GlobalsType;
  statsConfirmed: CovidStatistics;
  statsDeaths: CovidStatistics;
  selectedRegion?: string;
}) => {
  d3.select(element).selectAll("svg#chart").data([]).exit().remove();

  const svg = d3.select(element).selectAll("svg#chart").data([0]).enter().append("svg").attr("id", "chart");

  const { dates, data: dataConfirmed } = statsConfirmed;
  const { data: dataDeaths } = statsDeaths;
  const confirmed: number[] = [];
  const deaths: number[] = [];

  const countryFilter = (d: CovidStatisticsDataForRegion) => {
    return selectedRegion === undefined || d.country === selectedRegion || d.state === selectedRegion;
  };

  dataConfirmed.forEach((d) => {
    if (!countryFilter(d)) return;

    d.values.forEach((v, idx) => {
      confirmed[idx] = (confirmed[idx] ?? 0) + v;
    });
  });

  dataDeaths.forEach((d) => {
    if (!countryFilter(d)) return;

    d.values.forEach((v, idx) => {
      deaths[idx] = (deaths[idx] ?? 0) + v;
    });
  });

  const confirmedRate: (number | undefined)[] = calcRate(confirmed);
  const deathsRate: (number | undefined)[] = calcRate(deaths);

  const node = svg.node() as Element;

  const x = d3.scaleTime().domain(d3.extent(dates) as [Date, Date]);

  const rescaled = { x };

  const yConfirmed = d3
    .scaleLinear()
    .domain([0, d3.max(confirmed) as number])
    .nice();

  const yDeaths = d3
    .scaleLinear()
    .domain([0, d3.max(deaths) as number])
    .nice();

  const rateDomain = [1, 1.25];

  const yRate = d3.scaleLinear().domain(rateDomain).nice();

  const xAxisD3 = d3.axisBottom(x).tickSizeOuter(0);
  const yConfirmedAxisD3 = d3.axisLeft(yConfirmed);
  const yDeathsAxisD3 = d3.axisRight(yDeaths);

  const yConfirmedAxis = svg.append("g").attr("class", "y-confirmed-axis").call(yConfirmedAxisD3);

  const yDeathsAxis = svg.append("g").attr("class", "y-deaths-axis").call(yDeathsAxisD3);

  const confirmedLine = d3
    .line()
    .defined((d: any) => !isNaN(d.value))
    .x((d: any) => rescaled.x(d.date))
    .y((d: any) => yConfirmed(d.value));

  const deathsLine = d3
    .line()
    .defined((d: any) => !isNaN(d.value))
    .x((d: any) => rescaled.x(d.date))
    .y((d: any) => yDeaths(d.value));

  const rateLine = d3
    .line()
    .defined((d: any) => !isNaN(d.value))
    .x((d: any) => rescaled.x(d.date))
    .y((d: any) => yRate(d.value));

  const defs = svg.append("defs").append("clipPath").attr("id", "clip").append("rect");

  const confirmedSeries = confirmed.map((x: number, idx: number) => ({
    value: x,
    date: dates[idx],
  }));

  const deathsSeries = deaths.map((x: number, idx: number) => ({
    value: x,
    date: dates[idx],
  }));

  const confirmedRateSeries = confirmedRate.map((x: number | undefined, idx: number) => ({
    value: x,
    date: dates[idx],
  }));

  const deathsRateSeries = deathsRate.map((x: number | undefined, idx: number) => ({
    value: x,
    date: dates[idx],
  }));

  const createLine = (datum: DatumType[], line: d3.Line<[number, number]>) => {
    const path = svg
      .append("path")
      .datum(datum)
      .attr("class", "path")
      .attr("fill", "none")
      .attr("clip-path", "url(#clip)")
      .attr("stroke-width", 1.5)
      .attr("d", line as any);

    return path;
  };

  createLine(confirmedRateSeries, rateLine).attr("stroke", "steelblue").attr("stroke-opacity", "33%").attr("class", "rate-path");

  createLine(deathsRateSeries, rateLine).attr("stroke", "red").attr("stroke-opacity", "33%").attr("class", "rate-path");

  createLine(confirmedSeries, confirmedLine).attr("stroke", "steelblue").attr("class", "confirmed-path");

  createLine(deathsSeries, deathsLine).attr("stroke", "red").attr("class", "deaths-path");

  var chartOverlay = svg.append("g").attr("clip-path", "url(#clip)").attr("class", "chart-overlay");

  const currentTimeDrag = chartOverlay
    .append("path")
    .attr("class", "current-time current-time-drag")
    .style("stroke", "yellow")
    .style("stroke-width", "16px");

  chartOverlay.append("path").attr("class", "current-time").style("stroke", "red").style("stroke-width", "1px");

  const currentTime = chartOverlay.selectAll(".current-time");

  let lastDate: Date | undefined = undefined;

  const updateTimeIndicator = (date: Date | undefined = undefined) => {
    if (date !== undefined) {
      lastDate = date;
    } else date = lastDate;

    if (date === undefined) return;

    const { /*width, */ height } = node.getBoundingClientRect();
    const xp = rescaled.x(date);

    currentTime
      .datum([
        [xp, margin[1]],
        [xp, height - margin[1]],
      ])
      .attr("d", d3.line() as any);
  };

  globals.dispatcher.on("timeChanged.chart", (time: number, date: Date) => updateTimeIndicator(date));

  const xAxis = svg.append("g").attr("clip-path", "url(#clip)").append("g").attr("class", "x-axis").call(xAxisD3);

  svg
    .append("text")
    .classed("title", true)
    .attr("x", "50%")
    .attr("y", 64)
    .text(selectedRegion ?? "Global");

  svg.append("text").classed("legend-left", true).attr("x", "0%").attr("y", 128).text("Confirmed");

  svg.append("text").classed("legend-right", true).attr("x", "100%").attr("y", 128).text("Deaths");

  function getClientPointDate() {
    const evt = d3.event;
    const cp = (evt.type === "drag" && [evt.x, evt.y]) || d3.clientPoint(evt.target, evt);
    const d = rescaled.x.invert(cp[0]);

    return d;
  }

  svg.on("click", () => {
    globals.date = getClientPointDate();
  });

  const dragState = { paused: false };
  const currentTimeDragd3 = d3
    .drag()
    .on("start", () => {
      dragState.paused = globals.paused;
      globals.paused = true;
    })
    .on("end", () => {
      globals.paused = dragState.paused;
    })
    .on("drag", () => {
      globals.date = getClientPointDate();
    });

  currentTimeDrag.call(currentTimeDragd3 as any);

  let previousSize: { width?: number; height?: number } = {};
  let d3zoom: d3.ZoomBehavior<Element, unknown>;

  const zoom = (svg: any) => {
    const { width, height } = node.getBoundingClientRect();

    const extent: [[number, number], [number, number]] = [
      [margin[0], margin[1]],
      [width - margin[0], height - margin[1]],
    ];

    const zoomed = () => {
      const transform = d3.event?.transform ?? d3.zoomTransform(svg.node());

      rescaled.x = transform.rescaleX(x);

      svg.selectAll(".confirmed-path").attr("d", confirmedLine);

      svg.selectAll(".deaths-path").attr("d", deathsLine);

      svg.selectAll(".rate-path").attr("d", rateLine);

      xAxisD3.scale(rescaled.x);

      svg.select(".x-axis").call(xAxisD3);

      updateTimeIndicator();
    };

    const zooming = d3
      .zoom()
      .scaleExtent([1, 20])
      //.translateExtent(extent)
      .extent(extent)
      .on("zoom", zoomed);

    d3zoom = zooming;

    svg.call(zooming);
    zoomed();
  };

  // Handle resize
  const updateSize = () => {
    if (!node) return;

    const { width, height } = node.getBoundingClientRect();

    x.range([0 + margin[0], width - margin[0]]);
    [yConfirmed, yDeaths, yRate].forEach((y) => y.range([height - margin[1], 0 + margin[1]]));
    xAxis.attr("transform", `translate(0,${height - margin[1]})`).call(xAxisD3);
    yConfirmedAxis.attr("transform", `translate(${0 + margin[0]},0)`).call(yConfirmedAxisD3);
    yDeathsAxis.attr("transform", `translate(${width - margin[0]},0)`).call(yDeathsAxisD3);
    defs
      .attr("x", margin[0])
      .attr("y", margin[1])
      .attr("width", width - margin[0] * 2)
      .attr("height", height - margin[1]);

    if (previousSize.width !== undefined) {
      svg.call(d3zoom.transform as any, d3.zoomIdentity); // FIXME: Should update transform for new size
    }

    previousSize = { width, height };

    svg.call(zoom);
  };

  const resizeObserver = new ResizeObserver(updateSize);

  resizeObserver.observe(element);
};
