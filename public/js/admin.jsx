var AdminParent = React.createClass({
	getInitialState: function() {
		return {
			response: window.location.pathname.split("/admin/")[1],
			showWritingPanel: true,
		}
	},

	componentDidMount: function() {
		this.getResponse();
	},

	getResponse: function() {
		var con = this;
		$.ajax({
			url: "/slug/" + con.state.response,
			dataType: "json",
			type: "GET",
			success: function(data) {
				con.setState({response: data})
			}
		})
	},

	handleMouseEnter: function(e) {
		this.refs.text.setState({curThing: e.target})
	},

	render: function() {
		return (
			<div className="panelParent">
				<div id="header">
					<div>
						<a href="/admin">Membrane</a>
			            <LogOutButton/>
					</div>

				</div>
				<div id="admin-main" className="container-fluid">
					<div className="row">
						<div className="col-xs-12">
							<span className="admin-title">Your article</span>
							<ResponseParent ref="text" initialResponse={this.state.response}/>
						</div>
					</div>
				</div>
				<Modal />
			</div>
		)


// 						<div className="col-xs-5">
// 							<AuthorWorkParent handleMouseEnter={this.handleMouseEnter} slug={window.location.pathname.split("/admin/")[1]}/>
// 						</div>


		// return (
		// 	<div className="panelParent">
		// 		<div id="header">
		// 			<div>
		// 				<a href="/admin">Membrane</a>
		// 				<div className="logout"><button onClick={this.logout}>logout</button></div>
		// 			</div>

		// 		</div>
		// 		<div id="admin-main" className="container-fluid">
		// 			<div className="row">
		// 				<div className="col-xs-7">
		// 					<span className="admin-title">Your article</span>
		// 					<ResponseParent initialResponse={this.state.response}/>
		// 				</div>

		// 				<div className="col-xs-5">
		// 					<AuthorWorkParent slug={window.location.pathname.split("/admin/")[1]}/>
		// 				</div>
		// 			</div>
		// 		</div>
		// 	</div>
		// )





	}

})


var AuthorWorkParent = React.createClass({
	getInitialState: function() {
		return {
			elementList: ["prompts"],
			answerMode: null,
			allPrompts: null,
			responseId: null,
			selectedPrompt: null,
			authorText: null,
			otherPrompts: null,
			slug: null
		}
	},

	componentDidMount: function() {
		var con = this;
		$.ajax({
			url: "/slug/" + this.props.slug,
			dataType: "json",
			type: "GET",
			success: function(data) {

				$.ajax({
					url: "/responses/" + data["_id"] + "/prompts",
					dataType: "json",
					type: "GET",
					success: function(result) {

						// console.log(result)

						var onlyVisible = [];
						result.forEach(function(val) {
							if (val["isHidden"] == false) {
								onlyVisible.push(val)
							}
						})

						con.setState({responseId: data["_id"], allPrompts: onlyVisible, slug: data["slug"]})
					}
				})
			}
		})
	},

	handleBackClick: function() {
		console.log(this.state.elementList)

		var l = this.state.elementList;
		var last = l.pop();

		if (last == "writing") {
			this.setState({
				elementList: l,
				authorText: null,
				otherPrompts: null
			})
		} else if (last == "moreprompts") {
			this.setState({
				elementList: l,
				otherPrompts: null
			})
		} else if (last == "choice") {
			this.setState({
				elementList: l,
				selectedPrompt: null
			})
		}
	},

	handleChoiceClick: function(event) {
		var id = $(event.target).attr('id');
		var l = this.state.elementList;

		if (id == "new-answer") {
			l.push("writing");

			this.setState({
				elementList: l,
				answerMode: "new"
			})
		} else if (id == "old-answer") {
			l.push("chooseanswer");

			this.setState({
				elementList: l,
				answerMode: "old"
			})
		}
	},

	handlePromptClick: function(event) {
		var l = this.state.elementList;
		l.push("choice")

		this.setState({elementList: l,
			selectedPrompt: {
				id: $(event.target).attr("id"),
				kind: $(event.target).data("kind"),
				text: $(event.target).data("text"),
				user: $(event.target).data("userid"),
				slug: $(event.target).data("slug")
			}
		})
	},

	handleTextClick: function(event) {
		var l = this.state.elementList;
		l.push("moreprompts")
		
		//woof
		var text = $(event.target).prev().val()

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

		this.setState({elementList: l,
			authorText: text,
			// links: linkInfo
		})
	},

	handleAdditionalPromptsClick: function() {
		var p = [];
		var con = this;
		$("input[type=checkbox]:checked").each(function() {
			p.push({
				user: $(this).data("userid"),
				prompt: $(this).attr("id"),
				kind: $(this).data("kind"),
				text: $(this).data("text"),
				slug: con.state.slug,
			})
		})

		var con = this;


		if (this.state.answerMode == "old") {
			this.submitOldAnswer(p)
		} else if (this.state.answerMode == "new") {
			this.submitNewAnswer(p);
		}

	},

	submitOldAnswer: function(p) {
		var ajaxCall1 = this.postToOldAnswerEndpoint(p)
		var ajaxCall2 = this.postToAnchorEndpoint(this, p);
		var ajaxCall3 = this.postToNotificationsEndpoint(this);

		$.when(ajaxCall1, ajaxCall2, ajaxCall3).done(function() {
			$(".modal").modal();
			// window.location.reload()
			// window.location = window.location.protocol + "//"+ window.location.host + "/admin"
		})

	},

	submitNewAnswer: function(p) {
		var con = this;
		this.postToResponsesEndpoint(p).done(function(info) {
			var newSlug = info["slug"]

			var ajaxCall2 = con.postToAnchorEndpoint(con, p);
			var ajaxCall3 = con.postToNotificationsEndpoint(con, p, newSlug);

			$.when(ajaxCall2, ajaxCall3).done(function() {
				$(".modal").modal();
				// window.location.reload()
				// window.location = window.location.protocol + "//"+ window.location.host + "/admin"
			})

			
		})


	},

	handleOldAnswerClick: function(event) {
		var l = this.state.elementList;
		l.push("moreprompts")

		this.setState({
			authorText: $(event.target).data("authortext"),
			elementList: l,
			slug: $(event.target).data("slug")
		});
	},

	postToResponsesEndpoint: function(otherPrompts) {
		var con = this;
		var parents = [];
		parents.push(this.state.selectedPrompt.id);

		otherPrompts.forEach(function(val) {
			parents.push(val["prompt"])
		});
		
		console.log(this.state)

		var data = {
		 	//slug: con.state.slug, // don't post a slug and one will be made for you
			text: this.state.authorText,
			parent: parents,
			links: this.state.links
		}

		return $.ajax({
			url: "/responses",
			dataType: "json",
			type: "POST",
			data: JSON.stringify(data)
		})
	},

	postToAnchorEndpoint: function(con) {
		return $.ajax({
			url: "/prompts/" + con.state.selectedPrompt.id,
			dataType: "json",
			type: "POST",
			data: JSON.stringify({"isAnchor": true})
		})
	},

	postToNotificationsEndpoint: function(con, otherPrompts, altSlug) {
		var notifs = [];

		var curSlug = (altSlug == undefined) ? con.state.slug : altSlug

		notifs.push({
			prompt: con.state.selectedPrompt.id,
			userId: con.state.selectedPrompt.user,
			text: con.state.authorText,
			kind: con.state.selectedPrompt.kind,
			slug: curSlug,
			author: getCookie("membraneAuthor")
		})

		$("input[type=checkbox]:checked").each(function() {
			notifs.push({
				prompt: $(this).attr("id"),
				userId: $(this).data("userid"),
				text: con.state.authorText,
				kind: $(this).data("kind"),
				slug: curSlug,
				author: getCookie("membraneAuthor")
			})
		})

		return $.ajax({
			url: "/notifications",
			dataType: "json",
			type: "POST",
			data: JSON.stringify(notifs),
			error: function(jqXHR, textStatus, errorThrown) {
				console.log(data.error);
			}
		})		
	},

	postToOldAnswerEndpoint: function(p) {
		var con = this;
		var parents = [];
		parents.push(this.state.selectedPrompt.id);

		p.forEach(function(val) {
			parents.push(val["prompt"])
		});

		var data = {
			parent: parents
		}

		$.ajax({
			url: "/slug/" + con.state.slug,
			dataType: "json",
			type: "PUT",
			data: JSON.stringify(data),
			success: function() {

			}
		})
	},

	handlePromptDelete: function(event) {

		var data = {
			"isHidden" : true
		}

		$.ajax({
			url: "/prompts/" + $(event.target).data("id"),
			dataType: "json",
			type: "POST",
			data: JSON.stringify(data),
			success: function() {
				window.location.reload(true);
			}
		})
	},

	render: function() {
		var elem;

		console.log(this.state.elementList)

		if (this.state.elementList[this.state.elementList.length - 1] == "prompts") {
			elem = <PromptsPanel handlePromptClick={this.handlePromptClick} handlePromptDelete={this.handlePromptDelete} allPrompts={this.state.allPrompts} handleMouseEnter={this.props.handleMouseEnter}/>
		} else if (this.state.elementList[this.state.elementList.length - 1] == "choice") {
			elem = <ChoicePanel handleChoiceClick={this.handleChoiceClick} promptInfo={this.state.selectedPrompt}/>
		} else if (this.state.elementList[this.state.elementList.length - 1] == "writing") {
			elem = <TextPanel handleTextClick={this.handleTextClick} promptInfo={this.state.selectedPrompt}/>
		} else if (this.state.elementList[this.state.elementList.length - 1] == "chooseanswer") {
			elem = <OldAnswerPanel handleOldAnswerClick={this.handleOldAnswerClick}/>
		} else if (this.state.elementList[this.state.elementList.length - 1] == "moreprompts") {
			var p = cloneObject(this.state.allPrompts);
			var con = this;
			p.forEach(function(val, index) {
				if (val["_id"] == con.state.selectedPrompt.id) {
					p.splice(index, 1);
				}
			})

			elem = <AdditionalPromptPanel handleAdditionalPromptsClick={this.handleAdditionalPromptsClick} prompts={p}/>
		}

		var backstate;
		if (this.state.elementList[this.state.elementList.length - 1] == "prompts" || this.state.elementList[this.state.elementList.length - 1] == "finished") {
			backstate = "invisible";
		} else {
			backstate = "visible";
		}

		return (
			<div>
			{elem}
			<a id="back" className={backstate} href="#" onClick={this.handleBackClick}>Back</a>
			</div>
		)
	}
});

var AdditionalPromptPanel = React.createClass({
	render: function() {
		var prompts = [];
		var con = this;
		this.props.prompts.forEach(function(sig) {
			if (sig.answers != "answered") {
				prompts.push(
					<Prompt ref={sig.answers} sig={sig} handlePromptClick={con.props.handlePromptClick} curState="additionalPrompts" buttonText="Mark as answered"/>
				)
			}
			
		});

		return (
			<div>
				<h1>Answer other questions</h1>
				<p>If your response answers any other unanswered questions, select them here. The users who asked these questions will be notified that their question has been answered.</p>
				<div>
					<table id="results-table" className="table table-striped list-group">
					<tbody className="searchable">
					{prompts}
					</tbody>
					</table>
				</div>
				<button onClick={this.props.handleAdditionalPromptsClick} className="btn btn-default">Finish</button>
			</div>
		)
	}
})

var PromptsPanel = React.createClass({
	getInitialState: function() {
		return {
			slug: this.props.slug,
			id: null,
			showAllPrompts: false,
			allPrompts: null,
		}
	},

	componentDidMount: function() {
		// $('input.filter').on('keyup', function() {
	 //    var rex = new RegExp($(this).val(), 'i');
	 //    $('.searchable tr').hide();
	 //        $('.searchable tr').filter(function() {
	 //            return rex.test($(this).text());
	 //        }).show();
	 //    });
		// this.getAnsweredStatus(this.props.allPrompts)
	},

	getAnsweredStatus: function(result) {
		var con = this;
		if (result == null) return;

		var aP = [];

		result.forEach(function(sig, val) {
			$.ajax({
				url: "/prompts/" + sig["_id"] + "/responses",
				dataType: "json",
				type: "GET",
				success: function(data) {
					console.log(data)
					if (data.length != 0) {
						result[val].answers = "answered";
					}
					con.setState({allPrompts: result})
				}
			})
		})
	},

	togglePrompts: function(arg) {
		this.setState({showAllPrompts: arg});
	},

	render: function() {
		var con = this;
		var prompts = []

		if (this.state.allPrompts == null) {
			this.getAnsweredStatus(this.props.allPrompts)		
		}
		
		if (this.state.allPrompts) {
			this.state.allPrompts.forEach(function(sig) {
				if (con.state.showAllPrompts == true || sig.answers != "answered") {
					prompts.push(
						<Prompt ref={sig.answers} sig={sig} handleMouseEnter={con.props.handleMouseEnter} handlePromptClick={con.props.handlePromptClick} handlePromptDelete={con.props.handlePromptDelete} curState="firstPrompt" buttonText="Answer this question"/>
					)
				}
				
			});
		}

		return (
			<div id="promptsPanel">
				<div className="form-group">
					<div className="table-top">
					<div>
						<span className="admin-title">Reader responses</span>
						<div id="admin-toggle">
							<div className="btn-group" data-toggle="buttons">
							  <label className={'btn btn-primary ' + (this.state.showAllPrompts ? 'inactive' : 'active')} onClick={this.togglePrompts.bind(null,false)}>
							    <input type="checkbox" /> Unanswered 
							  </label>
							  <label className={'btn btn-primary ' + (this.state.showAllPrompts ? 'active' : 'inactive')} onClick={this.togglePrompts.bind(null,true)}>
							    <input type="checkbox" /> All
							  </label>
							</div>
						</div>
					</div>
						<br className="clear" />
					</div>

					<div style={{overflowY: "scroll", maxHeight: "700px"}}>
						<table id="results-table" className="table table-striped list-group">
						<tbody className="searchable">
						{prompts}
						</tbody>
						</table>
					</div>
				</div>
			</div>
		)
	},
})

var Prompt = React.createClass({
	componentDidMount: function() {
		// var con = this;
		// $(React.findDOMNode(this)).mouseenter(function() {
		// 	var re = new RegExp(con.props.sig.text, "g")
		// 	$("#responseParent").blast({
		// 		delimiter: re,
		// 		tag: "span",
		// 		customClass: "highlighted-admin"
		// 	})
		// })

		// $(React.findDOMNode(this)).mouseleave(function() {
		// 	$("#responseParent").blast(false)
		// })
	},

	render: function() {
		var elem;
		var del;
		
		if (this.props.curState == "firstPrompt") {
			elem = <button className="btn btn-default" data-text={this.props.sig.text} data-userid={this.props.sig.user} data-kind={this.props.sig.kind} id={this.props.sig["_id"]} onClick={this.props.handlePromptClick} >{this.props.buttonText}</button>
			del = <button data-id={this.props.sig["_id"]} onClick={this.props.handlePromptDelete}>Delete</button>
		} else if (this.props.curState == "additionalPrompts") {
			elem = <input type="checkbox" data-text={this.props.sig.text} data-kind={this.props.sig.kind} data-userid={this.props.sig.user} id={this.props.sig["_id"]} value={this.props.sig["_id"]}/>
		}

		return (
			<tr onMouseEnter={this.props.handleMouseEnter}>
				<td className="sig-type" data-paragraph={this.props.sig.paragraph} data-text={this.props.sig.text} data-start={this.props.sig.numStart} data-end={this.props.sig.numEnd}>{this.props.sig.kind}</td>
				<td className="sig-text" data-paragraph={this.props.sig.paragraph} data-text={this.props.sig.text}  data-start={this.props.sig.numStart} data-end={this.props.sig.numEnd}><span>{this.props.sig.text}</span></td>
				<td data-start={this.props.sig.numStart} data-text={this.props.sig.text} data-paragraph={this.props.sig.paragraph} data-end={this.props.sig.numEnd}>{elem}</td>
				<td data-start={this.props.sig.numStart} data-text={this.props.sig.text} data-paragraph={this.props.sig.paragraph} data-end={this.props.sig.numEnd}>{del}</td>
			</tr>
		)
	}
})

// var TextPanel = React.createClass({
// 	validate: function() {
// 		// We're going to need to add some sort of catch for illegal characters... once we remember what they are \:D/
// 	},

// 	render: function() {
// 		return (
// 		<div>
// 			<h1>Write your reply</h1>
// 				Reply to <b>{this.props.promptInfo.kind}</b> question about <b>{this.props.promptInfo.text}</b>
// 			    <span className="missing" id="missing-text">Missing text</span>
// 			    <textarea type="textarea" rows="6" className="form-control" ref="text" id="slug" placeholder="your text"/>
// 			    <button className="btn btn-default" onClick={this.props.handleTextClick}>Continue</button>
// 		</div>
// 		)
// 	}
// });

var ChoicePanel = React.createClass({
	render: function() {
		return (
			<div>
				<button id="new-answer" onClick={this.props.handleChoiceClick}>Give a new answer</button>
				<button id="old-answer" onClick={this.props.handleChoiceClick}>Reuse an old answer</button>
			</div>
		)
	}
})

var OldAnswerPanel = React.createClass({
	getInitialState: function() {
		return {
			allAnswers: null,
		}
	},

	componentDidMount: function() {
		var con = this;
		$.ajax({
			url: "/authors",
			dataType: "json",
			type: "POST",
			success: function(data) {
				console.log(data)
				con.setState({allAnswers: data})			
			}
		})
	},

	render: function() {
		var oldAnswers = [];
		var con = this;

		if (this.state.allAnswers) {
			this.state.allAnswers.forEach(function(val) {
				oldAnswers.push(<OldAnswer handleOldAnswerClick={con.props.handleOldAnswerClick} answer={val}/>)
			})
		}

		return (
			<div>
				<h2>Choose a previously-written answer.</h2>
				<table className="table table-striped list-group">
					<tbody>
						{oldAnswers}						
					</tbody>
				</table>
			</div>
		)
	}
})

var OldAnswer = React.createClass({
	render: function() {
		return (
			<tr>
				<td>{this.props.answer.text}</td>
				<td><button data-authortext={this.props.answer.text} data-slug={this.props.answer.slug} onClick={this.props.handleOldAnswerClick}>Use this answer</button></td>
			</tr>
		)
	}
});

var Modal = React.createClass({
	handleClick: function() {
		window.location.reload()
	},

	render: function() {
		return ( 
			<div className="modal fade" id="myModal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
			  <div className="modal-dialog" role="document">
			    <div className="modal-content">
			      <div className="modal-header">
			        <button type="button" className="close" data-dismiss="modal" aria-label="Close" onClick={this.handleClick}><span aria-hidden="true">&times;</span></button>
			        <h4 className="modal-title" id="myModalLabel">Success</h4>
			      </div>
			      <div className="modal-body">
			        You have successfully submitted your reply. Woohoo!
			      </div>
			      <div className="modal-footer">
			        <button type="button" className="btn btn-primary" onClick={this.handleClick}>Done</button>
			      </div>
			    </div>
			  </div>
			</div>
		)
	}

})

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
	<AdminParent/>, document.getElementById("content")
)
