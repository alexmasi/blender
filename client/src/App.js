import React, { Component } from 'react';
import './App.css';
import SpotifyWebApi from 'spotify-web-api-js';
import queryString from 'query-string';
import PropTypes from 'prop-types';
import axios from 'axios';

const spotifyApi = new SpotifyWebApi();

class LoginButton extends Component {
  handleClick() {
      console.log('User logging in...');
      window.location = 'http://localhost:3001/api/login'
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
      all_user_names : [],
      all_users : [],
      song_list : [],
      ready : false,
      playlist_uri : '',
      playlist_id : ''
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
          // add cuurent user data to state
          this.setState({user_data : data});
          this.setState({all_user_names : [data.email]});
          this.setState({all_users : [{user: data.email, token: this.state.access_token}]});
          // check if current user is in database, if not add them
          axios.get(`/api/users/${data.email}`)
            .then((response) => {
              console.log(response);
              if (response.data.error) {
                console.log(`New user: ${data.email}`)
                axios.post('/api/users', {
                    userEmail: data.email,
                    refreshToken: parsed.refresh_token
                  })
                    .then((response) => {
                      console.log(`Added new user: ${data.email}`);
                      console.log(response);
                    })
                    .catch((error) => {
                      console.log(error);
                    });
              } else {
                console.log(`Existing user: ${data.email}`);
                console.log('Updating user refresh token in database...');
                axios.put(`/api/users/${data.email}`, {
                  refreshToken: parsed.refresh_token
                })
                  .then((response) => {
                    console.log(`Updated existing user: ${data.email}`);
                    console.log(response);
                  })
                  .catch((error) => {
                    console.log(error);
                  });
              }
            })
            .catch((error) => {
              console.log(error);
            });
        })
        .catch((err) => {
          console.error(err);
        });
    }
  }

  handleChange(event) {
    this.setState({other_user : event.target.value});
  }

  handleSubmit(event) {
    event.preventDefault();
    var name = this.state.other_user;
    console.log('A name was submitted: ' + name);
    if (!name) {
      console.log('Enter valid user email');
      alert('Enter valid user email');
    } else {
      // get user info from database
      axios.get(`/api/users/${name}`)
        .then((response) => {
          if (!response.data.error) {
            // user exists so get access token from refresh token
            console.log(`Returning ${name}'s refresh token`);
            var refresh_token = response.data.refreshToken;
            console.log(response);
            console.log(refresh_token);
            axios.get(`/api/refresh_token/${refresh_token}`)
              .then((response) => {
                // received access token so store it in state
                console.log(response);
                var token = response.data.access_token;
                console.log(`token is: ${token}`);
                this.setState({all_users : this.state.all_users.concat({user: name, token: token})});
                this.setState({all_user_names : this.state.all_user_names.concat(name)});
                console.log('Updated state!');
                console.log(this.state);
              })
              .catch((error) => {
                console.log(error);
              });
          } else {
            console.log(`${name} is not signed up for Blender, try another user`);
            alert(`${name} is not signed up for Blender, try another user`);
          }
        })
        .catch((error) => {
          console.log(error);
        });
    }
    // dont wait to clear other_user field and reset event target
    this.setState({other_user : ''});
    event.target.reset();
  }

  callPythonScript() {
    axios.post('/api/blend', {
        song_data: JSON.stringify(this.state.song_list)
      })
        .then((response) => {
          return spotifyApi.addTracksToPlaylist(this.state.user_data.id, this.state.playlist_id, response.data.uris[0])
        })
        .then(() => {
          this.setState({ready : true});
        })
        .catch((error) => {
          console.log(error);
        });
  }

  handleBlendClick() {
    console.log('Blending users: ' + this.state.all_user_names.join(', '));
    var users_processed = 0;
    this.state.all_users.forEach((entry) => {
      spotifyApi.setAccessToken(entry.token);
      // get top tracks
      spotifyApi.getMyTopTracks({limit: 20, time_range: 'medium_term'})
        .then((data) => {
          return data.items.map((t) => { return t.id; });
        })
        .then((trackIds) => {
          return spotifyApi.getAudioFeaturesForTracks(trackIds);
        })
        .then((tracksInfo) => {
          this.setState({
            song_list : this.state.song_list.concat({
              user: entry.user,
              songs: tracksInfo.audio_features
            })
          });
          spotifyApi.setAccessToken(this.state.access_token);
          return spotifyApi.createPlaylist(this.state.user_data.id, {
            name : `Blender - ${this.state.all_user_names.join(', ')} [Medium_term]`,
            description : 'Playlist created by Blender for Spotify'
          });
        })
        .then((playlist) => {
          this.setState({playlist_uri : playlist.uri});
          this.setState({playlist_id: playlist.id});
          if (++users_processed === this.state.all_users.length) {
            // call backend method to run python script
            this.callPythonScript();
          }
        })
        .catch((error) => {
          console.error(error);
        });
    });
    // after return create a new playlist and add all returned songs
    // update playlist_uri in state
  }



  handleRestartClick() {
    console.log('Emptying Blender and restarting...');
    // clear other users
    // TODO: refresh token first and then update
    this.setState({
      ready: false,
      other_user : '',
      all_user_names : [this.state.all_user_names[0]],
      all_users : [this.state.all_users[0]],
      song_list : []
    })
  }

  handleDeleteClick() {
    console.log('Removing current user from Blender and returning to login page...');
    // DELETE current user from database
    axios.delete(`/api/users/${this.state.user_data.email}`)
      .then((response) => {
        console.log(response.data.success);
      })
      .catch((error) => {
        console.log(error);
      });
    // reset state
    this.setState({
      loggedIn : false,
      user_data : {},
      access_token : '',
      refresh_token : '',
      other_user : '',
      all_user_names : [],
      all_users : [],
      song_list : [],
      ready : false,
    });
    // clear tokens from url
    window.location = 'http://localhost:3000';
  }

  render() {
    return (
      <div>
        {this.state.loggedIn ?
          // if logged in then render the main page
          <div className='mainPage'>
          <h1>Hello {this.state.user_data.display_name || this.state.user_data.id}, welcome to Blender!</h1>
          <p>Enter the email addresses of other Spotify users below. When you're ready press Blend! to make a fresh playlist of every users top tracks</p>
            <form onSubmit={(e) => this.handleSubmit(e)}>
              <input type="text" value={this.state.other_user} onChange={(e) => this.handleChange(e)} />
              <input type="submit" value="Add user to the blender!" />
            </form>
            <h2>Users ready to be blended:</h2>
            <p className='display-linebreak'>{this.state.all_user_names.join('\n')}</p>
            <button className="loginButton" onClick={() => this.handleBlendClick()}>
              Blend!
            </button>

            {this.state.ready &&
              <div>
                <SpotifyPlayer uri={this.state.playlist_uri}/>
                <p>Playlist added to your library!</p>
              </div>
            }
            <button className="loginButton" onClick={() => this.handleRestartClick()}>
              Restart
            </button>
            <button className="loginButton" onClick={() => this.handleDeleteClick()}>
              Delete my Blender account
            </button>

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
