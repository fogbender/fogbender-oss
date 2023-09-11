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

create table export.workspace as (
  select * from public.workspace
  where vendor_id in (select id from export.vendor)
);

create table export.customer as (
  select * from public.customer
  where vendor_id in (select id from export.vendor)
);

create table export.helpdesk as (
  select * from public.helpdesk
  where customer_id in (select id from export.customer)
);

create table export.room as (
  select * from public.room
  where helpdesk_id in (select id from export.helpdesk)
);

create table export.user as (
  select * from public.user
  where helpdesk_id in (select id from export.helpdesk)
);

create table export.message as (
  select * from public.message
  where room_id in (select id from export.room)
);
