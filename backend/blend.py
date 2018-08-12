import sys
import json
# import matplotlib.pyplot as plt
# from sklearn.cluster import AgglomerativeClustering
# import numpy as np
from scipy.cluster.hierarchy import dendrogram, linkage
from matplotlib import pyplot as plt


json_string = sys.argv[1]
# with open('./three_users.txt') as infile:
#     json_string = infile.read().strip("'\n")

song_list = json.loads(json_string)

tracks_uri = []

tracks = []
for user in song_list:
    for song in user['songs']:
        tracks.append([
            song['danceability'],
            song['energy'],
            # song['key'],
            song['loudness'],
            song['mode'],
            song['speechiness'],
            song['acousticness'],
            song['instrumentalness'],
            song['liveness'],
            song['valence'],  # how positive the mood is
            song['tempo']])
        tracks_uri.append(song['uri'])


Z = linkage(tracks, 'single')
cluster_list = []
for i in range(len(tracks)-1):
    if Z[i, 3] >= (len(song_list)*10):
        cluster_list.append(int(Z[i, 0]))
        cluster_list.append(int(Z[i, 1]))
        break


# fig = plt.figure(figsize=(15, 5))
# dn = dendrogram(Z, labels=tracks_uri)
# plt.show()

for cluster in cluster_list:
    if cluster >= len(tracks):
        prev_cluster = cluster % len(tracks)
        cluster_list.append(int(Z[prev_cluster, 0]))
        cluster_list.append(int(Z[prev_cluster, 1]))

final_tracks =
    [tracks_uri[cluster] for cluster in cluster_list if cluster < len(tracks)]
# remove dups
final_tracks_no_dups = list(dict.fromkeys(final_tracks))
print(json.dumps(final_tracks_no_dups))
