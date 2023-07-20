defmodule Fog.Repo.Fts do
  import Ecto.Query

  defmacro is_similar(exp, term) do
    quote do
      fragment("lower(?) =% lower(?)", unquote(exp), unquote(term))
    end
  end

  defmacro relevance(binds, exp, term) do
    quote do
      words = String.split(unquote(term), " ")

      full_word_order_dyn =
        Enum.reduce(words, dynamic(0), fn word, acc ->
          d =
            dynamic(
              unquote(binds),
              fragment(
                "case when ? ~* ('\\m' || ? || '\\M') then 1 else 0 end",
                unquote(exp),
                ^word
              )
            )

          dynamic(^acc + ^d)
        end)

      wild_word_order_dyn =
        Enum.reduce(words, dynamic(0), fn word, acc ->
          d =
            dynamic(
              unquote(binds),
              fragment("case when ? ~* ? then 1 else 0 end", unquote(exp), ^word)
            )

          dynamic(^acc + ^d)
        end)

      full_term =
        dynamic(
          unquote(binds),
          fragment(
            "case when ? ~* ('\\m' || ?|| '\\M') then 1 else 0 end",
            unquote(exp),
            ^unquote(term)
          )
        )

      wild_term =
        dynamic(
          unquote(binds),
          fragment("case when ? ~* ? then 1 else 0 end", unquote(exp), ^unquote(term))
        )

      dynamic(
        fragment(
          "(array[?,?,?,?])",
          ^full_term,
          ^wild_term,
          ^full_word_order_dyn,
          ^wild_word_order_dyn
        )
      )
    end
  end

  defmacro combine_relevance(rel_exp_list) do
    quote do
      [rel1, rel2, rel3, rel4] =
        for i <- 1..4 do
          for exp <- unquote(rel_exp_list), reduce: 0 do
            0 -> dynamic(fragment("(?)[?]", ^exp, ^i))
            acc -> dynamic(^acc + fragment("(?)[?]", ^exp, ^i))
          end
        end

      dynamic(
        fragment(
          "(array[?, ?, ?, ?])",
          ^rel1,
          ^rel2,
          ^rel3,
          ^rel4
        )
      )
    end
  end

  # Ecto treats macro without param (Fts.empty_relevance()) as field fetch,
  # so you need to import it first to use
  defmacro empty_relevance() do
    quote do
      fragment("(array[0,0,0,0])")
    end
  end
end
