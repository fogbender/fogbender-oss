# Fogbender blog

### Get it

    git clone git@gitlab.com:fogbender/blog.git
    cd blog

### Start it on dev

    yarn && yarn start

Open http://localhost:3000/blog/

### Deploy preview

    # do once
    yarn global add netlify-cli
    netlify link --name fogbender-blog

    # do to deploy
    yarn build && netlify deploy

This command will provide you with a preview URL.

### Deploy prod

Just push to `main` or:

    yarn build && netlify deploy --prod

Check on https://fogbender.com/blog

## How to add images for a new blog post

Use jpg or png depending on which is smaller, use https://kraken.io/web-interface to optimize the image for better compression.

Make sure that file starts with `/assets/blog`

- coverImage - 1200x(~500)px (or twice for retina)
- socialImage - 1200x630px (will be resized down by twitter/facebook/linkedin)
- thumbnailImage - 78x78px (or 156x156px for retina)
