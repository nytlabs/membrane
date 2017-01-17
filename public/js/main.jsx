var Page = React.createClass({
	getInitialState: function() {
		return {
			response: window.location.pathname,
			ancestor: null,
			isNewUser: null,
		}
	},

	componentDidMount: function() {
		this.getResponse();
		this.handleUser();
	},

	getResponse: function() {
		var con = this
		$.ajax({
			url: "/slug" + con.state.response,
			dataType: "json",
			type: "GET",
			success: function(data) {
				$.get("/responses/" + data["_id"] + "/ancestor", function(response) {
					con.setState({
						response: data,
						ancestor: response["slug"]
					})
				})
			}
		})
	},

	// this was previously in ResponseParent, needs to be put here
	handleUser: function() {
		if (this.getCookieValue() == "") {
			this.createNewUser();
		} else {
			this.findExistingUser();
		}
	},

	findExistingUser: function() {
		var con = this;
		$.ajax({
			url: "/users/check",
			dataType: 'json',
			type: "GET",
			success: function(data) {
				con.setState({ user: data["id"], isNewUser: false})
				$.ajax({
					url: "/notifications/user",
					dataType: "json",
					type: "POST",
					success: function(result) {

					}.bind(this),
					error: function(xhr, status, err) {
						console.log(err)
					}
				})
			}.bind(this),
			error: function(xhr, status, err) {
				console.log("not found")
				con.createNewUser();
			}.bind(this)
		})
	},

	createNewUser: function() {
		var con = this;
		$.ajax({
			url: "/users",
			dataType: 'json',
			type: "POST",
			success: function(data) {
				con.setState({isNewUser: true})
			}.bind(this),
			error: function(xhr, status, err) {
			}.bind(this)
		})
	},

	getCookieValue: function() {
	    var name = "membraneReader=";
	    var ca = document.cookie.split(';');
	    for(var i=0; i<ca.length; i++) {
	        var c = ca[i];
	        while (c.charAt(0)==' ') c = c.substring(1);
	        if (c.indexOf(name) == 0) return c.substring(name.length,c.length);
	    }
	    return "";
	},

	render: function() {
		var elem;
		if (this.state.ancestor != null) {
			elem = <a className="back" href={"/" + this.state.ancestor}> ↰ Go up a level</a>
		}

		return (
		<div>
	        <div id="header">
	            <div className="left">
	            <a href="/">Membrane</a>
	            </div>
	            <Notifications/>
	        </div>
	        <h1>Membrane</h1>
	        {elem}
	        <div id="content">
		        <ResponseParent initialResponse={this.state.response} phrase=""/>
	        </div>
	        <Modal show={this.state.isNewUser}/>
        </div>
		)
	}
})

var Notifications = React.createClass({
	getInitialState: function() {
		return {
			notifications: [],
			open: false,
			hasNew: false
		}
	},

	componentDidMount: function() {
		this.getNotifications();
	},

	getNotifications: function() {
		var con = this;
		$.ajax({
			url: "/notifications/user/read",
			dataType: "json",
			type: "POST",
			success: function(data) {
				if (con.checkNew(data) == true) {
					con.setState({notifications: data, hasNew: true})
				} else {
					con.setState({notifications: data, hasNew: false})
				}
			}
		});
	},

	markAsRead: function() {
		console.log(this.state.notifications)
		$.ajax({ 
			url: "/notifications/user/read",
			dataType: "json",
			type: "POST",
			data: JSON.stringify(this.state.notifications),
			success: function(result) {
				console.log(result)
			}
		})
	},

	checkNew: function(notifications) {
		var n = false;
		notifications.forEach(function(val) {
			if (val["read"] == false) {
				n = true;
			}
		})
		return n;
	},

	setOpen: function() {
		if (this.state.open == true) {
			this.setState({open:false})
		} else {
			this.setState({open:true})
		}
	},

	handleClick: function(e) {
		if ($(e.target).attr("id") == "notification-btn") {
			this.setOpen();
			if (this.state.open == true) {
				this.getNotifications();
				this.markAsRead();
			} else {
				this.getNotifications();
			}
		} else if ($(e.target).attr("id") == "info-btn") {
			var elem = $("#info-modal");
			console.log(elem)
			elem.modal();
		}
	},

	render: function() {
		var newList = {};

		this.state.notifications.forEach(function(val) {
			if (!(val.author in newList)) {
				newList[val.author] = [val];
			} else {
				newList[val.author].push(val)
			}
		})

		var notifs = [];
		for (var key in newList) {
			notifs.push(<h4>Answers from {key}</h4>);
			newList[key].forEach(function(n) {
				notifs.push(<Notification author={n["author"]} id={n["_id"]} user={n["userId"]} prompt={n["prompt"]} read={n["read"]} timestamp={n["timestamp"]} kind={n["kind"]} slug={n["slug"]} text={n["text"]}/>)
			})
		}

		var classes = "glyphicon glyphicon-bell " + ((this.state.hasNew) ? 'new' : 'no-new');
		return (
		<div className="dropdown right notification">
			<button onClick={this.handleClick} className="btn btn-default notif-btn">
				<span className="glyphicon glyphicon-info-sign" id="info-btn"></span>
			</button>

			<button onClick={this.handleClick} className="btn btn-default dropdown-toggle notif-btn"  type="button" id="dropdown" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">
				<span className={classes} aria-hidden="true" id="notification-btn"></span>
			</button>

			<ul className="dropdown-menu dropdown-menu-right" aria-labelledby="dropdown">
				{notifs}
			</ul>
		</div>
		)
	}
})

var Notification = React.createClass({
	getInitialState: function() {
		return {
			read : this.props.read,
		}
	},

	componentDidMount: function() {
		this.setState({
			read: this.props.read,
		})
	},

	render: function() {

		var read;
		if (this.props.read == true) {
			read = "read"
		}

		return (
			<li>
				<div>
				<a className={read} href={"/" + this.props.slug}>{this.props.author} has answered your {this.props.kind} question: {this.props.text}</a>
				</div>
			</li>
		)
	},
})


var PromptSubmitBox = React.createClass({
	getInitialState: function() {
		return { 
			visible: false, 
			response: null,
			lastEvent: null,
			selection: null,
		}
	},

	handlePromptSubmit: function(prompt) {
		var node = React.findDOMNode(this)
		var con = this;

		var p = prompt;
		p["paragraph"] = this.props.paragraph;
		p["numStart"] = this.state.selection.baseOffset;
		p["numEnd"] = this.state.selection.extentOffset;

		console.log(p)

		$.ajax({
			url: "/prompts",
			dataType: 'json',
			type: "POST",
			data: JSON.stringify(p),
			success: function(data) {
				$('#message').slideDown(500).delay(5000).slideUp(500);
				con.setState({visible: false})
			}.bind(this),
			error: function(xhr, status, err) {
				$("#feedback").text('Unable to submit.').css("display", "block").fadeOut(1500)
				console.error(this.props.url, status, err.toString())
			}.bind(this)
		})
	},

	render: function() {
		var classString = 'promptSubmitBox '
		if (this.state.visible == true) {
			classString += "visible"
		} else {
			classString += "invisible"
		}

		var css;

		if (this.state.lastEvent) {
			if (this.state.lastEvent.touches) {
				css = {
					position: "fixed",
					top: "0px",
					left: "0px",
					width: "100%",
					zIndex: "2000"
				}
			} else {
				css = {
					top: this.state.lastEvent.pageY + "px",
					left: this.state.lastEvent.pageX + 10 + "px"
				}
			}
		}
		
		return (
			<div>
				<div className={classString}>
					<PromptSubmitForm author={this.props.author} response={this.props.response} css={css} onPromptSubmit={this.handlePromptSubmit}/>
				</div>
			</div>
		)
	}
})

var PromptSubmitForm = React.createClass({
	getInitialState: function() {
		return { 
			response: this.props.response, 
			user: null,
			prompts: []
		}
	},

	componentDidMount: function() {
		console.log(this.props.response)
		var con = this;

		$.ajax({
			url: "/promptsets/" + con.props.author,
			dataType: "json",
			type: "GET",
			success: function(data) {
				console.log(data)
				con.setState({prompts: data["prompts"]})
			}
		})

		if (this.getCookieValue() != "") {
			this.setState({ user: this.getCookieValue() })
		} 
	},

	handleSubmit: function(event) {
		event.preventDefault();

		var t = window.getSelection().toString();
		var k = $(event.target).data("val");
		var s = this.props.response;
		var u = this.state.user;

		this.props.onPromptSubmit({text: t, kind: k, parent: s, user: u})

		return;
	},

	getCookieValue: function() {
	    var name = "membraneUser=";
	    var ca = document.cookie.split(';');
	    for(var i=0; i<ca.length; i++) {
	        var c = ca[i];
	        while (c.charAt(0)==' ') c = c.substring(1);
	        if (c.indexOf(name) == 0) return c.substring(name.length,c.length);
	    }
	    return "";
	},

	render: function() {
		var prompts = [];
		var con = this;
		this.state.prompts.forEach(function(val) {
			prompts.push(
				<li>
					<a href="#" className="options" data-val={val} onClick={con.handleSubmit} onTouchEnd={con.handleSubmit}>{val}</a>
				</li>
			)
		})

		return (
			<div id="chooser" className="promptSubmitForm" style={this.props.css}>
				<ul ref="picker">
					{prompts}
				</ul>
			</div>
		)
	}
});


var Modal = React.createClass({
	render: function() {
		if (this.props.show) {
			var elem = $(React.findDOMNode(this));
			elem.modal();
		}

		return (
			<div id="info-modal" className="modal fade bs-example-modal-lg" tabindex="-1" role="dialog">
			  <div className="modal-dialog modal-lg">
			    <div className="modal-content">
			      <div className="modal-header">
			        <button type="button" className="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
			        <h3 className="modal-title">Welcome to Membrane!</h3>
			      </div>
			      <div className="modal-body">
			      	<h3>What is this?</h3>
			        <p>Membrane is an experiment in permeable publishing. It is a new form of reading experience, in which readers may “push back” through the medium to ask questions of the author.</p>
			        
			        <h3>How do I use it?</h3>
			        <p>
						As you read an essay, highlight any parts that you want to know more about, or express agreement with, or dispute. Once you have highlighted some text, a menu will appear asking you to select which question (or reaction) you’d like to submit. This list of “prompts” is provided by the author, and is specific to each essay.
			        </p>

			        <h3>How do I know if my question was answered?</h3>
			        <p>
					When an author replies to your question, you will see an alert on your Membrane screen with details and a link to the author’s response.
			        </p>



			      </div>
			      <div className="modal-footer">
			        <button type="button" className="btn btn-primary" data-dismiss="modal">Done</button>
			      </div>
			    </div>
			  </div>
			</div>
		)

	}





});

function cloneObject(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
 
    var temp = obj.constructor(); // give temp the original obj's constructor
    for (var key in obj) {
        temp[key] = cloneObject(obj[key]);
    }
 
    return temp;
}

function concat(a, b) {
	var i;
	var l = a.length;
	for (var i = 0; i < l; i++) {
		if (b.indexOf(a.substring(i)) == 0) {
			return a.substring(0, i) + b;
		}
	}
	// return a + b;
}

React.render(
	<Page initialResponse={window.location.pathname}/>, document.getElementById("main")
)


