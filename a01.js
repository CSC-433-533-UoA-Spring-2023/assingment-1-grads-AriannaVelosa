/*
    Assignment 1: Rotate/Change Size of a PPM Image
*/

//access DOM elements we'll use
var input = document.getElementById("load_image");
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');

// The width and height of the image
var width = 0;
var height = 0;
var extendedWidth = 0;
var extendedHeight = 0;
var height = 0;
var first = 0;

// The image data
var ppm_img_data;
var currentAngle = 0;
var currentScale = 1;

//Function to process upload
var upload = function () {
    if (input.files.length > 0) {
        var file = input.files[0];
        console.log("You chose", file.name);
        if (file.type) console.log("It has type", file.type);
        var fReader = new FileReader();
        fReader.readAsBinaryString(file);

        fReader.onload = function(e) {
            //if successful, file data has the contents of the uploaded file
            var file_data = fReader.result;
            parsePPM(file_data);

            
            // Create a new image data object to hold the new image
            let diagonal = Math.ceil(Math.sqrt(width * width + height * height));
            
            // Adjust the sizes appropriately
            extendedWidth=diagonal;
            extendedHeight=diagonal;
            var newImageData = ctx.createImageData(extendedWidth, extendedHeight);
            let transformMatrix = rotate();
            canvas.width = diagonal;
            canvas.height = diagonal;
            ctx.width = diagonal
            ctx.height = diagonal

	        // Loop through all the pixels in the image and set its color
            for (var i = 0; i < newImageData.data.length; i += 4) {

                // Get the pixel location in x and y with (0,0) being the top left of the image
                var pixel = [Math.floor(i / 4) % extendedWidth, 
                             Math.floor(i / 4) / extendedHeight, 1];
		        pixel[0]=pixel[0]-(extendedWidth-width)/2;
	            pixel[1]=pixel[1]-(extendedHeight-height)/2;
        
                // Get the location of the sample pixel
                var samplePixel = MultiplyMatrixVector(transformMatrix, pixel);

                // Floor pixel to integer
                samplePixel[0] = Math.floor(samplePixel[0]);
                samplePixel[1] = Math.floor(samplePixel[1]);
                if (!(samplePixel[0] < 0 || samplePixel[0] > width || samplePixel[1] < 0 || samplePixel[1] > height)) {
                    setPixelColor(newImageData, samplePixel, i);
                }
            }
            
            // Draw the new image
            ctx.putImageData(newImageData, 0,0);
            ctx.restore()
	        // Show matrix
            showMatrix(transformMatrix);
        }

    }
}

/*
    This function is what builds the transformation matrix. I translate the image to
    the origin based on the width and height, rotate it, shrink it, and then translate
    it back. I use 3 matrices to build the final matrix.
*/
function rotate() {
    // Rotate 45 degrees
    let rotationMatrix = GetRotationMatrix(currentAngle)
    
    // Move center to origin, rotate, scale, move back
    let translationToOrigin = GetTranslationMatrix(-width / 2, -height / 2);
    let translationBack = GetTranslationMatrix(width / 2, height / 2);
    let scaleMatrix = GetScalingMatrix(currentScale, currentScale)
    let transformMatrix = MultiplyMatrixMatrix(translationBack, MultiplyMatrixMatrix(rotationMatrix, MultiplyMatrixMatrix(scaleMatrix, translationToOrigin)));
    
    // Adjust the current rotation and scale
    // When we first start, we shrink, then we return to the normal size
    if (currentAngle < 180) {
        currentScale += 0.05
    } else {
        currentScale -= 0.05
    }
    currentAngle += 5
    if (currentAngle == 360) {
        currentAngle = 0
    }    
    return transformMatrix
}

// This is my listener to rotate the image often
input.addEventListener("change", function() {
    setTimeout(() => {
        upload();
        setInterval(upload, 125)
    }, 125)
})

// Show transformation matrix on HTML
function showMatrix(matrix){
    for(let i=0;i<matrix.length;i++){
        for(let j=0;j<matrix[i].length;j++){
            matrix[i][j]=Math.floor((matrix[i][j]*100))/100;
        }
    }
    document.getElementById("row1").innerHTML = "row 1:[ " + matrix[0].toString().replaceAll(",",",\t") + " ]";
    document.getElementById("row2").innerHTML = "row 2:[ " + matrix[1].toString().replaceAll(",",",\t") + " ]";
    document.getElementById("row3").innerHTML = "row 3:[ " + matrix[2].toString().replaceAll(",",",\t") + " ]";
}

// Sets the color of a pixel in the new image data
function setPixelColor(newImageData, samplePixel, i){
    var offset = ((samplePixel[1] - 1) * width + samplePixel[0] - 1) * 4;

    // Set the new pixel color
    newImageData.data[i    ] = ppm_img_data.data[offset    ];
    newImageData.data[i + 1] = ppm_img_data.data[offset + 1];
    newImageData.data[i + 2] = ppm_img_data.data[offset + 2];
    newImageData.data[i + 3] = 255;
}

// Load PPM Image to Canvas
// Untouched from the original code
function parsePPM(file_data){
    /*
   * Extract header
   */
    var format = "";
    var max_v = 0;
    var lines = file_data.split(/#[^\n]*\s*|\s+/); // split text by whitespace or text following '#' ending with whitespace
    var counter = 0;
    // get attributes
    for(var i = 0; i < lines.length; i ++){
        if(lines[i].length == 0) {continue;} //in case, it gets nothing, just skip it
        if(counter == 0){
            format = lines[i];
        }else if(counter == 1){
            width = lines[i];
        }else if(counter == 2){
            height = lines[i];
        }else if(counter == 3){
            max_v = Number(lines[i]);
        }else if(counter > 3){
            break;
        }
        counter ++;
    }
    console.log("Format: " + format);
    console.log("Width: " + width);
    console.log("Height: " + height);
    console.log("Max Value: " + max_v);

    /*
     * Extract Pixel Data
     */
    var bytes = new Uint8Array(3 * width * height);  // i-th R pixel is at 3 * i; i-th G is at 3 * i + 1; etc.
    // i-th pixel is on Row i / width and on Column i % width
    // Raw data must be last 3 X W X H bytes of the image file
    var raw_data = file_data.substring(file_data.length - width * height * 3);
    for(var i = 0; i < width * height * 3; i ++){
        // convert raw data byte-by-byte
        bytes[i] = raw_data.charCodeAt(i);
    }
    // update width and height of canvas
    document.getElementById("canvas").setAttribute("width", window.innerWidth);
    document.getElementById("canvas").setAttribute("height", window.innerHeight);
    // create ImageData object
    var image_data = ctx.createImageData(width, height);
    // fill ImageData
    for(var i = 0; i < image_data.data.length; i+= 4){
        let pixel_pos = parseInt(i / 4);
        image_data.data[i + 0] = bytes[pixel_pos * 3 + 0]; // Red ~ i + 0
        image_data.data[i + 1] = bytes[pixel_pos * 3 + 1]; // Green ~ i + 1
        image_data.data[i + 2] = bytes[pixel_pos * 3 + 2]; // Blue ~ i + 2
        image_data.data[i + 3] = 255; // A channel is deafult to 255
    }
    ctx.putImageData(image_data, canvas.width/2 - width/2, canvas.height/2 - height/2);
    ppm_img_data = image_data;
}