/**
 * This file MUST be defined AFTER 'map.js' inside the HTML file.
 */

document.getElementById("clear-markers").addEventListener("click", function () {
    clear(MARKER);
    nodeDensity();
});

document.getElementById("clear-stations").addEventListener("click", function () {
    clear(STATION);
    nodeDensity();
});

document.getElementById("polygon-move").addEventListener("click", function () {
    polygon.setOptions({ clickable: true });
});

document.getElementById("polygon-stay").addEventListener("click", function () {
    polygon.setOptions({ clickable: false });
});

// Manually Place Markers or Stations
document.getElementById("click-markers").addEventListener("click", function () {
    PLACE_MODE = MARKER;
});

document.getElementById("click-stations").addEventListener("click", function () {
    PLACE_MODE = STATION;
});