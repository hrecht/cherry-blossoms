import maplibregl from 'maplibre-gl';
import * as pmtiles from 'pmtiles';
import * as turf from '@turf/turf';
import { json } from 'd3-fetch';

// expand Metro table on button click
let table_exapnd_button = document.querySelector('#metro-table-expand');
let metro_table = document.querySelector('#metro-trees-table');
table_exapnd_button.addEventListener('click', function () {
  console.log(metro_table.getAttribute('collapsed'));

  if (metro_table.getAttribute('collapsed') == 'true') {
    metro_table.setAttribute('collapsed', false);
    table_exapnd_button.innerHTML = '&#8722; Click to show fewer';
  } else {
    metro_table.setAttribute('collapsed', true);
    table_exapnd_button.innerHTML = '&#43; Click to show all D.C. stations';
  }
});

// import jsons in a Baker-friendly way
const style_url = new URL(
  '../assets/map-data/cherry-map-style.json',
  import.meta.url
);
const trees_url = new URL('../assets/map-data/trees.geojson', import.meta.url);
const dc_url = new URL(
  '../assets/map-data/dc-boundary.geojson',
  import.meta.url
);
const lines_url = new URL(
  '../assets/map-data/metro-lines.geojson',
  import.meta.url
);
const stations_url = new URL(
  '../assets/map-data/metro-stations.geojson',
  import.meta.url
);

const protocol = new pmtiles.Protocol();
maplibregl.addProtocol('pmtiles', protocol.tile);

//set up the MAR address API options
let mar_url = 'https://datagate.dc.gov/mar/open/api/v2.2/locations/',
  mar_key = '10076353-1284-4796-a891-aeaa87bd274a',
  mar_search_tolerance = '100ft';

//set up objects for click action
//location of the point
let clicked_point = [-77.02207074651612, 38.91650964521318],
  //marker element showing the point
  clicked_marker,
  //turf.js circle with radius around the point
  circle_buffer,
  //points in the selection radius
  selected_points,
  //set up objects for turf computations
  turf_points,
  dc_polygon,
  trees_data;

async function fetchGeojson() {
  trees_data = await json(trees_url);
}
async function fetchDcjson() {
  const dc_data = await json(dc_url);
  dc_polygon = turf.multiPolygon(dc_data.features[0].geometry.coordinates);
}

fetchDcjson();
fetchGeojson();

function makeMarRequest(clicked_lng, clicked_lat) {
  //check if the point is within DC
  let point_check = turf.point([clicked_lng, clicked_lat]);
  let point_in_dc = turf.booleanPointInPolygon(point_check, dc_polygon);

  if (point_in_dc == true) {
    //reverse geocode the clicked point using DC"s MAR API
    let marGeocodeURL = new URL(mar_url + clicked_lng + ',' + clicked_lat);
    let params = new URLSearchParams();
    params.append('apikey', mar_key);
    params.append('distance', mar_search_tolerance);
    marGeocodeURL.search = params;
    //console.log(marGeocodeURL)

    /* create the request and prepare to send it*/
    let request = new XMLHttpRequest();
    request.open('GET', marGeocodeURL, true);

    let response_address;
    /* all these things won't run if no response */
    request.onload = function () {
      try {
        if (request.status >= 200 && request.status < 400) {
          let response_data = JSON.parse(this.response);

          /* if result is found */
          if (response_data.Result.length > 0) {
            /* get addresses out of result object */
            let address_result = response_data.Result[0].address.properties;
            //console.log(address_result);

            // decide what text to display
            if (address_result.FullAddress !== null) {
              response_address = address_result.FullAddress;
            } else if (
              (address_result.FullAddress == null) &
              (address_result.Alias !== null)
            ) {
              response_address = address_result.Alias;
            } else if (
              (address_result.FullAddress == null) &
              (address_result.Alias == null)
            ) {
              response_address =
                address_result.StName +
                ' ' +
                address_result.StreetType +
                ' ' +
                address_result.Quadrant;
            }
            document.getElementById('map-address-text').innerHTML =
              response_address;
          }
        } else {
          console.error('response error', this.response);
        }
      } catch (err) {
        //console.log(JSON.parse(this.response))
        console.error('geocode error');
      }
    };
    request.send();
    return response_address;
  } else {
    document.getElementById('map-address-text').innerHTML = 'OUTSIDE D.C.';
  }
}

//for each point, determine if it's within the polygon
function setSelectedPoints() {
  //initially did this using a turf.points object containing all the points
  //but couldn't pass properties like ID to that type of object properly
  //and the pointsWithinPolygon function really goes through them one by one anyway, so just do it one by one on my end
  let points_within_ids = [];

  trees_data.features.forEach(function (feature) {
    let point_id = feature.properties.objectid;
    let turf_point = turf.point(feature.geometry.coordinates);
    //if the point is within the circle, add the point id to an array
    let point_within = turf.booleanPointInPolygon(turf_point, circle_buffer);
    if (point_within == true) {
      points_within_ids.push(point_id);
    }
  });

  //display the number of points in the radius
  document.getElementById('map-trees-text').innerHTML =
    points_within_ids.length.toLocaleString('en-US');

  //identify which points are in the selected area
  selected_points = map.querySourceFeatures('points', {
    filter: ['in', ['get', 'objectid'], ['literal', points_within_ids]],
  });

  //update the feature state for styling
  selected_points.forEach(function (f) {
    map.setFeatureState(
      {
        source: 'points',
        id: f.id,
      },
      {
        selected: true,
      }
    );
  });
}

//reset the map selections when the user clicks on a new point
function updateClickedPoint(c) {
  //reset the turf circle around the clicked point
  circle_buffer = turf.circle(c, 0.5, {
    steps: 500,
    units: 'miles',
  });

  //update the drawn circle around the point
  map.getSource('clicked-circle').setData(circle_buffer);

  //update the marker position
  clicked_marker.setLngLat(c);

  //get and display the address from the DC MAR API
  makeMarRequest(c[0], c[1]);

  //reset selected points state before selecting new ones
  selected_points.forEach(function (f) {
    // For each feature, update its state
    map.setFeatureState(
      {
        source: 'points',
        id: f.id,
      },
      {
        selected: false,
      }
    );
  });

  setSelectedPoints();
}

let map = new maplibregl.Map({
  container: 'map',
  style: style_url.href,
  center: [-77.02207074651612, 38.91650964521318],
  zoom: 13, // starting zoom
  minZoom: 10,
  maxZoom: 15,
  maxBounds: [
    [-77.164536, 38.774964],
    [-76.880951, 39.045319],
  ],
  /*bounds: [
		[-77.164536,38.774964],[-76.880951,39.045319]
	],*/
  attributionControl: false,
  pitchWithRotate: false,
  touchPitch: false,
});

map.addControl(
  new maplibregl.NavigationControl({
    visualizePitch: false,
    showCompass: false,
  }),
  'top-left'
);

map.addControl(
  new maplibregl.AttributionControl({
    customAttribution:
      '© <a href="https://openstreetmap.org">OpenStreetMap</a>, <a href="https://maplibre.org/">MapLibre</a>, <a href="https://openmaptiles.org/">OpenMapTiles</a>',
  }),
  'bottom-right'
);

map.on('load', function () {
  map.addLayer(
    {
      id: 'points',
      type: 'circle',
      source: {
        type: 'geojson',
        data: trees_url.href,
        promoteId: 'objectid',
      },
      paint: {
        'circle-radius': {
          base: 1,
          stops: [
            [10, 1],
            [16, 7],
          ],
        },
        'circle-stroke-width': 0.7,
        'circle-opacity': 0.75,
        //use different set of colors for circles with the `selected` feature-state
        'circle-stroke-color': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          //'#620f62',
          '#606060',
          '#ff7dce',
        ],
        'circle-color': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          //'#b927b9',
          '#fdc429',
          '#fd9ed9',
        ],
      },
    },
    'place_label_state'
  );

  //show metro lines
  map.addLayer(
    {
      id: 'metro-lines',
      type: 'line',
      source: {
        type: 'geojson',
        data: lines_url.href,
      },
      paint: {
        //'line-color': '#9f9f9f',
        'line-color': [
          'match',
          ['get', 'NAME'],
          'Red',
          '#BF0D3E',
          'Orange',
          '#ED8B00',
          'Yellow',
          '#FFD100',
          'Green',
          '#00B140',
          'Blue',
          '#009CDE',
          'Silver',
          '#919D9D',
          /* other */
          '#ccc',
        ],
        'line-width': {
          base: 1.4,
          stops: [
            [11, 3],
            [20, 30],
          ],
        },
      },
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
        'visibility': 'none',
      },
    },
    'state_boundary'
  );

  //show metro points

  map.addSource('metro-stations-source', {
    type: 'geojson',
    data: stations_url.href,
  });

  map.addLayer(
    {
      id: 'metro-stations',
      type: 'circle',
      source: 'metro-stations-source',
      paint: {
        'circle-radius': {
          base: 1.5,
          stops: [
            [10, 2.5],
            [16, 15],
          ],
        },
        'circle-stroke-width': 1,
        'circle-opacity': 0.75,
        'circle-stroke-color': '#000000',
        'circle-color': '#868686',
      },
      layout: {
        visibility: 'none',
      },
    },
    'state_boundary'
  );

  map.addLayer({
    id: 'metro-stations-text',
    type: 'symbol',
    source: 'metro-stations-source',
    minzoom: 12,
    layout: {
      'visibility': 'none',
      'text-field': ['get', 'name'],
      'text-anchor': 'left',
      'text-justify': 'left',
      'text-font': ['Mulish Regular'],
      'text-transform': 'uppercase',
      'text-max-width': 16,
      'text-size': {
        stops: [
          [12, 11],
          [20, 16],
        ],
      },
    },
    paint: {
      'text-color': 'hsl(0, 0%, 5%)',
      'text-halo-blur': 0,
      'text-halo-color': 'hsl(0, 0%, 100%)',
      'text-halo-width': 2,
      'text-translate': [14, 0],
    },
  });

  //toggle showing the Metro
  let checkbox = document.querySelector("input[id='metro-toggle']");
  checkbox.addEventListener('change', function () {
    if (this.checked) {
      map.setLayoutProperty('metro-lines', 'visibility', 'visible');
      map.setLayoutProperty('metro-stations', 'visibility', 'visible');
      map.setLayoutProperty('metro-stations-text', 'visibility', 'visible');
    } else {
      map.setLayoutProperty('metro-lines', 'visibility', 'none');
      map.setLayoutProperty('metro-stations', 'visibility', 'none');
      map.setLayoutProperty('metro-stations-text', 'visibility', 'none');
    }
  });

  /* Mousover popups */
  // Create a popup, but don"t add it to the map yet.
  /*var popup = new maplibregl.Popup({
	  closeButton: false,
	  closeOnClick: false,
	});*/

  //init clicked point marker
  clicked_marker = new maplibregl.Marker({
    color: '#861986',
    scale: 0.75,
    anchor: 'top',
  })
    .setLngLat(clicked_point)
    .addTo(map);

  //make a buffer around the clicked point
  circle_buffer = turf.circle(clicked_point, 0.5, {
    steps: 500,
    units: 'miles',
  });

  /* show the radius*/
  map.addSource('clicked-circle', {
    type: 'geojson',
    data: circle_buffer,
  });

  // Add a fill layer with some transparency.
  map.addLayer(
    {
      id: 'location-radius',
      type: 'fill',
      source: 'clicked-circle',
      paint: {
        //'fill-color': '#ffcff4',
        'fill-color': '#ffebbd',
        'fill-opacity': 0.4,
      },
    },
    'points'
  );

  // Add a line layer to draw the circle outline
  map.addLayer({
    id: 'location-radius-outline',
    type: 'line',
    source: 'clicked-circle',
    paint: {
      'line-color': '#000000',
      'line-width': 2.5,
    },
  });

  //once the map has idled (features have rendered) then start doing math
  //if we don't wait then the querying can result in null results
  map.once('idle', function () {
    setSelectedPoints();
  });

  //change the selected location upon click
  map.on('click', function (e) {
    let coords = e.lngLat;
    clicked_point = [coords.lng, coords.lat];
    //console.log(clicked_point);

    updateClickedPoint(clicked_point);
  });

  /*map.on('mouseenter', 'points', function (e) {
	  // Change the cursor style as a UI indicator.
	  map.getCanvas().style.cursor = 'pointer';

	  let coordinates = e.features[0].geometry.coordinates.slice();
	  let common_name = e.features[0].properties.common_name,
	    //just for any debugging
	    objectid = e.features[0].id;

	  // Ensure that if the map is zoomed out such that multiple
	  // copies of the feature are visible, the popup appears
	  // over the copy being pointed to.
	  while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
	    coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
	  }

	  // Populate the popup and set its coordinates
	  // based on the feature found.
	  popup
	    .setLngLat(coordinates)
	    .setHTML("<div class='tt-info'>" + common_name + '</div>')
	    .addTo(map);
	});

	map.on('mouseleave', 'points', function () {
	  map.getCanvas().style.cursor = '';
	  popup.remove();
	});*/
});
