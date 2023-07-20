CREATE OR REPLACE FUNCTION pg_temp.extract_number(str text)
  RETURNS text AS
$BODY$
DECLARE
  arr text[];
BEGIN
  arr := regexp_split_to_array(str, ':');
  IF array_length(arr, 1) < 4 THEN
    RETURN NULL;
  END IF;
  RETURN arr[4];
END;
$BODY$
LANGUAGE plpgsql;

create temp view v1 as
    select
    system_issue_id,
    customer_name,
    issue_name,
    open_ts,
    status,
    github_issues,
    array_agg((message_ts, author, message_text) order by message_ts asc)::varchar as messages
    from (
        select
        system_issue_id,
        customer_name,
        issue_name,
        open_ts,
        status,
        github_issues,
        case
            when m.from_agent_id is not null then concat(coalesce(m.from_name_override, a.name), ' (agent)')
            when m.from_user_id is not null then concat(coalesce(m.from_name_override, u.name), ' (user)')
        end as author,
        to_char(m.inserted_at, 'yyyy-mm-dd hh:mm:ss') as message_ts,
        m.text as message_text
        from (
            select
            r.id as system_issue_id,
            to_char(r.inserted_at, 'yyyy-mm-dd hh:mm:ss') as open_ts,
            r.name as issue_name,
            c.name as customer_name,
            coalesce(string_agg(
                case
                    when t.name = ':status:open' then 'open'
                    when t.name = ':status:closed' then 'closed'
                    else null
                end, ','), ''
            ) as status,
            coalesce(string_agg(
                case
                    when starts_with(t.name, ':github:') then pg_temp.extract_number(t.name)
                    else null
                end, ','), ''
            ) as github_issues
            from room r
            join helpdesk h
            on r.helpdesk_id=h.id
            join customer c
            on h.customer_id=c.id and not starts_with(c.name, '$Cust_Internal') and not starts_with(c.name, '$Cust_External') and h.workspace_id=372532806762369024
            /* on h.customer_id=c.id and not starts_with(c.name, '$Cust_Internal') and not starts_with(c.name, '$Cust_External') and h.workspace_id=430520463995703296 */
            join room_tag rt on r.id=rt.room_id
            join tag t on t.id=rt.tag_id
            and (starts_with(t.name, ':status') or starts_with(t.name, ':github:'))
            join message m on m.room_id=r.id
            where m.inserted_at between '2023-01-01' and '2023-04-01' and r.is_triage = false
            /* where m.inserted_at between '2023-01-01' and '2023-04-11' and r.is_triage = false */
            group by r.id, c.name, m.id
            order by r.id
        ) q
        join message m
        on m.room_id=q.system_issue_id
        left join agent a
        on m.from_agent_id=a.id
        left join public.user u
        on m.from_user_id=u.id
        group by q.system_issue_id, q.issue_name, q.customer_name, q.open_ts, q.status, q.github_issues, m.inserted_at, m.text, m.from_agent_id, m.from_user_id, m.from_name_override, a.name, u.name
    ) q1
    group by q1.system_issue_id, q1.customer_name, q1.issue_name, q1.open_ts, q1.status, q1.github_issues;

select * from v1;
drop view v1;
