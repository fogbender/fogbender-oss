create schema export;

create table export.vendor as (
  select * from public.vendor
  where id = :vendor_id
);

create table export.vendor_agent_role as (
  select * from public.vendor_agent_role
  where vendor_id in (select id from export.vendor)
);

create table export.agent as (
  select * from public.agent
  where id in (select agent_id from export.vendor_agent_role)
);
