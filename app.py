from topology import (
    Topology,
    Polygon,
    create_ue_list,
    create_enb_list,
    create_coordinates,
)
from typing import List, Tuple, Dict
from flask import (
    Flask,
    send_file,
    json,
    jsonify,
    render_template,
    request,
    make_response,
)
import csv  # to read / write csv files
import sqlite3


app = Flask(__name__)
# app.secret_key = 'asdjp12319c0asdklanc'

app.config["UPLOAD_FOLDER"] = "static/uploads"
ALLOWED_EXTENSIONS = {"txt", "csv"}

# If you want to use functions within jinja templating, define them here
@app.context_processor
def utility_processor():
    def myround(num: float, decimals: int):
        return round(num, decimals)

    return dict(myround=myround)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/load_error")
def load_error(error):
    return render_template("index.html", error=error)


@app.route("/receiver", methods=["GET", "POST"])
def get_node_data():
    if request.method == "POST":
        data = request.get_json(force=True)
        drop_table()  # don't want to incrementally add nodes to database
        lat, lng = data[0], data[1]  # list[float] of lat / lng coordinates
        connection = sqlite3.connect("coords.db")
        cursor = connection.cursor()
        cursor.execute("CREATE TABLE IF NOT EXISTS coordinates(lat REAL, lng REAL)")

        for lat, lng in zip(lat, lng):
            cursor.execute("INSERT INTO coordinates VALUES ({}, {})".format(lat, lng))

        connection.commit()

    return "200 OK"


@app.route("/tabulate_database", methods=["GET", "POST"])
def tabulate_database():
    connection = sqlite3.connect("coords.db")
    cursor = connection.cursor()
    cursor.execute("CREATE TABLE IF NOT EXISTS coordinates(lat REAL, lng REAL)")
    cursor.execute("SELECT * FROM coordinates")  # grab entire db
    results = cursor.fetchall()  # list of tuple(lat, lng)
    return render_template("index.html", db_table_info=results)


@app.route("/drop_db")
def drop_table():
    connection = sqlite3.connect("coords.db")
    cursor = connection.cursor()
    cursor.execute("DROP TABLE IF EXISTS coordinates")
    connection.commit()
    return "200 OK"  # wipe database and return success


@app.route("/download_db")
def download_db():
    return send_file("coords.db", as_attachment=True, download_name="node-positions.db")


@app.route("/download_txt")
def download_txt():
    # return send_file('coords.txt', as_attachment=True)
    connection = sqlite3.connect("coords.db")
    cursor = connection.cursor()
    cursor.execute("CREATE TABLE IF NOT EXISTS coordinates(lat REAL, lng REAL)")
    # asterisk (*) --> everything in the database
    cursor.execute("SELECT * FROM coordinates")
    results = cursor.fetchall()  # list of tuple(lat, lng)

    # Write the coordinates to a text file. I could've looped over and written line by line but this is faster I think
    coords_to_string = "\n".join(map(lambda i: str(i[0]) + ", " + str(i[1]), results))
    file = open("node-positions.txt", "w+")  # open (create) a writable file
    file.write(f"Latitude, Longitude\n{coords_to_string}")  # write to the file
    file.close()

    return send_file("node-positions.txt", as_attachment=True)


@app.route("/download_csv")
def download_csv():
    connection = sqlite3.connect("coords.db")
    cursor = connection.cursor()
    cursor.execute("CREATE TABLE IF NOT EXISTS coordinates(lat REAL, lng REAL)")
    # asterisk (*) --> everything in the database
    cursor.execute("SELECT * FROM coordinates")
    results = cursor.fetchall()  # list of tuple(lat, lng)

    with open("node-positions.csv", "w") as f:
        writer = csv.writer(f, lineterminator="\n")
        # If you try to write a string, every character will be a different column. List -> every index is a column
        writer.writerow(["Latitude", "Longitude"])
        for tup in results:
            writer.writerow(tup)

    return send_file("node-positions.csv", as_attachment=True)


@app.route("/saveTopologyData", methods=["POST"])
def req_save_topology_data():  # called when user wants to SAVE topology data
    error = ""
    data = request.get_json(force=True)
    topology_id = data["id"]  # Must check validity of 'topology_id'...
    # Invalid ID submitted by user, returning here before DB insert
    if not topology_id.isalnum():
        error = "invalid ID (alphanumeric characters only)"
        return error

    return save_topology(data)  # inserts data and return error msg (blank if no errors)


def save_topology(data: dict):
    topology_id = data["id"]
    ue_list = create_ue_list(data["coordinates"])
    enb_list = create_enb_list(data["stations"])
    polygon_coordinates = create_coordinates(data["polyCoords"])
    polygon_area = data["polyArea"]
    polygon_ndensity = data["polyDensity"]

    polygon = Polygon(polygon_coordinates, polygon_area, polygon_ndensity)
    topology = Topology(topology_id, ue_list, enb_list, polygon)

    connection = sqlite3.connect("topologies.db")
    cursor = connection.cursor()
    create_table = """CREATE TABLE IF NOT EXISTS topologies(
            id TEXT PRIMARY KEY, 
            topology LONGBLOB)"""  # LONGBLOB -> up to 4gb
    cursor.execute(create_table)

    check_id = "SELECT id FROM topologies WHERE id=( ? )"
    cursor.execute(check_id, (topology_id,))  # prepared statements -> no SQL injection
    entry = cursor.fetchall()
    if bool(entry):  # list not empty --> database found existing ID
        return "ID already taken"  # return the error msg

    print("Inserting into database")
    insert = "INSERT INTO topologies (id, topology) VALUES (?, ?)"
    cursor.execute(insert, (topology_id, topology.toJson()))
    connection.commit()  # save changes

    return ""  # no error, return empty str


@app.route("/loadTopologyData", methods=["POST"])
def req_load_topology_data():
    data = request.get_json(force=True)
    topology_id = data["id"]  # Must check validity of 'topology_id'...
    if (
        not topology_id.isalnum()
    ):  # Invalid ID submitted by user, returning here before DB insert
        # 400 BAD REQUEST
        return make_response(("Invalid ID (alphanumeric characters only)", 400))
    # tuple(error, data) containing data if there is no error
    entry = load_topology(topology_id)
    if entry == None:
        return make_response(("ID does not exist", 404))  # 404 NOT FOUND
    return json.dumps(entry)


def load_topology(topology_id: str):  # return entry w/ given ID from database
    # table name = database name (not required, just simpler)
    connection = sqlite3.connect("topologies.db")
    cursor = connection.cursor()

    create_table = """CREATE TABLE IF NOT EXISTS topologies(
        id TEXT PRIMARY KEY, 
        topology LONGBLOB)"""  # LONGBLOB -> up to 4gb
    cursor.execute(create_table)

    check_id = "SELECT * FROM topologies WHERE id=( ? )"
    cursor.execute(check_id, (topology_id,))  # prepared statements -> no SQL injection
    entry = cursor.fetchall()
    if bool(entry):  # entry found
        topology_id, topology = entry[0]
        data = {"id": topology_id, "topology": topology}
        return data
    return None  # entry not present


@app.route("/tabulate_topologies", methods=["GET", "POST"])
def tabulate_topologies():
    connection = sqlite3.connect("topologies.db")
    cursor = connection.cursor()
    cursor.execute(
        "CREATE TABLE IF NOT EXISTS topologies(id TEXT PRIMARY KEY, topology LONGBLOB)"
    )
    cursor.execute("SELECT * FROM topologies")
    results = cursor.fetchall()
    topology_summaries = generate_table(results)
    return jsonify(topology_summaries)


def generate_table(results: List[Tuple]) -> str:
    lines = [  # str's immutable, use list(str) for now
        """<button onclick="hideTable()" type="button" id="show-topologies-button" 
            class="btn btn-outline-danger">Hide Table</button>""",
        """
        <table class="table table-striped table-dark">
            <thead>
                <tr>
                    <th scope="col"></th>
                    <th scope="col">ID</th>
                    <th scope="col">Node Count</th>
                    <th scope="col">Antenna Count</th>
                    <th scope="col">Polygon Area</th>
                    <th scope="col">Node Density</th>
                </tr>
            </thead>
            <tbody>
        """,
    ]
    for idx, (t_id, topology) in enumerate(results):
        t = json.loads(topology)
        polygon = json.loads(t["polygon"])
        lines.append(
            f"""
                <tr>
                    <th scope="row">{idx+1}</th>
                    <td>{t_id}</td> <!-- name -->
                    <td>{len(t['UEs'])}</td> <!-- num_nodes -->
                    <td>{len(t['eNBs'])}</td> <!-- num_basestations -->
                    <td>{round(polygon['area'], 4)} km&sup2;</td> <!-- polygon area -->
                    <td>{round(polygon['ndensity'], 4)} nodes/km&sup2;</td> <!-- polygon density -->
                </tr>
        """
        )

    lines.append(
        """
            </tbody>
        </table>
    """
    )
    return "".join(lines)


def print_topology_db():  # call this to print the topologies database
    connection = sqlite3.connect("topologies.db")
    cursor = connection.cursor()

    create_table = """CREATE TABLE IF NOT EXISTS topologies(
        id TEXT PRIMARY KEY, 
        topology LONGBLOB)"""
    cursor.execute(create_table)

    cursor.execute("SELECT * FROM topologies")
    results = cursor.fetchall()
    print(results)


if __name__ == "__main__":
    app.run(debug=True)