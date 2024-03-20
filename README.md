# Counting Peak Bloom
[https://www.hrecht.com/cherry-blossoms/](https://www.hrecht.com/cherry-blossoms/)

Maps, math, and musings on cherry blossom peak bloom and finding joy in the flowers close to home, without the crowds. 

## About
View the data cleaning, analysis, and basemap tile generation code at [https://github.com/hrecht/cherry-blossoms-analysis](https://github.com/hrecht/cherry-blossoms-analysis).

I built the interactive map with a stack of open-source tools. I used the <a href="https://developers.data.dc.gov/" target="_blank">DC Master Address Repository API</a> to retrieve addresses for points that readers click on the map. The basemap data is from <a href="https://www.openstreetmap.org" target="_blank">OpenStreetMap</a>, with tiles generated using <a href="https://github.com/onthegomap/planetiler" target="_blank">Planetiler</a> and processed using <a href="https://github.com/felt/tippecanoe" target="_blank">Tippecanoe</a> and <a href="https://protomaps.com/" target="_blank">Protomaps</a>. I built the map with <a href="https://maplibre.org/" target="_blank">MapLibre</a> and <a href="https://turfjs.org/" target="_blank">Turf</a>. I styled the base map in part using <a href="https://maputnik.github.io/" target="_blank">Maputnik</a> and generated font files with <a href="https://github.com/maplibre/font-maker" target="_blank">MapLibre's Font Maker</a> using <a href="https://fonts.google.com/" target="_blank">Google Fonts</a>. I built this web page using the Los Angeles Times’ <a href="https://github.com/datadesk/baker-example-page-template" target="_blank">Baker build tool</a>.