var enbcoords = [[42.90114, -78.86478]];
var uecoords = [];  // array of {lat, lng} from uploadFile()
var rsrp = [];  // array of rsrp (or other value) from uploadFile()
var originalRsrp = []; // rsrp from uploadFile() -- When colorbar gets made, it overwrites the rsrp values (not sure why)
var markers = []; // array of ALL markers placed on the map (so we can clear the map)
var map, marker;
let ueheatmap = [];
let distance = [];
var tempdistance, deltax, deltay;
var maxdistance = 0;
var maxRSRP = -60000;
var minRSRP = 10000;


// Below variables for colorscale[42.90114,-78.86478],
var lowerBound = 42.896;
var leftBound = -78.87;
var height = 0.006;
var width = 0.00125;
var upperBound = lowerBound + height;
var rightBound = leftBound + width;
var numberOfColors = 4;
var colorinput, chromaColor, fruitBelt, fruitBeltCoords;
var testLocation = [
    [42.900845, -78.854896, "166 Rose St"],
    [42.896911, -78.859551, "76 Orange st"],
    [42.900492, -78.858085, "292 High st"],
    [42.899651, -78.854321, "902 Jefferson"],
    [42.8980559431743, -78.85922606800999, "130 Lemon st"],
    [42.900133, -78.860924, "243 Mulberry"],
];

async function uploadFile() {
    if (uecoords.length != 0) {
        uecoords = [];
        rsrp = [];
        originalRsrp = [];
        deleteMarkers();
    }
    document.getElementById("csvTable").innerHTML = '';  // reset displayed coordinates 
    var file = document.getElementById("submittedFile");
    await parseFile(file);  // wait before continuing to placeENBs(), etc.
    placeENBs(enbcoords);
    placeUEs(uecoords);
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
                var hmValue = parseInt(rowContent[2])       // heatmap value to determine color
                if (!isNaN(latLng.lat) && !isNaN(latLng.lng) && !isNaN(hmValue)) { // headers 'Lat'/'Lon' => parseFloat == NaN, don't push it.
                    uecoords.push(latLng);
                    rsrp.push(hmValue)
                    originalRsrp.push(hmValue); // colorbar overwrites rsrp, so cant pull w/o refactoring their code. Just save it again 
                }
                /* Uncomment if you want to print the CSV file... (Scalable -- will parse any number of rows/cols) */
                for (let j = 0; j < rowContent.length; j++) {   // column / data in row (just lat and lng)
                    var cellElement = document.createElement("td");
                    if (i == 0) { // th = table header (bolded text)
                        cellElement = document.createElement("th");
                    }
                    var cellContent = document.createTextNode(rowContent[j]); // create and add row element to table
                    cellElement.appendChild(cellContent);
                    row.appendChild(cellElement);
                }
                csvTable.appendChild(row);   //append table contents
            }
            resolve();
        }
        reader.readAsText(file.files[0]);   // call fileReader onload
    });
    return promise
}


function placeENBs(enbcoords) { /* places enb's on the map */
    const ENBicon = {
        url: "https://imagizer.imageshack.com/v2/512x512q90/r/924/ir66hA.png",
        scaledSize: new google.maps.Size(25, 25),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(0, 0),
    };
    for (var i = 0; i < enbcoords.length; i++) {

        const infowindow = new google.maps.InfoWindow({
            content:
                `<div id="infoWindow"><b>Latitude: ${enbcoords[i][0]}</b><br />
            <b>Longitude: ${enbcoords[i][1]}</b><br /></div>`
            ,
        });
        var marker = new google.maps.Marker({
            position: { lat: enbcoords[i][0], lng: enbcoords[i][1] },
            map: map,
            optimized: false,
            icon: ENBicon
        });
        marker.addListener("click", () => {
            infowindow.open({
                anchor: marker,
                map,
                shouldFocus: false,
            });
        });
        // markers.push(marker) commented for now to test adding infowindows in seperate function
    }
}


function placeUEs(uecoords) {
    var start, stop;
    var streak = -1;
    // Calculate proximity to nearest ENB for each UE
    for (i = 0; i < uecoords.length; i++) {
        var ueLatLng = new google.maps.LatLng(uecoords[i]);
        if (google.maps.geometry.poly.containsLocation(ueLatLng, fruitBelt) == true) {
            stop = 1;
            if (rsrp[i] > maxRSRP) {
                maxRSRP = rsrp[i];
            }
            if (rsrp[i] < minRSRP) {
                minRSRP = rsrp[i];
            }
        }
        else {
            stop = 0;
            if (streak == -1) {
                start = i + 3;
            }
            streak = streak + 1;
        }
        if (stop == 1 && streak != -1) {
            // console.log(start, start + streak);
            streak = -1;
            stop = 0;
        }
    }

    // Plot the Colorbar
    var canvas = document.getElementById("canv");
    var context = canvas.getContext("2d");
    canvas.style.position="absolute";
    context.font = "12px Arial";

    //addLabel("RSRP (dB)", lowerBound + (0.5 * height), rightBound - 5 * 0.00075);
    //addLabel((minRSRP).toString(), lowerBound, rightBound + 0.00075);
    for (i = numberOfColors-1; i >= 0; i--) {
        if (colorinput == 1) { //black and white
            chromaColor = chroma.mix('lightgrey', 'black', (i / numberOfColors));
            color = chromaColor.hex();
        }
        else { //green, yellow, and red
            if (i / numberOfColors < 0.5) {
                chromaColor = chroma.mix('red', 'yellow', 2 * i / (numberOfColors-1));
                color = chromaColor.hex();
            }
            else {
                chromaColor = chroma.mix('yellow', 'green', 2 * ((i / (numberOfColors-1)) - 0.5));
                color = chromaColor.hex();
            }
        }

        context.fillStyle = color;
        context.fillRect(100,(numberOfColors-i-1)*context.canvas.height*(1/numberOfColors),40, context.canvas.height*(1/numberOfColors));
        context.fillStyle = "black";
        context.fillText(parseInt(minRSRP + (i+1)*(maxRSRP-minRSRP)/numberOfColors) + " dB", 150, (numberOfColors-i-1)*context.canvas.height*(1/numberOfColors) + 2.2*(i+1));

    }

    context.fillText(minRSRP.toString()+" dB",150,context.canvas.height);
    context.font = "20px Arial";
    context.fillText("RSRP", 30, context.canvas.height/2 + 8);

    //Create black border for bar
    context.beginPath();
    context.lineWidth="2";
    context.strokeStyle="black";
    context.rect(99,0,40,context.canvas.height);
    context.stroke();

    for (i = 0; i < testLocation.length; i++) {
        var marker = new google.maps.Marker({
            position: { lat: testLocation[i][0], lng: testLocation[i][1] },
            map: map,
            optimized: false,
            icon: ueicon,
            label: testLocation[i][2],
        });
        markers.push(marker)
    }

    var infoWindow = new google.maps.InfoWindow();
    for (i = 0; i < uecoords.length; i++) {
        var ueLatLng = new google.maps.LatLng(uecoords[i]);
        if (google.maps.geometry.poly.containsLocation(ueLatLng, fruitBelt) == true) {
            //Normalize rsrp between 0 and 1 and discretize
            rsrp[i] = rsrp[i] - minRSRP;
            rsrp[i] = Math.round((numberOfColors-1) * ((rsrp[i]) / (maxRSRP - minRSRP)))/(numberOfColors-1);
            //console.log(RSRP[i]);
            if (colorinput == 1) {
                chromaColor = chroma.mix('lightgrey', 'black', (rsrp[i]));
                color = chromaColor.hex();
            }
            else {
                if (rsrp[i] <= 0.5) {
                    chromaColor = chroma.mix('red', 'yellow', 2 * rsrp[i]);
                    color = chromaColor.hex();
                }
                else {
                    chromaColor = chroma.mix('yellow', 'green', 2 * (rsrp[i] - 0.5));
                    color = chromaColor.hex();
                }
            }
            var ueicon = {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: color,
                fillOpacity: 1,
                strokeColor: '#000',
                strokeOpacity: 0,
                strokeWeight: 0,
                scale: 3
            }

            var marker = new google.maps.Marker({
                position: uecoords[i],
                map: map,
                optimized: false,
                icon: ueicon
            });
            // Create a property 'content' to marker object, then use this.content in event handler
            marker.content = `<div id="infoWindow">
                                <b>Latitude:</b> ${uecoords[i].lat}<br />
                                <b>Longitude:</b> ${uecoords[i].lng}<br />
                                <b>RSRP:</b> ${originalRsrp[i]}<br />
                              </div>`;

            google.maps.event.addListener(marker, 'click', function () {
                infoWindow.setContent(this.content);
                infoWindow.open(this.getMap(), this);
            });

            markers.push(marker)
        }
    }

}


function animLines(){
    var animEndPts = [[42.903687,-78.856457],
    [42.90208,-78.854115],
    [42.899775,-78.854706],
    [42.897752,-78.855442],
    [42.896845,-78.860821]];


    // Define the symbol, using one of the predefined paths ('CIRCLE')
    // supplied by the Google Maps JavaScript API.
    const lineSymbol = {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 6,
    strokeColor: "#F00",
    };

    for(i = 0; i < animEndPts.length; i++){
    // Create the polyline and add the symbol to it via the 'icons' property.
    console.log(animEndPts[i][0]);
    console.log(animEndPts[i][1]);
    const line = new google.maps.Polyline({
    path: [
    { lat: 42.90085, lng: -78.86430 },
    { lat: animEndPts[i][0], lng: animEndPts[i][1] },
    ],
    icons: [
    {
    icon: lineSymbol,
    offset: "100%",
    },
    ],
    map: map,
    strokeWeight: 1,
    });

    animateCircle(line);

    }
}


function animateCircle(line) {
    let count = 0;
  
    window.setInterval(() => {
      count = (count + 2) % 200;
  
      const icons = line.get("icons");
  
      icons[0].offset = count / 2 + "%";
      line.set("icons", icons);
    }, 20);
}

// /* work in progress */
// function addInfoWindows(markers) {
//     for (let i = 0; i < markers.length; i++) {
//         var infowindow = new google.maps.InfoWindow({
//             content:
//                 `<div id="infoWindow">
//                 <b>Latitude: ${uecoords[i].lat}</b><br />
//                 <b>Longitude: ${uecoords[i].lng}</b><br />
//                 <b>RSRP: ${rsrp[i]}</b>
//                 </div>`
//         });
//         markers[i].addListener("click", () => {
//             infowindow.open({
//                 anchor: marker,
//                 map,
//                 shouldFocus: false,
//             });
//         });
//     }
// }


function addLabel(text, latitude, longitude) {
    // Define fully transparent icon to place text
    var Emptyicon = {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: '#F00',
        fillOpacity: 0,
        strokeColor: '#000',
        strokeOpacity: 0,
        strokeWeight: 0,
        scale: 8
    }

    new google.maps.Marker({
        position: { lat: latitude, lng: longitude },
        map: map,
        icon: Emptyicon,
        label: {
            color: '#000',
            fontWeight: 'bold',
            text: text,
            fontSize: '15px',
        }
    });
}


function setMapOnAll(map) {
    for (let i = 0; i < uecoords.length; i++) {
        uecoords[i].setMap(map);
    }
}

// Removes the markers from the map, but keeps them in the array.
function hideMarkers() {
    setMapOnAll(null);
}

// Shows any markers currently in the array.
function showMarkers() {
    setMapOnAll(map);
}

// Deletes all markers in the array by removing references to them.
function deleteMarkers() {
    hideMarkers();
    markers = [];
}


function haversine_distance(pt1, pt2) {
    var R = 3958.8; // Radius of the Earth in miles
    var rlat1 = pt1.lat * (Math.PI / 180); // Convert degrees to radians
    var rlat2 = pt2.lat * (Math.PI / 180); // Convert degrees to radians
    var difflat = rlat2 - rlat1; // Radian difference (latitudes)
    var difflon = (pt2.lng - pt1.lng) * (Math.PI / 180); // Radian difference (longitudes)

    var d = 2 * R * Math.asin(Math.sqrt(Math.sin(difflat / 2) * Math.sin(difflat / 2) + Math.cos(rlat1) * Math.cos(rlat2) * Math.sin(difflon / 2) * Math.sin(difflon / 2)));
    return d;
}


function createMap(colorinput) {

    // Set up map options
    var options = {
        zoom: 15,
        center: { lat: 42.899985, lng: -78.862449 }
    }

    var customStyle = [
        {
            featureType: "all",
            elementType: "labels",
            stylers: [
                { visibility: "off" },
            ]
        }, {
            featureType: "road",
            elementType: "labels",
            stylers: [
                { "visibility": "on" }
            ]
        }
    ];

    map = new google.maps.Map(document.getElementById('map'), options);
    map.set('styles', customStyle);

    // Create the search box and link it to the UI element.
    const input = document.getElementById("pac-input");
    const searchBox = new google.maps.places.SearchBox(input);

    map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);
    // Bias the SearchBox results towards current map's viewport.
    map.addListener("bounds_changed", () => {
        searchBox.setBounds(map.getBounds());
    });

    let addressMarkers = [];

    // Listen for the event fired when the user selects a prediction and retrieve
    // more details for that place.
    searchBox.addListener("places_changed", () => {
        const places = searchBox.getPlaces();

        if (places.length == 0) {
            return;
        }

        // Clear out the old markers.
        addressMarkers.forEach((marker) => {
            marker.setMap(null);
        });
        addressMarkers = [];

        // For each place, get the icon, name and location.
        const bounds = new google.maps.LatLngBounds();

        places.forEach((place) => {
            if (!place.geometry || !place.geometry.location) {
                console.log("Returned place contains no geometry");
                return;
            }

            const icon = {
                url: place.icon,
                size: new google.maps.Size(71, 71),
                origin: new google.maps.Point(0, 0),
                anchor: new google.maps.Point(17, 34),
                scaledSize: new google.maps.Size(25, 25),
            };

            // Create a marker for each place.
            addressMarkers.push(
                new google.maps.Marker({
                    map,
                    icon,
                    title: place.name,
                    position: place.geometry.location,
                })
            );

            // Find closest heatmap point, save the point & corresponding rsrp
            address = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() }
            let minDist = Number.POSITIVE_INFINITY;
            let minPoint = null;
            for (let i = 0; i < uecoords.length; i++) {
                let tempDist = haversine_distance(address, uecoords[i]);
                if(tempDist < minDist){
                    minDist = tempDist;
                    minPoint = { lat: uecoords[i].lat, lng: uecoords[i].lng, rsrp: originalRsrp[i]};
                }
            }
            
            displayEstimatedRsrp(minPoint.rsrp, true);
            // if (!google.maps.geometry.poly.containsLocation(addressMarkers[0], fruitBelt)) {
            //     displayEstimatedRsrp(null, false);  // point outside fruitbelt polygon, estimate won't be accurate
            // } else { 
            //     displayEstimatedRsrp(minPoint.rsrp, true);  // address inside fruitbelt, find RSRP
            // }

            if (place.geometry.viewport) {
                // Only geocodes have viewport.
                bounds.union(place.geometry.viewport);
            } else {
                bounds.extend(place.geometry.location);
            }
        });
        map.fitBounds(bounds);
    });

    // Draw Polygon
    fruitBeltCoords = [
        { lat: 42.89818528496653, lng: -78.86449864273071 },
        { lat: 42.900247551626414, lng: -78.86382272605896 },
        { lat: 42.900319832934464, lng: -78.86548033123016 },
        { lat: 42.90132265831549, lng: -78.86535426740646 },
        { lat: 42.901352517076894, lng: -78.86316692595481 },
        { lat: 42.90207397771305, lng: -78.86308243637085 },
        { lat: 42.90434353798624, lng: -78.86306097869873 },
        { lat: 42.90439069064209, lng: -78.85830185699463 },
        { lat: 42.90431210286225, lng: -78.85352127761843 },
        { lat: 42.90046284766128, lng: -78.85337107391359 },
        { lat: 42.8994297617024, lng: -78.8534086248398 },
        { lat: 42.89845953469825, lng: -78.85340326042177 },
        { lat: 42.89784297578435, lng: -78.85350518436434 },
        { lat: 42.897477920150905, lng: -78.8538216850281 },
        { lat: 42.893768051803015, lng: -78.86274359512329 },
        { lat: 42.89386237325481, lng: -78.86428742713927 },
        { lat: 42.8940824560813, lng: -78.86544502105711 },
        { lat: 42.89541865638171, lng: -78.8652620706558 },
        { lat: 42.89675482773014, lng: -78.86482162818906 },
        { lat: 42.89818528496653, lng: -78.86449864273071 },];

    fruitBelt = new google.maps.Polygon({
        paths: fruitBeltCoords,
        strokeColor: "#FF0000",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: "#FF0000",
        fillOpacity: 0.2,
        map: map
    });

    fruitBelt.setMap(map);

}


function displayEstimatedRsrp(rsrp, insideFruitbelt) {
    if (insideFruitbelt) {
        $('estimatedRsrp').css("color", "green")
        $('#estimatedRsrp')
        .html('Estimated RSRP: ' + rsrp 
        + '<small class="form-text text-muted">estimate comes from the RSRP of the closest point</small>');
    } else {
        $('estimatedRsrp').css("color", "red")
        $('#estimatedRsrp').html('Address outside fruitbelt, cannot give a reasonably accurate RSRP value');
    }
}