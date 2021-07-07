import React from 'react';
import {Component} from 'react';
import { Button} from '@material-ui/core';
import { Input} from '@material-ui/core';
import {Carousel} from "react-bootstrap";
import VideoCallIcon from '@material-ui/icons/VideoCall';
import "./Home.css"

class Home extends Component {
  	constructor (props) {
		super(props)
		this.state = {
			url: ''
		}
	}

	// function for URL 
	connect = () => {
		if (this.state.url === "") {   // if URL is not specified
			var temporaryurl = Math.random().toString(36).substring(2, 7)
			window.location.href = `/${temporaryurl}`
		} else {                      // join with the particular URL
			var Path = this.state.url.split("/")
			window.location.href = `/${Path[Path.length-1]}`
		}
	}
   
	// update the changes of the input field
	Change = (e) => this.setState({ url: e.target.value })

	render() {
		return (

			    <div className="container ">

					{/* logo part start */}
					<div style={{float:"left"}}>
							<img className="logo-img"
							src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOEAAADhCAMAAAAJbSJIAAAAe1BMVEX0QzZMr1AhlvP/wQf/////vgD0Nia63LtAq0Ww0vkAkfP/4636uLRJrk3/+Pj6saz2bWT1TEBVs1l0v3e027X4/Pn8zsv0PzLQ6NEsm/T/xBVWrPX/zUim0Pr/4qD3+//H4vz/7cPzJg8zqDj94N7h7+Hd6/z/8tsAjPI036d3AAABpElEQVR4nO3cSU5CURBA0fr4aBVFAcWGxt79r1CIEzFx+Ovlk3M3UDmppIYVpZTLq9l1tN3govxuOGra7ma+WO4nRSm3MbhrHVhB2ExHzeogvM3wVREejKsSl5ECrCNsps0yrgYpwErCZrSIWc4Kawmn82j/ilYVNjdJvnrChpCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQ8F/hIKmXP8LXUVJxkdXbkfB9mFWUU4+w+xF2P8LuR9j9CLsfYfeLcVYfR3M/z7OKSVJf4yPheT+r6CU1+Ss8S4qQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkPBf4f2JCx/i8cSFT7GenLSwv4ltDrDaDpdRdjlLrCPsPx8+lu96GcYawv7Z889P9u36sf2Lmi98eNos95O+AYpCk2OCi44MAAAAAElFTkSuQmCC" />
							<h5 style={{display:"inline"}}>MicroTeams</h5>
					</div>
					{/* logo part end */}

					<br></br><br></br>

					{/* heading part start */}
					<div>
						<h1 style={{ fontSize: "50px" }}>Welcome To MicroTeams</h1>
						<p style={{ fontWeight: "250" }}> MicroTeams is a video-chatting service which lets colleagues chat over video and text.</p>
					</div>
					{/* heading part end */}


				    <div className="row">

						{/* join with url block start */}
						<div className="left-Joinblock col-md-5 col-12 mx-auto">
							<p className="start-join">Start or Join a Meeting</p>
							<Input placeholder="URL of Meeting" onChange={e => this.Change(e)} />
							<Button className="join-button" variant="contained" color="primary" onClick={this.connect}>
								<span style={{padding:"4px"}}>
									< VideoCallIcon/>
									<span style={{marginLeft:"10px"}}>JOIN</span>
								</span>
							</Button>
							<p style={{ fontWeight: "300" ,padding:"10px"}}>Leave blank and click join if you want to start a new meeting .</p>
						</div>
						{/* join with url block end */}
                        
						{/* images part */}
						<div className="col-md-5 col-12 mx-auto" style={{marginTop:"50px"}}>
							<Carousel fade>
								<Carousel.Item interval="3000">
									<img
									src="https://www.gstatic.com/meet/user_edu_get_a_link_light_90698cd7b4ca04d3005c962a3756c42d.svg"
									alt="First slide"
									/>
								</Carousel.Item>
								<Carousel.Item  interval="3000">
									<img
									src="https://www.gstatic.com/meet/user_edu_brady_bunch_light_81fa864771e5c1dd6c75abe020c61345.svg"
									alt="Second slide"
									/>
								</Carousel.Item>
								<Carousel.Item  interval="3000">
									<img
									src="https://www.gstatic.com/meet/user_edu_safety_light_e04a2bbb449524ef7e49ea36d5f25b65.svg"
									alt="Third slide"
									/>
								</Carousel.Item>
							</Carousel>
						</div>
						{/* images part end */}
						
				    </div>
			    </div>
		)
	}
}

export default Home;