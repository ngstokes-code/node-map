function sendData() {   /* sends topology data to python */
    let topologyData = new Object();    // Object to store topology data; easy to add information in the future
    topologyData.id = document.getElementById("topology_id").value;
    // markerPos = [[], []];   // [[Lat], [Lng]] 
    markerPos = [];         // [{ lat, lng }]
    stationPos = [];        // [{ lat, lng }]
    polygonPos = [];        // [{ lat, lng }]
    for (let i = 0; i < markers.length; i++) {
        let markerCoordinate = {
            lat: markers[i].getPosition().lat(),
            lng: markers[i].getPosition().lng(),
        };
        markerPos.push(markerCoordinate);
    }
    for (let i = 0; i < stations.length; i++) {
        let stationCoordinate = {
            lat: stations[i].getPosition().lat(),
            lng: stations[i].getPosition().lng(),
        };
        stationPos.push(stationCoordinate);
    }
    polyBounds = polygon.getPath(); 
    for (let i = 0; i < polyBounds.length; i++) {
        let polyCoordinate = {
            lat: polyBounds.getAt(i).lat(),
            lng: polyBounds.getAt(i).lng(),
        };
        polygonPos.push(polyCoordinate);
    }

    topologyData.coordinates = markerPos;   // node coordinates [{lat: ..., lng: ...}], with 'coordinates' as the key
    // topologyData.polyCoords = polygon_coordinates;     // polygon coordinates (if vertices blank, default polygon vertices)
    topologyData.polyCoords = polygonPos;
    topologyData.stations = stationPos;     // Basestation coordinates {lat, lng}
    // let numStations = stationPos.length;
    // topologyData.numStations = numStations; // total # of basestations
    let kmarea = parseFloat(google.maps.geometry.spherical.computeArea(polygon.getPath())) * (.000001);
    topologyData.polyArea = kmarea;         // polygon area (have to store as var first for it to work, not sure why)
    let polyDensity = markersInPolygon / kmarea;
    topologyData.polyDensity = polyDensity; // (num nodes inside polygon) / (polygon area) = polygon density (nodes per km^2)
    // let numNodes = markerPos.length;
    // topologyData.numNodes = numNodes;       // total # of lat coordinates (or lng) is the total # of nodes

    // send data to python in a well-defined format (json)
    $.post("saveTopologyData", JSON.stringify(topologyData),
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

            /** 
             * topology = { id: '...', 
             * UEs: [{lat: ..., lng: ...}], 
             * eNBs: [{lat: ..., lng: ...}], 
             * polygon: {vertices: [{lat: ..., lng: ...}], ndensity: #, area: # }}
            */
            let topology = JSON.parse(dbData.topology)
            let new_polygon = JSON.parse(topology.polygon)
            if (new_polygon.vertices.length != 0) {
                /* polygon vertices were changed from default */ 
                polygon.setPath(new_polygon.vertices);
            } else { 
                /* empty list, use default vertices. */
                polygon.setPath(defaultPolygon());
            }

            /*  map info doesn't update when moving it around, after loading a topology.
                However, re-setting the event listeners fixes it... Not sure exactly why. */
            google.maps.event.addListener(polygon.getPath(), 'set_at', updatePolygon);
            google.maps.event.addListener(polygon.getPath(), 'insert_at', updatePolygon);

            clear(MARKER);
            placeMarkers(topology.UEs);
            placeStations(topology.eNBs)
            updatePolygon();  /* this will update the map info (polygon area, num nodes/stations, etc.) */
        }
    ).fail(function (data, status, xhr) {
        $('#error').css("color", "red"); // change css color to red (for error)
        if (xhr == "BAD REQUEST") {
            $('#error').html("Invalid ID (alphanumeric characters only)");
        } else if (xhr == "NOT FOUND") {
            $('#error').html("ID does not exist");
        } else {
            $('#error').html("500 Internal server error"); // this should never appear
        }
    });
}


function hideTable() {
    /* get id 'topologies-table' and clear its innerHTML */
    $('#topologies-table').empty(); 
}

/**
 * @param {float} polygonArea
 * @param {float} polygonDensity (unused for now)
 */
function updateMapInfo(polygonArea, polygonDensity) {
    updateCount(MARKER);    // updates 'markerCnt'
    updateCount(STATION);   // updates 'stationCnt'
    ndensity = markersInPolygon / polygonArea;
    $('#myLog').html = "Polygon Area: " + polygonArea.toFixed(6) + " km&sup2;";
    $('#markerCnt').html = "# of nodes inside polygon: " + markersInPolygon;
    $('#stationCnt').html = "# of stations inside polygon: " + stationsInPolygon;
    $('#density').html = "Node Density: " + ndensity.toFixed(2) + " nodes per km&sup2;";
}

/* if a user loads a topology with an unchanged polygon, load the defaultPolygon */ 
function defaultPolygon() {
    let polygon_coordinates = [
        { lat: START_LAT - POLYGON_OFFSET, lng: START_LNG - POLYGON_OFFSET },
        { lat: START_LAT + POLYGON_OFFSET, lng: START_LNG - POLYGON_OFFSET },
        { lat: START_LAT + POLYGON_OFFSET, lng: START_LNG + POLYGON_OFFSET },
        { lat: START_LAT - POLYGON_OFFSET, lng: START_LNG + POLYGON_OFFSET },
    ];
    return polygon_coordinates;
}
