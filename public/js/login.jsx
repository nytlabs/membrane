var Page = React.createClass({
	render: function() {
		return (
			<div>
			<h1>Author login</h1>
			<LoginForm/>
			</div>
		)
	}
})

var LoginForm = React.createClass({
	submitLogin: function(event) {
		event.preventDefault()
		var data = {
			username: React.findDOMNode(this.refs.username).value,
			password: React.findDOMNode(this.refs.password).value
		}
		
		if (this.validateLogin(data)) {
			this.postToLoginEndpoint(data);
		}
	},

	validateLogin: function(data) {
		if (data.username != undefined && data.password != undefined) {
			return true
		}
		return false
	},

	postToLoginEndpoint: function(data) {
		$.ajax({
			url: "/login",
			type: "POST",
			dataType: "json",
			data: JSON.stringify(data),
			statusCode: {
				200: function() {
					window.location.reload()
				}

			}
		})
	},

	render: function() {
		return (
			<div>
				<form onSubmit={this.submitLogin}>
					<p><input type="text" name="login" ref="username" placeholder="username"/></p>
					<p><input type="password" name="password" ref="password" placeholder="password"/></p>
					<p className="submit"><input type="submit" name="login" value="Login"/></p>
				</form>
			</div>
		)
	}
})

React.render(
	<Page/>, document.getElementById("content")
)
