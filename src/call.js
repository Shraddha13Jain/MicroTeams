import React, { Component } from 'react'
import io from 'socket.io-client'
import { Button} from '@material-ui/core'
import {IconButton} from '@material-ui/core'
import { Badge} from '@material-ui/core'
import {Input} from '@material-ui/core'

import MicIcon from '@material-ui/icons/Mic'
import MicOffIcon from '@material-ui/icons/MicOff'

import VideocamIcon from '@material-ui/icons/Videocam'
import VideocamOffIcon from '@material-ui/icons/VideocamOff'

import ChatIcon from '@material-ui/icons/Chat'
import SendIcon from '@material-ui/icons/Send'

import ScreenShareIcon from '@material-ui/icons/ScreenShare'
import StopScreenShareIcon from '@material-ui/icons/StopScreenShare'

import InfoOutlinedIcon from '@material-ui/icons/InfoOutlined'
import FileCopyOutlinedIcon from '@material-ui/icons/FileCopyOutlined'

import { Row } from 'reactstrap'
import Modal from 'react-bootstrap/Modal'

import { message } from 'antd'
import 'antd/dist/antd.css'

import peerConnectionConfig from './iceServers'
import 'bootstrap/dist/css/bootstrap.css'
import "./call.css"
import faker from "faker"

const host_url = process.env.NODE_ENV === 'production' ? 'https://microteams13.herokuapp.com/' : "http://localhost:8000"

var connected = {}  //stores all peers information

var videoElementCount = 0 //number of users in the video-meet
var socket = null
var socketId = null

//call class that contains all the states and functions required for a user to perform various operations
class call extends Component {
	//constructor
	constructor(props) {
		super(props)

		this.localVideoref = React.createRef() 
        
		//flag variables for video and audio
		this.isVideo = false
		this.isAudio = false
        
		// all states used in the call class
		connected = {} 
		this.state = {
			video: false,
			audio: false,
			screen: false,
			isScreenPresent: false,
			username: faker.internet.userName(), // faker to give random username
			PromptUsername: true,
			unseenMessages: 0,
			showChatModal: false,
			showInfo:false,
			messages: [],
			message: "",
		}
        
		//permission check for various states
		this.GrantPermissions()
	}

	//
	getUserMedia = () => {
		if (!(this.state.video && this.isVideo) && !(this.state.audio && this.isAudio)) {
			this.trackUtility(); // a utility function for stopping the tracks
			
		} else {
			//set video and audio states
			navigator.mediaDevices.getUserMedia({ video: this.state.video, audio: this.state.audio })
				.then(this.gotAudioVideo) // succesfully received the audio video states
				.then((stream) => {})
				.catch((err) => console.log(err))
		}
	}
	//permissions check function
	GrantPermissions = async () => {
		try{
             
			//set audio flag 
			await navigator.mediaDevices.getUserMedia({ audio: true })
				.then(() => this.isAudio = true)
				.catch(() => this.isAudio = false)

			//set video flag	
			await navigator.mediaDevices.getUserMedia({ video: true })
				.then(() => this.isVideo = true)
				.catch(() => this.isVideo = false)
            
			// if audio available , then set the localstream  
			if(this.isAudio){
				navigator.mediaDevices.getUserMedia({ video: this.isVideo, audio: this.isAudio })
					.then((stream) => {
						window.localStream = stream
						this.localVideoref.current.srcObject = stream
					})
					.then((stream) => {})
					.catch((err) => console.log(err))
			}
			//if video available , then set the localstream accordingly
			if(this.video){
				if(!this.isScreenPresent){
					navigator.mediaDevices.getUserMedia({ video: this.isVideo, audio: this.isAudio })
					.then((stream) => {
						window.localStream = stream
						this.localVideoref.current.srcObject = stream
					})
					.then((stream) => {})
					.catch((err) => console.log(err))
				}
			}
			// if screen is not shared , set isScreenPresent state as false 
			//else set it as true
			if (!navigator.mediaDevices.getDisplayMedia) {
				this.setState({ isScreenPresent: false})
			} else {
				this.setState({ isScreenPresent: true })
			}
			
		} catch(err) { 
			 console.log(err)
	    }
	}
     
	//function for screen sharing
	getDislayMedia = () => {
		if (this.state.screen === false) {
			  this.trackUtility();
			  this.audiovideoUtility();
			  this.localVideoref.current.srcObject = window.localStream;
			  this.getUserMedia();
		}
		else{
			if (navigator.mediaDevices.getDisplayMedia) {
				navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
			    .then(this.gotScreenShared)
			    .then((stream) => {})
			    .catch((err) => console.log(err));
			}
		}
	}
    // utility function that stops the tracks and create offers to other users in the room
	utilityFunction=(stream)=>{

		this.trackUtility();
		window.localStream = stream
		this.localVideoref.current.srcObject = stream

		for (let socketid in connected) {
			if (socketid !== socketId) {

				connected[socketid].addStream(window.localStream)

				connected[socketid].createOffer().then((desc) => {
					connected[socketid].setLocalDescription(desc)
						.then(() => {
							let description= JSON.stringify({ 'sdp': connected[socketid].localDescription });
							socket.emit('indicate', socketid,description)
						})
						.catch(err => console.log(err));
				})
				.catch(err => console.log(err));
		    }
		}
	}

	//audio video states receieved successfully and offer created to other users 
	//to add the current localstream
	gotAudioVideo = (stream) => {
		
        this.utilityFunction(stream);
		stream.getTracks().forEach( streamlet=> streamlet.onended = () => {
			this.setState({
				video: false,
				audio: false,
			}, () => {
				
                this.trackUtility();
				this.audiovideoUtility();
				this.localVideoref.current.srcObject = window.localStream

				for (let socketid in connected) {
					connected[socketid].addStream(window.localStream)

					connected[socketid].createOffer().then((desc) => {
						connected[socketid].setLocalDescription(desc)
							.then(() => {
								let description=JSON.stringify({ 'sdp': connected[socketid].localDescription });
								socket.emit('indicate', socketid,description )
							})
							.catch(err => console.log(err))
					})
					.catch(err => console.log(err));
				}
			})
		})
	}

	//when new user gets connected 
    connectUser=()=>{
            this.getUserMedia()
			this.SocketConnect()
	}

	// set the video and audio states to their corresponding flags before connecting 
	getAudioVideo = () => {
		this.setState({
			audio: this.isAudio,
			video: this.isVideo
		}, () => {
			this.connectUser();
		})
	}
	
	//respond to the message received from any other user in the current room 
	MessageReceived = (senderId, text) => {
		
		var indicate = JSON.parse(text) 
	    var sessionDesc=indicate.sdp;
		var ice=indicate.ice;
		if(senderId === socketId){ // if receiver and sender are same
		  return ;
		}
		else {
			if (sessionDesc) {
				connected[senderId].setRemoteDescription(new RTCSessionDescription(sessionDesc)).then(() => {
					if(sessionDesc.type ==='offer'){
						connected[senderId].createAnswer().then((desc) => {
							connected[senderId].setLocalDescription(desc).then(() => {
								let str= JSON.stringify({ 'sdp': connected[senderId].localDescription });
								socket.emit('indicate', senderId,str)
							}).catch(err => console.log(err))
						}).catch(err => console.log(err))
					}
				}).catch(err => console.log(err))
			}

			if (ice) {
				connected[senderId].addIceCandidate(new RTCIceCandidate(ice)).catch(err => console.log(err))
			}
		}
	}
    
	// stop the video and audio stream and set it to localstream
	audiovideoUtility =() =>{
		let AudioVideoOff = (...args) => new MediaStream([this.VideoOff(...args), this.AudioOff()])
		window.localStream = AudioVideoOff()
	}
	
	//utitlity function to stop all the tracks
	trackUtility=()=>{
		try {
			let streamlets = this.localVideoref.current.srcObject.getTracks()
			streamlets.forEach(streamlet => streamlet.stop())
		} catch(err) { console.log(err) }
	}

	// function for screen sharing feature
	gotScreenShared = (stream) => {
		this.utilityFunction(stream);
		stream.getTracks().forEach(track => track.onended = () => {
			this.setState({
				screen: false,
			}, () => {
				this.trackUtility();
				this.audiovideoUtility();
				this.localVideoref.current.srcObject = window.localStream

				this.getUserMedia()
			})
		})
	}

	// socket connection establishment
	SocketConnect = () => {

		socket = io.connect(host_url, { secure: true }) 

		// new message received 
		socket.on('indicate', this.MessageReceived)

		socket.on('connect', () => {

			    // user emit to the server that a new user joined the specified room
				socket.emit('connect-call', window.location.href)
				socketId = socket.id
					
				//user joined 
				socket.on('user-connected', (id, peers) => {
				peers.forEach((socketListId) => {
					connected[socketListId] = new RTCPeerConnection(peerConnectionConfig)

					// onicecandidate function that waits for their ice candidate 
					connected[socketListId].onicecandidate = function (occur) {
						if (occur.candidate === null) 
						         console.log("new peer connected");
						else {
                            let str=JSON.stringify({ 'ice': occur.candidate });
							socket.emit('indicate', socketListId, str)
						}
					}

					// Wait for their video stream and set the styles of the window screen
					connected[socketListId].onaddstream = (occur) => {

						var videoSearch = document.querySelector(`[data-socket="${socketListId}"]`)

						if (videoSearch === null) {
							videoElementCount = peers.length

							// setting styles
							let maindiv = document.getElementById('main')
							let videocss = this.VideoStyle(maindiv)

							let video = document.createElement('video')

							let styles = {
								          maxHeight: "100%", 
							              margin: "10px",
										  minWidth: videocss.minWidth, 
										  minHeight: videocss.minHeight,
										  border:"4px solid #669df6",
										  objectFit: "fill",
										  borderRadius:"20px"
										}
							for(let i in styles) 
							      video.style[i] = styles[i]

							video.style.setProperty("height", videocss.height)
							video.style.setProperty("width", videocss.width)
							video.setAttribute('data-socket', socketListId)
							video.srcObject = occur.stream
							video.playsinline = true
							video.autoplay = true
							maindiv.appendChild(video) // new video element appended 

						} else {
							videoSearch.srcObject = occur.stream
						}
					}

					// function that adds  the local videostream 
					if (window.localStream === undefined || window.localStream === null) {
						this.audiovideoUtility();
						connected[socketListId].addStream(window.localStream)
					} else {
						connected[socketListId].addStream(window.localStream)
					}
				})

				//offer created to add current user stream to other users in the room
				if (id === socketId) {
					for (let otherid in connected) {

						if (otherid !== socketId){
								
								try {
									connected[otherid].addStream(window.localStream)
								} catch(err) {console.log(err);}
					
								connected[otherid].createOffer().then((description) => {
									connected[otherid].setLocalDescription(description)
										.then(() => {
											let str=JSON.stringify({ 'sdp': connected[otherid].localDescription });
											socket.emit('indicate', otherid, str)
										})
										.catch(err => console.log(err))
								})
					 }
					}
				}
			})

			// on end call 
			socket.on('user-disconnected', (id) => {
				let myvideo = document.querySelector(`[data-socket="${id}"]`)
				if (myvideo !== null) {
					myvideo.parentNode.removeChild(myvideo)
					videoElementCount--
					let maindiv = document.getElementById('main')
					this.VideoStyle(maindiv)
				}
			})

			// event listener for new message 
			socket.on('new-message', this.addMessage)
		})
	}

	// display message when the room address is copied 
	displaycopyMsg= (address) =>{
		navigator.clipboard.writeText(address).then(function () {
			 message.success("LINKED COPEID TO CLIPBOARD")
		}, () => {
			message.error("FAILED TO COPY")
		})
	}

	//function to copy the url for sharing to other users
	copyUrl = () => {
		let address = window.location.href
		if (!navigator.clipboard) {
			let roomURL = document.createElement("textarea")
			roomURL.value = address
			document.body.appendChild(roomURL)
			roomURL.select()
			roomURL.focus()
			document.body.removeChild(roomURL)
			return
		}
		this.displaycopyMsg(address); // call to display the copy message
		
	}

	// function to add video style according to the number of users present and screen size
	VideoStyle = (main) => {
		let widthMain = main.offsetWidth

		let minHeight = "40%"
		let minWidth = "30%"

		let height = String(100 / videoElementCount) + "%"
		let width = ""
		if(videoElementCount === 0 || videoElementCount === 1) {
			width = "50%"
			height = "100%"
		} else if (videoElementCount === 2) {
			width = "45%"
			height = "100%"
		} else if (videoElementCount === 3 || videoElementCount === 4) {
			width = "35%"
			height = "50%"
		} else {
			width = String(100 / videoElementCount) + "%"
		}

		let videocount = main.querySelectorAll("video")
		if ((widthMain * 30 / 100) < 300) {
			minWidth = "300px"
		}

		// adding the css to all the video elements in the room
		for (let vid = 0; vid < videocount.length; ++vid) {
			videocount[vid].style.minHeight = minHeight
			 videocount[vid].style.minWidth = minWidth
			videocount[vid].style.setProperty("height", height)
			videocount[vid].style.setProperty("width", width)
			videocount[vid].style.setProperty("border-radius","20px");
		}
        let styles={minWidth, minHeight, width, height}
		return styles
	}

	// closes the chat modal 
	closeChat = () => this.setState({ showChatModal: false })

	//closes the copy url modal
	closeInfo =() =>{
		this.setState({showInfo:false});
	}

	//opens the chat modal and set unseen messages as 0
	openChat = () => this.setState({ showChatModal: true, unseenMessages: 0 })

	// opens the copy url modal
	openInfo = () => this.setState({ showInfo: true })
	
    // for the input tag of chat modal
	handleMessage = (event) => this.setState({ message: event.target.value })

	//  function fired when video icon is clicked  in order to toggle the video state and set it for other users 
	handleVideo = () => this.setState({ video: !this.state.video }, () => this.getUserMedia())

	// function fired when a user click on levae call button .
	// before leaving the call , ask for re-confirmation 
	handleEndCall = () => {
		if(!window.confirm("Do you Really want to leave ?")) return;
		this.trackUtility();
		window.location.href = "/"
	}
    //  function fired when audio icon is clicked  in order to toggle the audio state and set it for other users 
	handleAudio = () => this.setState({ audio: !this.state.audio }, () => this.getUserMedia())

	//  function fired when screen share icon is clicked  in order to toggle the screen state and set it for other users 
	handleScreen = () => this.setState({ screen: !this.state.screen }, () => this.getDislayMedia())

	// turns the audio off
	AudioOff = () => {
		let context = new AudioContext()
		let osc = context.createOscillator()
		let destination = osc.connect(context.createMediaStreamDestination())
		osc.start()
		context.resume()
		return Object.assign(destination.stream.getAudioTracks()[0], { enabled: false })
	}
	
	// turn the video off and set the video space
	VideoOff = ({ width = 640, height = 480 } = {}) => {
		let videoSpace = Object.assign(document.createElement("canvas"), { width, height })
		videoSpace.getContext('2d').fillRect(0, 0, width, height)
		let videoTrack = videoSpace.captureStream()
		return Object.assign(videoTrack.getVideoTracks()[0], { enabled: false })
	}

	// add a new message to the chat modal 
	addMessage = (message, socketIDSender, socketIdSend) => {
		this.setState(prevState => ({
			messages: [...prevState.messages,
				        { 
							"socketIDSender": socketIDSender, 
						   "message": message
						}
					],
		}))

		// increase the unseenmessages count if receiver is not the sender of the message
		if (socketIdSend === socketId) {
			return;
		}
		this.setState({ unseenMessages: this.state.unseenMessages + 1 })
	}

	 // for the input tag of set username 
	handleUsername = (event) => this.setState({ username: event.target.value })

	// function fired when a new message is sent in the room 
	sendMessage = () => {
		let msg=this.state.message;
		let name=this.state.username;
		socket.emit('new-message', msg,name);
		this.setState({ sender: this.state.username, message: "" }) // set the message input to empty
	}

	// connect to the call function
	connect = () => this.setState({ PromptUsername: false }, () => this.getAudioVideo())

	render() {
		 return (
			<div>
				{/* if Promptusername is true then display the join call page else enter the room (video-call) */}
				{this.state.PromptUsername === true ?
	               <div style={{backgroundColor:"whitesmoke" ,minHeight:"753px",overflow:"hidden"}}>
					    <div className="mlogo">
							<img className="Microsoft"
							src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOEAAADhCAMAAAAJbSJIAAAAe1BMVEX0QzZMr1AhlvP/wQf/////vgD0Nia63LtAq0Ww0vkAkfP/4636uLRJrk3/+Pj6saz2bWT1TEBVs1l0v3e027X4/Pn8zsv0PzLQ6NEsm/T/xBVWrPX/zUim0Pr/4qD3+//H4vz/7cPzJg8zqDj94N7h7+Hd6/z/8tsAjPI036d3AAABpElEQVR4nO3cSU5CURBA0fr4aBVFAcWGxt79r1CIEzFx+Ovlk3M3UDmppIYVpZTLq9l1tN3govxuOGra7ma+WO4nRSm3MbhrHVhB2ExHzeogvM3wVREejKsSl5ECrCNsps0yrgYpwErCZrSIWc4Kawmn82j/ilYVNjdJvnrChpCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQ8F/hIKmXP8LXUVJxkdXbkfB9mFWUU4+w+xF2P8LuR9j9CLsfYfeLcVYfR3M/z7OKSVJf4yPheT+r6CU1+Ss8S4qQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkPBf4f2JCx/i8cSFT7GenLSwv4ltDrDaDpdRdjlLrCPsPx8+lu96GcYawv7Z889P9u36sf2Lmi98eNos95O+AYpCk2OCi44MAAAAAElFTkSuQmCC" />
							<h5 style={{display:"inline"}}>MicroTeams</h5>
						</div>
				  <br></br><br></br>
					<div className="row usernameMain">
						<div className="col-md-5 col-10 usernameHeading">
							<p className ="setUsername">Set your username</p>
							<Input placeholder="Username" value={this.state.username} onChange={e => this.handleUsername(e)} />
							<Button className ="userButton" variant="contained" color="primary" onClick={this.connect}>Join Now</Button>
						</div>

						<div class="col-md-5 col-10 displayVideo">
							<video id="home-video" ref={this.localVideoref} autoPlay muted></video>
						</div>
					</div>
					</div>
					:
					<div> 
						{/* video display screen parts */}
						<div className="containers">
							<Row id="main" className="flex-container">
								<video id="my-video" ref={this.localVideoref} autoPlay muted></video>
							</Row>
						</div>

						{/* all buttons section */}
						<div className="btn-down">
                            <div style={{float:"left"}}>
								<IconButton className="iconButton" onClick={this.handleVideo}>
										{(this.state.video !== true) ? <VideocamOffIcon className="icons off" /> : <VideocamIcon className="icons" /> }
								</IconButton>
								
								<IconButton  className="iconButton" onClick={this.handleAudio}>
									{this.state.audio !== true ? <MicOffIcon className="icons off"/>: <MicIcon className="icons"/> }
								</IconButton>
							</div>
                          
							{this.state.isScreenPresent === true ?
								<IconButton  className="iconButton" onClick={this.handleScreen}>
									{this.state.screen !== true ?  <StopScreenShareIcon className="icons" />:<ScreenShareIcon className="icons" style={{color:"blue"}}/>}
								</IconButton>
								: 
								null
							}

							<Badge badgeContent={this.state.unseenMessages} max={99} color="secondary" onClick={this.openChat}>
								<IconButton  className="iconButton" onClick={this.openChat}>
									<ChatIcon className="icons" />
								</IconButton>
							</Badge>
							<IconButton  className="iconButton" onClick={this.openInfo}>
									<InfoOutlinedIcon className="icons" />
							</IconButton>
							{/* 415  */}
						    <div class ="endcall">
								  
									<IconButton style={{color:"red"}} onClick={this.handleEndCall}>
										<span style={{fontSize:"20px"}}><b>Leave Call</b></span>
									</IconButton>
							</div>
						</div>

                         {/* chat modal  */}
						<Modal show={this.state.showChatModal} onHide={this.closeChat} style={{ zIndex: "999999" }}>
							<Modal.Header closeButton>
								<Modal.Title>In-call Messages</Modal.Title>
							</Modal.Header>
							<Modal.Body className="modal-body">
								<div className="modal-body-inner">
									Messages can only be seen by people in the call.
								</div>
								{
										this.state.messages.length <= 0 ? <p>Be the first one to message.</p>
										: 
										this.state.messages.map((user, count) => (
											<div key={count} className="messageAlign">
												<p className="message-display"><b> {user.socketIDSender}</b>: {user.message}</p>
											</div>
										)) 
								}
							</Modal.Body>
							<Modal.Footer className="div-send-msg">
								<div className="send-msg-div">
								<Input className="message-input" placeholder="Message" value={this.state.message} onChange={event => this.handleMessage(event)} />
                               <IconButton className="send-icon" onClick={this.sendMessage}>
									<SendIcon />
								</IconButton>
                                </div>
							</Modal.Footer>
						</Modal>

                        {/* copy url modal */}
						<Modal show={this.state.showInfo} onHide={this.closeInfo} style={{ zIndex: "999999" ,height:"50%",overflow:"hidden"}}>
							<Modal.Header closeButton>
								<Modal.Title>Meeting Details</Modal.Title>
							</Modal.Header>
							<Modal.Body className="">
								<div className="">
									<h3>Joining Info</h3>
								</div>
								<div style={{ paddingTop: "10px"}}>
								<Input value={window.location.href} disable="true" style={{fontSize:"18px",width:"70%"}}></Input>
								<br></br>
								<Button style={{color: "blue",fontSize: "12px",paddingTop:"10px"}} onClick={this.copyUrl}>
									  <FileCopyOutlinedIcon className="send-icon" />
									Copy invite link
								</Button>
							</div>
							</Modal.Body>
						</Modal>
					</div>
				}
			</div>
		)
	}
}

export default call