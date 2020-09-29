
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;
const CANVAS_CENTER_X = CANVAS_WIDTH/2;
const CANVAS_CENTER_Y = CANVAS_HEIGHT/2;
// star data is stored for scales: [CurrentTopLayer-VISIBLE_SCALES-BUFFER_LAYERS] until [CurrentTopLayer+BUFFER_LAYERS]
// the buffer is to prevent "hops" when subsequently zooming in and out.
const VISIBLE_LAYERS = 10;
// to prevent "hops" subsequently moving left and right
const BUFFER_LAYERS = 5;
// to prevent "hops" subsequently moving up and down
const BUFFER_PERCENTAGE_X = 10;
const BUFFER_PERCENTAGE_Y = 10;
// Determines how much the (visible) distance gets smaller between objects from one layer to the next
const DISTANCE_MULTIPLICATION_FACTOR = 0.8;
const STARS_PER_LAYER = 100;
const MAX_LAYERS = 99999;
const SCALEPOWER = 0.00361445075499040250883138060853;

const ZOOM_IN_LEFT = 10;
const ZOOM_IN_TOP = 10;
const ZOOM_OUT_LEFT = 10;
const ZOOM_OUT_TOP = 90;
const ZOOM_SIZE = 80;

const MOVE_LEFT_LEFT = 138;
const MOVE_LEFT_TOP = 65;
const MOVE_RIGHT_LEFT = 262;
const MOVE_RIGHT_TOP = 65;
const MOVE_UP_LEFT = 200;
const MOVE_UP_TOP = 1;
const MOVE_DOWN_LEFT = 200;
const MOVE_DOWN_TOP = 128;
const MOVE_SIZE = 60;
const MOVE_SPEED = 10;

var canvas = document.querySelector('canvas');
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
var ctx = canvas.getContext('2d');
ctx.font = "bold 24px Arial";

// CurrentTopLayer represents a of stars at a certain scale
// at any time, we are only watching the stars from current layer and the 10(=VISIBLE_LAYERS) layers below it.
var CurrentTopLayer = 1;
// the real distance of 1 pixel on the screen
var CurrentScale = Math.pow(CurrentTopLayer, (1 - SCALEPOWER) + CurrentTopLayer * SCALEPOWER);
// Offset from our sun in real distance
var OffsetX = 0;
var OffsetY = 0;
var PreviousOffsetX = 0;
var PreviousOffsetY = 0;
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
zoomInImage.src = "images/zoom-in.png";	
zoomOutImage.src = "images/zoom-out.png";	
moveLeftImage.src = "images/move-left.png";	
moveRightImage.src = "images/move-right.png";	
moveUpImage.src = "images/move-up.png";	
moveDownImage.src = "images/move-down.png";

initStars();
updateStars();

// Add mouse events
// ----------------
canvas.addEventListener('mousedown', function(event) {
  MouseX = event.pageX - this.offsetLeft;
  MouseY = event.pageY - this.offsetTop;
  isMouseDown = true;
}, false);

canvas.addEventListener('mouseup', function(event) {
  MouseX = event.pageX - this.offsetLeft;
  MouseY = event.pageY - this.offsetTop;
  isMouseDown = false;
}, false);

function createNewLayer(layer_number) {
  console.log("adding layer: " + layer_number);
  var x_left = -CANVAS_WIDTH * BUFFER_PERCENTAGE_X/100;
  var x_right = CANVAS_WIDTH * (100+BUFFER_PERCENTAGE_X)/100;
  var y_top = -CANVAS_HEIGHT * BUFFER_PERCENTAGE_Y/100;
  var y_bottom = CANVAS_HEIGHT * (100+BUFFER_PERCENTAGE_Y)/100;
    for (i=0; i<STARS_PER_LAYER; i++) {
    var new_star = {x:Math.floor(Math.random() * (x_right-x_left)) + x_left, y:Math.floor(Math.random() * (y_bottom-y_top)) + y_top, layer: layer_number};  
    starsList.push(new_star);
  }
  console.log("added " +STARS_PER_LAYER+ " items.");
}

function removeOldLayer(layer_number) {
  console.log("removing layer: " + layer_number);
   var remove_count = 0;
   for(var index = starsList.length - 1; index >= 0; index--) {
    if(starsList[index].layer==layer_number) {
      starsList.splice(index, 1);
      remove_count++;
    }
  };
  if(remove_count==0) {
    console.log("REMOVING FAILED!!! ");   
  }
  console.log("removed " +remove_count+ " items.");
}

function zoomOut() {
  console.log("zoom out");
    if(CurrentTopLayer<=MAX_LAYERS) {
    CurrentTopLayer++;
	CurrentScale = Math.pow(CurrentTopLayer, (1 - SCALEPOWER) + CurrentTopLayer * SCALEPOWER);
    var new_layer_number = CurrentTopLayer + BUFFER_LAYERS;
    if(new_layer_number<=MAX_LAYERS-BUFFER_LAYERS) {
      createNewLayer(new_layer_number);
      var old_layer_number = CurrentTopLayer - VISIBLE_LAYERS - BUFFER_LAYERS
      if(old_layer_number>=0) {
        removeOldLayer(old_layer_number);
      }
    }   
  }	 
}

function zoomIn() {
  console.log("zoom in");
  if(CurrentTopLayer>1) {
    CurrentTopLayer--;
	CurrentScale = Math.pow(CurrentTopLayer, (1 - SCALEPOWER) + CurrentTopLayer * SCALEPOWER);
    var new_layer_number = CurrentTopLayer - VISIBLE_LAYERS - BUFFER_LAYERS;
    if(new_layer_number>0) {
      createNewLayer(new_layer_number);
      removeOldLayer(CurrentTopLayer + BUFFER_LAYERS);
    }   
  }
}

function checkButtons() {

  // zoom in	  
  if(MouseX>=ZOOM_IN_LEFT && MouseX<ZOOM_IN_LEFT+ZOOM_SIZE && MouseY>=ZOOM_IN_TOP && MouseY<ZOOM_IN_TOP+ZOOM_SIZE) {
    setTimeout(function(){
      zoomIn();
    }, 1);
  }
  
  // zoom out	  
  if(MouseX>=ZOOM_OUT_LEFT && MouseX<ZOOM_OUT_LEFT+ZOOM_SIZE && MouseY>=ZOOM_OUT_TOP && MouseY<ZOOM_OUT_TOP+ZOOM_SIZE) {
    setTimeout(function(){
      zoomOut();
    }, 1);
  }
  
  // move left	  
  if(MouseX>=MOVE_LEFT_LEFT && MouseX<MOVE_LEFT_LEFT+ZOOM_SIZE && MouseY>=MOVE_LEFT_TOP && MouseY<MOVE_LEFT_TOP+ZOOM_SIZE) {
	PreviousOffsetX = OffsetX;
    OffsetX -= CurrentScale * MOVE_SPEED;
  }
  
  // move right	  
  if(MouseX>=MOVE_RIGHT_LEFT && MouseX<MOVE_RIGHT_LEFT+ZOOM_SIZE && MouseY>=MOVE_RIGHT_TOP && MouseY<MOVE_RIGHT_TOP+ZOOM_SIZE) {
	PreviousOffsetX = OffsetX;
    OffsetX += CurrentScale * MOVE_SPEED;
  }
  
  // move up	  
  if(MouseX>=MOVE_UP_LEFT && MouseX<MOVE_UP_LEFT+ZOOM_SIZE && MouseY>=MOVE_UP_TOP && MouseY<MOVE_UP_TOP+ZOOM_SIZE) {
	PreviousOffsetY = OffsetY;
    OffsetY -= CurrentScale * MOVE_SPEED;	  
  }
  
  // move down	  
  if(MouseX>=MOVE_DOWN_LEFT && MouseX<MOVE_DOWN_LEFT+ZOOM_SIZE && MouseY>=MOVE_DOWN_TOP && MouseY<MOVE_DOWN_TOP+ZOOM_SIZE) {
	PreviousOffsetY = OffsetY;
    OffsetY += CurrentScale * MOVE_SPEED;	  
  }
}

function render() {
  window.requestAnimationFrame(render);
  if(isMouseDown) {
      checkButtons();
  }
  drawStars();
  drawIcons();  
}

if (typeof (canvas.getContext) !== undefined) {
  cx = canvas.getContext('2d');
  render();
}

function initStars() {
  var layer;
  for (layer=1; layer<=BUFFER_LAYERS; layer++) {
    var x_left = -CANVAS_WIDTH * BUFFER_PERCENTAGE_X/100;
    var x_right = CANVAS_WIDTH * (100+BUFFER_PERCENTAGE_X)/100;
    var y_top = -CANVAS_HEIGHT * BUFFER_PERCENTAGE_Y/100;
    var y_bottom = CANVAS_HEIGHT * (100+BUFFER_PERCENTAGE_Y)/100;
    for (i=0; i<STARS_PER_LAYER; i++) {
      var new_star = {x:Math.floor(Math.random() * (x_right-x_left)) + x_left, y:Math.floor(Math.random() * (y_bottom-y_top)) + y_top, layer: layer};  
      starsList.push(new_star);
    }
  }
}

function drawIcons() {
  ctx.drawImage(zoomInImage, ZOOM_IN_LEFT, ZOOM_IN_TOP, ZOOM_SIZE, ZOOM_SIZE);	
  ctx.drawImage(zoomOutImage, ZOOM_OUT_LEFT, ZOOM_OUT_TOP, ZOOM_SIZE, ZOOM_SIZE);	
  ctx.drawImage(moveLeftImage, MOVE_LEFT_LEFT, MOVE_LEFT_TOP, MOVE_SIZE, MOVE_SIZE);	
  ctx.drawImage(moveRightImage, MOVE_RIGHT_LEFT, MOVE_RIGHT_TOP, MOVE_SIZE, MOVE_SIZE);	
  ctx.drawImage(moveUpImage, MOVE_UP_LEFT, MOVE_UP_TOP, MOVE_SIZE, MOVE_SIZE);	
  ctx.drawImage(moveDownImage, MOVE_DOWN_LEFT, MOVE_DOWN_TOP, MOVE_SIZE, MOVE_SIZE);	
}

function updateStars() {
	for(current_layer=CurrentTopLayer; current_layer>CurrentTopLayer-VISIBLE_LAYERS; current_layer--) {
		if(current_layer>0) {
		 // remove stars from the layer that are no longer visible
		 
		 // add same amount of stars to the layer that have been deleted to new visible area
		 
		}
	}
}

function drawStars() {
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (current_star of starsList) {
    var depth = CurrentTopLayer - current_star.layer;
    if(depth>=0 && depth<VISIBLE_LAYERS) {
      var star_size = 5 - parseInt((depth) / 2);
      var color = 255 - depth*20;
      ctx.fillStyle = "rgb("+color+","+color+","+color+")";
      ctx.beginPath();
      var x_pos = current_star.x - OffsetX;
      var y_pos = current_star.y - OffsetY;
      if(depth>0) {
          x_pos = (CANVAS_CENTER_X - (CANVAS_CENTER_X-x_pos) * Math.pow(DISTANCE_MULTIPLICATION_FACTOR,depth));
          y_pos = (CANVAS_CENTER_Y - (CANVAS_CENTER_Y-y_pos) * Math.pow(DISTANCE_MULTIPLICATION_FACTOR,depth));
      }
      ctx.arc(x_pos, y_pos, star_size, 0*Math.PI,2*Math.PI);
      ctx.fill();
    }
  }
  
  DrawText("Stars in this area: " + (CurrentTopLayer * 1000), 10, 250); 
  DrawText("Offset X: " + OffsetX, 10, 280); 
  DrawText("Offset Y: " + OffsetY, 10, 310); 
  DrawText("Layer: " + CurrentTopLayer, 10, 340);
  DrawText("Scale: 1:" + Math.round(CurrentScale), 10, 370);
}

function DrawText(text, x, y) {
	/*
  gradient = ctx.createLinearGradient(0, y-20, 0, y);
  gradient.addColorStop("0"," yellow");
  gradient.addColorStop("0.7", "orange");
  gradient.addColorStop("0.8", "goldenrod");
  gradient.addColorStop("0.9", "saddlebrown");
  gradient.addColorStop("1.0", "sienna");
  ctx.fillStyle = gradient;*/
  ctx.fillStyle = 'yellow';
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