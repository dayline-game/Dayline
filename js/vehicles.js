/* DAYLINE — low-poly vehicle models, accessories, pixel-livery texturing and the shop catalogue */
'use strict';
(function (DL) {

  // ---------- catalogue (prices in coins) ----------
  DL.CARS = {
    ufo:     { name: 'UFO', cls: 'Weekly champion', price: 0, kind: 'ufo', unique: true, blurb: 'Hovers, no wheels. Awarded to the winner of last week’s Weekly cup, for one week only.',
      W: 2.4, lower: [[-1.9, .5], [-1.2, .25], [1.2, .25], [1.9, .5], [1.2, .85], [-1.2, .85]], cabin: [[.8, .85], [.4, 1.25], [-.4, 1.25], [-.8, .85]], cw: .7, wz: [], wr: .3, wx: .9 },
    pebble:  { name: 'Pebble', cls: 'Hatch', price: 0, blurb: 'The car everyone starts in. Chunky, honest, quick.',
      W: 1.9, lower: [[-2.0, .32], [2.0, .32], [2.1, .6], [2.0, .86], [1.0, 1.02], [-1.95, 1.05], [-2.08, .72]],
      cabin: [[1.05, 1.0], [.2, 1.72], [-1.55, 1.72], [-1.95, 1.02]], cw: .84, wz: [1.3, -1.3], wr: .38, wx: .86 },
    comet:   { name: 'Comet', cls: 'Sports', price: 650, blurb: 'Long nose, low roof, all attitude.', feat: 'comet',
      W: 2.12, lower: [[-2.2, .24], [2.2, .24], [2.4, .4], [2.25, .6], [.5, .8], [-1.6, .9], [-2.25, .82]],
      cabin: [[.55, .8], [-.25, 1.2], [-1.0, 1.22], [-1.75, .9]], cw: .74, wz: [1.5, -1.45], wr: .36, wx: .92 },
    rallye:  { name: 'Rallye', cls: 'Rally', price: 800, blurb: 'Boxy stage-car stance with a raised ride.', feat: 'rallye',
      W: 1.98, lower: [[-1.9, .5], [1.95, .5], [2.05, .72], [1.95, 1.0], [1.0, 1.12], [-1.9, 1.14], [-2.0, .8]],
      cabin: [[1.0, 1.1], [.4, 1.84], [-1.7, 1.86], [-1.9, 1.12]], cw: .84, wz: [1.3, -1.3], wr: .45, wx: .9 },
    mule:    { name: 'Mule', cls: 'Van', price: 700, blurb: 'A delivery van that refuses to deliver slowly.', paintCabin: true, feat: 'mule',
      W: 1.95, lower: [[-2.3, .4], [2.3, .4], [2.4, .66], [2.3, 1.0], [1.6, 1.15], [-2.3, 1.15], [-2.38, .75]],
      cabin: [[1.6, 1.12], [.95, 2.25], [-2.3, 2.3], [-2.3, 1.12]], cw: .96, wz: [1.5, -1.5], wr: .4, wx: .88, windows: true },
    ridge:   { name: 'Ridge', cls: 'Off-road', price: 950, blurb: 'Pickup on big tyres. Looks like it climbs walls.', feat: 'ridge',
      W: 2.05, lower: [[-2.2, .62], [2.2, .62], [2.3, .88], [2.2, 1.18], [1.2, 1.28], [-2.2, 1.28], [-2.3, .98]],
      cabin: [[1.2, 1.25], [.6, 1.98], [-.6, 1.98], [-.85, 1.25]], cw: .9, wz: [1.4, -1.4], wr: .53, wx: .92, bed: true },
    vintage: { name: 'Vintage', cls: 'Classic', price: 1100, blurb: 'Sixties coupe lines in angular low-poly.', feat: 'vintage',
      W: 1.85, lower: [[-2.2, .35], [2.2, .35], [2.3, .55], [2.1, .8], [1.0, .92], [-1.4, .95], [-2.0, .85], [-2.3, .6]],
      cabin: [[.6, .92], [.0, 1.42], [-.8, 1.42], [-1.4, .95]], cw: .8, wz: [1.45, -1.45], wr: .34, wx: .82 },
    bubble:  { name: 'Bubble', cls: 'Micro', price: 1250, blurb: 'Mostly windscreen. Entirely joyful.', feat: 'bubble',
      W: 1.6, lower: [[-1.4, .3], [1.4, .3], [1.55, .55], [1.4, .8], [.9, .95], [-1.3, .98], [-1.5, .7]],
      cabin: [[.9, .92], [.6, 1.1], [-.6, 1.18], [-1.25, 1.05], [-1.35, .95]], cw: .7, wz: [.95, -.95], wr: .3, wx: .72 },
    loaf:    { name: 'Loaf', cls: 'Oddball', price: 1500, blurb: 'A breadbin on wheels. Same pace as everything else.', paintCabin: true, feat: 'loaf',
      W: 1.85, lower: [[-1.8, .35], [1.8, .35], [1.86, 1.3], [-1.86, 1.3]],
      cabin: [[1.62, 1.28], [1.5, 2.05], [-1.7, 2.08], [-1.82, 1.28]], cw: .95, wz: [1.25, -1.25], wr: .34, wx: .84, windows: true },
    // ---------- v2.5: twenty new cars for the shop rotation ----------
    frank:   { name: 'Frank', cls: 'Snack', price: 1400, blurb: 'A hot dog with a sausage on top. Mustard included, ketchup extra.', feat: 'frank',
      W: 2.0, lower: [[-2.1, .42], [2.1, .42], [2.35, .7], [2.3, 1.0], [1.7, 1.15], [-1.7, 1.15], [-2.3, 1.0], [-2.35, .7]],
      cabin: [[1.2, 1.12], [.85, 1.5], [-1.0, 1.5], [-1.3, 1.12]], cw: .62, wz: [1.35, -1.35], wr: .4, wx: .88 },
    tub:     { name: 'Splash', cls: 'Bathtub', price: 1300, blurb: 'Claw feet, hot water, one rubber duck. Bath time is race time.', feat: 'tub', paintCabin: true,
      W: 1.9, lower: [[-1.9, .42], [1.9, .42], [2.05, .75], [2.05, 1.3], [1.8, 1.32], [-1.8, 1.32], [-2.05, 1.3], [-2.05, .75]],
      cabin: [[-1.1, 1.3], [-1.45, 1.72], [-1.9, 1.72], [-1.95, 1.3]], cw: .96, wz: [1.3, -1.3], wr: .34, wx: .86 },
    scoop:   { name: 'Scoop', cls: 'Ice cream van', price: 1200, blurb: 'Plays a little tune, sells nothing, finishes first.', feat: 'scoop', paintCabin: true, windows: true,
      W: 1.95, lower: [[-2.3, .4], [2.3, .4], [2.4, .66], [2.3, 1.0], [1.6, 1.15], [-2.3, 1.15], [-2.38, .75]],
      cabin: [[1.6, 1.12], [.95, 2.25], [-2.3, 2.3], [-2.3, 1.12]], cw: .96, wz: [1.5, -1.5], wr: .4, wx: .88 },
    hailer:  { name: 'Hailer', cls: 'Taxi', price: 700, blurb: 'Meter running. Checkered stripe, roof sign, no tips.', feat: 'hailer',
      W: 1.95, lower: [[-2.25, .34], [2.25, .34], [2.35, .6], [2.25, .86], [1.1, 1.0], [-1.6, 1.02], [-2.3, .9], [-2.35, .62]],
      cabin: [[1.1, .98], [.35, 1.62], [-1.1, 1.62], [-1.65, 1.0]], cw: .84, wz: [1.45, -1.45], wr: .37, wx: .88 },
    stretch: { name: 'Stretch', cls: 'Limousine', price: 1800, blurb: 'Six metres of chrome and attitude. Corners are a group decision.', feat: 'stretch',
      W: 1.95, lower: [[-3.0, .34], [3.0, .34], [3.1, .6], [3.0, .86], [1.9, 1.0], [-2.4, 1.02], [-3.05, .9], [-3.1, .62]],
      cabin: [[1.9, .98], [1.2, 1.6], [-1.9, 1.6], [-2.4, 1.0]], cw: .84, wz: [2.05, -2.1], wr: .37, wx: .88 },
    stomper: { name: 'Stomper', cls: 'Monster truck', price: 2200, blurb: 'Tyres taller than you. Suspension you could live in.', feat: 'stomper',
      W: 2.3, lower: [[-2.0, 1.45], [2.0, 1.45], [2.15, 1.75], [2.05, 2.05], [1.0, 2.15], [-2.0, 2.18], [-2.15, 1.85]],
      cabin: [[1.0, 2.13], [.45, 2.8], [-1.1, 2.8], [-1.45, 2.16]], cw: .86, wz: [1.45, -1.45], wr: .85, wx: 1.0 },
    arrow:   { name: 'Arrow', cls: 'Open-wheeler', price: 2400, blurb: 'Wheels out, wings on, nose like a needle.', feat: 'arrow', open: true, openTop: true, noFrame: true,
      W: 1.0, lower: [[-1.95, .22], [2.3, .22], [2.5, .3], [2.45, .42], [1.0, .62], [-.6, .78], [-1.8, .78], [-2.0, .6]],
      cabin: [[.4, .72], [.15, .95], [-.7, .95], [-.8, .76]], cw: .7, wz: [1.65, -1.45], wr: .42, wx: 2.0 },
    brute:   { name: 'Brute', cls: 'Muscle', price: 1300, blurb: 'A supercharger poking out of the bonnet, side pipes, zero subtlety.', feat: 'brute',
      W: 2.0, lower: [[-2.3, .36], [2.3, .36], [2.45, .62], [2.35, .92], [.6, 1.04], [-1.5, 1.06], [-2.3, .96], [-2.42, .66]],
      cabin: [[.6, 1.02], [-.05, 1.58], [-1.0, 1.58], [-1.55, 1.05]], cw: .8, wz: [1.6, -1.5], wr: .4, wx: .92 },
    wedge:   { name: 'Wedge', cls: 'Supercar', price: 1700, blurb: 'Pure eighties: pop-up lights, louvres, a ruler for a nose.', feat: 'wedge',
      W: 2.05, lower: [[-2.25, .3], [2.35, .3], [2.5, .42], [2.45, .55], [.4, .95], [-1.9, 1.0], [-2.3, .9], [-2.35, .6]],
      cabin: [[.5, .93], [-.25, 1.3], [-1.3, 1.3], [-1.85, .99]], cw: .78, wz: [1.5, -1.45], wr: .36, wx: .92 },
    caddy:   { name: 'Caddy', cls: 'Golf cart', price: 900, blurb: 'Fore! Canopy roof, bag of clubs, surprisingly rapid.', feat: 'caddy', openTop: true,
      W: 1.5, lower: [[-1.4, .32], [1.45, .32], [1.55, .5], [1.5, .7], [.9, .78], [-1.4, .82], [-1.5, .6]],
      cabin: [[.85, .76], [.75, 1.85], [-.65, 1.85], [-.7, .8]], cw: .9, wz: [.95, -.95], wr: .27, wx: .82 },
    blaze:   { name: 'Blaze', cls: 'Fire engine', price: 1900, blurb: 'Ladder, lights, hose reel. Arrives before the fire does.', feat: 'blaze',
      W: 2.05, lower: [[-2.8, .42], [2.6, .42], [2.7, .7], [2.62, 1.1], [1.4, 1.2], [1.35, 2.1], [-2.8, 2.1], [-2.85, .8]],
      cabin: [[2.5, 1.12], [2.2, 2.05], [1.4, 2.05], [1.38, 1.18]], cw: .9, wz: [1.75, -1.7], wr: .45, wx: .9 },
    nomad:   { name: 'Nomad', cls: 'Camper', price: 1500, blurb: 'Awning out, bike on the back, permanently on holiday.', feat: 'nomad',
      W: 2.05, lower: [[-2.6, .42], [2.4, .42], [2.5, .7], [2.4, 1.05], [1.6, 1.15], [1.55, 2.6], [-2.6, 2.6], [-2.65, .8]],
      cabin: [[2.3, 1.1], [1.75, 1.95], [1.58, 1.95], [1.58, 1.15]], cw: .9, wz: [1.6, -1.6], wr: .42, wx: .9 },
    dune:    { name: 'Dune', cls: 'Beach buggy', price: 1100, blurb: 'Roll cage, surfboard, sand in places sand should not be.', feat: 'dune', openTop: true,
      W: 2.0, lower: [[-1.7, .5], [1.8, .5], [2.0, .7], [1.95, .88], [.7, 1.0], [-1.0, 1.0], [-1.75, .95], [-1.85, .7]],
      cabin: [[.7, .98], [.45, 1.75], [-1.0, 1.75], [-1.1, 1.0]], cw: .82, wz: [1.3, -1.3], wr: .5, wx: 1.0 },
    toasty:  { name: 'Toasty', cls: 'Toaster', price: 1600, blurb: 'Two slices loaded. Pops at the finish line.', feat: 'toasty', paintCabin: true,
      W: 1.8, lower: [[-1.65, .38], [1.65, .38], [1.75, .62], [1.75, 1.95], [1.55, 2.05], [-1.55, 2.05], [-1.75, 1.95], [-1.75, .62]],
      cabin: [[1.3, 2.03], [1.25, 2.08], [-1.25, 2.08], [-1.3, 2.03]], cw: .9, wz: [1.1, -1.1], wr: .33, wx: .86 },
    booster: { name: 'Booster', cls: 'Rocket car', price: 2600, blurb: 'Twin thrusters glowing hot. Same top speed, much more drama.', feat: 'booster',
      W: 1.9, lower: [[-2.3, .3], [2.6, .3], [2.8, .42], [2.7, .55], [.8, .9], [-1.7, 1.0], [-2.3, .95], [-2.35, .6]],
      cabin: [[.8, .88], [.1, 1.3], [-.8, 1.3], [-1.4, .98]], cw: .7, wz: [1.7, -1.5], wr: .36, wx: .92 },
    chomp:   { name: 'Chomp', cls: 'Shark', price: 1700, blurb: 'Dorsal fin, gills and a grille full of teeth. Smells blood (and fuel).', feat: 'chomp',
      W: 1.95, lower: [[-2.25, .3], [2.3, .3], [2.45, .48], [2.35, .68], [.8, .9], [-1.6, .98], [-2.25, .86], [-2.35, .58]],
      cabin: [[.8, .88], [.05, 1.38], [-.95, 1.38], [-1.6, .98]], cw: .78, wz: [1.5, -1.45], wr: .36, wx: .9 },
    couch:   { name: 'Couch', cls: 'Sofa', price: 1400, blurb: 'Cushions, a floor lamp and the remote. Racing from the comfort of home.', feat: 'couch', paintCabin: true,
      W: 2.1, lower: [[-1.6, .38], [1.6, .38], [1.7, .55], [1.7, 1.0], [1.5, 1.05], [-1.55, 1.05], [-1.7, 1.0], [-1.7, .55]],
      cabin: [[-.8, 1.03], [-1.0, 1.95], [-1.6, 1.95], [-1.65, 1.03]], cw: .95, wz: [1.05, -1.05], wr: .25, wx: .85 },
    shard:   { name: 'Shard', cls: 'Electric pickup', price: 2000, blurb: 'Folded from one sheet of steel. Light bar front and back.', feat: 'shard',
      W: 2.1, lower: [[-2.4, .55], [2.4, .55], [2.55, .75], [2.5, 1.05], [1.4, 1.2], [-2.45, 1.25], [-2.5, .9]],
      cabin: [[1.4, 1.18], [.05, 1.95], [-2.45, 1.25]], cw: .9, wz: [1.6, -1.6], wr: .48, wx: .92 },
    slice:   { name: 'Slice', cls: 'Pizza delivery', price: 800, blurb: 'Giant slice on the roof, hot boxes in the back, thirty minutes or less.', feat: 'slice',
      W: 1.85, lower: [[-1.85, .32], [1.9, .32], [2.0, .6], [1.9, .86], [.95, 1.0], [-1.8, 1.02], [-1.95, .72]],
      cabin: [[1.0, .98], [.2, 1.65], [-1.4, 1.65], [-1.8, 1.0]], cw: .84, wz: [1.25, -1.25], wr: .36, wx: .86 },
    dodgem:  { name: 'Dodgem', cls: 'Bumper car', price: 1000, blurb: 'Rubber ring, spark pole, fairground lights. Bumping not allowed.', feat: 'dodgem', paintCabin: true,
      W: 1.9, lower: [[-1.5, .3], [1.5, .3], [1.7, .5], [1.7, .8], [1.2, .95], [-1.3, .95], [-1.7, .85], [-1.75, .5]],
      cabin: [[-.7, .93], [-.95, 1.5], [-1.5, 1.5], [-1.55, .93]], cw: .8, wz: [.9, -.9], wr: .22, wx: .8 },
    nocturne: { name: 'Nocturne', cls: 'Hypercar', price: 2800, blurb: 'Built for 24 hours flat out: shark fin, roof scoop, a wing the size of a door.', feat: 'nocturne',
      W: 2.1, lower: [[-2.7, .22], [2.7, .22], [2.92, .29], [2.88, .4], [2.1, .58], [1.2, .64], [.3, .7], [-1.2, .84], [-2.7, .86], [-2.84, .5]],
      cabin: [[1.05, .68], [.45, 1.2], [-.6, 1.26], [-1.6, .88]], cw: .48, wz: [1.8, -1.75], wr: .42, wx: .93 },
    // Blender-modelled (models_gt3.js): lower/cabin are only rough outlines for the code that sizes add-ons; the real hull comes from the model
    apex: { name: 'Apex GT3', cls: 'GT3', price: 2400, blurb: 'Track-day weapon: wide arches, bonnet louvres and a wing you can park a bike under.', feat: 'apex', model: 'gt3',
      W: 2.2, lower: [[-2.38, .28], [-2.2, .16], [2.3, .16], [2.36, .5], [1.0, .92], [-2.0, .98]],
      cabin: [[.8, .93], [.2, 1.3], [-.95, 1.38], [-1.55, 1.0]], cw: .66, wz: [1.45, -1.45], wr: .38, wx: .83 }
  };
  DL.CAR_ORDER = ['pebble', 'comet', 'rallye', 'mule', 'ridge', 'vintage', 'bubble', 'loaf',
    'slice', 'hailer', 'caddy', 'dodgem', 'dune', 'scoop', 'brute', 'tub', 'frank', 'couch', 'nomad', 'toasty', 'wedge', 'chomp', 'stretch', 'blaze', 'shard', 'stomper', 'arrow', 'booster', 'nocturne', 'apex'];

  DL.PARTS = {
    spoiler: [
      { id: 'none', name: 'No spoiler', price: 0 }, { id: 'lip', name: 'Lip spoiler', price: 80 },
      { id: 'ducktail', name: 'Ducktail', price: 140 }, { id: 'wing', name: 'Big wing', price: 220 }, { id: 'rack', name: 'Roof rack', price: 160 }],
    wheels: [
      { id: 'std', name: 'Steelies', price: 0 }, { id: 'spoke', name: 'Five-spoke', price: 90 },
      { id: 'dish', name: 'Cream dish', price: 130 }, { id: 'knobby', name: 'Knobblies', price: 170 }, { id: 'gold', name: 'Gold rims', price: 280 }],
    bumper: [
      { id: 'std', name: 'Stock bumper', price: 0 }, { id: 'pods', name: 'Rally light pods', price: 140 }, { id: 'bullbar', name: 'Bull bar', price: 180 }],
    exhaust: [
      { id: 'none', name: 'Clean exhaust', price: 0 }, { id: 'smoke', name: 'White smoke', price: 70 },
      { id: 'coral', name: 'Coral smoke', price: 130 }, { id: 'flame', name: 'Backfire flames', price: 320 }],
    trail: [
      { id: 'none', name: 'No trail', price: 0 }, { id: 'cream', name: 'Cream ribbon', price: 150 },
      { id: 'coral', name: 'Coral ribbon', price: 200 }, { id: 'navy', name: 'Navy ribbon', price: 150 }, { id: 'sunset', name: 'Sunset ribbon', price: 360 }],
    finish: [
      { id: 'matte', name: 'Matte', price: 0 }, { id: 'gloss', name: 'Gloss', price: 100 },
      { id: 'metal', name: 'Metallic', price: 220 }, { id: 'pearl', name: 'Pearl', price: 320 }],
    plate: [
      { id: 'none', name: 'No plates', price: 0 }, { id: 'cream', name: 'Cream plates', price: 60 },
      { id: 'yellow', name: 'Yellow plates', price: 90 }, { id: 'navy', name: 'Navy plates', price: 90 }, { id: 'coral', name: 'Coral plates', price: 120 }],
    tint: [
      { id: 'clear', name: 'Clear glass', price: 0 }, { id: 'smoke', name: 'Smoke tint', price: 70 },
      { id: 'blue', name: 'Blue tint', price: 90 }, { id: 'amber', name: 'Amber tint', price: 90 }, { id: 'rose', name: 'Rose tint', price: 110 }],
    stickers: [
      { id: 'basic', name: 'Basic stamps', price: 0 }, { id: 'speed', name: 'Speed stamps', price: 110 }, { id: 'icons', name: 'Icon stamps', price: 150 }]
  };
  DL.PART_LABELS = { spoiler: 'Spoilers', wheels: 'Wheels', bumper: 'Bumpers', exhaust: 'Exhaust', trail: 'Trails', finish: 'Paint finish', plate: 'Number plates', tint: 'Window tint', stickers: 'Sticker packs' };
  DL.PLATE_STYLES = { cream: ['#f3ead7', '#1c2536', '#1c2536'], yellow: ['#f2c14e', '#1c2536', '#1c2536'], navy: ['#1c2536', '#f3ead7', '#f05a35'], coral: ['#f05a35', '#f3ead7', '#1c2536'] };
  DL.TINTS = { smoke: [0x0b0d12, 0.8], blue: [0x24489a, 0.62], amber: [0xb8701c, 0.58], rose: [0xb04a6b, 0.58] };
  DL.plateText = t => String(t || 'DAYLINE').toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 7).trim() || 'DAYLINE';
  DL.TRAIL_COLORS = { cream: [0xf4ecdc, 0xf4ecdc], coral: [0xf05a35, 0xf7a072], navy: [0x1f2a3d, 0x4b5b74], sunset: [0xf05a35, 0xf2c14e] };

  // ---------- livery helpers ----------
  DL.defaultLivery = function () {
    const W = DL.ATLAS_W, a = new Uint8Array(W * DL.ATLAS_H);
    const set = (x, y, c) => { if (x >= 0 && x < W && y >= 0 && y < DL.ATLAS_H) a[y * W + x] = c; };
    const P = DL.PANELS;
    for (const side of ['left', 'right']) {
      const p = P[side];
      for (let x = 0; x < p.w; x++) { set(p.x + x, p.y + 6, 13); set(p.x + x, p.y + 7, 13); }
      // navy roundel with a cream "1"
      const st = DL.STAMPS.roundel, ox = p.x + 12, oy = p.y + 1;
      for (let j = 0; j < st.h; j++) for (let i = 0; i < st.w; i++) if (st.rows[j][i] === '1') set(ox + i, oy + j, 2);
      const d = DL.DIGITS[1];
      for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (d[j * 3 + i] === '1') set(ox + 2 + i, oy + 1 + j, 8);
    }
    const t = P.top;
    for (let x = 0; x < t.w; x++) { set(t.x + x, t.y + 4, 13); set(t.x + x, t.y + 7, 13); }
    for (let x = 0; x < P.front.w; x++) set(P.front.x + x, P.front.y + 7, 13);
    for (let x = 0; x < P.rear.w; x++) set(P.rear.x + x, P.rear.y + 7, 2);
    return a;
  };
  DL.DEFAULT_BASE = 8;

  DL.drawLiveryCanvas = function (canvas, livery, baseIdx) {
    const W = DL.ATLAS_W, H = DL.ATLAS_H;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = DL.PALETTE[baseIdx] || DL.PALETTE[DL.DEFAULT_BASE]; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < livery.length; i++) if (livery[i]) { ctx.fillStyle = DL.PALETTE[livery[i]]; ctx.fillRect(i % W, (i / W) | 0, 1, 1); }
  };

  DL.drawGridCanvas = function (canvas, livery, baseIdx) {
    const S = 8, W = DL.ATLAS_W, H = DL.ATLAS_H;
    if (canvas.width !== W * S) { canvas.width = W * S; canvas.height = H * S; }
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = DL.PALETTE[baseIdx] || DL.PALETTE[DL.DEFAULT_BASE]; ctx.fillRect(0, 0, W * S, H * S);
    for (let i = 0; i < livery.length; i++) if (livery[i]) { ctx.fillStyle = DL.PALETTE[livery[i]]; ctx.fillRect((i % W) * S, ((i / W) | 0) * S, S, S); }
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(20,28,40,.42)'; ctx.beginPath();
    for (let x = 0; x <= W; x++) { ctx.moveTo(x * S + .5, 0); ctx.lineTo(x * S + .5, H * S); }
    for (let y = 0; y <= H; y++) { ctx.moveTo(0, y * S + .5); ctx.lineTo(W * S, y * S + .5); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.beginPath();
    for (let x = 0; x <= W; x++) { ctx.moveTo(x * S + 1.5, 0); ctx.lineTo(x * S + 1.5, H * S); }
    for (let y = 0; y <= H; y++) { ctx.moveTo(0, y * S + 1.5); ctx.lineTo(W * S, y * S + 1.5); }
    ctx.stroke();
  };

  const FINISH = {
    matte: { roughness: 0.85, metalness: 0.0 }, gloss: { roughness: 0.32, metalness: 0.05 },
    metal: { roughness: 0.28, metalness: 0.6 }, pearl: { roughness: 0.18, metalness: 0.32 }
  };

  // ---------- geometry builders ----------
  const PERM = new THREE.Matrix4();
  function extrudeProfile(points, width) {
    const sh = new THREE.Shape(points.map(p => new THREE.Vector2(p[0], p[1])));
    const g = new THREE.ExtrudeGeometry(sh, { depth: width, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 1, curveSegments: 1 });
    // shape x -> car z, shape y -> car y, extrude z -> car x (centered)
    PERM.set(0, 0, -1, width / 2, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1);
    g.applyMatrix4(PERM);
    const ng = g.toNonIndexed(); ng.computeVertexNormals(); g.dispose();
    return ng;
  }

  // Project UVs into the livery atlas from each face's dominant direction.
  function projectUVs(geo, bb) {
    const pos = geo.attributes.position.array, n = pos.length / 9;
    const uv = new Float32Array(n * 6);
    const W = DL.ATLAS_W, H = DL.ATLAS_H, P = DL.PANELS;
    const L = bb.maxZ - bb.minZ, Wd = bb.maxX - bb.minX, Hh = bb.maxY - bb.minY;
    const cl = v => DL.clamp(v, 0.001, 0.999);
    const put = (k, panel, u, v) => { uv[k * 2] = (panel.x + cl(u) * panel.w) / W; uv[k * 2 + 1] = 1 - (panel.y + (1 - cl(v)) * panel.h) / H; };
    const spare = { x: 28, y: 36, w: 1, h: 1 };
    for (let t = 0; t < n; t++) {
      const o = t * 9;
      const ax = pos[o], ay = pos[o + 1], az = pos[o + 2], bx = pos[o + 3], by = pos[o + 4], bz = pos[o + 5], cx = pos[o + 6], cy = pos[o + 7], cz = pos[o + 8];
      const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const anx = Math.abs(nx), any = Math.abs(ny), anz = Math.abs(nz);
      for (let q = 0; q < 3; q++) {
        const x = pos[o + q * 3], y = pos[o + q * 3 + 1], z = pos[o + q * 3 + 2], k = t * 3 + q;
        if (anx >= any && anx >= anz) {
          if (nx > 0) put(k, P.left, (bb.maxZ - z) / L, (y - bb.minY) / Hh);
          else put(k, P.right, (z - bb.minZ) / L, (y - bb.minY) / Hh);
        } else if (any >= anz) {
          if (ny > 0) put(k, P.top, (z - bb.minZ) / L, (x - bb.minX) / Wd);
          else put(k, spare, 0.5, 0.5);
        } else {
          if (nz > 0) put(k, P.front, (x - bb.minX) / Wd, (y - bb.minY) / Hh);
          else put(k, P.rear, (bb.maxX - x) / Wd, (y - bb.minY) / Hh);
        }
      }
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  }

  // split cabin triangles into roof (painted) and glass
  function splitCabin(geo, paintSides) {
    const pos = geo.attributes.position.array, n = pos.length / 9;
    const roof = [], glass = [];
    for (let t = 0; t < n; t++) {
      const o = t * 9;
      const ux = pos[o + 3] - pos[o], uy = pos[o + 4] - pos[o + 1], uz = pos[o + 5] - pos[o + 2];
      const vx = pos[o + 6] - pos[o], vy = pos[o + 7] - pos[o + 1], vz = pos[o + 8] - pos[o + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz) || 1;
      const tri = Array.prototype.slice.call(pos, o, o + 9);
      const isRoof = ny / l > 0.8 || (paintSides && Math.abs(nx / l) > 0.7) || (paintSides && nz / l < -0.5);
      (isRoof ? roof : glass).push(...tri);
    }
    const mk = arr => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); g.computeVertexNormals(); return g; };
    return { roof: mk(roof), glass: mk(glass) };
  }

  function mergeGeos(list) {
    let total = 0; list.forEach(g => total += g.attributes.position.count);
    const pos = new Float32Array(total * 3); let o = 0;
    list.forEach(g => { pos.set(g.attributes.position.array, o * 3); o += g.attributes.position.count; });
    const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.computeVertexNormals();
    return out;
  }


  // ---------- v1.8: wheel arches, glass and interior ----------
  const PROF = {};
  // Lower-body outline with proper wheel arches cut into the bottom edge and a fender bump wherever
  // the body line would otherwise sit below the tyre top (that is what made wheels poke through).
  function carProfile(spec, knobby) {
    const key = spec.name + (knobby ? 'K' : '');
    if (PROF[key]) return PROF[key];
    const P = spec.lower.map(p => p.slice());
    const k = knobby ? 1.1 : 1, wr = spec.wr * k, cy = wr, R = wr + 0.07, need = cy + R + 0.07, ramp = 0.4, pad = R + 0.04;
    if (spec.open) { PROF[key] = P; PROF[key].arch = { cy, R }; return P; }
    let chain = P.slice(2);
    const spans = spec.wz.map(z0 => [z0 - pad, z0 + pad]);
    const bump = z => { let m = 0; for (const [lo, hi] of spans) { const d = z < lo ? lo - z : z > hi ? z - hi : 0; m = Math.max(m, need * (1 - Math.min(1, d / ramp))); } return m; };
    const H = z => { for (let i = 0; i < chain.length - 1; i++) { const a = chain[i], b = chain[i + 1]; if (z <= a[0] + 1e-6 && z >= b[0] - 1e-6) { const dz = a[0] - b[0], t = dz < 1e-6 ? 0 : (a[0] - z) / dz; return a[1] + (b[1] - a[1]) * t; } } return 0; };
    const extra = []; spans.forEach(([lo, hi]) => extra.push(hi + ramp, hi + ramp / 2, hi, lo, lo - ramp / 2, lo - ramp));
    const out = [];
    for (let i = 0; i < chain.length; i++) {
      const a = chain[i]; out.push([a[0], Math.max(a[1], bump(a[0]))]);
      const b = chain[i + 1]; if (!b) break;
      extra.filter(z => z < a[0] - 0.02 && z > b[0] + 0.02).sort((x, y) => y - x).forEach(z => out.push([z, Math.max(H(z), bump(z))]));
    }
    const yb = P[0][1], notches = [];
    spec.wz.slice().sort((a, b) => a - b).forEach(z0 => {
      const dy = yb - cy, aR = Math.asin(DL.clamp(dy / R, -1, 1)), aL = Math.PI - aR, N = 8;
      for (let i = 0; i <= N; i++) { const a = aL + (aR - aL) * i / N; notches.push([z0 + R * Math.cos(a), cy + R * Math.sin(a)]); }
    });
    PROF[key] = [P[0], ...notches, P[1], ...out];
    PROF[key].arch = { cy, R };
    return PROF[key];
  }
  function tint(geo, color) {
    const c = new THREE.Color(color), n = geo.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); return geo;
  }
  function boxG(w, h, d, x, y, z, rx, color) {
    let g = new THREE.BoxGeometry(w, h, d); if (rx) g.rotateX(rx); g.translate(x, y, z);
    const n = g.toNonIndexed(); g.dispose(); return tint(n, color);
  }
  function mergeColored(list) {
    let total = 0; list.forEach(g => total += g.attributes.position.count);
    const pos = new Float32Array(total * 3), col = new Float32Array(total * 3); let o = 0;
    list.forEach(g => { pos.set(g.attributes.position.array, o * 3); col.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; });
    const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('color', new THREE.BufferAttribute(col, 3)); out.computeVertexNormals();
    return out;
  }
  // seats, dash, wheel, floor + wheel-well liners, merged into one vertex-coloured mesh
  function interiorGeo(spec, roofGeo, prof, knobby) {
    const c = spec.cabin, halfW = spec.W * spec.cw / 2, parts = [];
    const SEAT = 0x25324a, DASH = 0x2d3a52, FLOOR = 0x171c26, TRIM = 0xf3ead7, LINER = 0x0f1218;
    const floorY = Math.min(...c.map(p => p[1])), roofY = Math.max(...c.map(p => p[1]));
    const z0 = c[0][0], zr = c[c.length - 1][0], Lc = z0 - zr, sc = DL.clamp((roofY - floorY) / 0.72, 0.42, 1);
    const wy = floorY + 0.28 * sc, w0 = c[0], w1 = c[1];
    const zFront = w0[0] + (wy - w0[1]) * (w1[0] - w0[0]) / ((w1[1] - w0[1]) || 1) - 0.05;
    parts.push(boxG(halfW * 2 - 0.12, 0.04, Lc - 0.25, 0, floorY + 0.03, (z0 + zr) / 2, 0, FLOOR));
    parts.push(boxG(halfW * 2 - 0.12, 0.3 * sc, 0.5, 0, floorY + 0.03 + 0.15 * sc, zFront - 0.25, 0, DASH));
    parts.push(boxG(halfW * 2 - 0.12, 0.06, 0.12, 0, floorY + 0.03 + 0.3 * sc, zFront - 0.04, 0, 0x1a2130));
    const seatZ = zFront - 1.0;
    // low bucket seats only (no headrests), so the cabin never reads as passengers
    [-1, 1].forEach(s => {
      const x = s * halfW * 0.48, sw = halfW * 0.7;
      parts.push(boxG(sw, 0.14 * sc, 0.55, x, floorY + 0.09 * sc, seatZ, 0, SEAT));
      parts.push(boxG(sw, 0.3 * sc, 0.1, x, floorY + 0.22 * sc, seatZ - 0.3, -0.25, SEAT));
    });
    const rz = zr + 0.6;
    if (seatZ - 0.7 - rz > 0.55) {
      [-1, 1].forEach(s => { const x = s * halfW * 0.48, sw = halfW * 0.7; parts.push(boxG(sw, 0.14 * sc, 0.5, x, floorY + 0.09 * sc, rz + 0.1, 0, SEAT)); parts.push(boxG(sw, 0.28 * sc, 0.1, x, floorY + 0.2 * sc, rz - 0.18, -0.25, SEAT)); });
    }
    const swz = zFront - 0.4, swx = halfW * 0.48;
    const ring = new THREE.TorusGeometry(0.15 * Math.min(1, sc + 0.3), 0.032, 5, 10); ring.rotateX(Math.PI / 2 - 0.9); ring.translate(swx, floorY + 0.03 + 0.34 * sc, swz);
    const rn = ring.toNonIndexed(); ring.dispose(); parts.push(tint(rn, 0x0b0d12));
    parts.push(boxG(0.05, 0.22 * sc, 0.05, swx, floorY + 0.03 + 0.2 * sc, swz + 0.1, 0.5, 0x0b0d12));
    // headliner: roof sheet seen from underneath
    if (roofGeo) {
      const p = roofGeo.attributes.position.array, n = p.length / 9, out = new Float32Array(p.length);
      for (let t = 0; t < n; t++) { const o = t * 9; for (let q = 0; q < 3; q++) { const src = q === 1 ? 2 : q === 2 ? 1 : q; out[o + q * 3] = p[o + src * 3]; out[o + q * 3 + 1] = p[o + src * 3 + 1] - 0.07; out[o + q * 3 + 2] = p[o + src * 3 + 2]; } }
      const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.BufferAttribute(out, 3)); parts.push(tint(hg, 0xcdbf9f));
    }
    // wheel-well liners: close off the arches so you never see through the car
    const { cy, R } = prof.arch, k = knobby ? 1.1 : 1, wxc = (spec.W / 2 - 0.05) * spec.wx / 0.9, lw = Math.max(0.2, wxc - 0.18 * k - 0.02);
    if (!spec.open) spec.wz.forEach(z => parts.push(boxG(lw * 2, cy + R - spec.lower[0][1] - 0.01, R * 1.9, 0, spec.lower[0][1] + (cy + R - spec.lower[0][1]) / 2, z, 0, LINER)));
    return mergeColored(parts);
  }
  // window frame: pillars and rails following the cabin outline, in body colour
  function frameGeo(spec) {
    const c = spec.cabin, halfW = spec.W * spec.cw / 2, parts = [], col = 0xffffff;
    const bar = (a, b, th, dw, x) => {
      const dz = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dz, dy); if (L < 0.05) return;
      parts.push(boxG(dw, th, L + 0.04, x, (a[1] + b[1]) / 2, (a[0] + b[0]) / 2, -Math.atan2(dy, dz), col));
    };
    for (const s of [-1, 1]) {
      for (let i = 0; i < c.length - 1; i++) bar(c[i], c[i + 1], 0.1, 0.1, s * (halfW - 0.01));
      bar(c[c.length - 1], c[0], 0.08, 0.1, s * (halfW - 0.01));
      if (c.length === 4 && c[0][0] - c[3][0] > 2.4) { const zb = c[1][0] - (c[1][0] - c[2][0]) * 0.55 + (c[2][0] - c[3][0]) * 0.0; bar([zb, c[0][1] + 0.02], [zb, c[1][1]], 0.1, 0.1, s * (halfW - 0.01)); }
    }
    bar([c[1][0], c[1][1]], [c[1][0], c[1][1] - 0.001], 0.1, 0.1, 0);
    parts.push(boxG(halfW * 2, 0.1, 0.12, 0, c[1][1] - 0.01, c[1][0], 0, col));
    parts.push(boxG(halfW * 2, 0.1, 0.12, 0, c[c.length - 2][1] - 0.01, c[c.length - 2][0], 0, col));
    return mergeColored(parts);
  }

  const shared = {};
  // number plate material: tiny canvas texture per style and text, shared between cars
  function plateMat(style, text, ghost) {
    return sharedMat('plate_' + style + '_' + text + (ghost ? '_g' : ''), () => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d'), st = DL.PLATE_STYLES[style];
      g.fillStyle = st[0]; g.fillRect(0, 0, 256, 64); g.strokeStyle = st[2]; g.lineWidth = 4; g.strokeRect(3, 3, 250, 58);
      g.fillStyle = st[1]; g.font = '800 44px "Barlow Condensed", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 35);
      const tex = new THREE.CanvasTexture(c); if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshBasicMaterial({ map: tex, side: THREE.FrontSide, transparent: !!ghost, opacity: ghost ? 0.75 : 1, depthWrite: !ghost });
    });
  }
  function sharedMat(key, make) { return shared[key] || (shared[key] = make()); }

  // Blender-modelled tyres (models_tyres.js): [style] -> default rim colour, bigger-tyre flag
  const TYRES = { slick: [0xd7dde5, 0], rally: [0xc9d1da, 0], retro: [0xd7dde5, 0], turbine: [0x9aa4b2, 0], mud: [0x8c97a8, 1] };
  DL.TYRE_STYLES = TYRES;
  const TYRE_HW = { slick: 0.47, rally: 0.405, retro: 0.47, turbine: 0.47, mud: 0.6 };
  const tyreGeo = {};
  function buildModelWheel(spec, style, col, r, side) {
    const g = new THREE.Group(), key = style + '@' + r.toFixed(3);
    // tyre width is capped so it stays inside the arch (model axis Y is the width); rim and tyre share the squeeze so the rim face stays flush
    const hw = TYRE_HW[style] || 0.47, kw = Math.min(1, (0.12 + 0.2 * r) / (hw * r));
    const scaled = n => tyreGeo[n + '@' + r.toFixed(3)] || (tyreGeo[n + '@' + r.toFixed(3)] = DL.models.tyre(n).clone().scale(r, r * kw, r));
    const tire = new THREE.Mesh(scaled('tyre_' + style).clone(), sharedMat('tireVC', () => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })));
    tire.rotation.z = Math.PI / 2; tire.frustumCulled = false; g.add(tire);
    g.userData.tire = tire; g.userData.orig = Float32Array.from(tire.geometry.attributes.position.array); g.userData.r = r;
    const cc = col && DL.ITEM_COLORS[col], metal = !!(cc && DL.isMetalColor(col)), rimCol = cc ? cc[1] : TYRES[style][0];
    const rim = new THREE.Mesh(scaled('rim_' + style), sharedMat('rimVC' + style + (cc ? '_' + col : ''), () => new THREE.MeshStandardMaterial({ vertexColors: true, color: rimCol, roughness: metal ? 0.3 : 0.55, metalness: metal ? 0.7 : 0.25, flatShading: true, emissive: rimCol, emissiveIntensity: 0.22 })));
    rim.rotation.z = side > 0 ? -Math.PI / 2 : Math.PI / 2; rim.position.x = side * 0.04 * r * kw; g.add(rim);   // rim face always points away from the car
    return g;
  }
  function buildWheel(spec, style, col, side) {
    if (TYRES[style]) return buildModelWheel(spec, style, col, spec.wr * (TYRES[style][1] ? 1.1 : 1), side);
    const g = new THREE.Group();
    const r = spec.wr * (style === 'knobby' ? 1.1 : 1);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.34, style === 'knobby' ? 12 : 16), sharedMat('tire', () => new THREE.MeshLambertMaterial({ color: 0x1b1e24, flatShading: true })));
    tire.rotation.z = Math.PI / 2; tire.frustumCulled = false; tire.geometry = tire.geometry.clone(); g.add(tire);
    g.userData.tire = tire; g.userData.orig = Float32Array.from(tire.geometry.attributes.position.array); g.userData.r = r;
    const cc = col && DL.ITEM_COLORS[col], metal = style === 'gold' || (cc && DL.isMetalColor(col));
    const rimCol = cc ? cc[1] : style === 'gold' ? 0xd9a441 : style === 'dish' ? 0xf4ecdc : style === 'spoke' ? 0xb5bfcb : 0x7c8a9e;
    const rimMat = sharedMat('rim' + style + (cc ? '_' + col : ''), () => new THREE.MeshStandardMaterial({ color: rimCol, roughness: metal ? 0.3 : 0.6, metalness: metal ? 0.7 : 0.2, flatShading: true }));
    const rr = r * (style === 'dish' ? 0.78 : 0.62);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, 0.36, style === 'dish' ? 12 : 8), rimMat);
    rim.rotation.z = Math.PI / 2; g.add(rim);
    if (style === 'spoke' || style === 'gold') {
      for (let k = 0; k < 5; k++) {
        const s = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.07, rr * 1.7), rimMat);
        s.rotation.x = k / 5 * Math.PI; g.add(s);
      }
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.18, r * 0.18, 0.4, 6), sharedMat('hub', () => new THREE.MeshLambertMaterial({ color: 0x2f3e57 })));
    hub.rotation.z = Math.PI / 2; g.add(hub);
    return g;
  }


  // Tyre deformation: the tyre keeps its shape in the car's frame while it spins, so the flat contact patch and the sidewall bulge
  // are applied in that frame and mapped back into the spinning tyre mesh. c = compression 0..0.3 of the tyre radius.
  function deformTire(w, c, spin) {
    const g = w.wheel.userData, pos = g.tire.geometry.attributes.position, o = g.orig, r = g.r, flat = r * (1 - c), cs = Math.cos(spin), sn = Math.sin(spin), a = pos.array;
    for (let i = 0; i < o.length; i += 3) {
      const X0 = -o[i + 1], Y0 = o[i], Z0 = o[i + 2];
      let Y = Y0 * cs - Z0 * sn, Z = Y0 * sn + Z0 * cs, X = X0;
      if (c > 0.002) {
        if (Y < -flat) { Y = -flat; Z *= 1 + c * 1.6; }                                   // flat contact patch, a little longer
        const wb = Math.min(1, Math.max(0, (-Y / r - 0.25) / 0.75));
        X *= 1 + c * 1.1 * wb * wb;                                                      // sidewall bulges out near the ground
        Z *= 1 + c * 0.35 * wb;
      }
      const Yb = Y * cs + Z * sn, Zb = -Y * sn + Z * cs;
      a[i] = Yb; a[i + 1] = -X; a[i + 2] = Zb;
    }
    pos.needsUpdate = true;
    w.pivot.position.y = w.baseY - r * c * 0.95;                                         // keep the tread on the ground as it squashes
  }

  // Signature parts so each car reads as a different machine, not just a different outline.
  function addFeatures(F) {
    const { body, spec, bodyMat, extraMat, headMat, tailMat, glassMat, glassSolid, frontZ, rearZ, roofY, lightY, deckY, ghost } = F;
    const M = (k, mk) => ghost ? glassMat : sharedMat(k, mk);
    const chrome = M('chrome', () => new THREE.MeshStandardMaterial({ color: 0xdfe4ea, roughness: 0.25, metalness: 0.8, flatShading: true }));
    const dark = M('dark2', () => new THREE.MeshLambertMaterial({ color: 0x14181f, flatShading: true }));
    const coral = M('coral2', () => new THREE.MeshLambertMaterial({ color: 0xf05a35, flatShading: true }));
    const cream = M('cream2', () => new THREE.MeshLambertMaterial({ color: 0xf3ead7, flatShading: true }));
    const bx = (w, h, d, x, y, z, mat, rx, rz, ry) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat || dark); m.position.set(x, y, z); if (rx) m.rotation.x = rx; if (rz) m.rotation.z = rz; if (ry) m.rotation.y = ry; m.castShadow = !ghost; body.add(m); return m; };
    const cy = (r, h, x, y, z, mat, ax, seg) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg || 10), mat); m.position.set(x, y, z); if (ax === 'x') m.rotation.z = Math.PI / 2; else if (ax === 'z') m.rotation.x = Math.PI / 2; m.castShadow = !ghost; body.add(m); return m; };
    const W = spec.W, both = f => [-1, 1].forEach(f);
    const wheelFlares = (thick, up) => both(s => spec.wz.forEach(z => bx(thick, 0.16, spec.wr * 2.5, s * (W / 2 + thick / 2 - 0.02), spec.wr * 2 + up, z)));
    const f = spec.feat;
    // real tailpipes on every car. Pipe x matches the smoke emitter in userData.exhaust
    {
      const EX = { comet: { n: 2, r: 0.058 }, vintage: { n: 2, r: 0.05 }, rallye: { n: 1, r: 0.07 }, ridge: { n: 1, r: 0.075 }, mule: { n: 1, r: 0.068 }, bubble: { n: 1, r: 0.04 }, loaf: { n: 1, r: 0.06 } }[f] || { n: 1, r: 0.055 };
      const r = EX.r, py = spec.lower[0][1] + r * 0.9, xs = EX.n === 2 ? [-1, 1] : [1];
      xs.forEach(sx => {
        const px = sx * W * 0.28;
        cy(r, 0.4, px, py, rearZ + 0.0, chrome, 'z', 12);                              // pipe, tucked up under the rear valance
        cy(r * 1.18, 0.035, px, py, rearZ - 0.18, chrome, 'z', 12);                    // thin rolled lip
        cy(r * 0.8, 0.04, px, py, rearZ - 0.19, dark, 'z', 12);                        // dark bore
      });
    }
    if (f === 'comet') {
      wheelFlares(0.2, 0.0);
      both(s => bx(0.07, 0.2, 0.8, s * (W / 2 + 0.02), 0.58, -0.7, dark));                      // side intakes
      bx(W * 0.9, 0.07, 0.4, 0, 0.3, frontZ + 0.05, dark);                                         // front splitter
      bx(W * 0.5, 0.05, 0.7, 0, 0.9, 1.0, dark);                                                   // bonnet vent
      bx(W * 0.9, 0.09, 0.1, 0, lightY - 0.1, frontZ + 0.08, coral);                               // nose stripe
    } else if (f === 'rallye') {
      wheelFlares(0.16, 0.05);
      bx(0.8, 0.2, 0.9, 0, 1.2, 1.0, dark, 0.12);                                                  // bonnet scoop
      for (let k = 0; k < 4; k++) cy(0.15, 0.14, (k - 1.5) * 0.4, roofY - 0.02, 0.95, headMat, 'z');   // roof light pods
      bx(W * 0.72, 0.06, 0.1, 0, roofY - 0.1, 0.78, dark);
      both(s => spec.wz.forEach(z => bx(0.05, 0.3, 0.3, s * (W / 2 + 0.1), 0.35, z - Math.sign(z) * (spec.wr + 0.15), dark)));  // mud flaps
      cy(0.1, 0.1, 0.0, 0.62, frontZ + 0.04, coral, 'z', 8);
      cy(0.3, 0.14, 0, roofY + 0.28, -1.0, M('spare', () => new THREE.MeshLambertMaterial({ color: 0x1b1e24, flatShading: true })), 'y', 9);   // spare on roof
    } else if (f === 'mule') {
      bx(W * 0.5, 0.14, 0.5, 0, roofY + 0.08, -0.4, dark); bx(0.45, 0.12, 0.45, 0, roofY + 0.08, 0.4, dark);   // roof vents
      both(s => bx(0.06, 0.07, 3.6, s * W * 0.42, roofY + 0.07, -0.2, dark));                       // roof rails
      for (let k = 0; k < 5; k++) bx(W * 0.84, 0.05, 0.06, 0, roofY + 0.14, -1.7 + k * 0.85, dark);
      bx(0.05, 1.05, 0.04, 0, 1.6, rearZ - 0.03, dark); bx(W * 0.3, 0.12, 0.04, W * 0.2, 1.5, rearZ - 0.04, dark); // barn doors
      both(s => { bx(0.12, 0.26, 0.1, s * (W / 2 + 0.16), 1.9, 1.1, dark); bx(0.05, 0.9, 0.04, s * (W / 2 + 0.03), 1.5, -0.4, dark); }); // mirrors + door seam
      bx(W * 0.8, 0.28, 0.08, 0, 0.72, frontZ + 0.1, dark);                                         // grille
      bx(W * 1.02, 0.14, 0.2, 0, 0.45, frontZ + 0.1, chrome); bx(W * 1.02, 0.14, 0.2, 0, 0.45, rearZ - 0.1, chrome);
    } else if (f === 'ridge') {
      wheelFlares(0.24, 0.1);
      for (let k = 0; k < 5; k++) cy(0.12, 0.12, (k - 2) * 0.34, roofY + 0.2, 0.45, headMat, 'z', 8);   // roof light bar
      bx(W * 0.82, 0.1, 0.14, 0, roofY + 0.1, 0.45, dark);
      both(s => { bx(0.1, 0.8, 0.1, s * (W / 2 - 0.1), 1.8, -2.0, dark); bx(0.12, 0.08, 1.2, s * (W / 2 - 0.1), 1.45, -1.6, dark); }); // sports bar
      bx(W * 0.9, 0.1, 0.1, 0, 2.15, -2.0, dark);
      bx(0.14, 0.9, 0.14, W * 0.42, 1.6, 0.85, dark); bx(0.14, 0.14, 0.4, W * 0.42, 2.05, 0.7, dark);    // snorkel
      both(s => bx(0.16, 0.08, 1.6, s * (W / 2 + 0.1), 0.62, 0.0, dark));                           // side steps
      cy(0.5, 0.2, 0, 1.78, -1.55, M('spare2', () => new THREE.MeshLambertMaterial({ color: 0x1b1e24, flatShading: true })), 'x', 10);  // spare
      bx(W * 0.9, 0.18, 0.2, 0, 0.7, frontZ + 0.08, dark);                                           // skid plate
      bx(0.5, 0.1, 0.5, 0, 1.31, 1.1, dark);
    } else if (f === 'vintage') {
      bx(W + 0.12, 0.12, 0.14, 0, 0.5, frontZ + 0.05, chrome); bx(W + 0.12, 0.12, 0.14, 0, 0.5, rearZ - 0.05, chrome);
      bx(0.14, 0.16, 0.2, W * 0.46, 0.5, frontZ + 0.02, chrome); bx(0.14, 0.16, 0.2, -W * 0.46, 0.5, frontZ + 0.02, chrome);
      both(s => { cy(0.22, 0.12, s * W * 0.3, lightY + 0.05, frontZ + 0.1, chrome, 'z', 12); cy(0.17, 0.14, s * W * 0.3, lightY + 0.05, frontZ + 0.13, headMat, 'z', 12); });
      bx(W * 0.4, 0.3, 0.06, 0, lightY - 0.1, frontZ + 0.1, chrome);                                // grille
      both(s => { bx(0.07, 0.5, 0.9, s * (W / 2 - 0.1), deckY + 0.3, rearZ + 0.5, coral, 0.25); bx(0.05, 0.05, 3.3, s * (W / 2 + 0.01), 0.76, -0.1, chrome); }); // tail fins + side trim
      both(s => bx(0.08, 0.08, 0.35, s * W * 0.33, deckY + 0.5, rearZ + 0.35, tailMat));
      both(s => spec.wz.forEach(z => cy(spec.wr * 0.95, 0.04, s * (W / 2 + 0.0), spec.wr, z, cream, 'x', 12)));   // whitewall rings
      cy(0.07, 0.1, 0, 0.95, frontZ - 0.35, chrome, 'y', 8);                                         // bonnet ornament
    } else if (f === 'bubble') {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), glassMat); dome.scale.set(W * 0.5, 0.66, 1.05); dome.position.set(0, 1.12, -0.05); dome.castShadow = !ghost; body.add(dome);
      both(s => cy(0.24, 0.12, s * W * 0.3, lightY + 0.1, frontZ + 0.02, headMat, 'z', 10));       // big round eyes
      both(s => cy(0.27, 0.06, s * W * 0.3, lightY + 0.1, frontZ - 0.02, chrome, 'z', 10));
      bx(W * 0.7, 0.12, 0.08, 0, 0.45, frontZ + 0.04, chrome); bx(W * 0.7, 0.12, 0.08, 0, 0.45, rearZ - 0.04, chrome);
      cy(0.05, 0.9, -W * 0.22, 1.9, -0.9, dark, 'y', 6); bx(0.14, 0.14, 0.14, -W * 0.22, 2.38, -0.9, coral);   // aerial with flag
      bx(W * 0.6, 0.5, 0.5, 0, 0.9, rearZ + 0.3, cream);                                          // engine hump
    } else if (f === 'loaf') {
      const crust = M('crust', () => new THREE.MeshLambertMaterial({ color: 0xc88a4a, flatShading: true }));
      const top = new THREE.Mesh(new THREE.CylinderGeometry(W * 0.49, W * 0.49, 3.5, 10, 1, false, Math.PI / 2, Math.PI), crust);
      top.scale.set(1, 1, 0.45); top.rotation.x = Math.PI / 2; top.position.set(0, 2.06, -0.1); top.castShadow = !ghost; body.add(top);
      bx(W * 0.82, 0.07, 3.3, 0, 2.06, -0.1, crust, 0, 0);
      both(s => { cy(0.27, 0.06, s * (W * 0.95 / 2 + 0.03), 1.8, -1.3, glassSolid, 'x', 12); cy(0.31, 0.04, s * (W * 0.95 / 2 + 0.02), 1.8, -1.3, chrome, 'x', 12); cy(0.27, 0.06, s * (W * 0.95 / 2 + 0.03), 1.8, -0.85, glassSolid, 'x', 12); cy(0.31, 0.04, s * (W * 0.95 / 2 + 0.02), 1.8, -0.85, chrome, 'x', 12); });
      cy(0.09, 0.8, W * 0.3, 2.45, -1.5, dark, 'y', 8); cy(0.14, 0.06, W * 0.3, 2.88, -1.5, dark, 'y', 8);   // chimney
      bx(W * 0.7, 0.35, 0.08, 0, 0.8, frontZ + 0.04, dark); bx(W * 1.0, 0.1, 0.1, 0, 0.45, frontZ + 0.05, cream);
      both(s => bx(0.06, 0.06, 0.4, s * (W / 2 + 0.02), 1.05, 1.0, chrome));                        // door handles
    }

    // ---------- v2.5 cars ----------
    const C = (k, col, emi, ei) => M('c25_' + k, () => new THREE.MeshLambertMaterial({ color: col, flatShading: true, emissive: emi || 0, emissiveIntensity: ei == null ? 1 : ei }));
    const sp = (r, x, y, z, mat, sx, sy, sz) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat); m.position.set(x, y, z); if (sx) m.scale.set(sx, sy, sz); m.castShadow = !ghost; body.add(m); return m; };
    const cone = (r, h, x, y, z, mat, rx, seg) => { const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg || 8), mat); m.position.set(x, y, z); if (rx) m.rotation.x = rx; m.castShadow = !ghost; body.add(m); return m; };
    // flat shape standing along the car (pts are [z, y]), thickness across
    const fin = (pts, th, x, mat) => { const sh = new THREE.Shape(); pts.forEach((p, i) => i ? sh.lineTo(-p[0], p[1]) : sh.moveTo(-p[0], p[1])); const g = new THREE.ExtrudeGeometry(sh, { depth: th, bevelEnabled: false }); g.translate(0, 0, -th / 2); const m = new THREE.Mesh(g, mat); m.rotation.y = Math.PI / 2; m.position.x = x; m.castShadow = !ghost; body.add(m); return m; };
    const paint = F.paintMat || chrome;
    if (f === 'frank') {
      const meat = C('sausage', 0xc0563a), mus = C('mustard', 0xf2c419);
      cy(0.3, 4.4, 0, 1.82, -0.05, meat, 'z', 10); sp(0.3, 0, 1.82, 2.15, meat); sp(0.3, 0, 1.82, -2.25, meat);
      for (let k = 0; k < 9; k++) bx(0.36, 0.06, 0.12, (k % 2 ? 0.1 : -0.1), 2.11, -1.8 + k * 0.45, mus, 0, 0, k % 2 ? 0.7 : -0.7);
      both(s => bx(0.06, 0.08, 3.6, s * (W / 2 + 0.01), 0.98, 0, C('seed', 0xf3e2b5)));
    } else if (f === 'tub') {
      const water = C('water', 0x7cc3f2, 0x2a6fa8, 0.35), white = C('foam', 0xffffff), duck = C('duck', 0xf7d038), beak = C('beak', 0xf28a1e), gold = M('gold25', () => new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.3, metalness: 0.85, flatShading: true }));
      const enamel = C('enamel', 0xf7f7f4);
      bx(W * 0.84, 0.06, 2.8, 0, 1.36, 0.22, water);
      both(s2 => bx(0.12, 0.14, 3.0, s2 * (W * 0.46), 1.38, 0.2, enamel)); bx(W * 0.98, 0.14, 0.12, 0, 1.38, 1.68, enamel); bx(W * 0.98, 0.14, 0.12, 0, 1.38, -1.25, enamel);
      [[0.4, 0.9, .18], [-.5, 1.4, .14], [.2, -.4, .2], [-.3, .3, .12], [.55, .1, .1], [-.55, -.5, .16]].forEach(([x, z, r]) => sp(r, x, 1.38, z, white));
      sp(0.2, 0.2, 1.48, 0.6, duck, 1.15, 0.85, 1.3); sp(0.13, 0.2, 1.7, 0.8, duck); cone(0.05, 0.12, 0.2, 1.68, 0.96, beak, Math.PI / 2, 5);
      cy(0.05, 0.4, -0.25, 1.52, 1.85, chrome, 'y', 8); bx(0.08, 0.06, 0.25, -0.25, 1.72, 1.75, chrome); cy(0.05, 0.4, 0.25, 1.52, 1.85, chrome, 'y', 8); bx(0.08, 0.06, 0.25, 0.25, 1.72, 1.75, chrome);
      both(s => [1.85, -1.85].forEach(z => sp(0.13, s * (W / 2 - 0.1), 0.24, z, gold)));
    } else if (f === 'scoop') {
      const wafer = C('wafer', 0xd8a45c), pink = C('straw', 0xf2a0c4), mint = C('mint25', 0x9fe3c4), cherry = C('cherry', 0xd12f3a), ac = C('awnC', 0xf05a35), aw = C('awnW', 0xf7f3ea);
      cone(0.42, 1.0, 0, roofY + 0.6, -0.6, wafer, Math.PI, 9); sp(0.46, 0, roofY + 1.2, -0.6, pink); sp(0.38, 0, roofY + 1.62, -0.6, mint); sp(0.11, 0, roofY + 2.02, -0.6, cherry);
      bx(0.04, 0.7, 1.5, W * 0.48 + 0.02, 1.75, -0.7, dark);
      for (let k = 0; k < 6; k++) bx(0.5, 0.05, 0.25, W * 0.48 + 0.25, 2.2, -1.32 + k * 0.25, k % 2 ? aw : ac, 0, -0.35);
      cy(0.12, 0.1, 0, roofY + 0.07, 1.0, chrome, 'y', 8);
    } else if (f === 'hailer') {
      const sign = C('taxisign', 0xfff1b8, 0xffe08a, 0.6), ck = C('checkD', 0x14181f), cl = C('checkL', 0xf3ead7);
      bx(0.95, 0.06, 0.4, 0, roofY + 0.04, -0.35, dark); bx(0.85, 0.26, 0.34, 0, roofY + 0.2, -0.35, sign);
      both(s => { for (let k = 0; k < 18; k++) bx(0.03, 0.09, 0.2, s * (W / 2 + 0.01), 0.72 + (k % 2) * 0.09, -1.8 + k * 0.2, k % 2 ? cl : ck); });
    } else if (f === 'stretch') {
      bx(W + 0.1, 0.12, 0.14, 0, 0.48, frontZ + 0.05, chrome); bx(W + 0.1, 0.12, 0.14, 0, 0.48, rearZ - 0.05, chrome);
      both(s => bx(0.04, 0.05, 5.6, s * (W / 2 + 0.01), 0.78, 0, chrome));
      bx(W * 0.5, 0.28, 0.06, 0, lightY - 0.05, frontZ + 0.09, chrome); cy(0.06, 0.12, 0, 1.05, frontZ - 0.25, chrome, 'y', 8);
      both(s => { cy(0.015, 0.45, s * W * 0.44, 1.12, frontZ - 0.2, chrome, 'y', 5); bx(0.02, 0.14, 0.22, s * W * 0.44, 1.28, frontZ - 0.3, coral); });
      bx(W * 0.5, 0.04, 0.7, 0, roofY + 0.02, -0.4, glassSolid); cy(0.012, 0.6, -W * 0.3, roofY + 0.3, -1.8, dark, 'y', 4);
    } else if (f === 'stomper') {
      const shock = C('shock', 0xf05a35), spring = C('spring', 0xf2d14e);
      both(s => bx(0.18, 0.18, 4.4, s * 0.55, 1.32, 0, dark));
      both(s => spec.wz.forEach(z => { bx(0.12, 0.9, 0.12, s * 0.85, 1.25, z, shock, 0, s * 0.35); cy(0.11, 0.45, s * 0.86, 1.3, z + 0.18, spring, 'y', 8); bx(1.1, 0.1, 0.1, s * 0.6, 0.85, z, dark); }));
      for (let k = 0; k < 5; k++) cy(0.12, 0.12, (k - 2) * 0.36, roofY + 0.2, 0.3, headMat, 'z', 8);
      bx(W * 0.85, 0.1, 0.14, 0, roofY + 0.1, 0.3, dark);
      both(s => cy(0.07, 1.0, s * 0.75, roofY - 0.05, -1.65, chrome, 'y', 8));
      bx(W * 0.95, 0.14, 0.14, 0, 1.55, frontZ + 0.15, chrome); bx(W * 0.95, 0.14, 0.14, 0, 1.55, rearZ - 0.15, chrome);
    } else if (f === 'arrow') {
      const wing = dark;
      bx(2.35, 0.05, 0.45, 0, 0.26, frontZ - 0.05, wing); both(s => bx(0.05, 0.2, 0.5, s * 1.18, 0.32, frontZ - 0.05, wing));
      both(s => bx(0.06, 0.6, 0.12, s * 0.35, 0.95, rearZ + 0.2, wing)); bx(1.8, 0.07, 0.45, 0, 1.28, rearZ + 0.15, wing); bx(1.8, 0.05, 0.3, 0, 1.15, rearZ + 0.2, wing);
      both(s => bx(0.05, 0.45, 0.6, s * 0.92, 1.12, rearZ + 0.15, wing));
      bx(0.5, 0.42, 0.9, 0, 1.0, -0.9, paint); bx(0.36, 0.08, 0.4, 0, 1.24, -0.6, dark);
      both(s => { bx(0.45, 0.32, 1.6, s * 0.62, 0.48, -0.35, paint); bx(0.08, 0.2, 0.06, s * 0.62, 0.48, 0.47, dark); });
      both(s => spec.wz.forEach(z => { bx(0.7, 0.04, 0.06, s * 0.68, spec.wr + 0.05, z + 0.12, dark, 0, s * 0.08); bx(0.7, 0.04, 0.06, s * 0.68, spec.wr - 0.08, z - 0.12, dark, 0, -s * 0.08); }));
    } else if (f === 'brute') {
      bx(0.62, 0.32, 0.72, 0, 1.2, 1.25, chrome); bx(0.42, 0.22, 0.42, 0, 1.47, 1.3, dark); bx(0.5, 0.06, 0.5, 0, 1.6, 1.3, chrome);
      both(s => bx(0.08, 0.3, 0.1, s * 0.22, 1.42, 1.62, dark));
      both(s => { cy(0.07, 2.2, s * (W / 2 + 0.08), 0.42, -0.05, chrome, 'z', 10); cy(0.08, 0.06, s * (W / 2 + 0.08), 0.42, -1.16, dark, 'z', 10); });
      wheelFlares(0.14, 0.02); bx(W * 0.85, 0.24, 0.07, 0, lightY - 0.04, frontZ + 0.09, dark);
    } else if (f === 'wedge') {
      both(s => { bx(0.5, 0.18, 0.42, s * W * 0.3, 0.78, frontZ - 0.75, paint, -0.25); bx(0.42, 0.12, 0.05, s * W * 0.3, 0.86, frontZ - 0.54, headMat, -0.25); });
      for (let k = 0; k < 6; k++) bx(W * 0.7, 0.04, 0.08, 0, deckY + 0.04 + k * 0.012, rearZ + 0.25 + k * 0.12, dark);
      both(s => { bx(0.06, 0.24, 0.7, s * (W / 2 + 0.01), 0.68, -0.9, dark); bx(0.06, 0.06, 3.4, s * (W / 2 + 0.01), 0.5, 0.1, coral); });
      bx(W * 0.9, 0.08, 0.3, 0, 0.3, frontZ + 0.05, dark);
    } else if (f === 'caddy') {
      const canopy = C('canopy', 0xf3ead7), bag = C('golfbag', 0xd8452f), turf = C('turf', 0x5faa5a);
      bx(W * 0.98, 0.08, 1.75, 0, 1.9, 0.05, canopy); bx(W * 1.02, 0.12, 0.08, 0, 1.86, 0.92, canopy); bx(W * 1.02, 0.12, 0.08, 0, 1.86, -0.82, canopy);
      const b = cy(0.22, 0.95, 0, 1.25, -1.15, bag, 'y', 10); b.rotation.x = -0.35;
      for (let k = 0; k < 4; k++) { cy(0.02, 0.5, (k - 1.5) * 0.08, 1.85, -1.38, chrome, 'y', 4); bx(0.09, 0.05, 0.14, (k - 1.5) * 0.08, 2.1, -1.36, chrome); }
      bx(W * 0.8, 0.03, 0.5, 0, 0.83, -1.1, turf);
    } else if (f === 'blaze') {
      const rd = C('lightR', 0xff3b30, 0xff2a1a, 0.9), wt = C('lightW', 0xffffff, 0xfff6e0, 0.8), reel = C('hose', 0xf2d14e);
      both(s => bx(0.06, 0.06, 3.7, s * 0.38, 2.25, -0.65, chrome)); for (let k = 0; k < 12; k++) bx(0.76, 0.04, 0.05, 0, 2.25, -2.45 + k * 0.32, chrome);
      both(s => bx(0.08, 0.15, 0.08, s * 0.38, 2.15, 1.0, dark)); both(s => bx(0.08, 0.15, 0.08, s * 0.38, 2.15, -2.3, dark));
      for (let k = 0; k < 4; k++) bx(0.32, 0.14, 0.26, (k - 1.5) * 0.36, roofY + 0.1, 1.85, k % 2 ? wt : rd);
      both(s => { for (let k = 0; k < 3; k++) { bx(0.03, 0.75, 0.03, s * (W / 2 + 0.01), 1.5, 0.7 - k * 1.15, dark); bx(0.03, 0.03, 1.05, s * (W / 2 + 0.01), 1.95, 0.15 - k * 1.15, dark); } });
      cy(0.42, 0.5, 0, 1.25, rearZ - 0.25, reel, 'x', 12); cy(0.18, 0.55, 0, 1.25, rearZ - 0.25, dark, 'x', 10);
      bx(W * 1.02, 0.16, 0.18, 0, 0.5, frontZ + 0.1, chrome);
    } else if (f === 'nomad') {
      const ac = C('awnC2', 0x2f9a8a), aw = C('awnW2', 0xf7f3ea), tyre = C('biketyre', 0x14181f);
      bx(W, 0.6, 0.75, 0, 2.3, 1.92, paint); bx(W * 0.7, 0.18, 0.04, 0, 2.3, 2.31, glassSolid);
      both(s => { bx(0.04, 0.45, 0.8, s * (W / 2 + 0.01), 1.85, -0.3, glassSolid); bx(0.04, 0.45, 0.6, s * (W / 2 + 0.01), 1.85, -1.6, glassSolid); });
      for (let k = 0; k < 9; k++) bx(0.6, 0.05, 0.4, W / 2 + 0.3, 2.45, -2.2 + k * 0.4, k % 2 ? aw : ac, 0, -0.3);
      bx(0.05, 1.3, 0.75, -(W / 2 + 0.01), 1.5, 0.6, dark);
      bx(0.9, 0.3, 0.8, 0, 2.75, -0.9, C('acunit', 0xf3ead7));
      both(s => bx(0.05, 1.8, 0.05, s * 0.3, 1.6, rearZ - 0.04, dark)); for (let k = 0; k < 6; k++) bx(0.6, 0.04, 0.04, 0, 0.9 + k * 0.3, rearZ - 0.04, dark);
      [-0.45, 0.45].forEach(x => { const t = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 5, 12), tyre); t.position.set(x, 1.15, rearZ - 0.35); t.castShadow = !ghost; body.add(t); });
      bx(0.95, 0.05, 0.05, 0, 1.3, rearZ - 0.35, coral, 0, 0.3); bx(0.05, 0.5, 0.05, 0.1, 1.35, rearZ - 0.35, coral);
    } else if (f === 'dune') {
      const board = C('board', 0xf3ead7), stripe = C('boardS', 0x2f9a8a);
      const sb = bx(0.55, 0.07, 2.7, 0, roofY + 0.1, -0.25, board); bx(0.12, 0.08, 2.5, 0, roofY + 0.12, -0.25, stripe);
      bx(0.8, 0.45, 0.6, 0, 1.15, rearZ + 0.2, chrome); for (let k = 0; k < 3; k++) bx(0.85, 0.05, 0.62, 0, 1.4 + k * 0.08, rearZ + 0.2, dark);
      cy(0.06, 0.6, 0.3, 1.45, rearZ - 0.05, chrome, 'y', 8);
      both(s => cy(0.14, 0.12, s * 0.35, roofY + 0.0, 0.5, headMat, 'z', 8));
      wheelFlares(0.12, 0.05);
    } else if (f === 'toasty') {
      const bread = C('bread', 0xe9c48a), crust = C('crust2', 0xa86a32), knob = dark;
      both(s => { bx(0.36, 0.03, 2.4, s * 0.42, 2.07, 0, dark); bx(0.24, 0.72, 2.0, s * 0.42, 2.36, 0, bread); bx(0.26, 0.1, 2.04, s * 0.42, 2.75, 0, crust); });
      bx(0.04, 1.1, 0.16, W / 2 + 0.01, 1.35, -0.9, dark); bx(0.3, 0.14, 0.3, W / 2 + 0.15, 1.75, -0.9, knob);
      cy(0.14, 0.08, W / 2 + 0.03, 1.2, 0.6, chrome, 'x', 12); bx(0.02, 0.14, 0.03, W / 2 + 0.08, 1.24, 0.6, dark);
      both(s => bx(0.03, 0.03, 3.4, s * (W / 2 + 0.01), 0.9, 0, chrome));
      cy(0.04, 1.4, 0, 0.55, rearZ - 0.7, dark, 'z', 6); bx(0.2, 0.14, 0.22, 0, 0.55, rearZ - 1.45, C('plug', 0xf3ead7));
    } else if (f === 'booster') {
      const glow = C('glow', 0xffb347, 0xff8a1e, 1.2), flame = M('flame25', () => new THREE.MeshBasicMaterial({ color: 0xffc66b, transparent: true, opacity: 0.55, depthWrite: false }));
      both(s => { cy(0.3, 1.1, s * 0.5, 0.82, rearZ + 0.25, chrome, 'z', 12); cy(0.24, 0.05, s * 0.5, 0.82, rearZ - 0.31, glow, 'z', 12); cone(0.22, 0.9, s * 0.5, 0.82, rearZ - 0.8, flame, -Math.PI / 2, 10); });
      fin([[-1.7, 1.0], [-2.3, 0.95], [-2.45, 1.75], [-2.15, 1.75]], 0.08, 0, paint);
      both(s => fin([[-0.9, 0.55], [-2.0, 0.55], [-2.2, 0.35], [-1.3, 0.35]], 0.06, s * (W / 2 + 0.05), dark));
      cone(0.22, 0.5, 0, 0.42, frontZ + 0.2, chrome, Math.PI / 2, 8);
    } else if (f === 'chomp') {
      const grey = C('sharkfin', 0x7d8a99), tooth = C('tooth', 0xffffff), eye = C('eye', 0x0b0d12);
      fin([[0.1, 1.3], [-0.9, 1.3], [-0.85, 2.35]], 0.09, 0, grey);
      fin([[-1.9, 0.9], [-2.3, 0.85], [-2.85, 1.85], [-2.55, 1.0], [-2.8, 0.55], [-2.3, 0.62]], 0.08, 0, grey);
      for (let k = 0; k < 9; k++) { cone(0.07, 0.18, (k - 4) * 0.18, 0.62, frontZ + 0.08, tooth, Math.PI, 4); }
      for (let k = 0; k < 8; k++) { cone(0.06, 0.15, (k - 3.5) * 0.18, 0.4, frontZ + 0.06, tooth, 0, 4); }
      bx(W * 0.95, 0.24, 0.04, 0, 0.51, frontZ + 0.02, C('mouth', 0x5a1a22));
      both(s => { sp(0.12, s * (W / 2 - 0.02), 0.7, 1.65, eye); sp(0.04, s * (W / 2 + 0.07), 0.75, 1.7, tooth); for (let k = 0; k < 3; k++) bx(0.04, 0.3, 0.05, s * (W / 2 + 0.01), 0.6, 0.85 - k * 0.18, dark, 0.3); });
    } else if (f === 'couch') {
      const cush = C('cushion', 0xf3ead7), pil = C('pillow', 0xf05a35), wood = C('wood', 0x7a5a3a), shade = C('shade', 0xf7e6b5, 0xf7d58a, 0.35);
      both(s => bx(0.32, 0.55, 2.9, s * (W / 2 - 0.16), 1.32, 0.05, paint));
      [-0.4, 0.4].forEach(x => bx(0.74, 0.16, 1.9, x, 1.13, 0.2, cush));
      [-0.45, 0.45].forEach(x => bx(0.5, 0.45, 0.16, x, 1.42, -0.62, pil, -0.3, x > 0 ? 0.2 : -0.2));
      bx(0.12, 0.04, 0.28, 0.35, 1.23, 0.9, dark);
      cy(0.03, 1.4, -W / 2 + 0.25, 2.3, rearZ + 0.25, dark, 'y', 6); cone(0.32, 0.4, -W / 2 + 0.25, 3.05, rearZ + 0.25, shade, 0, 8);
      both(s => [1.45, -1.45].forEach(z => bx(0.14, 0.14, 0.14, s * (W / 2 - 0.2), 0.32, z, wood)));
    } else if (f === 'shard') {
      const lw = C('barW', 0xffffff, 0xfff6e0, 1.0), lr = C('barR', 0xff3b30, 0xff2a1a, 0.9);
      bx(W * 0.98, 0.05, 0.05, 0, 0.98, frontZ + 0.02, lw); bx(W * 0.98, 0.05, 0.05, 0, 1.05, rearZ - 0.02, lr);
      bx(W * 0.9, 0.04, 1.3, 0, 1.27, -1.75, dark);
      both(s => spec.wz.forEach(z => bx(0.03, spec.wr * 1.4, spec.wr * 1.4, s * (W / 2 - 0.05) * spec.wx / 0.9 + s * 0.16, spec.wr, z, C('aero', 0x9aa4b2))));
    } else if (f === 'slice') {
      const dough = C('dough', 0xf2c96b), crust = C('crust3', 0xb8742f), pep = C('pep', 0xc8243a), box = C('pbox', 0xd8c08f);
      fin([[0.75, 0], [-0.75, 0], [0, 1.15]], 0.07, 0, dough).position.y = roofY + 0.12;
      bx(0.1, 0.18, 1.55, 0, roofY + 0.12, 0, crust);
      both(s => [[0, 0.55], [0.28, 0.32], [-0.25, 0.3], [0.05, 0.85]].forEach(([z, y]) => cy(0.09, 0.02, s * 0.045, roofY + 0.12 + y, z, pep, 'x', 8)));
      bx(0.06, 0.12, 0.06, 0, roofY + 0.06, 0, dark);
      for (let k = 0; k < 3; k++) bx(0.7, 0.07, 0.7, 0, 1.06 + k * 0.08, -1.45, box);
    } else if (f === 'nocturne') {
      const carbon = C('carbon', 0x15181e), led = C('led', 0xffffff, 0xfff6e0, 1.1), ledR = C('ledR', 0xff3b30, 0xff2a1a, 1.0);
      fin([[-0.5, 1.2], [-2.55, 0.88], [-2.6, 1.7], [-2.1, 1.72]], 0.05, 0, paint);                                    // shark fin running into the wing
      bx(0.36, 0.2, 0.75, 0, roofY + 0.09, -0.45, carbon); bx(0.3, 0.1, 0.04, 0, roofY + 0.08, -0.08, dark);           // roof scoop
      both(s2 => spec.wz.forEach(z => { for (let k = 0; k < 4; k++) bx(0.42, 0.03, 0.06, s2 * (W / 2 - 0.3), 1.0, z - 0.25 + k * 0.15, dark); }));  // fender louvres
      both(s2 => { bx(0.3, 0.04, 0.24, s2 * (W / 2 - 0.05), 0.42, frontZ - 0.3, carbon, 0, s2 * 0.25); bx(0.26, 0.04, 0.2, s2 * (W / 2 - 0.05), 0.52, frontZ - 0.45, carbon, 0, s2 * 0.25); });  // canards
      bx(W * 1.02, 0.05, 0.7, 0, 0.21, frontZ - 0.2, carbon); bx(W * 0.6, 0.12, 0.05, 0, 0.3, frontZ + 0.05, carbon);   // splitter
      both(s2 => { bx(0.06, 0.32, 1.2, s2 * (W / 2 + 0.01), 0.5, -0.25, carbon); bx(0.04, 0.22, 0.4, s2 * (W / 2 + 0.03), 0.52, 0.25, dark); });   // sidepod blades + intakes
      both(s2 => { bx(0.05, 0.05, 0.38, s2 * 0.5, 0.98, 0.95, dark, 0, 0, s2 * 0.5); bx(0.24, 0.12, 0.08, s2 * 0.68, 1.0, 0.82, paint); });       // mirrors on stalks
      both(s2 => bx(0.06, 0.62, 0.14, s2 * 0.3, 1.22, rearZ + 0.45, carbon, -0.4));                                    // swan-neck mounts
      bx(W * 1.04, 0.07, 0.55, 0, 1.6, rearZ + 0.28, carbon); bx(W * 1.04, 0.05, 0.3, 0, 1.48, rearZ + 0.36, carbon, -0.25);   // two-element wing
      both(s2 => bx(0.05, 0.6, 0.85, s2 * W * 0.52, 1.38, rearZ + 0.32, paint));                                        // endplates
      bx(W * 0.9, 0.06, 0.6, 0, 0.26, rearZ + 0.25, carbon, 0.3); for (let k = 0; k < 5; k++) bx(0.04, 0.2, 0.55, (k - 2) * 0.35, 0.3, rearZ + 0.25, carbon, 0.3);  // diffuser + strakes
      both(s2 => { for (let k = 0; k < 3; k++) bx(0.3, 0.035, 0.05, s2 * W * 0.34, lightY + 0.05 - k * 0.06, frontZ - 0.02 + 0.14, led); });   // LED strips
      bx(W * 0.86, 0.04, 0.05, 0, 0.8, rearZ - 0.05, ledR);                                                               // light bar
      cy(0.012, 0.35, 0.1, roofY + 0.2, -0.95, dark, 'y', 4);
    } else if (f === 'dodgem') {
      const rub = C('rubber', 0x1b1e24), spark = C('spark', 0xfff2a8, 0xffe066, 1.4), bulb = C('bulb', 0xfff1cc, 0xffd27a, 0.9);
      bx(W + 0.3, 0.3, 0.25, 0, 0.45, frontZ + 0.12, rub); bx(W + 0.3, 0.3, 0.25, 0, 0.45, rearZ - 0.12, rub);
      both(s => bx(0.25, 0.3, 3.5, s * (W / 2 + 0.12), 0.45, 0, rub));
      cy(0.04, 2.6, 0, 2.3, rearZ + 0.1, chrome, 'y', 6); bx(0.3, 0.06, 0.1, 0, 3.6, rearZ + 0.1, dark); sp(0.1, 0, 3.68, rearZ + 0.1, spark);
      const wh = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 5, 10), dark); wh.position.set(0, 1.25, 0.1); wh.rotation.x = -0.9; body.add(wh); cy(0.03, 0.4, 0, 1.08, 0.2, dark, 'z', 5);
      both(s => { for (let k = 0; k < 6; k++) sp(0.05, s * (W / 2 + 0.01), 0.82, -1.25 + k * 0.5, bulb); });
    }
  }

  // The Weekly cup champion's saucer: floats, no wheels, same physics as everything else
  function buildUfo(opts, spec) {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const base = opts.base == null ? DL.DEFAULT_BASE : opts.base, ghost = !!opts.ghost;
    const canvas = document.createElement('canvas');
    DL.drawLiveryCanvas(canvas, opts.livery || DL.defaultLivery(), base);
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
    if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
    const bodyMat = new THREE.MeshStandardMaterial({ map: tex, flatShading: true, roughness: 0.35, metalness: 0.55 });
    if (ghost) { bodyMat.transparent = true; bodyMat.opacity = 0.72; bodyMat.depthWrite = false; }
    const R = 1.95, hull = [[0.001, 0.0], [0.7, 0.04], [1.5, 0.2], [R, 0.42], [R * 0.97, 0.52], [1.3, 0.72], [0.8, 0.8], [0.001, 0.84]].map(p => new THREE.Vector2(p[0], p[1]));
    let geo = new THREE.LatheGeometry(hull, 20); geo = geo.toNonIndexed(); geo.computeVertexNormals();
    projectUVs(geo, { minX: -R, maxX: R, minY: 0, maxY: 0.84, minZ: -R, maxZ: R });
    const hullMesh = new THREE.Mesh(geo, bodyMat); hullMesh.castShadow = !ghost; hullMesh.receiveShadow = !ghost; body.add(hullMesh);
    const glass = new THREE.MeshStandardMaterial({ color: 0x5fd0ff, roughness: 0.05, metalness: 0.3, flatShading: true, transparent: true, opacity: ghost ? 0.3 : 0.62, depthWrite: false });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.78, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), glass); dome.position.y = 0.78; dome.scale.set(1, 0.85, 1.15); dome.renderOrder = 3; body.add(dome);
    const lightMat = new THREE.MeshStandardMaterial({ color: 0x9ff0ff, emissive: 0x39d6ff, emissiveIntensity: 1.6, flatShading: true });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.07, 6, 24), lightMat); ring.rotation.x = Math.PI / 2; ring.position.y = 0.04; body.add(ring);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, l = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4), lightMat); l.position.set(Math.sin(a) * 1.75, 0.46, Math.cos(a) * 1.75); body.add(l); }
    const tailMat = new THREE.MeshStandardMaterial({ color: 0xc73a2e, emissive: 0xf05a35, emissiveIntensity: 0.15 });
    [-1, 1].forEach(s => { const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.08), tailMat); t.position.set(s * 0.6, 0.5, -1.82); t.rotation.y = 0; body.add(t); });
    // underside: glowing core, tractor-beam cone to the ground and a pool of light on the road
    const H = 0.95;
    const add = (o, op) => new THREE.MeshBasicMaterial({ color: o, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    const core = new THREE.Mesh(new THREE.CircleGeometry(0.85, 20), add(0xbff6ff, ghost ? 0.2 : 0.85)); core.rotation.x = Math.PI / 2; core.position.y = -0.02; body.add(core);
    const spin = new THREE.Group(); spin.position.y = 0.0; body.add(spin);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, n = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), lightMat); n.position.set(Math.sin(a) * 1.05, -0.02, Math.cos(a) * 1.05); spin.add(n); }
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.5, H, 20, 1, true), add(0x39d6ff, ghost ? 0.06 : 0.2)); beam.position.y = -H / 2; beam.renderOrder = 2; body.add(beam);
    const beam2 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.95, H, 16, 1, true), add(0xbff6ff, ghost ? 0.05 : 0.22)); beam2.position.y = -H / 2; beam2.renderOrder = 2; body.add(beam2);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1.7, 28), add(0x39d6ff, ghost ? 0.1 : 0.4)); pool.rotation.x = -Math.PI / 2; pool.position.y = -H + 0.02; pool.renderOrder = 2; body.add(pool);
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), lightMat); top.position.y = 1.62; body.add(top);
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 5), new THREE.MeshLambertMaterial({ color: 0xdfe4ea })); ant.position.y = 1.5; body.add(ant);
    root.userData = {
      spec, equip: {}, body, bodyMesh: hullMesh, wheels: [], tailMat, canvas, tex, bodyMat, ufo: true, ufoRing: lightMat, ufoSpin: spin, ufoPool: pool, ufoBeam: [beam, beam2],
      exhaust: new THREE.Vector3(0, 0.2, -1.9), paintMat: bodyMat, deform: false, rearZ: -R, frontZ: R, roofY: 1.5,
      setLivery(liv, b) { DL.drawLiveryCanvas(canvas, liv, b); tex.needsUpdate = true; },
      dispose() { root.traverse(o => { if (o.geometry) o.geometry.dispose(); }); tex.dispose(); bodyMat.dispose(); glass.dispose(); lightMat.dispose(); }
    };
    body.position.y = 0.95;      // hover height
    return root;
  }

  // Build a full vehicle. opts: {car, livery(Uint8Array), base, equip:{spoiler,wheels,bumper,finish}, ghost:bool}
  DL.buildCar = function (opts) {
    const spec = DL.CARS[opts.car] || DL.CARS.pebble;
    if (spec.kind === 'ufo') return buildUfo(opts, spec);
    const equip = Object.assign({ spoiler: 'none', wheels: 'std', bumper: 'std', finish: 'matte', plate: 'none', tint: 'clear' }, opts.equip || {});
    const root = new THREE.Group();          // follows physics position/yaw
    const body = new THREE.Group();          // pitch/roll
    root.add(body);

    const [spB, spC] = DL.partBase(equip.spoiler), [whB, whC] = DL.partBase(equip.wheels), [buB, buC] = DL.partBase(equip.bumper);
    const knob = whB === 'knobby' || !!(TYRES[whB] && TYRES[whB][1]);
    const prof = carProfile(spec, knob);
    const lower = extrudeProfile(prof, spec.W);
    const cab = extrudeProfile(spec.cabin, spec.W * spec.cw);
    const split = splitCabin(cab, spec.paintCabin);
    if (spec.openTop) { const g = split.glass.attributes.position.array, keep = [];
      for (let t = 0; t < g.length; t += 9) { const ux = g[t + 3] - g[t], uy = g[t + 4] - g[t + 1], uz = g[t + 5] - g[t + 2], vx = g[t + 6] - g[t], vy = g[t + 7] - g[t + 1], vz = g[t + 8] - g[t + 2], nz = ux * vy - uy * vx, l = Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, nz) || 1; if (nz / l > 0.35) keep.push(...Array.prototype.slice.call(g, t, t + 9)); }
      const mk = arr => { const q = new THREE.BufferGeometry(); q.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); q.computeVertexNormals(); return q; };
      split.glass = mk(keep); split.roof = mk([]); }
    // bounding box for projection
    let minY = 1e9, maxY = -1e9, minZ = 1e9, maxZ = -1e9;
    prof.forEach(p => { minZ = Math.min(minZ, p[0]); maxZ = Math.max(maxZ, p[0]); minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); });
    if (spec.paintCabin) spec.cabin.forEach(p => { maxY = Math.max(maxY, p[1]); });
    const bb = { minX: -spec.W / 2 - 0.05, maxX: spec.W / 2 + 0.05, minY, maxY, minZ: minZ - 0.05, maxZ: maxZ + 0.05 };
    let bodyGeo = mergeGeos([lower, split.roof]);
    const MD = spec.model ? (k => DL.models.tyre(spec.model + '_' + k).clone()) : null;
    if (MD) { bodyGeo = MD('body'); split.glass = MD('glass'); bb.minY = 0.1; bb.maxY = 1.45; bb.minZ = -2.43; bb.maxZ = 2.43; bb.minX = -1.15; bb.maxX = 1.15; }
    projectUVs(bodyGeo, bb);

    const canvas = document.createElement('canvas');
    const livery = opts.livery || DL.defaultLivery();
    DL.drawLiveryCanvas(canvas, livery, opts.base == null ? DL.DEFAULT_BASE : opts.base);
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
    if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
    const fx = DL.FINISH_EXTRA && DL.FINISH_EXTRA[equip.finish], fin = FINISH[equip.finish] || (fx ? { roughness: fx[1], metalness: fx[2] } : FINISH.matte);
    const bodyMat = new THREE.MeshStandardMaterial({ map: tex, flatShading: true, roughness: fin.roughness, metalness: fin.metalness });
    if (opts.ghost) { bodyMat.transparent = true; bodyMat.opacity = 0.72; bodyMat.depthWrite = false; }
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.castShadow = !opts.ghost; bodyMesh.receiveShadow = !opts.ghost;
    body.add(bodyMesh);
    const glassSolid = opts.ghost ? new THREE.MeshBasicMaterial({ color: 0x1f2a3d, transparent: true, opacity: 0.3, depthWrite: false })
      : sharedMat('glassSolid', () => new THREE.MeshStandardMaterial({ color: 0x232c3b, roughness: 0.15, metalness: 0.4, flatShading: true }));
    const glassMat = opts.ghost ? glassSolid
      : sharedMat('glass18', () => new THREE.MeshStandardMaterial({ color: 0x2b3d58, roughness: 0.08, metalness: 0.45, flatShading: true, transparent: true, opacity: 0.4, depthWrite: false }));
    const tintDef = DL.TINTS[equip.tint];
    const glassUse = tintDef && opts.ghost ? sharedMat('gtint_' + equip.tint, () => new THREE.MeshBasicMaterial({ color: tintDef[0], transparent: true, opacity: 0.5, depthWrite: false })) : tintDef ? sharedMat('tint_' + equip.tint, () => new THREE.MeshStandardMaterial({ color: tintDef[0], roughness: 0.08, metalness: 0.45, flatShading: true, transparent: true, opacity: tintDef[1], depthWrite: false })) : glassMat;
    const glass = new THREE.Mesh(split.glass, glassUse); glass.castShadow = false; glass.renderOrder = 3; body.add(glass);
    let modelHead = null, modelTail = null;
    if (MD) {
      const gm = (k, mat, shadow) => { const m = new THREE.Mesh(MD(k), mat); m.castShadow = shadow && !opts.ghost; body.add(m); return m; };
      gm('dark', opts.ghost ? glassSolid : sharedMat('gtDark', () => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })), true);
      modelHead = true; modelTail = true;
    }
    const extraMat = opts.ghost ? glassMat : sharedMat('trim', () => new THREE.MeshLambertMaterial({ color: 0x1f2a3d, flatShading: true }));
    // solid paint for add-on bodywork (wings, bed rails): box UVs would smear the livery texture across them
    const partCol = k => { const i = DL.partColour(livery, k); return i && DL.PALETTE[i] ? DL.PALETTE[i] : null; };
    const paintMat = opts.ghost ? glassMat : new THREE.MeshStandardMaterial({ color: new THREE.Color(partCol('trim') || DL.PALETTE[opts.base == null ? DL.DEFAULT_BASE : opts.base]), flatShading: true, roughness: fin.roughness, metalness: fin.metalness });
    let frameMat = null;
    if (!opts.ghost && !MD) {
      const intMesh = new THREE.Mesh(interiorGeo(spec, spec.paintCabin || spec.openTop ? null : split.roof, prof, knob), sharedMat('interior', () => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })));
      body.add(intMesh);
      if (!spec.paintCabin && !spec.noFrame) {
        frameMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(partCol('frame') || DL.PALETTE[opts.base == null ? DL.DEFAULT_BASE : opts.base]), flatShading: true, roughness: fin.roughness, metalness: fin.metalness });
        const fr = new THREE.Mesh(frameGeo(spec), frameMat); fr.castShadow = true; body.add(fr);
      }
    }

    // side windows for panel-sided bodies
    if (spec.windows) {
      // cab door windows only, kept forward of the race-number roundel (livery columns 12-20 of 32) so nothing covers the number
      const Lb = bb.maxZ - bb.minZ, zStart = bb.minZ + Lb * 0.66, zc = zStart + 0.28, zl = 0.5;
      const topAt = z => { let t = -1e9; const c = spec.cabin; for (let k = 0; k < c.length; k++) { const a = c[k], b2 = c[(k + 1) % c.length]; if ((a[0] - z) * (b2[0] - z) <= 0 && a[0] !== b2[0]) t = Math.max(t, a[1] + (b2[1] - a[1]) * (z - a[0]) / (b2[0] - a[0])); } return t; };
      const y1 = topAt(zc + zl / 2) - 0.12, y0 = Math.min(...spec.cabin.map(p => p[1])) + 0.2;
      if (y1 - y0 > 0.15) [-1, 1].forEach(s => {
        const w = new THREE.Mesh(new THREE.BoxGeometry(0.04, y1 - y0, zl), glassSolid);
        w.position.set(s * (spec.W * spec.cw / 2 + 0.06), (y0 + y1) / 2, zc); body.add(w);
      });
    }
    if (spec.bed) {
      [-1, 1].forEach(s => { const r = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 1.3), paintMat); r.position.set(s * (spec.W / 2 - 0.02), 1.45, -1.55); body.add(r); });
      const tg = new THREE.Mesh(new THREE.BoxGeometry(spec.W, 0.35, 0.1), paintMat); tg.position.set(0, 1.45, -2.2); body.add(tg);
    }

    // lights
    const frontZ = Math.max(...spec.lower.map(p => p[0])), rearZ = Math.min(...spec.lower.map(p => p[0]));
    const hc = partCol('head'), tc = partCol('tail');
    const headMat = opts.ghost ? glassMat : new THREE.MeshStandardMaterial({ color: hc || 0xfff6e0, emissive: hc || 0xfff1cc, emissiveIntensity: 0.6 });
    const tailMat = opts.ghost ? glassMat : tc ? new THREE.MeshStandardMaterial({ color: tc, emissive: tc, emissiveIntensity: 0.15 }) : new THREE.MeshStandardMaterial({ color: 0xc73a2e, emissive: 0xf05a35, emissiveIntensity: 0.15 });
    const lightY = (spec.lower[2][1] + spec.lower[3][1]) / 2;
    const glowTex = sharedMat('glowTex', () => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); });
    const brakeGlow = [], brakeGlowMat = new THREE.MeshBasicMaterial({ map: glowTex, color: tc || 0xff2a1a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    if (MD) {
      const pm = new THREE.Mesh(MD('paint'), paintMat); pm.castShadow = !opts.ghost; body.add(pm);
      body.add(new THREE.Mesh(MD('head'), headMat)); body.add(new THREE.Mesh(MD('tail'), tailMat));
    }
    [-1, 1].forEach(s => {
      const h = MD ? new THREE.Group() : new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.08), headMat); h.position.set(s * spec.W * 0.32, lightY, frontZ + 0.09); body.add(h);
      const t = MD ? new THREE.Group() : new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.08), tailMat); t.position.set(s * spec.W * 0.33, lightY + 0.05, rearZ - 0.08); body.add(t);
      if (!opts.ghost) {   // brake glow: a soft additive flare that only shows while braking
        const gm = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7), brakeGlowMat); gm.position.set(s * spec.W * 0.33, lightY + 0.05, rearZ - 0.16); gm.rotation.y = Math.PI; gm.visible = false; gm.renderOrder = 5; body.add(gm); brakeGlow.push(gm);
      }
    });

    // top of the hull (body + cabin + roof gear) at a given z, so add-ons sit on it instead of cutting through it
    const hullTop = z => {
      let top = -1e9;
      for (const poly of [prof, spec.cabin]) for (let k = 0; k < poly.length; k++) { const a = poly[k], b = poly[(k + 1) % poly.length]; if ((a[0] - z) * (b[0] - z) <= 0 && a[0] !== b[0]) top = Math.max(top, a[1] + (b[1] - a[1]) * (z - a[0]) / (b[0] - a[0])); }
      if (spec.bed && z > -2.3 && z < -0.85) top = Math.max(top, 1.64);
      if (spec.feat === 'mule' && z > -2.2 && z < 1.8) top = Math.max(top, roofYc + 0.22);
      if (spec.feat === 'loaf' && z > -1.9 && z < 1.7) top = Math.max(top, roofYc + 0.1);
      if (spec.feat === 'vintage' && z > rearZ + 0.1 && z < rearZ + 0.6) top = Math.max(top, deckY + 0.58);        // tail-light bars
      if (spec.feat === 'ridge' && z > -2.12 && z < -1.88) top = Math.max(top, 2.28);                           // roll bar
      if (spec.feat === 'ridge' && z > -2.06 && z < -1.04) top = Math.max(top, 2.3);                            // spare wheel
      if (spec.feat === 'bubble' && z > rearZ + 0.02 && z < rearZ + 0.58) top = Math.max(top, 1.17);            // engine hump
      return top;
    };
    const roofYc = Math.max(...spec.cabin.map(p => p[1]));
    const hullTopCabin = z => { let t = -1e9; const c = spec.cabin; for (let k = 0; k < c.length; k++) { const a = c[k], b = c[(k + 1) % c.length]; if ((a[0] - z) * (b[0] - z) <= 0 && a[0] !== b[0]) t = Math.max(t, a[1] + (b[1] - a[1]) * (z - a[0]) / (b[0] - a[0])); } return t; };
    // accessories (a colour variant paints the part instead of using the body colour)
    const partMat = c => opts.ghost ? glassMat : c && DL.ITEM_COLORS[c] ? sharedMat('pc_' + c, () => new THREE.MeshStandardMaterial({ color: DL.ITEM_COLORS[c][1], flatShading: true, roughness: DL.isMetalColor(c) ? 0.28 : 0.5, metalness: DL.isMetalColor(c) ? 0.75 : 0.05 })) : paintMat;
    const spMat = partMat(spC);
    const topRear = spec.cabin.reduce((a, p) => p[0] < a[0] ? p : a, [9, 0]);
    const roofY = Math.max(...spec.cabin.map(p => p[1]));
    const deckY = spec.lower.reduce((m, p) => p[0] < rearZ + 0.6 ? Math.max(m, p[1]) : m, 0);
    if (spB === 'lip') {
      const zc = rearZ + 0.2, top = Math.max(hullTop(zc - 0.15), hullTop(zc + 0.15), hullTop(zc));
      const m = new THREE.Mesh(new THREE.BoxGeometry(spec.W * 0.9, 0.08, 0.35), spMat); m.position.set(0, top + 0.05, zc); m.rotation.x = -0.22; m.castShadow = !opts.ghost; body.add(m);
    } else if (spB === 'ducktail') {
      const zc = rearZ + 0.26, top = Math.max(hullTop(zc - 0.22), hullTop(zc + 0.22), hullTop(zc));
      const m = new THREE.Mesh(new THREE.BoxGeometry(spec.W * 0.95, 0.14, 0.5), spMat); m.position.set(0, top + 0.1, zc); m.rotation.x = -0.4; m.castShadow = !opts.ghost; body.add(m);
    } else if (spB === 'wing') {
      const zc = rearZ + 0.2, sx = spec.feat === 'loaf' ? 0.42 : spec.feat === 'vintage' ? 0.26 : 0.33, ww = spec.feat === 'vintage' ? 0.7 : 0.96;
      let top = -1e9; for (let k = -2; k <= 2; k++) top = Math.max(top, hullTop(zc + k * 0.13));
      const baseUnder = hullTop(zc) - 0.05, wingY = top + 0.34;
      [-1, 1].forEach(sd => { const h = wingY - baseUnder; const st = new THREE.Mesh(new THREE.BoxGeometry(0.07, h, 0.2), extraMat); st.position.set(sd * spec.W * sx, baseUnder + h / 2, zc); st.castShadow = !opts.ghost; body.add(st); });
      const w = new THREE.Mesh(new THREE.BoxGeometry(spec.W * ww, 0.06, 0.52), spMat); w.position.set(0, wingY, zc - 0.02); w.rotation.x = 0.1; w.castShadow = !opts.ghost; body.add(w);
      [-1, 1].forEach(sd => { const e = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.24, 0.6), extraMat); e.position.set(sd * spec.W * ww / 2, wingY + 0.06, zc - 0.02); e.castShadow = !opts.ghost; body.add(e); });
    } else if (spB === 'rack') {
      // flat part of the roof: where the cabin is within a few cm of its highest point
      let z0 = 1e9, z1 = -1e9; for (let z = -3; z <= 3; z += 0.05) if (hullTopCabin(z) >= roofY - 0.06) { z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
      const span = Math.max(0.6, z1 - z0 - 0.3), len = Math.min(1.5, span), zc = (z0 + z1) / 2;
      [-1, 1].forEach(sd => { const r = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, len), extraMat); r.position.set(sd * spec.W * spec.cw * 0.4, roofY + 0.08, zc); r.castShadow = !opts.ghost; body.add(r); });
      const box = new THREE.Mesh(new THREE.BoxGeometry(spec.W * spec.cw * 0.66, 0.3, len * 0.8), spC ? spMat : sharedMat('cargo', () => new THREE.MeshLambertMaterial({ color: 0xc9ad7f, flatShading: true })));
      box.position.set(0, roofY + 0.28, zc); box.castShadow = !opts.ghost; body.add(box);
    }
    if (buB === 'bullbar') {
      const bm = buC ? partMat(buC) : extraMat;
      [-1, 1].forEach(s => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.1), bm); p.position.set(s * spec.W * 0.3, spec.lower[0][1] + 0.35, frontZ + 0.3); body.add(p); });
      const t = new THREE.Mesh(new THREE.BoxGeometry(spec.W * 0.8, 0.1, 0.1), bm); t.position.set(0, spec.lower[0][1] + 0.65, frontZ + 0.3); body.add(t);
      const b = t.clone(); b.position.y -= 0.35; body.add(b);
    } else if (buB === 'pods') {
      for (let k = 0; k < 4; k++) {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.12, 8), buC && !opts.ghost ? sharedMat('pod_' + buC, () => new THREE.MeshStandardMaterial({ color: DL.ITEM_COLORS[buC][1], emissive: DL.ITEM_COLORS[buC][1], emissiveIntensity: 0.7 })) : headMat);
        p.rotation.x = Math.PI / 2; p.position.set((k - 1.5) * spec.W * 0.2, lightY + 0.06, frontZ + 0.2); body.add(p);
      }
    }

    if (DL.PLATE_STYLES[equip.plate]) {
      const txt = DL.plateText(equip.plateText), pm = plateMat(equip.plate, txt, !!opts.ghost);
      const pw = 0.62, ph = 0.16, py = spec.lower[0][1] + 0.44;
      // where the hull outline sits at plate height (the ends are sloped on most cars)
      const edgeZ = (y, rearSide) => { let best = rearSide ? 1e9 : -1e9; const L = spec.lower; for (let k = 0; k < L.length; k++) { const a = L[k], b = L[(k + 1) % L.length]; if ((a[1] - y) * (b[1] - y) <= 0 && a[1] !== b[1]) { const z = a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]); best = rearSide ? Math.min(best, z) : Math.max(best, z); } } return best; };
      const rz = edgeZ(py, true), fz = edgeZ(py, false);
      if (rz < 1e8) { const rear = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), pm); rear.position.set(0, py, rz - 0.06); rear.rotation.y = Math.PI; body.add(rear); }
      if (fz > -1e8) { const front = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), pm); front.position.set(0, py, fz + 0.06); body.add(front); }
    }

    addFeatures({ body, spec, bodyMat, extraMat, headMat, tailMat, glassMat, glassSolid, frontZ, rearZ, roofY, lightY, deckY, paintMat, ghost: !!opts.ghost });

    // wheels
    const wheels = [];
    for (const z of spec.wz) for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * ((spec.W / 2 - 0.05) * spec.wx / 0.9 - (TYRES[whB] ? 0.05 : 0)), spec.wr * (knob ? 1.1 : 1), z);
      const w = buildWheel(spec, whB, whC, s);
      if (opts.ghost) w.traverse(o => { if (o.material) { o.material = glassMat; } });
      else w.traverse(o => { if (o.isMesh) o.castShadow = true; });
      pivot.add(w); body.add(pivot);
      wheels.push({ pivot, wheel: w, front: z > 0, side: s, baseY: pivot.position.y, c: 0.07, v: 0 });
    }
    if (!opts.ghost) wheels.forEach(w => deformTire(w, w.c, 0));
    const lift = knob ? spec.wr * 0.1 : 0;
    body.position.y = lift;

    root.userData = {
      spec, equip, body, bodyMesh, wheels, tailMat, brakeGlow, brakeGlowMat, tailBase: tc || 0xc73a2e, canvas, tex, bodyMat,
      exhaust: new THREE.Vector3(spec.W * 0.28, spec.lower[0][1] + 0.08, rearZ - 0.2), paintMat, deform: !opts.ghost,
      rearZ, frontZ, roofY,
      exhaust2: (spec.feat === 'comet' || spec.feat === 'vintage') ? new THREE.Vector3(-spec.W * 0.28, spec.lower[0][1] + 0.08, rearZ - 0.2) : null,
      // paint mode: swap in an 8x texture with a visible pixel grid so every paintable cell shows on the car
      setGrid(on, liv, base) {
        if (!on) { if (bodyMat.map !== tex) { bodyMat.map = tex; bodyMat.needsUpdate = true; } this.gridOn = false; return; }
        if (!this.gridTex) { this.gridCv = document.createElement('canvas'); this.gridTex = new THREE.CanvasTexture(this.gridCv); this.gridTex.anisotropy = 4; if ('colorSpace' in this.gridTex) this.gridTex.colorSpace = THREE.SRGBColorSpace; }
        this.gridOn = true; DL.drawGridCanvas(this.gridCv, liv, base); this.gridTex.needsUpdate = true;
        if (bodyMat.map !== this.gridTex) { bodyMat.map = this.gridTex; bodyMat.needsUpdate = true; }
      },
      setLivery(liv, base) {
        DL.drawLiveryCanvas(canvas, liv, base); if (this.gridOn) this.setGrid(true, liv, base);
        const bc = DL.PALETTE[base == null ? DL.DEFAULT_BASE : base], pc = k => { const i = DL.partColour(liv, k); return i && DL.PALETTE[i] ? DL.PALETTE[i] : null; };
        if (paintMat.color) paintMat.color.set(pc('trim') || bc); tex.needsUpdate = true; if (frameMat) frameMat.color.set(pc('frame') || bc);
        if (!opts.ghost) { const h = pc('head'), t = pc('tail'); headMat.color.set(h || 0xfff6e0); headMat.emissive.set(h || 0xfff1cc); tailMat.color.set(t || 0xc73a2e); tailMat.emissive.set(t || 0xf05a35); brakeGlowMat.color.set(t || 0xff2a1a); this.tailBase = t || 0xc73a2e; }
      },
      dispose() { root.traverse(o => { if (o.geometry) o.geometry.dispose(); }); tex.dispose(); if (this.gridTex) this.gridTex.dispose(); bodyMat.dispose(); }
    };
    return root;
  };

  // apply physics state to a car model
  DL.poseCar = function (model, x, y, z, yaw, pitch, roll, steer, spin, brake) {
    model.position.set(x, y, z);
    model.rotation.set(0, yaw, 0);
    const u = model.userData;
    if (u.ufo) {
      const t = DL.vehTime != null ? DL.vehTime : performance.now() / 1000, hv = 0.95 + Math.sin(t * 2.2) * 0.06;
      u.body.position.y = hv; u.ufoRing.emissiveIntensity = 1.5 + Math.sin(t * 5) * 0.5; u.ufoSpin.rotation.y = t * 1.6;
      // keep the light pool on the road: it follows the hover height, and the cone stretches to meet it
      u.ufoPool.position.y = -hv + 0.04; u.ufoPool.scale.setScalar(0.95 + Math.sin(t * 3) * 0.05);
      u.ufoBeam.forEach(b => { b.scale.y = hv / 0.95; b.position.y = -hv / 2; });
    }
    u.body.rotation.order = 'YXZ';
    u.body.rotation.x = pitch; u.body.rotation.z = roll;
    // tyre load: braking/accel pitch, cornering roll, and landings/bumps (sudden change of vertical speed)
    const dy = u.py == null ? 0 : y - u.py, pd = u.pdy || 0;
    // only a real landing squashes the tyres: falling fast on the previous frame and suddenly not any more (bumps and slopes do not count)
    const impact = pd < -0.035 && dy > pd ? DL.clamp((dy - pd) * 0.8, 0, 0.35) : 0; u.py = y; u.pdy = dy;
    for (const w of u.wheels) {
      if (w.front) w.pivot.rotation.y = -steer * 0.45;
      w.wheel.rotation.x = spin || 0;
      if (u.deform) {
        const T = DL.clamp(0.07 + (w.front ? 1 : -1) * pitch * 1.4 + (w.side < 0 ? 1 : -1) * roll * 1.4, 0.02, 0.17);
        w.v += (T - w.c) * 0.4 + impact * 0.8; w.v *= 0.72; w.c = DL.clamp(w.c + w.v, 0, 0.22);
        deformTire(w, w.c, spin || 0);
      }
    }
    if (u.tailMat && u.tailMat.emissiveIntensity !== undefined) { u.tailMat.emissiveIntensity = brake ? 2.2 : 0.1; if (u.brakeGlow) for (const g of u.brakeGlow) g.visible = !!brake; }
  };

})(window.DL);
