import React from 'react';
import {C, F} from '../../kit/theme';
import {ep, eio, prog, blink} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/*
 * Production style: cinematic screen demo. A plain flat window (no window buttons) with a file tree and a terminal, a slow push-in,
 * commands typed live, the failing line in madder, and the results pinned beside the window on index cards.
 * Every pixel crop below is a piece of a real frame read by episodes/ff73/fixture (gray values minus the background level 16, run length coded).
 * Every number is in evidence.json from fixture/run.mjs. ffmpeg 6.1.1.
 */

const FR: Record<string, {w: number; h: number; ink: number; d: string}> = {
  blank: {w: 120, h: 48, ink: 0, d: '00x5760'},
  pctok: {w: 120, h: 48, ink: 1224, d: '00x512,39x1,8ax1,b7x1,cfx1,d0x1,b9x1,8fx1,3ex1,01x1,00x15,39x1,8ax1,b7x1,cfx1,d0x1,b9x1,8fx1,3ex1,01x1,00x60,16x1,38x1,59x1,7bx1,9cx1,bex1,dax1,dbx3,45x1,00x14,14x1,a0x1,dbx8,a8x1,19x1,00x12,14x1,a0x1,dbx8,a8x1,19x1,00x58,29x1,dbx10,45x1,00x13,14x1,c3x1,dbx10,c9x1,1ax1,00x10,14x1,c3x1,dbx10,c9x1,1ax1,00x8,18x1,7ax1,bax1,d5x1,cfx1,a9x1,5bx1,06x1,00x41,29x1,dbx10,45x1,00x12,03x1,a9x1,dbx3,b8x1,46x1,11x1,0ex1,40x1,b0x1,dbx3,b2x1,06x1,00x8,03x1,a9x1,dbx3,b8x1,46x1,11x1,0ex1,40x1,b0x1,dbx3,b2x1,06x1,00x6,43x1,d0x1,dbx6,b5x1,1bx1,00x40,28x1,c5x1,a4x1,83x1,61x1,3fx1,1ex1,85x1,dbx3,45x1,00x12,52x1,dbx3,b4x1,0ex1,00x4,09x1,a9x1,dbx3,60x1,00x8,52x1,dbx3,b4x1,0ex1,00x4,09x1,a9x1,dbx3,60x1,00x5,32x1,d6x1,dbx8,bcx1,0cx1,00x46,83x1,dbx3,45x1,00x11,01x1,bcx1,dbx3,2cx1,00x6,20x1,d6x1,dbx2,c5x1,06x1,00x6,01x1,bcx1,dbx3,2cx1,00x6,20x1,d6x1,dbx2,c5x1,06x1,00x4,b0x1,dbx2,abx1,3ax1,0dx1,16x1,51x1,c3x1,dbx2,72x1,00x46,83x1,dbx3,45x1,00x11,34x1,dbx3,a1x1,00x8,90x1,dbx3,42x1,00x6,34x1,dbx3,a1x1,00x8,90x1,dbx3,42x1,00x3,22x1,dbx2,a8x1,04x1,00x4,16x1,cbx1,dbx1,c5x1,00x46,83x1,dbx3,45x1,00x11,74x1,dbx3,54x1,00x8,44x1,dbx3,83x1,00x6,74x1,dbx3,54x1,00x8,44x1,dbx3,83x1,00x3,45x1,dbx2,4dx1,00x6,82x1,dbx2,0fx1,00x45,83x1,dbx3,45x1,00x11,afx1,dbx3,20x1,00x8,10x1,dbx3,bfx1,00x6,afx1,dbx3,20x1,00x8,10x1,dbx3,bfx1,00x3,45x1,dbx2,4cx1,00x6,82x1,dbx2,10x1,00x45,83x1,dbx3,45x1,00x11,d2x1,dbx2,cfx1,00x10,c0x1,dbx3,07x1,00x5,d2x1,dbx2,cfx1,00x10,c0x1,dbx3,07x1,00x2,24x1,dbx2,a3x1,02x1,00x4,16x1,cbx1,dbx1,c8x1,00x46,83x1,dbx3,45x1,00x10,18x1,dbx3,b4x1,00x10,a4x1,dbx3,27x1,00x4,18x1,dbx3,b4x1,00x10,a4x1,dbx3,27x1,00x3,b2x1,dbx2,a5x1,36x1,0cx1,15x1,50x1,c3x1,dbx2,7bx1,00x7,1ax1,7ex1,25x1,00x36,83x1,dbx3,45x1,00x10,35x1,dbx3,9cx1,00x10,8dx1,dbx3,45x1,00x4,35x1,dbx3,9cx1,00x10,8dx1,dbx3,45x1,00x3,34x1,d7x1,dbx8,c0x1,0fx1,00x5,25x1,8cx1,d8x1,dbx1,86x1,00x36,83x1,dbx3,45x1,00x10,42x1,dbx3,8bx1,00x10,7bx1,dbx3,51x1,00x4,42x1,dbx3,8bx1,00x10,7bx1,dbx3,51x1,00x4,45x1,d2x1,dbx6,bax1,1fx1,00x4,32x1,99x1,dbx2,d7x1,8ax1,23x1,00x36,83x1,dbx3,45x1,00x10,4bx1,dbx3,84x1,00x2,03x1,7bx1,cbx1,ccx1,83x1,06x1,00x2,75x1,dbx3,5bx1,00x4,4bx1,dbx3,84x1,00x2,03x1,7bx1,cbx1,ccx1,83x1,06x1,00x2,75x1,dbx3,5bx1,00x5,19x1,7cx1,bbx1,d5x1,d1x1,adx1,62x1,08x1,00x3,3fx1,a6x1,dbx2,d3x1,7dx1,19x1,00x38,83x1,dbx3,45x1,00x10,54x1,dbx3,7ex1,00x2,5cx1,dbx4,70x1,00x2,6ex1,dbx3,64x1,00x4,54x1,dbx3,7ex1,00x2,5cx1,dbx4,70x1,00x2,6ex1,dbx3,64x1,00x13,02x1,4bx1,b3x1,dbx2,cdx1,71x1,11x1,00x40,83x1,dbx3,45x1,00x10,55x1,dbx3,7ex1,00x2,5fx1,dbx4,71x1,00x2,6dx1,dbx3,65x1,00x4,55x1,dbx3,7ex1,00x2,5fx1,dbx4,71x1,00x2,6dx1,dbx3,65x1,00x11,06x1,59x1,bex1,dbx2,c5x1,64x1,0ax1,00x42,83x1,dbx3,45x1,00x10,4bx1,dbx3,84x1,00x2,05x1,83x1,cdx2,85x1,07x1,00x2,75x1,dbx3,5bx1,00x4,4bx1,dbx3,84x1,00x2,05x1,83x1,cdx2,85x1,07x1,00x2,75x1,dbx3,5bx1,00x9,0cx1,66x1,c7x1,dbx2,bcx1,57x1,05x1,00x44,83x1,dbx3,45x1,00x10,42x1,dbx3,8bx1,00x10,7bx1,dbx3,51x1,00x4,42x1,dbx3,8bx1,00x10,7bx1,dbx3,51x1,00x7,13x1,73x1,cex1,dbx2,b1x1,4ax1,01x1,00x46,83x1,dbx3,45x1,00x10,35x1,dbx3,9cx1,00x10,8dx1,dbx3,45x1,00x4,35x1,dbx3,9cx1,00x10,8dx1,dbx3,45x1,00x5,1cx1,81x1,d5x1,dbx2,a5x1,3dx1,00x3,06x1,5ex1,aax1,cex1,d5x1,b8x1,74x1,13x1,00x38,83x1,dbx3,45x1,00x10,18x1,dbx3,b4x1,00x10,a3x1,dbx3,27x1,00x4,18x1,dbx3,b4x1,00x10,a3x1,dbx3,27x1,00x3,13x1,8ex1,d9x1,dbx2,98x1,30x1,00x4,1ax1,b5x1,dbx6,cex1,3dx1,00x37,83x1,dbx3,45x1,00x11,d3x1,dbx2,cfx1,00x10,c0x1,dbx3,08x1,00x5,d3x1,dbx2,cfx1,00x10,c0x1,dbx3,08x1,00x3,0ex1,d6x1,d8x1,8bx1,24x1,00x5,0ax1,b9x1,dbx8,d5x1,2cx1,00x36,83x1,dbx3,45x1,00x11,afx1,dbx3,20x1,00x8,10x1,dbx3,bfx1,00x6,afx1,dbx3,20x1,00x8,10x1,dbx3,bfx1,00x5,54x1,1ax1,00x7,6bx1,dbx2,c4x1,52x1,16x1,0cx1,37x1,a8x1,dbx2,afx1,00x36,83x1,dbx3,45x1,00x11,74x1,dbx3,54x1,00x8,44x1,dbx3,83x1,00x6,74x1,dbx3,54x1,00x8,44x1,dbx3,83x1,00x14,bax1,dbx1,d1x1,1ax1,00x4,02x1,a2x1,dbx2,29x1,00x35,83x1,dbx3,45x1,00x11,34x1,dbx3,a1x1,00x8,90x1,dbx3,43x1,00x6,34x1,dbx3,a1x1,00x8,90x1,dbx3,43x1,00x13,02x1,dax1,dbx1,91x1,00x6,45x1,dbx2,53x1,00x35,83x1,dbx3,45x1,00x11,02x1,bcx1,dbx3,2cx1,00x6,1fx1,d6x1,dbx2,c6x1,06x1,00x6,02x1,bcx1,dbx3,2cx1,00x6,1fx1,d6x1,dbx2,c6x1,06x1,00x13,02x1,dax1,dbx1,91x1,00x6,43x1,dbx2,55x1,00x35,83x1,dbx3,45x1,00x12,52x1,dbx3,b3x1,0dx1,00x4,08x1,a8x1,dbx3,60x1,00x8,52x1,dbx3,b3x1,0dx1,00x4,08x1,a8x1,dbx3,60x1,00x15,bcx1,dbx1,d0x1,19x1,00x4,01x1,9ex1,dbx2,31x1,00x35,83x1,dbx3,45x1,00x12,03x1,a9x1,dbx3,b7x1,45x1,10x1,0dx1,3fx1,b0x1,dbx3,b3x1,06x1,00x8,03x1,a9x1,dbx3,b7x1,45x1,10x1,0dx1,3fx1,b0x1,dbx3,b3x1,06x1,00x15,6fx1,dbx2,c4x1,51x1,15x1,0bx1,35x1,a3x1,dbx2,bcx1,01x1,00x29,9ex1,dbx15,52x1,00x7,14x1,c3x1,dbx10,c9x1,1bx1,00x10,14x1,c3x1,dbx10,c9x1,1bx1,00x16,0cx1,bcx1,dbx8,d8x1,38x1,00x30,9ex1,dbx15,52x1,00x8,14x1,a1x1,dbx8,a9x1,19x1,00x12,14x1,a1x1,dbx8,a9x1,19x1,00x18,1ex1,b9x1,dbx6,d2x1,47x1,00x31,9ex1,dbx15,52x1,00x10,3ax1,8bx1,b8x1,d0x1,d1x1,bax1,90x1,3fx1,02x1,00x15,3ax1,8bx1,b8x1,d0x1,d1x1,bax1,90x1,3fx1,02x1,00x20,07x1,61x1,acx1,d0x1,d5x1,bcx1,7dx1,1ax1,00x1707'},
  colonbad: {w: 120, h: 48, ink: 433, d: '00x606,01x1,69x1,d9x1,dbx3,a4x1,00x11,31x1,7bx1,b2x1,cax1,d7x1,c6x1,a9x1,6ex1,1dx1,00x92,14x1,a1x1,dbx5,a4x1,00x9,1bx1,a2x1,dbx8,d8x1,83x1,09x1,00x89,3bx1,c8x1,dbx6,a4x1,00x8,30x1,cdx1,dbx11,b7x1,12x1,00x86,03x1,73x1,dbx4,a1x1,d0x1,dbx2,a4x1,00x7,1ax1,cax1,dbx3,c7x1,77x1,51x1,3dx1,5cx1,8ax1,d8x1,dbx3,abx1,02x1,00x84,09x1,a9x1,dbx3,d9x1,69x1,01x1,c7x1,dbx2,a4x1,00x7,92x1,dbx3,8cx1,0dx1,00x5,22x1,b1x1,dbx3,59x1,00x84,1ax1,dbx3,c2x1,32x1,00x2,c7x1,dbx2,a4x1,00x6,19x1,dbx3,b2x1,03x1,00x7,1ax1,cdx1,dbx2,b7x1,00x84,1ax1,dbx2,99x1,0fx1,00x3,c7x1,dbx2,a4x1,00x6,5cx1,dbx3,3cx1,00x9,77x1,dbx3,19x1,00x83,1ax1,d6x1,60x1,00x5,c7x1,dbx2,a4x1,00x6,7dx1,dbx3,0fx1,00x9,4ax1,dbx3,34x1,00x83,10x1,2cx1,00x6,c7x1,dbx2,a4x1,00x6,4bx1,74x2,6dx1,00x10,3fx1,dbx3,32x1,00x91,c7x1,dbx2,a4x1,00x20,64x1,dbx3,13x1,00x91,c7x1,dbx2,a4x1,00x20,b1x1,dbx2,bfx1,00x92,c7x1,dbx2,a4x1,00x19,46x1,dbx3,5ex1,00x92,c7x1,dbx2,a4x1,00x18,16x1,c8x1,dbx2,cax1,0ax1,00x92,c7x1,dbx2,a4x1,00x17,05x1,a9x1,dbx3,4ax1,00x93,c7x1,dbx2,a4x1,00x16,01x1,90x1,dbx3,83x1,00x94,c7x1,dbx2,a4x1,00x16,7ex1,dbx3,a9x1,06x1,00x94,c7x1,dbx2,a4x1,00x15,6fx1,dbx3,bcx1,10x1,00x95,c7x1,dbx2,a4x1,00x14,62x1,dbx3,c4x1,1cx1,00x96,c7x1,dbx2,a4x1,00x13,56x1,dbx3,cax1,23x1,00x97,c7x1,dbx2,a4x1,00x12,4ax1,dax1,dbx2,cex1,2bx1,00x98,c7x1,dbx2,a4x1,00x11,3fx1,d7x1,dbx2,d1x1,31x1,00x99,c7x1,dbx2,a4x1,00x10,35x1,d4x1,dbx2,d4x1,38x1,00x100,c7x1,dbx2,a4x1,00x9,2cx1,cfx1,dbx2,d6x1,3fx1,00x101,c7x1,dbx2,a4x1,00x8,24x1,cbx1,dbx2,d8x1,46x1,00x102,c7x1,dbx2,a4x1,00x7,1dx1,c5x1,dbx2,dax1,4ex1,00x103,c7x1,dbx2,a4x1,00x6,16x1,bfx1,dbx3,90x1,36x12,2ax1,00x91,c7x1,dbx2,a4x1,00x6,9ax1,dbx17,abx1,00x91,c7x1,dbx2,a4x1,00x6,a4x1,dbx17,abx1,00x91,c7x1,dbx2,a4x1,00x6,a4x1,dbx17,abx1,00x1762'},
  colonok: {w: 120, h: 48, ink: 1160, d: '00x509,04x1,3cx1,79x1,a5x1,c5x1,d4x2,c3x1,a2x1,6dx1,1dx1,00x35,03x1,27x1,52x1,78x1,9bx1,b6x1,ccx1,d7x1,d5x1,c5x1,a7x1,74x1,26x1,00x16,25x1,77x1,b1x1,c9x1,d5x1,bex1,9ex1,52x1,0ax1,00x12,16x1,38x1,59x1,7bx1,9cx1,bex1,dax1,dbx3,45x1,00x11,1ex1,7bx1,cex1,dbx9,d9x1,8ax1,0dx1,00x33,60x1,dbx12,9ax1,16x1,00x12,05x1,79x1,dbx8,c3x1,35x1,00x10,29x1,dbx10,45x1,00x11,afx1,dbx13,c1x1,1bx1,00x32,60x1,dbx13,cbx1,28x1,00x10,02x1,9ex1,dbx10,d9x1,42x1,00x9,29x1,dbx10,45x1,00x11,afx1,dbx2,dax1,9cx1,5ax1,25x1,0dx1,06x1,23x1,67x1,cbx1,dbx3,bcx1,0cx1,00x31,60x1,dbx2,b3x1,6ex1,3ex1,19x1,08x1,06x1,1fx1,59x1,bdx1,dbx3,c8x1,11x1,00x9,76x1,dbx3,cdx1,5fx1,19x1,09x1,2dx1,93x1,dbx3,cfx1,21x1,00x8,28x1,c5x1,a4x1,83x1,61x1,3fx1,1ex1,85x1,dbx3,45x1,00x11,afx1,dax1,86x1,20x1,00x7,19x1,c0x1,dbx3,76x1,00x31,57x1,81x1,22x1,00x8,0ax1,a6x1,dbx3,82x1,00x8,1ex1,d9x1,dbx2,d0x1,29x1,00x5,7bx1,dbx3,97x1,00x15,83x1,dbx3,45x1,00x11,83x1,2cx1,00x10,34x1,dbx3,d1x1,05x1,00x42,18x1,d5x1,dbx2,d1x1,06x1,00x7,87x1,dbx3,62x1,00x6,05x1,bbx1,dbx3,27x1,00x14,83x1,dbx3,45x1,00x24,b5x1,dbx3,39x1,00x43,9dx1,dbx3,33x1,00x6,06x1,d3x1,dbx2,d0x1,07x1,00x7,59x1,dbx3,79x1,00x14,83x1,dbx3,45x1,00x24,89x1,dbx3,57x1,00x43,7cx1,dbx3,4bx1,00x6,3dx1,dbx3,8bx1,00x8,10x1,d9x1,dbx2,bax1,00x14,83x1,dbx3,45x1,00x24,7dx1,dbx3,64x1,00x43,79x1,dbx3,4dx1,00x6,77x1,dbx3,58x1,00x9,b5x1,dbx3,19x1,00x13,83x1,dbx3,45x1,00x24,92x1,dbx3,4fx1,00x12,64x1,dbx4,67x1,00x25,9cx1,dbx3,32x1,00x6,9cx1,dbx3,2cx1,00x9,89x1,dbx3,3ex1,00x13,83x1,dbx3,45x1,00x24,c0x1,dbx3,2cx1,00x12,64x1,dbx4,67x1,00x24,1bx1,d5x1,dbx2,ccx1,06x1,00x6,bdx1,dbx3,0ex1,00x9,6dx1,dbx3,5ex1,00x13,83x1,dbx3,45x1,00x23,31x1,dbx3,c0x1,00x13,64x1,dbx4,67x1,00x23,11x1,afx1,dbx3,68x1,00x6,01x1,d8x1,dbx2,d4x1,00x10,56x1,dbx3,7cx1,00x13,83x1,dbx3,45x1,00x23,9fx1,dbx3,6bx1,00x13,64x1,dbx4,67x1,00x20,09x1,28x1,68x1,c8x1,dbx3,97x1,03x1,00x6,0bx1,dbx3,c2x1,00x10,44x1,dbx3,89x1,00x13,83x1,dbx3,45x1,00x22,4cx1,dbx3,c8x1,0cx1,00x13,64x1,dbx4,67x1,00x16,3ex1,dbx8,cfx1,69x1,02x1,00x7,14x1,dbx3,bcx1,00x3,54x1,c0x1,d1x1,9dx1,1bx1,00x2,3ex1,dbx3,92x1,00x13,83x1,dbx3,45x1,00x21,19x1,cdx1,dbx3,48x1,00x14,64x1,dbx4,67x1,00x16,3ex1,dbx7,a9x1,1fx1,00x9,1dx1,dbx3,b5x1,00x2,25x1,dbx4,a7x1,00x2,37x1,dbx3,9cx1,00x13,83x1,dbx3,45x1,00x20,06x1,acx1,dbx3,84x1,00x37,3ex1,dbx8,d5x1,7fx1,0cx1,00x7,1ex1,dbx3,b5x1,00x2,28x1,dbx4,a8x1,00x2,36x1,dbx3,9cx1,00x13,83x1,dbx3,45x1,00x20,8cx1,dbx3,aax1,06x1,00x41,0bx1,26x1,5ex1,bbx1,dbx3,bcx1,18x1,00x6,14x1,dbx3,bcx1,00x3,5cx1,c2x1,d2x1,a0x1,1ex1,00x2,3ex1,dbx3,92x1,00x13,83x1,dbx3,45x1,00x19,6fx1,dbx3,bex1,12x1,00x45,05x1,7fx1,dbx3,b2x1,04x1,00x5,0bx1,dbx3,c2x1,00x10,44x1,dbx3,89x1,00x13,83x1,dbx3,45x1,00x18,54x1,dbx3,cbx1,20x1,00x48,97x1,dbx3,58x1,00x5,01x1,d9x1,dbx2,d4x1,00x10,56x1,dbx3,7dx1,00x13,83x1,dbx3,45x1,00x17,3ex1,d8x1,dbx2,d4x1,31x1,00x49,25x1,dbx3,a9x1,00x6,bdx1,dbx3,0ex1,00x9,6cx1,dbx3,5ex1,00x13,83x1,dbx3,45x1,00x16,2cx1,d2x1,dbx2,d8x1,41x1,00x51,cax1,dbx2,d5x1,00x6,9cx1,dbx3,2bx1,00x9,89x1,dbx3,3ex1,00x13,83x1,dbx3,45x1,00x15,1fx1,c8x1,dbx3,52x1,00x52,bcx1,dbx3,0bx1,00x5,78x1,dbx3,58x1,00x9,b5x1,dbx3,19x1,00x13,83x1,dbx3,45x1,00x14,13x1,bdx1,dbx3,63x1,00x53,ccx1,dbx2,dax1,02x1,00x5,3dx1,dbx3,8bx1,00x8,0fx1,d9x1,dbx2,bax1,00x14,83x1,dbx3,45x1,00x13,0bx1,afx1,dbx3,74x1,00x53,27x1,dbx3,c4x1,00x6,06x1,d3x1,dbx2,cfx1,07x1,00x7,59x1,dbx3,7ax1,00x14,83x1,dbx3,45x1,00x12,05x1,a2x1,dbx3,84x1,00x23,64x1,dbx4,67x1,00x25,94x1,dbx3,87x1,00x7,87x1,dbx3,62x1,00x6,05x1,bax1,dbx3,28x1,00x14,83x1,dbx3,45x1,00x11,01x1,90x1,dbx3,92x1,01x1,00x23,64x1,dbx4,67x1,00x11,42x1,8ax1,29x1,00x9,04x1,79x1,dbx4,2ex1,00x7,1ex1,d9x1,dbx2,cfx1,28x1,00x5,7ax1,dbx3,97x1,00x15,83x1,dbx3,45x1,00x11,7ex1,dbx3,9fx1,05x1,00x24,64x1,dbx4,67x1,00x11,48x1,dbx2,b8x1,73x1,45x1,1ex1,0cx1,02x1,0cx1,2ax1,60x1,b9x1,dbx4,7fx1,00x9,76x1,dbx3,cdx1,5ex1,18x1,08x1,2cx1,92x1,dbx3,cfx1,21x1,00x9,9ex1,dbx15,52x1,00x4,06x1,dbx17,97x1,00x12,64x1,dbx4,67x1,00x11,48x1,dbx15,8dx1,02x1,00x9,02x1,9fx1,dbx10,dax1,43x1,00x10,9ex1,dbx15,52x1,00x4,06x1,dbx17,97x1,00x12,64x1,dbx4,67x1,00x11,48x1,dbx13,c5x1,51x1,00x12,05x1,7bx1,dbx8,c3x1,36x1,00x11,9ex1,dbx15,52x1,00x4,06x1,dbx17,97x1,00x12,64x1,dbx4,67x1,00x11,01x1,21x1,4ax1,72x1,9ax1,afx1,bcx1,cax1,d7x1,d5x1,c7x1,adx1,80x1,43x1,03x1,00x15,25x1,78x1,b2x1,cax1,d5x1,c0x1,9fx1,54x1,0ax1,00x1687'},
  aposbad: {w: 120, h: 48, ink: 601, d: '00x490,56x1,dbx3,2cx1,00x115,56x1,dbx3,2cx1,00x115,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x94,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x94,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x116,83x1,dbx3,00x116,83x1,dbx3,00x116,83x1,dbx3,00x19,0bx1,56x1,94x1,bdx1,cfx1,d8x1,cax1,bax1,a9x1,81x1,4dx1,19x1,00x58,dbx9,2cx1,00x11,60x1,dbx17,22x1,00x9,4ax1,cax1,dbx11,00x58,dbx9,2cx1,00x11,60x1,dbx17,22x1,00x8,51x1,dbx13,00x58,dbx9,2cx1,00x11,60x1,dbx17,22x1,00x7,13x1,d0x1,dbx2,dax1,83x1,35x1,0fx1,03x1,0dx1,26x1,59x1,a4x1,dbx2,00x63,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x16,61x1,dbx3,5cx1,00x8,25x1,9ex1,00x63,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x16,91x1,dbx2,d3x1,04x1,00x73,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x16,a3x1,dbx2,cax1,00x74,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x16,9ax1,dbx3,1bx1,00x73,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x16,70x1,dbx3,a7x1,14x1,00x72,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x16,1dx1,d7x1,dbx3,d7x1,9ax1,5cx1,2ax1,03x1,00x68,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x17,58x1,dbx7,d5x1,afx1,7bx1,31x1,00x65,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x18,3cx1,b5x1,dbx9,9fx1,13x1,00x63,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x20,30x1,6ex1,a1x1,ccx1,dbx6,bbx1,0cx1,00x62,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x24,22x1,62x1,b9x1,dbx4,78x1,00x62,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x26,02x1,6cx1,dbx3,c7x1,00x62,56x1,dbx3,2cx1,00x17,82x1,dbx3,00x28,a0x1,dbx3,0fx1,00x61,56x1,dbx3,2cx1,00x17,7ax1,dbx3,08x1,00x27,77x1,dbx3,13x1,00x61,56x1,dbx3,2cx1,00x17,6ax1,dbx3,28x1,00x27,9cx1,dbx2,d7x1,01x1,00x61,56x1,dbx3,2cx1,00x17,44x1,dbx3,78x1,00x15,96x1,58x1,08x1,00x8,40x1,dbx3,9ex1,00x62,56x1,dbx3,2cx1,00x17,0dx1,d4x1,dbx2,dax1,77x1,25x1,06x1,00x12,bax1,dbx1,d3x1,92x1,57x1,29x1,0fx1,02x1,0cx1,33x1,81x1,d8x1,dbx3,39x1,00x55,71x1,dbx17,48x1,00x11,7bx1,dbx10,22x1,00x7,bax1,dbx13,72x1,00x56,71x1,dbx17,48x1,00x11,06x1,95x1,dbx9,22x1,00x7,bax1,dbx11,cex1,56x1,00x57,71x1,dbx17,48x1,00x13,39x1,87x1,b5x1,cex1,d9x1,dbx4,22x1,00x7,11x1,41x1,6cx1,93x1,adx1,bdx1,cex1,d9x1,cfx1,bcx1,92x1,54x1,0bx1,00x1735'},
  aposok: {w: 120, h: 48, ink: 645, d: '00x490,56x1,dbx3,2cx1,00x115,56x1,dbx3,2cx1,00x43,97x1,dbx2,9ex1,00x68,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x22,97x1,dbx2,9ex1,00x68,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x22,97x1,dbx2,9ex1,00x68,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x22,97x1,dbx2,9ex1,00x90,83x1,dbx3,00x22,97x1,dbx2,9ex1,00x90,83x1,dbx3,00x22,97x1,dbx2,9ex1,00x90,83x1,dbx3,00x22,97x1,dbx2,9ex1,00x17,0bx1,56x1,94x1,bdx1,cfx1,d8x1,cax1,bax1,a9x1,81x1,4dx1,19x1,00x34,dbx9,2cx1,00x11,60x1,dbx17,22x1,00x13,97x1,dbx2,9ex1,00x16,4ax1,cax1,dbx11,00x34,dbx9,2cx1,00x11,60x1,dbx17,22x1,00x13,97x1,dbx2,9ex1,00x15,51x1,dbx13,00x34,dbx9,2cx1,00x11,60x1,dbx17,22x1,00x13,97x1,dbx2,9ex1,00x14,13x1,d0x1,dbx2,dax1,83x1,35x1,0fx1,03x1,0dx1,26x1,59x1,a4x1,dbx2,00x39,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x22,97x1,dbx2,9ex1,00x14,61x1,dbx3,5cx1,00x8,25x1,9ex1,00x39,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x40,91x1,dbx2,d3x1,04x1,00x49,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x40,a3x1,dbx2,cax1,00x50,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x40,9ax1,dbx3,1bx1,00x49,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x40,70x1,dbx3,a7x1,14x1,00x48,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x40,1dx1,d7x1,dbx3,d7x1,9ax1,5cx1,2ax1,03x1,00x44,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x41,58x1,dbx7,d5x1,afx1,7bx1,31x1,00x41,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x42,3cx1,b5x1,dbx9,9fx1,13x1,00x39,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x44,30x1,6ex1,a1x1,ccx1,dbx6,bbx1,0cx1,00x38,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x48,22x1,62x1,b9x1,dbx4,78x1,00x38,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x50,02x1,6cx1,dbx3,c7x1,00x38,56x1,dbx3,2cx1,00x17,82x1,dbx3,00x52,a0x1,dbx3,0fx1,00x37,56x1,dbx3,2cx1,00x17,7ax1,dbx3,08x1,00x51,77x1,dbx3,13x1,00x37,56x1,dbx3,2cx1,00x17,6ax1,dbx3,28x1,00x51,9cx1,dbx2,d7x1,01x1,00x37,56x1,dbx3,2cx1,00x17,44x1,dbx3,78x1,00x39,96x1,58x1,08x1,00x8,40x1,dbx3,9ex1,00x38,56x1,dbx3,2cx1,00x17,0dx1,d4x1,dbx2,dax1,77x1,25x1,06x1,00x36,bax1,dbx1,d3x1,92x1,57x1,29x1,0fx1,02x1,0cx1,33x1,81x1,d8x1,dbx3,39x1,00x31,71x1,dbx17,48x1,00x11,7bx1,dbx10,22x1,00x31,bax1,dbx13,72x1,00x32,71x1,dbx17,48x1,00x11,06x1,95x1,dbx9,22x1,00x31,bax1,dbx11,cex1,56x1,00x33,71x1,dbx17,48x1,00x13,39x1,87x1,b5x1,cex1,d9x1,dbx4,22x1,00x31,11x1,41x1,6cx1,93x1,adx1,bdx1,cex1,d9x1,cfx1,bcx1,92x1,54x1,0bx1,00x1711'},
  bsbad: {w: 120, h: 48, ink: 598, d: '00x507,33x1,dbx3,4fx1,00x115,33x1,dbx3,4fx1,00x115,33x1,dbx3,4fx1,00x115,33x1,dbx3,4fx1,00x115,33x1,dbx3,4fx1,00x115,33x1,dbx3,4fx1,00x115,33x1,dbx3,4fx1,00x92,0cx1,38x1,63x1,8ex1,acx1,bcx1,cbx1,d7x1,cax1,b8x1,91x1,50x1,0cx1,00x10,33x1,dbx3,4fx1,00x1,0dx1,60x1,abx1,c9x1,d5x1,bfx1,93x1,45x1,00x83,afx1,dbx11,c8x1,51x1,00x9,33x1,dbx3,4fx1,30x1,c2x1,dbx7,a4x1,19x1,00x81,afx1,dbx13,71x1,00x8,33x1,dbx3,6bx1,cex1,dbx9,bcx1,13x1,00x80,afx1,dbx1,cfx1,8cx1,54x1,27x1,11x1,03x1,0cx1,2dx1,6fx1,d0x1,dbx3,52x1,00x7,33x1,dbx3,d5x1,dbx1,d7x1,71x1,22x1,06x1,14x1,50x1,c1x1,dbx3,9ex1,00x80,8ex1,53x1,06x1,00x8,21x1,cdx1,dbx2,c7x1,03x1,00x6,33x1,dbx4,d8x1,39x1,00x5,0fx1,bcx1,dbx3,43x1,00x91,63x1,dbx3,37x1,00x6,33x1,dbx4,76x1,00x7,32x1,dbx3,a0x1,00x91,1dx1,dbx3,66x1,00x6,33x1,dbx3,dax1,14x1,00x8,acx1,dbx2,dax1,14x1,00x91,d7x1,dbx2,7fx1,00x6,33x1,dbx3,adx1,00x9,6ax1,dbx3,44x1,00x91,ccx1,dbx2,8dx1,00x6,33x1,dbx3,83x1,00x9,41x1,dbx3,6dx1,00x80,08x1,4ax1,86x1,aex1,c8x1,d3x1,dbx8,94x1,00x6,33x1,dbx3,64x1,00x9,24x1,dbx3,85x1,00x79,5cx1,cdx1,dbx13,96x1,00x6,33x1,dbx3,58x1,00x9,17x1,dbx3,92x1,00x77,01x1,89x1,dbx15,97x1,00x6,33x1,dbx3,51x1,00x9,10x1,dbx3,9ax1,00x77,5bx1,dbx4,96x1,4bx1,20x1,09x1,00x5,cbx1,dbx2,97x1,00x6,33x1,dbx3,58x1,00x9,17x1,dbx3,90x1,00x76,01x1,c7x1,dbx2,d6x1,3ex1,00x9,d6x1,dbx2,97x1,00x6,33x1,dbx3,64x1,00x9,24x1,dbx3,83x1,00x76,2dx1,dbx3,76x1,00x9,11x1,dbx3,97x1,00x6,33x1,dbx3,83x1,00x9,41x1,dbx3,69x1,00x76,4bx1,dbx3,37x1,00x9,42x1,dbx3,97x1,00x6,33x1,dbx3,aex1,00x9,6ax1,dbx3,3fx1,00x76,53x1,dbx3,30x1,00x9,94x1,dbx3,97x1,00x6,33x1,dbx3,dax1,14x1,00x8,abx1,dbx2,d7x1,10x1,00x76,40x1,dbx3,5cx1,00x8,35x1,dax1,dbx3,97x1,00x6,33x1,dbx4,76x1,00x7,30x1,dbx3,9ax1,00x77,0fx1,d9x1,dbx2,c2x1,12x1,00x6,2bx1,c8x1,dbx4,97x1,00x6,33x1,dbx4,d8x1,38x1,00x5,0ex1,bax1,dbx3,3bx1,00x78,90x1,dbx3,c1x1,53x1,18x1,03x1,0ex1,33x1,80x1,d7x1,dbx1,b7x1,d0x1,dbx2,97x1,00x6,33x1,dbx3,d5x1,dbx1,d6x1,71x1,21x1,06x1,13x1,4fx1,c0x1,dbx3,96x1,00x79,17x1,c5x1,dbx10,cfx1,21x1,cbx1,dbx2,97x1,00x6,33x1,dbx3,6ax1,cex1,dbx9,b6x1,0fx1,00x80,20x1,b4x1,dbx8,b4x1,23x1,00x1,cbx1,dbx2,97x1,00x6,33x1,dbx3,4fx1,30x1,c4x1,dbx7,a0x1,15x1,00x82,03x1,4dx1,97x1,c4x1,d5x1,d0x1,bax1,94x1,49x1,06x1,00x2,cbx1,dbx2,97x1,00x6,33x1,dbx3,4fx1,00x1,10x1,65x1,aex1,cbx1,d5x1,c0x1,91x1,43x1,00x1759'},
  bsok: {w: 120, h: 48, ink: 764, d: '00x531,33x1,dbx3,4fx1,00x90,a9x1,dbx2,c8x1,07x1,00x20,33x1,dbx3,4fx1,00x90,42x1,dbx3,5bx1,00x20,33x1,dbx3,4fx1,00x91,b7x1,dbx2,bfx1,02x1,00x19,33x1,dbx3,4fx1,00x91,51x1,dbx3,4bx1,00x19,33x1,dbx3,4fx1,00x91,04x1,c2x1,dbx2,b2x1,00x19,33x1,dbx3,4fx1,00x92,61x1,dbx3,3cx1,00x18,33x1,dbx3,4fx1,00x68,0cx1,38x1,63x1,8ex1,acx1,bcx1,cbx1,d7x1,cax1,b8x1,91x1,50x1,0cx1,00x11,0ax1,ccx1,dbx2,a3x1,00x18,33x1,dbx3,4fx1,00x1,0dx1,60x1,abx1,c9x1,d5x1,bfx1,93x1,45x1,00x59,afx1,dbx11,c8x1,51x1,00x11,70x1,dbx3,2dx1,00x17,33x1,dbx3,4fx1,30x1,c2x1,dbx7,a4x1,19x1,00x57,afx1,dbx13,71x1,00x10,12x1,d4x1,dbx2,94x1,00x17,33x1,dbx3,6bx1,cex1,dbx9,bcx1,13x1,00x56,afx1,dbx1,cfx1,8cx1,54x1,27x1,11x1,03x1,0cx1,2dx1,6fx1,d0x1,dbx3,52x1,00x10,7fx1,dbx2,dax1,20x1,00x16,33x1,dbx3,d5x1,dbx1,d7x1,71x1,22x1,06x1,14x1,50x1,c1x1,dbx3,9ex1,00x56,8ex1,53x1,06x1,00x8,21x1,cdx1,dbx2,c7x1,03x1,00x9,1cx1,d9x1,dbx2,84x1,00x16,33x1,dbx4,d8x1,39x1,00x5,0fx1,bcx1,dbx3,43x1,00x67,63x1,dbx3,37x1,00x10,8fx1,dbx2,d5x1,15x1,00x15,33x1,dbx4,76x1,00x7,32x1,dbx3,a0x1,00x67,1dx1,dbx3,66x1,00x10,28x1,dbx3,75x1,00x15,33x1,dbx3,dax1,14x1,00x8,acx1,dbx2,dax1,14x1,00x67,d7x1,dbx2,7fx1,00x11,9ex1,dbx2,cfx1,0cx1,00x14,33x1,dbx3,adx1,00x9,6ax1,dbx3,44x1,00x67,ccx1,dbx2,8dx1,00x11,37x1,dbx3,66x1,00x14,33x1,dbx3,83x1,00x9,41x1,dbx3,6dx1,00x56,08x1,4ax1,86x1,aex1,c8x1,d3x1,dbx8,94x1,00x12,adx1,dbx2,c7x1,06x1,00x13,33x1,dbx3,64x1,00x9,24x1,dbx3,85x1,00x55,5cx1,cdx1,dbx13,96x1,00x12,46x1,dbx3,57x1,00x13,33x1,dbx3,58x1,00x9,17x1,dbx3,92x1,00x53,01x1,89x1,dbx15,97x1,00x12,01x1,bbx1,dbx2,bcx1,01x1,00x12,33x1,dbx3,51x1,00x9,10x1,dbx3,9ax1,00x53,5bx1,dbx4,96x1,4bx1,20x1,09x1,00x5,cbx1,dbx2,97x1,00x13,56x1,dbx3,47x1,00x12,33x1,dbx3,58x1,00x9,17x1,dbx3,90x1,00x52,01x1,c7x1,dbx2,d6x1,3ex1,00x9,d6x1,dbx2,97x1,00x13,05x1,c5x1,dbx2,aex1,00x12,33x1,dbx3,64x1,00x9,24x1,dbx3,83x1,00x52,2dx1,dbx3,76x1,00x9,11x1,dbx3,97x1,00x14,64x1,dbx3,38x1,00x11,33x1,dbx3,83x1,00x9,41x1,dbx3,69x1,00x52,4bx1,dbx3,37x1,00x9,42x1,dbx3,97x1,00x14,0cx1,cex1,dbx2,9fx1,00x11,33x1,dbx3,aex1,00x9,6ax1,dbx3,3fx1,00x52,53x1,dbx3,30x1,00x9,94x1,dbx3,97x1,00x15,74x1,dbx3,2ax1,00x10,33x1,dbx3,dax1,14x1,00x8,abx1,dbx2,d7x1,10x1,00x52,40x1,dbx3,5cx1,00x8,35x1,dax1,dbx3,97x1,00x15,14x1,d5x1,dbx2,90x1,00x10,33x1,dbx4,76x1,00x7,30x1,dbx3,9ax1,00x53,0fx1,d9x1,dbx2,c2x1,12x1,00x6,2bx1,c8x1,dbx4,97x1,00x16,83x1,dbx2,d9x1,1dx1,00x9,33x1,dbx4,d8x1,38x1,00x5,0ex1,bax1,dbx3,3bx1,00x54,90x1,dbx3,c1x1,53x1,18x1,03x1,0ex1,33x1,80x1,d7x1,dbx1,b7x1,d0x1,dbx2,97x1,00x16,1fx1,dax1,dbx2,80x1,00x9,33x1,dbx3,d5x1,dbx1,d6x1,71x1,21x1,06x1,13x1,4fx1,c0x1,dbx3,96x1,00x55,17x1,c5x1,dbx10,cfx1,21x1,cbx1,dbx2,97x1,00x17,93x1,dbx2,d4x1,13x1,00x8,33x1,dbx3,6ax1,cex1,dbx9,b6x1,0fx1,00x56,20x1,b4x1,dbx8,b4x1,23x1,00x1,cbx1,dbx2,97x1,00x17,2cx1,dbx3,71x1,00x8,33x1,dbx3,4fx1,30x1,c4x1,dbx7,a0x1,15x1,00x58,03x1,4dx1,97x1,c4x1,d5x1,d0x1,bax1,94x1,49x1,06x1,00x2,cbx1,dbx2,97x1,00x18,a2x1,dbx2,cdx1,0ax1,00x7,33x1,dbx3,4fx1,00x1,10x1,65x1,aex1,cbx1,d5x1,c0x1,91x1,43x1,00x94,3bx1,dbx3,62x1,00x116,b0x1,dbx2,c3x1,04x1,00x115,4bx1,dbx3,52x1,00x115,02x1,bdx1,dbx2,b8x1,00x1275'},
  pts: {w: 192, h: 48, ink: 2478, d: '00x776,39x1,8ax1,b7x1,cfx1,d0x1,b9x1,8fx1,3ex1,01x1,00x39,39x1,8ax1,b7x1,cfx1,d0x1,b9x1,8fx1,3ex1,01x1,00x15,39x1,8ax1,b7x1,cfx1,d0x1,b9x1,8fx1,3ex1,01x1,00x15,25x1,77x1,b1x1,c9x1,d5x1,bex1,9ex1,52x1,0ax1,00x15,25x1,77x1,b1x1,c9x1,d5x1,bex1,9ex1,52x1,0ax1,00x15,25x1,77x1,b1x1,c9x1,d5x1,bex1,9ex1,52x1,0ax1,00x15,13x1,62x1,a8x1,c3x1,d5x1,c4x1,aax1,67x1,17x1,00x13,14x1,a0x1,dbx8,a8x1,19x1,00x36,14x1,a0x1,dbx8,a8x1,19x1,00x12,14x1,a0x1,dbx8,a8x1,19x1,00x12,05x1,79x1,dbx8,c3x1,35x1,00x12,05x1,79x1,dbx8,c3x1,35x1,00x12,05x1,79x1,dbx8,c3x1,35x1,00x13,51x1,d1x1,dbx7,d5x1,5bx1,00x11,14x1,c3x1,dbx10,c9x1,1ax1,00x34,14x1,c3x1,dbx10,c9x1,1ax1,00x10,14x1,c3x1,dbx10,c9x1,1ax1,00x10,02x1,9ex1,dbx10,d9x1,42x1,00x10,02x1,9ex1,dbx10,d9x1,42x1,00x10,02x1,9ex1,dbx10,d9x1,42x1,00x11,6ax1,dbx11,77x1,00x9,03x1,a9x1,dbx3,b8x1,46x1,11x1,0ex1,40x1,b0x1,dbx3,b2x1,06x1,00x32,03x1,a9x1,dbx3,b8x1,46x1,11x1,0ex1,40x1,b0x1,dbx3,b2x1,06x1,00x8,03x1,a9x1,dbx3,b8x1,46x1,11x1,0ex1,40x1,b0x1,dbx3,b2x1,06x1,00x9,76x1,dbx3,cdx1,5fx1,19x1,09x1,2dx1,93x1,dbx3,cfx1,21x1,00x9,76x1,dbx3,cdx1,5fx1,19x1,09x1,2dx1,93x1,dbx3,cfx1,21x1,00x9,76x1,dbx3,cdx1,5fx1,19x1,09x1,2dx1,93x1,dbx3,cfx1,21x1,00x9,40x1,dbx3,dax1,7bx1,23x1,07x1,1fx1,73x1,d7x1,dbx3,4cx1,00x8,52x1,dbx3,b4x1,0ex1,00x4,09x1,a9x1,dbx3,60x1,00x32,52x1,dbx3,b4x1,0ex1,00x4,09x1,a9x1,dbx3,60x1,00x8,52x1,dbx3,b4x1,0ex1,00x4,09x1,a9x1,dbx3,60x1,00x8,1ex1,d9x1,dbx2,d0x1,29x1,00x5,7bx1,dbx3,97x1,00x8,1ex1,d9x1,dbx2,d0x1,29x1,00x5,7bx1,dbx3,97x1,00x8,1ex1,d9x1,dbx2,d0x1,29x1,00x5,7bx1,dbx3,97x1,00x8,02x1,bdx1,dbx3,54x1,00x5,45x1,dbx3,c7x1,06x1,00x6,01x1,bcx1,dbx3,2cx1,00x6,20x1,d6x1,dbx2,c5x1,06x1,00x30,01x1,bcx1,dbx3,2cx1,00x6,20x1,d6x1,dbx2,c5x1,06x1,00x6,01x1,bcx1,dbx3,2cx1,00x6,20x1,d6x1,dbx2,c5x1,06x1,00x7,87x1,dbx3,62x1,00x6,05x1,bbx1,dbx3,27x1,00x7,87x1,dbx3,62x1,00x6,05x1,bbx1,dbx3,27x1,00x7,87x1,dbx3,62x1,00x6,05x1,bbx1,dbx3,27x1,00x7,50x1,dbx3,99x1,00x7,89x1,dbx3,5ex1,00x6,34x1,dbx3,a1x1,00x8,90x1,dbx3,42x1,00x30,34x1,dbx3,a1x1,00x8,90x1,dbx3,42x1,00x6,34x1,dbx3,a1x1,00x8,90x1,dbx3,42x1,00x6,06x1,d3x1,dbx2,d0x1,07x1,00x7,59x1,dbx3,79x1,00x6,06x1,d3x1,dbx2,d0x1,07x1,00x7,59x1,dbx3,79x1,00x6,06x1,d3x1,dbx2,d0x1,07x1,00x7,59x1,dbx3,79x1,00x7,a3x1,dbx3,32x1,00x7,22x1,dbx3,b0x1,00x6,74x1,dbx3,54x1,00x8,44x1,dbx3,83x1,00x30,74x1,dbx3,54x1,00x8,44x1,dbx3,83x1,00x6,74x1,dbx3,54x1,00x8,44x1,dbx3,83x1,00x6,3dx1,dbx3,8bx1,00x8,10x1,d9x1,dbx2,bax1,00x6,3dx1,dbx3,8bx1,00x8,10x1,d9x1,dbx2,bax1,00x6,3dx1,dbx3,8bx1,00x8,10x1,d9x1,dbx2,bax1,00x6,0ax1,d6x1,dbx2,c2x1,00x9,b2x1,dbx3,15x1,00x5,afx1,dbx3,20x1,00x8,10x1,dbx3,bfx1,00x30,afx1,dbx3,20x1,00x8,10x1,dbx3,bfx1,00x6,afx1,dbx3,20x1,00x8,10x1,dbx3,bfx1,00x6,77x1,dbx3,58x1,00x9,b5x1,dbx3,19x1,00x5,77x1,dbx3,58x1,00x9,b5x1,dbx3,19x1,00x5,77x1,dbx3,58x1,00x9,b5x1,dbx3,19x1,00x5,40x1,dbx3,8fx1,00x9,7ex1,dbx3,51x1,00x5,d2x1,dbx2,cfx1,00x10,c0x1,dbx3,07x1,00x29,d2x1,dbx2,cfx1,00x10,c0x1,dbx3,07x1,00x5,d2x1,dbx2,cfx1,00x10,c0x1,dbx3,07x1,00x5,9cx1,dbx3,2cx1,00x9,89x1,dbx3,3ex1,00x5,9cx1,dbx3,2cx1,00x9,89x1,dbx3,3ex1,00x5,9cx1,dbx3,2cx1,00x9,89x1,dbx3,3ex1,00x5,65x1,dbx3,63x1,00x9,51x1,dbx3,75x1,00x4,18x1,dbx3,b4x1,00x10,a4x1,dbx3,27x1,00x28,18x1,dbx3,b4x1,00x10,a4x1,dbx3,27x1,00x4,18x1,dbx3,b4x1,00x10,a4x1,dbx3,27x1,00x5,bdx1,dbx3,0ex1,00x9,6dx1,dbx3,5ex1,00x5,bdx1,dbx3,0ex1,00x9,6dx1,dbx3,5ex1,00x5,bdx1,dbx3,0ex1,00x9,6dx1,dbx3,5ex1,00x5,86x1,dbx3,45x1,00x9,36x1,dbx3,96x1,00x4,35x1,dbx3,9cx1,00x10,8dx1,dbx3,45x1,00x28,35x1,dbx3,9cx1,00x10,8dx1,dbx3,45x1,00x4,35x1,dbx3,9cx1,00x10,8dx1,dbx3,45x1,00x4,01x1,d8x1,dbx2,d4x1,00x10,56x1,dbx3,7cx1,00x4,01x1,d8x1,dbx2,d4x1,00x10,56x1,dbx3,7cx1,00x4,01x1,d8x1,dbx2,d4x1,00x10,56x1,dbx3,7cx1,00x5,a3x1,dbx3,2ex1,00x9,1fx1,dbx3,b3x1,00x4,42x1,dbx3,8bx1,00x10,7bx1,dbx3,51x1,00x28,42x1,dbx3,8bx1,00x10,7bx1,dbx3,51x1,00x4,42x1,dbx3,8bx1,00x10,7bx1,dbx3,51x1,00x4,0bx1,dbx3,c2x1,00x10,44x1,dbx3,89x1,00x4,0bx1,dbx3,c2x1,00x10,44x1,dbx3,89x1,00x4,0bx1,dbx3,c2x1,00x10,44x1,dbx3,89x1,00x5,b0x1,dbx3,1dx1,00x9,0cx1,dbx3,c0x1,00x4,4bx1,dbx3,84x1,00x2,03x1,7bx1,cbx1,ccx1,83x1,06x1,00x2,75x1,dbx3,5bx1,00x28,4bx1,dbx3,84x1,00x2,03x1,7bx1,cbx1,ccx1,83x1,06x1,00x2,75x1,dbx3,5bx1,00x4,4bx1,dbx3,84x1,00x2,03x1,7bx1,cbx1,ccx1,83x1,06x1,00x2,75x1,dbx3,5bx1,00x4,14x1,dbx3,bcx1,00x3,54x1,c0x1,d1x1,9dx1,1bx1,00x2,3ex1,dbx3,92x1,00x4,14x1,dbx3,bcx1,00x3,54x1,c0x1,d1x1,9dx1,1bx1,00x2,3ex1,dbx3,92x1,00x4,14x1,dbx3,bcx1,00x3,54x1,c0x1,d1x1,9dx1,1bx1,00x2,3ex1,dbx3,92x1,00x5,bax1,dbx3,16x1,00x2,31x1,afx1,d4x1,b2x1,39x1,00x2,06x1,dbx3,c9x1,00x4,54x1,dbx3,7ex1,00x2,5cx1,dbx4,70x1,00x2,6ex1,dbx3,64x1,00x28,54x1,dbx3,7ex1,00x2,5cx1,dbx4,70x1,00x2,6ex1,dbx3,64x1,00x4,54x1,dbx3,7ex1,00x2,5cx1,dbx4,70x1,00x2,6ex1,dbx3,64x1,00x4,1dx1,dbx3,b5x1,00x2,25x1,dbx4,a7x1,00x2,37x1,dbx3,9cx1,00x4,1dx1,dbx3,b5x1,00x2,25x1,dbx4,a7x1,00x2,37x1,dbx3,9cx1,00x4,1dx1,dbx3,b5x1,00x2,25x1,dbx4,a7x1,00x2,37x1,dbx3,9cx1,00x5,c2x1,dbx3,10x1,00x1,01x1,c8x1,dbx3,d3x1,0ax1,00x2,dbx3,d3x1,00x4,55x1,dbx3,7ex1,00x2,5fx1,dbx4,71x1,00x2,6dx1,dbx3,65x1,00x28,55x1,dbx3,7ex1,00x2,5fx1,dbx4,71x1,00x2,6dx1,dbx3,65x1,00x4,55x1,dbx3,7ex1,00x2,5fx1,dbx4,71x1,00x2,6dx1,dbx3,65x1,00x4,1ex1,dbx3,b5x1,00x2,28x1,dbx4,a8x1,00x2,36x1,dbx3,9cx1,00x4,1ex1,dbx3,b5x1,00x2,28x1,dbx4,a8x1,00x2,36x1,dbx3,9cx1,00x4,1ex1,dbx3,b5x1,00x2,28x1,dbx4,a8x1,00x2,36x1,dbx3,9cx1,00x5,c3x1,dbx3,10x1,00x1,01x1,ccx1,dbx3,d5x1,0ax1,00x2,dbx3,d4x1,00x4,4bx1,dbx3,84x1,00x2,05x1,83x1,cdx2,85x1,07x1,00x2,75x1,dbx3,5bx1,00x28,4bx1,dbx3,84x1,00x2,05x1,83x1,cdx2,85x1,07x1,00x2,75x1,dbx3,5bx1,00x4,4bx1,dbx3,84x1,00x2,05x1,83x1,cdx2,85x1,07x1,00x2,75x1,dbx3,5bx1,00x4,14x1,dbx3,bcx1,00x3,5cx1,c2x1,d2x1,a0x1,1ex1,00x2,3ex1,dbx3,92x1,00x4,14x1,dbx3,bcx1,00x3,5cx1,c2x1,d2x1,a0x1,1ex1,00x2,3ex1,dbx3,92x1,00x4,14x1,dbx3,bcx1,00x3,5cx1,c2x1,d2x1,a0x1,1ex1,00x2,3ex1,dbx3,92x1,00x5,bax1,dbx3,16x1,00x2,38x1,b3x1,d5x1,b4x1,3cx1,00x2,06x1,dbx3,c9x1,00x4,42x1,dbx3,8bx1,00x10,7bx1,dbx3,51x1,00x28,42x1,dbx3,8bx1,00x10,7bx1,dbx3,51x1,00x4,42x1,dbx3,8bx1,00x10,7bx1,dbx3,51x1,00x4,0bx1,dbx3,c2x1,00x10,44x1,dbx3,89x1,00x4,0bx1,dbx3,c2x1,00x10,44x1,dbx3,89x1,00x4,0bx1,dbx3,c2x1,00x10,44x1,dbx3,89x1,00x5,b0x1,dbx3,1dx1,00x9,0cx1,dbx3,c0x1,00x4,35x1,dbx3,9cx1,00x10,8dx1,dbx3,45x1,00x28,35x1,dbx3,9cx1,00x10,8dx1,dbx3,45x1,00x4,35x1,dbx3,9cx1,00x10,8dx1,dbx3,45x1,00x4,01x1,d9x1,dbx2,d4x1,00x10,56x1,dbx3,7dx1,00x4,01x1,d9x1,dbx2,d4x1,00x10,56x1,dbx3,7dx1,00x4,01x1,d9x1,dbx2,d4x1,00x10,56x1,dbx3,7dx1,00x5,a3x1,dbx3,2ex1,00x9,1fx1,dbx3,b4x1,00x4,18x1,dbx3,b4x1,00x10,a3x1,dbx3,27x1,00x28,18x1,dbx3,b4x1,00x10,a3x1,dbx3,27x1,00x4,18x1,dbx3,b4x1,00x10,a3x1,dbx3,27x1,00x5,bdx1,dbx3,0ex1,00x9,6cx1,dbx3,5ex1,00x5,bdx1,dbx3,0ex1,00x9,6cx1,dbx3,5ex1,00x5,bdx1,dbx3,0ex1,00x9,6cx1,dbx3,5ex1,00x5,86x1,dbx3,45x1,00x9,35x1,dbx3,96x1,00x5,d3x1,dbx2,cfx1,00x10,c0x1,dbx3,08x1,00x29,d3x1,dbx2,cfx1,00x10,c0x1,dbx3,08x1,00x5,d3x1,dbx2,cfx1,00x10,c0x1,dbx3,08x1,00x5,9cx1,dbx3,2bx1,00x9,89x1,dbx3,3ex1,00x5,9cx1,dbx3,2bx1,00x9,89x1,dbx3,3ex1,00x5,9cx1,dbx3,2bx1,00x9,89x1,dbx3,3ex1,00x5,65x1,dbx3,62x1,00x9,51x1,dbx3,75x1,00x5,afx1,dbx3,20x1,00x8,10x1,dbx3,bfx1,00x30,afx1,dbx3,20x1,00x8,10x1,dbx3,bfx1,00x6,afx1,dbx3,20x1,00x8,10x1,dbx3,bfx1,00x6,78x1,dbx3,58x1,00x9,b5x1,dbx3,19x1,00x5,78x1,dbx3,58x1,00x9,b5x1,dbx3,19x1,00x5,78x1,dbx3,58x1,00x9,b5x1,dbx3,19x1,00x5,41x1,dbx3,8fx1,00x9,7ex1,dbx3,51x1,00x5,74x1,dbx3,54x1,00x8,44x1,dbx3,83x1,00x30,74x1,dbx3,54x1,00x8,44x1,dbx3,83x1,00x6,74x1,dbx3,54x1,00x8,44x1,dbx3,83x1,00x6,3dx1,dbx3,8bx1,00x8,0fx1,d9x1,dbx2,bax1,00x6,3dx1,dbx3,8bx1,00x8,0fx1,d9x1,dbx2,bax1,00x6,3dx1,dbx3,8bx1,00x8,0fx1,d9x1,dbx2,bax1,00x6,0bx1,d6x1,dbx2,c2x1,00x9,b2x1,dbx3,15x1,00x5,34x1,dbx3,a1x1,00x8,90x1,dbx3,43x1,00x30,34x1,dbx3,a1x1,00x8,90x1,dbx3,43x1,00x6,34x1,dbx3,a1x1,00x8,90x1,dbx3,43x1,00x6,06x1,d3x1,dbx2,cfx1,07x1,00x7,59x1,dbx3,7ax1,00x6,06x1,d3x1,dbx2,cfx1,07x1,00x7,59x1,dbx3,7ax1,00x6,06x1,d3x1,dbx2,cfx1,07x1,00x7,59x1,dbx3,7ax1,00x7,a3x1,dbx3,32x1,00x7,22x1,dbx3,b1x1,00x6,02x1,bcx1,dbx3,2cx1,00x6,1fx1,d6x1,dbx2,c6x1,06x1,00x12,64x1,dbx4,67x1,00x12,02x1,bcx1,dbx3,2cx1,00x6,1fx1,d6x1,dbx2,c6x1,06x1,00x6,02x1,bcx1,dbx3,2cx1,00x6,1fx1,d6x1,dbx2,c6x1,06x1,00x7,87x1,dbx3,62x1,00x6,05x1,bax1,dbx3,28x1,00x7,87x1,dbx3,62x1,00x6,05x1,bax1,dbx3,28x1,00x7,87x1,dbx3,62x1,00x6,05x1,bax1,dbx3,28x1,00x7,50x1,dbx3,99x1,00x7,89x1,dbx3,5ex1,00x7,52x1,dbx3,b3x1,0dx1,00x4,08x1,a8x1,dbx3,60x1,00x13,64x1,dbx4,67x1,00x13,52x1,dbx3,b3x1,0dx1,00x4,08x1,a8x1,dbx3,60x1,00x8,52x1,dbx3,b3x1,0dx1,00x4,08x1,a8x1,dbx3,60x1,00x8,1ex1,d9x1,dbx2,cfx1,28x1,00x5,7ax1,dbx3,97x1,00x8,1ex1,d9x1,dbx2,cfx1,28x1,00x5,7ax1,dbx3,97x1,00x8,1ex1,d9x1,dbx2,cfx1,28x1,00x5,7ax1,dbx3,97x1,00x8,02x1,bdx1,dbx3,53x1,00x5,45x1,dbx3,c7x1,06x1,00x7,03x1,a9x1,dbx3,b7x1,45x1,10x1,0dx1,3fx1,b0x1,dbx3,b3x1,06x1,00x13,64x1,dbx4,67x1,00x13,03x1,a9x1,dbx3,b7x1,45x1,10x1,0dx1,3fx1,b0x1,dbx3,b3x1,06x1,00x8,03x1,a9x1,dbx3,b7x1,45x1,10x1,0dx1,3fx1,b0x1,dbx3,b3x1,06x1,00x9,76x1,dbx3,cdx1,5ex1,18x1,08x1,2cx1,92x1,dbx3,cfx1,21x1,00x9,76x1,dbx3,cdx1,5ex1,18x1,08x1,2cx1,92x1,dbx3,cfx1,21x1,00x9,76x1,dbx3,cdx1,5ex1,18x1,08x1,2cx1,92x1,dbx3,cfx1,21x1,00x9,40x1,dbx3,dax1,7bx1,22x1,07x1,1fx1,72x1,d7x1,dbx3,4cx1,00x9,14x1,c3x1,dbx10,c9x1,1bx1,00x14,64x1,dbx4,67x1,00x14,14x1,c3x1,dbx10,c9x1,1bx1,00x10,14x1,c3x1,dbx10,c9x1,1bx1,00x10,02x1,9fx1,dbx10,dax1,43x1,00x10,02x1,9fx1,dbx10,dax1,43x1,00x10,02x1,9fx1,dbx10,dax1,43x1,00x11,6ax1,dbx11,77x1,00x11,14x1,a1x1,dbx8,a9x1,19x1,00x15,64x1,dbx4,67x1,00x15,14x1,a1x1,dbx8,a9x1,19x1,00x12,14x1,a1x1,dbx8,a9x1,19x1,00x12,05x1,7bx1,dbx8,c3x1,36x1,00x12,05x1,7bx1,dbx8,c3x1,36x1,00x12,05x1,7bx1,dbx8,c3x1,36x1,00x13,52x1,d1x1,dbx7,d5x1,5cx1,00x14,3ax1,8bx1,b8x1,d0x1,d1x1,bax1,90x1,3fx1,02x1,00x16,64x1,dbx4,67x1,00x17,3ax1,8bx1,b8x1,d0x1,d1x1,bax1,90x1,3fx1,02x1,00x15,3ax1,8bx1,b8x1,d0x1,d1x1,bax1,90x1,3fx1,02x1,00x15,25x1,78x1,b2x1,cax1,d5x1,c0x1,9fx1,54x1,0ax1,00x15,25x1,78x1,b2x1,cax1,d5x1,c0x1,9fx1,54x1,0ax1,00x15,25x1,78x1,b2x1,cax1,d5x1,c0x1,9fx1,54x1,0ax1,00x15,13x1,64x1,a9x1,c4x1,d6x1,c6x1,abx1,69x1,17x1,00x2695'},
  clean: {w: 120, h: 48, ink: 645, d: '00x490,56x1,dbx3,2cx1,00x115,56x1,dbx3,2cx1,00x43,97x1,dbx2,9ex1,00x68,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x22,97x1,dbx2,9ex1,00x68,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x22,97x1,dbx2,9ex1,00x68,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x22,97x1,dbx2,9ex1,00x90,83x1,dbx3,00x22,97x1,dbx2,9ex1,00x90,83x1,dbx3,00x22,97x1,dbx2,9ex1,00x90,83x1,dbx3,00x22,97x1,dbx2,9ex1,00x17,0bx1,56x1,94x1,bdx1,cfx1,d8x1,cax1,bax1,a9x1,81x1,4dx1,19x1,00x34,dbx9,2cx1,00x11,60x1,dbx17,22x1,00x13,97x1,dbx2,9ex1,00x16,4ax1,cax1,dbx11,00x34,dbx9,2cx1,00x11,60x1,dbx17,22x1,00x13,97x1,dbx2,9ex1,00x15,51x1,dbx13,00x34,dbx9,2cx1,00x11,60x1,dbx17,22x1,00x13,97x1,dbx2,9ex1,00x14,13x1,d0x1,dbx2,dax1,83x1,35x1,0fx1,03x1,0dx1,26x1,59x1,a4x1,dbx2,00x39,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x22,97x1,dbx2,9ex1,00x14,61x1,dbx3,5cx1,00x8,25x1,9ex1,00x39,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x40,91x1,dbx2,d3x1,04x1,00x49,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x40,a3x1,dbx2,cax1,00x50,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x40,9ax1,dbx3,1bx1,00x49,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x40,70x1,dbx3,a7x1,14x1,00x48,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x40,1dx1,d7x1,dbx3,d7x1,9ax1,5cx1,2ax1,03x1,00x44,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x41,58x1,dbx7,d5x1,afx1,7bx1,31x1,00x41,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x42,3cx1,b5x1,dbx9,9fx1,13x1,00x39,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x44,30x1,6ex1,a1x1,ccx1,dbx6,bbx1,0cx1,00x38,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x48,22x1,62x1,b9x1,dbx4,78x1,00x38,56x1,dbx3,2cx1,00x17,83x1,dbx3,00x50,02x1,6cx1,dbx3,c7x1,00x38,56x1,dbx3,2cx1,00x17,82x1,dbx3,00x52,a0x1,dbx3,0fx1,00x37,56x1,dbx3,2cx1,00x17,7ax1,dbx3,08x1,00x51,77x1,dbx3,13x1,00x37,56x1,dbx3,2cx1,00x17,6ax1,dbx3,28x1,00x51,9cx1,dbx2,d7x1,01x1,00x37,56x1,dbx3,2cx1,00x17,44x1,dbx3,78x1,00x39,96x1,58x1,08x1,00x8,40x1,dbx3,9ex1,00x38,56x1,dbx3,2cx1,00x17,0dx1,d4x1,dbx2,dax1,77x1,25x1,06x1,00x36,bax1,dbx1,d3x1,92x1,57x1,29x1,0fx1,02x1,0cx1,33x1,81x1,d8x1,dbx3,39x1,00x31,71x1,dbx17,48x1,00x11,7bx1,dbx10,22x1,00x31,bax1,dbx13,72x1,00x32,71x1,dbx17,48x1,00x11,06x1,95x1,dbx9,22x1,00x31,bax1,dbx11,cex1,56x1,00x33,71x1,dbx17,48x1,00x13,39x1,87x1,b5x1,cex1,d9x1,dbx4,22x1,00x31,11x1,41x1,6cx1,93x1,adx1,bdx1,cex1,d9x1,cfx1,bcx1,92x1,54x1,0bx1,00x1711'},
};


/* backslash counts 0 to 9, one letter per count: o drew the target, b a blank frame, w other wrong text, f another font (the font option was replaced) */
const GRID: Record<string, string> = {
  percent_bare: 'bbbboooobb',
  percent_quoted: 'bboobbwwbb',
  colon_bare: 'ffooffooff',
  colon_quoted: 'fofofwfwfw',
  apostrophe_bare: 'wwwowwwoww',
  apostrophe_quoted: 'wwwowwwoww',
  backslash_bare: 'wwwwwwwwoo',
  backslash_quoted: 'wwwwooooww',
};

const decode = (d: string) => {
  const out: number[] = [];
  d.split(',').forEach((tok) => { const [h, n] = tok.split('x'); const v = parseInt(h, 16); for (let i = 0; i < Number(n); i++) out.push(v); });
  return out;
};

/* ---------- layout ---------- */
const WX = 96, WY = 140, WW = 1120, WH = 560, TREE = 250, BAR = 46;
const RX = 1310, RW = 514;

type Fr = {w: number; h: number; ink: number; d: string};

/** A crop of a real frame: pixel levels drawn at scale s, light ink on the dark frame colour. */
const Pix: React.FC<{f: Fr; x: number; y: number; s: number; chars?: string; cellLines?: boolean}> = ({f, x, y, s, chars, cellLines}) => {
  const px = decode(f.d);
  const rects: React.ReactNode[] = [];
  for (let r = 0; r < f.h; r++) {
    let c = 0;
    while (c < f.w) {
      const v = px[r * f.w + c];
      if (v === 0) { c++; continue; }
      let e = c; while (e < f.w && px[r * f.w + e] === v) e++;
      rects.push(<rect key={`${r}-${c}`} x={c * s} y={r * s} width={(e - c) * s} height={s} fill={C.bg} fillOpacity={v / 219} />);
      c = e;
    }
  }
  const cells = Math.round(f.w / 24);
  return (
    <div style={{position: 'absolute', left: x, top: y, width: f.w * s, height: f.h * s + (chars ? 40 : 0)}}>
      <svg width={f.w * s} height={f.h * s} style={{position: 'absolute', left: 0, top: 0}} shapeRendering="crispEdges">
        <rect width={f.w * s} height={f.h * s} fill={C.text} />
        {rects}
        {cellLines && Array.from({length: cells + 1}, (_, k) => <line key={k} x1={k * 24 * s} y1={0} x2={k * 24 * s} y2={f.h * s} stroke={C.mute} strokeWidth={1.5} strokeDasharray="5 5" />)}
      </svg>
      {chars && Array.from({length: cells}, (_, k) => (
        <div key={k} style={{position: 'absolute', left: k * 24 * s, top: f.h * s + 6, width: 24 * s, textAlign: 'center', fontFamily: F.mono, fontWeight: 700, fontSize: 26, color: chars[k] === ' ' || chars[k] === undefined ? C.mute : C.cyan}}>{chars[k] === ' ' || chars[k] === undefined ? '_' : chars[k]}</div>
      ))}
    </div>
  );
};

/** An index card pinned beside the window. */
const Card: React.FC<{y: number; h: number; label: string; color?: string; o?: number; children?: React.ReactNode}> = ({y, h, label, color = C.text, o = 1, children}) => (
  <div style={{position: 'absolute', left: RX, top: y + (1 - o) * 16, width: RW, height: h, opacity: o, boxSizing: 'border-box', border: `2px solid ${color}`, background: C.bg2}}>
    <div style={{position: 'absolute', left: 0, top: 0, right: 0, height: 30, background: color, color: C.bg2, fontFamily: F.mono, fontSize: 16, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', padding: '0 12px', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap'}}>{label}</div>
    {children}
  </div>
);
const CardText: React.FC<{x?: number; y: number; w?: number; size?: number; color?: string; mono?: boolean; weight?: number; align?: 'left' | 'center'; children?: React.ReactNode}> = ({x = 14, y, w = RW - 32, size = 22, color = C.text, mono = false, weight = 500, align = 'left', children}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, fontFamily: mono ? F.mono : F.sans, fontSize: size, fontWeight: weight, color, lineHeight: 1.25, textAlign: align, whiteSpace: 'pre-wrap'}}>{children}</div>
);

/** One row of backslash counts 0 to 9: green drew the target, madder a blank frame, ochre other wrong text, grey another font. */
const stripColor = (k: string) => ({o: C.green, b: C.red, w: C.amber, f: C.mute} as Record<string, string>)[k];
const Strip: React.FC<{x: number; y: number; data: string; label: string; cw?: number}> = ({x, y, data, label, cw = 44}) => (
  <div style={{position: 'absolute', left: x, top: y}}>
    <div style={{fontFamily: F.mono, fontSize: 16, letterSpacing: 1, color: C.dim, marginBottom: 6, whiteSpace: 'nowrap'}}>{label}</div>
    <div style={{display: 'flex', gap: 4}}>
      {data.split('').map((k, i) => (
        <div key={i} style={{width: cw, height: cw, background: stripColor(k), color: C.bg, fontFamily: F.mono, fontWeight: 700, fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{i}</div>
      ))}
    </div>
  </div>
);
const Legend: React.FC<{x: number; y: number}> = ({x, y}) => (
  <div style={{position: 'absolute', left: x, top: y, display: 'flex', gap: 14, fontFamily: F.mono, fontSize: 15, color: C.dim, whiteSpace: 'nowrap'}}>
    {[['o', 'exact'], ['b', 'blank'], ['w', 'wrong'], ['f', 'other font']].map(([k, n]) => (
      <span key={k} style={{display: 'inline-flex', alignItems: 'center', gap: 5}}><span style={{width: 14, height: 14, background: stripColor(k), display: 'inline-block'}} />{n}</span>
    ))}
  </div>
);

/** One big measured number under the window. */
const Punch: React.FC<{value: string; label: string; color?: string; o?: number}> = ({value, label, color = C.red, o = 1}) => (
  <div style={{position: 'absolute', left: WX, top: 768, width: WW, height: 112, opacity: o, display: 'flex', alignItems: 'center', gap: 36}}>
    <div style={{fontFamily: F.display, fontWeight: 800, fontSize: 118, lineHeight: 1, color, whiteSpace: 'nowrap', letterSpacing: 0.4}}>{value}</div>
    <div style={{fontFamily: F.sans, fontWeight: 500, fontSize: 30, lineHeight: 1.25, color: C.dim, maxWidth: 640}}>{label}</div>
  </div>
);

/* ---------- the window ---------- */
type TL = {at: number; len?: number; kind?: 'cmd' | 'out' | 'err' | 'ok' | 'dim'; prompt?: string; text: string; hl?: string};
const FILES = ['f-apostrophe.txt', 'f-backslash.txt', 'f-colon.txt', 'f-percent.txt', 'font.ttf', 'out.png'];

const Tree: React.FC<{hi: string[]}> = ({hi}) => (
  <div style={{position: 'absolute', left: 0, top: BAR, width: TREE, bottom: 0, background: C.bg2, borderRight: `2px solid ${C.text}`, fontFamily: F.mono, fontSize: 19, color: C.text, padding: '16px 0'}}>
    <div style={{padding: '0 16px 10px', fontWeight: 700, color: C.dim, letterSpacing: 1}}>ff73-lab/</div>
    {FILES.map((f) => (
      <div key={f} style={{padding: '3px 16px 3px 30px', background: hi.includes(f) ? C.amberDim : 'transparent', fontWeight: hi.includes(f) ? 700 : 400, whiteSpace: 'nowrap'}}>{f}</div>
    ))}
  </div>
);

const Term: React.FC<{lines: TL[]; t: number; dur: number}> = ({lines, t, dur}) => {
  const shown = lines.filter((l) => t >= l.at * dur);
  const last = shown[shown.length - 1];
  return (
    <div style={{position: 'absolute', left: TREE, top: BAR, right: 0, bottom: 0, background: C.text, padding: '18px 24px', fontFamily: F.mono, fontSize: 22, lineHeight: '33px', overflow: 'hidden', color: C.bg}}>
      {shown.map((l, i) => {
        const kind = l.kind ?? 'out';
        const frac = l.len ? prog(t, l.at * dur, (l.at + l.len) * dur) : 1;
        const part = kind === 'cmd' ? l.text.slice(0, Math.round(l.text.length * frac)) : l.text;
        const caret = l === last && (kind !== 'cmd' || frac < 1 || true) ? blink(t, 0, 1.0) : 0;
        let body: React.ReactNode = part;
        if (kind === 'cmd' && l.hl && l.text.indexOf(l.hl) >= 0) {
          const at = l.text.indexOf(l.hl);
          const a = part.slice(0, at), b = part.slice(at, at + l.hl.length), c = part.slice(at + l.hl.length);
          body = <>{a}<span style={{color: C.amberDim, fontWeight: 700}}>{b}</span>{c}</>;
        }
        const bar = kind === 'err' || kind === 'ok';
        return (
          <div key={i} style={{minHeight: 33, whiteSpace: 'pre', background: kind === 'err' ? C.red : kind === 'ok' ? C.green : 'transparent', margin: bar ? '2px -24px' : 0, padding: bar ? '0 24px' : 0, color: kind === 'dim' ? C.mute : kind === 'out' ? C.cyanDim : C.bg, fontWeight: bar ? 700 : 400}}>
            {kind === 'cmd' && <span style={{color: C.amberDim}}>{l.prompt ?? '$'}{(l.prompt ?? '$') === '' ? '  ' : ' '}</span>}
            {body}
            {caret > 0 && <span style={{display: 'inline-block', width: 12, height: 24, background: C.bg, verticalAlign: 'text-bottom', marginLeft: 2}} />}
          </div>
        );
      })}
    </div>
  );
};

const Win: React.FC<{t: number; dur: number; lines: TL[]; hi: string[]; sub: string}> = ({t, dur, lines, hi, sub}) => {
  const s = 1 + 0.06 * eio(t, 0, dur);
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: `${WX}px ${WY}px`, transform: `scale(${s})`}}>
      <div style={{position: 'absolute', left: WX, top: WY, width: WW, height: WH, border: `2px solid ${C.text}`, background: C.bg2, boxSizing: 'border-box', overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: 0, top: 0, right: 0, height: BAR, background: C.dim, color: C.bg2, fontFamily: F.mono, fontSize: 19, letterSpacing: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px'}}>
          <span>ff73-lab : zsh</span><span>{sub}</span>
        </div>
        <Tree hi={hi} />
        <Term lines={lines} t={t} dur={dur} />
      </div>
    </div>
  );
};

const Stage: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <>
    <div style={{position: 'absolute', inset: 0, background: C.bg}} />
    {children}
  </>
);
const cmd = (at: number, len: number, text: string, hl?: string, prompt = '$'): TL => ({at, len, kind: 'cmd', text, hl, prompt});
const FF1 = 'ffmpeg -v warning -f lavfi -i color=black \\';
const vf = (txt: string) => `  -vf "drawtext=...:${txt}" -frames:v 1 out.png`;

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t, dur}) => (
  <Stage>
    <Win t={t} dur={dur} hi={['f-percent.txt']} sub="768x64 gray, one frame" lines={[
      cmd(0.03, 0.12, FF1), cmd(0.16, 0.14, vf("text='100%'"), "text='100%'", ''),
      {at: 0.34, kind: 'err', text: "[Parsed_drawtext_0 @ 0x...] Stray % near ''"},
      cmd(0.42, 0.05, 'echo $?'), {at: 0.49, text: '0'},
      {at: 0.56, kind: 'dim', text: '# exit code 0. A warning, not an error.'},
      {at: 0.64, kind: 'dim', text: '# 0 ink pixels in the frame.'},
    ]} />
    <Card y={140} h={216} label="100% typed in quotes" color={C.red} o={ep(t, 0.38 * dur, 0.38 * dur + 0.7)}>
      <Pix f={FR.blank} x={107} y={42} s={2.5} />
      <CardText y={172} size={21} mono>blank, 0 ink pixels</CardText>
    </Card>
    <Card y={372} h={216} label="12:30 typed in quotes" color={C.red} o={ep(t, 0.62 * dur, 0.62 * dur + 0.7)}>
      <Pix f={FR.colonbad} x={107} y={42} s={2.5} />
      <CardText y={172} size={21} mono>12 in another font</CardText>
    </Card>
    <Card y={604} h={216} label="it's typed in quotes" color={C.red} o={ep(t, 0.8 * dur, 0.8 * dur + 0.7)}>
      <Pix f={FR.aposbad} x={107} y={42} s={2.5} />
      <CardText y={172} size={21} mono>its, no apostrophe</CardText>
    </Card>
    <Punch value="0 px" label="blank frame, exit code 0: nothing says it failed" color={C.red} o={ep(t, 0.5 * dur, 0.5 * dur + 0.7)} />
  </Stage>
);

/* 2. Two readers */
const Source: React.FC<SceneProps> = ({t, dur}) => (
  <Stage>
    <Win t={t} dur={dur} hi={['font.ttf', 'f-percent.txt']} sub="font.ttf, size 40, advance 24 px" lines={[
      cmd(0.03, 0.05, 'ls'),
      {at: 0.1, text: 'f-apostrophe.txt  f-backslash.txt  f-colon.txt'},
      {at: 0.1, text: 'f-percent.txt  font.ttf'},
      cmd(0.18, 0.1, FF1), cmd(0.29, 0.1, '  -vf "drawtext=...:textfile=f-percent.txt:\\', 'textfile=f-percent.txt:', ''),
      cmd(0.4, 0.1, '  expansion=none" -frames:v 1 -f framemd5 -', 'expansion=none', ''),
      {at: 0.56, text: '0, 0, 0, 1, 49152, fe6601ac1dfd36e222c9bf97f8c95c64'},
      {at: 0.66, kind: 'dim', text: '# reader 1: this hash against a reference render'},
      {at: 0.72, kind: 'dim', text: '# reader 2: 32 cells, 94 glyphs, read in Node'},
    ]} />
    <Card y={140} h={328} label="Reader 2: one cell per character" color={C.cyan} o={ep(t, 0.3 * dur, 0.3 * dur + 0.7)}>
      <Pix f={FR.clean} x={17} y={44} s={4} chars="it's " cellLines />
      <CardText y={44 + 192 + 52} size={19} mono color={C.dim}>decoded: it's, cells of 24 px</CardText>
    </Card>
    <Card y={484} h={160} label="Reader 1: frame md5" color={C.cyan} o={ep(t, 0.55 * dur, 0.55 * dur + 0.7)}>
      <CardText y={44} size={18} mono>frame      fe6601ac1dfd36e2...</CardText>
      <CardText y={72} size={18} mono>reference  fe6601ac1dfd36e2...</CardText>
      <CardText y={112} size={26} weight={700} color={C.green}>equal for 127 of 127 readable frames</CardText>
    </Card>
    <Card y={660} h={160} label="Control" color={C.green} o={ep(t, 0.74 * dur, 0.74 * dur + 0.7)}>
      <CardText x={14} y={38} w={170} size={86} weight={800} color={C.green} mono={false}><span style={{fontFamily: F.display}}>150</span></CardText>
      <CardText x={170} y={44} w={320} size={21}>random strings drawn from a text file, read back</CardText>
      <CardText x={170} y={112} w={320} size={26} weight={700} color={C.green}>0 mismatches</CardText>
    </Card>
    <Punch value="127 / 127" label="readable frames: both readers name the same text" color={C.green} o={ep(t, 0.62 * dur, 0.62 * dur + 0.7)} />
  </Stage>
);

/* 3. The percent sign */
const Percent: React.FC<SceneProps> = ({t, dur}) => (
  <Stage>
    <Win t={t} dur={dur} hi={['f-percent.txt', 'out.png']} sub="text=100%" lines={[
      cmd(0.03, 0.1, '... drawtext=...:text=\'100%\'', "text='100%'"),
      {at: 0.15, kind: 'err', text: "Stray % near ''     -> 0 ink pixels"},
      cmd(0.24, 0.1, '... drawtext=...:text=\'100\\%\'', "text='100\\%'"),
      {at: 0.36, kind: 'err', text: "Stray % near ''     -> 0 ink pixels"},
      cmd(0.46, 0.11, '... drawtext=...:text=\'100\\\\%\'', "text='100\\\\%'"),
      {at: 0.59, kind: 'ok', text: '(no warning)        -> 100%, 1224 ink pixels'},
      cmd(0.68, 0.12, '... drawtext=...:text=100\\\\\\\\%', 'text=100\\\\\\\\%'),
      {at: 0.82, kind: 'ok', text: '(no warning)        -> 100%, bare, 4 backslashes'},
    ]} />
    <Card y={140} h={232} label="Quoted, expansion on" color={C.text} o={ep(t, 0.08 * dur, 0.08 * dur + 0.7)}>
      <Strip x={17} y={44} data={GRID.percent_quoted} label="backslashes in front of the %" />
      <Legend x={17} y={118} />
      <CardText y={150} size={21}>2 or 3 draw it. 0 and 1: blank.</CardText>
    </Card>
    <Card y={388} h={232} label="Bare, expansion on" color={C.text} o={ep(t, 0.4 * dur, 0.4 * dur + 0.7)}>
      <Strip x={17} y={44} data={GRID.percent_bare} label="backslashes in front of the %" />
      <Legend x={17} y={118} />
      <CardText y={150} size={21}>4 to 7 draw it. 0 to 3: blank.</CardText>
    </Card>
    <Card y={636} h={184} label="The frame that works" color={C.green} o={ep(t, 0.58 * dur, 0.58 * dur + 0.7)}>
      <Pix f={FR.pctok} x={17} y={44} s={2.5} />
      <CardText x={340} y={54} w={160} size={20}>100%, read by both readers</CardText>
    </Card>
    <Punch value="2 or 4" label="backslashes for a percent sign, quoted or bare" color={C.green} o={ep(t, 0.5 * dur, 0.5 * dur + 0.7)} />
  </Stage>
);

/* 4. The colon and the apostrophe */
const Colon: React.FC<SceneProps> = ({t, dur}) => (
  <Stage>
    <Win t={t} dur={dur} hi={['f-colon.txt', 'f-apostrophe.txt']} sub="text=12:30 and text=it's" lines={[
      cmd(0.03, 0.1, '... drawtext=...:text=\'12:30\'', "text='12:30'"),
      {at: 0.15, kind: 'err', text: '(no warning)        -> 12, other font'},
      cmd(0.22, 0.12, '... drawtext=...:text=12:fontfile=30', 'text=12:fontfile=30'),
      {at: 0.36, kind: 'out', text: '(no warning)        -> same frame hash'},
      cmd(0.43, 0.1, '... drawtext=...:text=\'12\\:30\'', "text='12\\:30'"),
      {at: 0.55, kind: 'ok', text: '(no warning)        -> 12:30'},
      cmd(0.62, 0.09, '... drawtext=...:text=\'it\'s\'', "text='it's'"),
      {at: 0.73, kind: 'err', text: '(no warning)        -> its'},
      cmd(0.79, 0.12, "... drawtext=...:text='it'\\\\\\''s'", "text='it'\\\\\\''s'"),
      {at: 0.92, kind: 'ok', text: "(no warning)        -> it's"},
    ]} />
    <Card y={140} h={250} label="Same frame, three commands" color={C.red} o={ep(t, 0.2 * dur, 0.2 * dur + 0.7)}>
      <Pix f={FR.colonbad} x={17} y={44} s={2} />
      <CardText x={272} y={46} w={226} size={18} mono>12:30 quoted</CardText>
      <CardText x={272} y={72} w={226} size={18} mono>text=12:fontfile=30</CardText>
      <CardText x={272} y={98} w={226} size={18} mono>no fontfile at all</CardText>
      <CardText y={156} size={26} weight={700} color={C.red} mono>md5 87ddaf71...</CardText>
      <CardText y={196} size={20} color={C.dim}>all three equal: the 30 became the font file</CardText>
    </Card>
    <Card y={402} h={178} label="Apostrophe, quoted" color={C.text} o={ep(t, 0.6 * dur, 0.6 * dur + 0.7)}>
      <Pix f={FR.aposbad} x={17} y={44} s={1.9} />
      <Pix f={FR.aposok} x={269} y={44} s={1.9} />
      <CardText x={17} y={44 + 91 + 10} w={228} size={21} mono color={C.red} weight={700}>its</CardText>
      <CardText x={269} y={44 + 91 + 10} w={228} size={21} mono color={C.green} weight={700}>it's</CardText>
    </Card>
    <Card y={596} h={224} label="Backslashes in quotes" color={C.text} o={ep(t, 0.4 * dur, 0.4 * dur + 0.7)}>
      <Strip x={17} y={40} data={GRID.colon_quoted} label="12:30, colon" cw={44} />
      <Legend x={17} y={190} />
      <Strip x={17} y={116} data={GRID.apostrophe_quoted} label="it's, apostrophe" cw={44} />
    </Card>
    <Punch value="3" label="backslashes for an apostrophe, quoted or bare" color={C.green} o={ep(t, 0.5 * dur, 0.5 * dur + 0.7)} />
  </Stage>
);

/* 5. The backslash */
const Backslash: React.FC<SceneProps> = ({t, dur}) => (
  <Stage>
    <Win t={t} dur={dur} hi={['f-backslash.txt']} sub="text=a\b" lines={[
      cmd(0.03, 0.1, '... drawtext=...:text=\'a\\b\'', "text='a\\b'"),
      {at: 0.15, kind: 'err', text: '(no warning)        -> ab'},
      cmd(0.24, 0.12, '... drawtext=...:text=\'a\\\\\\\\b\'', "text='a\\\\\\\\b'"),
      {at: 0.38, kind: 'ok', text: '(no warning)        -> a\\b, 4 backslashes'},
      cmd(0.48, 0.12, "... drawtext=...:text='{x} }'", "text='{x} }'"),
      {at: 0.62, kind: 'out', text: '(no warning)        -> {x} }, harmless'},
      cmd(0.7, 0.11, "... drawtext=...:text='%{pts}'", "text='%{pts}'"),
      {at: 0.83, kind: 'err', text: '(no warning)        -> 0.000000, the time'},
    ]} />
    <Card y={140} h={186} label="a\b quoted, 1 and 4 backslashes" color={C.text} o={ep(t, 0.15 * dur, 0.15 * dur + 0.7)}>
      <Pix f={FR.bsbad} x={17} y={44} s={1.9} />
      <Pix f={FR.bsok} x={269} y={44} s={1.9} />
      <CardText x={17} y={44 + 91 + 8} w={228} size={21} mono color={C.red} weight={700}>ab</CardText>
      <CardText x={269} y={44 + 91 + 8} w={228} size={21} mono color={C.green} weight={700}>a\b</CardText>
    </Card>
    <Card y={342} h={232} label="Backslash count needed" color={C.text} o={ep(t, 0.3 * dur, 0.3 * dur + 0.7)}>
      <Strip x={17} y={44} data={GRID.backslash_quoted} label="quoted: 4 to 7 draw it" />
      <Strip x={17} y={116} data={GRID.backslash_bare} label="bare: 8 and 9 draw it" />
      <Legend x={17} y={188} />
    </Card>
    <Card y={590} h={230} label="%{pts} is a function" color={C.red} o={ep(t, 0.83 * dur, 0.83 * dur + 0.7)}>
      <Pix f={FR.pts} x={17} y={44} s={2.4} />
      <CardText y={44 + 115 + 10} size={20}>0.000000: the timestamp, 2478 ink pixels</CardText>
    </Card>
    <Punch value="4 or 8" label="backslashes to draw one, quoted or bare" color={C.green} o={ep(t, 0.45 * dur, 0.45 * dur + 0.7)} />
  </Stage>
);

/* 6. The rule */
const row = (c: string, v: number[]) => ` ${c}  ${String(v[0]).padStart(6)}${String(v[1]).padStart(8)} |${String(v[2]).padStart(7)}${String(v[3]).padStart(8)}`;
const T16 = [
  ['%', '4', '2', '0', '0'],
  [':', '2', '1', '2', '1'],
  ["'", '3', '3', '3', '3'],
  ['\\', '8', '4', '4', '2'],
];
const Rule: React.FC<SceneProps> = ({t, dur}) => (
  <Stage>
    <Win t={t} dur={dur} hi={['f-percent.txt', 'f-colon.txt', 'f-apostrophe.txt', 'f-backslash.txt']} sub="minimum backslashes" lines={[
      cmd(0.03, 0.12, 'node episodes/ff73/fixture/run.mjs'),
      {at: 0.17, kind: 'dim', text: '# fewest backslashes that draw the string'},
      {at: 0.2, kind: 'dim', text: '     expansion on  | expansion=none'},
      {at: 0.2, text: '      bare  quoted |   bare  quoted'},
      {at: 0.26, text: row('%', [4, 2, 0, 0])},
      {at: 0.32, text: row(':', [2, 1, 2, 1])},
      {at: 0.38, text: row("'", [3, 3, 3, 3])},
      {at: 0.44, text: row('\\', [8, 4, 4, 2])},
      {at: 0.52, kind: 'ok', text: 'model: 16 of 16 minimums predicted'},
      cmd(0.62, 0.1, '... textfile=f-colon.txt:expansion=none', 'textfile=f-colon.txt:expansion=none'),
      {at: 0.74, kind: 'ok', text: '"12:30", all four strings exact'},
    ]} />
    <Card y={140} h={250} label="Three parsers, one level each" color={C.text} o={ep(t, 0.3 * dur, 0.3 * dur + 0.7)}>
      {[['1  filter graph', 'quotes skip it'], ['2  option list', 'always applies'], ['3  drawtext expansion', 'expansion=none skips it']].map(([a, b], i) => (
        <React.Fragment key={a}>
          <CardText y={46 + i * 66} size={25} weight={700}>{a}</CardText>
          <CardText y={46 + i * 66 + 30} size={20} color={C.dim}>{b}</CardText>
        </React.Fragment>
      ))}
    </Card>
    <Card y={406} h={196} label="a\b: backslashes needed" color={C.cyan} o={ep(t, 0.48 * dur, 0.48 * dur + 0.7)}>
      {T16[3].slice(1).map((v, i) => (
        <div key={i} style={{position: 'absolute', left: 17 + i * 120, top: 44, width: 112, textAlign: 'center'}}>
          <div style={{fontFamily: F.display, fontWeight: 800, fontSize: 84, lineHeight: 1, color: i === 1 ? C.green : C.text}}>{v}</div>
          <div style={{fontFamily: F.mono, fontSize: 15, color: C.dim, lineHeight: 1.2}}>{['bare', 'quoted', 'bare, none', 'quoted, none'][i]}</div>
        </div>
      ))}
    </Card>
    <Card y={618} h={202} label="The clean route" color={C.green} o={ep(t, 0.72 * dur, 0.72 * dur + 0.7)}>
      <Pix f={FR.clean} x={17} y={44} s={1.9} />
      <Pix f={FR.pctok} x={269} y={44} s={1.9} />
      <CardText x={17} y={44 + 91 + 8} w={470} size={20}>textfile + expansion=none: all four strings exact</CardText>
    </Card>
    <Punch value="16 / 16" label="minimum counts predicted by the three level rule" color={C.green} o={ep(t, 0.6 * dur, 0.6 * dur + 0.7)} />
  </Stage>
);

/* 7. Close */
const Close: React.FC<SceneProps> = ({t, dur}) => (
  <Stage>
    <Win t={t} dur={dur} hi={['out.png']} sub="what to check" lines={[
      cmd(0.02, 0.04, 'echo $?'), {at: 0.07, text: '0'},
      {at: 0.1, kind: 'dim', text: '# 0 here proves nothing: the frame can be blank.'},
      {at: 0.17, kind: 'ok', text: 'check: ink pixels, stderr, the frame itself'},
      {at: 0.26, kind: 'dim', text: '# not tested:'},
      {at: 0.3, kind: 'dim', text: '#   other fonts, other ffmpeg builds'},
      {at: 0.34, kind: 'dim', text: '#   shell and Windows quoting, real footage'},
      {at: 0.42, kind: 'dim', text: '# measured on ffmpeg 6.1.1 only'},
    ]} />
    <Card y={140} h={178} label="Exit code" color={C.red} o={ep(t, 0.08 * dur, 0.08 * dur + 0.7)}>
      <div style={{position: 'absolute', left: 17, top: 36, fontFamily: F.display, fontWeight: 800, fontSize: 100, color: C.red, lineHeight: 1}}>0</div>
      <CardText x={110} y={64} w={380} size={22}>on every blank frame</CardText>
    </Card>
    <Card y={334} h={178} label="Ink pixels" color={C.green} o={ep(t, 0.16 * dur, 0.16 * dur + 0.7)}>
      <div style={{position: 'absolute', left: 17, top: 36, fontFamily: F.display, fontWeight: 800, fontSize: 100, color: C.green, lineHeight: 1}}>1224</div>
      <CardText x={220} y={64} w={270} size={22}>for 100%, drawn right; 0 when blank</CardText>
    </Card>
    <Card y={528} h={178} label="Clean route" color={C.green} o={ep(t, 0.24 * dur, 0.24 * dur + 0.7)}>
      <CardText y={44} size={23} weight={700}>textfile=...:expansion=none</CardText>
      <CardText y={84} size={21} color={C.dim}>no backslash counting, all four strings exact</CardText>
    </Card>
    <Punch value="Exit 0" label="is not proof that any text was drawn" color={C.red} o={ep(t, 0.16 * dur, 0.16 * dur + 0.7)} />
  </Stage>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, percent: Percent, colon: Colon, backslash: Backslash, rule: Rule, close: Close};
