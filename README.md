# blender
Find an overlap in music taste between a group of users by creating a "blended" playlist using Spotify!

Uses a frontend react.js app to communicate with a backend node.js application implementing an API. The API is used to communicate with the Mongo database and the Spotify Web API in order the fetch users top tracks from Spotify. Then a clustering algorithm is implemented in Python to return a playlist that is a blend of all users tastes.

Try online at https://spotify-blender.herokuapp.com/
