class DialogueOverlayConnection {
  constructor(inputManager, dialogueOverlay, dialogueSequencer) {
    this.inputManager = inputManager;
    this.dialogueOverlay = dialogueOverlay;
    this.dialogueSequencer = dialogueSequencer;

    this.handleUp = this.handleUp.bind(this);
    this.handleDown = this.handleDown.bind(this);
    this.handleAction = this.handleAction.bind(this);
  }

  route() {
    this.inputManager.events.on('down', this.handleDown);
    this.inputManager.events.on('up', this.handleUp);
    this.inputManager.events.on('action', this.handleAction);
  }

  unroute() {
    this.inputManager.events.off('down', this.handleDown);
    this.inputManager.events.off('up', this.handleUp);
    this.inputManager.events.off('action', this.handleAction);
  }

  handleDown() {
    this.dialogueOverlay.selectNextResponseOption();
  }

  handleUp() {
    this.dialogueOverlay.selectPreviousResponseOption();
  }

  handleAction() {
    this.dialogueSequencer.action();
  }
}

class PcMovementConnection {
  constructor(inputManager, playerApp) {
    this.inputManager = inputManager;
    this.playerApp = playerApp;
    this.handleAction = this.handleAction.bind(this);
  }

  route() {
    this.playerApp.enablePcControl();
    this.inputManager.events.on('action', this.handleAction);
  }

  unroute() {
    this.playerApp.disablePcControl();
    this.inputManager.events.off('action', this.handleAction);
  }

  handleAction() {
    this.playerApp.pcAction();
  }
}

class MenuConnection {
  constructor(inputManager, playerApp) {
    this.inputManager = inputManager;
    this.playerApp = playerApp;
    this.handleAction = this.handleAction.bind(this);
  }

  route() {
    this.inputManager.events.on('action', this.handleAction);
  }

  unroute() {
    this.inputManager.events.off('action', this.handleAction);
  }

  handleAction() {
    this.playerApp.menuAction();
  }
}

module.exports = {
  DialogueOverlayConnection,
  PcMovementConnection,
  MenuConnection,
};
