//requiring all the packages required 
const express = require('express')  
const app = express()
const http = require('http')
const path = require("path")
const bodyParser = require('body-parser')

var cors = require('cors')
var xss = require("xss")

var server = http.createServer(app)
var io = require('socket.io')(server)

//requirement process finishes
app.use(cors())  //for secure cross-origin connections
app.use(bodyParser.json()) 


app.set('port', (process.env.PORT || 8000)) //server side port
 
// for deployment purpose
if(process.env.NODE_ENV==='production'){
	app.use(express.static(__dirname+"/build"))
	app.get("*", (req, res) => {
		res.sendFile(path.join(__dirname+"/build/index.html"))
	})
}

connected ={} //2-D array that stores the corresponding socket connections of different rooms(url's)
msg ={}  // 2-D array that stores information regarding meesages in a particular room in json format

stringSanitizer = (string) => {
	return xss(string)
}

// socket connection 
io.on('connection', (socket) => {

	//event listener when a user connects or create a room
	socket.on('connect-call', (URL) => {
		if(connected[URL] === undefined){  // if no users connected to that room 
			connected[URL] = []
		}
		connected[URL].push(socket.id) //add the socketid(user) to the room 
         
		// for PEER connection 
		for(let socketsid = 0; socketsid  < connected[URL].length; ++socketsid ){
			io.to(connected[URL][socketsid]).emit("user-connected", socket.id, connected[URL]) 
		}

		//if message count of the current room is not 0
		if(msg[URL] !== undefined){
            //send all the messages to the user connected to that room
			for(let user = 0; user < msg[URL].length; ++user){
				io.to(socket.id).emit("new-message", msg[URL][user]['message'],
				        msg[URL][user]['socketIDSender'], msg[URL][user]['socketIDSender'])
			}
		}
	})

	//event listener when user wants to disconnect to a call
	socket.on('disconnect', () => {
		var currentRoomURL // variable to store the url of room of the user that wants to disconnect
		for (const [room, roomids] of JSON.parse(JSON.stringify(Object.entries(connected)))) {
			for(let id = 0; id < roomids.length; ++id){
				if(roomids[id] === socket.id){  // if socket id matches.. then url of the user found 
					currentRoomURL = room

					// every user in the same room gets to know that user got disconnect
	            	for(let id = 0; id < connected[currentRoomURL].length; ++id){ 
						io.to(connected[currentRoomURL][id]).emit("user-disconnected", socket.id)
					}
			        
					//remove that user from the connected array
					var socketindex = connected[currentRoomURL].indexOf(socket.id)
					connected[currentRoomURL].splice(socketindex, 1)
					
					//after deletion , if no user is present in the currentRoom then delete that url from the connected array
					if(connected[currentRoomURL].length === 0){
						delete connected[currentRoomURL]
					}
				}
			}
		}
	})

	//event listener for a new message in the room
	socket.on('new-message', (message, socketIDSender) => {
		message = stringSanitizer(message)
		socketIDSender = stringSanitizer(socketIDSender)
        
		var currentRoom // room in which the message has been sent
		var flag = false
		for (const [room, roomids] of Object.entries(connected)) {
			for(let id = 0; id < roomids.length; ++id){
				if(roomids[id] === socket.id){  //room id found 
					currentRoom= room
					flag = true
				}
			}
		}
       // if room id found 
		if(flag){
			if(msg[currentRoom] === undefined){   // it's the first message in the room..so initialize the msg array
				msg[currentRoom] = []
			}
			//push the data in the msg array
			msg[currentRoom].push({"socketIDSender": socketIDSender, "message": message, "socketIDSend": socket.id})  
            
			//add that message to all the connections / users of that room 
			for(let id = 0; id < connected[currentRoom].length; ++id){
				io.to(connected[currentRoom][id]).emit("new-message", message, socketIDSender, socket.id)
			}
		}
	})
	socket.on('indicate', (toSocketId, chatMessage) => {
		io.to(toSocketId).emit('indicate', socket.id, chatMessage)
	})
})

 
var port=app.get('port'); // port of the backend server
server.listen(app.get('port'), () => {
	console.log(`listening on ${port}`);
})