import Jimp from 'jimp';
import * as geojson from 'geojson';
import * as d3 from 'd3';
import * as fs from 'fs';
// @ts-ignore
import rewind from '@mapbox/geojson-rewind';

// Create globals so leaflet can load
(global as any).window = {
	screen: {
		devicePixelRatio: 1
	}
};
(global as any).document = {
	documentElement: {
		style: {}
	},
	getElementsByTagName: function () { return []; },
	createElement: function () { return {}; }
};
(global as any).navigator = {
	userAgent: 'nodejs',
	platform: 'nodejs'
};
const Leaflet: typeof import('leaflet') = require('leaflet');

const fetch = async (fn: string) => {
	const f = await fs.promises.readFile(fn, 'utf-8');

	return Promise.resolve({ json: () => JSON.parse(f) });
}

const inFile = process.argv[2] ?? 'public/ne_110m_admin_0_countries.geojson';
const outFile = process.argv[3] ?? 'public/country-density.json';

(async () => {
	const countriesGeoJson = await (await fetch(inFile)).json();
	const popDensImage = await Jimp.read('public/GHS_POP_E2015_GLOBE_R2019A_4326_30ss_V1_0.png');
	const image = popDensImage;

	type GeoPt = [number, number];
	type GeoBounds = [GeoPt, GeoPt];
	type Density = { point: import('leaflet').LatLng, density: number };

	let countries: { geoBounds: GeoBounds, feature: geojson.Feature, densities: Density[] }[] = countriesGeoJson.features.map((feature: geojson.Feature) => {
		const bbox = feature.bbox;

		return {
			geoBounds: (bbox && [[bbox[0], bbox[1]], [bbox[2], bbox[3]]]) ?? d3.geoBounds(feature.geometry),
			feature: rewind(feature, true),
			densities: [],
		};
	});

	let hits = 0;

	image.scan(0, 0, image.getWidth(), image.getHeight(), (x, y, idx) => {
		if (idx % 4096 === 0) process.stdout.write('.');
		if (hits >= 64) {
			process.stdout.write('x');
			hits -= 64;
		}

		let size = image.bitmap.data[idx] / 255;

		if (size <= 0) return;

		const normalized = new Leaflet.Point(x / image.getWidth() - .5, y / image.getHeight() - .5);
		const point = new Leaflet.Point(normalized.x * 2 * 180, -normalized.y * 180);
		const ret = Leaflet.CRS.EPSG4326.unproject(point);
		const geopt: GeoPt = [ret.lng, ret.lat];
		const country = countries.find(country => {
			return d3.geoContains(country.feature.geometry, geopt);
		});

		if (!country) return;

		country.densities.push({ point: ret, density: size });

		hits++;
	});

	await fs.promises.writeFile(outFile, JSON.stringify(countries.map(country => ({
		admin: country.feature.properties?.['ADMIN'] ?? country.feature.properties?.['admin'] ?? country.feature.properties?.['NAME_0'],
		admin_1: country.feature.properties?.['name'] ?? country.feature.properties?.['NAME_1'],
		densities: country.densities
	}))));
})()

