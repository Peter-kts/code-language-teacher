# Please implement:
# You manage a port for container ships.
# A ship has a manifest specifying the containers to load or unload at your port.
# A cargo ship comes into port and only unloads containers into the container yard by crane.
# A cargo ship comes into port and only loads containers from the container yard by crane.
# All data is kept in memory: there is no database for this exercise.
#
# The tests use these names (an interviewer would agree them with you):
#   Container(code, weight)
#   Ship(name, mode, manifest, cargo=None)   mode is "unload" or "load"; manifest is a list of
#       codes; cargo is the list of Containers on board when it arrives. ship.remaining(), ship.done()
#   Port()   port.yard, port.crane, port.log (a list of lines), port.docked()
#       port.arrive(ship), port.process(name) -> how many containers moved, port.depart(name)
#   port.yard.add(container), port.yard.codes() -> codes in A to Z order
#   port.crane.moves -> how many containers the crane has moved
# Log lines: "Atlas arrived to unload", "unloaded C1 from Atlas", "loaded C1 onto Atlas", "Atlas departed".
# Refuse (raise an error, change nothing) anything that can't happen.


class Ship:
    manifest = []
