var ResponseParent = React.createClass({
	getInitialState: function() {
		return {
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

});



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
			$.get(con.props.url + "/prompts", function(data) {
				d = cloneObject(data)
				con.setState({text: result.text, links: result.links, slug: result.slug, prompts: d})
			})
		})
 
	},

	handleMouseEnter: function(e, t) {
		if (this.state.curMouseOver == e) {
			return;
		}

		$(".baller").removeClass('baller')
		$(".baller-border-left").removeClass("baller-border-left");
		$(".baller-border-right").removeClass("baller-border-right");
		

		var classList = $(t.target).attr("class").trim().split(" ");

		classList.sort(function(a, b) {
			var $a = $("." + a).length;
			var $b = $("." + b).length;

			if ($a > $b) {
				return 1;
			} else if ($a < $b) {
				return -1
			}
			return 0;
		})

		this.setState({curMouseOver: e, classList: classList})	

		$("." + classList[0]).addClass("baller")
		$("." + classList[0] + ":first").addClass("baller-border-left")
		$("." + classList[0] + ":last").addClass("baller-border-right")


		// classList.forEach(function(v) {
		// 	if (v != "") {
		// 		$("." + v).addClass("baller")
		// 	}
		// })

	},

	handleMouseExit: function() {

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
			pieces.push(<Paragraph text={val} num={index} handleMouseEnter={con.handleMouseEnter} handleMouseExit={con.handleMouseExit} author={con.props.author} response={con.props.response} phrase={con.props.phrase} prompts={con.state.prompts}/>)
		})

		return (

			<div>
			<h3 className="phrase">{this.state.phrase}</h3>
			{pieces}
			<Footnotes outgoinglinks={this.state.links}/>
			<MoreInfo prompts={this.state.curMouseOver} list={this.state.classList}/>
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
			lastEvent: null,
			lastMouseEvent: null,
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

	handleMouseClick: function(e, t) {
		var shortest = e[0]
		var lengthToBeat = e[0].displayNumEnd - e[0].displayNumStart;

		e.forEach(function(v) {
			var thisLength = v.displayNumEnd - v.displayNumStart;
			if (thisLength < lengthToBeat) {
				lengthToBeat = thisLength;
				shortest = v;
			}
		});

		var p = this.state.selectedPrompt;
		if (this.state.selectedPrompt == undefined) {
			p = shortest
		}

		$(".currently-selected-prompt").removeClass("currently-selected-prompt")
		$("." + shortest["_id"]).addClass("currently-selected-prompt");

		var inputState;
		var numClicks;
		if (this.state.prevPrompt == null) {
			inputState = "newprompt"
			numClicks = 0;
		} else {
			if (shortest == p) {
				inputState = "sameprompt";	
				numClicks = this.state.numClicks + 1;
			} else {
				inputState = "newprompt";
				numClicks = 0;
			}
		}


		this.setState({prevPrompt: p, selectedPrompt: shortest, inputState: inputState, numClicks: numClicks})

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
		// prompts = this.mergeOverlaps(prompts)

		// actually creating string
		var bookmark = 0;
		var store = [];
		while (bookmark < stringToProcess.length) {
			var match = false;
			// check whether any prompts start here
			for (var i = 0; i < prompts.length; i++) {

				// if they do start here...
				if (bookmark >= prompts[i].displayNumStart && bookmark <= prompts[i].displayNumEnd && prompts[i].displayNumStart != prompts[i].displayNumEnd) {
					match = true;
					// find ALL the prompts that start here
					var promptList = [];
					promptList.push(prompts[i]);

					for (var k = i + 1; k < prompts.length; k++) {
						if (bookmark >= prompts[k].displayNumStart && bookmark <= prompts[k].displayNumEnd) {
							promptList.push(prompts[k]);
						}
					}

					var displayText = stringToProcess.substring(prompts[i].displayNumStart, prompts[i].displayNumEnd)
					bookmark += 1;	

					// pieces.push(<div ids={ids} text={stringToProcess[bookmark-1]} phrase={phrases}/>)
					pieces.push(<PromptDisplay handleMouseClick={this.handleMouseClick} handleMouseEnter={this.props.handleMouseEnter} handleMouseExit={this.props.handleMouseExit} prompts={promptList} onResponseRevealed={con.handleResponseRevealed} text={stringToProcess[bookmark-1]}/>)
					break;
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
				<TextInput numClicks={this.state.numClicks} inputState={this.state.inputState} prompt={this.state.selectedPrompt}/>
				<ResponseParent phrase={this.state.phrase} author={this.props.author} allVisibleResponses={this.state.allVisibleResponses}/>
			</div>
		)
	},

})

var TextInput = React.createClass({
	getInitialState: function() {
		return {
			visible: false
		}

	},

	sendToEndpoints: function() {
		var con = this;
		var parent = this.props.prompt["_id"];
		var user = this.props.prompt["user"];
		var kind = this.props.prompt["kind"];

		var text = $(React.findDOMNode(this.refs.text)).val()

		var data = {
			text: text,
			parent: [parent],
			links: this.state.links
		}

		$.ajax({
			url: "/responses",
			dataType: "json",
			type: "POST",
			data: JSON.stringify(data)
		}).done(function(info) {
			$.ajax({
				url: "/prompts/" + parent,
				dataType: "json",
				type: "POST",
				data: JSON.stringify({"isAnchor": true})
			}).done(function() {
				console.log(info.text)
				console.log(info.slug)
				var notifData = {
					prompt: parent,
					userId: user,
					text: info.text,
					kind: kind,
					slug: info.slug,
					author: "herrman"
				}

				$.ajax({
					url: "/notifications",
					dataType: "json",
					type: "POST",
					data: JSON.stringify(notifData)
				}).done(function() {
					$(".modal").modal();
				})

			})

		});



	},

	render: function() {
		var elem;
		var curClass;

		if (this.props.numClicks % 2 == 0) {
			curClass = "show"
		} else {
			curClass = "dontshow"
		}

		if (this.props.prompt) {
			elem = <p style={{fontStyle: "italic"}}>Reply to <b>{this.props.prompt.kind}</b> about <b>{this.props.prompt.text}</b></p>
		}

		return (
		<div className={curClass + " authortextinput"} >
			{elem}
			<textarea ref="text" type="textarea" rows="6" className="form-control" id="authornewtext" placeholder="Enter your reply"/>
			<div  className="authortextsubmission">
				<button onClick={this.sendToEndpoints} className="btn btn-primary">Submit</button>
				<a href="#">Cancel</a>
			</div>
		</div>
		)
	}

})

var PromptDisplay = React.createClass({
	componentDidMount: function() {
		this.handleLoad();
	},

	render: function() {
		var a = (this.props.prompts.length/100) * 20;
		var data = this.props.prompts.length;

		var style = {
			backgroundColor: "rgba(2, 154, 186, " + a + ")"
		}

		var ids = "";
		if (this.props.prompts) {
			this.props.prompts.forEach(function(val) {
				ids += val["_id"] + " ";
			})
		}

		return (
			<span className="active-prompt" data-level={data} style={style} onClick={this.props.handleMouseClick.bind(null, this.props.prompts)} onMouseEnter={this.props.handleMouseEnter.bind(null, this.props.prompts)}  onMouseLeave={this.props.handleMouseExit}>
				<span className={ids} data-type="prompt">{this.props.text}</span>
			</span>
		)
	},

	handleLoad: function() {
		var con = this;
		this.props.prompts.forEach(function(value, index) {
			$.ajax({
				url: "/prompts/" + value["_id"] + "/responses",
				dataType: 'json',
				type: "GET",
				success: function(data) {
					if (data.length != 0) {
						con.props.onResponseRevealed({id : data, phrase: con.props.prompts[index].text})
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

var MoreInfo = React.createClass({
	componentDidMount: function() {
		var con = this;
		var elem = $(React.findDOMNode(con));


		$(document).mousemove(function(e){
			var st = $(document).scrollTop();
			// should set a timer so this only appears after a certain amount of time
		    elem.css({position:"fixed", left:e.pageX, top:e.pageY - st});
		    if ($(e.target).data("type") == "prompt") {
		    	elem.removeClass("dontshow").addClass("show")
		    }
		});
	},

	render: function() {
		pieces = []

		var match;

		if (this.props.list) {
			var item = this.props.list[0];
			if (this.props.prompts) {
				this.props.prompts.forEach(function(val) {
					if (val["_id"] == item) {
						match = val;
						return
					}
				})				
			}
		}

		// var match;
		// var con = this;
		// if (this.props.list) {
		// 	console.log(con.props.prompts)
		// 	if (con.props.prompts) {
		// 		var item = this.props.list[0];
		// 		console.log(item);

		// 		con.props.prompts.each(function(val) {
		// 			if (val["_id"] == item) {
		// 				match = val;
		// 				return
		// 			}

		// 		})


		// 	}
		// }

		// if (this.props.prompts) {
		// 	this.props.prompts.forEach(function(val) {
		// 		var elem = <div>Reader asked: <span style={{fontWeight:"bold"}}>{val.kind}</span></div>
		// 		pieces.push(elem)
		// 	})
		// }

		var elem; 

		if (match) {
			elem = <div style={{fontStyle: "italic"}}>Reader asked: <span style={{fontWeight:"bold"}}>{match["kind"]}</span></div>
		}
		pieces.push(elem)

		return (
			<div className="moreinfo show" style={{backgroundColor: "#e9e9e9", marginTop: "30px", padding:"7px", borderRadius:"5", boxShadow: "3px 3px 1px #7e7e7e"}}>{pieces}</div>
		)
	}
})


$(document).ready(function() {
	$(document).on("mouseenter", ".panelParent", function() {
		$(".baller").removeClass("baller");
		$(".baller-border-left").removeClass("baller-border-left");
		$(".baller-border-right").removeClass("baller-border-right");
		$(".moreinfo").removeClass("show").addClass("dontshow")
	});

});


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
