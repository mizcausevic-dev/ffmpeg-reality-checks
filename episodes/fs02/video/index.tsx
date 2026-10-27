import tl from './timeline.json';
import {Timeline} from '../../kit/Episode';
import {makeVerticalEpisode} from '../../kit/Vertical';
import {scenes} from './Scenes';
export {scenes};
export const timeline = tl as Timeline;
export const Episode = makeVerticalEpisode(timeline, scenes, 'SYNTHETIC TEST CLIP', {guides: false});
