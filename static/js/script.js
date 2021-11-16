var map;
var area = "<i>update polygon to show area</i>";
var vertices = [];
var polygon;
var markers = [];
var stations = [];
var markerCnt = 0;
var ndensity = 0;
var stationCnt = 0;
var place_mode = 1;
document.getElementById("myLog").innerHTML = area; //"Update Polygon to show area";

function createMap() {
    var x = 42.886,
        y = -78.878,
        diff = 0.0033;

    var choices = {
        center: { lat: x, lng: y },
        mapTypeId: 'satellite',
        disableDefaultUI: true,
        zoom: 16
    };

    map = new google.maps.Map(document.getElementById('map'), choices);

    var polygonCoordinates = [
        { lat: x - diff, lng: y - diff },
        { lat: x + diff, lng: y - diff },
        { lat: x + diff, lng: y + diff },
        { lat: x - diff, lng: y + diff },
    ];

    polygon = new google.maps.Polygon({
        map: map,
        paths: polygonCoordinates,
        clickable: false,
        strokeColor: 'yellow',
        fillColor: 'yellow',
        fillOpacity: 0.4,
        draggable: true,
        editable: true
    });

    document.getElementById("markerCnt").innerHTML = "# of nodes inside polygon: " + markerCnt;
    document.getElementById("stationCnt").innerHTML = "# of stations inside polygon: " + stationCnt;
    document.getElementById("density").innerHTML = "Node Density: " + ndensity + " nodes per km&sup2;";
    //----------------set_at & inser_at are for whenever the polygon is updated/changed
    google.maps.event.addListener(polygon.getPath(), 'set_at', function () {
        PolyArray(polygon.getPath());
        area = google.maps.geometry.spherical.computeArea(polygon.getPath());
        var kmarea = parseFloat(google.maps.geometry.spherical.computeArea(polygon.getPath())) * (.000001);
        // console.log("Area inside highlighted area: " + kmarea + " kilometers squared");
        document.getElementById("myLog").innerHTML = "Polygon Area: " + kmarea.toFixed(6) + " km&sup2;";
        countMarkersInPolygon();
        countStationsInPolygon();
        nodeDensity();
    });
    google.maps.event.addListener(polygon.getPath(), 'insert_at', function () {
        PolyArray(polygon.getPath());
        area = google.maps.geometry.spherical.computeArea(polygon.getPath());
        var kmarea = parseFloat(google.maps.geometry.spherical.computeArea(polygon.getPath())) * (.000001);
        console.log("Area inside highlighted area: " + kmarea + " kilometers squared");
        document.getElementById("myLog").innerHTML = "Polygon Area: " + kmarea.toFixed(6) + " km&sup2;";
        countMarkersInPolygon();
        countStationsInPolygon();
        nodeDensity();
    });

    map.addListener("click", (event) => {
        addMarker(event.latLng);
        nodeDensity();
    });
    document.getElementById("hide-orientation").addEventListener("click", function () {
        hideOrientation();
    });
    document.getElementById("show-orientation").addEventListener("click", function () {
        showOrientation();
    });
    document.getElementById("clear-markers").addEventListener("click", function () {
        clearMarkers();
        ndensity = 0;
    });
    document.getElementById("clear-stations").addEventListener("click", function () {
        clearStations();
        //ndensity = 0;
    });
    document.getElementById("polygon-move").addEventListener("click", function () {
        polygon.setOptions({ clickable: true });
    });
    document.getElementById("polygon-stay").addEventListener("click", function () {
        polygon.setOptions({ clickable: false });

    });
    //Manually Place Markers or Stations
    document.getElementById("click-markers").addEventListener("click", function () {
        place_mode = 1;
    });
    document.getElementById("click-stations").addEventListener("click", function () {
        place_mode = 2;

    });
    document.getElementById("submit").addEventListener("click", function () {
        event.preventDefault()
        randomMarkers();
        nodeDensity();
    });

    //Enter Button FIX
    document.getElementById('rnode').addEventListener('keypress', function (event) {
        if (event.keyCode == 13) {
            event.preventDefault();
            document.getElementById("submit").click();
        }
    });

    document.getElementById("node-positions").addEventListener("click", function () {
        markerPositions();
    });
}
//-----------Adds markers and stations manually
function addMarker(position) {
    var p = new google.maps.LatLng(position.lat()-.01,position.lng()-.01);
    //For Stations???????
    if( place_mode == 2){
        const image = { url: "https://imagizer.imageshack.com/v2/512x512q90/r/924/ir66hA.png"/*"http://maps.google.com/mapfiles/kml/shapes/mechanic.png"*/,  scaledSize: new google.maps.Size(25, 25), origin: new google.maps.Point(0, 0), anchor: new google.maps.Point(12.5, 12.5)/*"http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png"*/,};
        var orientation = {
            path: google.maps.SymbolPath.BACKWARD_OPEN_ARROW,
            fillColor: 'red',
            fillOpacity: .2,
            strokeColor: 'red',
            strokeOpacity: .8,
            strokeWeight: 1,
            scale: 30,
            //scaledSize: new google.maps.Size(40, 10),
            rotation: random_orientation()
        }
        const marker = new google.maps.Marker({
            position,
            map,
            icon: image,
        });
        const marker_orientation = new google.maps.Marker({
            position,
            map,
            icon: orientation,
        });
        stations.push(marker);
        stations_orientation.push(marker_orientation);
    }
    //For Markers???????
    if( place_mode == 1){
    const image = { url: "http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png", scaledSize: new google.maps.Size(20, 20),};
        const marker = new google.maps.Marker({
            position,
            map,
            icon: image,
        });
        markers.push(marker);
    }
    //console.log(stations);
    countMarkersInPolygon();
    countStationsInPolygon();
}

function setMapOnAll_markers(map) {
    for (let i = 0; i < markers.length; i++) {
        markers[i].setMap(map);
    }

}
function setMapOnAll_stations(map) {
    for (let i = 0; i < stations.length; i++) {
        stations[i].setMap(map);
    }

}
function setMapOnAll_stations_orientation(map) {
    for (let i = 0; i < stations_orientation.length; i++) {
        stations_orientation[i].setMap(map);
    }
}

//--------------------Clear Markers and Stations
function clearMarkers() {
    setMapOnAll_markers(null);
    markers = [];
    //stations = [];
    document.getElementById("markerCnt").innerHTML = "# of nodes inside polygon: 0";
}

function clearStations() {
    setMapOnAll_stations(null);
    //markers = [];
    stations = [];
    document.getElementById("stationCnt").innerHTML = "# of stations inside polygon: 0";
}
function hideOrientation(){
    setMapOnAll_stations_orientation(null);
}
function showOrientation(){
    setMapOnAll_stations_orientation(map);
}
//---------------------Marker Locations
function PolyArray(array) {
    vertices = [];

    for (var i = 0; i < array.getLength(); i++) {
        vertices.push({
            lat: array.getAt(i).lat(),
            lng: array.getAt(i).lng()
        });
    }
    console.log(vertices);
}
//----------------------Counts Markers in Polygon
function countMarkersInPolygon() {
    // count markers
    markerCnt = 0;
    for (var i = 0; i < markers.length; i++) {
        if (google.maps.geometry.poly.containsLocation(markers[i].getPosition(), polygon)) {
            markerCnt++;
        }
    }
    document.getElementById("markerCnt").innerHTML = "# of nodes inside polygon: " + markerCnt;
}
//----------------------Counts Stations in Polygon
function countStationsInPolygon() {
    // count stations
    stationCnt = 0;
    for (var i = 0; i < stations.length; i++) {
        if (google.maps.geometry.poly.containsLocation(stations[i].getPosition(), polygon)) {
            stationCnt++;
        }
    }
    document.getElementById("stationCnt").innerHTML = "# of stations inside polygon: " + stationCnt;
}
//----------------------Creates Random markers
async function randomMarkers() {
    clearMarkers();
    countMarkersInPolygon();
    const image = { url: "http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png", scaledSize: new google.maps.Size(20, 20),};
    var bounds = new google.maps.LatLngBounds();
    for (var i = 0; i < polygon.getPath().getLength(); i++) {
        bounds.extend(polygon.getPath().getAt(i));
    }
    var sw = bounds.getSouthWest();
    var ne = bounds.getNorthEast();
    for (var i = 0; i < 5000; i++) {            //Marker Creation (INTEGER) Limit--------------------------------------
        var ptLat = Math.random() * (ne.lat() - sw.lat()) + sw.lat();
        var ptLng = Math.random() * (ne.lng() - sw.lng()) + sw.lng();
        var point = new google.maps.LatLng(ptLat, ptLng);
        if (google.maps.geometry.poly.containsLocation(point, polygon) && getRandomInput() > 0) {
            var markerz = new google.maps.Marker({ position: point, map: map, icon: image, });
            markers.push(markerz);
            if (i && i % 25 == 0){
                await new Promise(r => setTimeout(r, 250));
            }
            if (markers.length == getRandomInput()) {
                countMarkersInPolygon();
                break;
            }
            countMarkersInPolygon();
            nodeDensity();
        }
    }
}
randomMarkers();

function nodeDensity() {
    var kmarea = parseFloat(area) * (.000001);
    ndensity = markerCnt / kmarea;
    document.getElementById("density").innerHTML = "Node Density: " + ndensity.toFixed(2) + " nodes per km&sup2;";
}
//----------------------Gets input number for random input
function getRandomInput() {
    return document.getElementById("rnode").value;
}

function markerPositions() {
    markerPos = [[], []];
    for (var i = 0; i < markers.length; i++) {
        if (google.maps.geometry.poly.containsLocation(markers[i].getPosition(), polygon)) {
            markerPos[0].push(markers[i].getPosition().lat());
            markerPos[1].push(markers[i].getPosition().lng());
        }
    }
    console.log(markerPos);
    markerPos = JSON.stringify(markerPos);

    $.post("receiver", markerPos);
}
function random_orientation(){
    min = Math.ceil(-180);
    max = Math.floor(180);
    return Math.floor(Math.random() * (max - min + 1) + min);
}
