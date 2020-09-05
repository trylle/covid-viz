# COVID-19 Visualizer

This webapp fetches the latest JHU CSSE COVID-19 Data and generates a point-based visualization in [three.js](https://threejs.org/) on top of a
[ThreeJS Globe Visualization](https://github.com/vasturiano/three-globe). This visualization largely follows the same approach as in
[Edward Haas's COVID-19 Confirmed cases map over time](https://github.com/EFHIII/COVID-19), but with interactive parameters (e.g. point extinction)
and processed in real-time using the latest data.

Each point in the visualizer represents 10 (30 on mobile) cases:

- Blue represents confirmed cases
- Red represents deaths
- Green represents recovered cases<sup>[1](#recovered)</sup>

The points are positioned randomly within each region according to population density.

The blue and red lines on the chart indicate confirmed cases and deaths, respectively. The faint blue and red lines represent the multiplicative
increase in confirmed cases and deaths, respectively, from the following day. The plot's range is 1.0x-1.25x (bottom-top) daily growth factor.

You can click on the globe to limit the chart to a specific region. Clicking outside any region, reverts the chart to global mode.

The chart is draggable and zoomable in the time-axis. Clicking on a point in the chart will revert the visualization to the clicked time. The current
time indicator can be dragged for scrubbing purposes.

## Footnotes

<a name="recovered">1</a>. In many cases, the recovered case data is unreliable or missing. This visualizer assumes a recovery time of 14 days if no
other data is available.
