import sys
import json
# import matplotlib.pyplot as plt
# from sklearn.cluster import AgglomerativeClustering
# import numpy as np
from scipy.cluster.hierarchy import dendrogram, linkage
# from matplotlib import pyplot as plt


json_string = sys.argv[1]
# with open('./two_users.txt') as infile:
#     json_string = infile.read().strip("'\n")

song_list = json.loads(json_string)

tracks_uri = []

tracks = []
for user in song_list:
    for song in user['songs']:
        tracks.append([
            song['danceability'],
            song['energy']])
            # song['key'],
            # song['loudness'],
            # song['mode']])
            # song['speechiness'],
            # song['acousticness'],
            # song['instrumentalness'],
            # song['liveness'],
            # song['valence']])  # how positive the mood is
            # song['tempo']])
        tracks_uri.append(song['uri'])



Z = linkage(tracks, 'average')
cluster_list = []
for i in range(len(tracks)-1):
    if Z[i, 3] >= (len(song_list)*10):
        cluster_list.append(int(Z[i, 0]))
        cluster_list.append(int(Z[i, 1]))
        break


# closest_clusters = []
# midpoint = len(tracks) // len(song_list)
# for i in range(len(tracks)-1):
#     if Z[i, 0] < len(tracks) and Z[i, 1] < len(tracks):
#         if Z[i, 0] < midpoint:
#             if Z[i, 1] >= midpoint:
#                 closest_clusters.append(Z[i])
#         else:
#             if Z[i, 1] < midpoint:
#                 closest_clusters.append(Z[i])

# total_size = 0
# for c in closest_clusters:
#     print(c)
#     total_size += c[3]
#     print(total_size)

# final_uris = []
# for c in closest_clusters:
#     final_uris.append(tracks_uri[int(c[0])])
#     final_uris.append(tracks_uri[int(c[1])])
#
# print(final_uris)

for cluster in cluster_list:
    if cluster >= len(tracks):
        prev_cluster = cluster % len(tracks)
        cluster_list.append(int(Z[prev_cluster, 0]))
        cluster_list.append(int(Z[prev_cluster, 1]))

final_tracks = [tracks_uri[c] for c in cluster_list if c < len(tracks)]
# remove dups
final_tracks_no_dups = list(dict.fromkeys(final_tracks))
print(json.dumps(final_tracks_no_dups))

# fig = plt.figure(figsize=(15, 5))
# dn = dendrogram(Z)#, labels=tracks_uri)
# plt.show()
