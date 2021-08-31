from flask import Flask, send_file, json, jsonify, render_template, request # flask imports
import csv  # to convert database to a downloadable csv file
import sqlite3    # database library
# import matplotlib                      # to graph the database
# from matplotlib.figure import Figure   # more efficient graphing
# import matplotlib.pyplot as plt

app = Flask(__name__)
app.url_map.strict_slashes = False

@app.route('/')
def home():
   return render_template('index.html')

@app.route('/receiver', methods = ['GET', 'POST'])
def get_node_data():
    data = request.get_json(force = True)
    lat, lng = data[0], data[1] # list[float] of lat / lng coordinates
    # print(f'lat: {data[0]}, lng: {data[1]}')
    connection = sqlite3.connect('coords.db')
    cursor = connection.cursor()
    cursor.execute("CREATE TABLE IF NOT EXISTS coordinates(lat REAL, lng REAL)")
    
    for lat, lng in zip(lat, lng):
        cursor.execute("INSERT INTO coordinates VALUES ({}, {})".format(lat, lng))

    connection.commit()

    return "success"

@app.route('/tabulate_database')
def tabulate_database():
    connection = sqlite3.connect('coords.db')
    cursor = connection.cursor()
    cursor.execute("CREATE TABLE IF NOT EXISTS coordinates(lat REAL, lng REAL)")
    cursor.execute("SELECT * FROM coordinates") # asterisk (*) --> everything in the database
    results = cursor.fetchall() # list of tuple(lat, lng)
    
    # strings are immutable in python, instead we use a list to avoid changing an immutable string
    row_list = [] 
    for idx, coordinate in enumerate(results): # enumerate so we can display node #
        row =   """
            <tr>
                <th scope="row">{num}</th>
                <td>{lat}</td>
                <td>{lon}</td>
            </tr>
                """.format(num=(idx+1), lat=coordinate[0], lon=coordinate[1])
        row_list.append(row)

    div_text =  """
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
    
    return jsonify(div_text) # jsonify the div_text and send it back to the html page

@app.route('/drop_db')
def drop_table():
    print("dropping database table")
    connection = sqlite3.connect('coords.db')
    cursor = connection.cursor()
    cursor.execute("DROP TABLE IF EXISTS coordinates")
    connection.commit()
    # wipe database and return index.html render template
    return render_template('index.html')

@app.route('/download_db')
def download_db():
    return send_file('coords.db', as_attachment=True, download_name="node-positions.db")

@app.route('/download_txt')
def download_txt():
    # return send_file('coords.txt', as_attachment=True)
    connection = sqlite3.connect('coords.db')
    cursor = connection.cursor()
    cursor.execute("CREATE TABLE IF NOT EXISTS coordinates(lat REAL, lng REAL)")
    cursor.execute("SELECT * FROM coordinates") # asterisk (*) --> everything in the database
    results = cursor.fetchall() # list of tuple(lat, lng)
    
    # Write the coordinates to a text file. I could've looped over and written line by line but this is faster I think
    coords_to_string = '\n'.join(map(lambda i: str(i[0]) + ', ' + str(i[1]), results))
    file = open("node-positions.txt", "w+") # open (create) a writable file
    file.write(f"Latitude, Longitude\n{coords_to_string}") # write to the file
    file.close()

    return send_file('node-positions.txt', as_attachment=True)

@app.route('/download_csv')
def download_csv():
    connection = sqlite3.connect('coords.db')
    cursor = connection.cursor()
    cursor.execute("CREATE TABLE IF NOT EXISTS coordinates(lat REAL, lng REAL)")
    cursor.execute("SELECT * FROM coordinates") # asterisk (*) --> everything in the database
    results = cursor.fetchall() # list of tuple(lat, lng)

    with open('node-positions.csv', 'w') as f:
        writer = csv.writer(f, lineterminator='\n')
        # If you try to write a string, every character will be a different column. List -> every index is a column
        writer.writerow(['Latitude', 'Longitude'])
        for tup in results:
            writer.writerow(tup)

    return send_file('node-positions.csv', as_attachment=True)


if __name__ == '__main__':
    app.run(debug=True)