select
  v.name as vendor,
  a.name as agent,
  a.email,
  va.role
from
  vendor v, vendor_agent_role va, agent a
where
  va.vendor_id = v.id
  and va.agent_id = a.id
  and not a.is_bot
order by v.id;
