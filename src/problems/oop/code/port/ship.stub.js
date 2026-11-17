class Ship {
  constructor(name, mode, manifest, cargo = []) {
    // mode is "unload" or "load" (throw an Error for anything else).
    // manifest is an array of container codes: keep a copy of your own.
    // cargo is an array of the Container objects on board when the ship arrives.
    this.name = name
  }

  remaining() {
    // The manifest codes still waiting to be moved, in manifest order:
    // an unloading ship's are the ones still on board, a loading ship's the ones not yet on.
  }

  done() {
    // true when nothing is waiting.
  }

  takeOff(code) {
    // Unloading ships only: remove that container from the ship and return it.
    // Throw an Error if it isn't waiting to come off.
  }

  putOn(container) {
    // Loading ships only: put the container on board.
    // Throw an Error if it isn't waiting to go on.
  }
}
