/* globals PIXI */

require('../helpers-web/fill-with-aspect');
const Stats = require('../helpers-web/stats');
const StorylineManager = require('../model/storyline-manager');
const FlagStore = require('../dialogues/flag-store');
const QuestTracker = require('../model/quest-tracker');
const TownView = require('../views/town-view');
const PCView = require('../views/pc-view');
const CharacterView = require('../views/character-view');
const Character = require('../model/character');
const KeyboardInputMgr = require('../input/keyboard-input-mgr');
const MapMarker = require('../views/map-marker');

class MapApp {
  constructor(config, textures) {
    this.config = config;
    this.textures = textures;

    // Game logic
    this.flags = new FlagStore();
    this.storylineManager = new StorylineManager(config);
    this.storylineManager.events.on('storylineChanged',
      this.handleStorylineChanged.bind(this));
    window.setStoryline = this.storylineManager.setCurrentStoryline.bind(this.storylineManager);

    this.questTracker = new QuestTracker(config, this.storylineManager, this.flags);
    this.questMarkers = {};

    this.questTracker.events.on('questActive', () => {
      this.updateQuestMarkers();
    });
    this.questTracker.events.on('questDone', () => {
      this.updateQuestMarkers();
    });

    this.pcs = {};
    this.pcViews = {};
    this.npcViews = {};

    // HTML elements
    this.$element = $('<div></div>')
      .addClass('map-app');

    this.$pixiWrapper = $('<div></div>')
      .addClass('pixi-wrapper')
      .appendTo(this.$element);

    // PIXI
    this.pixiApp = new PIXI.Application({
      width: MapApp.APP_WIDTH,
      height: MapApp.APP_HEIGHT,
      backgroundColor: 0xffffff,
    });
    this.$pixiWrapper.append(this.pixiApp.view);

    this.camera = new PIXI.Container();
    this.pixiApp.stage.addChild(this.camera);
    this.townView = new TownView(this.config, this.textures);
    this.camera.addChild(this.townView.display);

    this.camera.width = MapApp.APP_WIDTH;
    this.camera.height = MapApp.APP_HEIGHT;

    // HTML Overlays
    this.stats = new Stats();
    this.$element.append(this.stats.dom);

    // Input
    this.keyboardInputMgr = new KeyboardInputMgr();
    this.keyboardInputMgr.attachListeners();
    this.keyboardInputMgr.addToggle('KeyD', () => { this.stats.togglePanel(); });

    // Game loop
    this.pixiApp.ticker.add((time) => {
      this.stats.frameBegin();

      Object.entries(this.pcViews).forEach(([, pcView]) => {
        pcView.display.position = pcView.character.position;
        pcView.display.zIndex = pcView.character.position.y;
        pcView.animate(time);
      });
      this.townView.mainLayer.sortChildren();

      this.stats.frameEnd();
    });

    // Temporary
    this.storylineManager.setCurrentStoryline('touristen');
  }

  resize() {
    this.$element.fillWithAspect(MapApp.APP_WIDTH / MapApp.APP_HEIGHT);
    this.$element.css('font-size', `${(this.$element.width() * MapApp.FONT_RATIO).toFixed(3)}px`);
  }

  handleStorylineChanged() {
    this.clearNpcs();
    Object.entries(this.storylineManager.getNpcs()).forEach(([id, props]) => {
      this.addNpc(new Character(id, props));
    });
    this.updateQuestMarkers();
  }

  addPc(id) {
    const pc = new Character(id, this.config.players[id]);
    this.pcs[id] = pc;

    const view = new PCView(this.config, this.textures, pc, this.townView);
    this.pcViews[id] = view;
    this.townView.mainLayer.addChild(view.display);

    this.addMarker(view, `player-${id}`);
  }

  removePc(id) {
    if (this.pcViews[id]) {
      this.townView.mainLayer.removeChild(this.pcViews[id].display);
      delete this.pcs[id];
      delete this.pcViews[id];
    }
  }

  addNpc(npc) {
    const view = new CharacterView(this.config, this.textures, npc, this.townView);
    this.npcViews[npc.id] = view;
    this.townView.mainLayer.addChild(view.display);
  }

  removeNpc(id) {
    if (this.npcViews[id]) {
      this.townView.mainLayer.removeChild(this.npcViews[id].display);
      delete this.npcViews[id];
    }
  }

  clearNpcs() {
    Object.values(this.npcViews).forEach((npcView) => {
      this.townView.mainLayer.removeChild(npcView.display);
    });
    this.npcViews = [];
  }

  addMarker(character, icon) {
    const marker = new MapMarker(
      this.textures['map-markers'].textures['pin-marker'],
      this.textures.icons.textures[`icon-${icon}`], { x: 0.5, y: 1 }
    );
    marker.setScale(this.townView.display.width / MapApp.APP_WIDTH);
    character.addAttachment('map-marker', marker);
    character.display.addChild(marker.display);
    marker.setPosition(0, -character.display.height);
    marker.popper.show();
  }

  // eslint-disable-next-line class-methods-use-this
  removeMarker(character, onComplete = () => {}) {
    const marker = character.getAttachment('map-marker');
    if (marker) {
      marker.hide(() => {
        character.removeAttachment('map-marker');
        onComplete();
      });
    } else {
      onComplete();
    }
  }

  updateQuestMarkers() {
    const npcsWithQuests = this.questTracker.getNpcsWithQuests();
    Object.values(this.npcViews).forEach((npcView) => {
      const npcId = npcView.character.id;
      if (Object.keys(npcsWithQuests).includes(npcId)) {
        const questIcon = npcsWithQuests[npcView.character.id];
        if (this.questMarkers[npcId] === undefined) {
          this.addMarker(npcView, questIcon);
        } else if (this.questMarkers[npcId] !== questIcon) {
          this.removeMarker(npcView, () => {
            this.addMarker(npcView, questIcon);
          });
        }
        this.questMarkers[npcId] = questIcon;
      } else if (this.questMarkers[npcId]) {
        delete this.questMarkers[npcId];
        this.removeMarker(npcView);
      }
    });
  }
}

MapApp.APP_WIDTH = 1920;
MapApp.APP_HEIGHT = 1080;
MapApp.FONT_RATIO = 0.0175; // 1.75% of the width of the app

module.exports = MapApp;