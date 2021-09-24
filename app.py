# flask imports
from flask import Flask, flash, send_file, json, jsonify, render_template, request, redirect, Response, make_response
import threading  # for mutex
import csv       # to read / write csv files
import sqlite3
from flask.helpers import url_for   # database library

from werkzeug.utils import secure_filename
from werkzeug.wrappers import response

app = Flask(__name__)
# app.secret_key = 'asdjp12319c0asdklanc'

app.config['UPLOAD_FOLDER'] = 'static/uploads'
ALLOWED_EXTENSIONS = {'txt', 'csv'}


@app.route('/')
def home():
    return render_template('index.html')


@app.route('/load')
def load():
    return render_template('load.html')


@app.route('/load_error')
def load_error(error):
    return render_template('load.html', error=error)


@app.route('/receiver', methods=['GET', 'POST'])
def get_node_data():
    if request.method == 'POST':
        data = request.get_json(force=True)
        drop_table()  # don't want to incrementally add nodes to database
        lat, lng = data[0], data[1]  # list[float] of lat / lng coordinates
        connection = sqlite3.connect('coords.db')
        cursor = connection.cursor()
        cursor.execute(
            "CREATE TABLE IF NOT EXISTS coordinates(lat REAL, lng REAL)")

        for lat, lng in zip(lat, lng):
            cursor.execute(
                "INSERT INTO coordinates VALUES ({}, {})".format(lat, lng))

        connection.commit()

    return "success"


@app.route('/tabulate_database')
def tabulate_database():
    connection = sqlite3.connect('coords.db')
    cursor = connection.cursor()
    cursor.execute(
        "CREATE TABLE IF NOT EXISTS coordinates(lat REAL, lng REAL)")
    # asterisk (*) --> everything in the database
    cursor.execute("SELECT * FROM coordinates")
    results = cursor.fetchall()  # list of tuple(lat, lng)

    row_list = []  # strings are immutable in python, instead we use a list to avoid changing an immutable string
    for idx, coordinate in enumerate(results):
        row = """
            <tr>
                <th scope="row">{num}</th>
                <td>{lat}</td>
                <td>{lon}</td>
            </tr>
                """.format(num=(idx+1), lat=coordinate[0], lon=coordinate[1])
        row_list.append(row)

    div_text = """
        <table class="table table-striped table-dark">
            <thead>
              <tr>
                <th scope="col">Node #</th>
                <th scope="col">Latitude</th>
                <th scope="col">Longitude</th>
              </tr>
            </thead>
            <tbody>
            {row_text}
            </tbody>
        </table>
                """.format(row_text='\n'.join(row_list))

    return jsonify(div_text)


@app.route('/drop_db')
def drop_table():
    print("dropping database table")
    connection = sqlite3.connect('coords.db')
    cursor = connection.cursor()
    cursor.execute("DROP TABLE IF EXISTS coordinates")
    connection.commit()
    # wipe database and return index.html render template
    # return render_template('index.html')
    return "success"


@app.route('/download_db')
def download_db():
    return send_file('coords.db', as_attachment=True, download_name="node-positions.db")


@app.route('/download_txt')
def download_txt():
    # return send_file('coords.txt', as_attachment=True)
    connection = sqlite3.connect('coords.db')
    cursor = connection.cursor()
    cursor.execute(
        "CREATE TABLE IF NOT EXISTS coordinates(lat REAL, lng REAL)")
    # asterisk (*) --> everything in the database
    cursor.execute("SELECT * FROM coordinates")
    results = cursor.fetchall()  # list of tuple(lat, lng)

    # Write the coordinates to a text file. I could've looped over and written line by line but this is faster I think
    coords_to_string = '\n'.join(
        map(lambda i: str(i[0]) + ', ' + str(i[1]), results))
    file = open("node-positions.txt", "w+")  # open (create) a writable file
    file.write(f"Latitude, Longitude\n{coords_to_string}")  # write to the file
    file.close()

    return send_file('node-positions.txt', as_attachment=True)


@app.route('/download_csv')
def download_csv():
    connection = sqlite3.connect('coords.db')
    cursor = connection.cursor()
    cursor.execute(
        "CREATE TABLE IF NOT EXISTS coordinates(lat REAL, lng REAL)")
    # asterisk (*) --> everything in the database
    cursor.execute("SELECT * FROM coordinates")
    results = cursor.fetchall()  # list of tuple(lat, lng)

    with open('node-positions.csv', 'w') as f:
        writer = csv.writer(f, lineterminator='\n')
        # If you try to write a string, every character will be a different column. List -> every index is a column
        writer.writerow(['Latitude', 'Longitude'])
        for tup in results:
            writer.writerow(tup)

    return send_file('node-positions.csv', as_attachment=True)


# mutex = threading.Lock()
@app.route('/saveTopologyData', methods=['POST'])
def req_save_topology_data():  # called when user wants to SAVE topology data
    # mutex.acquire()
    error = ""
    data = request.get_json(force=True)
    topology_id = data['id']    # Must check validity of 'topology_id'...
    if not topology_id.isalnum():   # Invalid ID submitted by user, returning here before DB insert
        error = "invalid ID (alphanumeric characters only)"
    else:
        error = save_topology(data)  # inserts data
    # mutex.release()
    # This is being sent back to JS, so render_template wont do anything. (No way around it)
    return error


# To explain the database structure for future developers;
# The datatype BLOB is an unspecified type, but we're storing strings there (hence the single quotes).
# This is because they are JSON STRINGS, so when we fetch the data we just decode the JSON and we have the actual datatype (list, etc)
# Returns whether or not there was an error, inserts topology if no error
def save_topology(data):
    # Must parse the data, impossible to query the db as json (for future search feature)
    topology_id = data['id']  # requested ID to save as
    lat, lng = data['coordinates']  # list of [[lat], [lng]] -> unpack them
    # total number of nodes (inside and outside polygon, ALL nodes)
    num_nodes = data['numNodes']
    basestations = data['stations']
    num_stations = data['numStations']
    # coordinates of polygon corners (empty if polygon unchanged)
    polygon_coordinates = data['polyCoords']
    polygon_area = data['polyArea']  # area (km^2) of polygon
    # (nodes inside polygon) / (km^2 area of polygon)
    polygon_ndensity = data['polyDensity']


# "basestations": entry[4],
# "numStations":entry[5],
    # Save data to database if ID not taken
    # table name == database name (not required, just simpler)
    connection = sqlite3.connect('topologies.db')
    cursor = connection.cursor()

    create_table = """CREATE TABLE IF NOT EXISTS topologies(
        id TEXT PRIMARY KEY, 
        lat BLOB, lng BLOB, 
        num_nodes INTEGER, 
        basestations BLOB, 
        num_stations INTEGER, 
        polygon_coordinates BLOB, 
        polygon_area REAL, 
        polygon_ndensity REAL)"""
    cursor.execute(create_table)

    check_id = """SELECT id FROM topologies WHERE id='{}'""".format(
        topology_id)
    cursor.execute(check_id)
    entry = cursor.fetchall()
    error = ""
    if bool(entry):  # list not empty --> database found existing ID
        error = "ID already taken"
    else:
        print("Inserting into database")
        insert_data = """INSERT INTO topologies VALUES ('{}', '{}', '{}', {}, '{}', {}, '{}', {}, {})""".format(topology_id, json.dumps(
            lat), json.dumps(lng), num_nodes, json.dumps(basestations), num_stations, json.dumps(polygon_coordinates), polygon_area, polygon_ndensity)
        cursor.execute(insert_data)
        connection.commit()  # save changes

    return error


@app.route('/loadTopologyData', methods=['POST'])
def req_load_topology_data():
    data = request.get_json(force=True)
    topology_id = data['id']    # Must check validity of 'topology_id'...
    if not topology_id.isalnum():   # Invalid ID submitted by user, returning here before DB insert
        # 400 BAD REQUEST
        return make_response(("Invalid ID (alphanumeric characters only)", 400))
    # tuple(error, data) containing data if there is no error
    entry = load_topology(topology_id)
    if entry == None:
        return make_response(("ID does not exist", 404))  # 404 NOT FOUND
    return json.dumps(entry)
    # return make_response((json.dumps(entry), 200))
    # return make_response((json.dumps("ID does not exist"), 404))


def load_topology(id):  # return entry w/ given ID from database
    # table name = database name (not required, just simpler)
    connection = sqlite3.connect('topologies.db')
    cursor = connection.cursor()

    create_table = """CREATE TABLE IF NOT EXISTS topologies(
        id TEXT PRIMARY KEY, 
        lat BLOB, lng BLOB, 
        num_nodes INTEGER,
        basestations BLOB,
        num_stations INTEGER, 
        polygon_coordinates BLOB, 
        polygon_area REAL, 
        polygon_ndensity REAL)"""
    cursor.execute(create_table)

    check_id = """SELECT * FROM topologies WHERE id='{}'""".format(id)
    cursor.execute(check_id)
    entry = cursor.fetchall()
    if bool(entry):  # entry found
        entry = entry[0]
        format_data = {
            "id": entry[0],
            "lat": entry[1],
            "lng": entry[2],
            "numNodes": entry[3],
            "basestations": entry[4],
            "numStations": entry[5],
            "polyCoords": entry[6],
            "polyArea": entry[7],
            "polyDensity": entry[8]
        }
        return format_data
    return None  # entry not present


def print_topology_db():  # call this to print the topologies database
    # table name = database name (not required, just simpler)
    connection = sqlite3.connect('topologies.db')
    cursor = connection.cursor()

    create_table = """CREATE TABLE IF NOT EXISTS topologies(
        id TEXT PRIMARY KEY, 
        lat BLOB, lng BLOB, 
        num_nodes INTEGER, 
        basestations BLOB, 
        num_stations INTEGER, 
        polygon_coordinates BLOB, 
        polygon_area REAL, 
        polygon_ndensity REAL)"""
    cursor.execute(create_table)

    cursor.execute("SELECT * FROM topologies")
    results = cursor.fetchall()
    print(results)


if __name__ == '__main__':
    app.run(debug=True)

# Old DB print statements
# print(f'ID: {topology_id},\nlat: {lat},\nlng: {lng},\nnum_nodes: {num_nodes},\npoly_coords: {polygon_coordinates},\npoly_area: {polygon_area},\npoly_ndensity: {polygon_ndensity}')
# print(f"lat: {type(json.dumps(lat))}")
# print(f"lng: {type(json.dumps(lng))}")
# print(f"num_nodes: {type(num_nodes)}")
# print(f"polyCoords: {type(json.dumps(polygon_coordinates))}")
# print(f"polyArea: {type(polygon_area)}")
# print(f"polyNdensity: {type(polygon_ndensity)}")
