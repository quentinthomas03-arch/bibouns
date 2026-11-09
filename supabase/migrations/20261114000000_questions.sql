-- Carnet de questions pour la sage-femme / le pédiatre / le médecin.
create table public.questions (
  id        uuid primary key,
  subject   text not null default 'pregnancy' check (subject in ('pregnancy', 'baby', 'parents')),
  text      text not null check (char_length(text) <= 1000),
  answered  boolean not null default false,
  answer    text check (char_length(answer) <= 2000)
);
select public.make_synced('public.questions');
