defmodule Fog.Data.FeatureOptionQuery do
  defmacro __using__(defaults) do
    quote do
      import Ecto.Query
      alias Fog.Data

      defmacro user_field([t | ts], f, val) do
        quote do
          coalesce(
            field(unquote(t), unquote(f)),
            user_field(unquote(ts), unquote(f), unquote(val))
          )
        end
      end

      defmacro user_field([], f, val) do
        quote do
          unquote(val)
        end
      end

      defmacro feature_option_fields(ts) do
        {:%{}, [],
         for {f, v} <- unquote(defaults) do
           {f,
            quote do
              user_field(unquote(ts), unquote(f), unquote(v))
            end}
         end}
      end

      def for_user() do
        from(u in Data.User,
          join: w in assoc(u, :workspace),
          left_join: vo in Data.FeatureOption,
          on: vo.vendor_id == w.vendor_id,
          left_join: wo in Data.FeatureOption,
          on: wo.workspace_id == w.id,
          left_join: uo in Data.FeatureOption,
          on: uo.user_id == u.id,
          left_join: vg in Data.FeatureOption,
          on: vg.vendor_id == ^Data.FeatureOption.global_vendor_id(),
          left_join: ug in Data.FeatureOption,
          on: ug.user_id == ^Data.FeatureOption.global_user_id(),
          select: %Data.FeatureOption{
            vendor_id: w.vendor_id,
            workspace_id: w.id,
            user_id: u.id
          },
          select_merge: feature_option_fields([uo, wo, vo, ug, vg])
        )
        |> subquery()
      end

      def for_vendor_agent() do
        from(a in Data.Agent,
          join: vr in assoc(a, :vendors),
          join: v in assoc(vr, :vendor),
          join: w in assoc(v, :workspaces),
          left_join: vo in Data.FeatureOption,
          on: vo.vendor_id == v.id,
          left_join: wo in Data.FeatureOption,
          on: wo.workspace_id == w.id,
          left_join: ao in Data.FeatureOption,
          on: ao.agent_id == a.id,
          left_join: vg in Data.FeatureOption,
          on: vg.vendor_id == ^Data.FeatureOption.global_vendor_id(),
          left_join: ag in Data.FeatureOption,
          on: ag.agent_id == ^Data.FeatureOption.global_agent_id(),
          select: %Data.FeatureOption{
            vendor_id: v.id,
            workspace_id: w.id,
            agent_id: a.id
          },
          select_merge: feature_option_fields([ao, wo, vo, ag, vg])
        )
        |> subquery()
      end

      def for_vendor() do
        from(v in Data.Vendor,
          left_join: vo in Data.FeatureOption,
          on: vo.vendor_id == v.id,
          left_join: vg in Data.FeatureOption,
          on: vg.vendor_id == ^Data.FeatureOption.global_vendor_id(),
          select: %Data.FeatureOption{
            vendor_id: v.id
          },
          select_merge: feature_option_fields([vo, vg])
        )
        |> subquery()
      end

      def for_workspace() do
        from(w in Data.Workspace,
          left_join: vo in Data.FeatureOption,
          on: vo.vendor_id == w.vendor_id,
          left_join: wo in Data.FeatureOption,
          on: wo.workspace_id == w.id,
          left_join: vg in Data.FeatureOption,
          on: vg.vendor_id == ^Data.FeatureOption.global_vendor_id(),
          select: %Data.FeatureOption{
            workspace_id: w.id
          },
          select_merge: feature_option_fields([wo, vo, vg])
        )
        |> subquery()
      end
    end
  end
end
