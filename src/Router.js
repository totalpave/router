'use strict';

import {Component, cloneElement} from 'react';
import RouterStrategy from './RouterStrategy';
import DefaultStrategy from './DefaultStrategy';
import RouteMatcher from './RouteMatcher';
import * as Path from 'path';

var instance = null;

export var getRouter = () => {
	if (!instance) {
		return null;
	}

	return instance.getRouterStrategy();
};

class Router extends Component {
	constructor(props) {
		super(props);

		var Strategy;
		if (!props.strategy) {
			Strategy = DefaultStrategy;
		}
		else {
			Strategy = props.strategy;
		}

		var strategy = new Strategy(this);

		this.state = {
			strategy: strategy,
			url : strategy.getLocation()
		};

		this._lastRenderedRoute = null;

		this._onURLChange = this._onURLChange.bind(this);
		this.matcher = new RouteMatcher(strategy);
	}

	getRouterStrategy() {
		return this.state.strategy;
	}
	
	_onURLChange(url) {
		this.setState({
			url: url,
			shouldTransition : true
		});
	}

	componentWillMount() {
		instance = this;
		this.state.strategy.addURLChangeCallback(this._onURLChange);
	}

	componentWillUnmount() {
		instance = null;
		this.state.strategy.removeURLChangeCallback(this._onURLChange);
	};

	componentWillReceiveProps(nextProps) {
		if (nextProps.strategy && (this.state.strategy instanceof nextProps.strategy)) {
			this.state.strategy.removeURLChangeCallback(this._onURLChange);
			var strat = new nextProps.strategy(this);
			strat.addURLChangeCallback(this._onURLChange);
			this.setState({
				strategy: strat
			});
		}
	}

	render() {
		var currentRoute = this.matcher.match(this.state.url || '/', this._getChildren(), '', this._getIndexRoute());
		var Root = null;
		if (this.props.component) {
			Root = this.props.component;
		}

		if (currentRoute.props.transition && this.state.shouldTransition) {
			this._awaitingTransition = true;
			var exiting = cloneElement(this._lastRenderedRoute, {
				ref : (node) => {
					this._exitingNode = node;
				}
			});
			var incoming = cloneElement(currentRoute, {
				ref : (node) => {
					this._incomingNode = node;
				}
			});

			if (Root) {
				return <Root router={this.getRouterStrategy()} url={this.state.url}>{[exiting, incoming]}</Root>;
			}
			else {
				return [exiting, incoming];	
			}
		}
		else {
			this._lastRenderedRoute = currentRoute;	

			if (Root) {
				return <Root router={this.getRouterStrategy()} url={this.state.url}>{currentRoute}</Root>;
			}
			else {
				return currentRoute;
			}
		}
	}

	componentDidUpdate() {
		if (this._awaitingTransition) {
			this._awaitingTransition = false;
			if (this._incomingNode.props.transition) {
				this._incomingNode.props.transition.execute(this._incomingNode.getNode(), this._exitingNode.getNode()).then(() => {
					this._incomingNode = null;
					this._exitingNode = null;
					this.setState({shouldTransition: false});
				});
			}
		}
	}

	getHistoryLength() {
		return this.state.strategy.getHistoryLength();
	}

	getScrollRestoration() {
		return this.state.strategy.getScrollRestoration();
	}

	go(to) {
		this.state.strategy.go(to);
	}

	back() {
		this.state.strategy.go(-1);
	}

	forward() {
		this.state.strategy.go(1);
	}

	_getChildren() {
		var children = null;

		if (this.props.children instanceof Array) {
			children = this.props.children;
		}
		else {
			children = [this.props.children];
		}

		return children;
	}

	_getIndexRoute() {
		var children = this._getChildren();
		for (var i = 0; i < children.length; i++) {
			var child = children[i];
			if (child.props.index) {
				return child;
			}
		}

		return null;
	}
}

export {
	Router
};
export default Router;
