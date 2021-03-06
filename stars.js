const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1920;
const CANVAS_CENTER_X = CANVAS_WIDTH / 2;
const CANVAS_CENTER_Y = CANVAS_HEIGHT / 2;
// star data is stored for scales: [CurrentTopLayer-VISIBLE_SCALES] until [CurrentTopLayer]
const VISIBLE_LAYERS = 30;
const BUFFER_LAYERS = 0;

const SCALE_MULTIPLICATION_FACTOR = 1.08;
const LIGHTYEARS_PER_PIXEL_SCALE_1 = 0.01;
const CANVAS_WIDTH_LIGHTYEARS_SCALE_1 = CANVAS_WIDTH*LIGHTYEARS_PER_PIXEL_SCALE_1;
const CANVAS_HEIGHT_LIGHTYEARS_SCALE_1 = CANVAS_HEIGHT*LIGHTYEARS_PER_PIXEL_SCALE_1;

const DIAMETER_OBSERVABLE_UNIVERSE = 93000000000;
const RADIUS_OBSERVABLE_UNIVERSE = DIAMETER_OBSERVABLE_UNIVERSE/2;
const NUM_STARS_IN_UNIVERSE = 1000000000000000000000000;
// 10^24 stars in observable universe. radius universe 46.5 billion. #stars / (4/3 * PI * 46500000000^3) = 0.00000000079146420354094182443310004573847
const STARS_PER_CUBIC_LIGHTYEAR = NUM_STARS_IN_UNIVERSE / (4/3 * Math.PI * Math.pow(RADIUS_OBSERVABLE_UNIVERSE, 3))
const CUBIC_LIGHTYEARS_SCREEN_SCALE_1 = CANVAS_HEIGHT /* (this is considered as "depth") */  * CANVAS_WIDTH * CANVAS_HEIGHT * LIGHTYEARS_PER_PIXEL_SCALE_1 * LIGHTYEARS_PER_PIXEL_SCALE_1 * LIGHTYEARS_PER_PIXEL_SCALE_1;
// Math.pow(SCALE_MULTIPLICATION_FACTOR, layer) * CANVAS_WIDTH * LIGHTYEARS_PER_PIXEL_SCALE_1 = 93.000.000.000 ly (diameter observable universe)
// ->  Math.pow(SCALE_MULTIPLICATION_FACTOR, layer) =  93000000000 / (CANVAS_WIDTH * LIGHTYEARS_PER_PIXEL_SCALE_1)
// ->  layer =  ln(93000000000 / (CANVAS_WIDTH * LIGHTYEARS_PER_PIXEL_SCALE_1))/ln(SCALE_MULTIPLICATION_FACTOR)
const MAX_LAYERS = 1 + Math.floor(Math.log(DIAMETER_OBSERVABLE_UNIVERSE / (CANVAS_WIDTH * LIGHTYEARS_PER_PIXEL_SCALE_1))/Math.log(SCALE_MULTIPLICATION_FACTOR));   

// it is hard to calculate this value, because we are looking at only 1 layer of this area on the universe
const STARS_PER_LAYER = 800;

const ICON_SIZE = 70;
const ZOOM_IN_LEFT = 10;
const ZOOM_IN_TOP = 70;
const ZOOM_OUT_LEFT = ZOOM_IN_LEFT + ICON_SIZE;
const ZOOM_OUT_TOP = 70;
const HOME_LEFT = 10;
const HOME_TOP = 150;

const NAVIGATOR_LEFT = 170;
const NAVIGATOR_TOP = 50;
const NAVIGATOR_SIZE = 200;
const MOVE_SPEED_PIXELS = 10;

var canvas = document.querySelector('canvas');
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
var ctx = canvas.getContext('2d');

// CurrentTopLayer represents a of stars at a certain scale
// at any time, we are only watching the stars from current layer and the 10(=VISIBLE_LAYERS) layers below it.
var CurrentTopLayer = 1;
// the real distance of 1 pixel on the screen. [1 pixel] = [scale*LIGHTYEARS_PER_PIXEL_SCALE_1] lightyears
var CurrentScale = Math.pow(SCALE_MULTIPLICATION_FACTOR, CurrentTopLayer - 1);
// offset from our sun in real distance, + is to the right
// this is layer-independent, for example [OffsetX]=10 means the current centerX is 10 lightyears to the right from the sun
var OffsetX = 0;
var OffsetY = 0;
//var starsList = [];
// we store star information in regions, indexed by layer and offset
var regionsList = [];
var gradient;
var isMouseDown = false;
var MouseX, MouseY;
var delayInMilliseconds = 1;
var NumStars = 0;
var NumRegions = 0;

var zoomInImage = new Image();
var zoomOutImage = new Image();
var navigatorImage = new Image();
var arrowWidthImage = new Image();
var homeImage = new Image();
zoomInImage.src = "images/zoom-in.png";
zoomOutImage.src = "images/zoom-out.png";
navigatorImage.src = "images/navigator.png";
arrowWidthImage.src = "images/arrow-width.png";
homeImage.src = "images/home.png";

initStars();

// Add mouse events
// ----------------
canvas.addEventListener('mousedown', function (event) {
  MouseX = event.pageX - this.offsetLeft;
  MouseY = event.pageY - this.offsetTop;
  isMouseDown = true;
}, false);

canvas.addEventListener('mouseup', function (event) {
  MouseX = event.pageX - this.offsetLeft;
  MouseY = event.pageY - this.offsetTop;
  isMouseDown = false;
}, false);

// converts x (in lightyears from sun) to a point on the screen
function xLightyearsToScreen(x, layer) {
  return CANVAS_CENTER_X + (x - OffsetX) / (LIGHTYEARS_PER_PIXEL_SCALE_1 * layerToScale(layer));
}

// converts y (in lightyears from sun) to a point on the screen
function yLightyearsToScreen(y, layer) {
  return CANVAS_CENTER_Y + (y - OffsetY) / (LIGHTYEARS_PER_PIXEL_SCALE_1 * layerToScale(layer));
}

// converts x (in pixels on screen) to lightyears from sun
function xScreenToLightyears(x, layer) {
  return OffsetX + (x - CANVAS_CENTER_X) * LIGHTYEARS_PER_PIXEL_SCALE_1 * layerToScale(layer);
}

// converts y (in pixels on screen) to lightyears from sun
function yScreenToLightyears(y, layer) {
  return OffsetY + (y - CANVAS_CENTER_Y) * LIGHTYEARS_PER_PIXEL_SCALE_1 * layerToScale(layer);
}

// converts x (in pixels on screen) to lightyears from sun
function xScreenToLightyears(x, layer, offsetX) {
  return offsetX + (x - CANVAS_CENTER_X) * LIGHTYEARS_PER_PIXEL_SCALE_1 * layerToScale(layer);
}

// converts y (in pixels on screen) to lightyears from sun
function yScreenToLightyears(y, layer, offsetY) {
  return offsetY + (y - CANVAS_CENTER_Y) * LIGHTYEARS_PER_PIXEL_SCALE_1 * layerToScale(layer);
}

function scaleUsedToCreateLayer(layer) {
  return layerToScale(layer + (VISIBLE_LAYERS - 1) + BUFFER_LAYERS);
}

function layerToScale(layer) {
  // The last layer should be exactly the scale what we want as maximum
  if(layer==MAX_LAYERS) {
    return DIAMETER_OBSERVABLE_UNIVERSE / (CANVAS_WIDTH * LIGHTYEARS_PER_PIXEL_SCALE_1); 
  }
  return Math.pow(SCALE_MULTIPLICATION_FACTOR, layer - 1);
}

function sleep(milliseconds) {
  var start = new Date().getTime();
  while (1) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
}

function zoomOut() {
  if (CurrentTopLayer < MAX_LAYERS) {
    CurrentTopLayer++;
    console.log("zoom out. currenttoplayer: " + CurrentTopLayer);
    CurrentScale = layerToScale(CurrentTopLayer);

    var new_layer = CurrentTopLayer + BUFFER_LAYERS;
    if (new_layer < MAX_LAYERS + BUFFER_LAYERS) {
      var invalid_layer = CurrentTopLayer - VISIBLE_LAYERS - BUFFER_LAYERS;
      if (invalid_layer > 0) {
        removeInvalidLayer(invalid_layer);
      }
      createNewLayer(new_layer);
    }
  }
}

function zoomIn() {
  if (CurrentTopLayer > 1) {
    CurrentTopLayer--;
    console.log("zoom in. currenttoplayer: " + CurrentTopLayer);
    CurrentScale = layerToScale(CurrentTopLayer);

    var new_layer = CurrentTopLayer - VISIBLE_LAYERS - BUFFER_LAYERS;
    if (new_layer > 0) {
      var invalid_layer = CurrentTopLayer + BUFFER_LAYERS + 1;
      if (invalid_layer > 0) {
        removeInvalidLayer(invalid_layer);
      }
      createNewLayer(new_layer);
    }
  }
}

function checkButtons() {

  // zoom in	  
  if (MouseX >= ZOOM_IN_LEFT && MouseX < ZOOM_IN_LEFT + ICON_SIZE && MouseY >= ZOOM_IN_TOP && MouseY < ZOOM_IN_TOP + ICON_SIZE) {
    sleep(80);
    zoomIn();
  }

  // zoom out	  
  if (MouseX >= ZOOM_OUT_LEFT && MouseX < ZOOM_OUT_LEFT + ICON_SIZE && MouseY >= ZOOM_OUT_TOP && MouseY < ZOOM_OUT_TOP + ICON_SIZE) {
    sleep(80);
    zoomOut();
  }  

  // go home
  if (MouseX >= HOME_LEFT && MouseX < HOME_LEFT + ICON_SIZE && MouseY >= HOME_TOP && MouseY < HOME_TOP + ICON_SIZE) {
    setPosition(0,0);
  }

  // move left	  
  if (MouseX >= NAVIGATOR_LEFT && MouseX < NAVIGATOR_LEFT + NAVIGATOR_SIZE/3 && MouseY >= NAVIGATOR_TOP && MouseY < NAVIGATOR_TOP + NAVIGATOR_SIZE) {
    setPosition(OffsetX - CurrentScale * MOVE_SPEED_PIXELS * LIGHTYEARS_PER_PIXEL_SCALE_1, OffsetY);
  }

  // move right	  
  if (MouseX >= NAVIGATOR_LEFT+NAVIGATOR_SIZE*2/3 && MouseX < NAVIGATOR_LEFT+NAVIGATOR_SIZE && MouseY >= NAVIGATOR_TOP && MouseY < NAVIGATOR_TOP + NAVIGATOR_SIZE) {
    setPosition(OffsetX + CurrentScale * MOVE_SPEED_PIXELS * LIGHTYEARS_PER_PIXEL_SCALE_1, OffsetY);
  }

  // move up	  
  if (MouseX >= NAVIGATOR_LEFT && MouseX < NAVIGATOR_LEFT + NAVIGATOR_SIZE && MouseY >= NAVIGATOR_TOP && MouseY < NAVIGATOR_TOP + NAVIGATOR_SIZE/2) {
    setPosition(OffsetX, OffsetY - CurrentScale * MOVE_SPEED_PIXELS * LIGHTYEARS_PER_PIXEL_SCALE_1);
  }

  // move down	  
  if (MouseX >= NAVIGATOR_LEFT && MouseX < NAVIGATOR_LEFT + NAVIGATOR_SIZE && MouseY >= NAVIGATOR_TOP+NAVIGATOR_SIZE*2/3 && MouseY < NAVIGATOR_TOP+NAVIGATOR_SIZE) {
    setPosition(OffsetX, OffsetY + CurrentScale * MOVE_SPEED_PIXELS * LIGHTYEARS_PER_PIXEL_SCALE_1);
  }
}

function setPosition(newOffsetX, newOffsetY) {

  OffsetX = newOffsetX;
  OffsetY = newOffsetY;

  for (current_layer = CurrentTopLayer; current_layer > CurrentTopLayer - VISIBLE_LAYERS; current_layer--) {
    if (current_layer > 0) {
      removeInvalidRegions(current_layer);
      createNewRegions(current_layer);
    }
  }

}

function removeInvalidRegions(layer) {
  var valid_area_left, valid_area_top, valid_area_right, valid_area_bottom;
  var remove_count = 0;
  const used_scale = scaleUsedToCreateLayer(layer);
  valid_area_left = (OffsetX - OffsetX % (CANVAS_WIDTH_LIGHTYEARS_SCALE_1*used_scale))-CANVAS_WIDTH_LIGHTYEARS_SCALE_1*used_scale;
  valid_area_top = (OffsetY - OffsetY % (CANVAS_HEIGHT_LIGHTYEARS_SCALE_1*used_scale))-CANVAS_HEIGHT_LIGHTYEARS_SCALE_1*used_scale;
  valid_area_right = valid_area_left+2*CANVAS_WIDTH_LIGHTYEARS_SCALE_1*used_scale;
  valid_area_bottom = valid_area_top+2*CANVAS_HEIGHT_LIGHTYEARS_SCALE_1*used_scale;
  for (var index = regionsList.length - 1; index >= 0; index--) {
    if (regionsList[index].Layer == layer) {
      if (regionsList[index].OffsetX < valid_area_left || regionsList[index].OffsetY < valid_area_top || regionsList[index].OffsetX > valid_area_right || regionsList[index].OffsetY > valid_area_bottom) {
        console.log("removed region. OffsetX:" + regionsList[index].OffsetX + ', OffsetY:' + regionsList[index].OffsetY + ', Layer:' + layer);
        regionsList.splice(index, 1);
        remove_count++;
      }
    }
  };
  if(remove_count>0) {
//    console.log("removed " + remove_count + " regions from layer: " + layer);
  }
}

function createNewRegions(layer) {
  const used_scale = scaleUsedToCreateLayer(layer);
  var create_count = 0;
  var used_offset_x = (OffsetX - OffsetX % (CANVAS_WIDTH_LIGHTYEARS_SCALE_1*used_scale))-CANVAS_WIDTH_LIGHTYEARS_SCALE_1*used_scale;
  for(x=used_offset_x; x<used_offset_x+3*CANVAS_WIDTH_LIGHTYEARS_SCALE_1*used_scale; x+=CANVAS_WIDTH_LIGHTYEARS_SCALE_1*used_scale) {
    var used_offset_y = (OffsetY - OffsetY % (CANVAS_HEIGHT_LIGHTYEARS_SCALE_1*used_scale))-CANVAS_HEIGHT_LIGHTYEARS_SCALE_1*used_scale;
    for(y=used_offset_y; y<used_offset_y+3*CANVAS_HEIGHT_LIGHTYEARS_SCALE_1*used_scale; y+=CANVAS_HEIGHT_LIGHTYEARS_SCALE_1*used_scale) {
      if(regionsList.find(el => el.OffsetX==x && el.OffsetY==y)==undefined) {
        addRegion(x, y, layer, used_scale);
        create_count++;
      }
    }
  }
  if(create_count>0) {
//    console.log("created " + create_count + " regions on layer: " + layer);
  }

}

function render() {
  window.requestAnimationFrame(render);
  if (isMouseDown) {
    checkButtons();
  }
  drawStars();
  drawIcons();
}

if (typeof (canvas.getContext) !== undefined) {
  cx = canvas.getContext('2d');
  render();
}

function drawIcons() {
  ctx.drawImage(arrowWidthImage, 0, 2, CANVAS_WIDTH, 70);
  ctx.drawImage(zoomInImage, ZOOM_IN_LEFT, ZOOM_IN_TOP, ICON_SIZE, ICON_SIZE);
  ctx.drawImage(zoomOutImage, ZOOM_OUT_LEFT, ZOOM_OUT_TOP, ICON_SIZE, ICON_SIZE);
  ctx.drawImage(navigatorImage, NAVIGATOR_LEFT, NAVIGATOR_TOP, NAVIGATOR_SIZE, NAVIGATOR_SIZE);
  ctx.drawImage(homeImage, HOME_LEFT,HOME_TOP, ICON_SIZE, ICON_SIZE);
}

// At layer 1, no star must be closer than 6ly from 0,0 (because there is only Alpha Centauri and the sun)
function createLayer1Star(x_real_minimum, y_real_minimum, x_real_maximum, y_real_maximum) {
  var distance = 0, new_star;
  while (distance < 6) {
    new_star = { x: Math.random() * (x_real_maximum - x_real_minimum) + x_real_minimum, y: Math.random() * (y_real_maximum - y_real_minimum) + y_real_minimum, layer: 1 };
    distance = Math.sqrt(Math.pow(new_star.x, 2) + Math.pow(new_star.y, 2));
//    console.log("created star at: " + xLightyearsToScreen(new_star.x, 1) + ',' + yLightyearsToScreen(new_star.y, 1));
}
  return new_star;
}

function generateStars(starsList, x_real_minimum, y_real_minimum, x_real_maximum, y_real_maximum, layer, num_stars) {
//  console.log("generating " + num_stars + " stars on layer: " + layer);

  for (i = 0; i < num_stars; i++) {
    var new_star;
    if (layer == 1) {
      new_star = createLayer1Star(x_real_minimum, y_real_minimum, x_real_maximum, y_real_maximum);
    } else {
      new_star = { x: Math.random() * (x_real_maximum - x_real_minimum) + x_real_minimum, y: Math.random() * (y_real_maximum - y_real_minimum) + y_real_minimum, layer: layer };
    }
    starsList.push(new_star);
  }
}

function addRegion(x, y, layer, scale) {
  var x_real_minimum = x;
  var y_real_minimum = y;
  var x_real_maximum = x + CANVAS_WIDTH_LIGHTYEARS_SCALE_1*scale;
  var y_real_maximum = y + CANVAS_HEIGHT_LIGHTYEARS_SCALE_1*scale;
  var new_region = {};
  var starsList = [];
  new_region['OffsetX'] = x;
  new_region['OffsetY'] = y;
  new_region['Layer'] = layer;
  new_region['starsList'] = starsList;

  regionsList.push(new_region);
//    console.log("real_minmax= " + x_real_minimum + "," + x_real_maximum + "," + y_real_minimum + "," + y_real_maximum);
    generateStars(starsList, x_real_minimum,  y_real_minimum, x_real_maximum, y_real_maximum, layer, STARS_PER_LAYER);
//    console.log("added region. OffsetX:" + x + ', OffsetY:' + y + ', Layer:' + layer);
}

// Creates a new layer with 9 regions of stars around the offset
// Used when zooming in- and out and at beginning
function createNewLayer(layer) {
  console.log("adding layer: " + layer);
  var regions = 0;
  // determine the area to generate stars for
  // the scale is based on the largest scale the stars are visible in, 
  // so that we don't need to generate stars for every layer when zooming in- and out
  const used_scale = scaleUsedToCreateLayer(layer);
  var used_offset_x = (OffsetX - OffsetX % (CANVAS_WIDTH_LIGHTYEARS_SCALE_1*used_scale))-CANVAS_WIDTH_LIGHTYEARS_SCALE_1*used_scale;
  for(x=used_offset_x; x<used_offset_x+3*CANVAS_WIDTH_LIGHTYEARS_SCALE_1*used_scale; x+=CANVAS_WIDTH_LIGHTYEARS_SCALE_1*used_scale) {
    var used_offset_y = (OffsetY - OffsetY % (CANVAS_HEIGHT_LIGHTYEARS_SCALE_1*used_scale))-CANVAS_HEIGHT_LIGHTYEARS_SCALE_1*used_scale;
    for(y=used_offset_y; y<used_offset_y+3*CANVAS_HEIGHT_LIGHTYEARS_SCALE_1*used_scale; y+=CANVAS_HEIGHT_LIGHTYEARS_SCALE_1*used_scale) {
      addRegion(x, y, layer, used_scale);
      regions++;
    }
  }
  console.log("added: " + regions + " regions");

}

function initStars() {
  for (layer = 1; layer <= 1 + BUFFER_LAYERS; layer++) {
    createNewLayer(layer);
  }
}

function removeInvalidLayer(layer) {
  console.log("removing layer: " + layer);
  var remove_count = 0;
  for (var index = regionsList.length - 1; index >= 0; index--) {
    if (regionsList[index].Layer == layer) {
      regionsList.splice(index, 1);
      remove_count++;
    }
  }
  if (remove_count == 0) {
    console.log("Tried to remove layer with no regions!!! ");
  }
  console.log("removed " + remove_count + " regions.");
}

function convertEtoNumber(stars_in_screen, index) {
  if(index!=-1) {
    var begin_index = stars_in_screen.indexOf(".");
    var digits_present = index - begin_index - 1;
    var digits_wanted = stars_in_screen.substr(index+2);
    var zeroes_added = digits_wanted - digits_present;
    stars_in_screen = stars_in_screen.substr(0, begin_index) + stars_in_screen.substring(begin_index+1, index-1)  + "0" /* to prevent showing rounding errors */ + "0".repeat(zeroes_added)
  }
  return stars_in_screen;
}

function drawStars() {
  NumStars = 0;
  NumRegions = 0;
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.shadowColor = "rgb(90, 90, 90)";
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  ctx.shadowBlur = 5;
  for (current_region of regionsList) {
    NumRegions++;
    for (current_star of current_region.starsList) {
      NumStars++;
      var screen_x = xLightyearsToScreen(current_star.x, CurrentTopLayer);
      if(screen_x>=0 && screen_x<CANVAS_WIDTH) {
        var screen_y = yLightyearsToScreen(current_star.y, CurrentTopLayer);
        if(screen_y>=0 && screen_y<CANVAS_HEIGHT) {
          var depth = 5 + CurrentTopLayer - current_star.layer;   // depth 5 .. 34 with VISIBLE_LAYERS=30
          var star_size = 4 - parseInt((depth) / 10);
          var color = 280 - depth * 5;
          ctx.fillStyle = "rgb(" + color + "," + color + "," + color + ")";    
          ctx.beginPath();
          ctx.rect(screen_x, screen_y, star_size, star_size);
//          ctx.arc(screen_x, screen_y, star_size, 0 * Math.PI, 2 * Math.PI);
          ctx.fill();
        }
      }
    }
  }
  // draw Sun and Alpha centauri
  if (CurrentTopLayer < VISIBLE_LAYERS) {
    var depth = CurrentTopLayer;
    var star_size = 4 - parseInt((depth) / 10);
    var color = 255 - depth * 5;
    ctx.fillStyle = "rgb(" + color + "," + color + "," + color + ")";
    ctx.beginPath();
    var screen_x = xLightyearsToScreen(0, depth);
    var screen_y = yLightyearsToScreen(0, depth);
    ctx.arc(screen_x, screen_y, star_size, 0 * Math.PI, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    var screen_x = xLightyearsToScreen(4.2, depth);
    var screen_y = yLightyearsToScreen(0, depth);
    ctx.arc(screen_x, screen_y, star_size, 0 * Math.PI, 2 * Math.PI);
    ctx.fill();
  }  

  ctx.font = "bold 24px Arial";
  var stars_in_screen = Math.round(STARS_PER_CUBIC_LIGHTYEAR * Math.PI * 4 / 3 * Math.pow(CANVAS_WIDTH/2*CurrentScale*LIGHTYEARS_PER_PIXEL_SCALE_1, 3));
  stars_in_screen = stars_in_screen.toString();
  stars_in_screen = convertEtoNumber(stars_in_screen, stars_in_screen.indexOf("e"));
  DrawText("Avg. stars in screen area: " + stars_in_screen, 10, 280, 'yellow');
  DrawText("X-Distance from sun (ly): " + Math.round(OffsetX), 10, 310, 'yellow');
  DrawText("Y-Distance from sun (ly): " + Math.round(OffsetY), 10, 340, 'yellow');
  DrawText("Layer: " + CurrentTopLayer, 10, 370, 'yellow');
  DrawText("Scale: 1:" + Math.round(CurrentScale), 10, 400, 'yellow');
  DrawText(Math.round(CurrentScale * CANVAS_WIDTH * LIGHTYEARS_PER_PIXEL_SCALE_1 * 100) / 100 + " Lightyears", CANVAS_WIDTH / 2 - 100, 70, 'yellow');
  ctx.font = "18px Arial";
  DrawText("Sun", xLightyearsToScreen(0, CurrentTopLayer), yLightyearsToScreen(0, CurrentTopLayer), 'white');
  if (CurrentTopLayer < VISIBLE_LAYERS) {
    DrawText("Alpha centauri", xLightyearsToScreen(4.2, CurrentTopLayer), yLightyearsToScreen(0, CurrentTopLayer), 'white');
  }

  var depth = CurrentTopLayer - 1;
  var screen_x = xLightyearsToScreen(4.2, depth);
  DrawText("NumStars: " + NumStars, 10, 760, 'white');
  DrawText("NumRegions: " + NumRegions, 10, 790, 'white');
}

function DrawText(text, x, y, color) {
  /*
  gradient = ctx.createLinearGradient(0, y-20, 0, y);
  gradient.addColorStop("0"," yellow");
  gradient.addColorStop("0.7", "orange");
  gradient.addColorStop("0.8", "goldenrod");
  gradient.addColorStop("0.9", "saddlebrown");
  gradient.addColorStop("1.0", "sienna");
  ctx.fillStyle = gradient;*/
  ctx.fillStyle = color;
  ctx.strokeStyle = 'black';
  ctx.shadowColor = "rgb(90, 90, 90)";
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  ctx.shadowBlur = 7;

  ctx.fillText(text, x, y);
}




// star { x, y, layer } 
// the layer, x and y form a box that contains star currently visible
// if we pan or zoom, the position of the box changes. new stars are created in the new region of the box.
// the position of the star on the screen is determined by the x, y and CurrentTopLayer (with respect to star's layer)
// star that are further away are more drawn to the center.
// this is accomplished by using a larger box for scale-layers more far away (lower scale)
// x = star.x-screen_x * (star.scale/current_scale) + SCREEN_CENTER_X