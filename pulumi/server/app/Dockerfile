#### https://hexdocs.pm/distillery/guides/working_with_docker.html

# The version of Alpine to use for the final image
# This should match the version of Alpine that the `nesachirou/elixir:1.10_erl22` image uses
ARG ALPINE_VERSION=3.11.3

FROM nesachirou/elixir:1.10_erl22 AS builder

ENV MIX_ENV=prod

# By convention, /opt is typically used for applications
WORKDIR /opt/app

# This step installs all the build tools we'll need
RUN apk update && \
    apk upgrade --no-cache && \
    apk add --no-cache \
    git \
    build-base && \
    mix local.rebar --force && \
    mix local.hex --force

# This copies our app source code into the build container
COPY ./fog .

# RUN mix do deps.get, deps.compile, compile

RUN \
    mkdir -p /opt/built && \
    elixir --version && \
    mix deps.get && \
    mix release && \
    cp -r _build/prod/rel/fog/ /opt/built

# From this line onwards, we're in a new image, which will be the image used in production
# FROM alpine:${ALPINE_VERSION}
FROM nesachirou/elixir:1.10_erl22

RUN apk update && \
    apk add --no-cache \
    bash \
    openssl-dev

ENV REPLACE_OS_VARS=true

WORKDIR /opt/app

COPY --from=builder /opt/built .

EXPOSE 8000

CMD trap 'exit' INT; /opt/app/fog/bin/fog-ctl migrate && /opt/app/fog/bin/fog start
