var Page = React.createClass({
	getInitialState: function() {
		return {
			writings: null
		}

	},

	componentDidMount: function() {
		this.loadResponses();
		console.log(getCookie("membraneAuthor"))
	},

	loadResponses: function() {
		var con = this;
		$.ajax({
			url: "/authors",
			dataType:"json",
			type:"POST",
			success: function(data) {
				con.setState({writings: data})
			}
		})
	},

	render: function() {
		var w = [];
		if (this.state.writings != null) {
			this.state.writings.forEach(function(val) {
				w.push(<Response slug={val.slug} text={val.text}/>)
			})
		}

		return (
			<div className="panelParent">
				<div id="header">
					<div>
						<a href="/admin">Membrane</a>
            <LogOutButton />
					</div>
				</div>
				<div className="container">
					<div id="response-container">
					<h1>All your posts</h1>
						{w}
					</div>
				</div>
			</div>
		)

	}
});

var Response = React.createClass({
	getInitialState: function() {
		return {
			truncationPoint: 400,
			truncatedString: null
		}
	},

	componentDidMount: function() {
		this.truncateString();
	},

	truncateString: function() {
		if (this.props.text.length < this.state.truncationPoint) {
			this.setState({truncatedString: this.props.text});
		} else {
			this.setState({truncatedString: this.props.text.slice(0, this.state.truncationPoint) + "..."});
		}
	},

	render: function() {

		var link = window.location.protocol + "//"+ window.location.host + "/" + this.props.slug;

		return (
			<div className="author-responses">
				<div className="response-text">{this.state.truncatedString}</div>
				<div><a href={link}>{link}</a></div>
				<div className="response-button">
          <a href={"/admin/" + this.props.slug}>
            <button>See questions asked about this</button>
          </a>
        </div>
        <DeleteButton slug={this.props.slug} />

			</div>
		)
	}

})


function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i=0; i<ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1);
        if (c.indexOf(name) == 0) return c.substring(name.length,c.length);
    }
    return "";
}

React.render(
	<Page author={window.location.pathname.split("/admin/")[1]}/>, document.getElementById("content")
)
