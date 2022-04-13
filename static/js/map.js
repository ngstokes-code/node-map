var parsedCoordinates = []; /* array of {lat, lng} from uploadFile() */
/* --------------------------------------------------------------- */
/* Map centered at Buffalo */
const START_LAT = 42.886;
const START_LNG = -78.878;
const POLYGON_OFFSET = 0.0033;

var map, polygon;
var polygon_coordinates = [
    { lat: START_LAT - POLYGON_OFFSET, lng: START_LNG - POLYGON_OFFSET },
    { lat: START_LAT + POLYGON_OFFSET, lng: START_LNG - POLYGON_OFFSET },
    { lat: START_LAT + POLYGON_OFFSET, lng: START_LNG + POLYGON_OFFSET },
    { lat: START_LAT - POLYGON_OFFSET, lng: START_LNG + POLYGON_OFFSET },
];
var markers = []; var stations = []; var ndensity = 0
var markersInPolygon = 0; var stationsInPolygon = 0;

/* img's below are vars because google.maps isn't defined at this point, so init them here and define in createMap() */
var MARKER_IMG; var STATION_IMG;
const MARKER = 0; const STATION = 1;
var PLACE_MODE = MARKER; /* by default, user will place markers (UEs) */

/* this function creates the google maps object */
function createMap() {
    /* can't declare outside createMap() since google.maps not defined. Init globally and define here instead */
    MARKER_IMG = {
        url: "https://maps.google.com/mapfiles/kml/shapes/placemark_circle.png",
        scaledSize: new google.maps.Size(20, 20)
    };
    STATION_IMG = { /* see comment above MARKER_IMG */
        url: "https://imagizer.imageshack.com/v2/512x512q90/r/924/ir66hA.png",
        scaledSize: new google.maps.Size(25, 25),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(0, 0)
    };

    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: START_LAT, lng: START_LNG },
        mapTypeId: 'satellite',
        disableDefaultUI: true,
        zoom: 16,
    });

    polygon = new google.maps.Polygon({
        map: map,
        paths: polygon_coordinates,
        clickable: false,
        strokeColor: 'yellow',
        fillColor: 'yellow',
        fillOpacity: 0.4,
        draggable: true,
        editable: true
    });

    /* sets default map info (polygon area, 0 nodes, etc.) */
    setMapDefaults();

    /* since this is a listener on the map object, need it inside createMap() & not mapListeners.js */
    map.addListener("click", (event) => {
        placeNode(event.latLng);
        nodeDensity();
    });

    /* same reason as above; need this in map.js because its a listener on the map object */
    google.maps.event.addListener(polygon.getPath(), 'set_at', updatePolygon); 
    google.maps.event.addListener(polygon.getPath(), 'insert_at', updatePolygon); 

}

$(document).ready(function () { createMap(); }); // A little redundant (?), but just ensures to init map on page load

function setMapDefaults() {
    let kmarea = parseFloat(google.maps.geometry.spherical.computeArea(polygon.getPath())) * (.000001);
    document.getElementById("myLog").innerHTML = "Polygon Area: " + kmarea.toFixed(6) + " km&sup2;";
    document.getElementById("markerCnt").innerHTML = "# of nodes inside polygon: " + markersInPolygon;
    document.getElementById("stationCnt").innerHTML = "# of stations inside polygon: " + stationsInPolygon;
    document.getElementById("density").innerHTML = "Node Density: " + ndensity + " nodes per km&sup2;";
}

/**
 * @param {ObjectLiteral: { lat: float, lng: float } OR google.maps.LatLng Object} position
 */
function placeNode(position) {
    let infoWindow = new google.maps.InfoWindow();
    let node = new google.maps.Marker({
        position,
        map,
    });
    node.content = `<div id="infoWindow"><b>Latitude:</b> ${position.lat()}<br />
    <b>Longitude:</b> ${position.lng()}<br /></div>`;

    google.maps.event.addListener(node, 'click', function () {
        infoWindow.setContent(this.content);
        infoWindow.open(this.getMap(), this);
    });

    if (PLACE_MODE === MARKER) {
        node.setIcon(MARKER_IMG);
        markers.push(node);
        if (insidePolygon(position)) {
            markersInPolygon++;
            document.getElementById("markerCnt").innerHTML = "# of nodes inside polygon: " + markersInPolygon;
        }
    } else { /* else 'PLACE_MODE' must be 'STATION' (eNB) */
        node.setIcon(STATION_IMG);
        stations.push(node)
        if (insidePolygon(position)) {
            stationsInPolygon++;
            document.getElementById("stationCnt").innerHTML = "# of stations inside polygon: " + stationsInPolygon;
        }
    }
}

/**
 * @param {ObjectLiteral: { lat: float, lng: float } OR google.maps.LatLng Object} position
 */
function insidePolygon(position) {
    return google.maps.geometry.poly.containsLocation(position, polygon);
}

/**
 * @param {int (MARKER or STATION)} type 
 */
function countInPolygon(type) {
    let count = 0;
    let arrayToCount;
    if (type === MARKER) {
        arrayToCount = markers;
    } else {  /* else 'type' must be stations (eNBs) */
        arrayToCount = stations;
    }

    for (let i = 0; i < arrayToCount.length; i++) {
        let position = arrayToCount[i].getPosition()
        if (insidePolygon(position)) {
            count++;
        }
    }
    return count
}

/**
 * @param {int (MARKER or STATION)} type 
 */
function updateCount(type) {
    count = countInPolygon(type)
    if (type === MARKER) {
        markersInPolygon = count;
        document.getElementById("markerCnt").innerHTML = "# of nodes inside polygon: " + markersInPolygon;
    } else {
        stationsInPolygon = count;
        document.getElementById("stationCnt").innerHTML = "# of stations inside polygon: " + stationsInPolygon;
    }
    return
}

/**
 * @param {google.maps.Map Object} map
 * @param {int (MARKER or STATION)} type 
 */
function setMapOnAll(map, type) {
    let nodes;
    if (type === MARKER) {
        nodes = markers;
    } else {  /* else 'type' must be stations (eNBs) */
        nodes = stations
    }
    for (let i = 0; i < nodes.length; i++) {
        nodes[i].setMap(map);
    }
    return
}

/**
 * @param {int (MARKER or STATION)} type 
 */
function clear(type) {
    setMapOnAll(null, type);
    if (type === MARKER) {
        markers = [];
        markersInPolygon = 0;
        document.getElementById("markerCnt").innerHTML = "# of nodes inside polygon: 0";
    } else {  /* else 'type' must be stations (eNBs) */
        stations = [];
        stationsInPolygon = 0;
        document.getElementById("stationCnt").innerHTML = "# of stations inside polygon: 0";
    }
    return
}

function updatePolygon() {
    polygon_coordinates = polygon.getPath();
    var kmarea = parseFloat(google.maps.geometry.spherical.computeArea(polygon_coordinates)) * (.000001);
    document.getElementById("myLog").innerHTML = "Polygon Area: " + kmarea.toFixed(6) + " km&sup2;";
    markersInPolygon = countInPolygon(MARKER);
    document.getElementById("markerCnt").innerHTML = "# of nodes inside polygon: " + markersInPolygon;
    stationsInPolygon = countInPolygon(STATION);
    document.getElementById("stationCnt").innerHTML = "# of stations inside polygon: " + stationsInPolygon;
    nodeDensity();
}

/**
 * filehandler.js and topologies.js use the placeMarkers() 
 * and placeStations() functions.
 * @param {Array[{lat: float, lng: float}]} parsedCoordinates 
 */
async function placeMarkers(parsedCoordinates) {
    var infoWindow = new google.maps.InfoWindow();
    for (let i = 0; i < parsedCoordinates.length; i++) {
        let latLng = parsedCoordinates[i];
        var marker = new google.maps.Marker({
            position: latLng,
            map: map,
            icon: MARKER_IMG,
        });
        // Create a property 'content' to marker object, then use this.content in event handler
        marker.content = `<div id="infoWindow"><b>Latitude:</b> ${latLng.lat}<br />
        <b>Longitude:</b> ${latLng.lng}<br /></div>`;
        google.maps.event.addListener(marker, 'click', function () {
            infoWindow.setContent(this.content);
            infoWindow.open(this.getMap(), this);
        });
        markers.push(marker);
    }
}

/**
 * @param {Array[{lat: float, lng: float}]} parsedStations
 */
async function placeStations(parsedStations) {
    var infoWindow = new google.maps.InfoWindow();
    for (let i = 0; i < parsedStations.length; i++) {
        let latLng = parsedStations[i];
        var station = new google.maps.Marker({
            position: latLng,
            map: map,
            icon: STATION_IMG,
        });
        station.content = `<div id="infoWindow"><b>Latitude:</b> ${latLng.lat}<br />
        <b>Longitude:</b> ${latLng.lng}<br /></div>`;
        google.maps.event.addListener(station, 'click', function () {
            infoWindow.setContent(this.content);
            infoWindow.open(this.getMap(), this);
        });
        stations.push(station);
    }
}


function nodeDensity() {
    var kmarea = parseFloat(google.maps.geometry.spherical.computeArea(polygon.getPath())) * (.000001);
    ndensity = markersInPolygon / kmarea;
    document.getElementById("density").innerHTML = "Node Density: " + ndensity.toFixed(2) + " nodes per km&sup2;";
}

/**
 * 
 * @param {Google Maps MVCArray} polygonCoordinates 
 * @returns [{lat: ..., lng: ...}]
 * Need this function because topologies.js cant jsonify the
 * Google Maps MVCArray of latLng objects, so this function
 * does the conversion to a standard JS object, which we 
 * can easily jsonify.
 */
function PolyArray(polygonCoordinates) {
    let latLngObjects = [];
    for (var i = 0; i < polygonCoordinates.length; i++) {
        latLngObjects.push({
            lat: polygonCoordinates.getAt(i).lat(),
            lng: polygonCoordinates.getAt(i).lng()
        });
    }
    return latLngObjects
}

/* this is for coords.db */
function markerPositions() {
    markerPos = [[], []];
    for (var i = 0; i < markers.length; i++) {
        if (google.maps.geometry.poly.containsLocation(markers[i].getPosition(), polygon)) {
            markerPos[0].push(markers[i].getPosition().lat());
            markerPos[1].push(markers[i].getPosition().lng());
        }
    }
    markerPos = JSON.stringify(markerPos);
    $.post("receiver", markerPos);
}


/* Rewrote this function, it's really fast now (even w/ infowindows) */
function randomMarkers() {
    var markersToGenerate = document.getElementById("random-markers").value; /* get # of nodes to generate */
    // Calculate the bounds of the polygon
    var bounds = new google.maps.LatLngBounds();
    for (let i = 0; i < polygon.getPath().getLength(); i++) {
        bounds.extend(polygon.getPath().getAt(i));
    }

    var sw = bounds.getSouthWest();
    var ne = bounds.getNorthEast();
    // Uncomment to place InfoWindows on each marker generated... slightly slower but still fast.
    // var infoWindow = new google.maps.InfoWindow();
    while (markersToGenerate > 0) {
        var ptLat = Math.random() * (ne.lat() - sw.lat()) + sw.lat();
        var ptLng = Math.random() * (ne.lng() - sw.lng()) + sw.lng();
        var point = new google.maps.LatLng(ptLat, ptLng);
        // guess a point, if it's inside the polygon -> great, place it.
        if (google.maps.geometry.poly.containsLocation(point, polygon)) {
            let marker = new google.maps.Marker({ position: point, map: map, icon: MARKER_IMG });
            // marker.content = `<div id="infoWindow"><b>Latitude:</b> ${ptLat}<br />
            //                                        <b>Longitude:</b> ${ptLng}<br /></div>`;
            // google.maps.event.addListener(marker, 'click', function () {
            //     infoWindow.setContent(this.content);
            //     infoWindow.open(this.getMap(), this);
            // });
            markers.push(marker)
            markersToGenerate--; // we placed a marker, decrement count of how many we need to generate.
        }
    }
    updatePolygon();
}

// this was the old code
// async function randomMarkers2() {
//     clear(MARKER);
//     countInPolygon(MARKER);
//     const image = { url: "https://maps.google.com/mapfiles/kml/shapes/placemark_circle.png", scaledSize: new google.maps.Size(20, 20), };
//     var bounds = new google.maps.LatLngBounds();
//     for (var i = 0; i < polygon.getPath().getLength(); i++) {
//         bounds.extend(polygon.getPath().getAt(i));
//     }
//     var sw = bounds.getSouthWest();
//     var ne = bounds.getNorthEast();
//     for (var i = 0; i < 4000; i++) {            //Marker Creation (INTEGER) Limit--------------------------------------
//         var ptLat = Math.random() * (ne.lat() - sw.lat()) + sw.lat();
//         var ptLng = Math.random() * (ne.lng() - sw.lng()) + sw.lng();
//         var point = new google.maps.LatLng(ptLat, ptLng);
//         if (google.maps.geometry.poly.containsLocation(point, polygon) && getRandomInput() > 0) {
//             var markerz = new google.maps.Marker({ position: point, map: map, icon: image, });
//             markers.push(markerz);
//             if (i && i % 500 == 0) {
//                 await new Promise(r => setTimeout(r, 750));
//             }
//             if (markers.length == getRandomInput()) {
//                 countInPolygon(MARKER);
//                 break;
//             }
//             countInPolygon(MARKER);
//             nodeDensity();
//         }
//     }
// }