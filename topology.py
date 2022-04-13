import json
from typing import List, Dict  # for type hints


class Coordinate:
    def __init__(self, latitude: float, longitude: float) -> None:
        self.lat = latitude
        self.lng = longitude

    def toJson(self) -> str:
        """Returns a jsonified string of this coordinate object"""
        d = {"lat": self.lat, "lng": self.lng}
        return json.dumps(d)


class UE(Coordinate):
    def __init__(self, latitude: float, longitude: float) -> None:
        # eventually would have additional attributes (e.g. self.inPolygon (?))
        super().__init__(latitude, longitude)

    def toJSON(self) -> None:
        super().toJson()  # would have to change this if we add more params


class eNB(Coordinate):
    def __init__(self, latitude: float, longitude: float) -> None:
        # eventually would have additional attributes (e.g. self.orientation, etc.)
        super().__init__(latitude, longitude)

    def toJson(self) -> str:
        super().toJson()  # would have to change this if we add more params


class Polygon:
    def __init__(self, coordinates: List[Coordinate], area: float, ndensity: float):
        self.vertices = coordinates
        self.ndensity = ndensity
        self.area = area

    def toJson(self) -> str:
        d = {
            "vertices": [c.__dict__ for c in self.vertices],
            "ndensity": self.ndensity,
            "area": self.area
        }
        return json.dumps(d)


class Topology:
    def __init__(
        self, id: str, UEs: List[UE], eNBs: List[eNB], polygon: Polygon
    ) -> None:
        self.id = id
        self.ueList = UEs
        self.enbList = eNBs
        self.polygon = polygon  # [top left, top right, bottom right, bottom left]

    def toJson(self) -> str:
        """Returns a jsonified string of this topology object"""
        d = {  # If we want to add attributes, add them here and to __init__() above
            "id": self.id,
            "UEs": [c.__dict__ for c in self.ueList],  # List[Dict{lat: ..., lng: ...}]
            "eNBs": [c.__dict__ for c in self.enbList],
            "polygon": self.polygon.toJson(),
        }
        return json.dumps(d)  # jsonStr = t.toJson() -> jsonObj = json.loads(jsonStr)


def create_ue_list(positions: List[Dict]) -> List[UE]:
    return [UE(p["lat"], p["lng"]) for p in positions]


def create_enb_list(positions: List[Dict]) -> List[eNB]:
    return [eNB(p["lat"], p["lng"]) for p in positions]


def create_coordinates(positions: List[Dict]) -> List[Coordinate]:
    return [Coordinate(p["lat"], p["lng"]) for p in positions]


if __name__ == "__main__":
    pass
    # data = {
    #     "id": "test5",
    #     "coordinates": [
    #         {"lat": 42.88685194266933, "lng": -78.87848262998462},
    #         {"lat": 42.887748091118446, "lng": -78.87979154798388},
    #         {"lat": 42.88711921637623, "lng": -78.8768947622478},
    #         {"lat": 42.885830003111174, "lng": -78.87766723844409},
    #         {"lat": 42.88785814353915, "lng": -78.87792473050952},
    #         {"lat": 42.886584667804414, "lng": -78.88000612470508},
    #         {"lat": 42.88825118629604, "lng": -78.87876157972217},
    #         {"lat": 42.88559416850117, "lng": -78.87914781782031},
    #     ],
    #     "polyCoords": [
    #         {"lat": 42.8827, "lng": -78.8813},
    #         {"lat": 42.8895829844224, "lng": -78.88263037567138},
    #         {"lat": 42.889300000000006, "lng": -78.8747},
    #         {"lat": 42.8827, "lng": -78.8747},
    #     ],
    #     "stations": [
    #         {"lat": 42.883613122182396, "lng": -78.87837534162402},
    #         {"lat": 42.8841319737957, "lng": -78.87650852414966},
    #     ],
    #     "numStations": 2,
    #     "polyArea": 0.44385409187865144,
    #     "polyDensity": 18.023941079689717,
    # }
    # topology_id = data["id"]
    # ues = create_ue_list(data["coordinates"])
    # enbs = create_enb_list(data["stations"])
    # polygon_coordinates = create_coordinates(data["polyCoords"])
    # polygon_area = data["polyArea"]
    # polygon_ndensity = data["polyDensity"]

    # polygon = Polygon(polygon_coordinates, polygon_area, polygon_ndensity)
    # t = Topology("test5", ues, enbs, polygon)
    # print(t.toJson())

    # # c1 = Coordinate(42.887716647533615, -78.87863283368945)
    # c1 = UE(42.887716647533615, -78.87863283368945)
    # ues = [c1, c1]
    # enbs = [c1, c1, c1]
    # polygon = [c1, c1, c1, c1]
    # # print(type(c1.__dict__['lat']))
    # t1 = Topology(ues, enbs, polygon)
    # t1_json = t1.toJson()
    # # print("type: ", type(t1_json), "| t1_json: ", t1_json)
    # t2 = json.loads(t1_json)
    # print("ues: ", t2['UEs'])
    # print("enbs: ", t2['eNBs'])
    # print("polygon: ", t2['polygon'])
