# Pinned test fonts

These test-only files pin DM Sans, IBM Plex Mono and Newsreader (the three families used in the MRG CSS). `google.css` and `resources.json` retain the original Google Fonts URLs and weight declarations. The browser suite fulfills font requests from these files and checks font loading before capturing; it does not silently fall back to system fonts.

Sources: https://fonts.google.com/specimen/DM+Sans, https://fonts.google.com/specimen/IBM+Plex+Mono, https://fonts.google.com/specimen/Newsreader. These families are distributed under the SIL Open Font License; see the adjacent license files. The files are excluded from deployment. Refreshing fonts intentionally requires new visual review and baseline approval.
