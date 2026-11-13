# Rumi

A home for your movies and games. Import a list of 300+ titles and browse it with search, filters, and details.

## Run locally

Open `index.html` in a modern browser. No build step or dependencies are required.

## Add your collection

Select **Import list** and choose a `.csv` or `.json` file. Import replaces the current list and saves it in that browser's local storage.

CSV files need `title` and `type` columns. Optional columns are `year`, `genre`, `description`, `cover`, and `url`. For example:

```csv
title,type,year,genre,description,cover,url
Example Movie,movie,2024,Drama,A short description,,https://example.com
Example Game,game,2023,Adventure,A short description,,https://example.com
```

JSON can be an array of title objects or an object with an `items` array. Use `movie` or `game` as the type. Links and cover images must use `http://` or `https://`.
