var LogOutButton = React.createClass({

    logout: function() {
        $.ajax({
            url: "/logout",
            type: "POST",
            statusCode: {
                200: function() {
                    window.location.replace("/loggedOut")
                }
            }
        })
    },

    render: function() {
      return (
        <div className="logout"><a href="#" onClick={this.logout}>Log out</a></div>
      )
    }

})

var DeleteButton = React.createClass({

  propTypes: {
    slug: React.PropTypes.string.isRequired
  },


  deletePost: function(){
    $.ajax({
      url: "/responses/"+this.props.slug,
      type: "DELETE",
      statusCode : {
        200: function(){
          window.location.reload()
        },
      }
    })
  },

  render: function() {
      return (
        <div className="logout"><button onClick={this.deletePost}>delete</button></div>
      )
  }
})
