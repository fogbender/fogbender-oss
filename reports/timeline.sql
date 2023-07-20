-- Result format:
--
-- type, inserted_date, count, vendor_name, workspace_name
--
-- Types:
--
-- VENDOR
-- WORKSPACE
-- CUSTOMER
-- MESSAGE
-- AGENT
-- USER

with main as (
select 'VENDOR' as type, v.inserted_at as date, v.name as vendor, null as ws, null as cust
from vendor v
UNION ALL
select 'WORKSPACE', w.inserted_at, v.name, w.name, null
from workspace w, vendor v
where v.id = w.vendor_id
UNION ALL
select 'HELPDESK', h.inserted_at, v.name, w.name, case when c.name like '$Cust_Internal%' then 'INTERNAL' else 'CUSTOMER' end
from vendor v, workspace w, helpdesk h, customer c
where v.id = w.vendor_id and h.workspace_id = w.id  and c.id = h.customer_id
UNION ALL
select 'AGENT', av.inserted_at, v.name, null, null
from vendor_agent_role av, vendor v
where v.id = av.vendor_id
UNION ALL
select 'USER', u.inserted_at, v.name, w.name, null
from workspace w, vendor v, helpdesk h, public.user u
where v.id = w.vendor_id and h.workspace_id = w.id and h.id = u.helpdesk_id
UNION ALL
select
  case when m.from_user_id is null then 'AGENT MESSAGE' else 'USER MESSAGE' end,
  m.inserted_at,
  v.name,
  w.name,
  case when c.name like '$Cust_Internal%' then 'INTERNAL' else 'CUSTOMER' end
from vendor v, workspace w, helpdesk h, customer c, room r, message m
where v.id = w.vendor_id and h.workspace_id = w.id  and c.id = h.customer_id and r.helpdesk_id = h.id and m.room_id = r.id
)
select
  date_part('year', date) as year,
  date_part('month', date) as month,
  date_part('day', date) as day,
  date(date) as date,
  type,
  vendor,
  ws,
  cust,
  count(*) as count
from main
group by 1,2,3,4,5,6,7,8
