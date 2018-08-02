import React, { Component } from 'react';
import './App.css';
import SpotifyWebApi from 'spotify-web-api-js';
import queryString from 'query-string';
import PropTypes from 'prop-types';

const spotifyApi = new SpotifyWebApi();

class LoginButton extends Component {
  handleClick() {
      console.log('User logging in...');
      window.location = 'http://localhost:3001/login'
  }

  render() {
    return (
      <button className="loginButton" onClick={() => this.handleClick()}>
        Login with Spotify
      </button>
    );
  }
}

class SpotifyPlayer extends Component {
  render() {
    return (
      <iframe
        title="Spotify"
        className="SpotifyPlayer"
        src={`https://embed.spotify.com/?uri=${this.props.uri}`}
        width='300'
        height='380'
        frameBorder='0'
        allowtransparency='true'
        allow='encrypted-media'
      />
    );
  }
}

SpotifyPlayer.propTypes = {
  uri: PropTypes.string.isRequired,
}


class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loggedIn : false,
      user_data : {},
      access_token : '',
      refresh_token : '',
      other_user : '',
      all_users : [],
      ready : false,
      playlist_uri : 'spotify:user:spotify:playlist:37i9dQZF1E9HuBAP29LsBO'
    };
  }

  componentWillMount() {
    var parsed = queryString.parse(window.location.search);
    if (parsed.access_token) {
      this.setState({access_token : parsed.access_token});
      this.setState({refresh_token : parsed.refresh_token});
      this.setState({loggedIn : true});
      spotifyApi.setAccessToken(parsed.access_token);
      // get user info
      spotifyApi.getMe()
        .then((data) => {
          this.setState({user_data : data});
          this.setState({all_users : [data.email]});
        }, (err) => {
          console.error(err);
        });
    }
  }

  handleChange(event) {
    this.setState({other_user : event.target.value});
  }

  handleSubmit(event) {
    event.preventDefault();
    console.log('A name was submitted: ' + this.state.other_user);
    this.setState({all_users : this.state.all_users.concat(this.state.other_user)});
    this.setState({other_user : ''});
    event.target.reset();
    console.log(this.state.all_users);
  }

  handleBlendClick() {
      console.log('Blending users: ' + this.state.all_users);

      this.setState({ready : true});
  }

  render() {
    return (
      <div>
        {this.state.loggedIn ?
          // if logged in then render the main page
          <div className='mainPage'>
            <form onSubmit={(e) => this.handleSubmit(e)}>
              <input type="text" value={this.state.other_user} onChange={(e) => this.handleChange(e)} />
              <input type="submit" value="Add user to Blender" />
            </form>
            <h2>Users ready to be blended:</h2>
            <p className='display-linebreak'>{this.state.all_users.join('\n')}</p>
            <button className="loginButton" onClick={() => this.handleBlendClick()}>
              Blend!
            </button>

            {this.state.ready &&
              <div>
                <SpotifyPlayer uri={this.state.playlist_uri}/>
                <p>Playlist added to your library!</p>
              </div>
            }

          </div> :
          // if not logged in then render the welcome page
          <div className='welcomePage'>
            <h1>Welcome to Blender</h1>
            <h4>Find an overlap in music taste between a group of users by creating a "blended" playlist using Spotify!</h4>
            <LoginButton/>
          </div>
        }
      </div>
    );
  }
}

export default App;
