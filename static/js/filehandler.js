/** IMPORTANT NOTE REGARDING USAGE: 
 * Since filehandler.js is defined after load.js, filehandler.js can use 
 * functions and variables from load.js, but NOT the other way around. There
 * is a thing called modules (adding 'type="module"' to the script tag), but
 * it introduces a few problems that are difficult to overcome. This way here
 * is a good middle ground to organize our code without using modules.
 */

/* START OF JSON RELATED CODE */

var submitted_json;
var expected_keys = new Set([
    'nodeCoordinates',
    'baseStationCoordinates',
    'numNodes',
    'numBaseStations'
]);
var paired_json_keys = { /* expected_key: actual_key */ };
async function uploadJSON() {
    await clearJSON(); // clears the JSON related divs so they dont get duplicated
    var file = document.getElementById("submittedJSON");
    await parseJSON(file);
}

async function clearJSON() {
    let p = new Promise((resolve) => {
        paired_json_keys = {};
        $('#jsonSubmissionResponse').empty();
        $('#actualKeys').html('');
        $('#expectedKeys').empty();
        $('#pairedKeys').empty();
        $('#makePairsButton').empty();
        clear(MARKER);
        clear(STATION);
        resolve();
    })
    return p
}

/**
 * @param {File} submittedJson
 * https://developer.mozilla.org/en-US/docs/Web/API/File
 * @param {Object(string->string)} pairedKeys
 * it's a hashmap of expectedKeyNames->actualKeyNames
 */
function plotJSON(submittedJson, pairedKeys) {
    let ueCoordsKey = pairedKeys['nodeCoordinates'];
    let nodeCoordinates = submittedJson[ueCoordsKey];

    let enbCoordsKey = pairedKeys['baseStationCoordinates'];
    let bsCoordinates = submittedJson[enbCoordsKey];
    // clearJSON() called before plotJSON(), which clears markers / stations
    placeMarkers(nodeCoordinates);
    placeStations(bsCoordinates);
    updateCount(MARKER); // countMarkersInPolygon();
    updateCount(STATION); // countStationsInPolygon();
    nodeDensity();
}

/**
 * @param {File} file
 * https://developer.mozilla.org/en-US/docs/Web/API/File
 */
async function parseJSON(file) {
    clearJSON(); // clears JSON pairs / radios, as well as points on the map
    var p = new Promise((resolve) => {
        var reader = new FileReader();
        reader.onload = function (event) {
            var json_str = event.target.result;
            var user_json = JSON.parse(json_str);
            resolve(user_json);
        }
        reader.readAsText(file.files[0]);
    })

    p.then(user_json => {
        submitted_json = user_json;
        actual_keys = new Set();
        var paired_keys_div = $('#pairedKeys');
        // $("#jsonSubmissionResponse").html(`<p style="color:white;"> Expected keys: ${Array.from(expected_keys).join(', ')}</p>`)
        for (const [key, value] of Object.entries(user_json)) {
            if (!expected_keys.has(key)) {
                actual_keys.add(key)
                // var curr_text = $("#jsonSubmissionResponse").html() // Both are the same DIV, cannot change css to red/green since it'll color the entire div
                // $("#jsonSubmissionResponse").html(curr_text + `<p style="color:red;"> Key '${key}' was unrecognized</p>`);
            } else {
                paired_json_keys[key] = key; // actual == expected
                paired_keys_div.append(`<li>${key} &rarr; ${key}</li>`)
                // var curr_text = $("#jsonSubmissionResponse").html()
                // $("#jsonSubmissionResponse").html(curr_text + `<p style="color:green;"> Key '${key}' was recognized</p>`);
            }
        }
        populateRadios(actual_keys, expected_keys);
    });
}

function getRadioValues() {
    let actual_radio = $('input[name="actual_keys"]:checked')
    let expected_radio = $('input[name="expected_keys"]:checked')

    if (actual_radio.val() === undefined || expected_radio.val() === undefined) {
        alert("1 or more radio selections were blank when 'Make Pair' was clicked");
        return;
    } else {
        var paired_keys_div = $('#pairedKeys');
        paired_keys_div.append(`<li>${actual_radio.val()} &rarr; ${expected_radio.val()}</li>`)
        paired_json_keys[expected_radio.val()] = actual_radio.val();
        var size = Object.keys(paired_json_keys).length;
        if (size == expected_keys.size) { // Set -> .size | array, etc -> .length
            $("#jsonSubmissionResponse").html(`<p style="color:green;"> All keys have been paired, attempting to plot points now...</p>`)
            plotJSON(submitted_json, paired_json_keys);
        }
        // Disable the 'actual' radio, + add a line (strike) through the radio text
        $(`label[for=${actual_radio.val()}`).html(`&nbsp;<strike>${actual_radio.val()}</strike>`);
        actual_radio.prop('disabled', true); // disable the radio after it gets checked (.attr would also work)
        actual_radio.prop('checked', false); // need to "uncheck" the radio or next pairing won't be flagged as unchecked if left blank (attr wont work, must use .prop)
        // Do the same for the 'expected' radio
        $(`label[for=${expected_radio.val()}`).html(`&nbsp;<strike>${expected_radio.val()}</strike>`);
        expected_radio.prop('disabled', true);
        expected_radio.prop('checked', false);
    }
    return;
}

/**
 * @param {Set(string)} actual
 * @param {Set(string)} expected
 */
function populateRadios(actual, expected) {
    var actual_div = $('#actualKeys');
    var expected_div = $('#expectedKeys');
    $('#pairedKeys').html('<h5>Paired Keys</h5>');

    var actual_radios = ["<h5>Actual Keys</h5>"];
    var expected_radios = ["<h5>Expected Keys</h5>"];
    for (let item of expected.keys()) {
        let radio;
        if (item in paired_json_keys) {
            radio = `<input name="expected_keys" type="radio" disabled>&nbsp;<strike>${item}</strike><br>`;
            actual_radios.push(radio);
        } else {
            radio = `<input name="expected_keys" id="${item}" value="${item}" type="radio"><label for="${item}">&nbsp;${item}</label><br>`;
        }
        expected_radios.push(radio);
    }
    expected_div.html(expected_radios.join(''))

    for (let item of actual.keys()) { // Loop here 2nd so unique radios come after the disabled ones
        // 'actual' only has unique keys inside of it. Add disabled radios in 'expected' loop
        let radio = `<input name="actual_keys" id="${item}" value="${item}" type="radio"><label for="${item}">&nbsp;${item}</label><br>`;
        actual_radios.push(radio);
    }
    actual_div.html(actual_radios.join(''))

    var paired_keys_div = $('#pairedKeys');
    for (const [key, value] of Object.entries(paired_json_keys)) {
        paired_keys_div.append(`<li>${key} &rarr; ${value}</li>`) // key == value, i.e. we're populating the keys already paired
    }
    var size = Object.keys(paired_json_keys).length;
    if (size == expected_keys.size) { // Set -> .size | array, etc -> .length
        $("#jsonSubmissionResponse").html(`<p style="color:green;"> All keys have been paired, attempting to plot points now...</p>`)
        plotJSON(submitted_json, paired_json_keys);
    }
    // add button html string to the corresponding div ->
    $('#makePairsButton').html('<button type="button" class="btn btn-light btn-block mt-3" onclick="getRadioValues()">Make Pair</button>')
}

/* END OF JSON RELATED CODE */

/* ----- The below code is for parsing CSV files (currently not being used) ----- */
async function uploadFile() {
    if (parsedCoordinates.length != 0) { parsedCoordinates = []; }
    document.getElementById("coordsTable").innerHTML = '';  // reset displayed coordinates 
    var file = document.getElementById("submittedFile");
    await parseFile(file);  // wait before continuing to placeMarkers()
    placeMarkers(parsedCoordinates);
    // Update map info after placing file markers
    updateCount(MARKER);  // countMarkersInPolygon();
    var kmarea = parseFloat(google.maps.geometry.spherical.computeArea(polygon.getPath())) * (.000001);
    ndensity = markerCnt / kmarea;
    document.getElementById("myLog").innerHTML = "Polygon Area: " + kmarea.toFixed(6) + " km&sup2;";
    document.getElementById("density").innerHTML = "Node Density: " + ndensity.toFixed(2) + " nodes per km&sup2;";
    document.getElementById("submittedFile").value = null;  // w/o this, file stays in field and user can spam 'upload'
}


/**
 * @param {File} file
 * https://developer.mozilla.org/en-US/docs/Web/API/File
 */
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
                /* Uncomment if you want to print/display the CSV file... (Scalable -- will parse any number of rows/cols) */
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

/* END OF CSV / TXT RELATED CODE */

/**
 * placeMarkers and placeStations functions are in map.js
 */
