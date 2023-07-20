```
.
├── public                                        # All images, html files
├── src                                           # Main folder
│   ├── ui                                        # Common components folder
│   ├── environment                               # Environment config files (env variables or smth)
│   ├── layouts                                   # Main layouts (wrappers for Containers)
│   ├── hooks                                     # common hooks (hooks that are related for the entire app or 2+ features)
│   ├── types                                     # common types
│   ├── features                                  # folder for all main features with `EVERYTHING` they need inside
│         ├── analytics                           # folder with name that represents for the feature is about
│                ├── ui                           # all components that are used only for this feature
│                ├── pages                        # all pages for the feature that renders containers
│                ├── hooks                        # all hooks for the feature
│                ├── utils                        # all utils for the feature
│                ├── store.ts                     # all stores related for the features (jotai atoms, context providers)
│                ├── routes.ts                    # exports all routes related to feature
│                ├── types.ts                     # all types related to feature
│   ├── store                                     # all store related files (jotai atoms, context providers)
│   ├── utils                                     # common utils functions (functions related for the entire app or 2+ features)
│   ├── router                                    # folder for all routes
│         ├── index.tsx                           # renders ReactRouter + Switch for all routes (Guest/Protected routes)
│         ├── routes.ts                           # exports all routes paths
│  App.tsx                                        # file for application (root container with all needed wrappers, providers)
│  index.tsx                                      # root file for application (renders `App.tsx`)
└── ...
```
