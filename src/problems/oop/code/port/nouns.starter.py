# Step 1: no logic yet. Write the classes and the methods they need, with empty bodies (pass).
#
# Nouns become classes: Container, Yard, Ship, Crane, Port.
# Verbs become methods:
#   Yard:  add, take              (containers go into and come out of the yard)
#   Ship:  take_off, put_on, remaining
#   Crane: unload, load           (the crane does the moving)
#   Port:  arrive, process, depart


class Ship:
    manifest = []
