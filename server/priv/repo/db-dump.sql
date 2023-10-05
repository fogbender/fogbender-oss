--
-- PostgreSQL database dump
--

-- Dumped from database version 14.8
-- Dumped by pg_dump version 14.8

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_bigm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_bigm WITH SCHEMA public;


--
-- Name: EXTENSION pg_bigm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_bigm IS 'text similarity measurement and index searching based on bigrams';


--
-- Name: snowflake_id(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.snowflake_id(machine_id integer) RETURNS bigint
    LANGUAGE plpgsql
    AS $$
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
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: agent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent (
    id bigint NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    image_url text,
    is_bot boolean DEFAULT false NOT NULL
);


--
-- Name: author_tag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.author_tag (
    id bigint NOT NULL,
    agent_id bigint,
    user_id bigint,
    tag_id bigint,
    inserted_at timestamp without time zone DEFAULT '2020-11-01 00:00:01'::timestamp without time zone NOT NULL,
    updated_at timestamp without time zone DEFAULT '2020-11-01 00:00:01'::timestamp without time zone NOT NULL,
    CONSTRAINT non_null_author CHECK ((COALESCE(NULLIF(agent_id, '0'::bigint), '0'::bigint) <> COALESCE(NULLIF(user_id, '0'::bigint), '0'::bigint)))
);


--
-- Name: author_tag_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.author_tag_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: author_tag_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.author_tag_id_seq OWNED BY public.author_tag.id;


--
-- Name: connect_code; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.connect_code (
    helpdesk_id bigint NOT NULL,
    code text NOT NULL,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: crm_note_mapping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_note_mapping (
    room_id bigint NOT NULL,
    crm_id text NOT NULL,
    crm_type text NOT NULL,
    inserted_at timestamp(0) without time zone NOT NULL,
    note_id text,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: customer; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer (
    id bigint NOT NULL,
    vendor_id bigint NOT NULL,
    name text NOT NULL,
    external_uid text,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by_agent_id bigint
);


--
-- Name: customer_crm; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_crm (
    id bigint NOT NULL,
    customer_id bigint NOT NULL,
    vendor_id bigint NOT NULL,
    crm_id text NOT NULL,
    crm_remote_id text NOT NULL,
    crm_type text NOT NULL,
    crm_remote_account_id text NOT NULL,
    crm_account_id text NOT NULL,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: customer_crm_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_crm_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_crm_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_crm_id_seq OWNED BY public.customer_crm.id;


--
-- Name: customer_domain; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_domain (
    id bigint NOT NULL,
    customer_id bigint NOT NULL,
    vendor_id bigint NOT NULL,
    domain text NOT NULL,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: customer_domain_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_domain_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_domain_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_domain_id_seq OWNED BY public.customer_domain.id;


--
-- Name: customer_info_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_info_log (
    id bigint NOT NULL,
    customer_id bigint NOT NULL,
    source text NOT NULL,
    data jsonb NOT NULL,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: customer_info_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_info_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_info_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_info_log_id_seq OWNED BY public.customer_info_log.id;


--
-- Name: deleted_vendor_agent_role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deleted_vendor_agent_role (
    vendor_id bigint NOT NULL,
    agent_id bigint NOT NULL,
    role text NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by_agent_id bigint,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: detective; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.detective (
    id bigint NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: email_info_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_info_cache (
    id bigint NOT NULL,
    email text NOT NULL,
    provider text NOT NULL,
    info jsonb NOT NULL,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: email_info_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_info_cache_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_info_cache_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_info_cache_id_seq OWNED BY public.email_info_cache.id;


--
-- Name: embeddings_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.embeddings_cache (
    prompt_id uuid NOT NULL,
    prompt text NOT NULL,
    model text NOT NULL,
    tokens integer NOT NULL,
    embedding double precision[] NOT NULL,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: embeddings_source; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.embeddings_source (
    id uuid NOT NULL,
    parent_id uuid,
    text text,
    url text NOT NULL,
    description text,
    status character varying(255),
    workspace_id bigint NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by_agent_id bigint,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    restrict_path text
);


--
-- Name: feature_flag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_flag (
    id text NOT NULL,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: feature_option; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_option (
    id bigint NOT NULL,
    vendor_id bigint,
    workspace_id bigint,
    user_id bigint,
    agent_id bigint,
    tag_scope_enabled boolean,
    email_digest_enabled boolean,
    email_digest_period integer,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    email_digest_template text,
    agent_customer_following boolean,
    user_triage_following boolean,
    avatar_library_url text,
    default_group_assignment text,
    visitor_avatar_library_url text
);


--
-- Name: feature_option_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.feature_option_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: feature_option_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.feature_option_id_seq OWNED BY public.feature_option.id;


--
-- Name: file; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.file (
    id bigint NOT NULL,
    message_id bigint,
    filename character varying(255) NOT NULL,
    content_type character varying(255) NOT NULL,
    data jsonb,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: fogvite; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fogvite (
    id bigint NOT NULL,
    invite_sent_to_email character varying(255),
    sender_agent_id bigint NOT NULL,
    accepted_by_agent_id bigint,
    fogvite_code character varying(255) DEFAULT NULL::character varying,
    deleted_at timestamp without time zone,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: fogvite_code; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fogvite_code (
    code character varying(255) NOT NULL,
    "limit" bigint,
    disabled boolean DEFAULT false,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: helpdesk; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.helpdesk (
    id bigint NOT NULL,
    customer_id bigint NOT NULL,
    workspace_id bigint NOT NULL,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: helpdesk_integration; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.helpdesk_integration (
    id bigint NOT NULL,
    helpdesk_id bigint NOT NULL,
    type text NOT NULL,
    specifics jsonb NOT NULL,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: helpdesk_integration_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.helpdesk_integration_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: helpdesk_integration_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.helpdesk_integration_id_seq OWNED BY public.helpdesk_integration.id;


--
-- Name: integration_issue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integration_issue (
    id bigint NOT NULL,
    workspace_id bigint NOT NULL,
    type text NOT NULL,
    project_id text NOT NULL,
    issue_id text NOT NULL,
    name text NOT NULL,
    url text NOT NULL,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    issue_number text NOT NULL,
    state text
);


--
-- Name: integration_issue_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.integration_issue_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: integration_issue_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.integration_issue_id_seq OWNED BY public.integration_issue.id;


--
-- Name: integration_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integration_log (
    id bigint NOT NULL,
    workspace_id bigint NOT NULL,
    type text NOT NULL,
    data jsonb NOT NULL,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    integration_id bigint,
    integration_project_id text
);


--
-- Name: integration_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.integration_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: integration_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.integration_log_id_seq OWNED BY public.integration_log.id;


--
-- Name: mention; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mention (
    message_id bigint NOT NULL,
    user_id bigint DEFAULT 0 NOT NULL,
    agent_id bigint DEFAULT 0 NOT NULL,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    text text
);


--
-- Name: message; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message (
    id bigint NOT NULL,
    room_id bigint NOT NULL,
    from_agent_id bigint,
    from_user_id bigint,
    client_id text DEFAULT ''::text NOT NULL,
    text text NOT NULL,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    link_room_id bigint,
    link_start_message_id bigint,
    link_end_message_id bigint,
    link_type text,
    deleted_at timestamp without time zone,
    deleted_by_agent_id bigint,
    deleted_by_user_id bigint,
    edited_at timestamp without time zone,
    edited_by_agent_id bigint,
    edited_by_user_id bigint,
    from_name_override character varying(255),
    from_image_url_override character varying(255),
    source character varying(255)
);


--
-- Name: message_file; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_file (
    message_id bigint NOT NULL,
    file_id bigint NOT NULL,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: message_link; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_link (
    id bigint NOT NULL,
    source_message_id bigint NOT NULL,
    target_message_id bigint NOT NULL,
    target_room_id bigint NOT NULL,
    type text NOT NULL
);


--
-- Name: message_link_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.message_link_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: message_link_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.message_link_id_seq OWNED BY public.message_link.id;


--
-- Name: message_reaction; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_reaction (
    id bigint NOT NULL,
    message_id bigint NOT NULL,
    user_id bigint,
    agent_id bigint,
    reaction text NOT NULL,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: message_reaction_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.message_reaction_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: message_reaction_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.message_reaction_id_seq OWNED BY public.message_reaction.id;


--
-- Name: msteams_channel_mapping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.msteams_channel_mapping (
    room_id bigint NOT NULL,
    channel_id text NOT NULL,
    conversation_id text NOT NULL,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: msteams_message_mapping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.msteams_message_mapping (
    message_id bigint NOT NULL,
    msteams_message_id text NOT NULL,
    msteams_channel_id text NOT NULL,
    msteams_message_meta jsonb DEFAULT '{}'::jsonb,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: msteams_team_mapping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.msteams_team_mapping (
    team_id text NOT NULL,
    team_aad_group_id text NOT NULL,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: msteams_user_mapping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.msteams_user_mapping (
    user_id bigint NOT NULL,
    msteams_team_id text NOT NULL,
    msteams_user_id text NOT NULL,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    helpdesk_id bigint NOT NULL
);


--
-- Name: org; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org (
    id bigint NOT NULL,
    name character varying(255),
    domain character varying(255),
    logo character varying(255),
    site character varying(255),
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: org_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.org_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: org_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.org_id_seq OWNED BY public.org.id;


--
-- Name: prompt_cluster; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prompt_cluster (
    id uuid NOT NULL,
    cluster_id text NOT NULL,
    source_id uuid NOT NULL,
    prompt text NOT NULL,
    data jsonb NOT NULL,
    embedding double precision[],
    status text DEFAULT 'fetching'::text,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: room; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.room (
    id bigint NOT NULL,
    helpdesk_id bigint NOT NULL,
    name text NOT NULL,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    type text DEFAULT 'public'::text NOT NULL,
    dialog_id text,
    is_triage boolean DEFAULT false NOT NULL,
    agent_groups character varying(255)[],
    resolved boolean DEFAULT false NOT NULL,
    resolved_by_agent_id bigint,
    resolved_at timestamp without time zone,
    resolved_til timestamp without time zone,
    created_by_agent_id bigint,
    created_by_user_id bigint,
    display_name_for_user text,
    display_name_for_agent text
);


--
-- Name: room_membership; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.room_membership (
    helpdesk_id bigint,
    room_id bigint,
    user_id bigint,
    agent_id bigint,
    role text,
    status text,
    id bigint DEFAULT public.snowflake_id(1) NOT NULL,
    CONSTRAINT non_null_author CHECK ((COALESCE(NULLIF(agent_id, '0'::bigint), '0'::bigint) <> COALESCE(NULLIF(user_id, '0'::bigint), '0'::bigint)))
);


--
-- Name: room_tag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.room_tag (
    id bigint NOT NULL,
    room_id bigint,
    tag_id bigint,
    inserted_at timestamp without time zone DEFAULT '2023-04-15 00:00:01'::timestamp without time zone NOT NULL,
    updated_at timestamp without time zone DEFAULT '2023-04-15 00:00:01'::timestamp without time zone NOT NULL,
    updated_by_agent_id bigint,
    updated_by_user_id bigint
);


--
-- Name: room_tag_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.room_tag_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: room_tag_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.room_tag_id_seq OWNED BY public.room_tag.id;


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


--
-- Name: seen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seen (
    id bigint NOT NULL,
    room_id bigint NOT NULL,
    message_id bigint NOT NULL,
    user_id bigint,
    agent_id bigint,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    is_following boolean DEFAULT true
);


--
-- Name: seen_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.seen_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: seen_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.seen_id_seq OWNED BY public.seen.id;


--
-- Name: slack_agent_mapping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.slack_agent_mapping (
    agent_id bigint NOT NULL,
    slack_team_id text NOT NULL,
    slack_user_id text NOT NULL,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: slack_channel_mapping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.slack_channel_mapping (
    room_id bigint NOT NULL,
    channel_id text NOT NULL,
    thread_id text NOT NULL,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: slack_customer_user_mapping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.slack_customer_user_mapping (
    user_id bigint NOT NULL,
    slack_team_id text NOT NULL,
    slack_user_id text NOT NULL,
    helpdesk_id bigint NOT NULL,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: slack_message_mapping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.slack_message_mapping (
    message_id bigint NOT NULL,
    slack_message_ts text NOT NULL,
    slack_channel_id text NOT NULL,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: snowflake_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.snowflake_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subscription_emails; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_emails (
    id bigint NOT NULL,
    email character varying(255) NOT NULL,
    user_info character varying(255),
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: subsciption_emails_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subsciption_emails_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subsciption_emails_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subsciption_emails_id_seq OWNED BY public.subscription_emails.id;


--
-- Name: tag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tag (
    id bigint NOT NULL,
    workspace_id bigint,
    name text,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."user" (
    id bigint NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    external_uid text,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    helpdesk_id bigint DEFAULT 0 NOT NULL,
    image_url text,
    last_activity_at timestamp without time zone,
    last_digest_check_at timestamp without time zone,
    deleted_at timestamp without time zone,
    deleted_by_agent_id bigint,
    is_visitor boolean DEFAULT false NOT NULL,
    email_verified boolean DEFAULT true NOT NULL
);


--
-- Name: user_event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_event (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    event text NOT NULL,
    meta text,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: user_info_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_info_cache (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    provider text NOT NULL,
    info jsonb NOT NULL,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: user_info_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_info_cache_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_info_cache_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_info_cache_id_seq OWNED BY public.user_info_cache.id;


--
-- Name: vendor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor (
    id bigint NOT NULL,
    name text,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by_agent_id bigint,
    free_seats integer DEFAULT 2,
    agent_scheduling_enabled boolean DEFAULT false
);


--
-- Name: vendor_agent_group; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_agent_group (
    vendor_id bigint NOT NULL,
    agent_id bigint NOT NULL,
    "group" text NOT NULL,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: vendor_agent_invite; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_agent_invite (
    vendor_id bigint NOT NULL,
    email text NOT NULL,
    code text NOT NULL,
    from_agent_id bigint NOT NULL,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    invite_id bigint NOT NULL,
    deleted_at timestamp without time zone,
    role text DEFAULT 'agent'::text NOT NULL
);


--
-- Name: vendor_agent_role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_agent_role (
    vendor_id bigint NOT NULL,
    agent_id bigint NOT NULL,
    role text NOT NULL,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    last_activity_at timestamp without time zone,
    last_digest_check_at timestamp without time zone
);


--
-- Name: vendor_api_token; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_api_token (
    id bigint NOT NULL,
    vendor_id bigint,
    created_by_agent_id bigint,
    description text,
    scopes character varying(255)[],
    is_deleted boolean DEFAULT false,
    deleted_at timestamp without time zone,
    deleted_by_agent_id bigint,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: vendor_api_token_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vendor_api_token_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vendor_api_token_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vendor_api_token_id_seq OWNED BY public.vendor_api_token.id;


--
-- Name: vendor_group; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_group (
    vendor_id bigint NOT NULL,
    "group" text NOT NULL,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: vendor_stripe_customer; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_stripe_customer (
    vendor_id bigint NOT NULL,
    stripe_customer_id text NOT NULL,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: vendor_verified_domain; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_verified_domain (
    id bigint NOT NULL,
    vendor_id bigint NOT NULL,
    domain text NOT NULL,
    verification_code text,
    verified boolean DEFAULT false NOT NULL,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: vendor_verified_domain_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vendor_verified_domain_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vendor_verified_domain_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vendor_verified_domain_id_seq OWNED BY public.vendor_verified_domain.id;


--
-- Name: workspace; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspace (
    id bigint NOT NULL,
    vendor_id bigint NOT NULL,
    name text NOT NULL,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    signature_type text,
    signature_secret text,
    description character varying(255),
    triage_name text DEFAULT 'Triage'::text NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by_agent_id bigint,
    visitor_key text,
    visitors_enabled boolean DEFAULT false
);


--
-- Name: workspace_agent_role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspace_agent_role (
    workspace_id bigint NOT NULL,
    agent_id bigint NOT NULL,
    role text NOT NULL,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: workspace_feature_flag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspace_feature_flag (
    id bigint NOT NULL,
    feature_flag_id text,
    workspace_id bigint
);


--
-- Name: workspace_feature_flag_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.workspace_feature_flag_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: workspace_feature_flag_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.workspace_feature_flag_id_seq OWNED BY public.workspace_feature_flag.id;


--
-- Name: workspace_integration; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspace_integration (
    id bigint NOT NULL,
    workspace_id bigint NOT NULL,
    type text NOT NULL,
    project_id text NOT NULL,
    specifics jsonb NOT NULL,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: workspace_integration_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.workspace_integration_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: workspace_integration_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.workspace_integration_id_seq OWNED BY public.workspace_integration.id;


--
-- Name: author_tag id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.author_tag ALTER COLUMN id SET DEFAULT nextval('public.author_tag_id_seq'::regclass);


--
-- Name: customer_crm id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_crm ALTER COLUMN id SET DEFAULT nextval('public.customer_crm_id_seq'::regclass);


--
-- Name: customer_domain id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_domain ALTER COLUMN id SET DEFAULT nextval('public.customer_domain_id_seq'::regclass);


--
-- Name: customer_info_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_info_log ALTER COLUMN id SET DEFAULT nextval('public.customer_info_log_id_seq'::regclass);


--
-- Name: email_info_cache id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_info_cache ALTER COLUMN id SET DEFAULT nextval('public.email_info_cache_id_seq'::regclass);


--
-- Name: feature_option id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_option ALTER COLUMN id SET DEFAULT nextval('public.feature_option_id_seq'::regclass);


--
-- Name: helpdesk_integration id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.helpdesk_integration ALTER COLUMN id SET DEFAULT nextval('public.helpdesk_integration_id_seq'::regclass);


--
-- Name: integration_issue id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_issue ALTER COLUMN id SET DEFAULT nextval('public.integration_issue_id_seq'::regclass);


--
-- Name: integration_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_log ALTER COLUMN id SET DEFAULT nextval('public.integration_log_id_seq'::regclass);


--
-- Name: message_link id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_link ALTER COLUMN id SET DEFAULT nextval('public.message_link_id_seq'::regclass);


--
-- Name: message_reaction id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reaction ALTER COLUMN id SET DEFAULT nextval('public.message_reaction_id_seq'::regclass);


--
-- Name: org id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org ALTER COLUMN id SET DEFAULT nextval('public.org_id_seq'::regclass);


--
-- Name: room_tag id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_tag ALTER COLUMN id SET DEFAULT nextval('public.room_tag_id_seq'::regclass);


--
-- Name: seen id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seen ALTER COLUMN id SET DEFAULT nextval('public.seen_id_seq'::regclass);


--
-- Name: subscription_emails id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_emails ALTER COLUMN id SET DEFAULT nextval('public.subsciption_emails_id_seq'::regclass);


--
-- Name: user_info_cache id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_info_cache ALTER COLUMN id SET DEFAULT nextval('public.user_info_cache_id_seq'::regclass);


--
-- Name: vendor_api_token id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_api_token ALTER COLUMN id SET DEFAULT nextval('public.vendor_api_token_id_seq'::regclass);


--
-- Name: vendor_verified_domain id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_verified_domain ALTER COLUMN id SET DEFAULT nextval('public.vendor_verified_domain_id_seq'::regclass);


--
-- Name: workspace_feature_flag id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_feature_flag ALTER COLUMN id SET DEFAULT nextval('public.workspace_feature_flag_id_seq'::regclass);


--
-- Name: workspace_integration id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_integration ALTER COLUMN id SET DEFAULT nextval('public.workspace_integration_id_seq'::regclass);


--
-- Name: agent agent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent
    ADD CONSTRAINT agent_pkey PRIMARY KEY (id);


--
-- Name: author_tag author_tag_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.author_tag
    ADD CONSTRAINT author_tag_pkey PRIMARY KEY (id);


--
-- Name: crm_note_mapping crm_note_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_note_mapping
    ADD CONSTRAINT crm_note_mapping_pkey PRIMARY KEY (room_id, crm_id, crm_type, inserted_at);


--
-- Name: customer_crm customer_crm_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_crm
    ADD CONSTRAINT customer_crm_pkey PRIMARY KEY (id);


--
-- Name: customer_domain customer_domain_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_domain
    ADD CONSTRAINT customer_domain_pkey PRIMARY KEY (id);


--
-- Name: customer_info_log customer_info_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_info_log
    ADD CONSTRAINT customer_info_log_pkey PRIMARY KEY (id);


--
-- Name: customer customer_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer
    ADD CONSTRAINT customer_pkey PRIMARY KEY (id);


--
-- Name: deleted_vendor_agent_role deleted_vendor_agent_role_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deleted_vendor_agent_role
    ADD CONSTRAINT deleted_vendor_agent_role_pkey PRIMARY KEY (vendor_id, agent_id);


--
-- Name: detective detective_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detective
    ADD CONSTRAINT detective_pkey PRIMARY KEY (id);


--
-- Name: email_info_cache email_info_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_info_cache
    ADD CONSTRAINT email_info_cache_pkey PRIMARY KEY (id);


--
-- Name: embeddings_cache embeddings_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.embeddings_cache
    ADD CONSTRAINT embeddings_cache_pkey PRIMARY KEY (prompt_id);


--
-- Name: embeddings_source embeddings_source_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.embeddings_source
    ADD CONSTRAINT embeddings_source_pkey PRIMARY KEY (id);


--
-- Name: feature_flag feature_flag_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_flag
    ADD CONSTRAINT feature_flag_pkey PRIMARY KEY (id);


--
-- Name: feature_option feature_option_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_option
    ADD CONSTRAINT feature_option_pkey PRIMARY KEY (id);


--
-- Name: file file_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file
    ADD CONSTRAINT file_pkey PRIMARY KEY (id);


--
-- Name: fogvite_code fogvite_code_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fogvite_code
    ADD CONSTRAINT fogvite_code_pkey PRIMARY KEY (code);


--
-- Name: fogvite fogvite_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fogvite
    ADD CONSTRAINT fogvite_pkey PRIMARY KEY (id);


--
-- Name: helpdesk_integration helpdesk_integration_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.helpdesk_integration
    ADD CONSTRAINT helpdesk_integration_pkey PRIMARY KEY (id);


--
-- Name: helpdesk helpdesk_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.helpdesk
    ADD CONSTRAINT helpdesk_pkey PRIMARY KEY (id);


--
-- Name: integration_issue integration_issue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_issue
    ADD CONSTRAINT integration_issue_pkey PRIMARY KEY (id);


--
-- Name: integration_log integration_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_log
    ADD CONSTRAINT integration_log_pkey PRIMARY KEY (id);


--
-- Name: mention mention_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mention
    ADD CONSTRAINT mention_pkey PRIMARY KEY (message_id, user_id, agent_id);


--
-- Name: message_link message_link_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_link
    ADD CONSTRAINT message_link_pkey PRIMARY KEY (id);


--
-- Name: message message_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message
    ADD CONSTRAINT message_pkey PRIMARY KEY (id);


--
-- Name: message_reaction message_reaction_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reaction
    ADD CONSTRAINT message_reaction_pkey PRIMARY KEY (id);


--
-- Name: org org_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org
    ADD CONSTRAINT org_pkey PRIMARY KEY (id);


--
-- Name: prompt_cluster prompt_cluster_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_cluster
    ADD CONSTRAINT prompt_cluster_pkey PRIMARY KEY (id, cluster_id);


--
-- Name: room_membership room_membership_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_membership
    ADD CONSTRAINT room_membership_pkey PRIMARY KEY (id);


--
-- Name: room room_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room
    ADD CONSTRAINT room_pkey PRIMARY KEY (id);


--
-- Name: room_tag room_tag_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_tag
    ADD CONSTRAINT room_tag_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: seen seen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seen
    ADD CONSTRAINT seen_pkey PRIMARY KEY (id);


--
-- Name: subscription_emails subsciption_emails_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_emails
    ADD CONSTRAINT subsciption_emails_pkey PRIMARY KEY (id);


--
-- Name: tag tag_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag
    ADD CONSTRAINT tag_pkey PRIMARY KEY (id);


--
-- Name: user_event user_event_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_event
    ADD CONSTRAINT user_event_pkey PRIMARY KEY (id);


--
-- Name: user_info_cache user_info_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_info_cache
    ADD CONSTRAINT user_info_cache_pkey PRIMARY KEY (id);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: vendor_agent_group vendor_agent_group_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_agent_group
    ADD CONSTRAINT vendor_agent_group_pkey PRIMARY KEY (vendor_id, agent_id, "group");


--
-- Name: vendor_agent_invite vendor_agent_invite_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_agent_invite
    ADD CONSTRAINT vendor_agent_invite_pkey PRIMARY KEY (vendor_id, email, code);


--
-- Name: vendor_agent_role vendor_agent_role_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_agent_role
    ADD CONSTRAINT vendor_agent_role_pkey PRIMARY KEY (vendor_id, agent_id);


--
-- Name: vendor_api_token vendor_api_token_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_api_token
    ADD CONSTRAINT vendor_api_token_pkey PRIMARY KEY (id);


--
-- Name: vendor_group vendor_group_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_group
    ADD CONSTRAINT vendor_group_pkey PRIMARY KEY (vendor_id, "group");


--
-- Name: vendor vendor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor
    ADD CONSTRAINT vendor_pkey PRIMARY KEY (id);


--
-- Name: vendor_verified_domain vendor_verified_domain_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_verified_domain
    ADD CONSTRAINT vendor_verified_domain_pkey PRIMARY KEY (id);


--
-- Name: workspace_agent_role workspace_agent_role_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_agent_role
    ADD CONSTRAINT workspace_agent_role_pkey PRIMARY KEY (workspace_id, agent_id);


--
-- Name: workspace_feature_flag workspace_feature_flag_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_feature_flag
    ADD CONSTRAINT workspace_feature_flag_pkey PRIMARY KEY (id);


--
-- Name: workspace_integration workspace_integration_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_integration
    ADD CONSTRAINT workspace_integration_pkey PRIMARY KEY (id);


--
-- Name: workspace workspace_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace
    ADD CONSTRAINT workspace_pkey PRIMARY KEY (id);


--
-- Name: agent_email_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX agent_email_index ON public.agent USING btree (email);


--
-- Name: author_tag_agent_id_tag_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX author_tag_agent_id_tag_id_index ON public.author_tag USING btree (agent_id, tag_id);


--
-- Name: author_tag_user_id_tag_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX author_tag_user_id_tag_id_index ON public.author_tag USING btree (user_id, tag_id);


--
-- Name: crm_note_mapping_room_id_crm_id_crm_type_inserted_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX crm_note_mapping_room_id_crm_id_crm_type_inserted_at_index ON public.crm_note_mapping USING btree (room_id, crm_id, crm_type, inserted_at);


--
-- Name: customer_crm_customer_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customer_crm_customer_id_index ON public.customer_crm USING btree (customer_id);


--
-- Name: customer_domain_customer_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customer_domain_customer_id_index ON public.customer_domain USING btree (customer_id);


--
-- Name: customer_info_log_customer_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customer_info_log_customer_id_index ON public.customer_info_log USING btree (customer_id);


--
-- Name: customer_name_bigm_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX customer_name_bigm_index ON public.customer USING gin (lower(name) public.gin_bigm_ops);


--
-- Name: customer_vendor_id_external_uid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX customer_vendor_id_external_uid_index ON public.customer USING btree (vendor_id, external_uid);


--
-- Name: detective_email_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX detective_email_index ON public.detective USING btree (email);


--
-- Name: email_provider_uq_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX email_provider_uq_index ON public.email_info_cache USING btree (email, provider);


--
-- Name: embeddings_source_workspace_id_url_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX embeddings_source_workspace_id_url_index ON public.embeddings_source USING btree (workspace_id, url);


--
-- Name: feature_option_user_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX feature_option_user_id_index ON public.feature_option USING btree (user_id);


--
-- Name: feature_option_vendor_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX feature_option_vendor_id_index ON public.feature_option USING btree (vendor_id);


--
-- Name: feature_option_workspace_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX feature_option_workspace_id_index ON public.feature_option USING btree (workspace_id);


--
-- Name: file_message_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX file_message_id_index ON public.file USING btree (message_id);


--
-- Name: helpdesk_id_type_uq_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX helpdesk_id_type_uq_index ON public.helpdesk_integration USING btree (helpdesk_id, type);


--
-- Name: helpdesk_workspace_id_customer_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX helpdesk_workspace_id_customer_id_index ON public.helpdesk USING btree (workspace_id, customer_id);


--
-- Name: integration_issue_workspace_id_type_project_id_issue_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX integration_issue_workspace_id_type_project_id_issue_id_index ON public.integration_issue USING btree (workspace_id, type, project_id, issue_id);


--
-- Name: message_file_message_id_file_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX message_file_message_id_file_id_index ON public.message_file USING btree (message_id, file_id);


--
-- Name: message_file_message_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX message_file_message_id_index ON public.message_file USING btree (message_id);


--
-- Name: message_link_source_message_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX message_link_source_message_id_index ON public.message_link USING btree (source_message_id);


--
-- Name: message_link_target_message_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX message_link_target_message_id_index ON public.message_link USING btree (target_message_id);


--
-- Name: message_reaction_message_id_agent_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX message_reaction_message_id_agent_id_index ON public.message_reaction USING btree (message_id, agent_id);


--
-- Name: message_reaction_message_id_user_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX message_reaction_message_id_user_id_index ON public.message_reaction USING btree (message_id, user_id);


--
-- Name: message_room_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX message_room_id_index ON public.message USING btree (room_id);


--
-- Name: message_text_bigm_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX message_text_bigm_index ON public.message USING gin (lower(text) public.gin_bigm_ops);


--
-- Name: msteams_channel_mapping_conversation_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX msteams_channel_mapping_conversation_id_index ON public.msteams_channel_mapping USING btree (conversation_id);


--
-- Name: msteams_channel_mapping_room_id_channel_id_conversation_id_inde; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX msteams_channel_mapping_room_id_channel_id_conversation_id_inde ON public.msteams_channel_mapping USING btree (room_id, channel_id, conversation_id);


--
-- Name: msteams_channel_mapping_room_id_channel_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX msteams_channel_mapping_room_id_channel_id_index ON public.msteams_channel_mapping USING btree (room_id, channel_id);


--
-- Name: msteams_channel_mapping_room_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX msteams_channel_mapping_room_id_index ON public.msteams_channel_mapping USING btree (room_id);


--
-- Name: msteams_connect_code_code_helpdesk_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX msteams_connect_code_code_helpdesk_id_index ON public.connect_code USING btree (code, helpdesk_id);


--
-- Name: msteams_connect_code_code_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX msteams_connect_code_code_index ON public.connect_code USING btree (code);


--
-- Name: msteams_message_mapping_message_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX msteams_message_mapping_message_id_index ON public.msteams_message_mapping USING btree (message_id);


--
-- Name: msteams_message_mapping_message_id_msteams_message_id_msteams_c; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX msteams_message_mapping_message_id_msteams_message_id_msteams_c ON public.msteams_message_mapping USING btree (message_id, msteams_message_id, msteams_channel_id);


--
-- Name: msteams_message_mapping_msteams_channel_id_msteams_message_id_i; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX msteams_message_mapping_msteams_channel_id_msteams_message_id_i ON public.msteams_message_mapping USING btree (msteams_channel_id, msteams_message_id);


--
-- Name: msteams_team_mapping_team_id_team_aad_group_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX msteams_team_mapping_team_id_team_aad_group_id_index ON public.msteams_team_mapping USING btree (team_id, team_aad_group_id);


--
-- Name: msteams_user_mapping_msteams_team_id_msteams_user_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX msteams_user_mapping_msteams_team_id_msteams_user_id_index ON public.msteams_user_mapping USING btree (msteams_team_id, msteams_user_id);


--
-- Name: msteams_user_mapping_user_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX msteams_user_mapping_user_id_index ON public.msteams_user_mapping USING btree (user_id);


--
-- Name: msteams_user_mapping_user_id_msteams_team_id_msteams_user_id_in; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX msteams_user_mapping_user_id_msteams_team_id_msteams_user_id_in ON public.msteams_user_mapping USING btree (user_id, msteams_team_id, msteams_user_id);


--
-- Name: one_per_customer_uq_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX one_per_customer_uq_index ON public.customer_crm USING btree (vendor_id, crm_remote_id, crm_type, crm_remote_account_id);


--
-- Name: one_per_vendor_uq_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX one_per_vendor_uq_index ON public.customer_crm USING btree (vendor_id, crm_remote_id, crm_type, customer_id);


--
-- Name: prompt_cluster_id_uniq_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX prompt_cluster_id_uniq_index ON public.prompt_cluster USING btree (cluster_id, id);


--
-- Name: room_dialog_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX room_dialog_id_index ON public.room USING btree (dialog_id);


--
-- Name: room_helpdesk_id_is_triage_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX room_helpdesk_id_is_triage_index ON public.room USING btree (helpdesk_id, is_triage) WHERE is_triage;


--
-- Name: room_helpdesk_id_name_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX room_helpdesk_id_name_index ON public.room USING btree (helpdesk_id, name);


--
-- Name: room_membership_helpdesk_id_room_id_agent_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX room_membership_helpdesk_id_room_id_agent_id_index ON public.room_membership USING btree (helpdesk_id, room_id, agent_id);


--
-- Name: room_membership_helpdesk_id_room_id_user_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX room_membership_helpdesk_id_room_id_user_id_index ON public.room_membership USING btree (helpdesk_id, room_id, user_id);


--
-- Name: room_resolved_resolved_til_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX room_resolved_resolved_til_index ON public.room USING btree (resolved, resolved_til);


--
-- Name: room_tag_room_id_tag_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX room_tag_room_id_tag_id_index ON public.room_tag USING btree (room_id, tag_id);


--
-- Name: seen_room_id_agent_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX seen_room_id_agent_id_index ON public.seen USING btree (room_id, agent_id);


--
-- Name: seen_room_id_user_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX seen_room_id_user_id_index ON public.seen USING btree (room_id, user_id);


--
-- Name: slack_agent_mapping_agent_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX slack_agent_mapping_agent_id_index ON public.slack_agent_mapping USING btree (agent_id);


--
-- Name: slack_agent_mapping_agent_id_slack_team_id_slack_user_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX slack_agent_mapping_agent_id_slack_team_id_slack_user_id_index ON public.slack_agent_mapping USING btree (agent_id, slack_team_id, slack_user_id);


--
-- Name: slack_agent_mapping_slack_team_id_slack_user_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX slack_agent_mapping_slack_team_id_slack_user_id_index ON public.slack_agent_mapping USING btree (slack_team_id, slack_user_id);


--
-- Name: slack_channel_mapping_room_id_channel_id_thread_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX slack_channel_mapping_room_id_channel_id_thread_id_index ON public.slack_channel_mapping USING btree (room_id, channel_id, thread_id);


--
-- Name: slack_channel_mapping_room_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX slack_channel_mapping_room_id_index ON public.slack_channel_mapping USING btree (room_id);


--
-- Name: slack_channel_mapping_thread_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX slack_channel_mapping_thread_id_index ON public.slack_channel_mapping USING btree (thread_id);


--
-- Name: slack_customer_user_mapping_slack_team_id_slack_user_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX slack_customer_user_mapping_slack_team_id_slack_user_id_index ON public.slack_customer_user_mapping USING btree (slack_team_id, slack_user_id);


--
-- Name: slack_customer_user_mapping_user_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX slack_customer_user_mapping_user_id_index ON public.slack_customer_user_mapping USING btree (user_id);


--
-- Name: slack_customer_user_mapping_user_id_slack_team_id_slack_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX slack_customer_user_mapping_user_id_slack_team_id_slack_user_id ON public.slack_customer_user_mapping USING btree (user_id, slack_team_id, slack_user_id, helpdesk_id);


--
-- Name: slack_message_mapping_message_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX slack_message_mapping_message_id_index ON public.slack_message_mapping USING btree (message_id);


--
-- Name: slack_message_mapping_message_id_slack_message_ts_slack_channel; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX slack_message_mapping_message_id_slack_message_ts_slack_channel ON public.slack_message_mapping USING btree (message_id, slack_message_ts, slack_channel_id);


--
-- Name: slack_message_mapping_slack_message_ts_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX slack_message_mapping_slack_message_ts_index ON public.slack_message_mapping USING btree (slack_message_ts);


--
-- Name: tag_workspace_id_name_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tag_workspace_id_name_index ON public.tag USING btree (workspace_id, name);


--
-- Name: user_email_uniq_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_email_uniq_index ON public."user" USING btree (helpdesk_id, email);


--
-- Name: user_event_event_inserted_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_event_event_inserted_at_index ON public.user_event USING btree (event, inserted_at);


--
-- Name: user_external_uid_uniq_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_external_uid_uniq_index ON public."user" USING btree (helpdesk_id, external_uid);


--
-- Name: user_id_provider_uq_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_id_provider_uq_index ON public.user_info_cache USING btree (user_id, provider);


--
-- Name: vendor_agent_group_uq_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX vendor_agent_group_uq_index ON public.vendor_agent_group USING btree (vendor_id, agent_id, "group");


--
-- Name: vendor_agent_invite_id_uniq_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX vendor_agent_invite_id_uniq_index ON public.vendor_agent_invite USING btree (invite_id);


--
-- Name: vendor_api_token_vendor_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vendor_api_token_vendor_id_index ON public.vendor_api_token USING btree (vendor_id);


--
-- Name: vendor_group_uq_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX vendor_group_uq_index ON public.vendor_group USING btree (vendor_id, "group");


--
-- Name: vendor_stripe_customer_vendor_id_stripe_customer_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX vendor_stripe_customer_vendor_id_stripe_customer_id_index ON public.vendor_stripe_customer USING btree (vendor_id, stripe_customer_id);


--
-- Name: vendor_verified_domain_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX vendor_verified_domain_uq ON public.vendor_verified_domain USING btree (vendor_id, domain);


--
-- Name: workspace_feature_flag_feature_flag_id_workspace_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX workspace_feature_flag_feature_flag_id_workspace_id_index ON public.workspace_feature_flag USING btree (feature_flag_id, workspace_id);


--
-- Name: workspace_id_type_project_id_uq_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX workspace_id_type_project_id_uq_index ON public.workspace_integration USING btree (workspace_id, type, project_id);


--
-- PostgreSQL database dump complete
--

INSERT INTO public."schema_migrations" (version) VALUES (20200121164411);
INSERT INTO public."schema_migrations" (version) VALUES (20200128021343);
INSERT INTO public."schema_migrations" (version) VALUES (20200228162942);
INSERT INTO public."schema_migrations" (version) VALUES (20200302175857);
INSERT INTO public."schema_migrations" (version) VALUES (20200302194622);
INSERT INTO public."schema_migrations" (version) VALUES (20200303145550);
INSERT INTO public."schema_migrations" (version) VALUES (20200303153140);
INSERT INTO public."schema_migrations" (version) VALUES (20200303164813);
INSERT INTO public."schema_migrations" (version) VALUES (20200303174457);
INSERT INTO public."schema_migrations" (version) VALUES (20200303195431);
INSERT INTO public."schema_migrations" (version) VALUES (20200303203120);
INSERT INTO public."schema_migrations" (version) VALUES (20200311152107);
INSERT INTO public."schema_migrations" (version) VALUES (20200312141517);
INSERT INTO public."schema_migrations" (version) VALUES (20200312141932);
INSERT INTO public."schema_migrations" (version) VALUES (20200312143020);
INSERT INTO public."schema_migrations" (version) VALUES (20200312144244);
INSERT INTO public."schema_migrations" (version) VALUES (20200318202557);
INSERT INTO public."schema_migrations" (version) VALUES (20200324011746);
INSERT INTO public."schema_migrations" (version) VALUES (20200412213938);
INSERT INTO public."schema_migrations" (version) VALUES (20200414150152);
INSERT INTO public."schema_migrations" (version) VALUES (20200418194804);
INSERT INTO public."schema_migrations" (version) VALUES (20200422155815);
INSERT INTO public."schema_migrations" (version) VALUES (20200423195123);
INSERT INTO public."schema_migrations" (version) VALUES (20200423211153);
INSERT INTO public."schema_migrations" (version) VALUES (20200501181544);
INSERT INTO public."schema_migrations" (version) VALUES (20200501183651);
INSERT INTO public."schema_migrations" (version) VALUES (20200507073719);
INSERT INTO public."schema_migrations" (version) VALUES (20200507074835);
INSERT INTO public."schema_migrations" (version) VALUES (20200507145107);
INSERT INTO public."schema_migrations" (version) VALUES (20200513172127);
INSERT INTO public."schema_migrations" (version) VALUES (20200519141542);
INSERT INTO public."schema_migrations" (version) VALUES (20200622230956);
INSERT INTO public."schema_migrations" (version) VALUES (20200706170238);
INSERT INTO public."schema_migrations" (version) VALUES (20200827211955);
INSERT INTO public."schema_migrations" (version) VALUES (20200902030707);
INSERT INTO public."schema_migrations" (version) VALUES (20200930210156);
INSERT INTO public."schema_migrations" (version) VALUES (20201008002232);
INSERT INTO public."schema_migrations" (version) VALUES (20201013194743);
INSERT INTO public."schema_migrations" (version) VALUES (20201023184911);
INSERT INTO public."schema_migrations" (version) VALUES (20201028182047);
INSERT INTO public."schema_migrations" (version) VALUES (20201103161628);
INSERT INTO public."schema_migrations" (version) VALUES (20201110061404);
INSERT INTO public."schema_migrations" (version) VALUES (20201115204523);
INSERT INTO public."schema_migrations" (version) VALUES (20201119172657);
INSERT INTO public."schema_migrations" (version) VALUES (20201222190013);
INSERT INTO public."schema_migrations" (version) VALUES (20201223225558);
INSERT INTO public."schema_migrations" (version) VALUES (20210119160732);
INSERT INTO public."schema_migrations" (version) VALUES (20210129161507);
INSERT INTO public."schema_migrations" (version) VALUES (20210222190211);
INSERT INTO public."schema_migrations" (version) VALUES (20210310144803);
INSERT INTO public."schema_migrations" (version) VALUES (20210310144953);
INSERT INTO public."schema_migrations" (version) VALUES (20210325155012);
INSERT INTO public."schema_migrations" (version) VALUES (20210325155224);
INSERT INTO public."schema_migrations" (version) VALUES (20210526084350);
INSERT INTO public."schema_migrations" (version) VALUES (20210714041829);
INSERT INTO public."schema_migrations" (version) VALUES (20211126190024);
INSERT INTO public."schema_migrations" (version) VALUES (20211206164820);
INSERT INTO public."schema_migrations" (version) VALUES (20211211183034);
INSERT INTO public."schema_migrations" (version) VALUES (20211217155038);
INSERT INTO public."schema_migrations" (version) VALUES (20211230045132);
INSERT INTO public."schema_migrations" (version) VALUES (20220109193824);
INSERT INTO public."schema_migrations" (version) VALUES (20220109222509);
INSERT INTO public."schema_migrations" (version) VALUES (20220120112328);
INSERT INTO public."schema_migrations" (version) VALUES (20220121125846);
INSERT INTO public."schema_migrations" (version) VALUES (20220223145005);
INSERT INTO public."schema_migrations" (version) VALUES (20220223163441);
INSERT INTO public."schema_migrations" (version) VALUES (20220223205452);
INSERT INTO public."schema_migrations" (version) VALUES (20220225115654);
INSERT INTO public."schema_migrations" (version) VALUES (20220312034627);
INSERT INTO public."schema_migrations" (version) VALUES (20220406170234);
INSERT INTO public."schema_migrations" (version) VALUES (20220416060659);
INSERT INTO public."schema_migrations" (version) VALUES (20220416150231);
INSERT INTO public."schema_migrations" (version) VALUES (20220421192632);
INSERT INTO public."schema_migrations" (version) VALUES (20220605191816);
INSERT INTO public."schema_migrations" (version) VALUES (20220606165328);
INSERT INTO public."schema_migrations" (version) VALUES (20220611232958);
INSERT INTO public."schema_migrations" (version) VALUES (20220617025251);
INSERT INTO public."schema_migrations" (version) VALUES (20220716194344);
INSERT INTO public."schema_migrations" (version) VALUES (20220720041116);
INSERT INTO public."schema_migrations" (version) VALUES (20220721041423);
INSERT INTO public."schema_migrations" (version) VALUES (20220727154954);
INSERT INTO public."schema_migrations" (version) VALUES (20220803185336);
INSERT INTO public."schema_migrations" (version) VALUES (20220808015620);
INSERT INTO public."schema_migrations" (version) VALUES (20220815002346);
INSERT INTO public."schema_migrations" (version) VALUES (20220815012440);
INSERT INTO public."schema_migrations" (version) VALUES (20220817213600);
INSERT INTO public."schema_migrations" (version) VALUES (20220823233541);
INSERT INTO public."schema_migrations" (version) VALUES (20220824015931);
INSERT INTO public."schema_migrations" (version) VALUES (20220903044044);
INSERT INTO public."schema_migrations" (version) VALUES (20220906222411);
INSERT INTO public."schema_migrations" (version) VALUES (20220920155629);
INSERT INTO public."schema_migrations" (version) VALUES (20220920182131);
INSERT INTO public."schema_migrations" (version) VALUES (20220921142129);
INSERT INTO public."schema_migrations" (version) VALUES (20220923160330);
INSERT INTO public."schema_migrations" (version) VALUES (20221005190156);
INSERT INTO public."schema_migrations" (version) VALUES (20221007171637);
INSERT INTO public."schema_migrations" (version) VALUES (20221013171615);
INSERT INTO public."schema_migrations" (version) VALUES (20221014153902);
INSERT INTO public."schema_migrations" (version) VALUES (20221017164703);
INSERT INTO public."schema_migrations" (version) VALUES (20221102133443);
INSERT INTO public."schema_migrations" (version) VALUES (20221104153017);
INSERT INTO public."schema_migrations" (version) VALUES (20221111210137);
INSERT INTO public."schema_migrations" (version) VALUES (20221114203636);
INSERT INTO public."schema_migrations" (version) VALUES (20221115194434);
INSERT INTO public."schema_migrations" (version) VALUES (20221201152726);
INSERT INTO public."schema_migrations" (version) VALUES (20221213175202);
INSERT INTO public."schema_migrations" (version) VALUES (20221222195056);
INSERT INTO public."schema_migrations" (version) VALUES (20221223203510);
INSERT INTO public."schema_migrations" (version) VALUES (20221228052652);
INSERT INTO public."schema_migrations" (version) VALUES (20230204021741);
INSERT INTO public."schema_migrations" (version) VALUES (20230206231726);
INSERT INTO public."schema_migrations" (version) VALUES (20230207073619);
INSERT INTO public."schema_migrations" (version) VALUES (20230210034452);
INSERT INTO public."schema_migrations" (version) VALUES (20230227233339);
INSERT INTO public."schema_migrations" (version) VALUES (20230312191110);
INSERT INTO public."schema_migrations" (version) VALUES (20230317010546);
INSERT INTO public."schema_migrations" (version) VALUES (20230413193646);
INSERT INTO public."schema_migrations" (version) VALUES (20230415133420);
INSERT INTO public."schema_migrations" (version) VALUES (20230415134354);
INSERT INTO public."schema_migrations" (version) VALUES (20230507192311);
INSERT INTO public."schema_migrations" (version) VALUES (20230720040621);
INSERT INTO public."schema_migrations" (version) VALUES (20230806172529);
INSERT INTO public."schema_migrations" (version) VALUES (20230806192239);
INSERT INTO public."schema_migrations" (version) VALUES (20230819195419);
INSERT INTO public."schema_migrations" (version) VALUES (20230821003054);
INSERT INTO public."schema_migrations" (version) VALUES (20230826185752);
INSERT INTO public."schema_migrations" (version) VALUES (20230829180104);
INSERT INTO public."schema_migrations" (version) VALUES (20230831172052);
INSERT INTO public."schema_migrations" (version) VALUES (20230915213638);
INSERT INTO public."schema_migrations" (version) VALUES (20231004060737);
INSERT INTO public."schema_migrations" (version) VALUES (20231004155001);
