
with vars as( select
  current_date at time zone 'UTC' as date_cur,
  current_date at time zone 'UTC' - interval '7 days' as date_7d
)
select
  v.name,
  date(v.inserted_at) as created,
  agents.c as agents,
  ws.c as workspaces,
  wi.c as integrations,
  cs.c as customers,
  cu.c as users,
  cr.r_all as rooms,
  cr.r_int as int_rooms,
  cr.r_all - cr.r_int as cust_rooms,
  cr.r_cust_7d as cust_rooms_7d,
  cm.m_all as messages,
  cm.m_int as int_messages,
  cm.m_all - cm.m_int as cust_messages,
  cm.m_7d as messages_7d,
  date(cm.m_int_last) as int_last_msg,
  date(cm.m_cust_last) as cust_last_msg
from
  vendor v
  left outer join (select vendor_id, count(*) as c from vendor_agent_role group by vendor_id) agents on agents.vendor_id = v.id
  left outer join (select vendor_id, count(*) as c from workspace group by vendor_id) ws on ws.vendor_id = v.id
  left outer join (select vendor_id, count(*) as c from customer group by vendor_id) cs on cs.vendor_id = v.id
  left outer join (select vendor_id, count(*) as c from customer c, helpdesk h, public.user u where h.customer_id = c.id and u.helpdesk_id = h.id group by c.vendor_id) cu on cu.vendor_id = v.id
  left outer join (
    select
      vendor_id,
      sum(case when c.name like '$Cust_%' then 1 else 0 end) as r_int,
      count(*) as r_all,
      sum(case when c.name not like '$Cust_%' and r.inserted_at between vars.date_7d and vars.date_cur then 1 else 0 end) as r_cust_7d
    from customer c, helpdesk h, room r, vars
    where h.customer_id = c.id and r.helpdesk_id = h.id
    group by c.vendor_id) cr on cr.vendor_id = v.id
  left outer join (select
                    vendor_id,
                    sum(case when c.name like '$Cust_%' then 1 else 0 end) as m_int,
                    sum(case when m.inserted_at between vars.date_7d and vars.date_cur then 1 else 0 end) as m_7d,
                    count(*) as m_all,
                    max(case when c.name like '$Cust_%' then m.inserted_at end) as m_int_last,
                    max(case when c.name not like '$Cust_%' then m.inserted_at end) as m_cust_last
                   from customer c, helpdesk h, room r, message m, vars
                   where h.customer_id = c.id and r.helpdesk_id = h.id and m.room_id = r.id
                   group by c.vendor_id) cm on cm.vendor_id = v.id
  left outer join (select w.vendor_id, count(*) as c from workspace w, workspace_integration wi where wi.workspace_id = w.id group by w.vendor_id) as wi on wi.vendor_id = v.id
order by v.inserted_at desc;
