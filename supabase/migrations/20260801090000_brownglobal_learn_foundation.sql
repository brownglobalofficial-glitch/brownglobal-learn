-- Learn by BrownGlobal: courses, live online learning, Build Challenge and Wave series pathway.
-- Apply to the shared BrownGlobal Supabase project after the shared account/membership migration.

create extension if not exists pgcrypto;

create table public.learning_courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  school text not null,
  level text not null,
  duration_label text not null,
  access text not null default 'free' check (access in ('free','plus')),
  color text not null default '#0E9F85',
  estimated_lessons integer not null default 1 check (estimated_lessons > 0),
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.learning_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.learning_courses(id) on delete cascade,
  title text not null,
  summary text not null,
  lesson_type text not null default 'lesson' check (lesson_type in ('lesson','quiz','project','reflection')),
  content_url text,
  duration_minutes integer not null default 10 check (duration_minutes between 1 and 600),
  sort_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.learning_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.learning_courses(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, course_id)
);

create table public.learning_lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  enrollment_id uuid not null references public.learning_enrollments(id) on delete cascade,
  lesson_id uuid not null references public.learning_lessons(id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create table public.learning_live_sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.learning_courses(id) on delete set null,
  title text not null,
  description text not null,
  instructor_name text not null,
  starts_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes between 15 and 480),
  capacity integer check (capacity is null or capacity > 0),
  access text not null default 'free' check (access in ('free','plus')),
  session_type text not null default 'Open class',
  language text not null default 'English',
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.learning_live_registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.learning_live_sessions(id) on delete cascade,
  registered_at timestamptz not null default now(),
  attendance_status text not null default 'registered' check (attendance_status in ('registered','attended','missed','canceled')),
  unique (user_id, session_id)
);

create table public.learning_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','plus')),
  status text not null default 'active' check (status in ('active','trialing','past_due','canceled','incomplete')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.learning_challenges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  duration_weeks integer not null check (duration_weeks between 1 and 24),
  free_entry boolean not null default true,
  published boolean not null default false,
  opens_at timestamptz,
  closes_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.learning_challenge_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id uuid not null references public.learning_challenges(id) on delete cascade,
  project_name text not null check (char_length(project_name) between 1 and 100),
  problem text not null check (char_length(problem) between 1 and 1200),
  customer text not null check (char_length(customer) between 1 and 800),
  offer text not null check (char_length(offer) between 1 and 1200),
  evidence_url text,
  pitch_url text,
  status text not null default 'draft' check (status in ('draft','submitted','reviewing','complete')),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, challenge_id)
);

create table public.venture_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_submission_id uuid not null references public.learning_challenge_submissions(id) on delete restrict,
  season text not null,
  founder_story text not null check (char_length(founder_story) between 1 and 1600),
  progress_summary text not null check (char_length(progress_summary) between 1 and 1600),
  availability_confirmed boolean not null default false,
  status text not null default 'submitted' check (status in ('draft','submitted','reviewing','shortlisted','declined','finalist')),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, season)
);

create table public.learning_certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.learning_courses(id) on delete restrict,
  verification_code text not null unique,
  title text not null,
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (user_id, course_id)
);

create index learning_lessons_course_idx on public.learning_lessons(course_id, sort_order);
create index learning_enrollments_user_idx on public.learning_enrollments(user_id);
create index learning_enrollments_course_idx on public.learning_enrollments(course_id);
create index learning_progress_user_idx on public.learning_lesson_progress(user_id);
create index learning_progress_enrollment_idx on public.learning_lesson_progress(enrollment_id);
create index learning_progress_lesson_idx on public.learning_lesson_progress(lesson_id);
create index learning_live_starts_idx on public.learning_live_sessions(starts_at);
create index learning_live_course_idx on public.learning_live_sessions(course_id) where course_id is not null;
create index learning_live_registrations_user_idx on public.learning_live_registrations(user_id);
create index learning_live_registrations_session_idx on public.learning_live_registrations(session_id);
create index learning_submissions_user_idx on public.learning_challenge_submissions(user_id);
create index learning_submissions_challenge_idx on public.learning_challenge_submissions(challenge_id);
create index venture_applications_user_idx on public.venture_applications(user_id);
create index venture_applications_submission_idx on public.venture_applications(challenge_submission_id);
create index learning_certificates_user_idx on public.learning_certificates(user_id);
create index learning_certificates_course_idx on public.learning_certificates(course_id);

alter table public.learning_courses enable row level security;
alter table public.learning_lessons enable row level security;
alter table public.learning_enrollments enable row level security;
alter table public.learning_lesson_progress enable row level security;
alter table public.learning_live_sessions enable row level security;
alter table public.learning_live_registrations enable row level security;
alter table public.learning_subscriptions enable row level security;
alter table public.learning_challenges enable row level security;
alter table public.learning_challenge_submissions enable row level security;
alter table public.venture_applications enable row level security;
alter table public.learning_certificates enable row level security;

create policy "published courses are public"
on public.learning_courses for select
to anon, authenticated
using (published = true);

create policy "free lessons are public"
on public.learning_lessons for select
to anon
using (
  published = true
  and course_id in (select id from public.learning_courses where published = true and access = 'free')
);

create policy "eligible learners view lessons"
on public.learning_lessons for select
to authenticated
using (
  published = true
  and (
    course_id in (select id from public.learning_courses where published = true and access = 'free')
    or exists (
      select 1 from public.learning_subscriptions s
      where s.user_id = (select auth.uid()) and s.plan = 'plus' and s.status in ('active','trialing')
    )
    or exists (
      select 1
      from public.organization_members om
      join public.business_memberships bm on bm.organization_id = om.organization_id
      where om.user_id = (select auth.uid()) and bm.plan = 'business' and bm.status in ('active','trialing')
    )
  )
);

create policy "users view own enrollments"
on public.learning_enrollments for select
to authenticated
using (user_id = (select auth.uid()));

create policy "users enroll themselves"
on public.learning_enrollments for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.learning_courses c
    where c.id = course_id and c.published = true and (
      c.access = 'free'
      or exists (select 1 from public.learning_subscriptions s where s.user_id = (select auth.uid()) and s.plan = 'plus' and s.status in ('active','trialing'))
      or exists (
        select 1 from public.organization_members om
        join public.business_memberships bm on bm.organization_id = om.organization_id
        where om.user_id = (select auth.uid()) and bm.plan = 'business' and bm.status in ('active','trialing')
      )
    )
  )
);

create policy "users view own lesson progress"
on public.learning_lesson_progress for select
to authenticated
using (user_id = (select auth.uid()));

create policy "users create own lesson progress"
on public.learning_lesson_progress for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.learning_enrollments e where e.id = enrollment_id and e.user_id = (select auth.uid()))
);

create policy "users update own lesson progress"
on public.learning_lesson_progress for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "published live sessions are public"
on public.learning_live_sessions for select
to anon, authenticated
using (published = true);

create policy "users view own live registrations"
on public.learning_live_registrations for select
to authenticated
using (user_id = (select auth.uid()));

create policy "eligible users register for live sessions"
on public.learning_live_registrations for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.learning_live_sessions ls
    where ls.id = session_id and ls.published = true and (
      ls.access = 'free'
      or exists (select 1 from public.learning_subscriptions s where s.user_id = (select auth.uid()) and s.plan = 'plus' and s.status in ('active','trialing'))
      or exists (
        select 1 from public.organization_members om
        join public.business_memberships bm on bm.organization_id = om.organization_id
        where om.user_id = (select auth.uid()) and bm.plan = 'business' and bm.status in ('active','trialing')
      )
    )
  )
);

create policy "users view own Learn subscription"
on public.learning_subscriptions for select
to authenticated
using (user_id = (select auth.uid()));

create policy "published challenges are public"
on public.learning_challenges for select
to anon, authenticated
using (published = true);

create policy "users view own challenge submissions"
on public.learning_challenge_submissions for select
to authenticated
using (user_id = (select auth.uid()));

create policy "users create own challenge submissions"
on public.learning_challenge_submissions for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.learning_challenges c where c.id = challenge_id and c.published = true and c.free_entry = true)
);

create policy "users update own challenge submissions"
on public.learning_challenge_submissions for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "users view own venture applications"
on public.venture_applications for select
to authenticated
using (user_id = (select auth.uid()));

create policy "users submit own eligible venture application"
on public.venture_applications for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and availability_confirmed = true
  and exists (
    select 1 from public.learning_challenge_submissions cs
    where cs.id = challenge_submission_id and cs.user_id = (select auth.uid()) and cs.status in ('submitted','reviewing','complete')
  )
);

create policy "users update own pending venture application"
on public.venture_applications for update
to authenticated
using (user_id = (select auth.uid()) and status in ('draft','submitted'))
with check (user_id = (select auth.uid()) and status in ('draft','submitted'));

create policy "users view own certificates"
on public.learning_certificates for select
to authenticated
using (user_id = (select auth.uid()));

revoke all on table public.learning_courses from public, anon, authenticated;
revoke all on table public.learning_lessons from public, anon, authenticated;
revoke all on table public.learning_enrollments from public, anon, authenticated;
revoke all on table public.learning_lesson_progress from public, anon, authenticated;
revoke all on table public.learning_live_sessions from public, anon, authenticated;
revoke all on table public.learning_live_registrations from public, anon, authenticated;
revoke all on table public.learning_subscriptions from public, anon, authenticated;
revoke all on table public.learning_challenges from public, anon, authenticated;
revoke all on table public.learning_challenge_submissions from public, anon, authenticated;
revoke all on table public.venture_applications from public, anon, authenticated;
revoke all on table public.learning_certificates from public, anon, authenticated;

grant select on table public.learning_courses to anon, authenticated;
grant select on table public.learning_lessons to anon, authenticated;
grant select, insert on table public.learning_enrollments to authenticated;
grant select, insert, update on table public.learning_lesson_progress to authenticated;
grant select on table public.learning_live_sessions to anon, authenticated;
grant select, insert on table public.learning_live_registrations to authenticated;
grant select on table public.learning_subscriptions to authenticated;
grant select on table public.learning_challenges to anon, authenticated;
grant select, insert, update on table public.learning_challenge_submissions to authenticated;
grant select, insert, update on table public.venture_applications to authenticated;
grant select on table public.learning_certificates to authenticated;

insert into public.learning_courses (slug,title,description,school,level,duration_label,access,color,estimated_lessons,published,sort_order)
values
  ('build-your-business','Build Your Business','Turn a real problem into a tested offer, first customer pathway and concise pitch.','Business & Entrepreneurship','Beginner','4 weeks','free','#0E9F85',16,true,10),
  ('digital-marketing-foundations','Digital Marketing Foundations','Plan useful campaigns, choose channels and measure what actually moves the audience.','Marketing & Growth','Beginner','3 weeks','free','#6C5CE7',12,true,20),
  ('create-for-the-internet','Create for the Internet','Build a repeatable system for useful short-form, video and written content.','Media & Creativity','Beginner','3 weeks','free','#FF514A',12,true,30),
  ('ai-for-real-work','AI for Real Work','Use modern AI tools responsibly for research, operations and practical business tasks.','Technology & AI','Intermediate','5 weeks','plus','#5C77FF',20,true,40),
  ('brand-systems','Build a Brand System','Develop positioning, voice, identity and a consistent cross-channel brand toolkit.','Media & Creativity','Intermediate','4 weeks','plus','#E49D20',16,true,50),
  ('leading-small-teams','Leading Small Teams','Set priorities, delegate clearly and build an operating rhythm that people can trust.','Leadership & Careers','Intermediate','4 weeks','plus','#243E6B',15,true,60)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  school = excluded.school,
  level = excluded.level,
  duration_label = excluded.duration_label,
  access = excluded.access,
  color = excluded.color,
  estimated_lessons = excluded.estimated_lessons,
  published = excluded.published,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.learning_challenges (slug,title,description,duration_weeks,free_entry,published)
values ('build-a-business','BrownGlobal Build a Business Challenge','A free practical pathway from customer problem to tested business and concise pitch.',4,true,true)
on conflict (slug) do update set title=excluded.title, description=excluded.description, duration_weeks=excluded.duration_weeks, free_entry=true, published=true;

insert into public.learning_live_sessions (title,description,instructor_name,starts_at,duration_minutes,access,session_type,language,published)
values
  ('From problem to useful offer','A practical opening class for the Build a Business pathway.','BrownGlobal Learn Faculty',now() + interval '7 days',60,'free','Open class','English',true),
  ('Customer interviews that reveal the truth','Practice questions that uncover customer needs without leading the answer.','BrownGlobal Learn Faculty',now() + interval '12 days',75,'free','Workshop','English',true),
  ('AI workflow lab','Build a responsible AI-assisted workflow for a real task.','BrownGlobal Learn Faculty',now() + interval '16 days',60,'plus','Interactive lab','English',true),
  ('Pitch review office hours','Receive structured feedback before submitting a concise venture pitch.','Venture Challenge Mentors',now() + interval '21 days',60,'plus','Office hours','English',true);

comment on table public.learning_certificates is 'Non-degree certificates of completion. Verifiedly may verify these records but does not make Learn accredited.';
comment on table public.venture_applications is 'Free merit-based applications to the BrownGlobal Venture Challenge Wave Original.';
