var parsedCoordinates = []; // array of {lat, lng} from uploadFile()
var map, polygon;
var markerCnt = 0,
    stationCnt = 0,
    ndensity = 0,
    markers = [],
    stations = [],
    vertices = [],
    place_mode = 0,
    area = "<i>update polygon to show area</i>";
document.getElementById("myLog").innerHTML = area; // "update Polygon to show area";

async function uploadFile() {
    if (parsedCoordinates.length != 0) { parsedCoordinates = []; }
    document.getElementById("coordsTable").innerHTML = '';  // reset displayed coordinates 
    var file = document.getElementById("submittedFile");
    await parseFile(file);  // wait before continuing to placeMarkers()
    placeMarkers(parsedCoordinates);
    // Update map info after placing file markers
    countMarkersInPolygon();
    var kmarea = parseFloat(google.maps.geometry.spherical.computeArea(polygon.getPath())) * (.000001);
    ndensity = markerCnt / kmarea;
    document.getElementById("myLog").innerHTML = "Polygon Area: " + kmarea.toFixed(6) + " km&sup2;";
    document.getElementById("density").innerHTML = "Node Density: " + ndensity.toFixed(2) + " nodes per km&sup2;";
    document.getElementById("submittedFile").value = null;  // w/o this, file stays in field and user can spam 'upload'
}

async function parseFile(file) { // add 'or' for CSV and TXT? not sure if upper/lowercase will mess up
    var regExp = /^([a-zA-Z0-9\s_\\.\-:])+(.csv|.txt)$/;    // because accept=".csv,.txt" wasn't working...
    let promise = await new Promise((resolve) => {
        if (!regExp.test(file.value.toLowerCase())) {       // incase .CSV or .TXT, make lowercase  
            alert("Invalid File (.csv and .txt only)");
            resolve();
        }
        var reader = new FileReader();
        reader.onload = function () {
            var lines = reader.result.split("\r\n");        // result returns file contents
            for (let i = 0; i < lines.length; i++) {
                var row = document.createElement("tr");     // table row
                var rowContent = lines[i].split(",");       // csv w/ ',' as delimiter
                var latLng = { lat: parseFloat(rowContent[0]), lng: parseFloat(rowContent[1]) };
                if (!isNaN(latLng.lat) && !isNaN(latLng.lng)) { // headers 'Lat'/'Lon' => parseFloat == NaN, don't push it.
                    parsedCoordinates.push(latLng);
                }
                /* Uncomment if you want to print the CSV file... (Scalable -- will parse any number of rows/cols) */
                // for (let j = 0; j < rowContent.length; j++) {   // column / data in row (just lat and lng)
                //     var cellElement = document.createElement("td");
                //     if (i == 0) { // th = table header (bolded text)
                //         cellElement = document.createElement("th");
                //     }
                //     var cellContent = document.createTextNode(rowContent[j]); // create and add row element to table
                //     cellElement.appendChild(cellContent);
                //     row.appendChild(cellElement);
                // }
                // coordsTable.appendChild(row);   //append table contents
            }
            resolve();
        }
        reader.readAsText(file.files[0]);   // call fileReader onload
    });
    return promise
}

async function placeMarkers(parsedCoordinates) {
    const markerIcon = { url: "http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png", 
                    scaledSize: new google.maps.Size(20, 20), };

    for (let i = 0; i < parsedCoordinates.length; i++) {
        let latLng = parsedCoordinates[i];
        var marker = new google.maps.Marker({
            position: latLng,
            map: map,
            icon: markerIcon,
        });
        markers.push(marker);
    }
}

async function placeStations(parsedStations) {
    /*"http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png"*/
    const basestationIcon = { url: "https://imagizer.imageshack.com/v2/512x512q90/r/924/ir66hA.png", 
                        scaledSize: new google.maps.Size(25, 25), 
                        origin: new google.maps.Point(0, 0), 
                        anchor: new google.maps.Point(0, 0), };

    for (let i = 0; i < parsedStations.length; i++) {
        let latLng = parsedStations[i];
        var station = new google.maps.Marker({
            position: latLng,
            map: map,
            icon: basestationIcon,
        });
        stations.push(station);
    }
}

function createMap() { // pretty much the same as Tosin's 
    var buf_x = 42.886,
        buf_y = -78.878,
        diff = 0.0033;

    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: buf_x, lng: buf_y },
        mapTypeId: 'satellite',
        disableDefaultUI: true,
        zoom: 16,
    });

    var polygonCoordinates = [
        { lat: buf_x - diff, lng: buf_y - diff },
        { lat: buf_x + diff, lng: buf_y - diff },
        { lat: buf_x + diff, lng: buf_y + diff },
        { lat: buf_x - diff, lng: buf_y + diff },
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

    var kmarea = parseFloat(google.maps.geometry.spherical.computeArea(polygon.getPath())) * (.000001);
    document.getElementById("myLog").innerHTML = "Polygon Area: " + kmarea.toFixed(6) + " km&sup2;";
    document.getElementById("markerCnt").innerHTML = "# of nodes inside polygon: " + markerCnt;
    document.getElementById("stationCnt").innerHTML = "# of stations inside polygon: " + stationCnt;
    document.getElementById("density").innerHTML = "Node Density: " + ndensity + " nodes per km&sup2;";


    google.maps.event.addListener(polygon.getPath(), 'set_at', function () {
        PolyArray(polygon.getPath());
        // area = google.maps.geometry.spherical.computeArea(polygon.getPath()); // not sure why this is here
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
        // console.log("Area inside highlighted area: " + kmarea + " kilometers squared");
        document.getElementById("myLog").innerHTML = "Polygon Area: " + kmarea.toFixed(6) + " km&sup2;";
        countMarkersInPolygon();
        countStationsInPolygon();
        nodeDensity();
    });

    map.addListener("click", (event) => {
        addMarker(event.latLng);
        nodeDensity();
    });

    document.getElementById("clear-markers").addEventListener("click", function () {
        clearMarkers();
        nodeDensity();
        // ndensity = 0;
    });

    document.getElementById("clear-stations").addEventListener("click", function () {
        clearStations();
        nodeDensity();
        // ndensity = 0;
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

    document.getElementById('rnode').addEventListener('keypress', function (event) {
        if (event.keyCode == 13) { /* enter button */
            event.preventDefault();
            document.getElementById("submit").click();
        }
    });
}

$(document).ready(function () { createMap(); }); // A little redundant (?), but just ensures to init map on page load

//-----------Adds markers and stations manually
function addMarker(position) {
    //For Stations???????
    if (place_mode == 2) {
        const image = { url: "https://imagizer.imageshack.com/v2/512x512q90/r/924/ir66hA.png",  
        scaledSize: new google.maps.Size(25, 25), 
        origin: new google.maps.Point(0, 0), 
        anchor: new google.maps.Point(0, 0) };
        const marker = new google.maps.Marker({
            position,
            map,
            icon: image,
        });
        stations.push(marker);
    }
    //For Markers???????
    if (place_mode == 1) {
        const image = { url: "http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png", 
        scaledSize: new google.maps.Size(20, 20) };
        const marker = new google.maps.Marker({
            position,
            map,
            icon: image,
        });
        markers.push(marker);
    }
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

//--------------------Clear Markers and Stations
function clearMarkers() {
    setMapOnAll_markers(null);
    markers = [];
    markerCnt = 0;
    document.getElementById("markerCnt").innerHTML = "# of nodes inside polygon: 0";
}

function clearStations() {
    setMapOnAll_stations(null);
    stations = [];
    document.getElementById("stationCnt").innerHTML = "# of stations inside polygon: 0";
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
}

//----------------------Counts Markers in Polygon
function countMarkersInPolygon() {
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
    for (var i = 0; i < 4000; i++) {            //Marker Creation (INTEGER) Limit--------------------------------------
        var ptLat = Math.random() * (ne.lat() - sw.lat()) + sw.lat();
        var ptLng = Math.random() * (ne.lng() - sw.lng()) + sw.lng();
        var point = new google.maps.LatLng(ptLat, ptLng);
        if (google.maps.geometry.poly.containsLocation(point, polygon) && getRandomInput() > 0) {
            var markerz = new google.maps.Marker({ position: point, map: map, icon: image, });
            markers.push(markerz);
            if (i && i % 500 == 0){
                await new Promise(r => setTimeout(r, 750));
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
// randomMarkers(); // not sure why it's called here?

function nodeDensity() {
    // var kmarea = parseFloat(area) * (.000001); --> area is a string? 
    var kmarea = parseFloat(google.maps.geometry.spherical.computeArea(polygon.getPath())) * (.000001);
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
    markerPos = JSON.stringify(markerPos);
    $.post("receiver", markerPos);
}

function sendData() {   /* sends topology data to python */
    let topologyData = new Object();    // Object to store topology data; easy to add information in the future
    topologyData.id = document.getElementById("topology_id").value;
    markerPos = [[], []];   // [[Lat], [Lng]] 
    stationPos = [];        // { lat, lng }
    for (let i = 0; i < markers.length; i++) {
        markerPos[0].push(markers[i].getPosition().lat());
        markerPos[1].push(markers[i].getPosition().lng());
    }
    for (let i = 0; i < stations.length; i++) {
        stationCoordinate = {
            lat: stations[i].getPosition().lat(),
            lng: stations[i].getPosition().lng(),
        }
        stationPos.push(stationCoordinate)
    }

    topologyData.coordinates = markerPos;   // node coordinates [[Lat], [Lng]], with 'coordinates' as the key
    topologyData.polyCoords = vertices;     // polygon coordinates (if vertices blank, default polygon vertices)
    topologyData.stations = stationPos;     // Basestation coordinates {lat, lng}
    let numStations = stationPos.length;
    topologyData.numStations = numStations; // total # of basestations
    let kmarea = parseFloat(google.maps.geometry.spherical.computeArea(polygon.getPath())) * (.000001);
    topologyData.polyArea = kmarea;         // polygon area (have to store as var first for it to work, not sure why)
    let polyDensity = markerCnt / kmarea;
    topologyData.polyDensity = polyDensity; // (num nodes inside polygon) / (polygon area) = polygon density (nodes per km^2)
    let numNodes = markerPos[0].length;
    topologyData.numNodes = numNodes;       // total # of lat coordinates (or lng) is the total # of nodes


    topologyData = JSON.stringify(topologyData); // send data to python in a well-defined format (json)
    $.post("saveTopologyData", topologyData,
        function (data) { // success callback
            if (data != "") { // if error is not blank
                $('#error').css("color", "red");
                $('#error').html(data); // display the error text returned by callback
            } else {    // else error was blank  (no error --> success)
                $('#error').css("color", "green"); // change css color to green (for success)
                $('#error').html("Topology successfully added to database") // display success text
            }
            $('#topology_id').val(''); // reset input field on success or error
        });
}

function loadData() { /* send ID to python, python will send info back, then js will deal with it */
    let topologyData = new Object();
    topologyData.id = document.getElementById("topology_id").value;
    topologyData = JSON.stringify(topologyData);
    $.post("loadTopologyData", topologyData,
        function (data, status, xhr) {
            const dbData = JSON.parse(data);
            $('#error').css("color", "green"); // change css color to green (for success)
            $('#error').html("Topology data fetched"); // display success text

            let lat = JSON.parse(dbData.lat),
                lng = JSON.parse(dbData.lng),
                numNodes = dbData.numNodes,
                basestations = JSON.parse(dbData.basestations),
                numStations = dbData.numStations,
                polyArea = dbData.polyArea,
                polyCoords = JSON.parse(dbData.polyCoords),
                polyDensity = dbData.polyDensity;

            let parsedCoordinates = [];
            for (let i = 0; i < lat.length; i++) { /* or lng.length */
                parsedCoordinates.push(
                    { lat: lat[i], lng: lng[i] }
                )
            }

            if (polyCoords.length != 0) {
                let newPath = [];
                for (let i = 0; i < polyCoords.length; i++) {
                    newPath.push(polyCoords[i]);
                }
                polygon.setPath(newPath);
            } else {
                polygon.setPath(defaultPolygon());
            }

            clearMarkers();
            placeMarkers(parsedCoordinates);
            placeStations(basestations)
            nodeDensity();
            updateMapInfo(polyArea, parseFloat(polyDensity))
        }
    ).fail(function (data, status, xhr) {
        if (xhr == "BAD REQUEST") {
            $('#error').html("Invalid ID (alphanumeric characters only)");
        } else if (xhr == "NOT FOUND") {
            $('#error').html("ID does not exist");
        } else {
            $('#error').html("500 Internal server error"); // this should never appear
        }
    });

}

function updateMapInfo(polygonArea, polygonDensity) {
    countMarkersInPolygon();    // updates 'markerCnt'
    countStationsInPolygon();   // updates 'stationCnt'
    ndensity = markerCnt / polygonArea;
    $('#myLog').html = "Polygon Area: " + polygonArea.toFixed(6) + " km&sup2;";
    $('#markerCnt').html = "# of nodes inside polygon: " + markerCnt;
    $('#stationCnt').html = "# of stations inside polygon: " + stationCnt;
    $('#density').html = "Node Density: " + ndensity.toFixed(2) + " nodes per km&sup2;";
}

function defaultPolygon() {
    let buf_x = 42.886,
        buf_y = -78.878,
        diff = 0.0033;

    let polygonCoordinates = [
        { lat: buf_x - diff, lng: buf_y - diff },
        { lat: buf_x + diff, lng: buf_y - diff },
        { lat: buf_x + diff, lng: buf_y + diff },
        { lat: buf_x - diff, lng: buf_y + diff },
    ];
    return polygonCoordinates;
}



