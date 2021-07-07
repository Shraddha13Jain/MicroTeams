import React, { Component } from 'react'
import { BrowserRouter as Router } from 'react-router-dom';
import { Route } from 'react-router-dom';
import { Switch } from 'react-router-dom';
import Video from './call'
import Home from './Home'


class App extends Component {
	render() {
		return (
			<div>
				<Router> 
					<Switch>
						<Route path="/" exact component={Home} />
						<Route path="/:url" component={Video} />
					</Switch>
				</Router>
			</div>
		)
	}
}

export default App;