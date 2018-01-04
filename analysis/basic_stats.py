import pandas as pd
import numpy as np

df = pd.read_csv('./dataset/2013-01-Blitz-ratings.csv')

df_grouped = df.groupby('Player')

print(df_grouped['Elo'].agg(np.size))

