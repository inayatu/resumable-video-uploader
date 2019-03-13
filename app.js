const express = require('express')
const http = require('http')
const socket = require('socket.io')
const fs = require('fs')
const exec = require('child_process').exec
const util = require('util')

const port = 3300

const app = express() 

const server = http.Server(app)
const io = socket(server)

app.use(express.static('public'))
app.use(express.static('Video'))

server.listen(port, () => {
	console.log(`App running on port ${port}`)
}) 

var Files = {};
// socket
io.on('connection', (socket)=>{
	
	socket.emit('connected', 'connected')

	socket.on('connected', (data) =>{
		console.log(data)
	})

	socket.on('Start', function (data) { 
		//data contains the variables that we passed through in the html file
	    var Name = data['Name'];
	    Files[Name] = {  //Create a new Entry in The Files Variable
	        FileSize : data['Size'],
	        Data   : "",
	        Downloaded : 0
	    }
	    var Place = 0;
	    try{
	        var Stat = fs.statSync('Temp/' +  Name);
	        if(Stat.isFile())
	        {
	            Files[Name]['Downloaded'] = Stat.size;
	            Place = Stat.size / 524288;
	        }
	    }
	    catch(er){} //It's a New File
	    fs.open("Temp/" + Name, "a", 0755, function(err, fd){
	        if(err)
	        {
	            console.log(err);
	        }
	        else
	        {
	            Files[Name]['Handler'] = fd; 
	            //We store the file handler so we can write to it later
	            socket.emit('MoreData', { 'Place' : Place, Percent : 0 });
	        }
	    });
	});

	socket.on('Upload', function (data){
	    var Name = data['Name'];
	    Files[Name]['Downloaded'] += data['Data'].length;
	    Files[Name]['Data'] += data['Data'];
	    if(Files[Name]['Downloaded'] == Files[Name]['FileSize']) //If File is Fully Uploaded
	    {
	        fs.write(Files[Name]['Handler'], Files[Name]['Data'], null, 'Binary', function(err, Writen){
	            //Get Thumbnail Here
	            var inp = fs.createReadStream("Temp/" + Name);
	            var out = fs.createWriteStream("Video/" + Name);
	            // inp.pipe(inp, out, function(){
	            // util.pump(inp, out, function(){
	                fs.unlink("Temp/" + Name, function () { //This Deletes The Temporary File
	                    //Moving File Completed

	                    /*This ffmpeg command will generate one thumbnail at the 1:30 
	                    mark, and save it to the Video/ folder with a .jpg file type.*/
	                    exec("ffmpeg -i Video/" + Name  + " -ss 01:30 -r 1 -an -vframes 1 -f mjpeg Video/" + Name  + ".jpg", function(err){
	                        socket.emit('Done', {'Image' : 'Video/' + Name + '.jpg'});
	                    });
	                });
	            // });
	        });
	    }
	    else if(Files[Name]['Data'].length > 10485760){ //If the Data Buffer reaches 10MB
	        fs.write(Files[Name]['Handler'], Files[Name]['Data'], null, 'Binary', function(err, Writen){
	            Files[Name]['Data'] = ""; //Reset The Buffer
	            var Place = Files[Name]['Downloaded'] / 524288;
	            var Percent = (Files[Name]['Downloaded'] / Files[Name]['FileSize']) * 100;
	            socket.emit('MoreData', { 'Place' : Place, 'Percent' :  Percent});
	        });
	    }
	    else
	    {
	        var Place = Files[Name]['Downloaded'] / 524288;
	        var Percent = (Files[Name]['Downloaded'] / Files[Name]['FileSize']) * 100;
	        socket.emit('MoreData', { 'Place' : Place, 'Percent' :  Percent});
	    }
	});

	socket.on('MoreData', function (data){
	    UpdateBar(data['Percent']);
	    var Place = data['Place'] * 524288; //The Next Blocks Starting Position
	    var NewFile; //The Variable that will hold the new Block of Data
	    if(SelectedFile.webkitSlice)
	        NewFile = SelectedFile.webkitSlice(Place, Place + Math.min(524288, (SelectedFile.size-Place)));
	    else
	        NewFile = SelectedFile.mozSlice(Place, Place + Math.min(524288, (SelectedFile.size-Place)));
	    FReader.readAsBinaryString(NewFile);
	});

	function UpdateBar(percent){
	    document.getElementById('ProgressBar').style.width = percent + '%';
	    document.getElementById('percent').innerHTML = (Math.round(percent*100)/100) + '%';
	    var MBDone = Math.round(((percent/100.0) * SelectedFile.size) / 1048576);
	    document.getElementById('MB').innerHTML = MBDone;
	}

})