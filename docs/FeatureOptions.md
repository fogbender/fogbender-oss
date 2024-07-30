# Feature Options

## Overview

Feature options allow to flexible set and control different internal options in efficient manner.
They are simple keys with values set on different levels, every next level value overrides previous ones:

- 0. system default - every FO has default value that used if no other value set
- 1. global_vendor
- 2. global_agent/user (for user/agent options)
- 3. vendor
- 4. workspace
- 5. agent
- 6. helpdesk (for user options)
- 7. user

FOs represented as columns in `Fog.Data.FeatureOption` module.

## Get/set

FO controlled through `Fog.Repo.FeatureOption` module:

```
user = DataUser |> Repo.get("u1234")
Repo.FeatureOption.get(user)
```

This will load Data.FeatureOption structure for some user with all option columns filled accordingly to level values.
For agents we also need to provide `vendor` and `workspace` structs because agent could operate accross different vendors and workspaces:

```
Repo.FeatureOption.get(vendor, ws, agent)
```

Also it is possible to get default values that are set for vendor or workspace:

```
Repo.FeatureOption.get(vendor)
```

To set feature option use `Repo.FeatureOption.set/2`:

```
Repo.FeatureOption.set(agent, email_digest_enabled: true, email_digest_period: 100)
```

## Global defaults

It is possible to set global default values for all vendors/agents/users:

- `Repo.FeatureOption.vendor_defaults(option1: value, option2: value)` will set global values for all vendors
- `Repo.FeatureOption.agent_defaults(option1: value, option2: value)` will set global values for all agents
- `Repo.FeatureOption.user_defaults(option1: value, option2: value)` will set global values for all users

If option doesn't have global default it will use hardcoded default from Fog.Data.FeatureOption module.

## Access from queries

It is possible to use feature options actual values from queries.
`Fog.Data.FeatureOption` module exports several helper functions that return views for all entities of given type:

- `Data.FeatureOption.for_vendor()`
- `Data.FeatureOption.for_workspace()`
- `Data.FeatureOption.for_helpdesk()`
- `Data.FeatureOption.for_user()`
- `Data.FeatureOption.for_vendor_agent()` - it will join all accessible vendors/workspaces for agents

It is possible to use it as part of query:

```
from(fo in Data.FeatureOption.for_vendor(),
 join: v in assoc(fo, :vendor),
 where: fo.email_digest_enabled == true,
 select: %{id: v.id, name: v.name}) |> Repo.all()
```

Or as joined subquery:

```
from(a in Data.Agent,
join: fo in subquery(Data.FeatureOption.for_vendor_agent()),
on: fo.agent_id == a.id,
where: fo.email_digest_enabled == false) |> Repo.all()
```

## Adding new FeatureOptions

1. Add column to feature_option table with proper type
2. Add field to `Data.FeatureOption` module schema
3. Add proper default to `Data.FeatureOption` `@defaults` constant.
