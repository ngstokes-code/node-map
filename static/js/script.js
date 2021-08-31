var map;
var area = "<i>update polygon to show area</i>";
var vertices = [];
var polygon;
var markers = [];
var markerCnt = 0;
var ndensity = 0;
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
        strokeColor: 'red',
        fillColor: 'red',
        fillOpacity: 0.4,
        draggable: true,
        editable: true
    });

    document.getElementById("markerCnt").innerHTML = "# of nodes inside polygon: " + markerCnt;
    document.getElementById("density").innerHTML = "Node Density: " + ndensity + " nodes per km&sup2;";

    google.maps.event.addListener(polygon.getPath(), 'set_at', function () {
        PolyArray(polygon.getPath());
        area = google.maps.geometry.spherical.computeArea(polygon.getPath());
        var kmarea = parseFloat(google.maps.geometry.spherical.computeArea(polygon.getPath())) * (.000001);
        // console.log("Area inside highlighted area: " + kmarea + " kilometers squared");
        document.getElementById("myLog").innerHTML = "Polygon Area: " + kmarea.toFixed(6) + " km&sup2;";
        countMarkersInPolygon();
        nodeDensity();
    });
    google.maps.event.addListener(polygon.getPath(), 'insert_at', function () {
        PolyArray(polygon.getPath());
        area = google.maps.geometry.spherical.computeArea(polygon.getPath());
        var kmarea = parseFloat(google.maps.geometry.spherical.computeArea(polygon.getPath())) * (.000001);
        console.log("Area inside highlighted area: " + kmarea + " kilometers squared");
        document.getElementById("myLog").innerHTML = "Polygon Area: " + kmarea.toFixed(6) + " km&sup2;";
        countMarkersInPolygon();
        nodeDensity();
    });

    map.addListener("click", (event) => {
        addMarker(event.latLng);
        nodeDensity();
    });
    document.getElementById("clear-markers").addEventListener("click", function () {
        clearMarkers();
        ndensity = 0;
    });
    document.getElementById("polygon-move").addEventListener("click", function () {
        polygon.setOptions({ clickable: true });
    });
    document.getElementById("polygon-stay").addEventListener("click", function () {
        polygon.setOptions({ clickable: false });

    });
    /*document.getElementById("random-markers").addEventListener("click", function(){
        randomMarkers();
    });*/
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

function addMarker(position) {
    const marker = new google.maps.Marker({
        position,
        map,
    });
    markers.push(marker);
    countMarkersInPolygon();
}

function setMapOnAll(map) {
    for (let i = 0; i < markers.length; i++) {
        markers[i].setMap(map);
    }
}

function clearMarkers() {
    setMapOnAll(null);
    markers = [];
    document.getElementById("markerCnt").innerHTML = "# of nodes inside polygon: 0";
}

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

function randomMarkers() {
    clearMarkers();
    countMarkersInPolygon();
    var bounds = new google.maps.LatLngBounds();
    for (var i = 0; i < polygon.getPath().getLength(); i++) {
        bounds.extend(polygon.getPath().getAt(i));
    }
    var sw = bounds.getSouthWest();
    var ne = bounds.getNorthEast();
    for (var i = 0; i < 1000; i++) {
        var ptLat = Math.random() * (ne.lat() - sw.lat()) + sw.lat();
        var ptLng = Math.random() * (ne.lng() - sw.lng()) + sw.lng();
        var point = new google.maps.LatLng(ptLat, ptLng);
        if (google.maps.geometry.poly.containsLocation(point, polygon) && getRandomInput() > 0) {
            var markerz = new google.maps.Marker({ position: point, map: map });
            markers.push(markerz);
            if (markers.length == getRandomInput()) {
                countMarkersInPolygon();
                break;
            }
            countMarkersInPolygon();
        }
    }
}

function nodeDensity() {
    var kmarea = parseFloat(area) * (.000001);
    ndensity = markerCnt / kmarea;
    document.getElementById("density").innerHTML = "Node Density: " + ndensity.toFixed(2) + " nodes per km&sup2;";
}

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