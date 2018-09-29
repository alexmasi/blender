import sys
import json

try:
    # called from backend
    json_string = sys.argv[1]
except IndexError:
    # used for testing
    with open('./two_users.txt') as infile:
        json_string = infile.read().strip("'\n")


song_list = json.loads(json_string)

metric = {'dance': 1.0,
          'energy': 0.7,
          'valence': 0.05}

tracks = []
for user in song_list:
    # sort user['songs'] based on a metric calculated from danceability, energy, etc.
    for song in user['songs']:
        # create metric for each track
        song['metric'] = metric['dance'] * song['danceability'] + metric['energy'] * song['energy'] + metric['valence'] * song['valence']
        tracks.append(song)

tracks.sort(key=lambda x: x['metric'], reverse=True)

try:
    trim_tracks = tracks[:40]
except IndexError:
    trim_tracks = tracks

trim_tracks.sort(key=lambda x: x['tempo'])

final_tracks = []
for track in trim_tracks:
    final_tracks.append(track['uri'])

# remove dups
final_tracks_no_dups = list(dict.fromkeys(final_tracks))


print(json.dumps(final_tracks_no_dups))
