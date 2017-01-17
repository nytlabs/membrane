var ResponseParent = React.createClass({
	getInitialState: function() {
		return {
			initialResponse: '',
			allVisibleResponses: (this.props.allVisibleResponses != null) ? this.props.allVisibleResponses : [],
			user: "",
			phrase: "",
			ancestor: null,
		}
	},

	propTypes: {
	    initialResponse: React.PropTypes.string.isRequired
	},

	componentDidMount: function() {
		var con = this;

	    if (typeof this.props.initialResponse != "undefined"){
	      $.get("/slug/" + this.props.initialResponse, function(data, status, xhr) {
	          con.setState({
	            initialResponse : data["_id"], 
	            allVisibleResponses: [data["_id"]], 
	            author: data["author"]
	          })
	      })
	    } else {
          con.setState({
            author: con.props.author
          })
	    }
	},

	render: function() {
		var con = this;
		var responses = [];

		console.log(this.state.allVisibleResponses)

		this.state.allVisibleResponses.forEach(function(src) {
	      if (typeof src != 'undefined') {
	        responses.push(<Response links={con.state.links} url={"/responses/" + src} author={con.state.author} response={src} phrase={con.props.phrase}/>)
	      }
		})

		return (
			<div id="responseParent">
			<p className="responses para">
			{responses}
			</p>
			<div id="feedback"></div>
			</div>
		)
	}

})

var Response = React.createClass({

  propTypes: {
    url: React.PropTypes.string.isRequired
  },

	getInitialState: function() {
		return {
			text: "",
			prompts: null,
			phrase: this.props.phrase,
			slug: ""
		}
	},

	componentDidMount: function() {
		var con = this;
		$.get(this.props.url).done(function(result) {
			$.get(con.props.url + "/prompts/answered", function(data) {
				d = cloneObject(data)
				con.setState({text: result.text, links: result.links, slug: result.slug, prompts: d})
			})
		})
 
	},

	componentDidUpdate: function() {
		// if (this.props.links != undefined) {
		// 	replace(this.props.links["text"], this.props.links["href"])		
		// }

		// replace();
	},

	render: function() {
		var con = this;
		var t = this.state.text;
		var paragraphs = t.split("\n\n")
		var pieces = [];
		paragraphs.forEach(function(val, index) {
			pieces.push(<Paragraph text={val} num={index} author={con.props.author} response={con.props.response} phrase={con.props.phrase} prompts={con.state.prompts}/>)
		})

		return (
			<div>
			<h3 className="phrase">{this.state.phrase}</h3>
			{pieces}
			<Footnotes outgoinglinks={this.state.links}/>
			</div>
		)
	},

})

var Footnotes = React.createClass({
	render: function() {
		var pieces = [];
		var el;
		if (this.props.outgoinglinks && this.props.outgoinglinks != "") {
			this.props.outgoinglinks.forEach(function(val, index) {
				pieces.push(<li>[{index + 1}] <a href={val}>{val}</a></li>)
			})
			el = <ul>{pieces}</ul>
		} else {
			el = <span></span>
		}

		return (
			<div>
			{el}
			</div>
		)

	}
})


var Paragraph = React.createClass({
	getInitialState: function() {
		return {
			filteredPrompts: null,
			allVisibleResponses: [],
			lastEvent: null
		}
	},

	filterPrompts: function() {
		var fS = [];

		var con = this;

		if (this.props.prompts != null) {
			this.props.prompts.forEach(function(val) {
				if (val.paragraph == con.props.num) {
					fS.push(val);
				}
				
			})			
		}

		return fS;
	},

	getSelection: function() {
		// http://jsfiddle.net/timdown/Q9VZT/
	    var text = "", containerElement = null, baseOffset = null, extentOffset = null;
	    
		var selection = window.getSelection();
	    // http://stackoverflow.com/questions/4220478/get-all-dom-block-elements-for-selected-texts
		
		// don't care
		var node = selection.getRangeAt(0).commonAncestorContainer;
		containerElement = node.nodeType == 1 ? node : node.parentNode;

		// ok care now
		var firstRange = document.createRange();
		firstRange.setStart(selection.anchorNode.parentNode, 0)
		firstRange.setEnd(selection.extentNode.parentNode, 0)

		var startElem;

		// this helps us with right to left selections, because those jerks are treated differently
		if (firstRange.collapsed) {
			startElem = selection.extentNode.parentNode
		} else {
			startElem = selection.anchorNode.parentNode;		
		}

		var elems = $(window.getSelection().baseNode.parentElement.parentElement)[0];
		
		var range = document.createRange();

		var rangeStart = $(React.findDOMNode(this)).first("p").get(0)

		var rangeEnd = startElem;

		range.setStart(rangeStart, 0)
		range.setEnd(rangeEnd, 0)

		var text = window.getSelection().toString();
		// we're going to need to modify startPoint for r-l as well
		var startPoint = range.toString().length + selection.anchorOffset;
		var endPoint = text.length + startPoint;

	    return {
	        text: text,
	        containerElement: containerElement,
	        baseOffset: startPoint,
	        extentOffset: endPoint
	    };

	},


	handleMouseUp: function(e) {
		e.stopPropagation();
		var elem = this.getSelection().containerElement;

		if ($(e.target).hasClass('options') == true) {
			this.refs.submitPromptBox.setState({ visible : false});
			return
		}
		
		if (elem.nodeName == "SPAN" || elem.nodeName == "P") {
			if (this.getSelection().text != '') {
				var state = this.refs.submitPromptBox.state.visible;	
				this.refs.submitPromptBox.setState({ visible : true, selection: this.getSelection(), lastEvent: event});
			} else {
				this.refs.submitPromptBox.setState({ visible : false, selection: null});
			}
		}
	},

	handleMouseDown: function(e) {
		if ($(event.target).hasClass('options') == false) {
			window.getSelection().empty();	
		}
	},


	mergeOverlaps: function(prompts) {
		var con = this;
		for (var i = 0; i < prompts.length; i++) {
			for (var k = i+1; k < prompts.length; k++) {
				var pos1 = prompts[i].displayNumStart;
				var end1 = prompts[i].displayNumEnd;
				var pos2 = prompts[k].displayNumStart;
				var end2 = prompts[k].displayNumEnd;

				if (pos2 < end1 && end1 < end2) {
					// if (pos2 != pos1 && end2 != end1) {
						if (pos1 < pos2) {
							prompts[k]["displayNumStart"] = pos1;
							prompts[i]["displayNumStart"] = pos1;							
						} else {
							prompts[k]["displayNumStart"] = pos2;
							prompts[i]["displayNumStart"] = pos2;
						}

						if (end1 < end2) {
							prompts[k]["displayNumEnd"] = end2;
							prompts[i]["displayNumEnd"] = end2;	
						} else {
							prompts[k]["displayNumEnd"] = end1;
							prompts[i]["displayNumEnd"] = end1;
						}
						return this.mergeOverlaps(prompts)
					// }
				}
			}
		}
		return prompts;
	},


	parseText: function() {
		var con = this;
		var pieces = [];
		var stringToProcess = this.props.text;

		// take out extra prompts
		var prompts = this.filterPrompts();


		// sort them by order of appearance
		prompts.sort(function(a, b) {
			return a.numStart - b.numStart
		})

		// make sure everything has a start and end
		for (var i = 0; i < prompts.length; i++) {
			prompts[i]["displayNumStart"] = prompts[i].numStart;
			prompts[i]["displayNumEnd"] = prompts[i].numEnd;
		}

		// introduce displayNumStart and displayNumEnd
		prompts = this.mergeOverlaps(prompts)

		// actually creating string
		var bookmark = 0;
		while (bookmark < stringToProcess.length) {
			var match = false;
			// check whether any prompts start here
			for (var i = 0; i < prompts.length; i++) {

				// if they do start here...
				if (bookmark == prompts[i].displayNumStart && prompts[i].displayNumStart != prompts[i].displayNumEnd) {
					match = true;


					// find ALL the prompts that start here
					var ids = prompts[i]["_id"]
					var phrases = [];
					phrases.push(prompts[i]["text"])

					for (var k = i + 1; k < prompts.length; k++) {
						if (prompts[k].displayNumStart == bookmark) {
							ids += " " + prompts[k]["_id"] // we should switch this to being an array for consistency???
							phrases.push(prompts[k]["text"])
						}
					}

					var displayText = stringToProcess.substring(prompts[i].displayNumStart, prompts[i].displayNumEnd)
					bookmark = prompts[i].displayNumEnd;	
					pieces.push(<PromptDisplay ids={ids} onResponseRevealed={con.handleResponseRevealed} text={displayText} phrase={phrases}/>)

				}
			}

			if (match == false) {
				pieces.push(stringToProcess[bookmark])
				bookmark += 1;					
			}

		}


		return pieces;
	},

	handleResponseRevealed: function(data) {
		this.setState({phrase: data.phrase})
		var arr = data.id;
		var con = this;
		arr.forEach(function(value, index) {

			if (con.state.allVisibleResponses.indexOf(value["_id"]) == -1){
				var newArray = con.state.allVisibleResponses;
				newArray.push(value["_id"])
				con.setState({ allVisibleResponses : newArray})
			}

		})

	},

	render: function() {
		var filtered = this.parseText();
		return (
			<div onMouseUp={this.handleMouseUp} onMouseDown={this.handleMouseDown}> 
				<p className="range-start">{filtered}</p>
				<ResponseParent phrase={this.state.phrase} author={this.props.author} allVisibleResponses={this.state.allVisibleResponses}/>
				<PromptSubmitBox author={this.props.author} ref="submitPromptBox" paragraph={this.props.num} response={this.props.response}></PromptSubmitBox>
			</div>
		)
	},

})



var PromptDisplay = React.createClass({
	getInitialState: function() {
		return {

		}
	},

	componentDidMount: function() {
	
	},

	render: function() {
		return (
			<span onClick={this.handleClick} ids={this.props.ids} className="active-prompt">{this.props.text}</span>
		)
	},

	handleClick: function() {
		var con = this;
		var ids = this.props.ids.split(" ")
		ids.forEach(function(value, index) {
			$.ajax({
				url: "/prompts/" + value + "/responses",
				dataType: 'json',
				type: "GET",
				success: function(data) {
					if (data.length != 0) {
						con.props.onResponseRevealed({id : data, phrase: con.props.phrase[index]})
					}
				}.bind(this),
				error: function(xhr, status, err) {
					$("#feedback").text('Connection lost.').css("display", "block").fadeOut(1500)
					console.error(this.props.url, status, err.toString())
				}.bind(this)
			})
		})
	},

})

function replace(text, link) {
	var a = document.createElement("a");
	a.href = link
	a.target = "_blank"

	var re = new RegExp(text, "g")

	findAndReplaceDOMText(document.getElementById('responseParent'), {
 		find: re,
 		wrap: a
 	})
}
