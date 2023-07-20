defmodule Fog.Repo.Migrations.AddSnowflakeIdGeneratorFun do
  use Ecto.Migration

  def change do
    execute(
      "CREATE SEQUENCE snowflake_id_seq",
      "DROP SEQUENCE snowflake_id_seq"
    )

    execute(
      """
      CREATE OR REPLACE FUNCTION snowflake_id(machine_id int)
      RETURNS bigint
      LANGUAGE 'plpgsql'
      AS $BODY$
      DECLARE
      our_epoch bigint := 1577836800000;
      seq_id bigint;
      now_millis bigint;
      result bigint:= 0;
      BEGIN
      SELECT nextval('snowflake_id_seq') % 4096 INTO seq_id;

      SELECT FLOOR(EXTRACT(EPOCH FROM clock_timestamp()) * 1000) INTO now_millis;
      result := (now_millis - our_epoch) << 22;
      result := result | (machine_id << 12);
      result := result | (seq_id);
      return result;
      END;
      $BODY$;
      """,
      "DROP FUNCTION snowflake_id"
    )
  end
end
