select
  a.name as agent,
  a.email,
  date(a.inserted_at) as inserted
from
  agent a
  left outer join vendor_agent_role r
  on r.agent_id = a.id
where
  not a.is_bot
  and not a.email like '%@fogbender.com'
  and r.agent_id is null
order by a.inserted_at desc;
