const CharacterView = require('./character-view');
const PCView = require('./pc-view');
const GuideArrow = require('./guide-arrow');
const TargetArrow = require('./target-arrow');
const TownView = require('./town-view');
const GameViewCamera = require('./game-view-camera');
const DemoDrone = require('./demo-drone');

class GameView {
  constructor(config, textures, pixiApp, width, height) {
    this.config = config;
    this.textures = textures;
    this.pixiApp = pixiApp;

    this.townView = new TownView(this.config, this.textures);
    this.camera = new GameViewCamera(this.townView.display, width, height);
    this.demoDrone = new DemoDrone();
    this.demoDrone.setPosition(this.townView.width / 2, this.townView.height / 2);

    this.npcViews = {};
    this.remotePcViews = {};
    this.pcView = null;
    this.guideArrow = null;
    this.targetArrow = null;
    this.showHitbox = false;
  }

  getDisplay() {
    return this.camera.display;
  }

  isOnScreen(displayObject) {
    // Return true if the displayObject is within the PIXI viewport
    const bounds = displayObject.getBounds();
    return bounds.x + bounds.width >= 0
      && bounds.x <= this.pixiApp.renderer.width
      && bounds.y + bounds.height >= 0
      && bounds.y <= this.pixiApp.renderer.height;
  }

  addNpc(npc) {
    const view = new CharacterView(this.config, this.textures, npc, this.townView);
    this.townView.mainLayer.addChild(view.display);
    this.npcViews[npc.id] = view;
  }

  removeNpc(id) {
    const view = this.npcViews[id];
    if (view) {
      delete this.npcViews[id];
      view.destroy();
    }
  }

  removeAllNpcs() {
    Object.keys(this.npcViews).forEach((id) => {
      this.removeNpc(id);
    });
  }

  getNpcViewsInRect(rect) {
    return Object.values(this.npcViews)
      .filter((npc) => npc.inRect(rect));
  }

  getAllNpcViews() {
    return Object.values(this.npcViews);
  }

  getNpcView(id) {
    return this.npcViews[id];
  }

  addRemotePcView(pc) {
    const view = new PCView(this.config, this.textures, pc, this.townView);
    this.townView.mainLayer.addChild(view.display);
    this.remotePcViews[pc.id] = view;
  }

  removeRemotePcView(id) {
    const view = this.remotePcViews[id];
    if (view) {
      delete this.remotePcViews[id];
      view.destroy();
    }
  }

  addPc(pc) {
    this.pcView = new PCView(this.config, this.textures, pc, this.townView);
    this.townView.mainLayer.addChild(this.pcView.display);
    this.townView.bgLayer.addChild(this.pcView.hitboxDisplay);
    this.guideArrow = new GuideArrow(this.pcView);
  }

  removePc() {
    if (this.guideArrow) {
      this.guideArrow.destroy();
      this.guideArrow = null;
    }
    if (this.pcView) {
      this.pcView.destroy();
      this.pcView = null;
    }
  }

  getPcView() {
    return this.pcView;
  }

  updateGuideArrow() {
    if (this.guideArrow) {
      if (this.targetArrow && this.targetArrow.display && this.targetArrow.display.parent
        && this.targetArrow.visible
        && !this.isOnScreen(this.targetArrow.display)) {
        const targetArrow = {
          x: this.targetArrow.display.x + this.targetArrow.display.parent.x,
          y: this.targetArrow.display.y + this.targetArrow.display.parent.y,
        };
        const deltaX = targetArrow.x - this.pcView.display.x;
        const deltaY = targetArrow.y - this.pcView.display.y;
        const threshold = this.pcView.display.height;
        this.guideArrow.pointInDirection(
          Math.abs(deltaX) > threshold ? Math.sign(deltaX) : 0,
          Math.abs(deltaY) > threshold ? Math.sign(deltaY) : 0
        );
        this.guideArrow.show();
      } else {
        this.guideArrow.hide();
      }
    }
  }

  updateTargetArrow(target) {
    if (this.targetArrow !== null) {
      this.targetArrow.destroy();
      this.targetArrow = null;
    }
    if (target) {
      const targetNpc = this.getNpcView(target);
      if (targetNpc) {
        this.targetArrow = new TargetArrow(targetNpc);
      }
    }
  }

  hideDistractions() {
    this.targetArrow?.hide();
  }

  showDistractions() {
    this.targetArrow?.show();
  }

  cameraFollowPc() {
    if (this.pcView) {
      this.camera.setTarget(
        this.pcView.display,
        this.pcView.display.width / 2,
        -this.pcView.display.height * 0.8
      );
      this.demoDrone.active = false;
    }
  }

  cameraFollowDrone() {
    this.camera.setTarget(this.demoDrone);
    this.demoDrone.active = true;
  }

  resetDroneTargets() {
    this.demoDrone.setTargets(this.getAllNpcViews()
      .map((npcView) => ({
        x: npcView.display.x,
        y: npcView.display.y - npcView.display.height,
      })));
  }

  toggleHitboxDisplay() {
    this.showHitbox = !this.showHitbox;
  }

  handlePcAction() {
    if (this.showHitbox) {
      this.pcView.showActionHitbox();
    }
  }

  animate(time) {
    Object.values(this.remotePcViews).forEach((pcView) => {
      pcView.display.position = pcView.character.position;
      pcView.display.zIndex = pcView.character.position.y;
      pcView.animate(time);
    });

    if (this.pcView) {
      this.pcView.animate(time);
    }

    this.townView.mainLayer.sortChildren();
    this.demoDrone.animate(time);
    this.camera.update();
    this.updateGuideArrow();
  }
}

module.exports = GameView;
