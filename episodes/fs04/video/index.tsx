import tl from './timeline.json';
import {makeVerticalEpisode} from '../../kit/Vertical';
import type {Timeline} from '../../kit/Episode';
import {scenes} from './Scenes';
export {scenes};
export const timeline = tl as Timeline;
export const Episode = makeVerticalEpisode(timeline, scenes, 'SYNTHETIC TEST CLIP', {guides: false});
