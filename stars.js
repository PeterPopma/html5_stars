const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;
const CANVAS_CENTER_X = CANVAS_WIDTH / 2;
const CANVAS_CENTER_Y = CANVAS_HEIGHT / 2;
// star data is stored for scales: [CurrentTopLayer-VISIBLE_SCALES-BUFFER_LAYERS] until [CurrentTopLayer+BUFFER_LAYERS]
// the buffer is to prevent "hops" when subsequently zooming in and out.
const VISIBLE_LAYERS = 10;
// to prevent "hops" subsequently moving left and right
const BUFFER_LAYERS = 5;
// to prevent "hops" subsequently moving up and down
const BUFFER_PIXELS_X = 0;// CANVAS_WIDTH / 2;
const BUFFER_PIXELS_Y = 0;//CANVAS_HEIGHT / 2;

// Determines how much the (visible) distance gets smaller between objects from one layer to the next
const DISTANCE_MULTIPLICATION_FACTOR = 0.8;
const MAX_LAYERS = 99999;
const SCALEPOWER = 0.00361445075499040250883138060853;
// At scale 1, 1 pixel equals 0.01 lightyears
const LIGHTYEARS_PER_PIXEL_SCALE_1 = 0.01;

const STARS_PER_SQUARE_LIGHTYEAR_SCALE_1 = 11.39620214236184311779263268063;
const USED_SCALE = Math.pow(VISIBLE_LAYERS, (1 - SCALEPOWER) + VISIBLE_LAYERS * SCALEPOWER);   // we create stars for the largest area this layer appears in.
const STARS_AREA_WIDTH_LAYER_1 = LIGHTYEARS_PER_PIXEL_SCALE_1 * (CANVAS_WIDTH+BUFFER_PIXELS_X*2) * USED_SCALE;
const STARS_AREA_HEIGHT_LAYER_1 = LIGHTYEARS_PER_PIXEL_SCALE_1 * (CANVAS_HEIGHT+BUFFER_PIXELS_Y*2) * USED_SCALE;
const STARS_AREA_SQUARE_LAYER_1 = STARS_AREA_WIDTH_LAYER_1 * STARS_AREA_HEIGHT_LAYER_1;
const STARS_PER_LAYER = Math.round(STARS_PER_SQUARE_LIGHTYEAR_SCALE_1 * STARS_AREA_SQUARE_LAYER_1);
const HALF_STARS_AREA_WIDTH_LAYER_1 = STARS_AREA_WIDTH_LAYER_1 / 2;
const HALF_STARS_AREA_HEIGHT_LAYER_1 = STARS_AREA_HEIGHT_LAYER_1 / 2;

const ZOOM_IN_LEFT = 10;
const ZOOM_IN_TOP = 70;
const ZOOM_OUT_LEFT = 10;
const ZOOM_OUT_TOP = 160;
const ZOOM_SIZE = 80;

const MOVE_LEFT_LEFT = 138;
const MOVE_LEFT_TOP = 125;
const MOVE_RIGHT_LEFT = 262;
const MOVE_RIGHT_TOP = 125;
const MOVE_UP_LEFT = 200;
const MOVE_UP_TOP = 61;
const MOVE_DOWN_LEFT = 200;
const MOVE_DOWN_TOP = 188;
const MOVE_SIZE = 60;
const MOVE_SPEED_PIXELS = 10;

var canvas = document.querySelector('canvas');
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
var ctx = canvas.getContext('2d');

// CurrentTopLayer represents a of stars at a certain scale
// at any time, we are only watching the stars from current layer and the 10(=VISIBLE_LAYERS) layers below it.
var CurrentTopLayer = 1;
// the real distance of 1 pixel on the screen. [1 pixel] = [scale*LIGHTYEARS_PER_PIXEL_SCALE_1] lightyears
var CurrentScale = Math.pow(CurrentTopLayer, (1 - SCALEPOWER) + CurrentTopLayer * SCALEPOWER);
// offset from our sun in real distance, + is to the right
// this is layer-independent, for example [OffsetX]=10 means the current centerX is 10 lightyears to the right from the sun
var OffsetX = 0;
var OffsetY = 0;
var starsList = [];
var gradient;
var isMouseDown = false;
var MouseX, MouseY;
var delayInMilliseconds = 1;

var zoomInImage = new Image();
var zoomOutImage = new Image();
var moveLeftImage = new Image();
var moveRightImage = new Image();
var moveUpImage = new Image();
var moveDownImage = new Image();
var arrowWidthImage = new Image();
zoomInImage.src = "images/zoom-in.png";
zoomOutImage.src = "images/zoom-out.png";
moveLeftImage.src = "images/move-left.png";
moveRightImage.src = "images/move-right.png";
moveUpImage.src = "images/move-up.png";
moveDownImage.src = "images/move-down.png";
arrowWidthImage.src = "images/arrow-width.png";

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

function xRealToScreen(x, layer) {
  return CANVAS_CENTER_X + (x - OffsetX) / layerToScale(layer);
}

function yRealToScreen(y, layer) {
  return CANVAS_CENTER_Y + (y - OffsetY) / layerToScale(layer);
}

function xRealToScreen(x) {
  return CANVAS_CENTER_X + (x - OffsetX) / layerToScale(CurrentTopLayer);
}

function yRealToScreen(y) {
  return CANVAS_CENTER_Y + (y - OffsetY) / layerToScale(CurrentTopLayer);
}

function layerToScale(layer) {
  return Math.pow(layer, (1 - SCALEPOWER) + layer * SCALEPOWER);
}

function zoomOut() {
  if (CurrentTopLayer <= MAX_LAYERS) {
    CurrentTopLayer++;
    console.log("zoom out. currenttoplayer: " + CurrentTopLayer);
    CurrentScale = Math.pow(CurrentTopLayer, (1 - SCALEPOWER) + CurrentTopLayer * SCALEPOWER);
    var new_layer_number = CurrentTopLayer + BUFFER_LAYERS;
    if (new_layer_number <= MAX_LAYERS - BUFFER_LAYERS) {
      createNewLayer(new_layer_number);
      var old_layer_number = CurrentTopLayer - VISIBLE_LAYERS - BUFFER_LAYERS
      if (old_layer_number > 0) {
        removeOldLayer(old_layer_number);
      }
    }
  }
}

function zoomIn() {
  if (CurrentTopLayer > 1) {
    CurrentTopLayer--;
    console.log("zoom in. currenttoplayer: " + CurrentTopLayer);
    CurrentScale = Math.pow(CurrentTopLayer, (1 - SCALEPOWER) + CurrentTopLayer * SCALEPOWER);
    var new_layer_number = CurrentTopLayer - VISIBLE_LAYERS - BUFFER_LAYERS;
    if (new_layer_number > 0) {
      createNewLayer(new_layer_number);
      removeOldLayer(CurrentTopLayer + BUFFER_LAYERS + 1);
    }
  }
}

function checkButtons() {

  // zoom in	  
  if (MouseX >= ZOOM_IN_LEFT && MouseX < ZOOM_IN_LEFT + ZOOM_SIZE && MouseY >= ZOOM_IN_TOP && MouseY < ZOOM_IN_TOP + ZOOM_SIZE) {
    setTimeout(function () {
      zoomIn();
    }, 1);
  }

  // zoom out	  
  if (MouseX >= ZOOM_OUT_LEFT && MouseX < ZOOM_OUT_LEFT + ZOOM_SIZE && MouseY >= ZOOM_OUT_TOP && MouseY < ZOOM_OUT_TOP + ZOOM_SIZE) {
    setTimeout(function () {
      zoomOut();
    }, 1);
  }

  // move left	  
  if (MouseX >= MOVE_LEFT_LEFT && MouseX < MOVE_LEFT_LEFT + ZOOM_SIZE && MouseY >= MOVE_LEFT_TOP && MouseY < MOVE_LEFT_TOP + ZOOM_SIZE) {
    OffsetX -= CurrentScale * MOVE_SPEED_PIXELS;
    updateStars(0, OffsetX);
  }

  // move right	  
  if (MouseX >= MOVE_RIGHT_LEFT && MouseX < MOVE_RIGHT_LEFT + ZOOM_SIZE && MouseY >= MOVE_RIGHT_TOP && MouseY < MOVE_RIGHT_TOP + ZOOM_SIZE) {
    OffsetX += CurrentScale * MOVE_SPEED_PIXELS;
    updateStars(1, OffsetX);
  }

  // move up	  
  if (MouseX >= MOVE_UP_LEFT && MouseX < MOVE_UP_LEFT + ZOOM_SIZE && MouseY >= MOVE_UP_TOP && MouseY < MOVE_UP_TOP + ZOOM_SIZE) {
    OffsetY -= CurrentScale * MOVE_SPEED_PIXELS;
    updateStars(2, OffsetY);
  }

  // move down	  
  if (MouseX >= MOVE_DOWN_LEFT && MouseX < MOVE_DOWN_LEFT + ZOOM_SIZE && MouseY >= MOVE_DOWN_TOP && MouseY < MOVE_DOWN_TOP + ZOOM_SIZE) {
    OffsetY += CurrentScale * MOVE_SPEED_PIXELS;
    updateStars(3, OffsetY);
  }
}

function updateStars(direction, offset) {
  for (current_layer = CurrentTopLayer; current_layer > CurrentTopLayer - VISIBLE_LAYERS; current_layer--) {
    if (current_layer > 0) {
      var current_scale = layerToScale(current_layer);
      var old_area_left, old_area_top, old_area_right, old_area_bottom;
      var new_area_left, new_area_top, new_area_right, new_area_bottom;

      if (direction==0) {  // moved left
        old_area_left = offset + CANVAS_WIDTH*current_scale + BUFFER_PIXELS_X*current_scale;
        old_area_right = old_area_right + MOVE_SPEED_PIXELS*current_scale;
        new_area_left = offset - BUFFER_PIXELS_X*current_scale;
        new_area_right = new_area_left + MOVE_SPEED_PIXELS*current_scale;
        old_area_top = new_area_top = OffsetY - BUFFER_PIXELS_Y*current_scale;
        old_area_bottom = new_area_bottom = OffsetY + CANVAS_HEIGHT*current_scale + BUFFER_PIXELS_Y*current_scale;
      }
      if (direction==1) {  // moved right
        old_area_right = offset - BUFFER_PIXELS_X*current_scale;
        old_area_left = old_area_right - MOVE_SPEED_PIXELS*current_scale;
        new_area_right = offset + CANVAS_WIDTH*current_scale + BUFFER_PIXELS_X*current_scale;
        new_area_left = offset - MOVE_SPEED_PIXELS*current_scale;
        old_area_top = new_area_top = OffsetY - BUFFER_PIXELS_Y*current_scale;
        old_area_bottom = new_area_bottom = OffsetY + CANVAS_HEIGHT*current_scale + BUFFER_PIXELS_Y*current_scale;
      }
      if (direction==2) {  // moved up
        old_area_top = offset + CANVAS_HEIGHT*current_scale + BUFFER_PIXELS_Y*current_scale;
        old_area_bottom = old_area_top + MOVE_SPEED_PIXELS*current_scale;
        new_area_top = offset - BUFFER_PIXELS_Y*current_scale;
        new_area_bottom = new_area_top + MOVE_SPEED_PIXELS*current_scale;
        old_area_left = new_area_left = OffsetX - BUFFER_PIXELS_X*current_scale;
        old_area_right = new_area_right = OffsetX + CANVAS_WIDTH*current_scale + BUFFER_PIXELS_X*current_scale;
      }
      if (direction==3) {  // moved down
        old_area_bottom = offset - BUFFER_PIXELS_Y*current_scale;
        old_area_top = old_area_bottom - MOVE_SPEED_PIXELS*current_scale;
        new_area_bottom = offset + CANVAS_HEIGHT*current_scale + BUFFER_PIXELS_Y*current_scale;
        new_area_top = offset - MOVE_SPEED_PIXELS*current_scale;
        old_area_left = new_area_left = OffsetX - BUFFER_PIXELS_X*current_scale;
        old_area_right = new_area_right = OffsetX + CANVAS_WIDTH*current_scale + BUFFER_PIXELS_X*current_scale;
      }

      // remove stars from the layer that are no longer visible
      var amount = removeStarsFromOldArea(old_area_left, old_area_right, old_area_top, old_area_bottom, current_layer);

      // add same amount of stars to the layer that have been deleted to new visible area
      if (amount>0) {
        generateStars(new_area_left, new_area_right, new_area_top, new_area_bottom, amount);
      }
    }
  }
}

function removeStarsFromOldArea(old_area_left, old_area_right, old_area_top, old_area_bottom, layer_number) {
  var remove_count = 0;
  for (var index = starsList.length - 1; index >= 0; index--) {
    if (starsList[index].layer == layer_number) {
      if (starsList[index].x >= old_area_left && starsList[index].x < old_area_right && starsList[index].y >= old_area_top && starsList[index].y < old_area_bottom) {
        starsList.splice(index, 1);
        remove_count++;
      }
    }
  };
  console.log("removed " + remove_count + " stars from layer " + layer);
  return remove_count;
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
  ctx.drawImage(zoomInImage, ZOOM_IN_LEFT, ZOOM_IN_TOP, ZOOM_SIZE, ZOOM_SIZE);
  ctx.drawImage(zoomOutImage, ZOOM_OUT_LEFT, ZOOM_OUT_TOP, ZOOM_SIZE, ZOOM_SIZE);
  ctx.drawImage(moveLeftImage, MOVE_LEFT_LEFT, MOVE_LEFT_TOP, MOVE_SIZE, MOVE_SIZE);
  ctx.drawImage(moveRightImage, MOVE_RIGHT_LEFT, MOVE_RIGHT_TOP, MOVE_SIZE, MOVE_SIZE);
  ctx.drawImage(moveUpImage, MOVE_UP_LEFT, MOVE_UP_TOP, MOVE_SIZE, MOVE_SIZE);
  ctx.drawImage(moveDownImage, MOVE_DOWN_LEFT, MOVE_DOWN_TOP, MOVE_SIZE, MOVE_SIZE);
}

// At layer 1, no star must be closer than 6ly from 0,0 (because there is only Alpha Centauri and the sun)
function createLayer1Star(x_real_minimum, x_real_maximum, y_real_minimum, y_real_maximum) {
  var distance = 0, new_star;
  while (distance < 6) {
    new_star = { x: Math.floor(Math.random() * (x_real_maximum - x_real_minimum)) + x_real_minimum, y: Math.floor(Math.random() * (y_real_maximum - y_real_minimum)) + y_real_minimum, layer: 1 };
    distance = Math.sqrt(Math.pow(new_star.x, 2) + Math.pow(new_star.y, 2));
  }
  return new_star;
}

function generateStars(x_real_minimum, x_real_maximum, y_real_minimum, y_real_maximum, layer, num_stars) {
  console.log("generating " + num_stars + " stars on layer: " + layer);
  if (layer == 1) {
    new_star = { x: 0, y: 0, layer: layer };
    starsList.push(new_star);
    new_star = { x: 4.2, y: 0, layer: layer };
    starsList.push(new_star);
  }
  for (i = 0; i < num_stars; i++) {
    var new_star;
    if (layer == 1) {
      new_star = createLayer1Star(x_real_minimum, x_real_maximum, y_real_minimum, y_real_maximum);
    } else {
      new_star = { x: Math.floor(Math.random() * (x_real_maximum - x_real_minimum)) + x_real_minimum, y: Math.floor(Math.random() * (y_real_maximum - y_real_minimum)) + y_real_minimum, layer: layer };
    }
    starsList.push(new_star);
  }
}

function createNewLayer(layer) {
  console.log("adding layer: " + layer);
  const scale = layerToScale(layer);
  var x_real_minimum = OffsetX - HALF_STARS_AREA_WIDTH_LAYER_1 * scale;
  var x_real_maximum = OffsetX + HALF_STARS_AREA_WIDTH_LAYER_1 * scale;
  var y_real_minimum = OffsetY - HALF_STARS_AREA_HEIGHT_LAYER_1* scale;
  var y_real_maximum = OffsetY + HALF_STARS_AREA_HEIGHT_LAYER_1 * scale;
  generateStars(x_real_minimum, x_real_maximum, y_real_minimum, y_real_maximum, layer, STARS_PER_LAYER);
  console.log("added " + STARS_PER_LAYER + " items.");
}

function initStars() {
  for (layer = 1; layer <= BUFFER_LAYERS + 1; layer++) {
    createNewLayer(layer);
  }
}

function removeOldLayer(layer_number) {
  console.log("removing layer: " + layer_number);
  var remove_count = 0;
  for (var index = starsList.length - 1; index >= 0; index--) {
    if (starsList[index].layer == layer_number) {
      starsList.splice(index, 1);
      remove_count++;
    }
  };
  if (remove_count == 0) {
    console.log("REMOVING FAILED!!! ");
  }
  console.log("removed " + remove_count + " items.");
}

function drawStars() {
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (current_star of starsList) {
    var depth = CurrentTopLayer - current_star.layer;
    if (depth >= 0 && depth < VISIBLE_LAYERS) {
      var star_size = 5 - parseInt((depth) / 2);
      var color = 255 - depth * 20;
      ctx.fillStyle = "rgb(" + color + "," + color + "," + color + ")";
      ctx.beginPath();
      var screen_x = xRealToScreen(current_star.x, current_star.layer);
      var screen_y = yRealToScreen(current_star.y, current_star.layer);
      ctx.arc(screen_x, screen_y, star_size, 0 * Math.PI, 2 * Math.PI);
      ctx.fill();
    }
  }

  ctx.font = "bold 24px Arial";
  DrawText("Stars in screen area: " + (CurrentTopLayer * 1000), 10, 280, 'yellow');
  DrawText("X-Distance from sun (ly): " + Math.round(OffsetX * LIGHTYEARS_PER_PIXEL_SCALE_1 * 100) / 100, 10, 310, 'yellow');
  DrawText("Y-Distance from sun (ly): " + Math.round(OffsetY * LIGHTYEARS_PER_PIXEL_SCALE_1 * 100) / 100, 10, 340, 'yellow');
  DrawText("Layer: " + CurrentTopLayer, 10, 370, 'yellow');
  DrawText("Scale: 1:" + Math.round(CurrentScale), 10, 400, 'yellow');
  DrawText(Math.round(CurrentScale * CANVAS_WIDTH * LIGHTYEARS_PER_PIXEL_SCALE_1 * 100) / 100 + " Lightyears", CANVAS_WIDTH / 2 - 100, 70, 'yellow');
  ctx.font = "18px Arial";
  DrawText("Sun", xRealToScreen(0), yRealToScreen(0), 'white');
  if (CurrentTopLayer < 10) {
    DrawText("Alpha centauri", xRealToScreen(4.2 / LIGHTYEARS_PER_PIXEL_SCALE_1), yRealToScreen(0), 'white');
  }
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