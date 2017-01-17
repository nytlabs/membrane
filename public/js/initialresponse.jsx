var Page = React.createClass({
	getInitialState: function() {
		return {}
	},

	render: function() {
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
					<h1>Write your first piece of text.</h1>
						<AuthorPanel/>
					</div>
				</div>
			</div>
		)
	}
})

var AuthorPanel = React.createClass({
	postToResponsesEndpoint: function() {
		var con = this;
		var text = $(this.refs.text.getDOMNode()).val();
		// var links = $(this.refs.links.getDOMNode()).val().trim();
		
		// links = links.split(", ")

		// var linkInfo = [];
		// links.forEach(function(val, index) {
		// 	var lastChar = val.charAt(val.length-1);
		// 	var text = val;
		// 	if (lastChar == ",") {
		// 		text = text.slice(0, -1);
		// 	} 
		// 	linkInfo.push(text)
		// })

		var linkInfo = {
				"text": "another",
				"href": "http://google.com"
		}

		var data = {
			text: text,
			parent: [],
			// links: linkInfo
		}

		console.log(data);
		console.log(JSON.stringify(data))

		$.ajax({
			url: "/responses",
			dataType: "json",
			type: "POST",
			data: JSON.stringify(data),
			success: function() {
				window.location = window.location.href.split("/")[0] + "/admin"
			}
		})
	},


	render: function() {
		return (
			<div>
				<textarea type="textarea" rows="6" className="form-control" ref="text" placeholder="your text"/>
			
				<button className="btn btn-default" onClick={this.postToResponsesEndpoint}>Finish</button>
			</div>
		)

	}


});

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
	<Page/>, document.getElementById("content")
)
