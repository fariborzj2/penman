import { Editor } from './core/Editor.js';

const penman = {
  init: (options) => {
    return new Editor(options);
  }
};

export default penman;
