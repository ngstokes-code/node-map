# Wireless Topology Creator

A visual tool for creating, mapping, and saving wireless topologies. This is a work in progress and much is planned for the project. In time, this tool will allow users to create, manage, and collect several types of wireless topologies with applications in: smart city planning and performance analysis, network optimization and simulation, and more.

***

## Table of Contents
[Installation](#installation)

[Usage](#usage)

[Roadmap](#planned-features)

[Contribute](#contribute)

[News / Changelog](#changelog)

***

## Installation

*Clone with git…*
``` bash
git clone [remote_url]
```

*If Flask is not installed…*
``` bash
pip install flask
```

*Run the code…*
``` bash
flask run
```

***

## Usage

* Map Controls...
    * **Ctrl + Scroll** to zoom in/out of the map
    * **Left click + Drag** to move around the map
    * **Left click** anywhere on the map to place a marker
    * **Drag polygon corners** to change the polygon's shape
    * Information regarding the map and its nodes is updated in real time
        * Current information displayed: Polygon area, Number of nodes inside the polygon, Node density
* Button Functionality...
    * **Make Polygon Movable** unlocks the polygon, allowing you to drag and move the polygon. Markers cannot be placed while the polygon is movable
    * **Make Polygon Stationary** locks the polygon in place, allowing markers to be placed again
    * **Clear All Markers** will remove all markers from the map
    * **Number of Random Nodes** allows you to enter a desired number of nodes to randomly place within the polygon
    * **Save Node Positions** incrementally saves the coordinates of nodes within the polygon to the database
    * **Show Database** displays currently saved node coordinates in a table
    * **Hide Database** will hide the table of node coordinates
    * **Wipe Database** will remove all node coordinates from the database
    * **Download Node Positions** allows you to download node coordinates as plain-text (.txt), comma separated values (.csv), or as a database (.db)

***

## Planned Features
* Creation of random topologies based on mathematical distributions
* Create topologies based on existing data in various formats
* Show additional statistics and information about the topology
* Load and edit previously created topologies
* Docker support to prevent issues regarding installation and running project code

To request a particular feature, please open an issue and describe the feature you'd like added to the project!

***

## Contribute
Pull requests are very much welcome, but for major changes, please open an issue first to detail exactly what you'd like to change. Additionally, please make sure to include tests as appropriate.

***

## Changelog
2021-09-03
* Basic project functionality (map and database controls) added to GitHub
* Project deployed online w/ Heroku for further testing

2021-09-05
* README added to project GitHub

***